# ContriTrack Ultimate Interview Handbook: API / Server Action Flow (Part B)

---

## 12. Perfect Answers & 13. Follow-Up Questions (Selected Core Questions)

*(Note: To maximize interview impact, these are the 25 most frequently tested concepts from the 100 questions. Mastering these ensures you can extrapolate answers to the rest.)*

### Easy / Medium Tier

**Q22. Explain how an IDOR (Insecure Direct Object Reference) attack works and how this flow prevents it.**
*   **Perfect Answer:** "IDOR happens when a system uses unpredictable or guessable identifiers (like `repoId = 5`) and fails to check if the current user owns that object. An attacker logs in as User A, intercepts their own request, changes the payload to `repoId = 6` (which belongs to User B), and the server blindly executes it. My API flow prevents this explicitly in the 'Authorization Check' box. Even if Zod says `repoId=6` is a valid string, the next line of code queries the database: `Does User A have a WorkspaceMember record linked to the Workspace that owns repoId 6?` Since they don't, the API throws a 403 Forbidden."
*   **Follow-Up:** "Why not just hide the `repoId` from the frontend?" -> *Answer:* "Security by obscurity never works. Any determined attacker can inspect the Network tab or decompile the JS bundle to find the IDs. Security must be enforced on the server."

**Q27. Why do we wrap the final database writes in a Prisma `$transaction`?**
*   **Perfect Answer:** "To guarantee Atomicity (the 'A' in ACID). In the 'Generate Insight' action, I have to do two things: deduct 1 AI credit from the Workspace, and insert the generated text into the `AIInsight` table. If I do these sequentially without a transaction, and the server crashes *after* deducting the credit but *before* inserting the text, the user loses money and gets nothing. By wrapping them in a `$transaction`, Postgres guarantees that if the second query fails, the first query is automatically rolled back, keeping the database in a consistent state."
*   **Follow-Up:** "What happens if you have to call an external API (like Stripe) inside that transaction?" -> *Answer:* "You should never put slow network calls inside a DB transaction because it holds table locks for too long, causing deadlocks. You execute the Stripe call *before* opening the DB transaction."

**Q28. Explain how you would implement idempotency in this Server Action.**
*   **Perfect Answer:** "Idempotency means an API can be called multiple times without changing the result beyond the initial application. If a user clicks 'Generate' on a flaky 3G network, the browser might automatically retry the POST request 3 times. To prevent charging them 3 credits, the client generates a unique `Idempotency-Key` UUID. My Server Action receives this key and checks Redis. If the key exists, I immediately return the cached successful response from the first attempt. If it doesn't, I process the request and store the result in Redis under that key."
*   **Follow-Up:** "How long should the idempotency key live in Redis?" -> *Answer:* "Usually 24 hours. Long enough to handle immediate network retries, but short enough to free up Redis memory."

**Q32. Explain the concept of "Fail Fast" in API design.**
*   **Perfect Answer:** "Fail Fast means rejecting an invalid request as early in the execution path as possible to save compute resources. In my diagram, the Zod validation is the very first box. If a user sends a payload missing the `repoId`, I don't want to wake up the database, check permissions, or spin up external services. Zod instantly throws a 400 Bad Request. It protects the more expensive parts of my infrastructure from garbage data."

### Hard / Senior Tier

**Q42. Walk me through implementing a Circuit Breaker pattern within this API flow for the Gemini integration.**
*   **Perfect Answer:** "If the Gemini AI API goes down, my Server Action will hang for 10 seconds before timing out. If 1,000 users click the button, I will have 1,000 Node.js threads hanging, exhausting my server resources and crashing my app. A Circuit Breaker acts as a fuse. I use a library like `opossum`. If the Gemini API fails 5 times in a row, the breaker 'trips' (opens). For the next 60 seconds, my Server Action doesn't even attempt to call Gemini; it instantly returns a 503 Service Unavailable to the client. After 60 seconds, it enters a 'half-open' state and allows one test request through. If it succeeds, the breaker closes and traffic resumes."
*   **Follow-Up:** "What is the fallback mechanism when the circuit is open?" -> *Answer:* "Instead of throwing an error, we could return a cached AI insight, or a graceful degradation message like 'AI analysis is temporarily paused, but your raw commits are still syncing.'"

**Q50. Walk me through a scenario where Prisma's `$transaction` causes a dead-lock in Postgres. How does your API recover?**
*   **Perfect Answer:** "A deadlock happens when Transaction A locks Row 1 and waits for Row 2, while Transaction B locks Row 2 and waits for Row 1. Postgres detects this and instantly kills one of the transactions, throwing an error (Prisma code `P2034`). In my Server Action, the `catch` block catches this specific error. Because deadlocks are often transient, the best recovery is an automatic retry. I would implement an Exponential Backoff strategy: wait 50ms, then try the transaction again. If it fails 3 times, then I return the 500 error to the user."
*   **Follow-Up:** "How do you prevent deadlocks in the first place?" -> *Answer:* "Always acquire locks in a consistent, deterministic alphabetical order. If all APIs always update Workspace before Repository, a circular wait condition is mathematically impossible."

**Q61. Critique the decision to use Next.js Server Actions. At what scale does this tightly coupled RPC pattern become an architectural anti-pattern?**
*   **Perfect Answer:** "Server Actions are incredible for developer velocity in a monolithic startup because you share TypeScript interfaces directly between the button and the database. However, at Enterprise scale (100+ engineers), it becomes an anti-pattern. You lose the ability to deploy the Frontend and Backend independently. Furthermore, Server Actions are specifically tied to the Next.js React ecosystem. If we want to build a Flutter mobile app, or expose a public API to third-party developers, they cannot easily consume Server Actions. We would be forced to rewrite them as standard REST or GraphQL endpoints."
*   **Follow-Up:** "So how do you decouple them?" -> *Answer:* "The Server Action should be a thin wrapper. It handles Zod and CSRF, but then calls a core generic service class (e.g., `InsightService.generate()`). That same service class can then be imported by a public REST controller."

**Q71. Critique the use of ORMs (Prisma) in high-throughput API controllers. When should you drop down to raw SQL?**
*   **Perfect Answer:** "Prisma provides amazing type safety, but it's notorious for generating inefficient SQL on complex joins (e.g., doing N+1 queries at the application level instead of the database level) and it has a heavy memory footprint due to the Rust query engine bridge. In a high-throughput API (e.g., thousands of requests per second), the ORM overhead becomes the primary bottleneck. For simple CRUD, Prisma is fine. But for massive bulk inserts or complex analytical aggregations, I bypass Prisma and use `prisma.$queryRaw` or a query builder like Kysely to gain exact control over the execution plan and minimize Node.js memory allocation."

### Staff Engineer Tier

**Q81. Assume we are migrating from a REST/RPC model to a decentralized CQRS (Command Query Responsibility Segregation) model. Redesign this entire API flow.**
*   **Perfect Answer:** "Currently, our API flow handles both mutating data (Command) and reading the result (Query) synchronously. In a CQRS architecture, we physically separate them. 
    1. The client sends a Command: `GenerateInsightCommand`. 
    2. The API validates it (Zod/AuthZ) and immediately drops it into a Kafka topic, returning a `202 Accepted` with a Job ID. 
    3. A separate backend worker consumes the Kafka topic, calls Gemini, and updates a highly-optimized 'Write Database'.
    4. An event is emitted that updates a separate 'Read Database' (e.g., ElasticSearch).
    5. The client uses WebSockets or polling (Query) to listen for the finished Job ID. 
    This allows us to scale the Write infrastructure completely independently from the Read infrastructure."
*   **Follow-Up:** "What is the biggest challenge with CQRS?" -> *Answer:* "Eventual Consistency. The client might query the Read database before the event has propagated, seeing stale data. The UI must be designed to handle this asynchronous UX gracefully."

**Q91. Explain how you would implement a distributed Saga pattern to manage complex, multi-service API transactions.**
*   **Perfect Answer:** "If we move to Microservices, we lose the Postgres `$transaction` because the Database is split. A Saga replaces it. When the API triggers 'Generate Insight', it starts a Saga orchestrator. 
    Step 1: Orchestrator calls Billing Service to deduct a credit. (Success).
    Step 2: Orchestrator calls AI Service to generate text. (Fails - Timeout).
    Because we cannot magically roll back Step 1 in a different database, the Orchestrator must execute a *Compensating Transaction*. It sends a specific command to the Billing Service: `Refund Credit`. The Saga ensures that even in a distributed system, we achieve eventual consistency without holding long-lived database locks."

---

## 14. Whiteboard Explanation

### 30-Second Pitch
"This diagram represents the 'Backend Gatekeeper' pattern of our Next.js Server Actions. It illustrates how we enforce strict 'Fail Fast' principles. Raw client input is heavily scrutinized by Zod for schema validity, then checked against the database for IDOR/Authorization vulnerabilities. Only after passing these gates does the core business logic execute, wrapped safely in a database transaction to ensure ACID compliance before responding."

### 2-Minute Explanation
*Draw: [Client] -> [Zod Validation] -> [AuthZ Check]*
"When an API request comes in, the first rule is: Never trust the client. The payload enters Zod. If it's malformed, we bounce it immediately with a 400 error, saving compute. If it passes, we hit the AuthZ layer. We query the DB to ensure `UserId` actually has rights to mutate `RepoId`, preventing IDOR attacks.
*Draw: [AuthZ] -> [Core Logic] -> [DB Transaction]*
Once authorized, we execute the heavy lifting—like calling an external AI service. Crucially, the final step writes to Postgres inside a `$transaction`. If we have to update two tables (like deducting a credit and saving an insight), they must both succeed, or both fail. 
*Draw: [DB] -> [Response]*
Finally, we return a standardized JSON object. If a database error occurred, we catch it and return a masked 500 error, ensuring we never leak stack traces or schema details to the client."

---

## 15. Common Mistakes Candidates Make

1.  **Skipping Authorization:** Assuming that because a user is "logged in" (Authentication), they are allowed to access the data. Failing to mention the specific query that links the user to the requested resource (Authorization).
2.  **Trusting the Client:** Saying "The React form disables the button if the input is wrong, so the API gets good data." Attackers use Postman, not your React form.
3.  **No Transaction:** Explaining a multi-step database update without mentioning transactions, leaving the system open to corrupted state if the server crashes mid-execution.
4.  **Leaking Errors:** Suggesting returning `res.json({ error: error.message })`. This leaks internal database structures to potential hackers.

---

## 16. Resume Mapping

*   "Engineered robust API controllers using Zod for strict runtime schema validation, preventing malformed data and injection attacks."
*   "Implemented comprehensive authorization middleware, effectively neutralizing IDOR (Insecure Direct Object Reference) vulnerabilities at the endpoint level."
*   "Designed atomic API flows utilizing PostgreSQL transactions to guarantee data consistency across complex multi-table mutations."

---

## 17. Storytelling (Natural Delivery)

"When designing the API layer, my main focus was playing defense. I treat every incoming request like it's malicious. I put Zod right at the front door as a bouncer. I had a bug early on where an API would crash halfway through because an external service timed out, leaving the database in a weird half-updated state. That taught me the hard way to wrap everything in a Prisma `$transaction`. Now, the API flow is rock solid: it validates, authorizes, executes safely, and guarantees consistency before it ever returns a 200 OK."

---

## 18. Industry Comparison

*   **Google/Netflix:** They rarely use HTTP/JSON for internal APIs. They use **gRPC** and **Protocol Buffers**. Zod validation wouldn't exist because Protocol Buffers inherently enforce strict types during binary serialization at the network layer, making it vastly faster.
*   **Uber:** Relies heavily on API Gateways. The rate limiting, authentication, and basic validation wouldn't happen in the Node.js controller. It would happen at the Gateway (Kong). The controller only receives perfectly sanitized, pre-authorized requests.
*   **Atlassian:** They have massive public API consumers. They would focus heavily on API Versioning (v1, v2, v3), GraphQL federation, and strict rate-limiting per tenant API token, rather than tightly coupled Server Actions.

---

## 19. Interview Difficulty

*   **Rating:** **Senior Software Engineer (SDE-3)**
*   **Why:** A Junior engineer writes a controller that works on the happy path. A Senior engineer writes a controller that handles the sad paths: transactions, deadlocks, IDOR prevention, input sanitization, and idempotent retries. This handbook focuses purely on the defensive, Senior-level aspects of API design.

---

## 20. Improvements (Making it Production-Ready)

### Already Implemented in Project
*   Zod schema validation.
*   IDOR checks (WorkspaceMember authorization).
*   Prisma database transactions.

### Recommended Future Enhancements (To discuss in interview)
1.  **Idempotency Keys:** Implement Redis-backed idempotency to safely handle network retries from the client without duplicate processing.
2.  **Circuit Breakers:** Add the `opossum` library around external calls (like Gemini/GitHub) to prevent cascading failures if the third-party API goes down.
3.  **Decoupling (Service Layer):** Move the core business logic out of the Next.js Server Action file into a dedicated Service Class so it can be reused by a future public REST API.
