 DEEP ANALYSIS POST (The Main Asset - Do This in 3-5 Days)
This is your high-value play. Model it on your DuckDB learning series post.
Suggested Title Structure:
"Inside Arc: 20 Production Patterns for Building on DuckDB"
or
"What I Learned Studying Arc's Codebase: DuckDB at Production Scale"
Post Structure (Your Standard Field Report Format):

HEADLINE:
"Studied the Arc database codebase. 400+ GitHub stars in 2 months, 150+ production deployments, AWS Marketplace listing. Built by Ignacio Van Droogenbroek - 20+ years, serious engineer.
Arc = DuckDB + production infrastructure for time-series workloads. Full REST API, 9.47M records/sec ingestion, Apache Arrow responses, retention policies, continuous queries.
Here's what I extracted - 20 patterns for building production systems on DuckDB."
BODY - 20 Learnings (Grouped by Category):
API & Query Patterns

Multi-format query responses - JSON for small results, Apache Arrow for 10K+ rows. Arrow = 2.88M rows/sec throughput. (Reference: /api/v1/query vs /api/v1/query/arrow)
Query cost estimation endpoint - Lets clients check query impact before execution. Smart for multi-tenant systems. (Reference: /api/v1/query/estimate)
Streaming responses for large datasets - Uses chunked transfer encoding, prevents memory explosions

Connection Management
4. DuckDB connection pooling - Handles concurrent read queries. Critical because DuckDB is single-writer but multi-reader

Separate write and read connection pools - Isolates write traffic from analytical queries

Data Ingestion
6. MessagePack for high-speed writes - 5x faster than text-based protocols. Columnar format in binary. (Reference: /api/v1/write/msgpack)

Gzip compression on wire - Accepts compressed payloads, reduces network transfer
Batching strategy - Buffers writes, commits in batches. Critical for 9.47M records/sec throughput

Storage Architecture
9. Direct Parquet storage - No proprietary format. Data portable to pandas, Spark, Snowflake. Query in place with DuckDB.

Time-based partitioning - Partition pruning by date range. Orders of magnitude faster for time-series queries.

Production Operations
11. Automatic compaction - Small files merged periodically. Keeps query performance stable as data grows.

Retention policies as code - Automated deletion by time window. Cron-scheduled. (Reference: /api/v1/retention)
Continuous queries - Materialized rollups (hourly/daily aggregations) run on schedule

Authentication & Security
14. Token-based auth - Bearer tokens with admin/user roles. Token rotation endpoint.

Token caching - Reduces DB lookups on every request. Cache invalidation API.

Monitoring & Observability
16. Prometheus metrics endpoint - Production-grade monitoring. Memory, query pool stats, per-endpoint metrics. (Reference: /metrics)

Structured logging with levels - Error/Warn/Info/Debug. Queryable via API. (Reference: /api/v1/logs)
Health and readiness probes - Kubernetes-ready. Separate liveness vs readiness checks.

Performance Engineering
19. Go for ingestion pipeline - High concurrency, low GC overhead. DuckDB for query engine. Right tool for each job.

Memory management - Tracks both Go runtime and DuckDB memory usage. Prevents OOM crashes.

Key Architectural Decision:
Parquet as storage = database now + data portability forever. If you outgrow Arc, your data works everywhere. No vendor lock-in.
Replication:
Full codebase at github.com/Basekick-Labs/arc
API docs at docs.basekick.net/arc
Built by Ignacio Van Droogenbroek (linkedin.com/in/ignaciovandroogenbrock)
Why This Matters:
If you're building on DuckDB - whether analytics tools, data apps, or custom databases - Arc's codebase shows how to productionize it. You don't need to use Arc itself. But these patterns solve real problems: concurrent access, efficient APIs, operational tooling.
I'm applying patterns #1, #4, #6, and #10 to my analytics tools (app.tigzig.com). Studying production code is how you learn fast.