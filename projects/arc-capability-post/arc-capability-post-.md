---
title: "Arc: Production Infrastructure for DuckDB Time-Series Workloads"
slug: arc-production-infrastructure-for-duckdb-time-series
date_published: 2025-12-15T10:00:00.000Z
original_url: https://www.tigzig.com/post/arc-production-infrastructure-for-duckdb-time-series
source: migrated
processed_at: 2025-12-15T10:00:00.000Z
---

# Arc: Production Infrastructure for DuckDB Time-Series Workloads

*What I learned studying the Arc codebase - 66 production patterns for building on DuckDB*

## The Use Case

Deploy DuckDB as a production time-series database with a complete API layer, authentication, monitoring, data lifecycle management, and multi-format responses - without building all the infrastructure yourself.

## The Challenge

DuckDB is exceptional for analytics. Fast, embedded, SQL-native. But DuckDB alone is not a production database system. You need:

- REST API layer for remote access
- Authentication and token management
- Multiple ingestion protocols for different clients
- Response formats optimized for different use cases (JSON for small results, Arrow for millions of rows)
- Storage backends beyond local disk (S3, MinIO, Azure)
- Write-ahead logging for durability
- Automatic file compaction for query performance
- Data retention and lifecycle management
- Prometheus metrics and structured logging
- Kubernetes health probes

Building this infrastructure takes months. Arc provides it out of the box.

## What Is Arc

Arc is a high-performance time-series database built on DuckDB. Written in Go by Ignacio Van Droogenbroek (20+ years engineering experience). Open source under AGPL-3.0. Ships as a single binary or Docker container.

**Performance numbers**:
- Ingestion: 9.47M records/sec (MessagePack columnar)
- Query: 2.88M rows/sec (Apache Arrow)
- 1.8x faster than QuestDB, 9.39x faster than TimescaleDB in ClickBench analytical workloads

**Repository**: github.com/basekick-labs/arc
**Documentation**: docs.basekick.net/arc

---

## Who Is This For

**Primary audience**: Time-series workloads - IoT sensors, application metrics, server logs, event streams. Scenarios where millions of records flow in continuously and you need high-speed ingestion with analytical queries.

**But also useful for**: Even if you're not doing time-series, the patterns here are valuable. Arc has built a complete production system over DuckDB - REST API layer, authentication, connection pooling, response format handling, SQL-to-storage translation. If you're building any DuckDB-backed application (analytics dashboards, data APIs, reporting tools), you can either use Arc directly or study its patterns and build your own lighter version.

The architecture works for static datasets too. Load your Parquet files once, query via the same API. You just won't use the streaming ingestion or time-based features.

---

## Installation and Deployment

### 1. Docker Deployment

The fastest way to get started. Single command, data persisted to Docker volume.

- Image available at ghcr.io/basekick-labs/arc
- Port 8000 exposed by default
- Admin token generated on first run - save it immediately, won't display again
- Volume mount at /app/data for persistence

### 2. Native Packages

Available as .deb (Debian/Ubuntu) and .rpm (RHEL/Fedora). Installs as systemd service with automatic startup.

### 3. Kubernetes Deployment

Helm chart available. Includes health checks, resource limits, and persistent volume claims. Ready for production cloud deployments.

### 4. Build from Source

Requires Go 1.25+. Clone repository, run make build, execute single binary. No runtime dependencies.

---

## REST API Layer

This is the core value proposition. DuckDB is embedded - it runs in your process. Arc wraps DuckDB with a complete HTTP API, so any frontend, backend, or tool that speaks HTTP can interact with your time-series data.

### 5. HTTP API for Everything

Arc exposes all functionality through REST endpoints. No direct database connections needed. Any language, any framework, any tool that can make HTTP requests can work with Arc.

**What you can do via API**:
- Write data (MessagePack or Line Protocol)
- Run SQL queries and get JSON or Arrow responses
- Manage authentication tokens
- Configure retention policies
- Set up continuous queries for downsampling
- Delete specific data
- Trigger compaction manually
- Check health and metrics
- Query application logs

Your React frontend, Python scripts, mobile apps, IoT devices, Grafana dashboards - all connect to the same HTTP endpoint.

### 6. Connect Any Frontend

Arc runs as a standalone server on port 8000 (configurable). Point your frontend to that endpoint with an API token, and you have full database access over HTTP.

**Typical architecture**:
- Arc server running on your infrastructure
- Frontend apps call Arc API directly (with CORS enabled by default)
- Or backend services proxy requests through your application server
- Grafana connects via official datasource plugin
- Python/Node scripts use HTTP client or official SDK

No database drivers needed. No connection string complexity. Just HTTP with bearer token authentication.

### 7. Standard HTTP Patterns

All endpoints follow REST conventions:
- POST for writes and queries
- GET for reads and status
- PUT for updates
- DELETE for removal

JSON request/response by default. Content-Type headers for MessagePack and Arrow. Standard HTTP status codes (200 success, 204 no content, 400 bad request, 401 unauthorized, 500 server error).

---

## Data Ingestion

### 8. MessagePack Columnar Format

The fastest ingestion protocol. Binary format with columnar data layout. 9.47M records/sec throughput.

**Why it's fast**:
- Binary format eliminates parsing overhead
- Columnar layout matches Parquet storage format
- Native gzip compression support on wire
- Batch-optimized for high throughput

Send data as a measurement name plus columns dictionary. Each column is an array of values. Arc converts directly to Arrow columnar format, then to Parquet files.

### 9. InfluxDB Line Protocol

Text-based protocol compatible with existing InfluxDB tooling. 1.92M records/sec throughput.

Use when:
- Migrating from InfluxDB
- Using Telegraf or other tools that emit line protocol
- Human-readable format needed for debugging

### 10. Gzip Compression on Wire

Both protocols accept gzip-compressed payloads. Set Content-Encoding header to gzip. Reduces network transfer significantly for high-volume ingestion.

### 11. Buffer-Based Flushing

Incoming data goes to in-memory buffer. Flushes to Parquet when either condition met:
- Buffer reaches 50,000 records (configurable)
- Buffer age exceeds 5 seconds (configurable)

This batching strategy is critical for achieving 9.47M records/sec. Without buffering, you'd be writing tiny Parquet files constantly.

### 12. Force Flush Endpoint

Manual flush available via API. Use after batch imports or before shutting down to ensure all data is persisted.

---

## Query Layer

### 13. Full DuckDB SQL Support

Standard SQL with all DuckDB features. Window functions, CTEs, joins, subqueries. No proprietary query language.

Queries execute against Parquet files directly. DuckDB handles predicate pushdown, column pruning, and parallel execution automatically.

### 14. JSON Response Format

Default response format. Returns columns, types, data array, row count, and execution time. Best for small result sets and debugging.

### 15. Apache Arrow IPC Response

High-performance binary format. 2.88M rows/sec throughput. 29% smaller than JSON responses.

Use for:
- Result sets over 10,000 rows
- Downstream processing in pandas, Polars, or other Arrow-native tools
- Zero-copy conversion to DataFrames

### 16. Query Cost Estimation

Estimate query impact before execution. Returns estimated row count and resource usage. Smart for multi-tenant systems where you want to prevent expensive queries.

### 17. Multi-Database Architecture

Organize data by environment, tenant, or application. Queries specify database via schema name. Each database is an isolated namespace with its own measurements.

---

## Storage Architecture

### 18. Parquet as Primary Storage

All data stored as Parquet files. No proprietary format. Portable to pandas, Spark, Snowflake, or any tool that reads Parquet.

**Key decision**: Your data works everywhere. If you outgrow Arc, export is trivial - just copy the Parquet files.

### 19. Time-Based Partitioning

Data partitioned by hour. Directory structure: database/measurement/year/month/day/hour.

Query benefits:
- Partition pruning by date range
- Orders of magnitude faster for time-series queries
- Efficient compaction per partition

### 20. Multiple Storage Backends

**Local**: Default. Simplest for single-node deployments.

**AWS S3**: Production cloud storage. Use IAM roles for credentials on EC2/EKS.

**MinIO**: Self-hosted S3-compatible storage. Path-style URLs required.

**Azure Blob Storage**: Coming in v26.01.1.

### 21. Parquet Compression

Writes use Snappy compression (fast). Compaction upgrades to ZSTD (80% smaller). Balance between write speed and storage efficiency.

---

## Automatic Compaction

### 22. The Small File Problem

High-speed ingestion creates many small files. At 9.47M records/sec with 5-second flush, you generate 720 files per hour per measurement. This kills query performance - DuckDB must open and scan hundreds of files.

### 23. Tiered Compaction

Automatic file merging runs on schedule (default: hourly at :05). Merges small files in a partition into larger optimized files.

**Real production results**:
- Before: 2,704 small files (Snappy) = 3.7 GB
- After: 3 compacted files (ZSTD) = 724 MB
- Compression: 80.4% space savings
- File reduction: 901x fewer files
- Compaction time: 5 seconds

### 24. Compaction Configuration

Configurable parameters:
- Minimum file count to trigger compaction (default: 10)
- Minimum partition age before compaction (default: 1 hour)
- Target file size (default: 512MB)
- Concurrent compaction jobs (default: 2)
- Compression codec (ZSTD recommended)

### 25. Query Performance Impact

Before compaction: 5.2 seconds to scan 720 files for hourly query.
After compaction: 0.05 seconds to scan 1 file. 104x faster.

### 26. Non-Blocking Operation

Queries continue working during compaction. Partition locking prevents concurrent compaction of the same partition. Safe for production.

---

## Write-Ahead Log (WAL)

### 27. Optional Durability

WAL disabled by default to maximize throughput. Enable when zero data loss is required.

**How it works**: All incoming data written to WAL file before acknowledging to client. On crash, WAL replays on startup to recover unbuffered data.

### 28. Sync Modes

**fdatasync** (recommended): Syncs data to disk, skips metadata sync. Best balance of durability and performance. 21% throughput reduction.

**fsync**: Full sync including metadata. Maximum safety, slightly slower.

**async**: Writes to OS buffer cache, no explicit sync. Fastest, but small risk window (~1 second of data loss possible).

### 29. Performance vs Durability Tradeoff

| Configuration | Throughput | Data Loss Risk |
|--------------|-----------|----------------|
| No WAL (default) | 9.47M rec/s | 0-5 seconds |
| WAL + fdatasync | 7.5M rec/s | Near-zero |
| WAL + fsync | 7.7M rec/s | Zero |

### 30. WAL Recovery

On startup, Arc scans WAL directory, validates entries with CRC32 checksums, replays records into buffer system, archives recovered files. Parallel recovery across workers.

---

## Authentication and Security

### 31. Simple Bearer Token Authentication

Arc uses simple bearer tokens - not OAuth, not Google sign-in, not SAML. Just random string tokens passed in the Authorization header.

**Why this matters**: No external identity provider dependency. No OAuth callback flows. No token refresh complexity. Generate a token, pass it in the header, done.

**How it works**:
- Admin token generated on first run (save it immediately)
- Pass token as "Authorization: Bearer YOUR_TOKEN" header
- Or use "x-api-key: YOUR_TOKEN" header (same effect)
- Two permission levels: admin (full access) and user (limited access)

This is intentionally simple. If you need OAuth/SSO, put a proxy in front of Arc. But for most use cases - internal services, data pipelines, IoT devices - bearer tokens are exactly right.

### 32. Token Management API

Admins manage tokens via API:
- Create new tokens with name, description, and permission level
- List all tokens (metadata only, not the actual token values)
- Revoke tokens immediately
- Rotate tokens by creating new and revoking old

Each token stored in SQLite database alongside Arc data. Tokens are hashed - even if database is compromised, original tokens are not exposed.

### 33. Token Caching

In-memory cache reduces database lookups. Configurable TTL (default: 30 seconds) and max cache size (default: 1000 tokens). Cache invalidation API for immediate effect.

### 34. Public Endpoints

Some endpoints bypass authentication:
- /health - Health check (for load balancers)
- /ready - Kubernetes readiness probe
- /metrics - Prometheus metrics scraping
- /api/v1/auth/verify - Token verification

### 35. Native TLS/SSL Support

Arc supports HTTPS directly without reverse proxy. Configure certificate and key file paths in arc.toml. Automatic HSTS header when TLS enabled. No need for nginx or caddy in front.

---

## Data Lifecycle Management

### 36. Retention Policies

Define how long to keep data. Specify database, measurement, retention days, and buffer days (safety margin).

**How it works**: Scans Parquet files, reads metadata for max timestamps, deletes files where all rows are older than cutoff. File-level granularity, not row-level.

**Dry run mode**: Preview what would be deleted before execution. Essential for safety.

### 37. Continuous Queries

Scheduled aggregations for downsampling. Define source measurement, destination measurement, SQL aggregation query, and schedule.

**Use case**: Keep raw data for 7 days, hourly aggregates for 90 days, daily aggregates for 2 years. Storage reduction: 400x smaller while maintaining trend visibility.

Supports all DuckDB aggregations: AVG, SUM, MIN, MAX, COUNT, STDDEV, PERCENTILE_CONT.

### 38. Delete Operations

Precise row deletion using WHERE clauses. Rewrite-based approach: loads file, filters out matching rows, atomically replaces original file.

**Safety mechanisms**:
- WHERE clause required (no accidental full-table delete)
- Confirmation threshold (explicit confirm for large deletes)
- Maximum rows limit per operation
- Dry run mode

**GDPR compliance**: Supports right to deletion by removing specific user data across measurements.

---

## Monitoring and Observability

### 39. Prometheus Metrics Endpoint

/metrics endpoint in Prometheus format. Includes:
- Go runtime metrics (memory, goroutines, GC)
- DuckDB memory usage and connection pool stats
- Per-endpoint request counts and latencies
- Ingestion throughput and buffer stats

### 40. JSON Metrics API

/api/v1/metrics for JSON format. Additional endpoints for memory details, query pool stats, and timeseries metrics over configurable time windows.

### 41. Structured Logging

Zerolog-based logging with levels (debug, info, warn, error). JSON format for log aggregation. Console format for development.

### 42. Log API

Query application logs via API. Filter by level, time range, limit results. Useful for debugging without server access.

### 43. Health and Readiness Probes

/health: Returns status, uptime, timestamp. Use for basic health checks.

/ready: Kubernetes readiness probe. Returns ready status only when Arc can serve requests.

---

## Connection Management

### 44. DuckDB Connection Pool

Handles concurrent read queries. Pool size auto-configured based on CPU cores (2x cores, min 4, max 64). Manual override available.

**Critical insight**: DuckDB is single-writer but multi-reader. Arc manages this with separate connection handling for writes vs queries.

### 45. Memory Management

DuckDB memory limit auto-configured to ~50% of system RAM. Tracks both Go runtime and DuckDB memory usage. Prevents OOM crashes.

### 46. Resource Auto-Detection

Arc automatically configures optimal settings based on system resources:
- max_connections: 2x CPU cores
- memory_limit: 50% of RAM
- thread_count: CPU core count

Only override if you have specific requirements.

---

## Integrations

### 47. Telegraf Output Plugin

Native Arc output plugin in Telegraf 1.37+. Sends metrics in MessagePack columnar format with gzip compression. All 300+ Telegraf input plugins supported.

Configure once, collect CPU, memory, disk, network, Docker containers, databases, and custom metrics.

### 48. Grafana Datasource

Official Arc datasource plugin. Features:
- Apache Arrow protocol for high-performance data transfer
- Native SQL support with syntax highlighting
- Template variables for dynamic dashboards
- Alerting support
- Multi-database queries

Time macros ($__timeFilter, $__interval) integrate with Grafana's time picker for automatic query optimization.

### 49. Apache Superset

Connect via DuckDB SQL interface. Full BI dashboard support. Create charts, filters, and scheduled reports.

### 50. Python SDK

Official client: arc-tsdb-client. Features:
- Connection management with context managers
- Automatic MessagePack serialization
- Native pandas/Polars/Arrow DataFrame support
- Buffered writes with auto-batching
- Typed exceptions
- Async support via AsyncArcClient

### 51. OpenTelemetry Integration

Export traces and metrics to Arc. Useful for observability platforms where you want analytical queries on telemetry data.

---

## Why Go Implementation

### 52. Stable Memory

Go's garbage collector returns memory to OS. Python implementation leaked 372MB per 500 queries under sustained load. Go version: stable memory, no leaks.

### 53. Single Binary Deployment

No runtime dependencies. No Python interpreter, no pip packages, no virtual environments. Download binary, run it.

### 54. Native Concurrency

Goroutines handle thousands of connections with minimal overhead. Sub-millisecond GC pause times at scale.

### 55. Cold Start Performance

Arc starts in under 100ms. Python version: 2-3 seconds. Critical for container orchestration and serverless deployments.

---

## Configuration System

### 56. TOML Configuration File

Primary configuration via arc.toml. Production-ready defaults. All settings documented with comments.

### 57. Environment Variable Overrides

Any setting can be overridden via environment variable with ARC_ prefix. Pattern: ARC_SECTION_KEY=value.

Priority: Environment variables > arc.toml > built-in defaults.

### 58. Runtime Configuration

Some settings adjustable without restart via API. Others require restart. Check documentation for each setting.

---

## Performance Engineering

### 59. Go for Ingestion, DuckDB for Queries

Right tool for each job. Go handles high-concurrency ingestion pipeline with low GC overhead. DuckDB handles analytical queries with vectorized execution and SIMD instructions.

### 60. Vectorized Query Execution

DuckDB processes thousands of values per CPU instruction. Parallel query execution across all CPU cores. Advanced optimizations: join reordering, predicate pushdown, filter pushdown.

### 61. SIMD Instructions

DuckDB uses modern CPU features (AVX2, AVX-512) for maximum throughput on analytical operations.

### 62. Benchmarking Against Alternatives

ClickBench results on AWS c6a.4xlarge (16 vCPU, 32GB RAM):
- Arc warm run: 35.70s across 43 queries
- QuestDB: 64.26s (1.80x slower)
- TimescaleDB: 335.22s (9.39x slower)

---

## Operational Patterns

### 63. Circuit Breakers

Built-in resilience patterns. Circuit breakers prevent cascade failures when downstream services are unavailable.

### 64. Retry with Exponential Backoff

Automatic retry for transient failures. Exponential backoff prevents thundering herd on recovery.

### 65. Graceful Shutdown

Proper cleanup on shutdown. Flushes buffers, closes connections, completes in-flight requests. Clean exit for container orchestration.

### 66. Telemetry

Optional anonymous usage statistics sent every 24 hours. Collects: instance ID, Arc version, OS info, CPU/memory specs. No user data, no queries, no credentials. Opt-out via configuration.

---

## Quick Reference

**Configuration defaults**:
- Server port: 8000
- Storage backend: local
- Buffer size: 50,000 records
- Buffer age: 5 seconds
- Connection pool: 2x CPU cores
- Memory limit: 50% system RAM
- Compaction: enabled, hourly at :05
- WAL: disabled
- Authentication: enabled

**Benchmarks** (Apple M3 Max, 14 cores, 36GB RAM):
- MessagePack ingestion: 9.47M rec/s
- Line Protocol ingestion: 1.92M rec/s
- Arrow query: 2.88M rows/s
- JSON query: 2.23M rows/s

**Storage backend overhead**:
- Local NVMe: baseline
- MinIO (local): +5-10% write, +2-5% query
- AWS S3: +20-30% write, +10-20% query

---

## When to Use Arc

**Good fit**:
- Time-series workloads (IoT, metrics, logs, events)
- Need production infrastructure over DuckDB without building it yourself
- Analytical queries on large datasets
- Multi-format response needs (JSON for apps, Arrow for data science)
- Portable data requirement (Parquet files you own)

**Not ideal for**:
- OLTP workloads with heavy single-row updates
- Graph databases or document stores
- Very low latency requirements (sub-millisecond)

---

## Replication

- **Repository**: github.com/basekick-labs/arc
- **Documentation**: docs.basekick.net/arc
- **Python SDK**: pypi.org/project/arc-tsdb-client
- **Grafana Plugin**: grafana.com marketplace (search "Arc")
- **Docker Image**: ghcr.io/basekick-labs/arc
- **Creator**: Ignacio Van Droogenbroeck (linkedin.com/in/ignaciovandroogenbrock)

---

## What I'm Applying

I'm using patterns from Arc in my analytics tools (app.tigzig.com):

- MessagePack columnar format for high-speed ingestion
- Apache Arrow responses for large query results
- Parquet storage with time-based partitioning
- Connection pooling for DuckDB
- Buffer-based flushing strategy

Studying production codebases is how you learn patterns that actually work at scale. Arc's code is well-structured and worth reading directly.

*Notes:*
1. *Arc is AGPL-3.0 licensed. Free to use and modify. If you modify and run as a service, share changes under AGPL-3.0. Commercial licensing available.*
2. *This post documents my learning from studying the Arc codebase and documentation. I am not affiliated with Basekick Labs.*
