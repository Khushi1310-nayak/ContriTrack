# ContriTrack Ultimate Interview Handbook: Component Diagram (Part B)

---

## 12. Perfect Answers & 13. Follow-Up Questions (Selected Core Questions)

*(Note: To maximize interview impact, these are the 25 most frequently tested concepts from the 100 questions. Mastering these ensures you can extrapolate answers to the rest.)*

### Easy / Medium Tier

**Q21. Explain the Single Responsibility Principle as applied to this diagram.**
*   **Perfect Answer:** "SRP means a module should have one, and only one, reason to change. In our architecture, the React component's only job is to render UI. The Server Action's only job is to handle the HTTP context and authorization. The Service layer's only job is business logic. If GitHub changes its API, I only edit `github-service.ts`. The UI and Controller layers remain untouched."
*   **Follow-Up:** "What happens if you break SRP and put the API call in the React component?" -> *Answer:* "The component becomes untestable, tightly coupled to the network, and exposes secrets (like API keys) directly to the user's browser, leading to a massive security breach."

**Q23. Why did you separate `actions` from `lib`?**
*   **Perfect Answer:** "Server Actions are bound to Next.js HTTP contexts. They deal with `FormData`, cookies, and headers. By decoupling the core business logic into pure TypeScript functions in `src/lib`, I can reuse that exact same logic in a background worker, a cron job, or a test suite without needing to mock Next.js server requests."
*   **Follow-Up:** "How do you pass data between them?" -> *Answer:* "The Server Action extracts the necessary primitives (like `string` UUIDs) from the HTTP request, validates them with Zod, and passes them as arguments to the pure functions in `lib`."

**Q25. Explain how React Server Components reduce client bundle size.**
*   **Perfect Answer:** "Historically, if I used a heavy library like `moment.js` or `octokit` in React, it was sent to the user's browser, bloating the JS payload and slowing down First Contentful Paint. React Server Components render entirely on the server. The heavy libraries stay on the server, and only the final, lightweight HTML/JSON representation is sent to the client."
*   **Follow-Up:** "Can a Server Component have `onClick` handlers?" -> *Answer:* "No. Server Components cannot hold state or interactivity. If you need an `onClick`, you must use a 'Client Component' by adding the `"use client"` directive at the top of the file."

**Q32. Explain Dependency Inversion in this architecture.**
*   **Perfect Answer:** "Dependency Inversion states that high-level modules (UI) should not depend on low-level modules (DB), but both should depend on abstractions. Here, the Server Action doesn't care that we use PostgreSQL. It just calls `analyticsEngine.run()`. The analytics engine doesn't care about Postgres; it just uses the Prisma abstraction. We could swap the DB entirely and the higher layers wouldn't know."
*   **Follow-Up:** "How would you mock the DB in tests?" -> *Answer:* "I would use Dependency Injection (DI) to pass a mock Prisma client into the service functions, allowing me to unit test the math logic without hitting a real database."

### Hard / Senior Tier

**Q42. Node.js is single-threaded. How does the Presentation Layer remain responsive while `analytics-engine.ts` crunches data?**
*   **Perfect Answer:** "Because we are in a Serverless environment (Vercel), the Node runtime executing the UI rendering is physically separate from the Node instance executing the heavy math. Furthermore, by using React Suspense (`<Suspense fallback={<Spinner/>}>`) and streaming, the Next.js server instantly streams the initial UI shell to the client. The browser remains fully responsive while it waits for the Server Action to stream the final data chunk down the open HTTP connection."
*   **Follow-Up:** "What if the math takes 2 minutes?" -> *Answer:* "Vercel will timeout the request after 60 seconds. We would need to implement an asynchronous pattern: the client requests a job, the server returns a `jobId`, and the client polls or uses WebSockets to check completion."

**Q53. If a Server Action fails halfway through communicating with two external APIs, how do you handle rollbacks?**
*   **Perfect Answer:** "Since external APIs don't share our Postgres database transaction context, we must use the Saga Pattern. If API A succeeds but API B fails, I cannot issue an SQL `ROLLBACK` to undo API A. Instead, my `catch` block must explicitly invoke a 'compensating transaction'—a specific API call to Service A to delete or undo the action it just performed, returning the system to a consistent state."
*   **Follow-Up:** "What if the server crashes before sending the compensating transaction?" -> *Answer:* "That leaves the system in an inconsistent state. To fix this, we must transition to an event-driven architecture using Kafka, where an orchestrator guarantees eventual consistency via retries."

**Q63. Walk me through migrating this monolithic codebase into a Turborepo workspace. Where do you split the packages?**
*   **Perfect Answer:** "I would extract the layers into separate NPM packages within the monorepo. I'd create `@contritrack/ui` (React components, Storybook), `@contritrack/database` (Prisma schema and generated client), and `@contritrack/core` (the `lib` business logic). The Next.js app becomes a thin orchestration layer that imports these packages. This allows aggressive build caching—if I change the UI, Turborepo doesn't rebuild the database client."
*   **Follow-Up:** "How does this prevent circular dependencies?" -> *Answer:* "Package managers enforce strict acyclic dependency graphs. If `@contritrack/core` tries to import `@contritrack/ui`, `npm install` or `pnpm` will throw a circular dependency error, enforcing architectural boundaries natively."

**Q72. How do you ensure GDPR compliance (Right to be Forgotten) cascades correctly through your Service and DB layers?**
*   **Perfect Answer:** "In the Data Access Layer, I configure Prisma with `onDelete: Cascade` foreign keys. If the `deleteUser` Server Action removes a user row, the DB automatically cascades the deletion to their OAuth tokens, Workspaces, and AI Insights. In the Service Layer, I must also dispatch an event to trigger account deletion API calls to third parties (like Firebase Auth and Stripe) to ensure their data is scrubbed globally."
*   **Follow-Up:** "What about data in backups?" -> *Answer:* "You cannot easily edit immutable backups. Standard GDPR compliance practice involves maintaining an encrypted 'Delete List'. When restoring a backup, the script consults the Delete List and instantly purges those users before the system goes live."

### Staff Engineer Tier

**Q84. Design a Strangler Fig pattern to slowly migrate this Next.js monolith into 5 distinct Go microservices with zero downtime.**
*   **Perfect Answer:** "The Strangler Fig pattern replaces legacy systems incrementally. First, I put an API Gateway (like Nginx or AWS API Gateway) in front of the Next.js app. Next, I rewrite a single domain, like `github-service.ts`, into a standalone Go microservice. I update the API Gateway routing rules to forward `/api/sync` requests to the new Go service, while all other traffic still hits Next.js. We monitor for errors. Once stable, we strangle the next domain (e.g., Auth), until Next.js is purely a thin UI layer."
*   **Follow-Up:** "How do the Go service and Next.js share the Postgres database during the transition?" -> *Answer:* "Initially, they share it (Integration Database pattern). However, this is an anti-pattern long-term. As we split the services, we must split the database into bounded contexts, using event streaming (Kafka/Debezium) to sync data between the Next.js DB and the Go DB."

**Q87. Walk me through designing an Abstract Syntax Tree (AST) linter that automatically fails the build if someone violates your layered architecture.**
*   **Perfect Answer:** "I would write a custom ESLint plugin using `babel-eslint` to parse the AST. The rule would analyze all `ImportDeclaration` nodes. If it detects that a file inside `src/components` is importing from `src/lib/github-service`, or if `src/actions` is importing `prisma`, it throws an error. This codifies our architectural boundaries mathematically in the CI pipeline, preventing junior engineers from bypassing the layers during crunch time."
*   **Follow-Up:** "Why is this better than Code Reviews?" -> *Answer:* "Humans make mistakes and compromise under pressure. Automated architectural fitness functions (like AST linters) provide objective, instant, and scalable enforcement of system design."

---

## 14. Whiteboard Explanation

### 30-Second Pitch
"This diagram shows our separation of concerns. The React Presentation layer renders the UI. When a user interacts, it calls Next.js Server Actions which act as our secure Controller layer. These actions delegate heavy processing to pure TypeScript functions in our Core Services layer. Finally, the services persist data using Prisma in the Data Access layer. This modularity ensures testability and security."

### 2-Minute Explanation
*Draw: [UI] -> [Server Action] -> [Services] -> [Prisma]*
"Let's walk through adding a feature. I don't put database logic in a React button. I start at the bottom. I update the Prisma schema. Then, I write a pure business logic function in the Services layer (like `analytics-engine`). Because it's pure, I can easily unit test it. Next, I write a Next.js Server Action to expose this service securely, validating session cookies and Zod schemas. Finally, the UI calls the Server Action. By strictly enforcing this directional data flow, we prevent spaghetti code and make the system incredibly easy to debug and refactor."

---

## 15. Common Mistakes Candidates Make

1.  **Leaking Abstractions:** Suggesting that you pass raw HTTP Request objects down into the `src/lib` services. Services should only accept pure data (strings, numbers, DTOs).
2.  **Misunderstanding Server Components:** Assuming that because a component is a Server Component, it is automatically secure and can bypass the Server Action layer to talk to the DB directly. (You still need architecture and validation!).
3.  **Over-engineering:** Suggesting Kafka and Microservices for this diagram when a modular monolith is perfectly suited for the current scale.
4.  **Forgetting Transactions:** Not mentioning Prisma `$transaction` when updating multiple tables across different service layers.

---

## 16. Resume Mapping

*   "Architected a strict 4-tier modular monolith (Presentation, Controller, Service, Data), enforcing separation of concerns and eliminating tightly coupled spaghetti code."
*   "Decoupled heavy core business logic from Next.js HTTP contexts, allowing 100% unit-test coverage of the analytics engine using Jest."
*   "Implemented robust API boundary validation using Zod and Next.js Server Actions, preventing malicious payloads from reaching the core database layer."

---

## 17. Storytelling (Natural Delivery)

"Early in the project, I noticed a temptation to just drop Prisma queries directly inside React Server Components because the framework makes it so easy. But I knew that was a trap. It leads to un-testable, tightly coupled code. So I put my foot down and enforced a strict layered architecture. I created a dedicated `src/lib` for pure business logic and forced all UI to go through Server Actions acting as thin controllers. It took a bit more boilerplate upfront, but last month when I needed to write a background script, I just imported the exact same service function. It worked flawlessly. It proved the architecture was right."

---

## 18. Industry Comparison

*   **Google:** Would enforce this structure strictly using Bazel build systems, ensuring that UI packages physically cannot depend on Database packages at compile time.
*   **Microsoft (C#/.NET):** This mirrors the classic N-Tier architecture heavily promoted in .NET Core. They would likely introduce formal interfaces (`IAnalyticsEngine`) and heavy Dependency Injection containers instead of direct ES6 module imports.
*   **Meta (Facebook):** Would replace the Server Actions and Services layer entirely with GraphQL. The UI would specify exactly what data it needs in a fragment, and a distributed GraphQL resolver architecture would fetch it.

---

## 19. Interview Difficulty

*   **Rating:** **Senior Software Engineer (SDE-3)**
*   **Why:** Demonstrating the ability to cleanly separate concerns in a modern meta-framework (like Next.js) where the boundaries between client and server are intentionally blurred is a hallmark of Senior experience. A Mid-Level engineer uses the framework; a Senior engineer imposes architectural discipline *on top* of the framework.

---

## 20. Improvements (Making it Production-Ready)

### Already Implemented in Project
*   Layered separation of concerns (`actions` vs `lib` vs `components`).
*   Prisma abstracted Data Access Layer.
*   Server-side validation boundary.

### Recommended Future Enhancements (To discuss in interview)
1.  **Dependency Injection:** Migrate from direct imports (e.g., `import { calculate } from './analytics'`) to a Dependency Injection container (like InversifyJS or TSyringe) to make unit mocking significantly easier.
2.  **Automated Architectural Tests:** Introduce an AST linter or a tool like `dependency-cruiser` in the CI pipeline to fail the build if a developer accidentally imports Prisma directly into a React component.
3.  **Monorepo Migration:** Split the layers into distinct physical NPM packages using Turborepo (`@app/ui`, `@app/db`, `@app/core`) to enforce boundaries at the package manager level and improve build caching.
