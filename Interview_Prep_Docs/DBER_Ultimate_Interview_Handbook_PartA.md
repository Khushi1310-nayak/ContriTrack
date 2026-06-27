# ContriTrack Ultimate Interview Handbook: Database ER Diagram (Part A)

---

## 1. Diagram Purpose

*   **What this diagram shows:** The logical data model of the application. It illustrates exactly how entities (Users, Workspaces, Repositories, Commits) map to physical tables in PostgreSQL, detailing Primary Keys, Foreign Keys, and multiplicity (1:N, N:M).
*   **Why it exists:** The database schema is the foundation of any application. If the schema is flawed, the entire backend API will be convoluted. This diagram proves that the data layer is robust, normalized, and scalable.
*   **Software Engineering Principles:**
    *   **Data Normalization (3NF):** Ensuring data is non-redundant to prevent update anomalies.
    *   **Referential Integrity:** Enforcing strict foreign key constraints (e.g., `ON DELETE CASCADE`) to prevent orphaned rows.
    *   **Multi-Tenancy Isolation:** Designing the schema so that Data from Workspace A can never leak into Workspace B.
*   **When interviewers ask about it:** When they ask "Design the database schema for a GitHub Analytics tool," "How do you handle Many-to-Many relationships?", or "Walk me through your database indexing strategy."

---

## 2. Complete Flow (Every Box & Arrow)

### Boxes (Entities/Tables)

1.  **`User` Table:**
    *   *What it does:* Stores human identity.
    *   *Inputs:* Firebase UID, Email, Display Name.
    *   *Why it exists:* To track individuals regardless of which corporate workspace they belong to.
2.  **`Workspace` Table:**
    *   *What it does:* The core "Tenant" container.
    *   *Inputs:* Workspace Name, Subscription Tier.
    *   *Why it exists:* B2B SaaS architecture requires grouping users and data into isolated logical containers.
3.  **`WorkspaceMember` (Junction Table):**
    *   *What it does:* Maps Users to Workspaces with a specific `Role` (e.g., ADMIN, VIEWER).
    *   *Why it exists:* Because a User can belong to multiple Workspaces, and a Workspace has multiple Users (Many-to-Many). Relational databases require a junction table to resolve this.
4.  **`GitHubToken` / `OAuth` Table:**
    *   *What it does:* Holds the encrypted API keys necessary to sync data.
    *   *Why it exists:* Separated from the User table so multiple users can theoretically share a service account token, or a user can have multiple tokens.
5.  **`Repository` Table:**
    *   *What it does:* Represents a synced GitHub codebase. Linked directly to a `Workspace`.
6.  **`Commit`, `PullRequest`, `Issue` Tables:**
    *   *What it does:* The massive telemetry tables. They hold the raw activity data.
    *   *Why they exist:* To perform historical analytics without re-querying the GitHub API.
7.  **`Analytics` / `AIInsight` Tables:**
    *   *What it does:* Stores the mathematical aggregates and Gemini AI text summaries.

### Arrows (Relationships)

*   **User (1) <---> (N) WorkspaceMember (N) <---> (1) Workspace:** Resolves the Many-to-Many relationship.
*   **Workspace (1) ---> (N) Repository:** A workspace owns many repos. If a Workspace is deleted, the cascade arrow deletes the Repositories.
*   **Repository (1) ---> (N) Commit:** A repository has thousands of commits.
*   **User (1) ---> (N) Commit (via author mapping):** Commits are linked to specific internal Users so we can generate individual performance reviews.

---

## 3. Technology Deep Dive

### PostgreSQL vs NoSQL (MongoDB)
*   *Why chosen:* ContriTrack relies heavily on relational links. To calculate "Team Velocity", we must join `Workspace -> Repositories -> Commits -> Users`. PostgreSQL excels at `JOIN` operations.
*   *Alternatives:* MongoDB (NoSQL).
*   *Trade-offs:* PostgreSQL requires strict schema migrations (Prisma schema files) and takes longer to prototype than dumping loose JSON into Mongo.
*   *Advantages:* Strict ACID compliance. We cannot accidentally create a Commit for a Repository that was deleted.
*   *Disadvantages:* Harder to scale horizontally (Sharding) compared to MongoDB.
*   *Real-world usage:* Stripe, Instagram, Notion.
*   *Bottleneck:* Deep `JOIN` queries across millions of rows can cause high CPU utilization, requiring materialized views.

---

## 4. Internal Working

"If you join the team and need to query the database, you must understand our Tenant boundary. Because this is a B2B SaaS, almost every query you write must be scoped to a `Workspace`. 

If you want to fetch all commits, you never write `SELECT * FROM Commits`. You write `SELECT * FROM Commits WHERE repositoryId IN (SELECT id FROM Repositories WHERE workspaceId = $1)`. Prisma handles these joins under the hood, but mentally, you must always remember that the `Workspace` is the root of the tree. The `WorkspaceMember` table is our gatekeeper—before you even hit the Commits table, the Server Action checks if your `userId` exists in `WorkspaceMember` for the requested Workspace."

---

## 5. Design Decisions

*   **Why UUIDs instead of Auto-Incrementing Integers (1, 2, 3)?** If we use integers, competitors or attackers can guess our URL structures (`/workspace/5`) and deduce exactly how many workspaces we have (Insecure Direct Object Reference - IDOR). UUIDv4 strings (`/workspace/a3f-91b...`) are cryptographically random and unguessable.
*   **Why Soft Deletes vs Hard Deletes?** We implement Hard Deletes (`ON DELETE CASCADE`) for Repositories and Commits to save disk space. However, for Users and Workspaces, we often use Soft Deletes (setting `deletedAt = NOW()`) so we can recover the account within 30 days if a customer accidentally cancels their subscription.
*   **Why a dedicated `WorkspaceMember` table instead of an array of IDs?** In Postgres, you *can* use an array column (`userIds[]`), but you cannot easily enforce foreign key constraints, roles, or indexing on an array. A junction table is the standard, scalable relational model.

---

## 6. Scalability

*   **10 users:** A tiny managed Postgres instance (e.g., Supabase Micro) handles everything in-memory.
*   **1,000 users:** The `Commits` table reaches 500,000 rows. Dashboard queries slow down. We must add **Compound Indexes**, e.g., `CREATE INDEX ON Commits (repositoryId, timestamp DESC)`.
*   **10,000 users:** The DB CPU spikes to 90% due to heavy read volume. We introduce **Read Replicas**. The Next.js API routes all `INSERT` (sync) operations to the Master DB, and all `SELECT` (dashboard) operations to a Read Replica DB, instantly doubling capacity.
*   **100,000 users:** The tables become too large for one physical machine. We implement **Table Partitioning**. We partition the `Commits` table by year (e.g., `commits_2024`, `commits_2025`). Queries for recent data only scan the smaller 2025 partition.
*   **1 million users:** We must implement **Database Sharding**. We shard based on `workspaceId`. Workspace A to M lives on Database Cluster 1. Workspace N to Z lives on Database Cluster 2. This requires significant application logic changes as cross-shard `JOINs` are impossible.

---

## 7. Failure Handling

*   **Connection Exhaustion:** Serverless Vercel can exhaust Postgres connections. *Handling:* Use Prisma Accelerate or PgBouncer to queue and multiplex connections.
*   **Deadlocks:** Two Server Actions try to update the exact same Workspace and Repository simultaneously in reverse order. *Handling:* Postgres detects the deadlock and aborts one transaction. Our Prisma client catches `P2034`, waits 50ms, and retries the transaction.
*   **Corrupted Data Ingestion:** If the Analytics engine returns `NaN` (Not a Number) for a metric, the DB must not accept it. *Handling:* We apply strict Postgres `CHECK` constraints on numeric columns (e.g., `CHECK (fairness_score >= 0.0 AND fairness_score <= 1.0)`).

---

## 8. Security

*   **SQL Injection:** Mitigated entirely by Prisma ORM, which forces parameterized queries.
*   **Row-Level Security (RLS):** Because we use Supabase/Postgres, we can optionally push security down to the database level. We write policies stating: `CREATE POLICY view_repos ON Repositories FOR SELECT USING (workspaceId IN (SELECT workspaceId FROM WorkspaceMember WHERE userId = current_user_id))`. Even if the Next.js API has a bug, the database physically refuses to return data belonging to another workspace.
*   **Encryption at Rest:** The entire Postgres disk volume is encrypted by the cloud provider (AWS EBS encryption). Sensitive columns (GitHub tokens) are explicitly encrypted at the application level before insertion.

---

## 9. Performance

*   **Slow Queries:** We monitor `pg_stat_statements` to find queries taking longer than 100ms.
*   **Indexes:**
    *   B-Tree Indexes on all Foreign Keys (e.g., `workspaceId`, `authorId`).
    *   Compound Indexes for sorting (e.g., `(repositoryId, createdAt DESC)`).
    *   Unique Indexes on `(workspaceId, githubRepoId)` to prevent syncing the same repo twice to the same workspace.
*   **N+1 Query Problem:** If we fetch 50 Workspaces, and then loop through them to fetch Repositories, we hit the DB 51 times. Prisma handles this natively if we use `include: { repositories: true }`, resolving it in a single SQL `JOIN`.

---

## 10. Database Deep Dive (Tables & Transactions)

*   **Transactions:** When a user deletes a Workspace, we must delete the AI Insights, the Commits, the Repos, the WorkspaceMembers, and the Workspace. We wrap this in a Prisma `$transaction`. If the server crashes on step 3, the database rolls back steps 1 and 2 automatically, preventing dangling orphans.
*   **Optimistic Locking:** If two admins try to consume an "AI Credit" at the same time, we use a `version` column. `UPDATE Workspace SET credits = credits - 1, version = version + 1 WHERE id = 1 AND version = 5`. If Admin B's query fires a millisecond later, the `version` is now 6, so the `WHERE` clause fails. Admin B's request is safely rejected, preventing negative credits.

---

## 11. Interview Questions (100 Questions)

### 20 Easy
1. What is an Entity-Relationship (ER) diagram?
2. What is a Primary Key?
3. What is a Foreign Key?
4. What does 1:N mean?
5. Why did you use PostgreSQL?
6. What is Prisma?
7. What is a schema?
8. Explain what a UUID is.
9. What happens if you delete a user?
10. What is a Junction Table?
11. Why do we need the `WorkspaceMember` table?
12. What does ACID stand for?
13. What is an Index?
14. Why don't we store JSON arrays directly in the User table for Workspaces?
15. What is normalization?
16. What is a transaction?
17. How do you prevent duplicate email addresses?
18. What is a `JOIN`?
19. What is an ORM?
20. Why not use SQLite for production?

### 20 Medium
21. Explain the difference between `ON DELETE CASCADE` and `ON DELETE SET NULL`.
22. Walk me through resolving a Many-to-Many relationship in SQL.
23. Why did you choose UUIDv4 over Auto-Incrementing IDs?
24. What is the N+1 query problem and how does your architecture solve it?
25. Explain the difference between B-Tree indexes and Hash indexes.
26. How do you implement Soft Deletes in PostgreSQL?
27. What is a Compound Index and when do you use it?
28. Explain Row-Level Security (RLS).
29. How does Prisma handle schema migrations?
30. What happens during a transaction rollback?
31. Contrast 3rd Normal Form (3NF) with a Star Schema (Data Warehousing).
32. Why is connection pooling necessary for Serverless functions?
33. How do you store encrypted data safely in Postgres?
34. Explain Optimistic Locking vs Pessimistic Locking.
35. What is the difference between Prisma `update` and `upsert`?
36. How do you handle database timezone issues?
37. What is a partial index and when would you use it in this schema?
38. Explain what an isolation level is in a transaction.
39. How do you prevent a user from being added to the same workspace twice?
40. What is an execution plan (`EXPLAIN ANALYZE`) in Postgres?

### 20 Hard
41. Node.js sends a massive Prisma `$transaction` inserting 10,000 commits. The DB throws a deadlock error. How do you debug and fix this?
42. Design a database schema modification to support hierarchical Workspaces (Sub-workspaces) of infinite depth.
43. How do you achieve zero-downtime database migrations when renaming a high-traffic column (e.g., `userId` to `accountId`)?
44. Walk me through the exact B-Tree traversal process when PostgreSQL executes a query on a compound index.
45. If the `Commits` table reaches 50 million rows, how do you implement Table Partitioning by date?
46. Contrast scaling this schema using Read Replicas vs Database Sharding.
47. How do you implement a distributed transaction (Two-Phase Commit) if the User database and the Analytics database are physically separated?
48. Design a schema to support "Audit Logs" that tracks every single change to any row in the database, ensuring immutability.
49. Explain the impact of Postgres VACUUM processes on your heavy `UPDATE` tables.
50. How do you handle schema drift between your local development environment, staging, and production?
51. Walk me through a SQL injection attack that bypasses parameterized queries, and how you defend against it.
52. If an attacker gains read-only access to a database backup, how does your schema design protect sensitive PII?
53. How do you implement Cursor-based pagination on a table where the sort column (e.g., `score`) has duplicate values?
54. Contrast Prisma's approach to JOINs (application-level) vs traditional SQL JOINs (database-level) under heavy load.
55. Design a real-time notification schema that avoids the "unread count" bottleneck when a single event notifies 10,000 users.
56. How do you manage database connections dynamically during a massive DDoS attack to prevent connection starvation?
57. Explain how you would implement full-text search across all commits using Postgres `tsvector`.
58. What is the performance impact of using UUIDv4 as a Primary Key compared to ULID or UUIDv7?
59. How do you enforce data retention policies (e.g., deleting data older than 7 years) without causing massive locking on the table?
60. Design a database architecture that guarantees strict serializability in a multi-region deployment.

### 20 Senior
61. Critique the decision to use a single monolithic PostgreSQL database for both OLTP (User/Workspace state) and OLAP (Commit Analytics).
62. How would you redesign this schema to run entirely on a NoSQL database like DynamoDB (Single Table Design)?
63. Walk me through a Disaster Recovery scenario: The primary DB is corrupted by a bad migration, and the hot standby replicated the corruption. How do you restore point-in-time from WAL (Write-Ahead Logs)?
64. How do you architect a multi-tenant database strategy: Pooled (Shared DB) vs Siloed (One DB per Workspace)? Defend your choice.
65. If a VC firm acquires us and demands we merge our database with their legacy Oracle database, architect the synchronization layer.
66. Explain the concept of MVCC (Multi-Version Concurrency Control) in PostgreSQL and how it prevents read locks.
67. How do you implement a robust archiving strategy that moves cold data from PostgreSQL to AWS S3 while keeping it queryable?
68. Design an event-sourcing architecture where the PostgreSQL database acts as a read-model projection of a Kafka event log.
69. How do you manage Prisma schema generation and migrations in a monorepo with 5 independent microservice teams?
70. Explain how you would use eBPF to trace disk I/O bottlenecks in the PostgreSQL kernel.
71. Critique the use of Foreign Keys. When does a hyper-scale company (like GitHub) intentionally drop foreign key constraints?
72. How do you implement a custom Bloom Filter to optimize queries for a feature that checks if a user has ever viewed a specific commit?
73. Design a database topology that provides 99.999% availability (less than 5 minutes of downtime a year).
74. How do you handle the "Thundering Herd" problem on the database when a popular cache key expires?
75. Walk me through the security implications and implementation of Postgres Extension `pgcrypto` versus application-level encryption.
76. How do you enforce structural immutability in the database for financial or compliance records?
77. Design a materialized view strategy that auto-refreshes incrementally rather than doing a full table scan.
78. How do you manage database schema backwards compatibility for an API that must support 3 different mobile app versions simultaneously?
79. Explain the performance characteristics of Postgres JSONB columns vs strict relational tables for storing dynamic API payloads.
80. Architect a data pipeline that uses Debezium to stream row-level changes from Postgres directly to a real-time UI via WebSockets.

### 20 Staff Engineer
81. Assume the company pivots. We now need to execute graph-based queries (e.g., "Find the shortest path of pull requests between User A and User B"). Architect the transition from PostgreSQL to Neo4j.
82. You are leading a team of 100 engineers. How do you architect the CI/CD pipeline to automatically catch and block database migrations that cause table locks on tables larger than 1GB?
83. Design a distributed, globally consistent database architecture using Google Spanner to replace this Postgres schema.
84. How do you implement a bespoke concurrency control algorithm that outperforms Postgres' default MVCC for our specific Analytics workload?
85. Walk me through the mathematical optimization of B-Tree fanout parameters to reduce disk I/O for SSDs vs HDDs in our deployment.
86. Architect a federated database mesh where different corporate clients can elect to store their specific `Workspace` data in a geographic region of their choice for compliance.
87. How do you convince the executive board to fund a 1-year project to migrate 50 Terabytes of data from PostgreSQL to CockroachDB with zero downtime?
88. Design a system that automatically detects and flags PII (Personally Identifiable Information) anomalies being inserted into the database using inline machine learning.
89. How do you architect a "schema-less" extension capability allowing enterprise customers to add 100 custom columns to the `Commit` table without altering the physical schema or using JSONB?
90. Explain the CAP theorem in the context of splitting this database into a distributed cluster. How do you handle Network Partitions gracefully?
91. Architect a real-time OLAP cube using Apache Druid that ingests directly from the Prisma replication log.
92. How do you build a Chaos Engineering framework specifically designed to corrupt database pages and verify the self-healing properties of the cluster?
93. Design a cross-cloud database replication strategy (AWS to Azure) that guarantees sub-second synchronization latency.
94. How do you manage the lifecycle and decommissioning of database columns in a system with 500 downstream dependencies?
95. Architect a custom database proxy layer (in Rust) to intercept, rewrite, and optimize Prisma SQL queries before they hit the Postgres engine.
96. Explain the implications of SSD wear-leveling on the write-amplification caused by Postgres WAL logs in a write-heavy environment.
97. How do you design a database schema that is mathematically proven to be compliant with GDPR's right-to-be-forgotten across distributed backups?
98. Architect a unified Data Mesh where the 'Auth', 'Workspaces', and 'Analytics' schemas are maintained by separate teams but queryable via a single federated GraphQL gateway.
99. Propose a technical strategy for implementing temporal tables (bi-temporal modeling) to query the database state exactly as it was on a specific date, from the perspective of what was known on that date.
100. Draw the database architecture of this system when it processes 10% of the world's total GitHub telemetry data daily.

---

*(Due to length, Perfect Answers and Follow-Ups for the 100 questions are continued in the subsequent section.)*
