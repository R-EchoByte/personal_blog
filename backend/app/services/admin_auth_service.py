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
from app.schemas.admin import AccountRole, AdminAccountSummary, AdminProfileResponse

MANAGED_ROLES: tuple[AccountRole, ...] = ("admin", "user")


@dataclass(frozen=True)
class AdminToken:
    token: str
    expires_at: datetime
    role: AccountRole


@dataclass(frozen=True)
class CurrentAccount:
    username: str
    role: AccountRole

    @property
    def can_manage_accounts(self) -> bool:
        return self.role in {"system", "admin"}

    @property
    def can_view_all_resources(self) -> bool:
        return self.role in {"system", "admin"}

    def to_profile(self) -> AdminProfileResponse:
        return AdminProfileResponse(
            username=self.username,
            role=self.role,
            can_manage_accounts=self.can_manage_accounts,
            can_view_all_resources=self.can_view_all_resources,
        )


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


def _coerce_account_item(item: object) -> dict[str, str] | None:
    if not isinstance(item, Mapping):
        return None

    item_mapping = cast(Mapping[str, object], item)
    username = item_mapping.get("username")
    password_hash = item_mapping.get("password_hash")
    role = item_mapping.get("role", "admin")
    if (
        not isinstance(username, str)
        or not isinstance(password_hash, str)
        or role not in MANAGED_ROLES
    ):
        return None
    return {
        "username": username,
        "password_hash": password_hash,
        "role": cast(AccountRole, role),
    }


def _normalize_store_payload(payload: object) -> dict[str, list[dict[str, str]]]:
    if isinstance(payload, Mapping):
        payload_mapping = cast(Mapping[str, object], payload)
    else:
        payload_mapping = None

    accounts = payload_mapping.get("accounts") if payload_mapping else None
    if isinstance(accounts, list):
        normalized_accounts = [
            normalized
            for item in accounts
            if (normalized := _coerce_account_item(item)) is not None
        ]
        if normalized_accounts:
            return {"accounts": _sanitize_accounts(normalized_accounts)}

    managed_admins = payload_mapping.get("managed_admins") if payload_mapping else None
    if isinstance(managed_admins, list):
        normalized_admins = []
        for item in managed_admins:
            if normalized := _coerce_account_item(item):
                normalized_admins.append(normalized)
                continue

            if not isinstance(item, Mapping):
                continue
            legacy_item = cast(Mapping[str, object], item)
            username = legacy_item.get("username")
            password_hash = legacy_item.get("password_hash")
            if isinstance(username, str) and isinstance(password_hash, str):
                normalized_admins.append(
                    {
                        "username": username,
                        "password_hash": password_hash,
                        "role": "admin",
                    }
                )
        if normalized_admins:
            return {"accounts": _sanitize_accounts(normalized_admins)}

    if payload_mapping and (
        normalized_account := _coerce_account_item(payload_mapping)
    ) is not None:
        return {"accounts": _sanitize_accounts([normalized_account])}

    if payload_mapping:
        username = payload_mapping.get("username")
        password_hash = payload_mapping.get("password_hash")
        if isinstance(username, str) and isinstance(password_hash, str):
            return {
                "accounts": _sanitize_accounts(
                    [
                        {
                            "username": username,
                            "password_hash": password_hash,
                            "role": "admin",
                        }
                    ]
                )
            }

    return {"accounts": []}


def _sanitize_accounts(accounts: list[dict[str, str]]) -> list[dict[str, str]]:
    sanitized_accounts: list[dict[str, str]] = []
    seen_usernames: set[str] = set()
    for account in accounts:
        username = account["username"].strip()
        if not username or username == settings.admin_username:
            continue
        if username in seen_usernames:
            continue
        seen_usernames.add(username)
        sanitized_accounts.append(
            {
                "username": username,
                "password_hash": account["password_hash"],
                "role": account["role"],
            }
        )
    return sanitized_accounts


def _credential_store() -> dict[str, list[dict[str, str]]]:
    credentials_file = get_admin_credentials_file()
    get_metadata_dir().mkdir(parents=True, exist_ok=True)

    if credentials_file.is_file():
        payload = json.loads(credentials_file.read_text(encoding="utf-8"))
        store = _normalize_store_payload(payload)
        _write_store(store)
        return store

    store = {"accounts": []}
    _write_store(store)
    return store


def _write_store(store: dict[str, list[dict[str, str]]]) -> None:
    credentials_file = get_admin_credentials_file()
    get_metadata_dir().mkdir(parents=True, exist_ok=True)
    credentials_file.write_text(
        json.dumps(store, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def _managed_accounts() -> list[dict[str, str]]:
    return _credential_store()["accounts"]


def _find_managed_account(username: str) -> dict[str, str] | None:
    return next(
        (item for item in _managed_accounts() if item["username"] == username),
        None,
    )


def _verify_system_admin_password(password: str) -> bool:
    if settings.admin_password_hash:
        return _verify_password(password, settings.admin_password_hash)
    return hmac.compare_digest(password, settings.admin_password)


def _system_account() -> CurrentAccount:
    return CurrentAccount(username=settings.admin_username, role="system")


def _managed_account_to_current(item: dict[str, str]) -> CurrentAccount:
    return CurrentAccount(
        username=item["username"],
        role=cast(AccountRole, item["role"]),
    )


def authenticate_admin(username: str, password: str) -> AdminToken:
    if username == settings.admin_username and _verify_system_admin_password(password):
        account = _system_account()
    else:
        managed_account = _find_managed_account(username)
        if managed_account and _verify_password(
            password, managed_account["password_hash"]
        ):
            account = _managed_account_to_current(managed_account)
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="账号或密码错误",
            )

    expires_at = datetime.now(UTC) + timedelta(hours=settings.admin_token_ttl_hours)
    token = _generate_token(account.username, account.role, expires_at)
    return AdminToken(token=token, expires_at=expires_at, role=account.role)


def _require_mutable_account(current_account: CurrentAccount) -> None:
    if current_account.role != "system":
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="系统管理员账号需在服务器 .env 中维护，页面内不支持修改",
    )


def _generate_token(username: str, role: AccountRole, expires_at: datetime) -> str:
    payload = json.dumps(
        {"username": username, "role": role, "exp": int(expires_at.timestamp())},
        separators=(",", ":"),
    ).encode("utf-8")
    payload_text = _urlsafe_b64encode(payload)
    signature = hmac.new(
        settings.admin_token_secret.encode("utf-8"),
        payload_text.encode("utf-8"),
        hashlib.sha256,
    ).digest()
    return f"{payload_text}.{_urlsafe_b64encode(signature)}"


def _resolve_account(username: str) -> CurrentAccount | None:
    if username == settings.admin_username:
        return _system_account()

    managed_account = _find_managed_account(username)
    if managed_account is None:
        return None
    return _managed_account_to_current(managed_account)


def verify_admin_token(token: str) -> CurrentAccount:
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

    username = payload.get("username")
    role = payload.get("role")
    if not isinstance(username, str) or role not in {"system", "admin", "user"}:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="登录状态无效",
        )

    account = _resolve_account(username)
    if account is None or account.role != role:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="登录状态已失效",
        )
    return account


def list_admin_accounts(current_account: CurrentAccount) -> list[AdminAccountSummary]:
    from app.services.resource_service import count_resources_by_owner

    resource_counts = count_resources_by_owner()
    if not current_account.can_manage_accounts:
        return [
            AdminAccountSummary(
                username=current_account.username,
                role=current_account.role,
                is_current=True,
                resource_count=resource_counts.get(current_account.username, 0),
            )
        ]

    managed_accounts = [
        AdminAccountSummary(
            username=item["username"],
            role=cast(AccountRole, item["role"]),
            is_current=item["username"] == current_account.username,
            resource_count=resource_counts.get(item["username"], 0),
        )
        for item in _managed_accounts()
    ]
    system_admin = AdminAccountSummary(
        username=settings.admin_username,
        role="system",
        is_current=settings.admin_username == current_account.username,
        resource_count=resource_counts.get(settings.admin_username, 0),
    )
    return [system_admin, *managed_accounts]


def create_managed_account(
    *,
    actor: CurrentAccount,
    username: str,
    password: str,
    role: AccountRole,
) -> AdminAccountSummary:
    if not actor.can_manage_accounts:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="当前账号无权新增账号",
        )
    if role not in MANAGED_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="只能创建普通管理员或普通用户",
        )

    if username == settings.admin_username or _find_managed_account(username):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="账号已存在",
        )

    store = _credential_store()
    store["accounts"].append(
        {
            "username": username,
            "password_hash": _hash_password(password),
            "role": role,
        }
    )
    _write_store(store)
    return AdminAccountSummary(
        username=username,
        role=role,
        is_current=False,
        resource_count=0,
    )


def update_managed_account(
    *,
    actor: CurrentAccount,
    username: str,
    new_password: str | None,
    new_role: AccountRole | None,
) -> AdminAccountSummary:
    if not actor.can_manage_accounts:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="当前账号无权管理其他账号",
        )
    if username == settings.admin_username:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="系统管理员账号不能在此处修改",
        )

    store = _credential_store()
    target_item = next(
        (item for item in store["accounts"] if item["username"] == username),
        None,
    )
    if target_item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="账号不存在",
        )

    if new_role is not None:
        if new_role not in MANAGED_ROLES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="只能调整为普通管理员或普通用户",
            )
        target_item["role"] = new_role

    if new_password is not None:
        target_item["password_hash"] = _hash_password(new_password)

    if new_role is None and new_password is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="至少提供一个修改项",
        )

    _write_store(store)
    return AdminAccountSummary(
        username=target_item["username"],
        role=cast(AccountRole, target_item["role"]),
        is_current=target_item["username"] == actor.username,
        resource_count=0,
    )


def delete_managed_account(*, actor: CurrentAccount, username: str) -> None:
    if not actor.can_manage_accounts:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="当前账号无权删除账号",
        )
    if username == settings.admin_username:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="系统管理员账号不能删除",
        )
    if username == actor.username:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="不能删除当前登录账号",
        )

    store = _credential_store()
    retained_accounts = [
        item for item in store["accounts"] if item["username"] != username
    ]
    if len(retained_accounts) == len(store["accounts"]):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="账号不存在",
        )

    store["accounts"] = retained_accounts
    _write_store(store)


def update_admin_credentials(
    *,
    current_account: CurrentAccount,
    current_password: str,
    new_username: str,
    new_password: str,
) -> CurrentAccount:
    _require_mutable_account(current_account)

    store = _credential_store()
    managed_account = _find_managed_account(current_account.username)
    is_valid = managed_account is not None and _verify_password(
        current_password, managed_account["password_hash"]
    )
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="当前密码不正确",
        )

    if new_username != current_account.username and (
        new_username == settings.admin_username or _find_managed_account(new_username)
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="新账号已存在",
        )

    updated = False
    for item in store["accounts"]:
        if item["username"] == current_account.username:
            item["username"] = new_username
            item["password_hash"] = _hash_password(new_password)
            updated = True
            break

    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="当前账号不存在",
        )

    if updated:
        _write_store(store)

    return CurrentAccount(username=new_username, role=current_account.role)
