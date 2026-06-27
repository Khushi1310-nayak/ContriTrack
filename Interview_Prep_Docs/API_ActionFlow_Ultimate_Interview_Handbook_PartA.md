# ContriTrack Ultimate Interview Handbook: API / Server Action Flow (Part A)

---

## 1. Diagram Purpose

*   **What this diagram shows:** The exact lifecycle of a single incoming HTTP request (specifically a Next.js Server Action) from the moment it hits the Node.js backend to the moment a response is returned to the client.
*   **Why it exists:** It demonstrates your understanding of the "Backend Gatekeeper" pattern. An API endpoint isn't just about executing code; it's about rigorously validating inputs, enforcing security, handling business logic safely, and returning standardized errors.
*   **Software Engineering Principles:**
    *   **Fail Fast:** Validating schemas and auth *before* touching the database or external APIs.
    *   **Sanitization:** Never trusting client input (using Zod).
    *   **Atomicity:** Using database transactions so a failure halfway through doesn't leave corrupted data.
*   **When interviewers ask about it:** When they ask "How do you secure your API endpoints?", "Walk me through how you handle validation," or "What happens when a database query fails in your controller?"

---

## 2. Complete Flow (Every Box & Arrow)

### Boxes

1.  **Client Payload (Input):**
    *   *What it does:* The raw JSON or `FormData` sent by the React frontend.
2.  **Authentication Check:**
    *   *What it does:* Verifies the user is actually logged in. (Usually handled by Edge Middleware before reaching the Action, but the Action must still extract the `userId`).
3.  **Schema Validation (Zod):**
    *   *What it does:* Checks if the input matches expected types (e.g., `repoId` is a string, not an array of SQL injection commands).
4.  **Authorization Check (Tenant Isolation):**
    *   *What it does:* Verifies the logged-in user actually has permission to access the specific `repoId` requested.
5.  **Core Service Execution:**
    *   *What it does:* The actual business logic (e.g., calling Gemini AI or GitHub Octokit).
6.  **Database Persistence (Prisma):**
    *   *What it does:* Saves the result using a `$transaction`.
7.  **Standardized Response (Output):**
    *   *What it does:* Returns a strictly formatted object (e.g., `{ success: true, data: {...} }` or `{ error: "Message" }`).

### Arrows (Data Movement)

*   **Client -> Zod:** Raw data flows in. Zod parses it. If it fails, the arrow immediately bounces back to the client with a 400 Bad Request equivalent.
*   **Zod -> AuthZ:** Clean, typed data flows to the database to check permissions: `SELECT role FROM WorkspaceMember WHERE userId = X`. If false, bounces back with a 403 Forbidden.
*   **AuthZ -> Core Service:** The authorized request triggers the heavy lifting (API calls/Math).
*   **Core Service -> Prisma:** The processed data is wrapped in a SQL transaction.
*   **Prisma -> Client:** Success or masked error messages flow back to the React component.

---

## 3. Technology Deep Dive

### Zod (Schema Validation)
*   *Why chosen:* TypeScript only exists at compile time. At runtime, a hacker can send `{ "repoId": { "$gt": "" } }`. Zod enforces runtime type safety, perfectly bridging the gap between external input and internal TypeScript types.
*   *Alternatives:* Joi, Yup, manual `typeof` checks.
*   *Trade-offs:* Adds a few milliseconds of runtime overhead to parse the object.
*   *Advantages:* Exceptional developer experience; you define the schema once and extract the TS type automatically (`z.infer<typeof schema>`).
*   *Disadvantages:* Slightly increases the server bundle size.
*   *Real-world usage:* Almost universally adopted in modern tRPC and Next.js stacks.
*   *Bottleneck:* Validating incredibly massive, deeply nested JSON arrays (like 10MB of raw data) synchronously with Zod will block the Node Event Loop.

---

## 4. Internal Working

"Let's trace a user clicking 'Generate AI Insight'. The React client invokes the `generateInsightAction(repoId)`. Next.js serializes this into a hidden POST request. 

The moment it hits my backend, I assume the payload is malicious. I pass it through a Zod schema: `z.object({ repoId: z.string().uuid() })`. If Zod passes, I know it's a safe UUID. Next, I query Prisma: 'Does this user belong to the workspace that owns this repoId?' If yes, I proceed. 

I call the Gemini AI service. Once Gemini returns the text, I open a Prisma `$transaction`. I deduct 1 AI credit from the Workspace, and I insert the Insight into the database. If the insert fails, the credit deduction rolls back automatically. Finally, I return a standardized `{ success: true, data: insight }` object to the UI."

---

## 5. Design Decisions

*   **Why Zod instead of manual checks?** Manual checks (`if (!repoId || typeof repoId !== 'string')`) are error-prone, hard to read, and don't automatically generate TypeScript types. Zod guarantees that if the code executes past the parsing step, the data perfectly matches the interface.
*   **Why Server Actions over REST (`/api/insights`)?** Next.js Server Actions automatically handle CSRF protection via hidden action IDs. They also allow us to call the function directly in React components without writing `fetch` boilerplate or managing headers.
*   **Why mask errors?** If Prisma throws `P2002 Unique Constraint Failed`, we never return that string to the client. It leaks database architecture. We use a try/catch block to swallow Prisma errors and return a generic `{ error: "An unexpected error occurred" }` to prevent information disclosure.

---

## 6. Scalability

*   **10 users:** Simple synchronous Server Actions work flawlessly.
*   **1,000 users:** Database queries during the Authorization phase become repetitive. We must introduce **Caching**. We cache the user's `WorkspaceMember` permissions in Redis for 5 minutes to avoid hitting Postgres on every single API action.
*   **10,000 users:** Users double-clicking buttons causes race conditions (e.g., deducting 2 credits). We must introduce **Idempotency Keys**. The client sends a unique UUID with the request. The server checks Redis: if this UUID was processed in the last 10 seconds, it ignores the second request.
*   **100,000 users:** The Vercel API routes hit concurrency limits. We introduce an **API Gateway** (AWS API Gateway or Kong) in front of Next.js to handle rate limiting and load shedding before it reaches the Node environment.
*   **1 million users:** The monolithic Server Action breaks down. We split the flow. The Server Action only validates the Zod schema and pushes a message to **Kafka**. The actual Core Service execution happens asynchronously in a separate microservice, and the client receives a `202 Accepted` response.

---

## 7. Failure Handling

*   **Zod Failure (400):** If validation fails, we return a structured error detailing exactly which field was wrong (e.g., "repoId must be a UUID").
*   **AuthZ Failure (403):** If the user doesn't own the repo, we return a strict "Forbidden" error and log the attempt to Datadog, as this could indicate an IDOR (Insecure Direct Object Reference) hacking attempt.
*   **External API Failure (502):** If Gemini is down, the `try/catch` catches the timeout. We return `{ error: "AI service temporarily unavailable" }` and do NOT execute the Prisma transaction (saving the user's credit).
*   **Database Transaction Failure (500):** If Postgres deadlocks, Prisma throws. We catch it, roll back, and return a generic 500 error.

---

## 8. Security

*   **IDOR Prevention:** This is the most critical security flaw in APIs. An attacker changes `repoId=1` to `repoId=2` in the network tab. Because our AuthZ step explicitly checks `WorkspaceMember`, the API safely rejects the request, neutralizing the IDOR attack.
*   **SQL Injection:** Prevented by Zod (ensuring data types are correct) and Prisma (parameterizing all SQL queries).
*   **CSRF:** Next.js Server Actions inject a secret token into the request header automatically, comparing it against the server's expected token, rejecting cross-site forgery natively.
*   **Rate Limiting:** We implement Upstash Redis Rate Limiting at the top of the Action (e.g., Max 5 AI requests per minute per `userId`).

---

## 9. Performance

*   **Sequential vs Parallel Await:** A common bottleneck is checking auth, then checking quota, then fetching data sequentially. If they don't depend on each other, we use `Promise.all([checkAuth(), checkQuota()])` to run the queries in parallel, halving the API latency.
*   **Cold Starts:** Since this is a Serverless Action, the first user to hit it after 15 minutes of inactivity suffers a 1-second delay while Vercel boots the Node environment.
*   **Response Payload Size:** We strictly select only the fields needed. We never return `SELECT * FROM User` because it might include password hashes or heavy metadata. We explicitly map the return object to `{ id, name }`.

---

## 10. Database

*   **The Transaction Guarantee:** The API flow relies on Prisma's ACID properties.
    *   **Atomicity:** Both the Credit Deduction and the Insight Insertion succeed, or neither do.
    *   **Consistency:** The database constraints (e.g., credits cannot drop below 0) are enforced.
    *   **Isolation:** If two APIs fire concurrently, Postgres serializes them to prevent race conditions.
    *   **Durability:** Once the API returns `success: true`, the data is permanently written to the Postgres Write-Ahead Log (WAL).

---
