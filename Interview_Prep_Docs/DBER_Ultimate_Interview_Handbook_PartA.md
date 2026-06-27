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
