from __future__ import annotations

import uvicorn
from fastapi import FastAPI

from app.api.router import api_router
from app.core.settings import settings
from app.web import mount_frontend


def create_app() -> FastAPI:
    app = FastAPI(title=settings.app_name, version=settings.app_version)
    app.include_router(api_router, prefix=settings.api_prefix)
    mount_frontend(app)
    return app


app = create_app()


def run() -> None:
    uvicorn.run(
        app,
        host=settings.host,
        port=settings.port,
        reload=False,
    )
