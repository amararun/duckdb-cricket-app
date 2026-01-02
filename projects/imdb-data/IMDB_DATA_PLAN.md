# IMDb Data Project Plan

**Created:** 2026-01-02
**Source:** https://datasets.imdbws.com/
**Documentation:** https://developer.imdb.com/non-commercial-datasets/

---

## Overview

Download official IMDb datasets and load into DuckDB for large-scale data demonstration.

---

## Available IMDb Dataset Files

| File | Compressed Size | Est. Uncompressed | Description |
|------|-----------------|-------------------|-------------|
| `title.principals.tsv.gz` | **747 MB** | ~5-6 GB | Cast/crew credits (LARGEST) |
| `title.akas.tsv.gz` | **474 MB** | ~3-4 GB | Alternative titles by region |
| `name.basics.tsv.gz` | **297 MB** | ~2 GB | 9.6M people (actors, directors) |
| `title.basics.tsv.gz` | **216 MB** | ~1.5 GB | 6.2M titles (movies, shows) |
| `title.crew.tsv.gz` | **80 MB** | ~500 MB | Directors/writers per title |
| `title.episode.tsv.gz` | **52 MB** | ~350 MB | TV episode info |
| `title.ratings.tsv.gz` | **8 MB** | ~50 MB | Ratings/votes |

**Total:** ~1.9 GB compressed, ~12-14 GB uncompressed TSV
**Estimated DuckDB Size:** ~1-2 GB

---

## Schema Details

### title.basics.tsv
Core title information (6.2M titles)
| Column | Type | Description |
|--------|------|-------------|
| tconst | string | Unique identifier (tt0000001) |
| titleType | string | movie, short, tvseries, tvepisode, video, etc. |
| primaryTitle | string | Promotional title |
| originalTitle | string | Original language title |
| isAdult | boolean | 0 or 1 |
| startYear | YYYY | Release/start year |
| endYear | YYYY | Series end year (null for movies) |
| runtimeMinutes | integer | Duration |
| genres | string | Comma-separated, up to 3 |

### title.ratings.tsv
User ratings
| Column | Type | Description |
|--------|------|-------------|
| tconst | string | Title identifier |
| averageRating | decimal | Weighted average (0-10) |
| numVotes | integer | Number of votes |

### name.basics.tsv
People information (9.6M people)
| Column | Type | Description |
|--------|------|-------------|
| nconst | string | Unique identifier (nm0000001) |
| primaryName | string | Credited name |
| birthYear | YYYY | Birth year |
| deathYear | YYYY | Death year (null if alive) |
| primaryProfession | string | Comma-separated professions |
| knownForTitles | string | Comma-separated tconsts |

### title.principals.tsv
Cast and crew credits (LARGEST file)
| Column | Type | Description |
|--------|------|-------------|
| tconst | string | Title identifier |
| ordering | integer | Row order |
| nconst | string | Person identifier |
| category | string | Job category (actor, director, etc.) |
| job | string | Specific role |
| characters | string | Character name(s) |

### title.crew.tsv
Directors and writers
| Column | Type | Description |
|--------|------|-------------|
| tconst | string | Title identifier |
| directors | string | Comma-separated nconsts |
| writers | string | Comma-separated nconsts |

### title.episode.tsv
TV episode information
| Column | Type | Description |
|--------|------|-------------|
| tconst | string | Episode identifier |
| parentTconst | string | Parent series identifier |
| seasonNumber | integer | Season number |
| episodeNumber | integer | Episode number |

### title.akas.tsv
Alternative titles by region
| Column | Type | Description |
|--------|------|-------------|
| titleId | string | Title identifier |
| ordering | integer | Row order |
| title | string | Localized title |
| region | string | Region code |
| language | string | Language code |
| types | string | Title type |
| attributes | string | Additional attributes |
| isOriginalTitle | boolean | 0 or 1 |

---

## Schema Relationships

```
name.basics (nconst)
       ↓
title.principals (nconst, tconst)
       ↓
title.basics (tconst) ←→ title.ratings (tconst)
       ↓
title.crew (tconst)
       ↓
title.episode (tconst, parentTconst)
       ↓
title.akas (titleId = tconst)
```

---

## MVP Approach

### Phase 1: Core Files (Start Here)
1. `title.basics.tsv.gz` (216 MB) - All titles
2. `title.ratings.tsv.gz` (8 MB) - Ratings
3. `name.basics.tsv.gz` (297 MB) - People

**Total:** ~520 MB compressed, ~3.5 GB uncompressed
**Expected DuckDB:** ~300-500 MB

### Phase 2: Add Relationships (Later)
4. `title.principals.tsv.gz` (747 MB) - Cast/crew links
5. `title.crew.tsv.gz` (80 MB) - Directors/writers

### Phase 3: Complete Dataset (Optional)
6. `title.episode.tsv.gz` (52 MB) - TV episodes
7. `title.akas.tsv.gz` (474 MB) - Alternative titles

---

## Data Notes

- **Null values:** Represented as `\N` in TSV files
- **Format:** Tab-separated, UTF-8 encoded
- **Update frequency:** Daily refresh at source
- **License:** Non-commercial use only

---

## Sample Queries (After Import)

```sql
-- Top rated movies with 100k+ votes
SELECT primaryTitle, startYear, averageRating, numVotes
FROM title_basics b
JOIN title_ratings r ON b.tconst = r.tconst
WHERE b.titleType = 'movie' AND r.numVotes > 100000
ORDER BY r.averageRating DESC
LIMIT 20;

-- Most prolific actors (by known titles)
SELECT primaryName,
       LENGTH(knownForTitles) - LENGTH(REPLACE(knownForTitles, ',', '')) + 1 as title_count
FROM name_basics
WHERE primaryProfession LIKE '%actor%'
ORDER BY title_count DESC
LIMIT 20;

-- Movies by decade
SELECT (startYear / 10) * 10 as decade, COUNT(*) as count
FROM title_basics
WHERE titleType = 'movie' AND startYear IS NOT NULL
GROUP BY decade
ORDER BY decade;

-- Genre distribution
SELECT genres, COUNT(*) as count
FROM title_basics
WHERE genres != '\\N'
GROUP BY genres
ORDER BY count DESC
LIMIT 30;
```

---

## Directory Structure

```
projects/imdb-data/
├── IMDB_DATA_PLAN.md      # This file
├── scripts/
│   └── download_and_import.py
├── data/
│   ├── *.tsv.gz           # Downloaded compressed files
│   └── imdb.duckdb        # Final DuckDB database
└── eda_results.txt        # EDA findings
```
