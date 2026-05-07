from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

ResourceKind = Literal["script", "tool"]
AccountRole = Literal["system", "admin", "user"]


class AdminLoginRequest(BaseModel):
    username: str = Field(min_length=3, max_length=64)
    password: str = Field(min_length=8, max_length=128)


class AdminTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_at: datetime
    username: str
    role: AccountRole


class AdminProfileResponse(BaseModel):
    username: str
    role: AccountRole
    authenticated: bool = True
    can_manage_accounts: bool = False
    can_view_all_resources: bool = False


class AdminAccountSummary(BaseModel):
    username: str
    role: AccountRole
    is_current: bool = False
    resource_count: int = 0


class AdminCredentialUpdateRequest(BaseModel):
    current_password: str = Field(min_length=8, max_length=128)
    new_username: str = Field(min_length=3, max_length=64)
    new_password: str = Field(min_length=8, max_length=128)


class AdminAccountCreateRequest(BaseModel):
    username: str = Field(min_length=3, max_length=64)
    password: str = Field(min_length=8, max_length=128)
    role: Literal["admin", "user"] = "user"


class AdminAccountUpdateRequest(BaseModel):
    new_password: str | None = Field(default=None, min_length=8, max_length=128)
    new_role: Literal["admin", "user"] | None = None


class PublishedResource(BaseModel):
    id: str
    name: str
    summary: str
    category: str
    platforms: list[str]
    tags: list[str]
    note: str
    file_name: str
    content_type: str
    file_size: int
    kind: ResourceKind
    download_url: str
    root_url: str | None = None
    wget_command: str | None = None
    owner_username: str
    created_at: datetime


class ResourceListResponse(BaseModel):
    items: list[PublishedResource]


class UploadResponse(BaseModel):
    item: PublishedResource


class DeleteResourceResponse(BaseModel):
    deleted_id: str


class AdminAccountListResponse(BaseModel):
    items: list[AdminAccountSummary]


class AdminAccountDeleteResponse(BaseModel):
    deleted_username: str


class AdminAccountUpdateResponse(BaseModel):
    item: AdminAccountSummary
