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
    authenticate_admin,
    create_managed_admin,
    delete_managed_admin,
    list_admin_accounts,
    update_admin_credentials,
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
) -> str:
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
    )


@router.get("/admin/me", response_model=AdminProfileResponse)
def admin_me(username: str = Depends(get_current_admin)) -> AdminProfileResponse:
    return AdminProfileResponse(username=username)


@router.post("/admin/credentials", response_model=AdminProfileResponse)
def update_credentials(
    payload: AdminCredentialUpdateRequest,
    username: str = Depends(get_current_admin),
) -> AdminProfileResponse:
    update_admin_credentials(
        username=username,
        current_password=payload.current_password,
        new_username=payload.new_username,
        new_password=payload.new_password,
    )
    return AdminProfileResponse(username=payload.new_username)


@router.get("/admin/accounts", response_model=AdminAccountListResponse)
def get_admin_accounts(
    username: str = Depends(get_current_admin),
) -> AdminAccountListResponse:
    return AdminAccountListResponse(items=list_admin_accounts(username))


@router.post("/admin/accounts", response_model=AdminProfileResponse)
def create_admin_account(
    payload: AdminAccountCreateRequest,
    username: str = Depends(get_current_admin),
) -> AdminProfileResponse:
    account = create_managed_admin(
        actor_username=username,
        username=payload.username,
        password=payload.password,
    )
    return AdminProfileResponse(username=account.username)


@router.delete(
    "/admin/accounts/{username}",
    response_model=AdminAccountDeleteResponse,
)
def remove_admin_account(
    username: str,
    actor_username: str = Depends(get_current_admin),
) -> AdminAccountDeleteResponse:
    delete_managed_admin(actor_username=actor_username, username=username)
    return AdminAccountDeleteResponse(deleted_username=username)


@router.get("/resources", response_model=ResourceListResponse)
def get_resources() -> ResourceListResponse:
    return ResourceListResponse(items=list_resources())


@router.post("/admin/resources/upload", response_model=UploadResponse)
def upload_resource(
    _: str = Depends(get_current_admin),
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
    _: str = Depends(get_current_admin),
) -> DeleteResourceResponse:
    delete_resource(resource_id)
    return DeleteResourceResponse(deleted_id=resource_id)


def _split_csv(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]
