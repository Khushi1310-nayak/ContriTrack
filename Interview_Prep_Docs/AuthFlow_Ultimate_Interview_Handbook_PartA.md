# ContriTrack Ultimate Interview Handbook: Authentication Flow Diagram (Part A)

---

## 1. Diagram Purpose

*   **What this diagram shows:** The exact sequence of events required to verify a user's identity via Firebase, securely establish a persistent session using HTTP-Only cookies, and synchronize that identity into our internal PostgreSQL database.
*   **Why it exists:** Authentication is the most critical security boundary of the application. This diagram proves you understand the difference between *Authentication* (who are you?) and *Authorization* (what can you do?), and how to prevent token theft.
*   **Software Engineering Principles:**
    *   **Delegated Identity:** Offloading password hashing and OAuth handshakes to a specialized provider (Firebase) rather than rolling our own crypto.
    *   **Stateless vs Stateful Sessions:** Using cryptographic JWTs (stateless) to generate secure session cookies (stateful at the browser level).
    *   **Defense in Depth:** Protecting against XSS by moving tokens out of `localStorage` and into HTTP-Only cookies.
*   **When interviewers ask about it:** When they ask "How do users log in?", "Why did you use Firebase instead of NextAuth?", or "How do you protect against XSS and CSRF attacks?"

---

## 2. Complete Flow (Every Box & Arrow)

### Boxes

1.  **React Client (Browser):**
    *   *What it does:* Renders the login button. Uses the Firebase Client SDK.
    *   *Inputs:* User clicks "Login with GitHub".
    *   *Outputs:* Short-lived Firebase JWT (ID Token).
2.  **Firebase Authentication (Identity Provider):**
    *   *What it does:* Handles the OAuth handshake with GitHub/Google. Manages the cryptographic signing of JWTs.
3.  **Next.js API Route / Server Action (Session Minting):**
    *   *What it does:* Receives the JWT from the client, verifies it, and mints a session cookie.
    *   *Technologies:* `firebase-admin` SDK, Node.js.
4.  **Next.js Middleware:**
    *   *What it does:* Runs on the Vercel Edge. Intercepts every page navigation to check if the session cookie exists and is valid before rendering the page.
5.  **PostgreSQL (User Sync):**
    *   *What it does:* Stores our internal `User` record, linking the Firebase `UID` to our domain data (Workspaces, Commits).

### Arrows (Data Movement)

*   **Client -> Firebase:** The Firebase SDK opens a popup. The user authenticates with GitHub.
*   **Firebase -> Client:** Firebase returns a signed JSON Web Token (JWT). *Crucially, we do NOT store this in localStorage.*
*   **Client -> Next.js Server:** The client immediately sends the JWT via a POST request to our `/api/login` route.
*   **Next.js Server -> Firebase Admin:** The server uses the Admin SDK and our private service account key to mathematically verify the JWT signature.
*   **Next.js Server -> Prisma (Postgres):** If valid, the server checks if `User` with this `uid` exists in Postgres. If not, it runs an `INSERT` to create the user.
*   **Next.js Server -> Client:** The server responds with a `Set-Cookie` header. The cookie contains the session token and is marked `HttpOnly`, `Secure`, and `SameSite=Strict`.
*   **Client -> Next.js Middleware (Subsequent Requests):** Every time the user clicks a link, the browser automatically attaches the HTTP-Only cookie. The Edge middleware reads it. If valid, the user proceeds. If not, they are redirected to `/login`.

---

## 3. Technology Deep Dive

### Firebase Authentication vs NextAuth.js
*   *Why chosen:* Firebase provides a complete managed user directory, out-of-the-box email/password flows, and handles password reset emails automatically. NextAuth requires you to bring your own database for these features.
*   *Alternatives:* NextAuth.js, Auth0, Clerk, Supabase Auth.
*   *Trade-offs:* Firebase locks you into the Google Cloud ecosystem. It requires initializing both a Client SDK (heavy JS bundle) and an Admin SDK.
*   *Advantages:* Incredibly secure, highly reliable, generous free tier.
*   *Disadvantages:* The Firebase Client SDK is bloated and impacts First Contentful Paint if loaded on the landing page.
*   *Real-world usage:* Used heavily by startups; Duolingo, The New York Times.
*   *Bottleneck:* Firebase Admin SDK initialization in a Serverless environment can cause a 500ms "Cold Start" delay during the login flow.

---

## 4. Internal Working

"Let's trace a brand new user logging in. They click 'Login with GitHub'. The Firebase SDK takes over, does the OAuth dance, and hands my React code an ID Token. At this point, the user is authenticated *with Firebase*, but my Next.js backend doesn't know who they are yet. 

I take that token and instantly POST it to my Server Action. The Server Action uses `firebase-admin.auth().verifyIdToken()`. This is critical—it ensures the token wasn't forged. Once verified, I extract their email and UID. I use Prisma to `upsert` this user into my PostgreSQL database. Finally, I generate a 5-day session cookie using `firebase-admin.auth().createSessionCookie()` and attach it to the HTTP response as an HTTP-Only cookie. From that moment on, the browser handles the cookie automatically, and my Next.js Edge Middleware acts as a bouncer, checking that cookie on every route change."

---

## 5. Design Decisions

*   **Why HTTP-Only Cookies over `localStorage`?** If I store the JWT in `localStorage`, any malicious JavaScript (XSS) injected into the page via a compromised NPM package can read `localStorage.getItem('token')` and steal the user's session. An HTTP-Only cookie physically cannot be read by JavaScript `document.cookie`. It is immune to token-theft via XSS.
*   **Why Sync Users to Postgres?** Firebase has its own database (Firestore), but my core data (Workspaces, Analytics) lives in Postgres. I cannot easily perform SQL `JOINs` across two different databases. By syncing the Firebase `UID` into a Postgres `User` table, I can easily write queries like `SELECT * FROM Workspaces WHERE userId = 'firebase_123'`.
*   **Why Edge Middleware?** If I check authentication at the page level (React Server Components), the server has to boot up, query the DB, and render the page shell before redirecting the user. Middleware runs at the Edge CDN. If the cookie is missing, the Edge immediately returns a 302 Redirect to `/login` without ever waking up my main Node server, saving massive compute costs.

---

## 6. Scalability

*   **10 users:** The standard Firebase Client -> Admin verification works perfectly.
*   **1,000 users:** Middleware verifies the cookie on *every single page load*. Calling Firebase Admin to verify a cookie takes ~100ms. We cannot afford 100ms latency on every click.
*   **10,000 users:** We change the Middleware. Instead of calling Firebase to verify the cookie via network, we use a lightweight JWT library (`jose`) at the Edge to mathematically verify the token's cryptographic signature locally, reducing latency to 1ms.
*   **100,000 users:** Database writes during login become a bottleneck. We stop doing synchronous Postgres `upserts` on every login. We only write to Postgres on *registration*.
*   **1 million users:** Global latency. We must replicate our session state. If we move away from stateless JWTs to stateful session IDs, we must store the sessions in a globally replicated **Redis cluster (Upstash Global)** so a user logging in from Tokyo gets authenticated by the Tokyo edge node, not Virginia.

---

## 7. Failure Handling

*   **Firebase Outage:** If Google's Auth servers go down, users cannot log in. *Handling:* Since our session cookies last for 5 days, already logged-in users are completely unaffected. Only *new* logins fail. We display a banner from our status page.
*   **Token Expiration:** The session cookie expires. *Handling:* The Middleware detects the expired cookie, deletes it from the request headers, and redirects the user to `/login` with a `?callbackUrl=/dashboard` parameter so they are seamlessly routed back after re-authenticating.
*   **Postgres Sync Failure:** Firebase returns a token, but Prisma fails to insert the user into Postgres. *Handling:* We do not set the session cookie. We throw a 500 error. If we set the cookie without the Postgres record, the user will be logged in but their dashboard queries will crash due to foreign key violations.

---

## 8. Security

*   **XSS (Cross-Site Scripting):** Mitigated perfectly by using `HttpOnly` flags on the session cookie.
*   **CSRF (Cross-Site Request Forgery):** Mitigated by setting the cookie `SameSite=Strict`. This instructs the browser to *never* send the cookie if the request originates from a different domain (e.g., an attacker's website). Additionally, Next.js Server Actions have built-in CSRF origin-checking.
*   **Replay Attacks:** Firebase JWTs contain an `iat` (Issued At) and `exp` (Expiration) timestamp. If an attacker intercepts an old token and tries to use it to mint a session, the `verifyIdToken` function will reject it as expired.
*   **Session Hijacking:** We tie the session cookie generation to the user's IP address and User-Agent. If the cookie is stolen and used from a different country, the middleware flags it as suspicious and forces a re-authentication.

---

## 9. Performance

*   **Edge Rendering:** By verifying authentication in Next.js Middleware, we can still cache the HTML of our dashboard at the Edge. The Edge checks the cookie; if valid, it serves the cached HTML instantly.
*   **JWT vs Database Lookup:** Because our session cookie is a JWT (cryptographically signed JSON), the Middleware does not need to query the Postgres database to know the user's `userId` or `role`. It simply decodes the JWT. This eliminates a massive database bottleneck.
*   **Bundle Bloat:** We dynamically import the Firebase Client SDK (`next/dynamic`) only when the user navigates to `/login`. The landing page remains fast and unbloated.

---

## 10. Database

*   **User Table:**
    *   `id` (UUID, Primary Key)
    *   `firebaseUid` (String, Unique Index)
    *   `email` (String, Unique)
    *   `role` (Enum: USER, ADMIN)
*   **Normalization:** We do *not* store passwords or OAuth access tokens in this table. That is Firebase's responsibility. We only store domain-specific authorization data (like `role`).
*   **Foreign Keys:** The `id` from the `User` table acts as the foreign key in `WorkspaceMember` and `Commits`.

---
