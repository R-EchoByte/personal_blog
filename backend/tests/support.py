from __future__ import annotations

import tempfile
import unittest
from contextlib import ExitStack
from pathlib import Path
from unittest.mock import patch

from app.core.settings import settings


class BackendTestCase(unittest.TestCase):
    def setUp(self) -> None:
        self._tempdir = tempfile.TemporaryDirectory()
        self._stack = ExitStack()
        self.backend_root = Path(self._tempdir.name)

        self._stack.enter_context(
            patch("app.core.storage.get_backend_root", return_value=self.backend_root)
        )
        self._stack.enter_context(
            patch("app.core.runtime.get_backend_root", return_value=self.backend_root)
        )

        self._settings_backup = {
            "admin_username": settings.admin_username,
            "admin_password": settings.admin_password,
            "admin_password_hash": settings.admin_password_hash,
            "admin_token_secret": settings.admin_token_secret,
            "admin_token_ttl_hours": settings.admin_token_ttl_hours,
            "public_site_url": settings.public_site_url,
        }
        settings.admin_username = "rootadmin"
        settings.admin_password = "RootPass123!"
        settings.admin_password_hash = ""
        settings.admin_token_secret = "test-secret"
        settings.admin_token_ttl_hours = 24
        settings.public_site_url = "https://resohub.top"

    def tearDown(self) -> None:
        for key, value in self._settings_backup.items():
            setattr(settings, key, value)
        self._stack.close()
        self._tempdir.cleanup()
