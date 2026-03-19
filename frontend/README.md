# Frontend (React)

## Quick Start

1. `cd frontend`
2. `npm install`
3. `npm run dev`（默认端口 5173）
4. 或 `npm run dev:6677`（用于固定端口预览）

## Notes

- Build output is `dist/`.
- Configure API endpoint in `.env.example`.
- Avoid browser blocked ports (e.g. `6666`) to prevent `ERR_UNSAFE_PORT`.
- Quote widget requests `/api/v1/quote/random`, so backend `:8000` should be running in dev.
