"""
Compare DuckDB sizes with and without indexes
"""

import duckdb
import os
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"
os.chdir(DATA_DIR)

# Create a new database without indexes
print("Creating database without indexes...")
db_path = "imdb_no_index.duckdb"

# Remove if exists
if os.path.exists(db_path):
    os.remove(db_path)

conn = duckdb.connect(db_path)

# Create tables WITHOUT primary keys (no implicit indexes)
conn.execute("""
    CREATE TABLE title_basics (
        tconst VARCHAR,
        titleType VARCHAR,
        primaryTitle VARCHAR,
        originalTitle VARCHAR,
        isAdult BOOLEAN,
        startYear INTEGER,
        endYear INTEGER,
        runtimeMinutes INTEGER,
        genres VARCHAR
    )
""")

conn.execute("""
    CREATE TABLE title_ratings (
        tconst VARCHAR,
        averageRating DECIMAL(3,1),
        numVotes INTEGER
    )
""")

conn.execute("""
    CREATE TABLE name_basics (
        nconst VARCHAR,
        primaryName VARCHAR,
        birthYear INTEGER,
        deathYear INTEGER,
        primaryProfession VARCHAR,
        knownForTitles VARCHAR
    )
""")

# Import data using raw strings for the \N
print("Importing title_basics...")
conn.execute(r"""
    COPY title_basics FROM 'title.basics.tsv.gz' (
        FORMAT CSV, DELIMITER '\t', HEADER true, NULL '\N', QUOTE '', ESCAPE ''
    )
""")
count1 = conn.execute("SELECT COUNT(*) FROM title_basics").fetchone()[0]
print(f"  {count1:,} rows")

print("Importing title_ratings...")
conn.execute(r"""
    COPY title_ratings FROM 'title.ratings.tsv.gz' (
        FORMAT CSV, DELIMITER '\t', HEADER true, NULL '\N', QUOTE '', ESCAPE ''
    )
""")
count2 = conn.execute("SELECT COUNT(*) FROM title_ratings").fetchone()[0]
print(f"  {count2:,} rows")

print("Importing name_basics...")
conn.execute(r"""
    COPY name_basics FROM 'name.basics.tsv.gz' (
        FORMAT CSV, DELIMITER '\t', HEADER true, NULL '\N', QUOTE '', ESCAPE ''
    )
""")
count3 = conn.execute("SELECT COUNT(*) FROM name_basics").fetchone()[0]
print(f"  {count3:,} rows")

# Checkpoint to flush to disk
conn.execute("CHECKPOINT")
conn.close()

# Get sizes
no_index_size = os.path.getsize(db_path) / 1024 / 1024
with_index_size = os.path.getsize("imdb.duckdb") / 1024 / 1024

print()
print("=" * 50)
print("Size Comparison")
print("=" * 50)
print(f"With indexes + PKs:    {with_index_size:,.1f} MB")
print(f"Without indexes:       {no_index_size:,.1f} MB")
print(f"Index overhead:        {with_index_size - no_index_size:,.1f} MB ({(with_index_size - no_index_size) / with_index_size * 100:.1f}%)")
print()
print(f"Raw TSV (uncompressed): 1,917.0 MB")
print(f"Gzipped TSV:              496.5 MB")

# Cleanup
print()
print(f"Removing test database: {db_path}")
os.remove(db_path)
