from __future__ import annotations

from pathlib import Path
from typing import Literal

from fastapi import APIRouter, FastAPI
from fastapi.exceptions import HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from app.core.runtime import get_frontend_dist_dir
from app.services.resource_service import resolve_public_file, resolve_root_script


def _has_frontend_dist(dist_dir: Path) -> bool:
    return dist_dir.is_dir() and (dist_dir / "index.html").is_file()


def mount_frontend(app: FastAPI) -> None:
    dist_dir = get_frontend_dist_dir()
    if not _has_frontend_dist(dist_dir):
        register_api_root(app)
        return

    api_root_segment = "api"
    assets_dir = dist_dir / "assets"
    if assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    register_spa_routes(app, dist_dir, api_root_segment)


def register_api_root(app: FastAPI) -> None:
    @app.get("/", include_in_schema=False)
    def root() -> JSONResponse:
        return JSONResponse(
            {
                "message": "Personal Blog API is running",
                "version": app.version,
            }
        )


def register_spa_routes(app: FastAPI, dist_dir: Path, api_root_segment: str) -> None:
    index_file = dist_dir / "index.html"
    spa_router = APIRouter(include_in_schema=False)

    @spa_router.get("/")
    def spa_root() -> FileResponse:
        return FileResponse(index_file)

    @spa_router.get("/downloads/{resource_kind}/{file_name}")
    def public_download(resource_kind: str, file_name: str) -> FileResponse:
        if resource_kind not in {"scripts", "tools"}:
            raise HTTPException(status_code=404, detail="Not Found")
        return FileResponse(
            resolve_public_file(cast_download_kind(resource_kind), file_name)
        )

    @spa_router.get("/{full_path:path}")
    def spa_fallback(full_path: str) -> FileResponse:
        if full_path == api_root_segment or full_path.startswith(
            f"{api_root_segment}/"
        ):
            raise HTTPException(status_code=404, detail="Not Found")

        script_path = resolve_root_script(full_path)
        if script_path is not None:
            return FileResponse(script_path)

        requested_path = (dist_dir / full_path).resolve()
        if requested_path.is_file() and dist_dir.resolve() in requested_path.parents:
            return FileResponse(requested_path)
        return FileResponse(index_file)

    app.include_router(spa_router)


def cast_download_kind(resource_kind: str) -> Literal["scripts", "tools"]:
    return "scripts" if resource_kind == "scripts" else "tools"
