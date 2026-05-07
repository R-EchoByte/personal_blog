from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
from datetime import UTC, datetime
from typing import TypedDict, cast

from fastapi import HTTPException, status

from app.core.settings import settings
from app.schemas.admin import AccountRole


class TokenPayload(TypedDict):
    username: str
    role: AccountRole
    exp: int


def _urlsafe_b64encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode("utf-8").rstrip("=")


def _urlsafe_b64decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(f"{value}{padding}")


def hash_password(password: str, salt: str | None = None) -> str:
    salt_value = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt_value.encode("utf-8"),
        200_000,
    )
    return f"pbkdf2_sha256$200000${salt_value}${digest.hex()}"


def verify_password(password: str, password_hash: str) -> bool:
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


def verify_system_admin_password(password: str) -> bool:
    if settings.admin_password_hash:
        return verify_password(password, settings.admin_password_hash)
    return hmac.compare_digest(password, settings.admin_password)


def generate_token(username: str, role: AccountRole, expires_at: datetime) -> str:
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


def parse_token(token: str) -> tuple[str, AccountRole, datetime]:
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

    payload = cast(
        TokenPayload,
        json.loads(_urlsafe_b64decode(payload_text).decode("utf-8")),
    )
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

    return username, role, expires_at
