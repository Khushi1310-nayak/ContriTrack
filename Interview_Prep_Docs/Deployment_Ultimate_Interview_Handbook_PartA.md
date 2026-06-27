# ContriTrack Ultimate Interview Handbook: Deployment Architecture (Part A)

---

## 1. Diagram Purpose

*   **What this diagram shows:** The physical infrastructure where the code actually runs. It maps how a user's HTTP request travels from their browser, through the global Edge Network, into the Serverless compute layer, and finally to the Cloud Database.
*   **Why it exists:** To prove you understand Cloud Infrastructure. You didn't just build a "localhost" app; you architected a system capable of scaling globally from day one using modern Serverless paradigms.
*   **Software Engineering Principles:**
    *   **Serverless:** Abstracting away OS patching, scaling, and server maintenance.
    *   **Edge Computing:** Pushing code and static assets as physically close to the user's geographic location as possible to reduce latency.
    *   **Decoupled State:** The compute layer (Vercel) is entirely stateless. All state is strictly managed by the Database (Supabase), allowing the compute layer to scale to infinity.
*   **When interviewers ask about it:** When they ask "How did you host this?", "Explain Serverless vs Containers," or "How would you handle a sudden 100x spike in traffic?"

---

## 2. Complete Flow (Every Box & Arrow)

### Boxes

1.  **Client (Browser):**
    *   *What it does:* Initiates the DNS lookup and sends the HTTP request.
2.  **Vercel Edge Network (CDN & Middleware):**
    *   *What it does:* The global perimeter (Cloudflare/AWS CloudFront under the hood). It caches static assets (images, CSS, JS). Crucially, it also executes V8 Isolates (Edge Middleware) for instant JWT Auth verification.
3.  **Vercel Serverless Functions (Backend):**
    *   *What it does:* The heavy lifter (AWS Lambda under the hood). Spins up ephemeral Node.js environments to run Server Actions, connect to the database, and return dynamic JSON.
4.  **PgBouncer (Connection Pooler):**
    *   *What it does:* Sits in front of Postgres. It intercepts thousands of incoming database connection attempts from Serverless functions and multiplexes them down into a small, manageable number of persistent connections.
5.  **Supabase / PostgreSQL (Cloud Database):**
    *   *What it does:* The persistent, stateful data layer hosted on AWS.

### Arrows (Data Movement)

*   **Client -> Edge Network:** HTTPS request is routed via Anycast DNS to the geographically closest Vercel Edge Node (e.g., if user is in Tokyo, it hits a server in Tokyo, not Virginia).
*   **Edge (Static Cache Hit) -> Client:** If requesting an image, the Edge instantly returns it (latency: ~20ms).
*   **Edge Middleware -> Serverless Function:** If requesting dynamic data (API), the Edge verifies the JWT. If valid, it forwards the request to the regional Serverless Function (usually us-east-1).
*   **Serverless Function -> PgBouncer:** The Node.js code initializes Prisma and connects to the database via IPv4. PgBouncer intercepts it.
*   **PgBouncer -> Postgres:** PgBouncer borrows an existing persistent TCP connection to execute the SQL query, preventing Postgres from crashing due to connection overload.

---

## 3. Technology Deep Dive

### Vercel (Serverless / Edge)
*   *Why chosen:* Zero-configuration Next.js hosting. It automatically splits my monolith into static files, Edge functions, and Node.js Serverless functions during the build phase.
*   *Alternatives:* AWS (EC2/EKS/Lambda), Heroku (Dynos), DigitalOcean (Droplets), Render.
*   *Trade-offs:* Vercel abstracts the infrastructure, which means you cannot SSH into the server to debug memory limits or tweak OS-level TCP settings. It is also significantly more expensive per compute-second than raw AWS EC2.
*   *Advantages:* Instant, infinite auto-scaling. Zero DevOps maintenance. Global CDN out-of-the-box.
*   *Disadvantages:* Cold Starts (the 1-2 second delay when a Serverless function boots up after being idle). 15-to-60 second maximum execution timeouts.
*   *Real-world usage:* Under Armour, Notion, OpenAI (ChatGPT frontend).

### Supabase (Managed Postgres)
*   *Why chosen:* It's "Firebase but with SQL." Provides a fully managed PostgreSQL database with built-in connection pooling (PgBouncer), which is mathematically required for Serverless architectures.

---

## 4. Internal Working

"If you type ContriTrack.com in your browser in London, DNS routes you to a Vercel Edge node in London. If you're just loading the homepage, that London node hands you the HTML/CSS instantly. 

If you click 'Generate Insight', your request still hits the London node. Our Edge Middleware runs there—it's a tiny V8 engine, not a full Node server, so it boots in 0ms. It checks your JWT. Assuming you are logged in, the London node forwards your request across the ocean to our core Serverless Region in Virginia (us-east-1), where our database lives.

Vercel spins up a Node.js Lambda function. This function uses Prisma to talk to Supabase. But it doesn't talk directly to Postgres. It hits PgBouncer first. Because Serverless can spin up 1,000 parallel functions in a second, Postgres would crash trying to open 1,000 TCP connections. PgBouncer queues those requests and funnels them through 50 persistent connections. Once the data is retrieved, the Lambda dies, and the JSON is returned to your browser in London."

---

## 5. Design Decisions

*   **Why Serverless instead of Docker/Kubernetes?** Kubernetes requires hiring DevOps engineers to manage nodes, pods, auto-scaling rules, and cluster upgrades. For a startup or independent project, managing Kubernetes is a distraction from building product features. Serverless lets me focus 100% on business logic while Vercel handles the scaling.
*   **Why a "Serverless Monolith"?** In Next.js, the frontend and backend are in the same repository. During deployment, Vercel splits every API route into its own independent Serverless function. I get the developer experience of a Monolith (shared Typescript interfaces), but the deployment resilience of Microservices (if the Analytics API crashes, the Auth API is completely unaffected).
*   **Why deploy Compute in a single region (us-east-1)?** While the CDN is global, the Database is physically located in Virginia. If I deployed Serverless functions globally (e.g., in Tokyo), a Tokyo function would have to do the TCP handshake with Virginia across the Pacific Ocean, adding 200ms of latency *per database query*. Compute must always be physically colocated with the Database.

---

## 6. Scalability

*   **10 users:** Serverless functions sleep most of the day. We pay almost $0.
*   **1,000 users:** Vercel automatically spins up multiple concurrent Lambda functions to handle traffic. Cold starts become less frequent because the functions are kept "warm" by constant traffic.
*   **10,000 users:** The database connection pool becomes the bottleneck. We must increase PgBouncer's `max_client_conn` limit. We also implement aggressive HTTP caching (`stale-while-revalidate`) at the Edge Network so the Serverless functions aren't even invoked for non-mutating requests.
*   **100,000 users:** Postgres CPU hits 90%. We introduce **Read Replicas**. Write operations (Inserts) go to the Primary DB. Read operations (Analytics) are routed to the Replicas.
*   **1 million users:** Vercel's enterprise pricing becomes prohibitive. We containerize the Next.js app using Docker, deploy to AWS EKS (Kubernetes), and configure Horizontal Pod Autoscalers to handle traffic. We replace Supabase with highly sharded Amazon Aurora Postgres clusters.

---

## 7. Failure Handling

*   **Serverless Cold Start / Timeout:** If a Serverless function takes >15 seconds (e.g., calling Gemini), Vercel brutally kills it and returns a 504 Gateway Timeout. *Handling:* We must move long-running tasks to an asynchronous Background Queue (like Upstash QStash) rather than blocking the HTTP request.
*   **Database Outage (Supabase Down):** *Handling:* Vercel Edge Network continues to serve static HTML and cached API responses gracefully. We show a "Maintenance Mode" banner instead of crashing the React app.
*   **Vercel Outage (DNS/CDN Down):** *Handling:* We use Route53 (AWS) for our base DNS. If Vercel fails health checks, Route53 automatically routes traffic to a static S3 bucket displaying a "We are currently experiencing downtime" page.

---

## 8. Security (Deployment Level)

*   **DDoS Protection:** Vercel's Edge Network inherently absorbs massive volumetric DDoS attacks. An attacker sending 100 Gbps of junk traffic hits Cloudflare/AWS Edge nodes, which sinkhole the traffic before it ever wakes up our Serverless billing meters.
*   **VPC Peering (Lack thereof):** The biggest security flaw in standard Vercel. Vercel Serverless functions live on the public internet. Supabase must be open to the public internet to receive connections. We secure this using complex IP Allow-listing, but ideally, in an Enterprise architecture, Compute and DB would live inside the same private, isolated VPC (Virtual Private Cloud).

---

## 9. Performance

*   **The Cold Start Problem:** When a Serverless function hasn't been used in 15 minutes, AWS reclaims the RAM. The next user to request it has to wait ~1-2 seconds for Node.js to boot up, parse the AST, and load Prisma. *Mitigation:* We use Edge Middleware to instantly return cached data while the backend warms up, or we pay Vercel for "Edge Functions" (V8 Isolates) which have 0ms cold starts.
*   **Static Site Generation (SSG):** Next.js compiles as many pages as possible into static HTML at build time. When a user requests `/about`, Vercel serves it in 15ms directly from the CDN RAM, bypassing Node.js entirely.
*   **Connection Pooling (PgBouncer):** A standard Postgres instance can only handle ~100 direct connections. Serverless can spawn 1,000 concurrent functions. Without PgBouncer, 900 users would get "Connection Refused" errors. PgBouncer holds the 100 real connections and rapidly cycles them between the 1,000 Serverless functions.

---

## 10. Database (Deployment Context)

*   **Supabase Architecture:** Under the hood, Supabase is an AWS EC2 instance running Ubuntu. It runs a Docker container for PostgreSQL, a container for PgBouncer, and a container for PostgREST (though we use Prisma instead of PostgREST).
*   **Backups:** Supabase handles automated Point-In-Time Recovery (PITR) backups via WAL (Write-Ahead Logging) archiving to AWS S3, allowing us to restore the database to any specific second in the last 7 days.

---
