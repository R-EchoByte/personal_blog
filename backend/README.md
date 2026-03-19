# Backend（FastAPI）

个人网站后端服务，提供基础健康检查与随机语录接口，供首页首屏调用。

## 功能职责

- 服务状态检查：`/` 与 `/api/v1/health`
- 语录接口：`/api/v1/quote/random`
  - 后端拉取第三方一言源并解析
  - 过滤超长文本（最大 16 字）
  - 异常时返回空语录，避免前端请求失败

## 快速启动

1. `cd backend`
2. `python -m venv .venv`
3. `.venv\Scripts\activate`
4. `pip install -r requirements.txt`
5. `uvicorn app.main:app --reload --port 8000`

## API 列表

- `GET /`
  - 返回：`{"message":"Personal Blog API is running"}`
- `GET /api/v1/health`
  - 返回：`{"status":"ok","app":"Personal Blog API","env":"dev"}`
- `GET /api/v1/quote/random`
  - 返回：`{"quote":"...","source":"一言","provider":"api.mmp.cc"}`

## 配置项

通过 `app/core/settings.py` 管理：

- `app_name`（默认：`Personal Blog API`）
- `app_env`（默认：`dev`）
- `api_prefix`（默认：`/api/v1`）

支持从 `.env` 加载同名配置。

## 依赖

- `fastapi`
- `uvicorn[standard]`
- `pydantic-settings`
- `httpx`
