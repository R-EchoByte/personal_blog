# Personal Blog | 个人网站平台

一个以首页首屏体验为核心的个人网站平台。

当前形态：

- 前端：`React + Vite + TypeScript`
- 后端：`FastAPI`
- 部署：前后端一体化打包，后端托管前端静态资源
- 打包入口：根目录 `Makefile`

## 平台特点

- 首页采用沉浸式首屏展示
- 支持随机背景切换
- 支持随机语录拉取与刷新
- 支持前后端一体化打包部署
- 支持 `systemd` 托管与 `nginx` 反向代理
- 支持健康巡检与失败后自动重启

## 技术栈

- Frontend: `React 19`、`React Router 7`、`Vite 7`、`TypeScript`
- Backend: `FastAPI`、`Uvicorn`、`Pydantic Settings`、`HTTPX`
- Tooling: `uv`、`ruff`、`ty`、`PyInstaller`、`Makefile`

## 快速导航

- 代码结构说明：
  - `docs/前后端目录结构技术文档.md`
- 部署与运维说明：
  - `docs/一键部署平台文档.md`

## 本地开发

前端：

```bash
cd frontend
npm install
npm run dev
```

后端：

```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 7869
```

## Ubuntu 标准部署

源码上传到 Ubuntu 后，在项目根目录执行：

```bash
make preflight
make package
make smoke
```

打包产物：

```text
backend/dist/personal_blog
```

详细部署步骤见：

- `docs/一键部署平台文档.md`

## 当前状态

- 已完成：首页首屏、随机语录接口、前后端一体化打包部署
- 已接入：`systemd` 服务托管、`nginx` 反向代理模板
- 当前默认端口：`7869`
