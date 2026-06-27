# ContriTrack Ultimate Interview Handbook: Component Diagram (Part A)

---

## 1. Diagram Purpose

*   **What this diagram shows:** The logical separation of modules within the application. It breaks down the monolith into 4 distinct layers: Presentation (UI), Server Actions (Controllers), Core Services (Business Logic), and Data Access (Prisma).
*   **Why it exists:** To demonstrate modularity. It proves that the codebase isn't a tangled mess of spaghetti code where SQL queries are mixed directly inside React buttons.
*   **Software Engineering Principles:**
    *   **Single Responsibility Principle (SRP):** The UI only renders; the Service only fetches; the Engine only calculates.
    *   **Dependency Inversion / Layered Architecture:** Upper layers (UI) depend on lower layers (Services), never the reverse.
    *   **Colocation:** Keeping related logic tightly grouped but physically separated by concern.
*   **When interviewers ask about it:** When they ask "How is your codebase organized?", "How do you separate business logic from UI?", or "If you had to swap PostgreSQL for MongoDB, what breaks?"

---

## 2. Complete Flow (Every Box & Arrow)

### Boxes (The Layers)

1.  **Presentation Layer (Client/Server Components - `/src/components`):**
    *   *What it does:* Renders the visual DOM. Examples: `DashboardPanel.tsx`, `TeamTracker.tsx`.
    *   *Why it exists:* To provide interactivity to the user.
    *   *Technologies:* React 18, TailwindCSS.
2.  **Controller Layer (Next.js Server Actions - `/src/actions`):**
    *   *What it does:* Acts as the API endpoint. Validates incoming form data, checks authentication, and delegates work. Examples: `syncRepositoryAction()`, `generateInsightAction()`.
    *   *Why it exists:* To bridge the gap between the secure backend and the public frontend without writing REST boilerplate.
    *   *Technologies:* Next.js `"use server"`.
3.  **Core Services Layer (Business Logic - `/src/lib`):**
    *   *What it does:* The heavy lifting. Examples: `github-service.ts` (talks to Octokit), `analytics-engine.ts` (does the math), `crypto.ts` (encrypts data).
    *   *Why it exists:* To keep business logic entirely independent of Next.js HTTP contexts so it can be unit-tested or reused in cron jobs.
    *   *Technologies:* Pure TypeScript, Octokit, standard Math algorithms.
4.  **Data Access Layer (`/prisma`):**
    *   *What it does:* Abstracted database communication.
    *   *Why it exists:* Prevents SQL injection and provides TypeScript models.
    *   *Technologies:* Prisma Client.

### Arrows (Data Movement)

*   **UI Component -> Server Action:** A user clicks a button in `DashboardPanel`. React serializes the arguments and makes a hidden HTTP POST request to the Server Action.
*   **Server Action -> Core Service:** The action strips the HTTP context, takes the raw data (e.g., `workspaceId`), and calls a pure TS function in `github-service.ts`.
*   **Core Service -> Analytics Engine:** After fetching 1,000 commits, `github-service` passes the array to `analytics-engine.ts` in-memory.
*   **Core Service -> Prisma:** The processed data is sent to Prisma to be wrapped in a `$transaction`.
*   *(Return Flow):* Data trickles back up the chain. The Server Action returns the final JSON to the UI component.

---

## 3. Technology Deep Dive

### Next.js Server Actions vs REST APIs
*   *Why chosen:* It eliminates the need to manually write `fetch('/api/sync')`, maintain DTOs (Data Transfer Objects), and handle CORS. You just import a server function into a client component.
*   *Alternatives:* Traditional REST endpoints (`/api/...`) or GraphQL.
*   *Trade-offs:* Server Actions are deeply tied to the Next.js framework. You cannot easily expose them to a third-party mobile app like a standard REST API.
*   *Advantages:* End-to-end type safety without generating Swagger docs.
*   *Disadvantages:* Debugging network payloads is harder because Next.js encodes the RPC payload in a proprietary text format.
*   *Real-world usage:* Heavily used by startups optimizing for Time-to-Market.
*   *Bottleneck:* Large payloads. Returning a 50MB array of commits directly from a Server Action will crash the Vercel function's memory limit.

---

## 4. Internal Working

"If you join my team, here's how you build a feature. Let's say you're adding 'Pull Request Tracking'. You do NOT put the GitHub API call in the React component. 

First, you go to the Data Access Layer (Prisma) and add the `PullRequest` model. Second, you go to the Core Services layer and add a function in `github-service.ts` to fetch PRs via Octokit. Third, you write a Server Action in `prActions.ts` that checks if the user is logged in, and then calls your service. Finally, you go to the Presentation Layer and build `PullRequestPanel.tsx` that calls your Server Action. We strictly enforce this boundary so our core logic remains pure and testable."

---

## 5. Design Decisions

*   **Why strict layer separation?** If I put the GitHub Octokit call inside the Server Action, and later I want to trigger a sync via a Cron Job (which isn't a Server Action), I would have to duplicate the code. By putting it in `src/lib`, the cron job and the server action can share the exact same pure function.
*   **Why not a shared Microservice for Math?** Separating `analytics-engine.ts` into a Python microservice would require maintaining two repositories, a gRPC/REST bridge, and duplicating the Prisma schema types in Python. A monolithic structure is faster to iterate on.
*   **Why Prisma as the Data Access Layer?** TypeORM relies on decorators and reflection, which are slow. Knex requires manual type writing. Prisma auto-generates types from the schema.

---

## 6. Scalability

*   **10 users:** The `analytics-engine.ts` runs synchronously in the Node execution thread without issue.
*   **100 users:** CPU bound tasks start slowing down response times.
*   **1,000 users:** We extract `analytics-engine.ts` into a standalone Node Worker Thread (`worker_threads` API) so it stops blocking the main Vercel event loop.
*   **10,000 users:** We add **Redis**. We wrap the output of the Data Access Layer in a cache check. If `Redis.get(dashboard_data)` exists, we return it instantly, bypassing Prisma.
*   **100,000 users:** We break the monolith. We physically rip `analytics-engine.ts` out of the codebase, rewrite it in Go for maximum CPU efficiency, and communicate with it via **gRPC**.
*   **1 million users:** We introduce **CQRS (Command Query Responsibility Segregation)**. The Server Actions for *writing* (Commands) hit a master Postgres DB. The Server Actions for *reading* (Queries) hit dedicated Read-Replicas, entirely decoupling the workload.

---

## 7. Failure Handling

*   **Database Failure:** Prisma throws a `PrismaClientInitializationError`. The Server Action catches this and returns a normalized error object `{ error: "Database unreachable" }` rather than leaking the stack trace to the frontend.
*   **Service Layer Failure (GitHub down):** `github-service.ts` wraps Octokit in a try/catch. It uses an exponential backoff retry mechanism (retrying 3 times: 1s, 2s, 4s). If it fails, it returns a graceful fallback.
*   **Presentation Failure:** We wrap `DashboardPanel.tsx` in a React `<ErrorBoundary>`. If the Server Action returns malformed data that breaks the UI, the Error Boundary catches it and displays a friendly "Something went wrong" UI instead of a white screen of death.

---

## 8. Security

*   **API Security:** The Presentation layer cannot be trusted. Even if we hide the "Delete Workspace" button in the UI, an attacker can invoke the Server Action manually via cURL. Therefore, the Server Action *must* validate authorization independently.
*   **Input Validation:** We use `Zod` in the Server Action layer. Before data reaches the Core Services, Zod verifies that `workspaceId` is a valid UUID, preventing NoSQL/SQL injection attacks masquerading as strings.
*   **Secrets:** `crypto.ts` in the Service layer is the ONLY component allowed to access the raw AES decryption key from `process.env`. The UI never sees the key.

---

## 9. Performance

*   **Bundle Size:** Because of React Server Components, the heavy libraries (Octokit, Prisma, Crypto) in our Service layer are never shipped to the browser. The client JS bundle remains tiny.
*   **Memory Usage:** `github-service.ts` processes commits using JavaScript generator functions (yielding data) instead of loading 100,000 commits into a massive RAM array, preventing Node out-of-memory crashes.
*   **Caching:** We utilize Next.js `unstable_cache` around our Core Service functions, caching the result of expensive mathematical operations at the Edge.

---

## 10. Database

*   **Data Access Abstraction:** The Presentation and Controller layers do *not* know that Postgres exists. If we migrate from Postgres to MySQL, we only change the Data Access Layer (Prisma). The UI and Services remain untouched.
*   **Transactions:** The Service layer orchestrates transactions. It instructs Prisma to save the Commits and the Analytics together in an Atomic `$transaction`.

---

## 11. Interview Questions (100 Questions)

### 20 Easy
1. What is a component in React?
2. What is a Server Action?
3. Why separate the UI from the database?
4. What does the `src/lib` folder hold?
5. What does Prisma do?
6. Is the analytics engine running on the client or server?
7. What is Octokit?
8. Where do you validate if a user is an Admin?
9. What is Zod used for?
10. What is business logic?
11. Can the UI talk directly to Prisma?
12. Where are API keys stored?
13. What is JSON?
14. What is a frontend?
15. What is a backend?
16. What does CSS do in the presentation layer?
17. What is an Error Boundary?
18. Where do you write SQL?
19. What is modularity?
20. Why do we need layers?

### 20 Medium
21. Explain the Single Responsibility Principle as applied to this diagram.
22. How does data flow from a button click to the database?
23. Why did you separate `actions` from `lib`?
24. How does `crypto.ts` interact with the other layers?
25. Explain how React Server Components reduce client bundle size.
26. How do you handle form validation before hitting the database?
27. What is the difference between a Controller and a Service?
28. How would you unit test `analytics-engine.ts`?
29. Why is exposing database IDs directly to the frontend sometimes bad?
30. How do you prevent a user from calling a Server Action they don't have permission for?
31. What happens if a core service takes 30 seconds to run?
32. Explain Dependency Inversion in this architecture.
33. Why not put business logic inside the Next.js API routes directly?
34. How does Prisma map TypeScript to PostgreSQL?
35. What is data serialization and where does it happen in this flow?
36. How do you handle errors propagating from the DB to the UI?
37. Explain the concept of Colocation in your frontend folder structure.
38. What is the role of DTOs (Data Transfer Objects) and do you use them?
39. How do you implement loading states while a Server Action executes?
40. Why is `Zod` better than manual `if (typeof x === 'string')` checks?

### 20 Hard
41. If you wanted to expose your backend to a native iOS app, what architectural changes must you make?
42. Node.js is single-threaded. How does the Presentation Layer remain responsive while `analytics-engine.ts` crunches data?
43. Walk me through implementing CQRS (Command Query Responsibility Segregation) in this component diagram.
44. How do you share database transaction contexts across multiple distinct services in `src/lib`?
45. Explain how Vercel bundles this folder structure into Edge Functions vs Node Serverless Functions.
46. If you introduce Redis to cache analytics, which exact layer does it belong in and why?
47. How do you prevent Circular Dependencies between your service modules?
48. Design an event emitter pattern inside `src/lib` to decouple the GitHub sync from the AI generation.
49. How do you handle timezone conversions between the Data Access Layer (UTC) and the Presentation Layer (Local)?
50. Walk me through a memory leak occurring in your Service Layer. How do you profile it?
51. Contrast the Repository Pattern with the Active Record pattern. Which does Prisma use?
52. How do you implement Idempotency Keys in your Server Actions?
53. If a Server Action fails halfway through communicating with two external APIs, how do you handle rollbacks?
54. Design a plugin architecture for `analytics-engine.ts` to allow third-party developers to add custom metrics.
55. How do you enforce layer boundaries mathematically in CI/CD? (e.g., stopping UI from importing Prisma).
56. Explain how you would implement DataLoader to fix N+1 query problems in your Service Layer.
57. How do you manage dependency injection for mocking Octokit in your unit tests?
58. What is the performance difference between passing data to Client Components via props vs React Context?
59. Walk me through the security implications of React Server Components passing secrets to Client Components.
60. Design a distributed locking mechanism in your Service Layer to prevent concurrent repo syncs.

### 20 Senior
61. Critique the decision to use Next.js Server Actions over an API Gateway mapping to Lambda microservices.
62. How would you redesign this component diagram to support a multi-tenant SaaS with custom subdomains per client?
63. Walk me through migrating this monolithic codebase into a Turborepo workspace. Where do you split the packages?
64. How do you implement tracing (OpenTelemetry) across these layers so a single request ID links the UI click to the DB query?
65. If we need to process 10,000 webhooks a second, how does the Component Diagram change to support Event-Driven architecture?
66. Defend your testing strategy. Where do you place Unit, Integration, and E2E tests across these layers?
67. How do you architect the Presentation Layer to support offline-first capabilities (PWA) with optimistic UI updates?
68. Design an authorization engine (like Google Zanzibar) to replace simple role checks in your Server Actions.
69. How do you handle schema versioning in your Data Access Layer for mobile app backwards compatibility?
70. Explain how you would implement a BFF (Backend-for-Frontend) per platform (Web, iOS, Android) while reusing `src/lib`.
71. What is the impact of V8 engine cold starts on your heavy `analytics-engine.ts` module?
72. How do you ensure GDPR compliance (Right to be Forgotten) cascades correctly through your Service and DB layers?
73. Design a circuit breaker factory in `src/lib` that wraps all external API calls dynamically.
74. How would you handle continuous deployment if a PR significantly alters the Data Access Layer interfaces?
75. Contrast using an ORM (Prisma) vs writing a custom SQL query builder in a high-performance FinTech app.
76. How do you prevent "prop drilling" and "context hell" in your Presentation Layer as the app scales?
77. Walk me through moving the `analytics-engine.ts` into a WebAssembly (Wasm) module. Why would you do it?
78. How do you manage long-polling or Server-Sent Events (SSE) across Serverless boundaries?
79. Design an infrastructure-as-code (Terraform) layout that maps to these codebase components.
80. If your company is acquired, how do you architect an integration layer to merge your services with the parent company's legacy SOAP APIs?

### 20 Staff Engineer
81. Assume the core service logic now requires machine learning inference. Architect the transition to a hybrid Node/Python backend utilizing gRPC.
82. You must enforce zero-trust security between your internal layers. Design a mutual TLS (mTLS) strategy between the UI and Services.
83. How do you architect a global cache hierarchy (Edge, Region, In-Memory, DB) mapped to these specific components?
84. Design a Strangler Fig pattern to slowly migrate this Next.js monolith into 5 distinct Go microservices with zero downtime.
85. The Analytics Engine is taking 4 hours for enterprise clients. Architect a distributed MapReduce job using Apache Spark to replace it.
86. How do you standardize and enforce Domain-Driven Design (DDD) bounded contexts across a 100-person engineering team working in this repo?
87. Walk me through designing an Abstract Syntax Tree (AST) linter that automatically fails the build if someone violates your layered architecture.
88. Architect a real-time collaborative dashboard (like Figma) requiring CRDTs (Conflict-free Replicated Data Types) in the Presentation layer.
89. How do you structure an incident response playbook specifically targeting bottlenecks in the Data Access Layer during Black Friday?
90. Design a multi-region active-active deployment where the Presentation Layer routes to the nearest edge, but the Service Layer routes to the nearest writable DB shard.
91. Propose a technical strategy for open-sourcing the `analytics-engine.ts` while keeping the proprietary UI and Data Access layers private.
92. How do you manage API backwards compatibility for 5 years without breaking existing clients?
93. Architect a federated GraphQL gateway to stitch this Next.js app's data with an external HR system's data.
94. Explain the memory architecture of Node.js and how you prevent your Service Layer from causing frequent Garbage Collection pauses.
95. Design a custom Load Shedding algorithm for the Controller Layer to drop low-priority requests when CPU hits 90%.
96. How do you convince the executive board that migrating from Prisma to raw SQL will save $1M annually in compute costs, and how do you execute the migration?
97. Architect a data pipeline that streams every output of the Analytics Engine into a Snowflake Data Warehouse using Debezium CDC.
98. How do you build a Chaos Engineering suite that randomly kills dependencies in `src/lib` to test UI resilience?
99. Explain how you balance standardizing layered architecture patterns vs allowing product squads autonomy to choose their own tech stack.
100. Draw the exact memory allocation and process flow of a single byte of data traversing from the UI layer to the hard disk platter in the DB layer.

---

*(Due to length, Perfect Answers and Follow-Ups for the 100 questions are continued in the subsequent section.)*
