from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import cast

from fastapi import HTTPException, status

from app.core.settings import settings
from app.schemas.admin import AccountRole, AdminAccountSummary

from .admin_account_store import (
    MANAGED_ROLES,
    find_managed_account,
    managed_account_to_current,
    managed_accounts,
    read_account_store,
    resolve_account,
    system_account,
    write_account_store,
)
from .admin_auth_models import AdminToken, CurrentAccount
from .admin_auth_security import (
    generate_token,
    hash_password,
    parse_token,
    verify_password,
    verify_system_admin_password,
)


def authenticate_admin(username: str, password: str) -> AdminToken:
    if username == settings.admin_username and verify_system_admin_password(password):
        account = system_account()
    else:
        managed_account = find_managed_account(username)
        if managed_account and verify_password(
            password, managed_account["password_hash"]
        ):
            account = managed_account_to_current(managed_account)
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="账号或密码错误",
            )

    expires_at = datetime.now(UTC) + timedelta(hours=settings.admin_token_ttl_hours)
    token = generate_token(account.username, account.role, expires_at)
    return AdminToken(token=token, expires_at=expires_at, role=account.role)


def verify_admin_token(token: str) -> CurrentAccount:
    username, role, _expires_at = parse_token(token)
    account = resolve_account(username)
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

    managed_account_summaries = [
        AdminAccountSummary(
            username=item["username"],
            role=item["role"],
            is_current=item["username"] == current_account.username,
            resource_count=resource_counts.get(item["username"], 0),
        )
        for item in managed_accounts()
    ]
    system_admin = AdminAccountSummary(
        username=settings.admin_username,
        role="system",
        is_current=settings.admin_username == current_account.username,
        resource_count=resource_counts.get(settings.admin_username, 0),
    )
    return [system_admin, *managed_account_summaries]


def create_managed_account(
    *,
    actor: CurrentAccount,
    username: str,
    password: str,
    role: AccountRole,
) -> AdminAccountSummary:
    _require_account_management_access(actor, "当前账号无权新增账号")
    if role not in MANAGED_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="只能创建普通管理员或普通用户",
        )
    if username == settings.admin_username or find_managed_account(username):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="账号已存在",
        )

    store = read_account_store()
    store["accounts"].append(
        {
            "username": username,
            "password_hash": hash_password(password),
            "role": role,
        }
    )
    write_account_store(store)
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
    _require_account_management_access(actor, "当前账号无权管理其他账号")
    _reject_system_account_mutation(
        username,
        "系统管理员账号不能在此处修改",
    )

    store = read_account_store()
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
        target_item["password_hash"] = hash_password(new_password)

    if new_role is None and new_password is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="至少提供一个修改项",
        )

    write_account_store(store)
    return AdminAccountSummary(
        username=target_item["username"],
        role=cast(AccountRole, target_item["role"]),
        is_current=target_item["username"] == actor.username,
        resource_count=0,
    )


def delete_managed_account(*, actor: CurrentAccount, username: str) -> None:
    _require_account_management_access(actor, "当前账号无权删除账号")
    _reject_system_account_mutation(username, "系统管理员账号不能删除")
    if username == actor.username:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="不能删除当前登录账号",
        )

    store = read_account_store()
    retained_accounts = [
        item for item in store["accounts"] if item["username"] != username
    ]
    if len(retained_accounts) == len(store["accounts"]):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="账号不存在",
        )

    store["accounts"] = retained_accounts
    write_account_store(store)


def update_admin_credentials(
    *,
    current_account: CurrentAccount,
    current_password: str,
    new_username: str,
    new_password: str,
) -> CurrentAccount:
    _require_mutable_account(current_account)

    store = read_account_store()
    managed_account = find_managed_account(current_account.username)
    is_valid = managed_account is not None and verify_password(
        current_password, managed_account["password_hash"]
    )
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="当前密码不正确",
        )

    if new_username != current_account.username and (
        new_username == settings.admin_username or find_managed_account(new_username)
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="新账号已存在",
        )

    updated = False
    for item in store["accounts"]:
        if item["username"] == current_account.username:
            item["username"] = new_username
            item["password_hash"] = hash_password(new_password)
            updated = True
            break

    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="当前账号不存在",
        )

    write_account_store(store)
    return CurrentAccount(username=new_username, role=current_account.role)


def _require_mutable_account(current_account: CurrentAccount) -> None:
    if current_account.role != "system":
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="系统管理员账号需在服务器 .env 中维护，页面内不支持修改",
    )


def _require_account_management_access(
    actor: CurrentAccount,
    detail: str,
) -> None:
    if actor.can_manage_accounts:
        return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


def _reject_system_account_mutation(username: str, detail: str) -> None:
    if username != settings.admin_username:
        return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=detail)
