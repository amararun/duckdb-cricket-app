# Cricket Analytics App - Architecture

Quick reference for AI coders to understand the app structure.

## Stack Overview

```
Frontend (React/Vite)          Backend (Python/FastAPI)          Database
----------------------         -------------------------         --------
Vercel (Production)    --->    Hetzner VPS (Docker)       --->   DuckDB
localhost:5173 (Dev)           duckdb.tigzig.com                  cricket.duckdb
```

## Database Schema

**File:** `cricket.duckdb` (on backend at `/data/cricket.duckdb`)

### Tables

| Table | Rows | Description |
|-------|------|-------------|
| `ball_by_ball` | ~4.4M | Every delivery in TEST, ODI, T20 matches |
| `match_info` | ~8,762 | Match metadata with results |

### `ball_by_ball` Key Columns
```sql
match_id, start_date, match_type (TEST/ODI/T20)
venue, batting_team, bowling_team, innings
striker, non_striker, bowler
runs_off_bat, extras, wides, noballs, byes, legbyes
wicket_type, player_dismissed
```

### `match_info` Key Columns
```sql
match_id, match_type, start_date, venue
team1, team2, winner
winner_runs, winner_wickets (margin of victory)
```

## Frontend Structure

```
frontend/
├── src/
│   ├── App.tsx              # Routes definition
│   ├── main.tsx             # React entry point
│   ├── services/
│   │   └── api.ts           # All backend API calls
│   ├── components/
│   │   └── layout/
│   │       ├── Header.tsx   # Navigation bar
│   │       └── Footer.tsx   # Footer
│   └── pages/
│       ├── Dashboard.tsx    # Match stats, win rates, trends
│       ├── BattingStats.tsx # Batter leaderboards + filters
│       ├── BowlingStats.tsx # Bowler leaderboards + filters
│       ├── HeadToHead.tsx   # Player vs player matchups
│       ├── Players.tsx      # Player search
│       ├── Matches.tsx      # Match browser
│       ├── Schema.tsx       # DB schema viewer
│       └── Admin.tsx        # File upload/management
```

## Routes

| Path | Component | Description |
|------|-----------|-------------|
| `/` | Dashboard | Overview stats, charts |
| `/batting` | BattingStats | Batting leaderboard |
| `/bowling` | BowlingStats | Bowling leaderboard |
| `/head-to-head` | HeadToHead | Player matchups |
| `/players` | Players | Player search |
| `/matches` | Matches | Match list |
| `/schema` | Schema | Database schema |
| `/admin` | Admin | File management |

## API Layer

**Frontend calls:** `frontend/src/services/api.ts`

All queries go through `/api/duckdb` (Vercel serverless function) which proxies to the backend.

### Key Functions
```typescript
executeQuery(sql)        // Run any SQL query
getTables()              // List all tables
getSchema(tableName)     // Get table columns
```

### Admin Functions
```typescript
getAdminFiles()          // List uploaded .duckdb files
uploadAdminFile(file)    // Upload new database
deleteAdminFile(name)    // Delete database
shareAdminFile(name)     // Generate share link
```

## Backend Endpoints

**Base URL:** `https://duckdb.tigzig.com`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/?action=query` | POST | Execute SQL query |
| `/?action=tables` | GET | List tables |
| `/?action=schema&table=X` | GET | Get table schema |
| `/?action=admin-files` | GET | List files |
| `/?action=admin-upload` | POST | Upload file |
| `/?action=admin-share` | POST | Create share link |

## Key Formulas

### Batting Statistics
- **Average** = Runs / Dismissals
- **Strike Rate** = (Runs / Balls) × 100
- **Boundary %** = (4s×4 + 6s×6) / Runs × 100

### Bowling Statistics
- **Economy** = Runs / Overs
- **Average** = Runs / Wickets
- **Strike Rate** = Balls / Wickets
- **Dot %** = Dot Balls / Total Balls × 100

### Dismissal Logic
```sql
-- Batting dismissal (counts against batter)
wicket_type NOT IN ('retired hurt', 'retired not out')
AND player_dismissed = striker

-- Bowling wicket (counts for bowler)
wicket_type NOT IN ('run out', 'retired hurt', 'retired not out', 'retired out', 'obstructing the field')
```

## Environment Variables

### Backend (`duckdb-cricket-backend/.env`)
```
DATA_PATH=./data/cricket.duckdb    # Database file path
HOST=0.0.0.0
PORT=8000
```

### Frontend (`frontend/.env`)
```
VITE_BACKEND_URL=http://localhost:8000   # Only for local dev
```

## Deployment

### Frontend
- **Host:** Vercel (auto-deploys on git push)
- **Domain:** cricket.tigzig.com
- Builds with `npm run build` in `/frontend`

### Backend
- **Host:** Hetzner VPS (Docker container)
- **Domain:** duckdb.tigzig.com
- **Upload domain:** duckdb-upload.tigzig.com (bypasses Cloudflare)
- Deployed from separate repo: `duckdb-cricket-backend`

## Data Flow

```
User Action → React Component → api.ts → Vercel Proxy → Backend → DuckDB
                                              ↓
                                        Response JSON
                                              ↓
User sees ← React Component ← api.ts ← Vercel Proxy ← Backend
```

## Common Patterns

### Adding a New Page
1. Create `frontend/src/pages/NewPage.tsx`
2. Add route in `frontend/src/App.tsx`
3. Add nav link in `frontend/src/components/layout/Header.tsx`
4. Build: `npm run build`
5. Commit & push (auto-deploys)

### Adding Info Modal to a Page
Each stats page has an Info button that shows metric definitions:
```tsx
import { Info, X } from 'lucide-react'
const [showInfo, setShowInfo] = useState(false)
// Button in header area
// Modal with table of metric definitions
```

### Query Pattern with Filters
```tsx
const conditions: string[] = []
if (matchType !== 'All') conditions.push(`match_type = '${matchType}'`)
conditions.push(`EXTRACT(YEAR FROM start_date) >= ${yearFrom}`)
const whereClause = conditions.join(' AND ')
const result = await executeQuery(`SELECT ... WHERE ${whereClause}`)
```

## Data Notes

- **TEST matches:** 888 matches
- **ODI matches:** 3,073 matches
- **T20 matches:** 4,801 matches
- **Date range:** 2002-2025
- **Ball-by-ball records:** ~4.4 million
- **Unique teams:** 100+ (includes Associate Nations)
