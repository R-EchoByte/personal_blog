from fastapi import FastAPI

from app.api.router import api_router
from app.core.settings import settings

app = FastAPI(title=settings.app_name)
app.include_router(api_router, prefix=settings.api_prefix)


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "Personal Blog API is running"}
