# 🎓 ContriTrack: Comprehensive Technical Interview Master Guide

> **Author**: ContriTrack Engineering Team  
> **Target Audience**: Technical Interviewers, Hiring Managers, Academic Evaluators & Engineering Leads  
> **Repository**: [Khushi1310-nayak/ContriTrack](https://github.com/Khushi1310-nayak/ContriTrack)  
> **Last Updated**: August 2026

---

## 📑 Table of Contents
1. [Core Pitch & System Architecture](#1-core-pitch--system-architecture)
2. [Tech Stack Decisions & Justifications (The "Why")](#2-tech-stack-decisions--justifications-the-why)
3. [Database & Data Modeling (PostgreSQL, Prisma, RLS)](#3-database--data-modeling-postgresql-prisma-rls)
4. [Authentication, Authorization & API Security](#4-authentication-authorization--api-security)
5. [Telemetry Algorithms & Jain's Fairness Index](#5-telemetry-algorithms--jains-fairness-index)
6. [AI Systems, Prompt Engineering & Privacy Guardrails](#6-ai-systems-prompt-engineering--privacy-guardrails)
7. [Developer REST API Gateway & LMS Integrations](#7-developer-rest-api-gateway--lms-integrations)
8. [Real-time UX, PWA & Frontend Engineering](#8-real-time-ux-pwa--frontend-engineering)
9. [Hard Senior Engineering & Scaling Questions](#9-hard-senior-engineering--scaling-questions)
10. [Interview Quick-Reference Cheat Sheet](#10-interview-quick-reference-cheat-sheet)

---

## 1. Core Pitch & System Architecture

### Q1: "Can you give me a 2-minute elevator pitch of ContriTrack?"
**Answer:**
> "ContriTrack is a full-stack, AI-powered academic collaboration and telemetry platform designed to solve the *'free-rider problem'* and subjective grading in university capstone and engineering teams.
> 
> Traditional project managers (Trello, Jira) only track *what was planned*, not *who actually built it*. ContriTrack connects directly to GitHub repositories to ingest live commits, line changes, and PR activity, combining it with an in-app Kanban sprint board. It runs a mathematical load-balancing algorithm called **Jain's Fairness Index** to objectively measure contribution parity.
> 
> Furthermore, it integrates **OpenRouter AI** for automated agile coaching and burnout detection, provides an institutional **Academic Hubs Observatory** for faculty grading, and exposes a **Developer REST API** with cryptographic SHA-256 tokens for LMS (Canvas/Blackboard) CSV exports."

---

### Q2: "Walk me through the high-level architecture of ContriTrack."
**Answer:**
> "ContriTrack is architected as a modern **Next.js 15 Full-Stack Monorepo** leveraging the App Router:
> 
> 1. **Client Tier**: React 19 Server & Client Components styled with Tailwind CSS, Framer Motion for cinematic micro-interactions, and Lucide icons.
> 2. **Application & API Tier**: Next.js Server Actions for type-safe database mutations and Next.js Route Handlers (`/api/developer/...`) serving REST endpoints.
> 3. **Data Tier**: Supabase-managed **PostgreSQL** accessed through **Prisma ORM** across 20 relational tables, with PostgreSQL Row-Level Security (RLS) enforcing multi-tenant isolation.
> 4. **Identity Tier**: **Firebase Authentication** on the client with **Firebase Admin SDK** verifying JWT session claims on server actions.
> 5. **External Cloud Services**:
>    - **GitHub REST API (Octokit)** for commit/telemetry ingestion.
>    - **OpenRouter API** for LLM sprint coaching and stress evaluations.
>    - **Nodemailer SMTP** for transactional 2FA OTPs and workspace invitations.
>    - **Sentry** for full-stack error telemetry."

```mermaid
graph TD
    Client["Browser Client / PWA (React 19 + Framer Motion)"] -->|Server Actions / REST| NextServer["Next.js 15 App Router Server"]
    NextServer -->|Prisma ORM (ACID)| Postgres[("Supabase PostgreSQL (20 Tables + RLS)")]
    NextServer -->|JWT Claims Verification| FirebaseAuth["Firebase Admin SDK"]
    NextServer -->|Telemetry Ingestion| GitHubAPI["GitHub REST API (Octokit)"]
    NextServer -->|Agile Coaching & Burnout| OpenRouter["OpenRouter AI Engine"]
    NextServer -->|2FA OTPs & Invites| SMTP["Nodemailer SMTP Gateway"]
```

---

## 2. Tech Stack Decisions & Justifications (The "Why")

### Q3: "Why did you use Next.js 15 App Router instead of a separate React frontend + Express/FastAPI backend?"
**Answer:**
> "I chose a unified **Next.js 15 App Router** architecture for several critical engineering reasons:
> 1. **Type-Safe End-to-End RPC with Server Actions**: Instead of writing manual Express controllers, boilerplate DTOs, and client `fetch` wrappers, Server Actions (`src/app/actions/`) execute directly on the server with automatic TypeScript type inference.
> 2. **Zero-Bundle Database Queries (RSC)**: React Server Components query Prisma directly on the server without sending database client libraries or large JSON payloads to the browser, dramatically decreasing First Contentful Paint (FCP).
> 3. **Unified Deployment & Edge Routing**: Hosting a single Next.js full-stack app on Vercel eliminates CORS configuration issues, reduces deployment complexity, and leverages edge route handlers for dynamic Open Graph image generation (`@vercel/og`).
> 4. **Built-in Security Boundaries**: Secrets like `OPENROUTER_API_KEY`, `FIREBASE_PRIVATE_KEY`, and `DATABASE_URL` are strictly isolated from the client bundle by design."

---

### Q4: "Why PostgreSQL and Prisma ORM over MongoDB/Mongoose or raw SQL?"
**Answer:**
> "Academic collaboration is inherently **relational and structured**:
> - Workspaces have Members, Members have Roles, Workspaces have Tasks, Tasks have Comments and Activities, and GitHub Repositories have Commits and Contribution Metrics.
> - **Why PostgreSQL**: It provides ACID transactional integrity (crucial for task assignments and 20-table cascade account wipes) and native Row-Level Security (RLS).
> - **Why Prisma ORM**: It gives compile-time type safety across our 20 models, automated migrations (`prisma db push`), and protects against SQL injection through parameterized queries.
> - *Why not MongoDB*: Unstructured document stores struggle with multi-table relational joins, data consistency across team rosters, and relational cascade deletes."

---

### Q5: "Why did you choose OpenRouter over direct OpenAI or self-hosted LLMs?"
**Answer:**
> "1. **Model Flexibility & Zero Vendor Lock-in**: OpenRouter provides a unified OpenAI-compatible API gateway that allows us to switch dynamically between high-performance models (Google Gemma 4, Claude, Llama 3) with zero code changes.
> 2. **Cost & Rate Limit Optimization**: It automatically handles fallback routing if a specific model provider experiences downtime or rate limits.
> 3. **Data Privacy**: OpenRouter allows strict configuration to prevent prompts from being used for public model training."

---

## 3. Database & Data Modeling (PostgreSQL, Prisma, RLS)

### Q6: "How did you design the database schema, and how are multi-tenancy and data isolation handled?"
**Answer:**
> "The database consists of **20 relational tables** organized into 5 functional clusters:
> 1. **Identity & Auth**: `User`, `UserProfile`, `UserSecurity`, `UserActivity`, `UserBackup`, `OTPSession`.
> 2. **Workspace & Multi-Tenancy**: `Workspace`, `WorkspaceMember` (with roles: `OWNER`, `MAINTAINER`, `CONTRIBUTOR`, `GUEST`), `ApiKey`.
> 3. **Sprint & Deliverables**: `Task`, `TaskActivity`, `TaskComment`, `Meeting`.
> 4. **Telemetry & AI**: `GitHubRepository`, `Commit`, `ContributionMetric`, `UserContributionAnalytics`, `BurnoutSignal`, `AIInsight`.
> 5. **Engagement & Communications**: `Notification`, `NotificationReply`, `CareerApplication`.
> 
> **Multi-Tenancy Isolation**:
> - Every workspace entity has a foreign key `workspaceId`.
> - Server actions verify that the authenticated user's `userId` exists in `WorkspaceMember` for that `workspaceId` before executing any query or mutation.
> - At the database layer, PostgreSQL Row-Level Security (RLS) policies assert that `workspaceId = current_setting('request.jwt.claim.workspaceId', true)`."

---

### Q7: "How does the 20-table forensic cascade deletion work?"
**Answer:**
> "In `src/app/actions/admin-actions.ts` (`deleteUserAccountAdmin`), we implemented a GDPR-compliant *'Right to be Forgotten'* forensic deletion engine:
> 1. It executes an atomic Prisma `$transaction` that systematically deletes dependent records across all 20 tables in topological order:
>    - First: Notification replies, comments, task activities, and commit telemetry.
>    - Second: Tasks, meetings, API keys, AI insights, and burnout signals.
>    - Third: Workspace memberships, user backups, and OTP sessions.
>    - Fourth: If the user is the sole owner of a workspace, the workspace itself and its linked repositories are deleted.
>    - Finally: `UserProfile` and `User` records are removed.
> 2. Simultaneously, it calls the **Firebase Admin SDK** (`adminAuth.deleteUser(uid)`) to permanently destroy the authentication identity.
> 3. This guarantees **0% orphan records** and zero lingering traces in production."

---

## 4. Authentication, Authorization & API Security

### Q8: "How does authentication work between the Client, Server Actions, and Firebase?"
**Answer:**
> "We implement a hybrid **Firebase Client + Firebase Admin SDK** pattern:
> 1. **Client-side**: The user logs in via Google OAuth, GitHub OAuth, or Email/Password via Firebase Client SDK in `src/context/AuthContext.tsx`.
> 2. **Session Token**: On successful login, Firebase issues a signed JWT ID token.
> 3. **Server Verification**: When a Next.js Server Action is invoked, it retrieves the user's session token and verifies the signature using `firebase-admin`'s `verifyIdToken(token)`.
> 4. **User Sync**: If it's a first-time login, the server automatically provisions a synchronized record in our PostgreSQL `User` and `UserProfile` tables."

---

### Q9: "How does your Developer REST API token authentication work, and why do you hash API keys with SHA-256?"
**Answer:**
> "In `src/lib/validate-api-key.ts`:
> 1. **Key Generation**: When a developer generates an API key, we create a high-entropy string prefixed with `ct_live_` followed by 48 random hex characters (`crypto.randomBytes(24).toString('hex')`).
> 2. **Cryptographic Storage**: We **NEVER** store the plaintext key in the database. Instead, we compute its salted **SHA-256 hash** (`crypto.createHash('sha256').update(rawKey).digest('hex')`) and store only `hashedKey` in PostgreSQL.
> 3. **Verification**: When an API request comes in with `Authorization: Bearer ct_live_...`:
>    - We hash the incoming token with SHA-256 and query Prisma for `ApiKey.findUnique({ where: { hashedKey } })`.
>    - We verify that the key is not revoked, check if `expiresAt > new Date()`, and assert that the key possesses the required scope (`read`, `write`, `admin`).
> 4. **Why SHA-256?**: If our database were ever compromised, an attacker would only obtain irreversible hashes, making it mathematically impossible to impersonate users or use their API tokens."

---

## 5. Telemetry Algorithms & Jain's Fairness Index

### Q10: "What is Jain's Fairness Index, why did you choose it over Average or Standard Deviation, and how is it implemented?"
**Answer:**
> "In network engineering and distributed resource allocation, **Jain's Fairness Index** is the gold standard for measuring resource distribution fairness among $n$ users.
> 
> **The Formula**:
> $$\mathcal{J}(x_1, x_2, \dots, x_n) = \frac{\left( \sum_{i=1}^n x_i \right)^2}{n \sum_{i=1}^n x_i^2}$$
> 
> **Why it is superior to Average or Standard Deviation**:
> 1. **Bounded between $\frac{1}{n}$ and $1.0$**: If 1 person does 100% of the work in a 4-person team, the index evaluates to $\frac{1}{4} = 0.25$ (25% fairness). If all 4 contribute equally, it evaluates to $1.0$ (100% fairness).
> 2. **Scale-Independent**: Whether a team made 10 commits or 1,000 commits, the index accurately reflects proportion rather than raw volume.
> 3. **Continuous & Intuitive**: A single outlier significantly penalizes the score, alerting professors immediately to *'free-riders'* or *'overloaded lone-wolf developers'*.
> 
> **Implementation in ContriTrack**:
> We compute a normalized multi-factor contribution score $x_i$ for each team member:
> $$x_i = w_1 \cdot \text{Commits}_i + w_2 \cdot (\text{Additions}_i + \text{Deletions}_i) + w_3 \cdot \text{CompletedTasks}_i$$
> and feed this vector into our fairness calculator to render real-time charts."

---

## 6. AI Systems, Prompt Engineering & Privacy Guardrails

### Q11: "How does ContriTrack generate AI insights without hallucinating or leaking student code?"
**Answer:**
> "In `src/app/actions/ai-actions.ts`:
> 1. **Structured Telemetry Aggregation**: Before calling OpenRouter, our server aggregates raw statistical facts: total tasks, overdue tasks, sprint velocity, commit counts per member, and late-night activity timestamps.
> 2. **System Prompt Engineering**: We prompt the LLM as an expert Agile Scrum Coach with strict JSON schema instructions:
>    ```json
>    {
>      "healthScore": 85,
>      "burnoutRisk": "low" | "medium" | "high",
>      "insights": [{ "type": "free_rider" | "burnout" | "velocity", "message": "..." }],
>      "recommendations": ["..."]
>    }
>    ```
> 3. **Privacy & Security Guardrails**:
>    - **Zero Code Ingestion**: We **never** send raw source code, repository file contents, or student credentials to the LLM. Only anonymized numerical telemetry and task titles are transmitted.
>    - **JSON Schema Validation**: Server-side fallback parsing ensures that if the LLM output is malformed, the system falls back to mathematical heuristic scoring without crashing."

---

## 7. Developer REST API Gateway & LMS Integrations

### Q12: "How does your Rate Limiter work on the Developer API?"
**Answer:**
> "In `src/lib/validate-api-key.ts`:
> - We implement an **In-Memory Sliding Window Rate Limiter** keyed by the token's `hashedKey`.
> - Each token has an allowance of **60 requests per 60-second window**.
> - When a request arrives:
>   - We filter timestamps older than `now - 60,000ms`.
>   - If the count exceeds 60, we reject with HTTP `429 Too Many Requests` and set `Retry-After: 60` and `X-RateLimit-Remaining: 0` headers.
>   - Otherwise, we record the timestamp, decrement the remaining counter, and allow the request through."

---

### Q13: "How does the LMS Grading CSV & PDF export work?"
**Answer:**
> 1. **CSV Export (`/api/developer/reports/export-csv`)**:
>    - Aggregates each member's total commits, lines added, lines deleted, tasks completed, overdue tasks, and normalized contribution percentage.
>    - Streams a formatted CSV file with `Content-Type: text/csv` and `Content-Disposition: attachment; filename=contritrack-grading-report.csv`, formatted for direct import into **Canvas LMS**, **Blackboard**, or Excel.
> 2. **PDF Certificate (`/api/developer/reports/generate-pdf`)**:
>    - Generates a cryptographically signed contribution certificate summarizing the sprint metrics, fairness rating, and verification timestamps."

---

## 8. Real-time UX, PWA & Frontend Engineering

### Q14: "Why did you use 10-second polling for notifications instead of WebSockets, and how is it optimized?"
**Answer:**
> "This was a deliberate architectural trade-off:
> 1. **Serverless Compatibility**: Next.js deployed on Vercel runs on stateless serverless functions. Persistent WebSocket connections require dedicated stateful server infrastructure (like a Redis Pub/Sub cluster or standalone Node WebSocket server).
> 2. **Silent Light-Weight Polling**: Our 10-second notification poller queries indexed columns (`where: { userId, read: false }`) returning tiny payloads (<1KB).
> 3. **Tab Inactivity Throttling**: The poller pauses automatically when `document.hidden` is true, eliminating unnecessary database load when the user is not viewing the tab.
> 4. **Future Path**: For instant push alerts, we implemented Web Push (VAPID) so users receive notifications even when the app is closed."

---

### Q15: "How did you solve the PWA deployment caching issue?"
**Answer:**
> "In Progressive Web Apps, a Service Worker using `Cache-First` or `Stale-While-Revalidate` can trap users on an old version of the app because it serves cached HTML and JS chunks indefinitely.
> 
> **How we fixed it in `public/sw.js`**:
> 1. **Network-First for Navigations & JS**: All page navigations (`mode === 'navigate'`) and `/_next/static/` chunks are fetched **Network-First**, falling back to cache only when completely offline.
> 2. **Auto-Purge Obsolete Caches**: On service worker `activate`, it iterates over `caches.keys()` and deletes any cache that does not match the active `CACHE_VERSION`.
> 3. **Instant Activation**: Calls `self.skipWaiting()` and `self.clients.claim()` so new deployments take effect immediately.
> 4. **React 19 `useSyncExternalStore` in `src/components/OfflineBanner.tsx`**: Subscribes cleanly to `navigator.onLine` without hydration mismatches or false-alarm offline banners."

---

## 9. Hard Senior Engineering & Scaling Questions

### Q16: "If ContriTrack scaled to 100,000 active workspaces tomorrow, what would break first and how would you scale it?"
**Answer:**
> "Here is an honest scalability analysis:
> 
> 1. **Database Connection Exhaustion**:
>    - *Bottleneck*: Serverless functions spinning up concurrently would overwhelm PostgreSQL connection limits.
>    - *Solution*: Use **Prisma Accelerate** or Supabase **PgBouncer** connection pooling in transaction mode to multiplex thousands of serverless queries over a fixed pool of 50–100 database connections.
> 
> 2. **GitHub API Rate Limits (5,000 req/hr per token)**:
>    - *Bottleneck*: Polling hundreds of thousands of repositories would exhaust GitHub OAuth rate limits.
>    - *Solution*: Transition from *polling* to **GitHub Webhooks** (`/api/webhooks/github`). GitHub pushes commit events directly to our webhook receiver, reducing outbound API calls by 95%.
> 
> 3. **In-Memory Rate Limiter on Multi-Instance Deployments**:
>    - *Bottleneck*: In-memory rate limiting is local to a single serverless instance.
>    - *Solution*: Move the rate limiter state to **Upstash Redis** using a sliding-window Lua script (`@upstash/ratelimit`).
> 
> 4. **Heavy Jain's Fairness Calculations on Large Repos**:
>    - *Bottleneck*: Calculating metrics on repos with 50,000+ commits on every page load would degrade response time.
>    - *Solution*: Implement materialized analytical snapshots (`ContributionSummary`) updated asynchronously via background cron jobs (`/api/cron/...`), allowing dashboard reads to execute in <10ms."

---

### Q17: "What was the most challenging bug you encountered while building ContriTrack and how did you debug it?"
**Answer:**
> "One of the most nuanced challenges was **PWA hydration and Service Worker cache collision**:
> - **The Problem**: Users on production were seeing outdated UI states unless they performed a hard refresh (`Ctrl + Shift + R`), and after hard refreshing, an erroneous *'You are offline. Changes are saved locally'* banner would flash on screen.
> - **Investigation**:
>   - Inspecting Chrome DevTools Application tab revealed that the service worker was intercepting navigation routes with `Cache-First` logic and serving stale JavaScript bundles.
>   - Concurrently, `OfflineBanner.tsx` was evaluating `!navigator.onLine` during initial component render before hydration settled, causing React 19 hydration mismatch warnings.
> - **The Resolution**:
>   - Rewrote `public/sw.js` to a strict **Network-First** strategy with automated cache-busting.
>   - Refactored `OfflineBanner.tsx` to use React 19's **`useSyncExternalStore`**, eliminating hydration race conditions and delivering seamless zero-refresh deployments."

---

### Q18: "What are the key takeaways you learned from building this project?"
**Answer:**
> "1. **Architecture Over Hype**: Choosing the right abstraction (Next.js Server Actions + Prisma over separate REST backends) saved hundreds of hours of boilerplate while boosting type safety.
> 2. **Security by Default**: Building SHA-256 hashed API keys and 20-table forensic cascade erasures taught me how to engineer for real-world GDPR privacy rather than treating security as an afterthought.
> 3. **Mathematical Grounding**: Real software products need objective metrics (like Jain's Fairness Index) rather than naive averages to deliver actionable value to users."

---

## 10. Interview Quick-Reference Cheat Sheet

| Domain | Key Concept / Tool | How It Works in ContriTrack |
| :--- | :--- | :--- |
| **Framework** | Next.js 15 App Router | Server Actions for mutations, React Server Components for zero-JS data reads |
| **Database** | PostgreSQL + Prisma ORM | 20 relational models, ACID transactions, Row-Level Security (RLS) |
| **Data Deletion** | 20-Table Forensic Cascade | Atomic `$transaction` purge across 20 tables + Firebase Admin auth deletion |
| **Auth** | Firebase Auth + Admin SDK | Client JWT issuance with server-side `verifyIdToken` claim validation |
| **API Security** | SHA-256 Token Hashing | `ct_live_...` tokens hashed before DB storage, scoped RBAC (`read`, `write`, `admin`) |
| **Rate Limiting** | Sliding Window Token Bucket | 60 requests/minute per key with HTTP 429 and `Retry-After` headers |
| **Fairness Math** | Jain's Fairness Index | $\mathcal{J} = \frac{(\sum x_i)^2}{n \sum x_i^2}$, scale-independent parity rating ($0.0 - 1.0$) |
| **AI Intelligence**| OpenRouter API | Structured JSON sprint coaching, burnout detection, zero code ingestion |
| **LMS Integration**| Canvas / Blackboard Export | Streaming CSV generator (`/api/developer/reports/export-csv`) |
| **PWA & Offline** | Network-First Service Worker | Fresh deployment delivery, cache auto-purge, React 19 `useSyncExternalStore` |
