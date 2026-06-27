# ContriTrack Ultimate Interview Handbook: Monitoring Architecture (Part A)

---

## 1. Diagram Purpose

*   **What this diagram shows:** The observability nervous system of the application. It illustrates how we track errors, measure performance (latency, CPU, memory), and aggregate logs across the Frontend, Edge Middleware, Serverless Backend, and Database.
*   **Why it exists:** "If a tree falls in a forest and no one is around to hear it, does it make a sound?" If production goes down and you have no monitoring, you won't know until users start complaining on Twitter. This diagram proves you understand how to proactively detect and debug issues before they impact customers.
*   **Software Engineering Principles:**
    *   **Observability (The Three Pillars):** Metrics (aggregations), Logs (detailed events), and Traces (request lifecycle tracking).
    *   **SLIs, SLOs, and SLAs:** Using data to define and measure reliability.
    *   **MTTD and MTTR:** Minimizing Mean Time To Detect and Mean Time To Resolve through effective alerting.
*   **When interviewers ask about it:** When they ask "How do you know if your app is healthy?", "Walk me through debugging a production outage," or "What metrics do you actually care about?"

---

## 2. Complete Flow (Every Box & Arrow)

### Boxes

1.  **Vercel / Next.js Client (Frontend):**
    *   *What it does:* Tracks Core Web Vitals (LCP, CLS, FID) and captures unhandled JavaScript exceptions in the browser.
2.  **Next.js Serverless Actions (Backend):**
    *   *What it does:* Emits logs (`console.error`), tracks API latency, and captures unhandled Promise rejections.
3.  **Supabase / PostgreSQL (Database):**
    *   *What it does:* Monitors slow queries, connection pool saturation, and disk I/O.
4.  **Telemetry Aggregator (e.g., Sentry / Datadog / Vercel Analytics):**
    *   *What it does:* The central brain. It ingests thousands of events per second, indexes them, and powers the search/dashboard UI.
5.  **Alerting System (e.g., PagerDuty / Slack):**
    *   *What it does:* Wakes engineers up at 3 AM if the 'Error Rate' exceeds a defined threshold.

### Arrows (Data Movement)

*   **Client -> Sentry:** An asynchronous, non-blocking HTTP POST request sending stack traces when a React component crashes (Error Boundary).
*   **Server -> Datadog/Vercel Analytics:** Next.js automatically instruments the server. When an API completes, it ships a metric (e.g., `Response Time: 200ms`) via a background thread to avoid slowing down the user's response.
*   **DB -> Monitoring Agent:** Supabase exposes `pg_stat_statements`. A background agent pulls these metrics every 10 seconds and ships them to the dashboard.
*   **Aggregator -> PagerDuty:** A webhook fires when a rule is broken (e.g., "If 502 Bad Gateway > 1% for 5 minutes").

---

## 3. Technology Deep Dive

### Sentry (Error Tracking) vs Datadog (APM)
*   *Why chosen:* Sentry is the industry standard for catching unhandled exceptions and providing exact line numbers in minified React code via Source Maps. For performance, Vercel Analytics provides zero-config Web Vitals tracking.
*   *Alternatives:* Datadog, New Relic, OpenTelemetry (DIY), ELK Stack (Elasticsearch, Logstash, Kibana).
*   *Trade-offs:* Datadog provides a "single pane of glass" for everything (logs, traces, metrics) but is astronomically expensive. Sentry is cheaper and better for pure error tracking but lacks deep infrastructure monitoring.
*   *Advantages (Sentry):* Instant Slack alerts with full stack traces. Automatic grouping of identical errors.
*   *Disadvantages:* If you log too much, Sentry bills you heavily. You must aggressively implement sampling.
*   *Real-world usage:* Sentry is used by GitHub, Disney, and Slack.
*   *Bottleneck:* Telemetry overhead. If you configure Sentry to trace 100% of network requests, it will physically slow down your Next.js server due to the CPU overhead of serializing and transmitting the trace data.

---

## 4. Internal Working

"If you join my team, you need to know how we monitor system health. We don't just rely on users emailing support. 

At the frontend, Vercel Web Analytics runs a tiny script that silently measures how long the page takes to load for real users across the globe. If a user's browser throws a JavaScript error, Sentry intercepts it, attaches their browser version and OS, and sends it to us. 

On the backend, our Next.js Server Actions are wrapped in a generic error handler. If Prisma throws a database error, we don't just return a 500 to the user. We `Sentry.captureException(error)`. Sentry groups these errors. If the same error happens 100 times in 5 minutes, Sentry triggers an alert to our Slack `#production-alerts` channel. We can click the Slack link, go to Sentry, see the exact line of code that failed, and see the exact SQL query that caused it, allowing us to deploy a hotfix in minutes."

---

## 5. Design Decisions

*   **Why use a SaaS (Sentry) instead of writing errors to a file?** Writing to a `.log` file doesn't work in Serverless. Vercel functions are ephemeral; they spin up, process the request, and are destroyed. Any file written to the local disk is deleted instantly. Logs must be streamed over the network to a centralized SaaS.
*   **Why sample data?** If we have 1 million users, we don't need to record 1 million successful API traces to know the API is fast. We use dynamic sampling: we record 1% of successful requests (to calculate average latency), but we record 100% of failed requests (because every error is critical).
*   **Why separate Error Tracking (Sentry) from Analytics (Google Analytics/PostHog)?** Sentry is for engineers (stack traces, memory leaks). PostHog is for Product Managers (conversion rates, button clicks). Mixing them muddies the data and ruins alerting.

---

## 6. Scalability

*   **10 users:** The free tier of Sentry and Vercel Analytics handles everything perfectly.
*   **1,000 users:** Sentry starts sending too many Slack notifications. We suffer from **Alert Fatigue**. We must implement Alert Rules (e.g., "Only alert if this error affects more than 10 unique users in 1 hour").
*   **10,000 users:** We exceed Sentry's event quota and get blocked. We implement **Client-Side Sampling**. `Sentry.init({ tracesSampleRate: 0.1 })` ensures we only send 10% of performance data to the server.
*   **100,000 users:** We need Distributed Tracing. We migrate to **OpenTelemetry**. We generate a `TraceID` at the Edge Middleware and pass it through Next.js, Prisma, and Gemini, so we can view the entire lifecycle of a single request across all systems in one waterfall chart.
*   **1 million users:** SaaS monitoring becomes too expensive (Datadog bills can exceed $100k/month). We bring logs in-house. We use **Prometheus** for scraping metrics and **Grafana** for dashboards, hosting them on our own Kubernetes cluster to control costs.

---

## 7. Failure Handling

*   **Monitoring SaaS Outage:** If Sentry goes down, does our app crash? *No.* The Sentry SDK operates asynchronously. If the `fetch` to Sentry fails, it silently swallows the error so the user's experience is completely unaffected.
*   **Log Spam:** A `while(true)` loop accidentally logs an error 10,000 times a second. *Handling:* Sentry SDK has built-in deduplication and rate limiting. It recognizes the error is identical and just increments a counter (`Events: 10,000`) rather than sending 10,000 separate network requests.
*   **Network Failure:** If the user's phone loses 4G right as an error occurs, the Sentry payload fails to send. *Handling:* Advanced SDKs use `IndexedDB` or `localStorage` to cache the error offline and retry sending it the next time the user opens the app.

---

## 8. Security

*   **PII Leakage in Logs:** The most critical security issue in monitoring. If a user submits a form, and we `console.error(payload)`, we just permanently stored their password and credit card in Datadog/Sentry plaintext.
    *   *Handling:* We configure Sentry's Data Scrubbing rules to automatically redact fields named `password`, `token`, `secret`, or strings matching credit card regexes *before* the payload leaves our server.
*   **Source Maps:** To get readable line numbers in Sentry, we must upload our Source Maps. If an attacker gets our Source Maps, they can decompile our entire frontend codebase.
    *   *Handling:* We do *not* host `.map` files on Vercel. We upload them securely via a CI/CD script directly to Sentry's private API and immediately delete them from the build folder.

---

## 9. Performance

*   **The Observer Effect:** Monitoring changes the performance of the system being monitored. Capturing a stack trace in Node.js (`new Error().stack`) is a heavy CPU operation. Doing this thousands of times a second will bottleneck the API.
*   **Next.js Server-Timing:** We use the standard `Server-Timing` HTTP header. Next.js can send lightweight metrics (e.g., `Server-Timing: db;dur=53, api;dur=12`) directly in the HTTP response. The browser's Performance API reads this, requiring zero extra network requests from our backend to a monitoring SaaS.

---

## 10. Database (Monitoring)

*   **What we monitor in Postgres:**
    *   **CPU / RAM utilization:** Is the server melting?
    *   **Connection Limits:** Are Serverless functions exhausting the 100 maximum connections? (We monitor PgBouncer queue times).
    *   **`pg_stat_statements`:** This internal Postgres view tells us exactly which SQL query is taking the longest on average. If `SELECT * FROM Commits` averages 2 seconds, we immediately know we are missing an index.
    *   **Deadlocks:** Monitoring the rate of transaction rollbacks due to concurrent write contention.

---
