# DuckDB Dashboards - Architecture

## Quick Reference

| Item | Value |
|------|-------|
| **Frontend** | React + Vite + Tailwind, deployed to Vercel |
| **Backend** | FastAPI + DuckDB at `https://duckdb-backend.tigzig.com` |
| **Vercel Project** | `duckdb-dashboards` |
| **GitHub Repo** | `amararun/duckdb-dashboards` |
| **Live URL** | `https://duckdb-dashboards.vercel.app` |

## Directory Structure

```
frontend/
├── src/
│   ├── features/
│   │   ├── cricket/pages/     # CricketDashboard, BattingStats, BowlingStats, HeadToHead
│   │   └── imdb/pages/        # ImdbDashboard, TopRated, ActorSearch, GenreAnalytics (placeholders)
│   ├── pages/
│   │   ├── Landing.tsx        # Home page with links to Cricket/IMDb sections
│   │   └── Admin.tsx          # Clerk-protected admin interface
│   ├── components/
│   │   ├── Header.tsx         # Context-aware nav (indigo=cricket, amber=imdb)
│   │   └── Footer.tsx
│   ├── services/
│   │   └── api.ts             # API client with executeCricketQuery, executeImdbQuery
│   └── App.tsx                # Routes: /, /cricket/*, /imdb/*, /admin
├── index.html
└── package.json

api/
└── duckdb.ts                  # Vercel serverless proxy to backend

docs/
└── APP_ARCHITECTURE.md        # This file
```

## API Architecture

### Per-File Token System
Backend uses per-file read tokens for security. Each DuckDB file has its own token.

```
Frontend → Vercel Proxy (api/duckdb.ts) → Backend API
                ↓
    Adds Authorization header with per-file token
```

### Vercel Env Vars (Production)
```
DUCKDB_BACKEND_URL=https://duckdb-backend.tigzig.com
DUCKDB_BACKEND_API_KEY=<master-admin-key>     # For admin operations
CRICKET_READ_TOKEN=<cricket-read-token>        # For cricket.duckdb queries
IMDB_READ_TOKEN=<imdb-read-token>              # For imdb.duckdb queries (pending)
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxx         # Clerk auth
```

### API Actions (api/duckdb.ts)

| Action | Endpoint | Token Used | Purpose |
|--------|----------|------------|---------|
| `cricket-query` | `/api/v1/files/cricket.duckdb/query` | CRICKET_READ_TOKEN | Cricket dashboard queries |
| `imdb-query` | `/api/v1/files/imdb.duckdb/query` | IMDB_READ_TOKEN | IMDb dashboard queries |
| `query` | `/api/v1/admin/query` | BACKEND_API_KEY | Legacy admin queries |
| `admin-*` | `/api/v1/admin/*` | BACKEND_API_KEY | Admin operations |

### Frontend API Functions (services/api.ts)

```typescript
// Per-file queries (read-only tokens)
executeCricketQuery(sql, limit?)  // → action=cricket-query
executeImdbQuery(sql, limit?)     // → action=imdb-query

// Admin operations (master key)
executeQuery(sql, limit?)         // → action=query (legacy)
adminListFiles()                  // → action=admin-files
adminUploadFile(file)             // → action=admin-upload
```

## Routes

| Path | Component | Description |
|------|-----------|-------------|
| `/` | Landing | Home page with Cricket/IMDb cards |
| `/cricket` | CricketDashboard | Match stats, win rates, charts |
| `/cricket/batting` | BattingStats | Player batting statistics |
| `/cricket/bowling` | BowlingStats | Player bowling statistics |
| `/cricket/head-to-head` | HeadToHead | Player matchup analysis |
| `/imdb` | ImdbDashboard | (Placeholder) |
| `/imdb/top-rated` | TopRated | (Placeholder) |
| `/imdb/actors` | ActorSearch | (Placeholder) |
| `/imdb/genres` | GenreAnalytics | (Placeholder) |
| `/admin` | Admin | Clerk-protected admin interface |

## Data Sources

### Cricket (cricket.duckdb)
- **Tables**: `match_info`, `ball_by_ball`
- **Records**: ~8,700 matches, ~4.4M deliveries
- **Coverage**: Test, ODI, T20 internationals (2002-2025)
- **Token**: `CRICKET_READ_TOKEN` env var

### IMDb (imdb.duckdb) - Pending
- **Tables**: TBD
- **Token**: `IMDB_READ_TOKEN` env var

## Authentication (Clerk)

Admin module uses Clerk for Google Sign-In + role-based access.

```typescript
// Check admin role
const { user } = useUser()
const isAdmin = user?.publicMetadata?.role === 'admin'
```

**Add admin access**: Clerk Dashboard → Users → Edit metadata → `{ "role": "admin" }`

## Key Patterns

### Adding a New Data Source
1. Create token in backend: `POST /api/v1/admin/files/{filename}/tokens`
2. Add `NEW_SOURCE_READ_TOKEN` to Vercel env vars
3. Add case in `api/duckdb.ts` for new action
4. Add `executeNewSourceQuery()` in `services/api.ts`
5. Create pages in `features/newsource/pages/`
6. Add routes in `App.tsx`

### Context-Aware Header
Header component changes colors based on route:
- `/cricket/*` → Indigo theme
- `/imdb/*` → Amber theme
- Default → Slate theme

## Deployment

```bash
# Build
cd frontend && npm run build

# Deploy to Vercel
vercel --prod

# Add env var
echo "token-value" | vercel env add VAR_NAME production
```
