from __future__ import annotations

from typing import cast

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    Header,
    HTTPException,
    UploadFile,
    status,
)

from app.schemas.admin import (
    AdminAccountCreateRequest,
    AdminAccountDeleteResponse,
    AdminAccountListResponse,
    AdminAccountUpdateRequest,
    AdminAccountUpdateResponse,
    AdminCredentialUpdateRequest,
    AdminLoginRequest,
    AdminProfileResponse,
    AdminTokenResponse,
    DeleteResourceResponse,
    ResourceKind,
    ResourceListResponse,
    UploadResponse,
)
from app.services.admin_auth_service import (
    CurrentAccount,
    authenticate_admin,
    create_managed_account,
    delete_managed_account,
    list_admin_accounts,
    update_admin_credentials,
    update_managed_account,
    verify_admin_token,
)
from app.services.resource_service import (
    delete_resource,
    list_resources,
    save_uploaded_resource,
)

router = APIRouter(tags=["admin"])


def get_current_admin(
    authorization: str = Header(default="", alias="Authorization"),
) -> CurrentAccount:
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="请先登录管理员账号",
        )
    return verify_admin_token(authorization.removeprefix("Bearer ").strip())


@router.post("/admin/login", response_model=AdminTokenResponse)
def admin_login(payload: AdminLoginRequest) -> AdminTokenResponse:
    token = authenticate_admin(payload.username, payload.password)
    return AdminTokenResponse(
        access_token=token.token,
        expires_at=token.expires_at,
        username=payload.username,
        role=token.role,
    )


@router.get("/admin/me", response_model=AdminProfileResponse)
def admin_me(current_admin=Depends(get_current_admin)) -> AdminProfileResponse:
    return current_admin.to_profile()


@router.post("/admin/credentials", response_model=AdminProfileResponse)
def update_credentials(
    payload: AdminCredentialUpdateRequest,
    current_admin=Depends(get_current_admin),
) -> AdminProfileResponse:
    updated_account = update_admin_credentials(
        current_account=current_admin,
        current_password=payload.current_password,
        new_username=payload.new_username,
        new_password=payload.new_password,
    )
    return updated_account.to_profile()


@router.get("/admin/accounts", response_model=AdminAccountListResponse)
def get_admin_accounts(
    current_admin=Depends(get_current_admin),
) -> AdminAccountListResponse:
    return AdminAccountListResponse(items=list_admin_accounts(current_admin))


@router.post("/admin/accounts", response_model=AdminAccountUpdateResponse)
def create_admin_account(
    payload: AdminAccountCreateRequest,
    current_admin=Depends(get_current_admin),
) -> AdminAccountUpdateResponse:
    account = create_managed_account(
        actor=current_admin,
        username=payload.username,
        password=payload.password,
        role=payload.role,
    )
    return AdminAccountUpdateResponse(item=account)


@router.patch(
    "/admin/accounts/{username}",
    response_model=AdminAccountUpdateResponse,
)
def patch_admin_account(
    username: str,
    payload: AdminAccountUpdateRequest,
    current_admin=Depends(get_current_admin),
) -> AdminAccountUpdateResponse:
    account = update_managed_account(
        actor=current_admin,
        username=username,
        new_password=payload.new_password,
        new_role=payload.new_role,
    )
    return AdminAccountUpdateResponse(item=account)


@router.delete(
    "/admin/accounts/{username}",
    response_model=AdminAccountDeleteResponse,
)
def remove_admin_account(
    username: str,
    current_admin=Depends(get_current_admin),
) -> AdminAccountDeleteResponse:
    delete_managed_account(actor=current_admin, username=username)
    return AdminAccountDeleteResponse(deleted_username=username)


@router.get("/resources", response_model=ResourceListResponse)
def get_resources() -> ResourceListResponse:
    return ResourceListResponse(items=list_resources())


@router.get("/admin/resources", response_model=ResourceListResponse)
def get_admin_resources(
    current_admin=Depends(get_current_admin),
) -> ResourceListResponse:
    return ResourceListResponse(items=list_resources(current_admin))


@router.post("/admin/resources/upload", response_model=UploadResponse)
def upload_resource(
    current_admin=Depends(get_current_admin),
    file: UploadFile = File(...),
    kind: str = Form(...),
    name: str = Form(...),
    summary: str = Form(...),
    category: str = Form(...),
    platforms: str = Form(""),
    tags: str = Form(""),
    note: str = Form(""),
) -> UploadResponse:
    if kind not in {"script", "tool"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="资源类型仅支持 script 或 tool",
        )
    resource = save_uploaded_resource(
        owner=current_admin,
        file=file,
        kind=cast(ResourceKind, kind),
        name=name,
        summary=summary,
        category=category,
        platforms=_split_csv(platforms),
        tags=_split_csv(tags),
        note=note,
    )
    return UploadResponse(item=resource)


@router.delete(
    "/admin/resources/{resource_id}",
    response_model=DeleteResourceResponse,
)
def remove_resource(
    resource_id: str,
    current_admin=Depends(get_current_admin),
) -> DeleteResourceResponse:
    delete_resource(resource_id, current_admin)
    return DeleteResourceResponse(deleted_id=resource_id)


def _split_csv(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]
