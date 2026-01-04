# Cricket Analytics Dashboard - Plan

## Current Implementation

### 1. Batting Statistics (`/batting`)
**Status:** Implemented

| Metric | Formula | Notes |
|--------|---------|-------|
| Matches | `COUNT(DISTINCT match_id)` | |
| Innings | Same as matches | Future: Calculate actual innings batted |
| Runs | `SUM(runs_off_bat)` | Excludes extras |
| Balls Faced | `COUNT(*)` | All deliveries faced |
| Dismissals | Count where `player_dismissed = striker` | Excludes retired hurt/not out |
| Not Outs | Innings - Dismissals | |
| Average | Runs / Dismissals | Key ODI metric |
| Strike Rate | (Runs / Balls) * 100 | Runs per 100 balls |
| Fours | Count of `runs_off_bat = 4` | |
| Sixes | Count of `runs_off_bat = 6` | |
| Boundary % | (4s*4 + 6s*6) / Runs * 100 | % runs from boundaries |

**Filters:** Match Type, Year Range, Team, Min Matches

**Future Enhancements:**
- Highest Score (per innings)
- 50s / 100s count (requires innings-level aggregation)
- vs specific opponent filter
- at specific venue filter
- Phase-wise stats (powerplay, middle overs, death)

---

### 2. Bowling Statistics (`/bowling`)
**Status:** Implemented

| Metric | Formula | Notes |
|--------|---------|-------|
| Matches | `COUNT(DISTINCT match_id)` | |
| Overs | Balls / 6 | |
| Runs | `SUM(runs_off_bat + wides + noballs)` | Excludes byes/legbyes |
| Wickets | Bowler-credited dismissals | Excludes run outs |
| Economy | Runs / Overs | Runs per over (lower = better) |
| Average | Runs / Wickets | Runs per wicket (lower = better) |
| Strike Rate | Balls / Wickets | Balls per wicket (lower = better) |
| Dot % | Dot balls / Balls * 100 | Pressure metric |
| 4s/6s | Boundaries conceded | |

**Wicket Types Credited to Bowler:**
- caught, bowled, lbw, stumped, caught and bowled, hit wicket

**NOT Credited:**
- run out, retired hurt, retired not out, obstructing the field

**Filters:** Match Type, Year Range, Team, Min Matches

**Future Enhancements:**
- Best figures (wickets/runs in single innings)
- 4-wicket / 5-wicket hauls count
- Maidens (requires over-level aggregation)
- Phase-wise economy (powerplay, middle, death)

---

## Planned Dashboards

### 3. Match Summary (`/matches`)
**Status:** Placeholder

Show match-level data:
- Match date, venue, teams
- Innings totals, winner
- Top scorers, top wicket-takers per match
- Searchable/filterable match list

---

### 4. Team Statistics (`/teams`)
**Status:** Not started

Aggregate team performance:
- Win/Loss record by format
- Average runs scored/conceded
- Performance vs specific opponents
- Home vs Away splits

---

### 5. Head-to-Head (`/head-to-head`)
**Status:** Not started

Compare two teams or two players:
- Historical record
- Key matchups
- Performance trends

---

### 6. Venue Statistics (`/venues`)
**Status:** Not started

Ground-specific insights:
- Average first/second innings score
- Batting/bowling friendly classification
- Notable performances at venue

---

### 7. Season/Tournament View (`/seasons`)
**Status:** Not started

Performance by season or tournament:
- Top performers per season
- Team standings
- Trend analysis over years

---

### 8. Player Profile (`/player/:name`)
**Status:** Not started

Detailed individual player page:
- Career summary (batting + bowling)
- Year-by-year breakdown
- Performance vs each opponent
- Recent form

---

### 9. Live/Recent Matches
**Status:** Not started (requires data updates)

- Recent match results
- Upcoming fixtures (if data available)

---

## Technical Notes

### Data Source
- DuckDB file: `odi_t20.duckdb` (~37MB)
- Ball-by-ball data: 2.6M rows
- Date range: 2002-2025
- Formats: ODI + T20

### Architecture
```
Frontend (React/Vite) → Vercel Serverless → FastAPI Backend → DuckDB
                              ↑
                     API key hidden here
```

### Performance Considerations
- Current queries return top 500 players (paginated 50/page)
- Complex aggregations (innings-level) may need pre-computed views
- Consider caching for expensive queries
