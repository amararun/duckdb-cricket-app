"""
Cricsheet Data Processing Script
================================
Processes ball-by-ball and match info CSVs from cricsheet.org zip files
and loads them into a DuckDB database.

Output Tables:
- ball_by_ball: All deliveries with match_type column (T20/ODI/TEST)
- match_info: Flattened metadata (one row per match)

Usage:
    python process_cricsheet.py

Re-run monthly to refresh data (drops and recreates tables).
"""

import zipfile
import io
import csv
import os
from pathlib import Path
import duckdb

# Configuration
SCRIPT_DIR = Path(__file__).parent
DATA_DIR = SCRIPT_DIR.parent / "cricsheet-data"
OUTPUT_DB = DATA_DIR / "cricket.duckdb"

ZIP_FILES = {
    "T20": DATA_DIR / "t20s_csv2.zip",
    "ODI": DATA_DIR / "odis_csv2.zip",
    "TEST": DATA_DIR / "tests_csv2.zip",
}

# Metadata fields to extract (in order)
METADATA_FIELDS = [
    "match_id",
    "match_type",
    "team1",
    "team2",
    "gender",
    "season",
    "start_date",
    "venue",
    "city",
    "event",
    "match_number",
    "toss_winner",
    "toss_decision",
    "winner",
    "winner_runs",
    "winner_wickets",
    "player_of_match",
    "umpire1",
    "umpire2",
    "tv_umpire",
    "reserve_umpire",
    "match_referee",
]


def parse_info_csv(content: str, match_id: str, match_type: str) -> dict:
    """Parse an _info.csv file into a flat dictionary."""
    info = {field: None for field in METADATA_FIELDS}
    info["match_id"] = match_id
    info["match_type"] = match_type

    teams = []
    umpires = []
    dates = []

    reader = csv.reader(io.StringIO(content))
    for row in reader:
        if len(row) < 2:
            continue

        if row[0] == "info":
            key = row[1]
            value = row[2] if len(row) > 2 else None

            if key == "team":
                teams.append(value)
            elif key == "date":
                dates.append(value)
            elif key == "umpire":
                umpires.append(value)
            elif key == "gender":
                info["gender"] = value
            elif key == "season":
                info["season"] = value
            elif key == "venue":
                info["venue"] = value
            elif key == "city":
                info["city"] = value if value else None
            elif key == "event":
                info["event"] = value
            elif key == "match_number":
                info["match_number"] = value
            elif key == "toss_winner":
                info["toss_winner"] = value
            elif key == "toss_decision":
                info["toss_decision"] = value
            elif key == "winner":
                info["winner"] = value
            elif key == "winner_runs":
                info["winner_runs"] = int(value) if value else None
            elif key == "winner_wickets":
                info["winner_wickets"] = int(value) if value else None
            elif key == "player_of_match":
                info["player_of_match"] = value
            elif key == "tv_umpire":
                info["tv_umpire"] = value
            elif key == "reserve_umpire":
                info["reserve_umpire"] = value
            elif key == "match_referee":
                info["match_referee"] = value

    # Assign teams
    if len(teams) >= 1:
        info["team1"] = teams[0]
    if len(teams) >= 2:
        info["team2"] = teams[1]

    # Assign umpires
    if len(umpires) >= 1:
        info["umpire1"] = umpires[0]
    if len(umpires) >= 2:
        info["umpire2"] = umpires[1]

    # Start date (first date for multi-day matches)
    if dates:
        info["start_date"] = dates[0]

    return info


def process_zip_file(zip_path: Path, match_type: str):
    """
    Process a single zip file and yield ball-by-ball rows and match info dicts.
    Reads directly from zip without extracting to disk.
    """
    print(f"Processing {zip_path.name}...")

    ball_rows = []
    info_rows = []

    with zipfile.ZipFile(zip_path, 'r') as zf:
        # Get list of files
        file_list = zf.namelist()

        # Separate ball-by-ball CSVs and info CSVs
        ball_files = [f for f in file_list if f.endswith('.csv') and not f.endswith('_info.csv') and f != 'README.txt']
        info_files = [f for f in file_list if f.endswith('_info.csv')]

        print(f"  Found {len(ball_files)} match files, {len(info_files)} info files")

        # Process ball-by-ball files
        header_added = False
        for i, filename in enumerate(ball_files):
            match_id = filename.replace('.csv', '')

            with zf.open(filename) as f:
                content = f.read().decode('utf-8')
                reader = csv.reader(io.StringIO(content))

                for row_idx, row in enumerate(reader):
                    if row_idx == 0:
                        if not header_added:
                            # Add match_type to header
                            ball_rows.append(row + ['match_type'])
                            header_added = True
                        continue
                    # Add match_type to each row
                    ball_rows.append(row + [match_type])

            if (i + 1) % 500 == 0:
                print(f"    Processed {i + 1}/{len(ball_files)} ball-by-ball files...")

        # Process info files
        for i, filename in enumerate(info_files):
            match_id = filename.replace('_info.csv', '')

            with zf.open(filename) as f:
                content = f.read().decode('utf-8')
                info = parse_info_csv(content, match_id, match_type)
                info_rows.append(info)

            if (i + 1) % 500 == 0:
                print(f"    Processed {i + 1}/{len(info_files)} info files...")

    print(f"  Done: {len(ball_rows)-1} ball rows, {len(info_rows)} matches")
    return ball_rows, info_rows


def create_database():
    """Process all zip files and create DuckDB database."""
    print("=" * 60)
    print("Cricsheet Data Processing")
    print("=" * 60)

    all_ball_rows = []
    all_info_rows = []
    header = None

    # Process each zip file
    for match_type, zip_path in ZIP_FILES.items():
        if not zip_path.exists():
            print(f"WARNING: {zip_path} not found, skipping...")
            continue

        ball_rows, info_rows = process_zip_file(zip_path, match_type)

        if ball_rows:
            if header is None:
                header = ball_rows[0]
                all_ball_rows.append(header)
            # Skip header from subsequent files
            all_ball_rows.extend(ball_rows[1:])

        all_info_rows.extend(info_rows)

    print("\n" + "=" * 60)
    print(f"Total: {len(all_ball_rows)-1} ball-by-ball rows, {len(all_info_rows)} matches")
    print("=" * 60)

    # Create DuckDB database
    print(f"\nCreating DuckDB database: {OUTPUT_DB}")

    # Remove existing database to recreate
    if OUTPUT_DB.exists():
        os.remove(OUTPUT_DB)

    conn = duckdb.connect(str(OUTPUT_DB))

    # Create ball_by_ball table from CSV data
    print("Creating ball_by_ball table...")

    # Write to temp CSV for DuckDB to read (more efficient for large data)
    temp_ball_csv = DATA_DIR / "temp_ball_by_ball.csv"
    with open(temp_ball_csv, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerows(all_ball_rows)

    conn.execute(f"""
        CREATE TABLE ball_by_ball AS
        SELECT * FROM read_csv_auto('{temp_ball_csv.as_posix()}', header=true)
    """)

    # Clean up temp file
    os.remove(temp_ball_csv)

    # Create match_info table
    print("Creating match_info table...")

    # Write to temp CSV
    temp_info_csv = DATA_DIR / "temp_match_info.csv"
    with open(temp_info_csv, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=METADATA_FIELDS)
        writer.writeheader()
        writer.writerows(all_info_rows)

    conn.execute(f"""
        CREATE TABLE match_info AS
        SELECT * FROM read_csv_auto('{temp_info_csv.as_posix()}', header=true)
    """)

    # Clean up temp file
    os.remove(temp_info_csv)

    # Show summary
    print("\n" + "=" * 60)
    print("Database Summary")
    print("=" * 60)

    result = conn.execute("SELECT COUNT(*) as count FROM ball_by_ball").fetchone()
    print(f"ball_by_ball: {result[0]:,} rows")

    result = conn.execute("SELECT match_type, COUNT(*) as count FROM ball_by_ball GROUP BY match_type ORDER BY match_type").fetchall()
    for row in result:
        print(f"  - {row[0]}: {row[1]:,} deliveries")

    result = conn.execute("SELECT COUNT(*) as count FROM match_info").fetchone()
    print(f"\nmatch_info: {result[0]:,} rows")

    result = conn.execute("SELECT match_type, COUNT(*) as count FROM match_info GROUP BY match_type ORDER BY match_type").fetchall()
    for row in result:
        print(f"  - {row[0]}: {row[1]:,} matches")

    # Show schema
    print("\n" + "=" * 60)
    print("Table Schemas")
    print("=" * 60)

    print("\nball_by_ball columns:")
    result = conn.execute("DESCRIBE ball_by_ball").fetchall()
    for row in result:
        print(f"  {row[0]}: {row[1]}")

    print("\nmatch_info columns:")
    result = conn.execute("DESCRIBE match_info").fetchall()
    for row in result:
        print(f"  {row[0]}: {row[1]}")

    conn.close()

    print("\n" + "=" * 60)
    print(f"Done! Database saved to: {OUTPUT_DB}")
    print(f"File size: {OUTPUT_DB.stat().st_size / (1024*1024):.1f} MB")
    print("=" * 60)


if __name__ == "__main__":
    create_database()
