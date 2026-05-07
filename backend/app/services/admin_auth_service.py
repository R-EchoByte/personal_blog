from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
from collections.abc import Mapping
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import cast

from fastapi import HTTPException, status

from app.core.settings import settings
from app.core.storage import get_admin_credentials_file, get_metadata_dir
from app.schemas.admin import AdminAccountSummary


@dataclass(frozen=True)
class AdminToken:
    token: str
    expires_at: datetime


def _urlsafe_b64encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode("utf-8").rstrip("=")


def _urlsafe_b64decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(f"{value}{padding}")


def _hash_password(password: str, salt: str | None = None) -> str:
    salt_value = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt_value.encode("utf-8"),
        200_000,
    )
    return f"pbkdf2_sha256$200000${salt_value}${digest.hex()}"


def _verify_password(password: str, password_hash: str) -> bool:
    try:
        algorithm, iterations, salt, digest = password_hash.split("$", 3)
    except ValueError:
        return False
    if algorithm != "pbkdf2_sha256":
        return False

    calculated = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        int(iterations),
    ).hex()
    return hmac.compare_digest(calculated, digest)


def _default_managed_admin() -> dict[str, str]:
    password_hash = settings.admin_password_hash or _hash_password(
        settings.admin_password
    )
    return {"username": settings.admin_username, "password_hash": password_hash}


def _coerce_admin_item(item: object) -> dict[str, str] | None:
    if not isinstance(item, Mapping):
        return None

    item_mapping = cast(Mapping[str, object], item)
    username = item_mapping.get("username")
    password_hash = item_mapping.get("password_hash")
    if not isinstance(username, str) or not isinstance(password_hash, str):
        return None
    return {"username": username, "password_hash": password_hash}


def _normalize_store_payload(payload: object) -> dict[str, list[dict[str, str]]]:
    if isinstance(payload, Mapping):
        payload_mapping = cast(Mapping[str, object], payload)
    else:
        payload_mapping = None

    managed_admins = payload_mapping.get("managed_admins") if payload_mapping else None
    if isinstance(managed_admins, list):
        admins = [
            normalized
            for item in managed_admins
            if (normalized := _coerce_admin_item(item)) is not None
        ]
        if admins:
            return {"managed_admins": admins}

    if payload_mapping and (normalized_admin := _coerce_admin_item(payload_mapping)) is not None:
        return {"managed_admins": [normalized_admin]}

    return {"managed_admins": [_default_managed_admin()]}


def _credential_store() -> dict[str, list[dict[str, str]]]:
    credentials_file = get_admin_credentials_file()
    get_metadata_dir().mkdir(parents=True, exist_ok=True)

    if credentials_file.is_file():
        payload = json.loads(credentials_file.read_text(encoding="utf-8"))
        store = _normalize_store_payload(payload)
        _write_store(store)
        return store

    store = {"managed_admins": [_default_managed_admin()]}
    _write_store(store)
    return store


def _write_store(store: dict[str, list[dict[str, str]]]) -> None:
    credentials_file = get_admin_credentials_file()
    get_metadata_dir().mkdir(parents=True, exist_ok=True)
    credentials_file.write_text(
        json.dumps(store, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def _find_managed_admin(username: str) -> dict[str, str] | None:
    store = _credential_store()
    return next(
        (item for item in store["managed_admins"] if item["username"] == username),
        None,
    )


def _verify_system_admin_password(password: str) -> bool:
    if settings.admin_password_hash:
        return _verify_password(password, settings.admin_password_hash)
    return hmac.compare_digest(password, settings.admin_password)


def _is_system_admin(username: str, password: str) -> bool:
    return username == settings.admin_username and _verify_system_admin_password(
        password
    )


def authenticate_admin(username: str, password: str) -> AdminToken:
    managed_admin = _find_managed_admin(username)
    is_managed_admin = managed_admin is not None and _verify_password(
        password, managed_admin["password_hash"]
    )
    if not is_managed_admin and not _is_system_admin(username, password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="账号或密码错误",
        )

    expires_at = datetime.now(UTC) + timedelta(hours=settings.admin_token_ttl_hours)
    token = _generate_token(username, expires_at)
    return AdminToken(token=token, expires_at=expires_at)


def _generate_token(username: str, expires_at: datetime) -> str:
    payload = json.dumps(
        {"username": username, "exp": int(expires_at.timestamp())},
        separators=(",", ":"),
    ).encode("utf-8")
    payload_text = _urlsafe_b64encode(payload)
    signature = hmac.new(
        settings.admin_token_secret.encode("utf-8"),
        payload_text.encode("utf-8"),
        hashlib.sha256,
    ).digest()
    return f"{payload_text}.{_urlsafe_b64encode(signature)}"


def verify_admin_token(token: str) -> str:
    try:
        payload_text, signature_text = token.split(".", 1)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="登录状态无效",
        ) from exc

    expected_signature = hmac.new(
        settings.admin_token_secret.encode("utf-8"),
        payload_text.encode("utf-8"),
        hashlib.sha256,
    ).digest()
    if not hmac.compare_digest(_urlsafe_b64encode(expected_signature), signature_text):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="登录状态无效",
        )

    payload = json.loads(_urlsafe_b64decode(payload_text).decode("utf-8"))
    expires_at = datetime.fromtimestamp(payload["exp"], tz=UTC)
    if datetime.now(UTC) >= expires_at:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="登录已过期",
        )

    valid_usernames = {
        settings.admin_username,
        *[item["username"] for item in _credential_store()["managed_admins"]],
    }
    if payload["username"] not in valid_usernames:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="登录状态已失效",
        )
    return payload["username"]


def list_admin_accounts(current_username: str) -> list[AdminAccountSummary]:
    managed_admins = [
        AdminAccountSummary(
            username=item["username"],
            role="managed",
            is_current=item["username"] == current_username,
        )
        for item in _credential_store()["managed_admins"]
    ]
    system_admin = AdminAccountSummary(
        username=settings.admin_username,
        role="system",
        is_current=settings.admin_username == current_username,
    )
    if any(item.username == system_admin.username for item in managed_admins):
        return managed_admins
    return [system_admin, *managed_admins]


def create_managed_admin(
    *,
    actor_username: str,
    username: str,
    password: str,
) -> AdminAccountSummary:
    if actor_username not in {
        settings.admin_username,
        *[item["username"] for item in _credential_store()["managed_admins"]],
    }:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="当前账号无权新增管理员",
        )

    store = _credential_store()
    if any(item["username"] == username for item in store["managed_admins"]):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="管理员账号已存在",
        )

    store["managed_admins"].append(
        {"username": username, "password_hash": _hash_password(password)}
    )
    _write_store(store)
    return AdminAccountSummary(username=username, role="managed", is_current=False)


def delete_managed_admin(*, actor_username: str, username: str) -> None:
    store = _credential_store()
    if username == settings.admin_username:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="系统管理员账号不能删除",
        )
    if username == actor_username:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="不能删除当前登录账号",
        )

    retained_admins = [
        item for item in store["managed_admins"] if item["username"] != username
    ]
    if len(retained_admins) == len(store["managed_admins"]):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="管理员账号不存在",
        )
    store["managed_admins"] = retained_admins
    _write_store(store)


def update_admin_credentials(
    *,
    username: str,
    current_password: str,
    new_username: str,
    new_password: str,
) -> None:
    store = _credential_store()
    managed_admin = _find_managed_admin(username)
    is_managed_admin = managed_admin is not None and _verify_password(
        current_password, managed_admin["password_hash"]
    )
    is_system_admin = _is_system_admin(username, current_password)
    if not is_managed_admin and not is_system_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="当前密码不正确",
        )

    if new_username != username and any(
        item["username"] == new_username for item in store["managed_admins"]
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="新账号已存在",
        )

    updated = False
    for item in store["managed_admins"]:
        if item["username"] == username:
            item["username"] = new_username
            item["password_hash"] = _hash_password(new_password)
            updated = True
            break

    if not updated:
        store["managed_admins"].append(
            {"username": new_username, "password_hash": _hash_password(new_password)}
        )

    _write_store(store)
