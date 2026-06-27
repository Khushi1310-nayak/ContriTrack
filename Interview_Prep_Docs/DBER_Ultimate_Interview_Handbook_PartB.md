# ContriTrack Ultimate Interview Handbook: Database ER Diagram (Part B)

---

## 12. Perfect Answers & 13. Follow-Up Questions (Selected Core Questions)

*(Note: To maximize interview impact, these are the 25 most frequently tested concepts from the 100 questions. Mastering these ensures you can extrapolate answers to the rest.)*

### Easy / Medium Tier

**Q21. Explain the difference between `ON DELETE CASCADE` and `ON DELETE SET NULL`.**
*   **Perfect Answer:** "`ON DELETE CASCADE` means if a parent record is deleted, all child records are automatically deleted by the database engine. In our schema, if a Workspace is deleted, we cascade delete all its Repositories to prevent orphaned data. `ON DELETE SET NULL` keeps the child record but removes the foreign key reference. We use this if a User deletes their account, but we want to keep their Commits in the system for historical team analytics; the commit stays, but `authorId` becomes null."
*   **Follow-Up:** "What is the danger of `CASCADE`?" -> *Answer:* "Accidental massive data loss. If an admin deletes the root Workspace, it could instantly wipe 10 million commits. It also causes heavy database locking while the engine hunts down and deletes the millions of child rows."

**Q24. What is the N+1 query problem and how does your architecture solve it?**
*   **Perfect Answer:** "The N+1 problem occurs when fetching a list of parent records (like 10 Workspaces), and then looping through them in code to fetch the children (Repositories), resulting in 1 query for the parents, plus 10 queries for the children (N+1 = 11 queries). This destroys performance. Our architecture solves this using Prisma. By writing `prisma.workspace.findMany({ include: { repositories: true } })`, Prisma resolves this into a single, highly optimized SQL `LEFT JOIN`."
*   **Follow-Up:** "What if Prisma generated a bad SQL query for a complex join?" -> *Answer:* "Prisma has a `$queryRaw` escape hatch. I would write a custom raw SQL query using CTEs (Common Table Expressions) to optimize it manually."

**Q28. Explain Row-Level Security (RLS).**
*   **Perfect Answer:** "Traditional security happens at the application level (Next.js). If the API has a bug, data leaks. Row-Level Security pushes authorization down into the PostgreSQL kernel. We define policies on the table itself, e.g., 'A user can only `SELECT` rows where `workspaceId` matches their `WorkspaceMember` record.' If a hacker bypasses the API and runs `SELECT * FROM Repositories`, the database returns an empty array unless the current DB session is authenticated."
*   **Follow-Up:** "How does Next.js pass the user ID to the Postgres session?" -> *Answer:* "When opening the DB connection in the Server Action, we use `set_config('request.jwt.claim.sub', 'user_id', true)` to inject the current user's identity into the transaction context."

**Q34. Explain Optimistic Locking vs Pessimistic Locking.**
*   **Perfect Answer:** "Pessimistic Locking uses `SELECT ... FOR UPDATE`. It physically locks the row. If two admins try to consume an AI credit, Admin B is blocked until Admin A finishes. This is safe but reduces concurrency. Optimistic Locking assumes conflicts are rare. We add a `version` column. We run `UPDATE workspace SET credits = credits - 1, version = version + 1 WHERE id = 1 AND version = 5`. If Admin B tries to update it a millisecond later, their `WHERE version = 5` clause fails, and the application throws an error. It's much faster because there are no physical locks."
*   **Follow-Up:** "Which one did you choose for ContriTrack?" -> *Answer:* "Optimistic locking. In a Serverless environment, holding physical DB locks (Pessimistic) is dangerous because if the Vercel function times out, the lock might persist, freezing the entire table."

### Hard / Senior Tier

**Q43. How do you achieve zero-downtime database migrations when renaming a high-traffic column?**
*   **Perfect Answer:** "You cannot just use `ALTER TABLE RENAME COLUMN`. It locks the table, and existing API code will instantly crash. You must do a 4-step deployment. Step 1: Add the new column (empty). Step 2: Deploy code that writes to *both* columns but reads from the old one. Step 3: Run a background script to backfill the data from old to new. Step 4: Deploy code that reads/writes *only* to the new column. Step 5: Finally, run a migration to drop the old column."
*   **Follow-Up:** "What if the backfill script takes 3 days to run?" -> *Answer:* "Then we rely on Postgres database triggers to automatically copy data from the old column to the new column on every `INSERT/UPDATE` while the background script slowly processes historical rows."

**Q46. Contrast scaling this schema using Read Replicas vs Database Sharding.**
*   **Perfect Answer:** "Read Replicas solve read-heavy bottlenecks. We replicate the master database to 5 read-only nodes. The application logic stays simple: writes go to master, reads go to replicas. But replicas don't solve write bottlenecks or storage limits. When the database exceeds 5 Terabytes, we must Shard. Sharding splits the data physically. Workspaces A-M on Server 1, N-Z on Server 2. Sharding is vastly more complex because we lose the ability to do cross-shard `JOINs` and must handle routing logic in the application."
*   **Follow-Up:** "How do you generate a globally unique ID (Primary Key) across multiple shards?" -> *Answer:* "You can't use Auto-Increment integers because Shard 1 and Shard 2 would both generate ID #5. You must use UUIDs, Snowflake IDs (Twitter), or ULIDs."

**Q64. How do you architect a multi-tenant database strategy: Pooled vs Siloed? Defend your choice.**
*   **Perfect Answer:** "For ContriTrack, I chose a Pooled approach: all tenants (Workspaces) share the exact same database and tables, separated purely by a `workspaceId` column. This is cost-effective and easy to maintain. The alternative is Siloed: spinning up a completely separate database or Postgres Schema for every single customer. Siloed guarantees perfect data isolation and allows restoring a single customer's backup without affecting others, but it becomes an infrastructure nightmare to run DB migrations across 10,000 separate databases."
*   **Follow-Up:** "How do you enforce security in a Pooled model?" -> *Answer:* "We rely entirely on strict application-level checks in Next.js Server Actions, or Row-Level Security (RLS) in Postgres, to ensure a user never accidentally queries `workspaceId=2`."

**Q71. Critique the use of Foreign Keys. When does a hyper-scale company intentionally drop foreign key constraints?**
*   **Perfect Answer:** "Foreign keys guarantee data integrity, but they come with a massive performance penalty. Every time I insert a `Commit`, Postgres must scan the `Repository` table to verify the `repositoryId` exists. At hyper-scale (e.g., GitHub inserting 100,000 commits a second), these index lookups cripple write throughput. Companies like GitHub or Uber drop physical foreign keys to maximize write speed, shifting the responsibility of data integrity entirely into the application code."
*   **Follow-Up:** "If you drop FKs, how do you clean up orphaned data?" -> *Answer:* "You write background workers (Cron jobs) that periodically scan the database for orphans (e.g., Commits pointing to a deleted Repo ID) and clean them up asynchronously."

### Staff Engineer Tier

**Q83. Design a distributed, globally consistent database architecture using Google Spanner to replace this Postgres schema.**
*   **Perfect Answer:** "Standard Postgres relies on single-master replication, meaning global users suffer high latency writing to the US master. Google Cloud Spanner offers multi-master global consistency using TrueTime (atomic clocks/GPS). I would migrate the schema to Spanner. The schema design must change: Spanner requires explicit Table Interleaving. I would physically interleave the `Commits` table inside the `Repository` table. This ensures that all commits for a repo are stored on the exact same physical hard drive in the cluster, making dashboard `JOIN` queries incredibly fast, while Spanner handles the Paxos consensus protocol under the hood for global replication."
*   **Follow-Up:** "What is the trade-off of Spanner?" -> *Answer:* "Cost, and vendor lock-in. It is astronomically expensive compared to Postgres, and you are forever locked into Google Cloud's proprietary ecosystem."

**Q99. Propose a technical strategy for implementing temporal tables (bi-temporal modeling) to query the database state exactly as it was on a specific date.**
*   **Perfect Answer:** "Currently, our schema overwrites data. If a user changes their role from ADMIN to VIEWER, the old role is lost. Bi-temporal modeling adds `validFrom` and `validTo` timestamp columns to every table. We never `UPDATE` a row. To change a role, we set `validTo = NOW()` on the old row, and `INSERT` a new row with `validFrom = NOW()`. This allows 'Time Travel' queries. We can run `SELECT * FROM WorkspaceMember WHERE userId = 1 AND '2023-01-01' BETWEEN validFrom AND validTo`. This is critical for financial or audit compliance, allowing us to reconstruct the exact state of the system during a past security breach."
*   **Follow-Up:** "How does this impact storage?" -> *Answer:* "Storage requirements explode exponentially. It requires moving to a columnar database (ClickHouse) for historical analysis, while keeping the active state in Postgres."

---

## 14. Whiteboard Explanation

### 30-Second Pitch
"Our database uses a 3rd Normal Form relational schema in PostgreSQL. The core of the system revolves around the `Workspace`. Users connect to Workspaces via a Many-to-Many junction table. Workspaces own Repositories, which own Commits. This strict hierarchy allows us to use `ON DELETE CASCADE` to prevent orphaned data, while compound B-Tree indexes ensure our heavy dashboard queries resolve in milliseconds."

### 2-Minute Explanation
*Draw the 3 core tables: [User], [WorkspaceMember], [Workspace]*
"Let's trace the relationships. Because a user can be in multiple corporate workspaces, we map them via `WorkspaceMember`, which holds their authorization role. This guarantees strict multi-tenant isolation.
*Draw: [Workspace] -> [Repository] -> [Commits/AI Insights]*
The Workspace acts as the root. It holds multiple Repositories. These Repositories hold thousands of Commits. If a company deletes their Workspace, the `ON DELETE CASCADE` foreign key propagates down the tree, wiping all Repositories and Commits instantly and safely.
*Draw: Prisma Layer*
We interface with this using Prisma ORM. When fetching the dashboard, we don't do N+1 queries. We use Prisma to execute a single, optimized SQL `LEFT JOIN`. Furthermore, to handle concurrent admin actions, we use Optimistic Locking on the Workspace table to prevent race conditions without locking the database."

---

## 15. Common Mistakes Candidates Make

1.  **Ignoring Multi-Tenancy:** Failing to mention how `workspaceId` acts as the ultimate security boundary. If you build a SaaS without a tenant ID on every core table, you will leak data.
2.  **Misunderstanding Cascade Deletes:** Suggesting that the Next.js server should manually query and delete a million commits when a repository is deleted, rather than letting the DB handle it natively via Foreign Keys.
3.  **Forgetting Indexes:** Designing a perfect schema but forgetting that without a Compound Index on `(repositoryId, timestamp)`, a dashboard query will result in a disastrous Sequential Scan.
4.  **Auto-Incrementing IDs:** Proposing integer IDs (`id = 1`) for public-facing resources instead of UUIDs, opening the application to IDOR enumeration attacks.

---

## 16. Resume Mapping

*   "Architected a normalized PostgreSQL database schema supporting multi-tenant isolation via strict junction tables and row-level authorization concepts."
*   "Optimized analytical queries by implementing compound B-Tree indexing, resolving N+1 query bottlenecks via Prisma ORM aggregations."
*   "Engineered robust data integrity utilizing `ON DELETE CASCADE` foreign keys and Optimistic Locking to handle highly concurrent serverless transactions."

---

## 17. Storytelling (Natural Delivery)

"When mapping out the database, my primary concern was preventing data leakage between corporate clients. I structured everything around the `Workspace` entity. I intentionally added a junction table to map users to workspaces so we could cleanly implement Role-Based Access Control. Once the hierarchy was set, I realized that fetching analytics for a dashboard was going to require massive `JOIN`s. So, I spent a significant amount of time configuring Prisma to resolve these in single database trips, and placed compound indexes on the foreign keys. It paid off—our dashboard load times are minimal because the database does the heavy lifting."

---

## 18. Industry Comparison

*   **Microsoft (GitHub):** They process so much git data that a relational database would melt. They store the raw Git AST in custom object storage, and use massive distributed NoSQL databases (CosmosDB) for metadata, explicitly dropping foreign key constraints to maximize write throughput.
*   **Netflix:** Uses Cassandra (NoSQL) extensively. They would model this using a Single-Table Design. They would denormalize the data, duplicating the `Repository` name into every `Commit` row to ensure read queries are blazing fast, sacrificing write speed and storage space.
*   **Google:** Would utilize Cloud Spanner. They would physically interleave the child tables (`Commits`) inside the parent tables (`Repositories`) to ensure extreme locality of reference, guaranteeing that global distributed joins remain performant.

---

## 19. Interview Difficulty

*   **Rating:** **Senior Software Engineer (SDE-3)**
*   **Why:** A Junior understands how to create a table. A Mid-level understands Foreign Keys. A Senior understands the performance implications of N+1 queries, B-Tree indexes, Optimistic vs Pessimistic locking, and how to safely run schema migrations without downtime. This handbook covers all those Senior concepts.

---

## 20. Improvements (Making it Production-Ready)

### Already Implemented in Project
*   Normalized 3NF Relational Schema.
*   Prisma ORM for strict Type Safety.
*   UUIDs for primary keys to prevent IDOR attacks.

### Recommended Future Enhancements (To discuss in interview)
1.  **Read Replicas:** Route heavy Analytics dashboard reads to a Postgres Read Replica, freeing up the Primary DB to solely handle incoming GitHub syncs.
2.  **Connection Pooling:** Introduce PgBouncer or Prisma Accelerate to protect the database from connection exhaustion when thousands of Serverless functions spin up simultaneously.
3.  **Table Partitioning:** Partition the heavy `Commits` and `Analytics` tables by date (e.g., by month) to speed up queries that only care about recent data.
