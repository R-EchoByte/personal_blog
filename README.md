# Personal Blog | 个人网站（React + FastAPI）

一个以首页首屏体验为核心的个人网站项目，采用前后端分离架构：
- 前端：React + Vite，负责视觉呈现与交互体验
- 后端：FastAPI，负责健康检查与随机语录接口

## 网站特点

- 沉浸式首屏：全屏背景图 + 渐变遮罩 + 毛玻璃语录卡片。
- 随机背景池：自动读取 `public/` 下 `bj*` 命名图片并随机切换。
- 语录交互：页面加载自动拉取一言，支持按钮与快捷键刷新。
- 键盘快捷导航：
  - `B`：切换背景
  - `Q`：刷新语录
  - `1/2/3/4`：跳转快捷入口
- 移动端适配：针对小屏做了字号、间距与布局收敛。

## 技术栈

- Frontend: React 19, React Router 7, Vite 7, TypeScript
- Backend: FastAPI, Uvicorn, Pydantic Settings, HTTPX

## 快速启动

建议环境：
- Node.js 20+
- Python 3.11+
- uv（Python 包与虚拟环境管理）

1. 启动后端

```bash
cd backend
uv venv
.venv\Scripts\activate
uv pip install -r requirements.txt
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

后端固定端口示例（6666）：

```bash
# Windows: 先检查端口是否被占用
netstat -ano | findstr :6666

# 若无输出则可直接启动
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 6666
```

2. 启动前端

```bash
cd frontend
npm install
npm run dev
```

可选固定端口：

```bash
npm run dev:6677
```

默认访问地址：
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8000`
- Backend(6666示例): `http://localhost:6666`

## API 一览

- `GET /`：后端根接口
- `GET /api/v1/health`：健康检查
- `GET /api/v1/quote/random`：随机语录

## 项目结构

```text
personal_blog/
├─ frontend/   # React 前端
├─ backend/    # FastAPI 后端
└─ docs/       # 技术文档与规划
```

## 当前页面状态

- 已完成：`/` 首页首屏
- 预留入口：`/blog`、`/ai`、`/software`、`/movies`（当前路由未落地，访问会进入 404）

## 相关文档

- `docs/前后端目录结构技术文档.md`
- `docs/一体化网站技术方案.md`
- `docs/首页首屏实现说明.md`
- `docs/下一阶段开发规划.md`
