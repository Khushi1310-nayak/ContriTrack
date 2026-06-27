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

## 11. Interview Questions (100 Questions)

### 20 Easy
1. What is Next.js?
2. What does Vercel do in this architecture?
3. Why did you use React?
4. What is PostgreSQL?
5. Why is Prisma called an ORM?
6. What is a Server Action?
7. Where does the browser run in this diagram?
8. What is Firebase used for?
9. Why do you need GitHub integration?
10. What does Gemini AI do here?
11. What is Tailwind CSS?
12. Why not use plain HTML/JS?
13. What is an API?
14. What is a CDN?
15. What is a relational database?
16. How does the user login?
17. Where are environment variables stored?
18. What is a primary key?
19. What is a foreign key?
20. What does JSON stand for?

### 20 Medium
21. Explain the difference between Next.js and standard React SPA.
22. What is the Backend-for-Frontend (BFF) pattern?
23. Why use Prisma instead of writing raw SQL?
24. Explain how a Server Action prevents CSRF attacks.
25. What happens to your Postgres DB if Vercel spins up 1,000 functions simultaneously?
26. How do you protect API routes from unauthorized users?
27. Why encrypt GitHub tokens if the database is already private?
28. What is connection pooling and why is it needed here?
29. How do you handle pagination for fetching 5,000 commits?
30. Explain React Suspense in the context of data fetching.
31. How do you prevent SQL injection in this app?
32. What is a JWT and how does Firebase use it?
33. Why is dropping a database column dangerous in a CI/CD pipeline?
34. Explain the difference between horizontal and vertical scaling.
35. What is Redis and where would you put it in this diagram?
36. How do you handle GitHub API rate limits?
37. What is N-Tier architecture?
38. Explain what a Junction Table is and give an example from your app.
39. What is the Edge network?
40. How do you manage secrets locally versus in production?

### 20 Hard
41. Node.js is single-threaded. How does calculating heavy analytics impact concurrent requests in your Serverless environment?
42. Walk me through implementing a Circuit Breaker for the Gemini AI integration.
43. Design an architecture to handle GitHub Webhooks that receive 1,000 events per second.
44. How do you achieve zero-downtime database schema migrations with Prisma?
45. Explain how you would decouple the AI Analytics into a separate microservice.
46. If your database CPU is at 100%, what are your first three debugging steps?
47. How would you implement Database Sharding for multi-tenant isolation?
48. Contrast the Saga Pattern vs Two-Phase Commit (2PC) if you split the User DB and Workspace DB.
49. How do you handle idempotency for GitHub webhook retries?
50. Walk me through a Man-in-the-Middle attack and how this architecture defends against it.
51. Explain Cursor-based pagination vs Offset-based pagination at the SQL execution level.
52. How does React's Reconciliation algorithm interact with Next.js Server Components?
53. Defend the use of a Monolith (Next.js) over Microservices for this project.
54. How do you guarantee atomic operations when consuming an AI credit in a highly concurrent environment?
55. Design a real-time WebSocket architecture for this app using Redis Pub/Sub.
56. How do you implement global rate limiting across distributed Vercel Edge nodes?
57. Explain how V8 engine Garbage Collection affects your Next.js server memory usage during heavy syncs.
58. How do you securely rotate the master AES encryption key without downtime?
59. What are the performance implications of Server Actions passing large JSON payloads compared to GraphQL?
60. Explain how B-Tree indexes work in PostgreSQL and how you applied them to your schema.

### 20 Senior
61. If GitHub is down, how do you architect the system to degrade gracefully without breaking the UI?
62. How would you redesign this architecture to run entirely on AWS (removing Vercel and Firebase)?
63. Walk me through a Disaster Recovery plan if the Supabase/Postgres region is completely destroyed.
64. How do you instrument this application for OpenTelemetry?
65. Defend your choice of AES-256-GCM. Why GCM over CBC?
66. Explain the concept of 'Cold Starts' in Serverless and how you mitigate them.
67. How do you handle schema drift between your Prisma client and actual production DB?
68. Design an asynchronous job queue system in Postgres without using Redis.
69. What metrics would you alert on to page the on-call engineer at 3 AM?
70. How do you enforce strict tenant data isolation at the Row-Level Security (RLS) level in Postgres?
71. Contrast Next.js App Router caching with Redis application caching.
72. How do you handle cache invalidation for the team analytics dashboard?
73. Design a blue-green deployment pipeline for this architecture.
74. How would you scale the Gemini integration to process millions of code snippets without hitting API quotas?
75. Explain how to detect and prevent a memory leak in your Node.js analytics engine.
76. If a malicious user uploads a 5GB payload to a Server Action, how does the architecture defend itself?
77. How would you structure this monorepo to separate frontend UI from backend services using Turborepo?
78. Explain how you would implement a distributed lock for syncing repositories.
79. How do you manage database connections during a massive traffic spike to prevent connection starvation?
80. Critique your own architecture: what is the single biggest technical flaw and how will you fix it?

### 20 Staff Engineer
81. Assume we want to sell this as an Enterprise On-Premise solution. Redesign the architecture to run in a customer's air-gapped Kubernetes cluster.
82. Our analytics engine now needs to process 10 Terabytes of commit history daily. Architect a transition from PostgreSQL to an OLAP database (e.g., ClickHouse).
83. You are leading a team of 50 engineers on this product. How do you architect the repository and CI/CD pipeline to ensure they don't block each other?
84. Design a cross-region active-active database replication strategy for global users.
85. The company is pivoting to real-time collaborative code editing. Redesign the backend using Operational Transformation (OT) or CRDTs.
86. A severe zero-day vulnerability is found in Next.js. Walk me through the Incident Response process from detection to deployment.
87. How do you establish a data governance and compliance architecture (GDPR/SOC2) for the PII stored in your database?
88. We want to implement a custom LLM fine-tuned on our users' codebases instead of Gemini. Design the ML-Ops pipeline and serving architecture.
89. Architect a federated GraphQL gateway to replace the Next.js BFF as we migrate to domain-driven microservices.
90. Explain the CAP theorem in the context of your caching and database replication strategy.
91. How do you build a Chaos Engineering framework to automatically test this architecture's resilience in production?
92. Design a cost-optimization strategy that reduces our Vercel and Database bills by 60% while handling 10x traffic.
93. How do you enforce security and architecture standards across multiple microservice teams using automated AST analysis in CI?
94. Architect a system that can ingest and query 1 million GitHub webhooks per second with exactly-once processing semantics.
95. We are experiencing sporadic 502 Bad Gateway errors under load. Walk me through a deep dive debugging session using kernel-level eBPF tracing.
96. Design an event-sourcing architecture for the workspace operations.
97. How do you convince the executive board to fund a 6-month architectural rewrite from Next.js to Go?
98. Propose a technical strategy for migrating 100 million rows from Postgres to DynamoDB with zero downtime.
99. Explain how you balance delivering product features vs paying down architectural tech debt in a hyper-growth startup.
100. Draw the architecture of this system 5 years from now when it processes 1% of all global GitHub traffic.

---

*(Due to length, Perfect Answers and Follow-Ups for the 100 questions are continued in the subsequent section.)*
