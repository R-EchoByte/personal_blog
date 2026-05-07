from __future__ import annotations

from pathlib import Path

from app.core.runtime import get_backend_root


def get_data_dir() -> Path:
    return get_backend_root() / "data"


def get_upload_root() -> Path:
    return get_data_dir() / "uploads"


def get_script_upload_dir() -> Path:
    return get_upload_root() / "scripts"


def get_tool_upload_dir() -> Path:
    return get_upload_root() / "tools"


def get_metadata_dir() -> Path:
    return get_data_dir() / "meta"


def get_resource_metadata_file() -> Path:
    return get_metadata_dir() / "resources.json"


def get_admin_credentials_file() -> Path:
    return get_metadata_dir() / "admin_credentials.json"
