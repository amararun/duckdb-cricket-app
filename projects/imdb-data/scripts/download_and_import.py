"""
IMDb Data Download and Import Script
Downloads official IMDb TSV files and imports into DuckDB

Source: https://datasets.imdbws.com/
"""

import os
import gzip
import urllib.request
import duckdb
from pathlib import Path

# Configuration
BASE_URL = "https://datasets.imdbws.com/"
DATA_DIR = Path(__file__).parent.parent / "data"

# MVP files (Phase 1)
MVP_FILES = [
    "title.basics.tsv.gz",
    "title.ratings.tsv.gz",
    "name.basics.tsv.gz",
]

# All files (for future use)
ALL_FILES = [
    "title.basics.tsv.gz",
    "title.ratings.tsv.gz",
    "name.basics.tsv.gz",
    "title.principals.tsv.gz",
    "title.crew.tsv.gz",
    "title.episode.tsv.gz",
    "title.akas.tsv.gz",
]

def download_file(filename: str, force: bool = False) -> Path:
    """Download a file from IMDb datasets if not already present"""
    filepath = DATA_DIR / filename

    if filepath.exists() and not force:
        print(f"  [SKIP] {filename} already exists ({filepath.stat().st_size / 1024 / 1024:.1f} MB)")
        return filepath

    url = BASE_URL + filename
    print(f"  [DOWNLOAD] {filename}...")

    # Download with progress
    def report_progress(block_num, block_size, total_size):
        downloaded = block_num * block_size
        percent = min(100, downloaded * 100 / total_size) if total_size > 0 else 0
        mb_downloaded = downloaded / 1024 / 1024
        mb_total = total_size / 1024 / 1024
        print(f"\r    {mb_downloaded:.1f} / {mb_total:.1f} MB ({percent:.1f}%)", end="", flush=True)

    urllib.request.urlretrieve(url, filepath, reporthook=report_progress)
    print()  # newline after progress

    return filepath


def create_duckdb_tables(db_path: Path) -> duckdb.DuckDBPyConnection:
    """Create DuckDB database and tables"""
    conn = duckdb.connect(str(db_path))

    # title_basics
    conn.execute("""
        CREATE TABLE IF NOT EXISTS title_basics (
            tconst VARCHAR PRIMARY KEY,
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

    # title_ratings
    conn.execute("""
        CREATE TABLE IF NOT EXISTS title_ratings (
            tconst VARCHAR PRIMARY KEY,
            averageRating DECIMAL(3,1),
            numVotes INTEGER
        )
    """)

    # name_basics
    conn.execute("""
        CREATE TABLE IF NOT EXISTS name_basics (
            nconst VARCHAR PRIMARY KEY,
            primaryName VARCHAR,
            birthYear INTEGER,
            deathYear INTEGER,
            primaryProfession VARCHAR,
            knownForTitles VARCHAR
        )
    """)

    return conn


def import_tsv_to_duckdb(conn: duckdb.DuckDBPyConnection, gz_file: Path, table_name: str):
    """Import a gzipped TSV file directly into DuckDB"""
    print(f"  [IMPORT] {gz_file.name} -> {table_name}...")

    # DuckDB can read gzipped files directly
    # Use COPY with proper null handling
    conn.execute(f"""
        COPY {table_name} FROM '{gz_file}' (
            FORMAT CSV,
            DELIMITER '\t',
            HEADER true,
            NULL '\\N',
            QUOTE '',
            ESCAPE ''
        )
    """)

    # Get row count
    count = conn.execute(f"SELECT COUNT(*) FROM {table_name}").fetchone()[0]
    print(f"    Imported {count:,} rows")

    return count


def create_indexes(conn: duckdb.DuckDBPyConnection):
    """Create indexes for efficient querying"""
    print("  [INDEX] Creating indexes...")

    # title_basics indexes
    conn.execute("CREATE INDEX IF NOT EXISTS idx_title_basics_type ON title_basics(titleType)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_title_basics_year ON title_basics(startYear)")

    # title_ratings index (already has PK on tconst)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_ratings_votes ON title_ratings(numVotes)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_ratings_rating ON title_ratings(averageRating)")

    # name_basics indexes
    conn.execute("CREATE INDEX IF NOT EXISTS idx_name_basics_name ON name_basics(primaryName)")

    print("    Done")


def run_eda(conn: duckdb.DuckDBPyConnection, output_file: Path):
    """Run basic EDA and save results"""
    print("  [EDA] Running exploratory data analysis...")

    results = []
    results.append("=" * 60)
    results.append("IMDb DuckDB - Exploratory Data Analysis")
    results.append("=" * 60)
    results.append("")

    # Table counts
    results.append("## Table Row Counts")
    results.append("-" * 40)
    for table in ["title_basics", "title_ratings", "name_basics"]:
        try:
            count = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
            results.append(f"{table}: {count:,} rows")
        except:
            results.append(f"{table}: ERROR")
    results.append("")

    # Title types distribution (top 10)
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

    # Top 10 highest rated movies (100k+ votes)
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

    # Top 10 most voted titles
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

    # Genre distribution (top 15)
    results.append("## Genre Distribution (Top 15)")
    results.append("-" * 40)
    rows = conn.execute("""
        SELECT genres, COUNT(*) as cnt
        FROM title_basics
        WHERE genres IS NOT NULL AND genres != '\\N'
        GROUP BY genres
        ORDER BY cnt DESC
        LIMIT 15
    """).fetchall()
    for row in rows:
        results.append(f"{row[0]}: {row[1]:,}")
    results.append("")

    # People statistics
    results.append("## People Statistics")
    results.append("-" * 40)
    stats = conn.execute("""
        SELECT
            COUNT(*) as total,
            COUNT(CASE WHEN birthYear IS NOT NULL THEN 1 END) as with_birth,
            COUNT(CASE WHEN deathYear IS NOT NULL THEN 1 END) as deceased,
            MIN(birthYear) as oldest_birth,
            MAX(birthYear) as youngest_birth
        FROM name_basics
    """).fetchone()
    results.append(f"Total people: {stats[0]:,}")
    results.append(f"With birth year: {stats[1]:,}")
    results.append(f"Deceased (has death year): {stats[2]:,}")
    results.append(f"Birth year range: {stats[3]} - {stats[4]}")
    results.append("")

    # Profession distribution (sample)
    results.append("## Primary Professions (Sample - Top 20)")
    results.append("-" * 40)
    rows = conn.execute("""
        SELECT primaryProfession, COUNT(*) as cnt
        FROM name_basics
        WHERE primaryProfession IS NOT NULL AND primaryProfession != '\\N'
        GROUP BY primaryProfession
        ORDER BY cnt DESC
        LIMIT 20
    """).fetchall()
    for row in rows:
        results.append(f"{row[0]}: {row[1]:,}")
    results.append("")

    # Database size - skip, just check file system
    results.append("## Notes")
    results.append("-" * 40)
    results.append("Check file system for .duckdb file size")
    results.append("")

    # Write results
    output_text = "\n".join(results)
    output_file.write_text(output_text)
    print(f"    Results saved to {output_file}")

    return output_text


def main():
    """Main execution"""
    print("=" * 60)
    print("IMDb Data Download and Import")
    print("=" * 60)

    # Ensure data directory exists
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    # Step 1: Download MVP files
    print("\n[1/4] Downloading files...")
    for filename in MVP_FILES:
        download_file(filename)

    # Step 2: Create DuckDB
    print("\n[2/4] Creating DuckDB database...")
    db_path = DATA_DIR / "imdb.duckdb"
    if db_path.exists():
        db_path.unlink()  # Remove existing
    conn = create_duckdb_tables(db_path)

    # Step 3: Import data
    print("\n[3/4] Importing data...")
    file_to_table = {
        "title.basics.tsv.gz": "title_basics",
        "title.ratings.tsv.gz": "title_ratings",
        "name.basics.tsv.gz": "name_basics",
    }
    for filename, table in file_to_table.items():
        gz_path = DATA_DIR / filename
        if gz_path.exists():
            import_tsv_to_duckdb(conn, gz_path, table)

    # Create indexes
    create_indexes(conn)

    # Step 4: Run EDA
    print("\n[4/4] Running EDA...")
    eda_output = DATA_DIR.parent / "eda_results.txt"
    run_eda(conn, eda_output)

    # Final stats
    print("\n" + "=" * 60)
    print("COMPLETE!")
    print("=" * 60)
    db_size = db_path.stat().st_size / 1024 / 1024
    print(f"Database: {db_path}")
    print(f"Size: {db_size:.1f} MB")
    print(f"EDA: {eda_output}")

    conn.close()


if __name__ == "__main__":
    main()
