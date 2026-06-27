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

## 11. Interview Questions (100 Questions)

### 20 Easy
1. What is authentication?
2. What is authorization?
3. What is a JWT (JSON Web Token)?
4. What is Firebase?
5. Why don't we store passwords in plain text?
6. What is an HTTP-Only cookie?
7. What does OAuth mean?
8. Where does Middleware run in Next.js?
9. What happens if a session cookie expires?
10. Why do we sync Firebase data to PostgreSQL?
11. What is XSS?
12. What is CSRF?
13. What is a Primary Key?
14. What does the `SameSite` attribute do on a cookie?
15. What is the difference between login and registration?
16. Can JavaScript read an HTTP-Only cookie?
17. What is an Identity Provider (IdP)?
18. Where is the Firebase Admin SDK used?
19. What is a cold start?
20. Why do we use HTTPS?

### 20 Medium
21. Contrast storing JWTs in `localStorage` vs Cookies.
22. Explain the three parts of a JWT (Header, Payload, Signature).
23. How does the Firebase Admin SDK verify a token without asking the Firebase server?
24. What is the difference between a Firebase ID Token and a Session Cookie?
25. Why is Edge Middleware faster than checking auth in a Server Component?
26. How do you handle a user changing their email address in Firebase? How does Postgres know?
27. Explain the `upsert` operation during the Postgres sync phase.
28. What happens if a user revokes GitHub access?
29. How does `SameSite=Strict` prevent CSRF attacks?
30. Walk me through implementing a "Logout" feature securely.
31. How do you pass the authenticated user's ID from Middleware to a Server Action?
32. What is the difference between asymmetric and symmetric encryption in JWTs?
33. Why shouldn't you put a user's Social Security Number in a JWT payload?
34. Explain how you would implement Role-Based Access Control (RBAC) in this flow.
35. What is a Man-in-the-Middle (MitM) attack and how does this architecture prevent it?
36. How do you share an authentication session across multiple subdomains (e.g., `app.domain.com` and `api.domain.com`)?
37. What is JWT revocation and why is it difficult?
38. How do you implement "Remember Me" functionality?
39. Why do we need the Firebase Client SDK if we are verifying tokens on the server?
40. Explain the concept of an OAuth Refresh Token.

### 20 Hard
41. If an attacker steals a user's HTTP-Only session cookie via network sniffing, how do you architect the system to detect and invalidate it?
42. Walk me through mitigating a timing attack on the JWT signature verification algorithm.
43. How do you implement global session revocation (forcing logout on all devices) when using stateless JWTs?
44. Design a secure flow for a user to link a secondary OAuth provider (Google) to their existing GitHub-authenticated account without creating two Postgres users.
45. Node's `crypto` module blocks the event loop. How does verifying 1,000 JWTs concurrently impact your Next.js server performance?
46. Explain the exact mechanism by which Vercel Edge Middleware intercepts the request before it hits the Node.js origin server.
47. If the Postgres `upsert` fails due to a unique constraint violation on the email address, how do you handle the race condition?
48. Architect a Magic Link (passwordless) authentication flow that integrates with this Firebase-Postgres architecture.
49. How do you handle clock skew (NTP drift) between the Firebase issuing server and your Next.js verification server causing `TokenExpiredError`?
50. Design a distributed brute-force protection system at the API Gateway level to protect the `/api/login` route.
51. Contrast the implicit grant flow with the authorization code flow in OAuth 2.0. Which does Firebase use?
52. How do you implement Multi-Factor Authentication (MFA) step-up challenges within Next.js Middleware?
53. Explain how you would rotate the Firebase Service Account private key with zero downtime to active sessions.
54. Walk me through the security implications of using `jwt.decode()` versus `jwt.verify()` in your Server Actions.
55. Design a mechanism to cache Firebase public JWKS (JSON Web Key Sets) in Redis to avoid network calls during token verification.
56. How do you securely handle OAuth callbacks if the Next.js server is behind a reverse proxy that strips HTTPS headers?
57. Explain how you would implement token sliding expiration (extending the session automatically as the user interacts).
58. What are the performance implications of making Prisma database calls inside Next.js Middleware on the Edge?
59. How do you test the Edge Middleware authentication logic in a local Jest environment?
60. Architect an SSO (Single Sign-On) integration using SAML 2.0 alongside Firebase Auth.

### 20 Senior
61. Critique the decision to use Firebase instead of a self-hosted identity provider like Keycloak or Ory Kratos.
62. How would you redesign this authentication flow to support a multi-tenant B2B SaaS architecture where tenants use their own Okta/Azure AD?
63. Walk me through a post-mortem: An NPM dependency was compromised and injected a script that reads all cookies. How do you prove the HTTP-Only cookies were not exfiltrated?
64. How do you architect an audit logging system that immutably records every login attempt, MFA challenge, and token revocation for SOC2 compliance?
65. If a user deletes their account, how do you guarantee that their session is instantly invalidated across 50 globally distributed Edge nodes?
66. Design a zero-trust architecture where the internal Microservices do not trust the API Gateway and re-verify the JWT on every internal hop.
67. How do you handle authentication during Server-Side Rendering (SSR) without causing Next.js to opt-out of static caching (hydration mismatches)?
68. Explain how you would migrate 1 million users from Auth0 to Firebase with zero password resets and zero downtime.
69. How do you securely pass authentication state from the Next.js web application to a native React Native mobile app?
70. Design a rate-limiting architecture using Redis Cell (Generic Cell Rate Algorithm) to protect the Firebase verification endpoint.
71. What is the impact of quantum computing on the RSA-256 algorithm used in JWT signatures, and how do we prepare this architecture?
72. How do you securely manage Bot/Service Account authentication (machine-to-machine) in this architecture?
73. Critique the use of JWTs for sessions. When would a stateful, opaque session token stored in Redis be architecturally superior?
74. How do you enforce strict device fingerprinting (tying a session to a specific MAC/Hardware ID) in a browser environment?
75. Design a custom WebCrypto API implementation at the Edge to handle JWT verification without relying on external NPM packages.
76. How do you handle OAuth state parameter validation to prevent CSRF attacks during the GitHub redirect phase?
77. Walk me through the exact memory allocation and Garbage Collection process of storing a 2KB session object in a Node.js global map versus Redis.
78. How do you architect a "Login as User" impersonation feature for super-admins without compromising the audit logs?
79. Explain how eBPF can be used to trace the latency of the Firebase Admin SDK network calls at the Linux kernel level.
80. Design a federated identity architecture spanning multiple independent Next.js applications deployed across different cloud providers.

### 20 Staff Engineer
81. Assume the company is mandated to move entirely off Google Cloud. Architect a 6-month migration plan to rip out Firebase Auth and replace it with an in-house Identity Provider, handling active sessions smoothly.
82. You must design a system that ingests 100,000 logins per second. Architect the ingestion, load balancing, and token generation pipeline using Rust and ScyllaDB.
83. How do you design a biometric authentication flow (WebAuthn/Passkeys) that entirely eliminates passwords and OAuth from this diagram?
84. Walk me through the mathematical proof and implementation of Zero-Knowledge Proofs (ZKP) to authenticate users without the server ever knowing their password hash.
85. How do you orchestrate a red-team penetration testing exercise specifically targeting the Next.js Server Action authentication boundaries?
86. Design a globally distributed, synchronously replicated session state database spanning AWS, GCP, and Azure to survive a multi-cloud outage.
87. How do you convince the C-Suite to invest $500k in migrating from JWTs to Macaroons (caveat-based authorization tokens) to support decentralized microservice delegation?
88. Architect an anomaly detection engine using unsupervised machine learning to identify and block credential stuffing attacks in real-time.
89. How do you enforce authentication standards (like mandatory MFA) across a 1,000-person engineering organization deploying 200 distinct microservices?
90. Design a protocol to securely share authentication context between a Next.js webview embedded inside a native desktop application (Electron/Tauri).
91. Explain how you would implement token binding (DPoP - Demonstrating Proof-of-Possession) to cryptographically bind a JWT to a specific TLS connection, defeating all token theft.
92. Architect a highly available OAuth 2.0 Authorization Server from scratch, including the PKCE (Proof Key for Code Exchange) flow for SPAs.
93. How do you handle data sovereignty laws where German users' authentication data MUST physically reside and be processed in Germany, while US users are processed in AWS us-east-1?
94. Design a custom cryptographic key management service (KMS) utilizing Hardware Security Modules (HSMs) to sign our session cookies.
95. How do you architect an event-sourced identity system where every change to a user's permissions is an immutable event, allowing point-in-time querying of their authorization state?
96. Walk me through debugging a sporadic 502 Bad Gateway error occurring only during the Firebase JWT verification phase under high load, using kernel-level tracing.
97. Design a decentralized identity architecture using DID (Decentralized Identifiers) and Verifiable Credentials on a blockchain to replace Firebase.
98. How do you build a culture of security-first design, ensuring that product managers prioritize authentication resilience over shipping feature velocity?
99. Architect a system that allows third-party developers to securely register OAuth applications and request scoped access to your users' data (like GitHub Apps).
100. Draw the authentication architecture of this system 10 years from now, factoring in the widespread adoption of continuous behavioral authentication and brain-computer interfaces.

---

*(Due to length, Perfect Answers and Follow-Ups for the 100 questions are continued in the subsequent section.)*
