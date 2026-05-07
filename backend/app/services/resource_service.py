from __future__ import annotations

import json
import mimetypes
import re
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Literal
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status

from app.core.settings import settings
from app.core.storage import (
    get_metadata_dir,
    get_resource_metadata_file,
    get_script_upload_dir,
    get_tool_upload_dir,
)
from app.schemas.admin import PublishedResource, ResourceKind

SAFE_FILE_NAME = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$")
SCRIPT_EXTENSIONS = {".sh"}
TOOL_EXTENSIONS = {
    ".zip",
    ".exe",
    ".msi",
    ".tar",
    ".gz",
    ".tgz",
    ".bz2",
    ".7z",
    ".appimage",
    ".deb",
    ".rpm",
}
TEXT_LIMITS = {"name": 80, "summary": 160, "category": 20, "note": 400}
FIELD_LABELS = {"name": "资源名称", "summary": "摘要", "category": "分类"}


def _now() -> datetime:
    return datetime.now(UTC)


def _resource_dirs() -> dict[ResourceKind, Path]:
    return {"script": get_script_upload_dir(), "tool": get_tool_upload_dir()}


def _ensure_storage() -> None:
    get_metadata_dir().mkdir(parents=True, exist_ok=True)
    for directory in _resource_dirs().values():
        directory.mkdir(parents=True, exist_ok=True)


def _read_metadata() -> list[dict[str, Any]]:
    _ensure_storage()
    metadata_file = get_resource_metadata_file()
    if not metadata_file.is_file():
        metadata_file.write_text("[]", encoding="utf-8")
        return []
    return json.loads(metadata_file.read_text(encoding="utf-8"))


def _write_metadata(items: list[dict[str, Any]]) -> None:
    get_resource_metadata_file().write_text(
        json.dumps(items, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def _normalize_file_name(file_name: str) -> str:
    normalized = Path(file_name).name.strip()
    if not normalized or not SAFE_FILE_NAME.fullmatch(normalized):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="文件名不合法，请使用英文、数字、点、横线或下划线",
        )
    return normalized


def _build_public_paths(kind: ResourceKind, file_name: str) -> tuple[str, str | None]:
    if kind == "script":
        return f"/downloads/scripts/{file_name}", f"/{file_name}"
    return f"/downloads/tools/{file_name}", None


def _validate_extension(kind: ResourceKind, file_name: str) -> None:
    suffixes = Path(file_name).suffixes
    has_tar_gz = suffixes[-2:] == [".tar", ".gz"]
    extension = (
        "".join(suffixes[-2:])
        if has_tar_gz
        else (suffixes[-1] if suffixes else "")
    )
    allowed_extensions = SCRIPT_EXTENSIONS if kind == "script" else TOOL_EXTENSIONS
    if extension.lower() not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"不支持的文件类型: {extension or '无扩展名'}",
        )


def _to_resource(item: dict[str, Any]) -> PublishedResource:
    root_url = item.get("root_url")
    public_site_url = settings.public_site_url.rstrip("/")
    wget_command = f"wget {public_site_url}{root_url}" if root_url else None
    return PublishedResource(
        id=item["id"],
        name=item["name"],
        summary=item["summary"],
        category=item["category"],
        platforms=item["platforms"],
        tags=item["tags"],
        note=item["note"],
        file_name=item["file_name"],
        content_type=item["content_type"],
        file_size=item["file_size"],
        kind=item["kind"],
        download_url=item["download_url"],
        root_url=root_url,
        wget_command=wget_command,
        created_at=datetime.fromisoformat(item["created_at"]),
    )


def list_resources() -> list[PublishedResource]:
    items = [_to_resource(item) for item in _read_metadata()]
    return sorted(items, key=lambda item: item.created_at, reverse=True)


def _clean_text(value: str, field_name: str) -> str:
    cleaned = " ".join(value.strip().split())
    if not cleaned:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{FIELD_LABELS[field_name]}不能为空",
        )
    if len(cleaned) > TEXT_LIMITS[field_name]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"{FIELD_LABELS[field_name]}长度不能超过 "
                f"{TEXT_LIMITS[field_name]} 个字符"
            ),
        )
    return cleaned


def _clean_list(value: list[str], fallback: list[str], *, limit: int) -> list[str]:
    cleaned_items: list[str] = []
    for item in value:
        normalized = " ".join(item.strip().split())
        if not normalized or normalized in cleaned_items:
            continue
        cleaned_items.append(normalized)
    if not cleaned_items:
        return fallback
    return cleaned_items[:limit]


def save_uploaded_resource(
    *,
    file: UploadFile,
    kind: ResourceKind,
    name: str,
    summary: str,
    category: str,
    platforms: list[str],
    tags: list[str],
    note: str,
) -> PublishedResource:
    _ensure_storage()
    file_name = _normalize_file_name(file.filename or "")
    _validate_extension(kind, file_name)
    target_dir = _resource_dirs()[kind]
    target_path = target_dir / file_name
    if target_path.exists():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="同名文件已存在，请先删除旧文件或更换文件名",
        )

    content = file.file.read()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="上传文件不能为空",
        )

    target_path.write_bytes(content)
    content_type = file.content_type or mimetypes.guess_type(file_name)[0] or (
        "application/octet-stream"
    )
    download_url, root_url = _build_public_paths(kind, file_name)
    item = {
        "id": uuid4().hex,
        "name": _clean_text(name, "name"),
        "summary": _clean_text(summary, "summary"),
        "category": _clean_text(category, "category"),
        "platforms": _clean_list(platforms, ["Web"], limit=4),
        "tags": _clean_list(tags, ["下载"], limit=6),
        "note": note.strip()[: TEXT_LIMITS["note"]],
        "file_name": file_name,
        "content_type": content_type,
        "file_size": len(content),
        "kind": kind,
        "download_url": download_url,
        "root_url": root_url,
        "created_at": _now().isoformat(),
    }
    items = _read_metadata()
    items.append(item)
    _write_metadata(items)
    return _to_resource(item)


def delete_resource(resource_id: str) -> None:
    items = _read_metadata()
    retained_items: list[dict[str, Any]] = []
    deleted_item: dict[str, Any] | None = None
    for item in items:
        if item["id"] == resource_id:
            deleted_item = item
            continue
        retained_items.append(item)

    if deleted_item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="资源不存在",
        )

    file_path = _resource_dirs()[deleted_item["kind"]] / deleted_item["file_name"]
    if file_path.exists():
        file_path.unlink()
    _write_metadata(retained_items)


def resolve_public_file(kind: Literal["scripts", "tools"], file_name: str) -> Path:
    normalized_file_name = _normalize_file_name(file_name)
    directory = (
        get_script_upload_dir() if kind == "scripts" else get_tool_upload_dir()
    )
    file_path = (directory / normalized_file_name).resolve()
    if not file_path.is_file() or directory.resolve() not in file_path.parents:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="文件不存在",
        )
    return file_path


def resolve_root_script(script_name: str) -> Path | None:
    if not script_name.endswith(".sh"):
        return None
    normalized_script_name = _normalize_file_name(script_name)
    file_path = (get_script_upload_dir() / normalized_script_name).resolve()
    script_dir = get_script_upload_dir().resolve()
    if not file_path.is_file() or script_dir not in file_path.parents:
        return None
    return file_path
