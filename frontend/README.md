# Frontend（React）

个人网站首屏前端工程，聚焦视觉体验与高频交互（背景切换、语录刷新、快捷键导航）。

## 页面亮点

- 全屏背景图随机展示（从 `public/bj*` 图片自动生成清单）。
- 毛玻璃语录卡片，支持按钮和快捷键刷新。
- 快捷键支持：
  - `B`：换背景
  - `Q`：换一句
  - `1/2/3/4`：跳转首页快捷入口
- 响应式样式，兼容桌面端与移动端。

## 快速启动

1. `cd frontend`
2. `npm install`
3. `npm run dev`（默认端口 `5173`）
4. 或 `npm run dev:6677`（固定端口 `6677`）

## 常用脚本

- `npm run dev`：开发模式（会先执行背景清单同步）
- `npm run dev:6677`：开发模式，监听 `0.0.0.0:6677`
- `npm run build`：构建生产包到 `dist/`
- `npm run preview`：预览构建结果
- `npm run bg:sync`：生成 `public/bj-manifest.json`

## 背景图规范

- 图片放在 `frontend/public/`
- 文件名需以 `bj` 开头，支持格式：`.jpg/.jpeg/.png/.webp/.avif`
- `npm run dev`/`npm run build` 会自动刷新背景清单

示例：`bj1.png`、`bj_sky.webp`

## 与后端联调

- 前端调用：`/api/v1/quote/random`
- Vite 开发代理：将 `/api` 转发到 `http://localhost:8000`
- 本地联调时请先启动后端服务

## 注意事项

- 浏览器通常会屏蔽 `6666` 等不安全端口，建议使用 `5173` 或 `6677`。
- 若没有可用 `bj*` 背景图，页面会尝试回退到 `/landing-bg.jpg`。
- 首页快捷入口中 `/blog`、`/ai`、`/software`、`/movies` 目前是预留路由，尚未实现实际页面。
