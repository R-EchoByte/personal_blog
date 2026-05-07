from __future__ import annotations

from io import BytesIO

from fastapi import HTTPException, UploadFile

from app.services.admin_auth_models import CurrentAccount
from app.services.resource_service import (
    count_resources_by_owner,
    delete_resource,
    list_resources,
    save_uploaded_resource,
)
from tests.support import BackendTestCase


class ResourceServiceTestCase(BackendTestCase):
    def test_upload_list_and_delete_script_resource(self) -> None:
        owner = CurrentAccount(username="alice", role="admin")
        upload = UploadFile(
            file=BytesIO(b"#!/bin/bash\necho test\n"),
            filename="deploy.sh",
        )

        resource = save_uploaded_resource(
            owner=owner,
            file=upload,
            kind="script",
            name="Deploy Script",
            summary="Deploy helper",
            category="运维",
            platforms=["Linux", "Web"],
            tags=["部署", "脚本"],
            note="first release",
        )

        resources = list_resources(owner)
        self.assertEqual(len(resources), 1)
        self.assertEqual(resources[0].id, resource.id)
        self.assertEqual(resources[0].wget_command, "wget https://resohub.top/deploy.sh")
        self.assertEqual(count_resources_by_owner(), {"alice": 1})

        delete_resource(resource.id, owner)
        self.assertEqual(list_resources(owner), [])
        self.assertEqual(count_resources_by_owner(), {})

    def test_regular_user_cannot_delete_other_owner_resource(self) -> None:
        admin_owner = CurrentAccount(username="admin-a", role="admin")
        viewer = CurrentAccount(username="user-b", role="user")
        upload = UploadFile(file=BytesIO(b"PK\x03\x04"), filename="tool.zip")

        resource = save_uploaded_resource(
            owner=admin_owner,
            file=upload,
            kind="tool",
            name="Tool Bundle",
            summary="bundle",
            category="开发",
            platforms=["Windows"],
            tags=["工具"],
            note="",
        )

        with self.assertRaises(HTTPException) as context:
            delete_resource(resource.id, viewer)
        self.assertEqual(context.exception.status_code, 403)

        admin_visible = list_resources(admin_owner)
        user_visible = list_resources(viewer)
        self.assertEqual(len(admin_visible), 1)
        self.assertEqual(user_visible, [])
