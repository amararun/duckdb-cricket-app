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
- **Auth**: Clerk for Admin module (see Authentication section below)

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
- Auth: Clerk (for Admin module)

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

---

## Authentication & Authorization (Clerk)

### Overview
Admin module uses Clerk for authentication + role-based access control (RBAC).
- **Authentication**: Verifies user identity (Google Sign-In)
- **Authorization**: Checks if user has `admin` role in `publicMetadata`

### Environment Variables
```bash
# frontend/.env.local
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxxx  # Get from Clerk Dashboard
```

### Key Files
| File | Purpose |
|------|---------|
| `frontend/src/main.tsx` | `ClerkProvider` wraps entire app |
| `frontend/src/pages/Admin.tsx` | Protected with `SignedIn/SignedOut` + role check |
| `frontend/.env.local` | Clerk publishable key (VITE_ prefix = browser-exposed) |

### Implementation Pattern
```tsx
// main.tsx - Wrap app with ClerkProvider
import { ClerkProvider } from '@clerk/clerk-react'

<ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
  <App />
</ClerkProvider>

// Admin.tsx - Role-based access control
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from '@clerk/clerk-react'

const { user } = useUser()
const isAdmin = user?.publicMetadata?.role === 'admin'

// Three states:
// 1. SignedOut → Show "Sign in with Google" button
// 2. SignedIn + !isAdmin → Show "Access Denied" + Sign Out
// 3. SignedIn + isAdmin → Show Admin interface
```

### Managing User Access (Dashboard-Based)
**No code changes needed to add/remove users.**

1. Go to [Clerk Dashboard](https://dashboard.clerk.com) → Users
2. Select user → Scroll to "User metadata"
3. Edit "Public" metadata → Add: `{ "role": "admin" }`
4. Save → User now has admin access

To revoke: Remove the `role` field or change to different role.

### Security Model
| Layer | What It Does | Real Protection? |
|-------|--------------|------------------|
| Clerk SignedIn | Checks if user is logged in | UX only |
| publicMetadata role | Checks if user is admin | UX only |
| Backend API Key | Protects actual data endpoints | **YES** |

**Frontend auth = UX convenience** (hide/show UI elements)
**Backend API key = Real protection** (without it, no data access)

Even if someone bypasses JS checks, they can't access data without backend API key.

### Blocking Sign-Ups (Optional)
To prevent random users from even signing in:
1. Clerk Dashboard → User & Authentication → Restrictions
2. Enable "Allowlist" → Add specific email domains or addresses
3. Only allowlisted users can create accounts
