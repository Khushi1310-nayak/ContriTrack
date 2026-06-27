# ContriTrack Ultimate Interview Handbook: Data Flow Diagram (Part A)

---

## 1. Diagram Purpose

*   **What this diagram shows:** The exact lifecycle of a single piece of data (e.g., a GitHub Commit) as it travels from a third-party source into our database, gets transformed by algorithms, and is finally served to the user's screen.
*   **Why it exists:** To demonstrate your understanding of ETL (Extract, Transform, Load) pipelines within a synchronous web architecture. It maps out state changes and data mutations.
*   **Software Engineering Principles:**
    *   **Data Immutability vs Mutation:** Clarifying where raw data is preserved versus where it is aggregated.
    *   **Separation of Concerns (Data pipeline):** Keeping ingestion separate from transformation.
    *   **Single Source of Truth:** Ensuring PostgreSQL holds the canonical state, not the client's cache.
*   **When interviewers ask about it:** When they ask "Walk me through how you process 10,000 commits", "How do you handle data syncs?", or "Where does your analytics math actually happen?"

---

## 2. Complete Flow (Every Box & Arrow)

### Boxes

1.  **GitHub REST API / Webhooks (Source):**
    *   *What it does:* The external system holding the raw, unadulterated Git history.
    *   *Inputs:* Valid OAuth token, Repo ID.
    *   *Outputs:* JSON arrays of commits, PRs, and Issues.
2.  **Next.js Server Action (The Trigger):**
    *   *What it does:* The entry point. Initiates the sync process based on a user click.
    *   *Inputs:* `workspaceId`, User Session.
    *   *Outputs:* Triggers the Ingestion Service.
3.  **crypto.ts (Decryption Node):**
    *   *What it does:* Securely retrieves the API token required to talk to GitHub.
    *   *Inputs:* Encrypted token string from Postgres.
    *   *Outputs:* Plaintext Octokit auth token.
4.  **Ingestion Service (`github-service.ts`):**
    *   *What it does:* The 'Extract' phase. Pulls raw JSON from GitHub.
5.  **Analytics Engine (Transformation Layer):**
    *   *What it does:* The 'Transform' phase. Maps raw commit JSON into our domain models. Calculates Jain's Fairness Index, team velocity, and burnout risks in-memory.
6.  **Prisma / PostgreSQL (The Sink):**
    *   *What it does:* The 'Load' phase. Persists the transformed metrics and raw commit references.
7.  **React UI (The Consumer):**
    *   *What it does:* Queries the database for the final aggregated metrics to display on the dashboard.

### Arrows (Data Movement)

*   **UI -> Server Action:** Transmits a tiny command payload: `{ action: 'SYNC_REPO', repoId: '123' }`.
*   **Server Action -> DB (Token Fetch):** Retrieves the encrypted token.
*   **DB -> crypto.ts -> Octokit:** Decrypts the token in memory to authenticate the outbound request.
*   **Octokit -> GitHub API:** Outbound HTTPS GET request.
*   **GitHub API -> Ingestion Service:** Returns a massive 5MB JSON payload of 5,000 commits.
*   **Ingestion Service -> Analytics Engine:** Passes the JSON object reference in Node.js memory. The math algorithms iterate over it, stripping out unnecessary fields (like commit message bodies if we only need timestamps).
*   **Analytics Engine -> Prisma:** A heavily reduced, mathematically processed array of objects (e.g., 50 `AnalyticsResult` objects) is passed to the ORM.
*   **Prisma -> UI:** The UI requests the final dashboard data. A lightweight JSON object is sent to the client.

---

## 3. Technology Deep Dive

### In-Memory Node.js Transformation (Analytics Engine)
*   *Why chosen:* Processing the data locally inside the Next.js Serverless function avoids the network latency of sending 5MB of raw JSON to a separate Python microservice.
*   *Alternatives:* AWS Glue, Apache Spark, Python Pandas microservice.
*   *Trade-offs:* Node.js is single-threaded. Heavy math blocks the event loop. Spark would not block, but is wildly over-engineered for a startup MVP.
*   *Advantages:* Zero cold-starts for a separate service. 100% type sharing between the API response and the database schema.
*   *Disadvantages:* Strictly limited by Vercel's 1024MB memory limit and 60-second timeout.
*   *Bottleneck:* Trying to process 500,000 commits at once will exceed the 1GB RAM limit and crash the Lambda with an `OOM (Out of Memory)` error.

---

## 4. Internal Working

"Let me walk you through the data pipeline for generating our Team Analytics. 

When a sync is triggered, data flows from GitHub into our Node environment. At this exact moment, the data is just a massive, un-typed JSON string. Our `github-service` parses this and immediately passes it to the `analytics-engine`. The engine runs a `.reduce()` function across the array. It groups commits by `author_email` and counts them. It applies Jain's Fairness mathematical formula to these counts to generate a single 'Fairness Score' floating-point number. 

Notice what happens here: we took 5MB of raw commit data and transformed it into a 2KB metrics object. We discard the raw JSON from memory to trigger Garbage Collection, and only pass the 2KB metrics object to Prisma to be stored in PostgreSQL. The data flow compresses massively before hitting the database."

---

## 5. Design Decisions

*   **Why Transform in Node instead of Postgres?** We could theoretically dump the raw JSON into a Postgres `JSONB` column and use SQL `GROUP BY` and math functions to calculate fairness. However, SQL is notoriously difficult to debug for complex statistics, and scaling Postgres compute is extremely expensive. Scaling stateless Vercel Node functions is cheap. We do the math in the application layer.
*   **Why Decrypt tokens on the fly?** We never store plaintext tokens in memory longer than the lifecycle of a single request. Data flows from DB -> Decryptor -> GitHub -> Garbage Collector. This ensures that a memory dump of the Node process won't leak thousands of tokens.
*   **Why not stream the data?** For small repositories, loading the array into memory is fine. For massive repos, a design decision was made to use Pagination (`per_page=100`) rather than Node.js Streams, because the GitHub REST API doesn't support NDJSON streaming.

---

## 6. Scalability

*   **10 users:** The synchronous ETL pipeline inside the Next.js Server Action is instantaneous.
*   **1,000 users:** Vercel functions begin hitting timeouts if a repository has 50,000 commits. The data flow must change.
*   **10,000 users:** Introduce **Batch Processing**. We stop fetching *all* commits. The data flow changes to only fetch *delta* commits (commits since the last sync timestamp).
*   **100,000 users:** Switch from Pull to Push. The data flow reverses. Instead of the UI triggering a fetch, GitHub sends **Webhooks** to our API. The data flows into a **Kafka Queue**.
*   **1 million users:** The Transformation layer (Analytics Engine) is ripped out of Next.js. We use **Debezium CDC (Change Data Capture)**. Raw commits flow directly into a Data Warehouse (Snowflake). An Apache Airflow DAG runs nightly to run the transformation math, and pushes the results to a **Redis Edge Cache** for the Next.js UI to read instantly.

---

## 7. Failure Handling

*   **GitHub Data Malformed:** If GitHub changes their API response, our Zod schema in the Ingestion layer will instantly throw a `ZodError`. The data flow stops *before* it reaches the Analytics Engine, preventing corrupted math from entering our database.
*   **Out of Memory (OOM):** If the JSON payload is too large, Node crashes. *Fallback:* Implement paginated fetching. Fetch 100, process 100, save to DB, garbage collect, fetch the next 100.
*   **Network Failure during Load:** If Prisma fails to insert the transformed data, the raw data is already lost from memory. *Handling:* The transaction rolls back. The user must click "Sync" again.

---

## 8. Security

*   **Data in Transit:** All arrows in the diagram crossing physical boundaries use TLS 1.3 (HTTPS).
*   **Data at Rest:** The token flow explicitly shows encryption before reaching the database.
*   **PII (Personally Identifiable Information) Masking:** During the Transformation phase, if a commit contains sensitive emails, the Analytics engine can hash them before passing them to the Data Access layer, ensuring the database only stores anonymized hashes.

---

## 9. Performance

*   **Garbage Collection Pauses:** Node's V8 engine stops the world to clean up memory. By processing data in small batches and letting the variables fall out of scope, we keep GC pauses under 50ms.
*   **Memory Usage:** A 5MB JSON string takes up ~25MB of RAM once parsed into V8 objects. We strictly avoid deep-copying (`JSON.parse(JSON.stringify(data))`) in the data flow to conserve memory.
*   **Streaming:** For future performance, we can stream the JSON response directly into a JSON parser (like `JSONStream`) to process commits one by one without ever holding the full 5MB in RAM.

---

## 10. Database

*   **Write Heavy vs Read Heavy:** The Data Flow diagram proves this is a Read-Heavy system. We do the heavy writing (syncing) rarely, but read the aggregated analytics constantly on the dashboard.
*   **Materialized Views:** If the math was done in SQL, we would use Materialized Views to cache the results. Because we do the math in Node, our standard `Analytics` tables effectively *act* as materialized views of the raw commit data.

---
