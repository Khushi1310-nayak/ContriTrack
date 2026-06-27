# ContriTrack Ultimate Interview Handbook: High-Level Design (HLD)

---

## 1. Diagram Purpose

*   **What this diagram shows:** The macro-level view of ContriTrack. It illustrates the physical and logical boundaries between the Client (Browser), the Edge Network (Vercel CDN), the Application Server (Next.js Node environment), the Database (PostgreSQL via Prisma), and External Services (GitHub, Firebase, Gemini).
*   **Why it exists:** To give a 10,000-foot view of the system. In an interview, this proves you understand the entire lifecycle of a user request from click to database commit, and how third-party integrations are secured behind a server boundary.
*   **Software Engineering Principles:**
    *   **N-Tier Architecture (3-Tier):** Separation of Presentation (React), Application Logic (Next.js Server Actions), and Data (PostgreSQL).
    *   **Separation of Concerns:** The client never talks directly to the DB or GitHub.
    *   **Backend-for-Frontend (BFF):** The Next.js server is tightly coupled to serve the exact data shape the React client needs.
*   **When interviewers ask about it:** When they say "Design a system like Jira/GitHub Analytics," or "Walk me through your architecture from the moment a user types the URL to the moment data is rendered."

---

## 2. Complete Flow (Every Box & Arrow)

### Boxes

1.  **Client (Web Browser):**
    *   *What it does:* Renders the React DOM, executes client-side JS, captures user input.
    *   *Why it exists:* The presentation layer for the user.
    *   *Inputs/Outputs:* Receives HTML/CSS/JS from Vercel Edge. Outputs HTTP requests (GET/POST) via Server Actions.
    *   *Technologies:* React 18, TailwindCSS.
2.  **Vercel Edge Network (CDN & Middleware):**
    *   *What it does:* Caches static assets globally. Executes Next.js Middleware for ultra-fast route protection.
    *   *Why it exists:* To serve users from the data center physically closest to them, reducing First Contentful Paint (FCP).
    *   *Inputs/Outputs:* Inputs user HTTP requests. Outputs cached files or forwards dynamic requests to the Node server.
    *   *Technologies:* Vercel Edge Network.
3.  **Next.js Server (Node.js Environment):**
    *   *What it does:* Executes Server Actions, validates forms, processes business logic, computes analytics.
    *   *Why it exists:* To securely hold secrets (GitHub tokens) and execute heavy logic without bloating the client browser.
    *   *Inputs/Outputs:* Receives dynamic Client requests. Outputs DB queries and 3rd-party API requests.
    *   *Technologies:* Next.js App Router, Node.js.
4.  **Prisma ORM:**
    *   *What it does:* Translates TypeScript method calls into parameterized SQL queries.
    *   *Why it exists:* Type-safety. Ensures the DB schema matches the backend types exactly.
    *   *Technologies:* Prisma Client.
5.  **PostgreSQL Database:**
    *   *What it does:* Persistent relational storage.
    *   *Why it exists:* Enforces strict ACID properties and relational foreign keys for Workspaces, Users, and Commits.
    *   *Technologies:* PostgreSQL.
6.  **External APIs (GitHub, Firebase, Gemini):**
    *   *What they do:* Provide raw commit data, IDP token validation, and LLM code insights.
    *   *Why they exist:* Delegating core complexities (Auth, LLM, VCS) to specialized SaaS providers.

### Arrows (Data Movement)

*   **Browser -> Vercel Edge (HTTPS):** The user clicks "Sync Repo". An encrypted HTTP POST payload is sent.
*   **Vercel Edge -> Next.js Server (Internal routing):** Edge forwards the request to a serverless lambda function running the Server Action.
*   **Next.js Server -> Firebase (HTTPS):** Validates the session cookie/JWT.
*   **Next.js Server -> GitHub API (HTTPS):** Server uses decrypted Octokit token to fetch raw commits.
*   **Next.js Server -> Prisma (TCP):** Server passes data objects to Prisma.
*   **Prisma -> PostgreSQL (TCP/TLS):** Prisma executes `INSERT` statements to store commits.
*   **Next.js Server -> Browser (JSON/RSC Payload):** The server returns the updated UI state directly to React.

---

## 3. Technology Deep Dive

### Next.js App Router & Server Actions
*   *Why chosen:* Unified monorepo. Eliminates the need for a separate Express backend and complex CORS configurations. Reduces client-side JS bundle size.
*   *Alternatives:* React SPA (Vite) + Express.js backend.
*   *Trade-offs:* Tightly couples frontend to backend. Harder to migrate to mobile (React Native) because the API isn't a standard REST standard.
*   *Advantages:* Incredible developer velocity, instant type-sharing, built-in SEO and SSR.
*   *Disadvantages:* Vercel vendor lock-in. Serverless timeout limits (max 10-60 seconds) make long-running tasks difficult.
*   *Real-world usage:* Vercel, Notion, TikTok web.
*   *Bottleneck:* CPU-intensive tasks (like calculating Jain's Fairness Index for 100,000 commits) will block the Node event loop and time out the serverless function.

### PostgreSQL
*   *Why chosen:* Relational integrity. ContriTrack relies heavily on Many-to-Many relationships (Users <-> Workspaces <-> Repos).
*   *Alternatives:* MongoDB (NoSQL).
*   *Trade-offs:* Requires strict schema migrations. Slower horizontal scaling compared to NoSQL.
*   *Advantages:* ACID compliance prevents orphaned data. Powerful `JOIN` capabilities for analytics.
*   *Disadvantages:* Harder to shard globally. Connection limits in serverless environments.
*   *Bottleneck:* Reaching the maximum concurrent connections limit (`max_connections`) when Vercel spins up thousands of lambdas simultaneously.

---

## 4. Internal Working

"Let's trace a request. When a user clicks 'Analyze Repo', the React client intercepts the click and invokes a Server Action. Under the hood, Next.js performs an HTTP POST request to a hidden endpoint. The Vercel Edge router receives this, sees it's dynamic, and spins up a Node.js Lambda function.

Inside that Lambda, the first line of code verifies the user's session with Firebase. If valid, we use `crypto.ts` to decrypt their GitHub API token from our Postgres DB. We initialize Octokit with this token and hit GitHub's REST API. We pull an array of commits. We then run our analytics engine mathematically on the server. Finally, we use Prisma to wrap all the inserted commits into a single `$transaction` and push them to Postgres. We return a successful React Server Component payload back to the browser."

---

## 5. Design Decisions

*   **Why this architecture?** It optimizes for rapid development (Developer Experience) and immediate scale-to-zero capabilities for a startup MVP.
*   **Why not MVC?** Traditional MVC (like Ruby on Rails) renders heavy HTML on the server. Next.js App Router provides a more fluid, app-like SPA experience on the client while retaining server-side benefits.
*   **Why not REST backend?** Writing controllers, routers, and DTOs for a separate REST API doubles development time. Server Actions allow treating server code as async functions directly imported into UI components.
*   **Why not Microservices?** Premature optimization. Microservices introduce distributed tracing, complex deployments, and network latency. A modular monolith is vastly superior until independent deployment scaling is strictly required.
*   **Why Prisma?** Over raw SQL or TypeORM? Prisma provides an auto-generated, perfectly typed client. If I drop a column in the DB, my TypeScript compiler fails instantly, preventing runtime crashes.
*   **Why Firebase?** Building secure authentication (hashing passwords, rotating salts, handling OAuth flows, OTPs) from scratch is a massive security risk. Firebase offloads this liability to Google.
*   **Why Gemini?** Context window size and cost. Analyzing 10,000 lines of code requires massive token limits which Gemini handles more efficiently than GPT-4 for this specific use case.

---

## 6. Scalability

*   **10 users:** Runs beautifully on single Vercel Hobby tier and standard Postgres instance.
*   **100 users:** Implement standard Next.js Data Cache. Repeated queries for the same dashboard are served from Vercel's Edge Cache rather than hitting the DB.
*   **1,000 users:** Postgres connections start failing. We MUST introduce **Connection Pooling** (PgBouncer or Prisma Accelerate) to multiplex thousands of serverless connections into a few persistent DB connections.
*   **10,000 users:** Add **Redis** (Upstash). When calculating team velocity, cache the resulting JSON in Redis for 5 minutes. The DB is now protected from read-heavy dashboard loads.
*   **100,000 users:** GitHub Rate Limits will ban us. We MUST introduce **Message Queues (RabbitMQ/BullMQ)**. UI requests an update -> pushes job to Queue -> Background Worker pulls from GitHub slowly -> updates DB -> pushes result to client via **WebSockets**.
*   **1 million users:** The monolithic database becomes a bottleneck. We must implement **Read Replicas** for dashboard reads, and consider **Sharding** the Postgres database by `WorkspaceID`, meaning different corporate clients live on entirely separate physical DB servers. We might also migrate webhook ingestion to **Kafka** for high-throughput event streaming.

---

## 7. Failure Handling

*   **Database Failure:** If Postgres goes down, the app is entirely bricked. *Handling:* Implement automated failover to a hot-standby Read Replica in a different availability zone.
*   **GitHub API Failure/Rate Limit:** *Handling:* The server catches the 403 error, logs it to `RepositorySyncLog`, and degrades gracefully. The UI shows a yellow banner: "GitHub Sync Delayed - Showing Stale Data", but the user can still view old analytics.
*   **Gemini Failure:** *Handling:* Wrap the AI call in a **Circuit Breaker**. If it fails 3 times, trip the circuit, return a fallback message ("AI Insights temporarily unavailable"), and don't try again for 5 minutes to prevent blocking the UI.
*   **Server Crash:** *Handling:* Because Vercel Lambdas are stateless, a crash just kills that one request. The user hits refresh, a new Lambda spins up, and normal operation resumes.
*   **Timeouts:** Vercel Pro has a 60s timeout limit. *Handling:* Move long tasks (fetching 10 years of commits) to an asynchronous background worker outside of the Vercel request lifecycle.

---

## 8. Security

*   **Authentication:** Firebase JWTs handle identity.
*   **Authorization:** Middleware and Server Actions explicitly check if `user.id` is linked to `workspace.id` in the `WorkspaceMember` table before returning data (Tenant Isolation).
*   **Encryption (Secrets):** GitHub OAuth tokens are encrypted-at-rest in Postgres using `aes-256-gcm`. The master key is stored in Vercel Environment Variables.
*   **SQL Injection:** Impossible by design. Prisma uses prepared statements; it never concatenates raw strings into SQL.
*   **XSS (Cross-Site Scripting):** Handled by React. React automatically escapes all injected variables in JSX (e.g., `<p>{userInput}</p>`).
*   **CSRF (Cross-Site Request Forgery):** Next.js Server Actions automatically include secure, encrypted action IDs that act as built-in anti-CSRF tokens.
*   **Rate Limiting:** Implement Upstash Redis Rate Limiting in Next.js Middleware to block IPs that spam the "Sync" button (OWASP mitigation).

---

## 9. Performance

*   **Slow Queries:** We analyze logs to find seq-scans. We fix this by adding Compound Indexes in Prisma, e.g., `@@index([workspaceId, createdAt])` for dashboard timelines.
*   **Pagination:** We never use `SELECT * FROM Commits`. We use Cursor-Based Pagination (`take`, `skip`, `cursor` in Prisma) to load 20 commits at a time.
*   **Lazy Loading:** React components heavily use `next/dynamic` and React Suspense. The UI loads instantly with skeleton loaders while the server fetches data.
*   **Batch Processing:** Instead of doing 1,000 `INSERT` queries for new commits, we use Prisma's `createMany()` to batch insert them in a single network round-trip.

---

## 10. Database

*   **Core Tables:** `User`, `Workspace`, `WorkspaceMember` (Junction table), `GitHubAccount`, `Repository`, `Commit`, `PullRequest`, `AIInsight`.
*   **Relationships:** One-to-Many (Workspace -> Repos). Many-to-Many (Users <-> Workspaces).
*   **Foreign Keys:** Strict referential integrity. If a Workspace is deleted, `onDelete: Cascade` ensures all linked Repos and Commits are instantly deleted to prevent orphaned data.
*   **Normalization:** Highly normalized (3NF). We do not store User Names inside the Commit table; we link via `authorId` to the User table to prevent data anomalies if a user changes their name.
*   **Transactions:** When generating an AI Insight, we use Prisma `$transaction` to deduct an "AI Credit" from the Workspace AND save the Insight. If either fails, both roll back (Atomicity).
*   **Concurrency:** To prevent two people from using the same AI credit simultaneously, we use **Optimistic Locking** or atomic decrements (`decrement: 1`) in the DB query.

---
