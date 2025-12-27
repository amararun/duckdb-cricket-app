# DuckDB Cricket App - Architecture Plan

## Overview
Read-only dashboard application for querying cricket data stored in DuckDB.

## Directory Structure

```
C:\AMARDATA\GITHUB\
├── DUCKDB_CRICKET_APP/          # React frontend (this repo)
│   ├── src/
│   └── package.json
│
└── duckdb-cricket-backend/      # FastAPI backend (sibling repo)
    ├── app.py                   # Single file, all endpoints
    ├── requirements.txt
    └── .env                     # DATA_PATH, API_KEY, etc.

# On Coolify/Hetzner:
/data/duckdb-datasets/           # Mounted volume for DuckDB files
```

## Frontend (This Repo)
- React app scaffolded from LOG_MONITORING reference
- Dashboard-focused with filters, charts, data tables
- Header, footer, color scheme copied from reference
- No auth initially (Clerk later if needed)

## Backend (Sibling Repo)
- Single `main.py` file - no complex folder structure
- FastAPI with DuckDB connection loaded at startup
- Read-only query endpoints for dashboard
- API key + rate limiting + logger
- Health check endpoint

## DuckDB File Strategy
- **Location**: Coolify mounted volume on Hetzner
- **Path**: Configurable via `DATA_PATH` env var
- **Size**: 100-200 MB
- **Updates**: Push via SSH to mounted volume

## Data Flow

```
React Dashboard → FastAPI Endpoints → DuckDB (file on mounted volume)
     ↓                   ↓
  Filters/UI         SQL queries
                     (pre-built queries for dashboards)
```

## Intermediate Tables
- Created via separate Python script (run manually)
- Script location: `scripts/build_tables.py` in backend
- Run when source .duckdb is updated
- Creates aggregated tables for fast dashboard queries

## Reference Repos
- **Frontend scaffold**: `C:\AMARDATA\GITHUB\LOG_MONITORING`
- **Backend pattern**: `C:\AMARDATA\GITHUB\FASTAPI_FIXED_DATABASES`
- **DuckDB reference**: `arc-reference-repo/` in this repo (ARC package)

## Tech Stack
- Frontend: React + Vite + Tailwind
- Backend: FastAPI + DuckDB
- Deployment: Coolify on Hetzner
- Auth: None initially, Clerk later

## Live URLs
- **Frontend**: TBD (deploy to Coolify/Vercel)
- **Backend**: https://duckdb-cricket-backend.tigzig.com

## API Endpoints
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/health` | GET | No | Health check |
| `/api/v1/tables` | GET | Yes | List tables |
| `/api/v1/schema/{table}` | GET | Yes | Get table schema |
| `/api/v1/query` | POST | Yes | Execute SQL query |

## TODO: Security Enhancement
**IMPORTANT**: Before public release, move API calls to a serverless function:
- Current setup: API key is in frontend JS (visible to anyone)
- Target setup: Frontend → Serverless Function (with secret API key) → Backend
- This prevents DDoS and abuse of the backend API
- Options: Vercel Functions, Cloudflare Workers, or Coolify serverless
