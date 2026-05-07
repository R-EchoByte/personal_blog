from fastapi import HTTPException

from app.core.settings import settings
from app.services.admin_auth_models import CurrentAccount
from app.services.admin_auth_service import (
    authenticate_admin,
    create_managed_account,
    delete_managed_account,
    update_admin_credentials,
    update_managed_account,
    verify_admin_token,
)
from tests.support import BackendTestCase


class AdminAuthServiceTestCase(BackendTestCase):
    def test_managed_account_lifecycle_and_token_verification(self) -> None:
        system_actor = CurrentAccount(username=settings.admin_username, role="system")

        created = create_managed_account(
            actor=system_actor,
            username="alice",
            password="AlicePass123!",
            role="admin",
        )
        self.assertEqual(created.username, "alice")
        self.assertEqual(created.role, "admin")

        token = authenticate_admin("alice", "AlicePass123!")
        self.assertEqual(token.role, "admin")

        current_account = verify_admin_token(token.token)
        self.assertEqual(current_account.username, "alice")
        self.assertTrue(current_account.can_manage_accounts)

    def test_update_managed_account_and_delete_account(self) -> None:
        system_actor = CurrentAccount(username=settings.admin_username, role="system")
        create_managed_account(
            actor=system_actor,
            username="bob",
            password="BobPass123!",
            role="user",
        )

        updated = update_managed_account(
            actor=system_actor,
            username="bob",
            new_password="BobPass456!",
            new_role="admin",
        )
        self.assertEqual(updated.role, "admin")

        token = authenticate_admin("bob", "BobPass456!")
        self.assertEqual(token.role, "admin")

        delete_managed_account(actor=system_actor, username="bob")
        with self.assertRaises(HTTPException) as context:
            authenticate_admin("bob", "BobPass456!")
        self.assertEqual(context.exception.status_code, 401)

    def test_update_admin_credentials_reissues_login_identity(self) -> None:
        system_actor = CurrentAccount(username=settings.admin_username, role="system")
        create_managed_account(
            actor=system_actor,
            username="carol",
            password="CarolPass123!",
            role="admin",
        )

        updated_account = update_admin_credentials(
            current_account=CurrentAccount(username="carol", role="admin"),
            current_password="CarolPass123!",
            new_username="carol-renamed",
            new_password="CarolPass456!",
        )
        self.assertEqual(updated_account.username, "carol-renamed")

        token = authenticate_admin("carol-renamed", "CarolPass456!")
        current_account = verify_admin_token(token.token)
        self.assertEqual(current_account.username, "carol-renamed")

        with self.assertRaises(HTTPException) as context:
            authenticate_admin("carol", "CarolPass123!")
        self.assertEqual(context.exception.status_code, 401)
