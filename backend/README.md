# Backend (FastAPI)

## Quick Start

1. `cd backend`
2. `python -m venv .venv`
3. `.venv\\Scripts\\activate`
4. `pip install -r requirements.txt`
5. `uvicorn app.main:app --reload --port 8000`

## API

- Root: `GET /`
- Health: `GET /api/v1/health`
- Quote: `GET /api/v1/quote/random`
