# ContriTrack Ultimate Interview Handbook: CI/CD Pipeline Architecture (Part A)

---

## 1. Diagram Purpose

*   **What this diagram shows:** The automated assembly line that takes code from a developer's laptop and safely deplops it to production. It maps out Continuous Integration (testing/linting) and Continuous Deployment (building/hosting).
*   **Why it exists:** To prove that you don't just "write code," but you understand how to ship it safely. A strong CI/CD pipeline is the backbone of high-velocity engineering teams.
*   **Software Engineering Principles:**
    *   **Automation:** Removing human error from the deployment process.
    *   **Shift-Left Security:** Catching bugs and security flaws (linting/types) *before* they merge into the main branch.
    *   **Immutable Artifacts:** The exact same build artifact is tested and deployed; you don't rebuild between staging and production.
*   **When interviewers ask about it:** When they ask "How do you deploy your code?", "How do you ensure broken code doesn't reach users?", or "Walk me through your release process."

---

## 2. Complete Flow (Every Box & Arrow)

### Boxes

1.  **Developer Laptop (Source):**
    *   *What it does:* The origin of the code change.
    *   *Technologies:* Git, VS Code.
2.  **GitHub (Version Control):**
    *   *What it does:* Hosts the repository and manages Pull Requests (PRs).
3.  **GitHub Actions (Continuous Integration):**
    *   *What it does:* The testing gateway. It runs automated scripts on every PR.
    *   *Internal Workflow:* Runs `npm install`, `npm run lint`, `tsc --noEmit` (type checking), and unit tests.
4.  **Vercel Build Server (Continuous Deployment):**
    *   *What it does:* Compiles the React/Next.js code into optimized static HTML, CSS, JS, and Serverless Edge Functions.
    *   *Internal Workflow:* Runs `prisma generate` (to create the ORM client) and `npm run build`.
5.  **Supabase / PostgreSQL (Database Migration):**
    *   *What it does:* Updates the database schema to match the new code.
    *   *Internal Workflow:* Runs `prisma db push` or `prisma migrate deploy`.
6.  **Vercel Edge Network (Production):**
    *   *What it does:* The final destination. Distributes the built assets globally.

### Arrows (Data Movement)

*   **Laptop -> GitHub:** Developer pushes a commit to a feature branch and opens a PR.
*   **GitHub -> GitHub Actions:** A webhook triggers the CI runner. The runner downloads the code and runs tests. If tests fail, the arrow stops, and the PR is blocked from merging.
*   **GitHub -> Vercel (Preview):** Vercel listens to the PR and instantly spins up an ephemeral "Preview Environment" URL for QA testing.
*   **Merge -> Vercel (Production Build):** Once the PR is merged to `main`, Vercel pulls the `main` branch code and begins the production build.
*   **Vercel Build -> Supabase:** Before the new code goes live, the build script runs Prisma migrations to ensure the database schema is ready for the new code.
*   **Vercel Build -> Edge Network:** The compiled assets are pushed to global CDN nodes. The Vercel router instantly flips traffic to the new deployment (Zero-Downtime).

---

## 3. Technology Deep Dive

### Vercel (Deployment/Hosting)
*   *Why chosen:* First-class support for Next.js. It requires zero configuration to deploy Serverless functions, Edge Middleware, and static assets.
*   *Alternatives:* AWS (EC2/Amplify/Lambda), Heroku, DigitalOcean, Docker/Kubernetes.
*   *Trade-offs:* Vercel abstracts away the infrastructure. You lose the ability to SSH into a Linux box to debug memory leaks.
*   *Advantages:* Blazing fast deployments, automatic Preview URLs for every PR, zero-downtime rollbacks in 1 second.
*   *Disadvantages:* Very expensive at scale. Strict execution timeouts (15s-60s limit on Serverless functions).
*   *Real-world usage:* Under Armour, Notion (marketing sites), HashiCorp.
*   *Bottleneck:* Long-running background tasks (like migrating 10 million database rows) will timeout and crash if run on Vercel's standard build or serverless infrastructure.

---

## 4. Internal Working

"Let me walk you through exactly what happens when I hit 'git push'. 

I push my feature branch to GitHub and open a PR. Instantly, two things happen in parallel. First, GitHub Actions spins up a Ubuntu runner. It installs my dependencies, checks for TypeScript errors, and runs ESLint. If I missed a semicolon or passed a string to a number argument, the Action turns red and GitHub physically blocks the 'Merge' button. Second, Vercel detects the PR and deploys a 'Preview' version of my code to a unique URL so I can test it visually.

Once everything is green, I click Merge. Vercel detects the commit on the `main` branch. It pulls the code, generates the Prisma database client, and runs `next build`. During this phase, it also executes Prisma migrations against the Supabase database. Finally, Vercel uploads the compiled bundles to its global Edge network and swaps the DNS routing. Users instantly get the new version without a single dropped request."

---

## 5. Design Decisions

*   **Why GitHub Actions for CI instead of Vercel?** Vercel *can* run tests during the build, but if a test fails on Vercel, it consumes expensive build minutes. GitHub Actions provides thousands of free minutes and keeps the testing logic close to the source code repo, failing *before* it even reaches the deployment phase.
*   **Why automatic deployments on Merge?** (Continuous Deployment). Some companies require a human to click "Deploy to Prod" (Continuous Delivery). For a startup, CD maximizes velocity. If `main` is broken, we roll back instantly.
*   **Why Prisma Migrations during Build?** If we deploy new code that expects a `createdAt` column, but the database doesn't have it yet, the app will crash. Running `prisma migrate deploy` as a pre-build step ensures the schema is strictly synchronized with the code.

---

## 6. Scalability

*   **1 Developer:** The current flow (Push -> Merge -> Deploy) works perfectly.
*   **10 Developers:** We introduce **Branch Protection Rules**. Nobody can push directly to `main`. PRs require at least 1 code review approval and passing CI checks.
*   **100 Developers:** Build times slow down to 20 minutes because 100 people are merging constantly. We introduce **Monorepo Tooling (Turborepo)** to heavily cache builds. If Team A changes the UI, Team B's API code doesn't get rebuilt.
*   **1,000 Developers (Enterprise):** The "Merge to Main = Deploy" pipeline breaks down because 50 commits merge per hour. We move to a **Release Train** model. Code merges to `main`, but deploys are batched and shipped manually twice a day by a dedicated Release Engineering team.
*   **1 million Users (Infrastructure):** Vercel becomes too expensive. We containerize the application using **Docker**, rewrite the CD pipeline in **GitLab CI or ArgoCD**, and deploy to an **AWS EKS (Kubernetes)** cluster to tightly control compute costs and auto-scaling rules.

---

## 7. Failure Handling

*   **CI Test Failure:** The GitHub PR is blocked. The developer must fix the code and push a new commit to unblock it.
*   **Build Failure (e.g., Syntax Error):** Vercel fails the build. *Crucially, the previous production version remains live.* Vercel never overwrites production with a broken build.
*   **Database Migration Failure:** If Prisma fails to apply a migration (e.g., trying to add a `UNIQUE` constraint to a column with duplicate data), the Vercel build halts. The developer must manually fix the database state.
*   **Production Incident (Bad Code Shipped):** A bug makes it to production. *Handling:* Vercel supports "Instant Rollbacks". We log into Vercel and click "Promote" on the previous successful deployment. Traffic routes back to the old code in under 1 second.

---

## 8. Security

*   **Secret Management:** We NEVER hardcode API keys or Database URLs in the `.env` file in Git. Secrets are securely injected into GitHub Actions via 'GitHub Secrets' and into Vercel via 'Vercel Environment Variables'.
*   **Dependency Scanning:** We use `npm audit` or Dependabot in the CI pipeline. If a package has a known CVE (vulnerability), the pipeline fails and blocks the PR.
*   **Least Privilege:** The GitHub Action runner is only given the exact permissions it needs (e.g., read-only access to the repo). It cannot modify the repository or push to `main`.

---

## 9. Performance

*   **Build Caching:** Vercel heavily caches the `node_modules` and `.next/cache` directories between deployments. If dependencies haven't changed, `npm install` takes 2 seconds instead of 60 seconds.
*   **Docker Image Size:** (If migrating off Vercel). Using multi-stage Docker builds ensures the final production image only contains compiled code and production dependencies, dropping the image size from 1GB to 100MB, vastly speeding up Kubernetes pod boot times.
*   **Parallelization:** In GitHub Actions, we run Linting and Unit Tests as parallel jobs. Instead of waiting 2 minutes for linting and *then* 2 minutes for tests, both finish in 2 minutes total.

---

## 10. Database (Migrations in CI/CD)

*   **Stateful vs Stateless:** Deploying UI code is stateless (you can just replace the files). Deploying a database is stateful (you cannot delete the database and recreate it). 
*   **The Migration Problem:** If PR #1 drops a column, and PR #2 adds a column, the order they merge dictates the database state. 
*   **Solution:** Prisma tracks migration history in a `_prisma_migrations` table. During CI/CD, Prisma checks this table, determines which migration files have not been executed yet, and applies them sequentially.

---
