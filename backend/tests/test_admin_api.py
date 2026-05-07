from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import create_app
from tests.support import BackendTestCase


class AdminApiTestCase(BackendTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.client = TestClient(create_app())

    def tearDown(self) -> None:
        self.client.close()
        super().tearDown()

    def test_login_upload_list_and_delete_resource_via_api(self) -> None:
        login_response = self.client.post(
            "/api/v1/admin/login",
            json={
                "username": "rootadmin",
                "password": "RootPass123!",
            },
        )
        self.assertEqual(login_response.status_code, 200)
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        upload_response = self.client.post(
            "/api/v1/admin/resources/upload",
            headers=headers,
            data={
                "kind": "script",
                "name": "Bootstrap Script",
                "summary": "bootstrap server",
                "category": "运维",
                "platforms": "Linux,Web",
                "tags": "部署,脚本",
                "note": "api upload",
            },
            files={
                "file": (
                    "bootstrap.sh",
                    b"#!/bin/bash\necho ok\n",
                    "text/x-shellscript",
                )
            },
        )
        self.assertEqual(upload_response.status_code, 200)
        resource_id = upload_response.json()["item"]["id"]

        list_response = self.client.get("/api/v1/admin/resources", headers=headers)
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(len(list_response.json()["items"]), 1)

        delete_response = self.client.delete(
            f"/api/v1/admin/resources/{resource_id}",
            headers=headers,
        )
        self.assertEqual(delete_response.status_code, 200)

        after_delete_response = self.client.get(
            "/api/v1/admin/resources",
            headers=headers,
        )
        self.assertEqual(after_delete_response.status_code, 200)
        self.assertEqual(after_delete_response.json()["items"], [])

    def test_health_endpoint_still_available(self) -> None:
        response = self.client.get("/api/v1/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ok")
