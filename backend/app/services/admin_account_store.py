from __future__ import annotations

import json
from collections.abc import Mapping
from typing import TypedDict, cast

from app.core.settings import settings
from app.core.storage import get_admin_credentials_file, get_metadata_dir
from app.schemas.admin import AccountRole

from .admin_auth_models import CurrentAccount

MANAGED_ROLES: tuple[AccountRole, ...] = ("admin", "user")


class ManagedAccountRecord(TypedDict):
    username: str
    password_hash: str
    role: AccountRole


class AccountStore(TypedDict):
    accounts: list[ManagedAccountRecord]


def _coerce_account_item(item: object) -> ManagedAccountRecord | None:
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


def _sanitize_accounts(
    accounts: list[ManagedAccountRecord],
) -> list[ManagedAccountRecord]:
    sanitized_accounts: list[ManagedAccountRecord] = []
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


def _normalize_store_payload(payload: object) -> AccountStore:
    payload_mapping = (
        cast(Mapping[str, object], payload)
        if isinstance(payload, Mapping)
        else None
    )

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
        normalized_admins: list[ManagedAccountRecord] = []
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


def write_account_store(store: AccountStore) -> None:
    credentials_file = get_admin_credentials_file()
    get_metadata_dir().mkdir(parents=True, exist_ok=True)
    credentials_file.write_text(
        json.dumps(store, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def read_account_store() -> AccountStore:
    credentials_file = get_admin_credentials_file()
    get_metadata_dir().mkdir(parents=True, exist_ok=True)

    if credentials_file.is_file():
        payload = json.loads(credentials_file.read_text(encoding="utf-8"))
        store = _normalize_store_payload(payload)
        write_account_store(store)
        return store

    store: AccountStore = {"accounts": []}
    write_account_store(store)
    return store


def managed_accounts() -> list[ManagedAccountRecord]:
    return read_account_store()["accounts"]


def find_managed_account(username: str) -> ManagedAccountRecord | None:
    return next(
        (item for item in managed_accounts() if item["username"] == username),
        None,
    )


def system_account() -> CurrentAccount:
    return CurrentAccount(username=settings.admin_username, role="system")


def managed_account_to_current(item: ManagedAccountRecord) -> CurrentAccount:
    return CurrentAccount(username=item["username"], role=item["role"])


def resolve_account(username: str) -> CurrentAccount | None:
    if username == settings.admin_username:
        return system_account()

    managed_account = find_managed_account(username)
    if managed_account is None:
        return None
    return managed_account_to_current(managed_account)
