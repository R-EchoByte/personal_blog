from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from app.schemas.admin import AccountRole, AdminProfileResponse


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
