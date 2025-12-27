---
title: "Large File Upload for Database AI Text-to-SQL Apps: A Practical Guide"
slug: large-file-upload-for-database-ai-text-to-sql-apps
date_published: 2025-12-12T10:00:00.000Z
original_url: https://www.tigzig.com/post/large-file-upload-for-database-ai-text-to-sql-apps
source: migrated
processed_at: 2025-12-12T10:00:00.000Z
---

# Large File Upload for Database AI Text-to-SQL Apps: A Practical Guide

*Everything I learned uploading 1.6GB files through a FastAPI backend without crashing the server*

![Large File Upload for Database AI](/images/blog/00_large_file_upload_snapshot.png)

## The Use Case

Upload large CSV/data files to be made available to a Text-to-SQL agent for natural language querying and analysis.

## The Challenge

Uploading large files to PostgreSQL (or MySQL) through a web API sounds simple until you try it with a until you try it with a 70MB compressed file that expands to 1.6GB. Your app crashes, memory explodes, connections timeout, and users see cryptic 500 errors. And it gets worse with multiple concurrent users.

This guide documents 30+ patterns I implemented to handle large file uploads reliably.

## Live App and Source Code

App live here: [app.tigzig.com/analyzer](https://app.tigzig.com/analyzer). Pick a dataset, click "Use Temporary Database". That's it. Post upload, schema automatically sent to the AI Agent. Start querying in natural language. Each dataset has a pre-built prompt. Copy, paste, run. Or use your own. The more specific, the better.

The app has sample datasets ranging from 64 rows to 11.8 million rows (1.6 GB). Setup takes 30 seconds for small files. Around 2 minutes for the 1.6 GB file. 9 LLMs available: Gemini 2.0 Flash (cheapest) to Claude 4.5 Sonnet (best quality).

For more info on datasets, how to explore and other app capabilities:

[Try Text-to-SQL on Real Data: GB Files, Multi-Million Rows](https://app.tigzig.com/post/try-text-to-sql-on-real-data-gb-files-multi-million-rows)

App is open source. For source code just hit "Docs" on app site.

---

## File Upload Protocol

### 1. Backend File Handling

**1.1 Don't Decompress Large Files in Memory**
- Problem: A 70MB `.gz` file decompresses to 1.6GB. Loading into RAM crashes your server.
- Solution: Stream to disk with chunked reads (32MB chunks). Read chunk, write to temp file, repeat.

**1.2 File Size Threshold Detection**
- Problem: You don't want chunked processing overhead for small files.
- Solution: Detect file size from `Content-Length` header. Use 100MB as threshold. Below 100MB use memory, above use disk streaming. For compressed files always use chunked (you don't know final size).

**1.3 Gzip Decompression Streaming**
- Problem: Standard `gzip.decompress()` loads entire file to memory.
- Solution: Stream decompress in 32MB chunks. Track metrics: original size, decompressed size, compression ratio, speed.

### 2. Database Instance Creation (Neon)

**2.1 Instant PostgreSQL with Neon API**
- Problem: User needs a fresh database. Traditional provisioning takes minutes.
- Solution: Use Neon's serverless Postgres API - creates databases in seconds.

**2.2 Race Condition in Database Creation**
- Problem: When creating a Neon database, you create a role then a database. Sometimes database creation fires before the role is ready.
- Solution: Add 500ms delay between role and database creation. Implement retry with exponential backoff (1s, 2s, 4s, 8s). Max total wait 15 seconds. OR use polling for an even more robust process.

**2.3 Project Lock Handling**
- Problem: Neon returns HTTP 423 (Locked) when a project is temporarily busy.
- Solution: Detect 423, wait with exponential backoff, retry up to 4 times.

### 3. Async Handling

**3.1 Make Your Endpoints Async**
- Problem: Synchronous endpoints block the event loop. One slow upload blocks all other requests.
- Solution: Use `async def` for all upload endpoints.

**3.2 Async File Reading**
- Problem: `file.read()` is blocking even in async endpoints.
- Solution: Use `await file.read(chunk_size)` for chunked async reads.

**3.3 Thread Pool for Blocking Database Operations**
- Problem: psycopg2 and mysql.connector as well many file I/O and CPU bound tasks are synchronous libraries. Calling them in async endpoints blocks doesn't work and still blocks the event loop.
- Solution: Run blocking operations in thread pool executor using `asyncio.get_event_loop().run_in_executor()`.

### 4. Remove Blocking Operations

**4.1 Pandas to Polars**
- Problem: Pandas operations are slow `pd.read_csv()` on a 500MB file freezes your server.
- Solution: Replace Pandas with Polars. Benefits: lazy evaluation with `scan_csv()`, native streaming with `collect_chunks()`, Rust-based so significantly faster, better memory efficiency.

**4.2 Identify Every Blocking Operation**
- Problem: Even a single blocking operation in an otherwise async endpoint chokes the entire application.
- Solution: Audit your upload/processing flow for significant blocking calls - file I/O, database operations, external API calls. A 100ms blocking call in a high-traffic endpoint kills concurrency. For low-traffic internal tools, prioritize the big blockers first.

### 5. Connection Pooling

**5.1 Why Connection Pooling**
- Problem: Creating a new database connection per request is slow (100-300ms) and exhausts server resources.
- Solution: Use `ThreadedConnectionPool` from psycopg2. Set `minconn=1`, `maxconn=10`.

**5.2 Per-Database Pools**
- Problem: Different users connect to different databases. One pool per database needed.
- Solution: Create pools keyed by connection details. Key format: `host:port:database:user`.

**5.3 Stale Connection Detection**
- Problem: Pooled connections go stale (timeout, network issues, server restart). Using a stale connection causes cryptic errors.
- Solution: Validate connection before use with `SELECT 1` query.

**5.4 Stale Connection Retry**
- Problem: Even with validation, you might get multiple stale connections in a row.
- Solution: Retry up to 3 times with validation. If all retries fail, create fresh connection outside pool.

**5.5 Thread-Safe Pool Access**
- Problem: Multiple async requests accessing pools simultaneously causes race conditions.
- Solution: Use `asyncio.Lock()` for pool operations.

### 6. Timeouts

**6.1 Connection Timeout**
- Problem: Connecting to an unavailable database hangs forever.
- Solution: Set `connect_timeout=30` seconds.

**6.2 Statement Timeout**
- Problem: Long-running queries block connections and cause cascading failures.
- Solution: Set `statement_timeout=900000` (15 minutes in milliseconds) at connection level.

**6.3 HTTP Request Timeout**
- Problem: External API calls (OpenAI, Neon) can hang.
- Solution: Set `timeout=60` seconds on HTTP clients.

**6.4 Upload Timeout**
- Problem: Large file uploads take time. Default timeouts kill them.
- Solution: Extended timeouts for upload endpoints. Use 15 minutes (900 seconds) for large uploads.

### 7. Request Body Limits

- Problem: Default body size limits reject large uploads.
- Solution: Custom middleware to allow up to 1.5GB bodies on upload endpoints only.

### 8. Rate Limiting

**8.1 IP-Based Rate Limiting**
- Problem: One client can overwhelm your server with too many requests.
- Solution: Use slowapi library for IP-based rate limiting. Set 300/hour (1 request per 12 seconds average).

**8.2 Rate Limit Hit Logging**
- Problem: You need visibility into who's hitting rate limits.
- Solution: Middleware that logs rate limit hits with IP, path, and timestamp when HTTP 429 returned.

### 9. API Key Security

- Problem: Sensitive endpoints (database creation) need protection.
- Solution: API key in Authorization header with Bearer scheme. Use `secrets.compare_digest()` for constant-time comparison to prevent timing attacks.

### 10. Batch Processing for MySQL

**10.1 Chunk Size Selection**
- Problem: Inserting millions of rows one-by-one is slow. Inserting all at once exhausts memory.
- Solution: I batch insert in chunks of 25,000 rows. Commit per chunk.

**10.2 Disable Constraints During Bulk Insert**
- Problem: Foreign key checks, unique checks, and autocommit slow down bulk inserts significantly.
- Solution: Disable `foreign_key_checks`, `unique_checks`, `autocommit`, and `sql_log_bin` before insert. Re-enable after completion.

**10.3 MySQL Connection Optimization**
- Solution: Use `allow_local_infile=True`, `use_pure=False` (C extension for speed), `pool_size=32`, `max_allowed_packet=1GB`.

### 11. PostgreSQL COPY Command

- Problem: INSERT statements are slow for bulk data.
- Solution: Use PostgreSQL's COPY command with `copy_expert()`. Performance is 10-100x faster than equivalent INSERT statements.

### 12. SSL/TLS Configuration

**12.1 Neon Requires SSL**
- Solution: Always set `sslmode='require'` for Neon connections.

**12.2 Optional SSL for Custom MySQL**
- Solution: Support optional `ssl_verify_cert` and `ssl_verify_identity` parameters for custom databases.

### 13. Temporary File Management

**13.1 Temporary File Creation**
- Solution: Use `tempfile.NamedTemporaryFile` with `delete=False` and `suffix='.csv'`. Manual cleanup required.

**13.2 Guaranteed Cleanup**
- Problem: Temp files pile up on errors.
- Solution: Clean up in `finally` block always. Check if file exists before deleting. Log cleanup errors but don't crash.

**13.3 Middleware Cleanup for Query Results**
- Solution: Middleware that automatically deletes temp files after FileResponse is sent.

### 14. Error Handling Patterns

**14.1 Try-Except-Finally Structure**
- Solution: Catch HTTPException and re-raise as-is. Catch specific database errors (`psycopg2.Error`). Catch general Exception as fallback. Always clean up in `finally` block.

**14.2 Specific Exception Handling**
- Solution: Handle `gzip.BadGzipFile` with HTTP 400. Handle `psycopg2.OperationalError` for connection issues. Provide meaningful error messages.

**14.3 Fallback Mechanisms**
- Solution: Try primary method, log warning on failure, try fallback method. Example: Polars primary, Pandas fallback.

### 15. Progress Tracking and Logging

**15.1 Multi-Level Timing**
- Solution: Track overall time, file processing time, schema detection time, database insert time. Log breakdown at completion.

**15.2 Chunk Progress Logging**
- Solution: Log chunk number, rows in chunk, and running total after each chunk processed.

**15.3 Log Tags for Filtering**
- Solution: Use consistent tags like `[TIMER]` for performance, `[POOL]` for connections, `[GZ]` for compression. Makes log filtering easy.

### 16. Delimiter Detection

- Problem: Files come with different delimiters (comma, tab, pipe).
- Solution: Read first few lines, detect delimiter. Priority order: Tab, Comma, Pipe. Default to comma.

### 17. Column Name Sanitization

- Problem: Column names with spaces, special characters, or SQL keywords break queries.
- Solution: Remove special characters, replace spaces with underscores, handle SQL keywords, ensure name starts with letter.

### 18. Streaming Response for Exports

- Problem: Exporting large query results to file loads everything to memory.
- Solution: Stream results with a generator function. Fetch in chunks (10,000 rows). Yield header row first, then data rows. Clean up cursor and connection in `finally` block of generator.

### 19. LLM Schema Detection with Fallback

- Problem: OpenAI API might be down or rate-limited.
- Solution: Try OpenAI first, fall back to OpenRouter on failure. Log warning when using fallback.

### 20. Application Shutdown Cleanup

- Problem: Connection pools need proper cleanup on shutdown.
- Solution: Register shutdown event handler that calls `close_all_pools()` on the pool manager.

### 21. Uvicorn Workers and Timeout Config

- Problem: Default uvicorn runs single worker - one slow upload blocks everyone.
- Solution: Use multiple workers for concurrent requests. I use 4 workers depending on server capacity. Set `timeout-keep-alive` high for large uploads - default 5 seconds kills long-running connections. I use 1800 seconds (30 min).

### 22. Postgres over MySQL for Large File Operations

In my testing, Postgres handles large file uploads significantly better than MySQL. COPY command is faster and more reliable than batched INSERT. Connection handling is smoother. MySQL was fragile with large files - frequent timeouts, connection drops, inconsistent behavior. If you have a choice, use Postgres for bulk data operations.

---

## Quick Reference

**Configuration I Use** (adjust based on your use case):
- Chunk size for reading: 32MB
- Chunk size for inserting: 25,000 rows (MySQL only)
- Connection timeout: 30 seconds
- Statement timeout: 15 minutes
- Rate limit: 300 per hour
- Max body size: 1.5GB
- File size threshold: 100MB
- Uvicorn workers: 4
- Uvicorn timeout: 1800 seconds (30 min)

**Memory Benchmarks with Chunked Processing (Postgres):**
- 100MB file: 62% memory reduction (400MB to 150MB)
- 500MB file: 90% memory reduction (2GB to 200MB)
- 1GB file: 94% memory reduction (4GB to 250MB)

---

## Conclusion

Large file upload is death by a thousand cuts. Each optimization solves a specific problem:
- **Memory issues:** Chunked streaming
- **Slow inserts:** Batch processing and COPY command
- **Connection issues:** Pooling and stale detection
- **Blocking issues:** Async and thread pool executor
- **Pandas issues:** Polars with fallback

No single solution works for everything. The key is layered defenses: detect the file characteristics, select the right processing path, handle errors gracefully, and always clean up.

*Notes:*
1. *My tools are deployed with small businesses and small teams. For enterprise grade with hundreds or thousands of users, additional considerations would apply.*
2. *Public app routes all DB credentials and API calls through my backend. It's a sandbox only for testing. Deploy on your own servers for live work.*
