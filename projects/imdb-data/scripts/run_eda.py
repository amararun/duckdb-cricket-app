"""
Run EDA on IMDb DuckDB database
"""

import duckdb
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"
db_path = DATA_DIR / "imdb.duckdb"
conn = duckdb.connect(str(db_path), read_only=True)

results = []
results.append("=" * 60)
results.append("IMDb DuckDB - Exploratory Data Analysis")
results.append("=" * 60)
results.append("")

# Table counts
results.append("## Table Row Counts")
results.append("-" * 40)
for table in ["title_basics", "title_ratings", "name_basics"]:
    count = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
    results.append(f"{table}: {count:,} rows")
results.append("")

# Title types distribution
results.append("## Title Types Distribution (Top 10)")
results.append("-" * 40)
rows = conn.execute("""
    SELECT titleType, COUNT(*) as cnt
    FROM title_basics
    GROUP BY titleType
    ORDER BY cnt DESC
    LIMIT 10
""").fetchall()
for row in rows:
    results.append(f"{row[0]}: {row[1]:,}")
results.append("")

# Movies by decade
results.append("## Movies by Decade")
results.append("-" * 40)
rows = conn.execute("""
    SELECT (startYear / 10) * 10 as decade, COUNT(*) as cnt
    FROM title_basics
    WHERE titleType = 'movie' AND startYear IS NOT NULL AND startYear >= 1900
    GROUP BY decade
    ORDER BY decade
""").fetchall()
for row in rows:
    results.append(f"{int(row[0])}s: {row[1]:,}")
results.append("")

# Rating statistics
results.append("## Rating Statistics")
results.append("-" * 40)
stats = conn.execute("""
    SELECT
        COUNT(*) as total,
        AVG(averageRating) as avg_rating,
        MIN(averageRating) as min_rating,
        MAX(averageRating) as max_rating,
        AVG(numVotes) as avg_votes,
        MAX(numVotes) as max_votes
    FROM title_ratings
""").fetchone()
results.append(f"Total rated titles: {stats[0]:,}")
results.append(f"Average rating: {stats[1]:.2f}")
results.append(f"Rating range: {stats[2]} - {stats[3]}")
results.append(f"Average votes: {stats[4]:,.0f}")
results.append(f"Max votes: {stats[5]:,}")
results.append("")

# Top 10 highest rated movies
results.append("## Top 10 Highest Rated Movies (100k+ votes)")
results.append("-" * 40)
rows = conn.execute("""
    SELECT b.primaryTitle, b.startYear, r.averageRating, r.numVotes
    FROM title_basics b
    JOIN title_ratings r ON b.tconst = r.tconst
    WHERE b.titleType = 'movie' AND r.numVotes >= 100000
    ORDER BY r.averageRating DESC
    LIMIT 10
""").fetchall()
for i, row in enumerate(rows, 1):
    results.append(f"{i}. {row[0]} ({row[1]}) - {row[2]} ({row[3]:,} votes)")
results.append("")

# Top 10 most voted
results.append("## Top 10 Most Voted Titles")
results.append("-" * 40)
rows = conn.execute("""
    SELECT b.primaryTitle, b.titleType, b.startYear, r.numVotes, r.averageRating
    FROM title_basics b
    JOIN title_ratings r ON b.tconst = r.tconst
    ORDER BY r.numVotes DESC
    LIMIT 10
""").fetchall()
for i, row in enumerate(rows, 1):
    results.append(f"{i}. {row[0]} ({row[1]}, {row[2]}) - {row[3]:,} votes, rating {row[4]}")
results.append("")

# Genre distribution
results.append("## Genre Distribution (Top 15)")
results.append("-" * 40)
rows = conn.execute(r"""
    SELECT genres, COUNT(*) as cnt
    FROM title_basics
    WHERE genres IS NOT NULL AND genres != '\N'
    GROUP BY genres
    ORDER BY cnt DESC
    LIMIT 15
""").fetchall()
for row in rows:
    results.append(f"{row[0]}: {row[1]:,}")
results.append("")

# People stats
results.append("## People Statistics")
results.append("-" * 40)
stats = conn.execute("""
    SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN birthYear IS NOT NULL THEN 1 END) as with_birth,
        COUNT(CASE WHEN deathYear IS NOT NULL THEN 1 END) as deceased
    FROM name_basics
""").fetchone()
results.append(f"Total people: {stats[0]:,}")
results.append(f"With birth year: {stats[1]:,}")
results.append(f"Deceased (has death year): {stats[2]:,}")
results.append("")

# Profession distribution
results.append("## Primary Professions (Top 15)")
results.append("-" * 40)
rows = conn.execute(r"""
    SELECT primaryProfession, COUNT(*) as cnt
    FROM name_basics
    WHERE primaryProfession IS NOT NULL AND primaryProfession != '\N'
    GROUP BY primaryProfession
    ORDER BY cnt DESC
    LIMIT 15
""").fetchall()
for row in rows:
    results.append(f"{row[0]}: {row[1]:,}")
results.append("")

# Database size
results.append("## Database Size")
results.append("-" * 40)
db_size_mb = db_path.stat().st_size / 1024 / 1024
results.append(f"imdb.duckdb: {db_size_mb:.1f} MB")

# Compressed source files
results.append("")
results.append("## Source Files (Compressed)")
results.append("-" * 40)
for f in DATA_DIR.glob("*.gz"):
    size_mb = f.stat().st_size / 1024 / 1024
    results.append(f"{f.name}: {size_mb:.1f} MB")
results.append("")

output = "\n".join(results)
eda_file = Path(__file__).parent.parent / "eda_results.txt"
eda_file.write_text(output)
print(output)
print("")
print("=" * 60)
print(f"Results saved to: {eda_file}")

conn.close()
