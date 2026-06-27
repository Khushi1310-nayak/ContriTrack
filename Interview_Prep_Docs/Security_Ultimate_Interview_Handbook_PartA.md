# ContriTrack Ultimate Interview Handbook: Security Architecture (Part A)

---

## 1. Diagram Purpose

*   **What this diagram shows:** The defense-in-depth strategy of the application. It illustrates the multiple layers of security (Edge, API, Database) that protect user data, prevent malicious inputs, and securely manage third-party API tokens (like GitHub).
*   **Why it exists:** Security is a non-negotiable requirement for any SaaS handling source code analytics. This diagram proves you don't just "build features," but you understand how to protect them from OWASP Top 10 vulnerabilities like XSS, CSRF, IDOR, and SQL Injection.
*   **Software Engineering Principles:**
    *   **Defense in Depth:** If the Edge Firewall fails, the API validation catches it. If the API fails, the Database authorization catches it.
    *   **Principle of Least Privilege:** Components and users only have access to the exact data they need.
    *   **Fail Securely:** If an authentication check crashes, it defaults to denying access (403), never allowing it.
*   **When interviewers ask about it:** When they ask "How do you handle authentication?", "How do you store sensitive API keys?", or "Walk me through securing a Next.js application."

---

## 2. Complete Flow (Every Box & Arrow)

### Boxes

1.  **Client (Browser):**
    *   *What it does:* Manages the user session securely using HTTP-Only, Secure, SameSite cookies.
2.  **Firebase Auth (External IDP):**
    *   *What it does:* Handles the heavy lifting of OAuth 2.0 (Google/GitHub login) and issues JWTs (JSON Web Tokens).
3.  **Next.js Edge Middleware (The Bouncer):**
    *   *What it does:* Intercepts every incoming request globally. Verifies the JWT signature before the request even reaches a Node.js server.
4.  **Zod Validation (The Sanitizer):**
    *   *What it does:* Strictly types and sanitizes all incoming JSON payloads to prevent injection attacks.
5.  **Authorization Layer (AuthZ):**
    *   *What it does:* Checks if the *Authenticated* user actually has permission to view/edit the specific `workspaceId` (Preventing IDOR).
6.  **Crypto Service (AES-256-GCM):**
    *   *What it does:* Encrypts and decrypts sensitive third-party tokens (GitHub PATs) before they hit the database.
7.  **PostgreSQL (Data Store):**
    *   *What it does:* Stores encrypted tokens and application data safely at rest.

### Arrows (Data Movement)

*   **Browser -> Firebase:** User clicks "Login with GitHub". The browser redirects to Firebase, which handles the OAuth dance.
*   **Firebase -> Browser:** Returns a signed JWT. We store this in an `HttpOnly` cookie.
*   **Browser -> Next.js Middleware:** User requests a dashboard route. The cookie is sent automatically. The Middleware cryptographically verifies the JWT signature using Firebase's public keys. If invalid, redirects to `/login`.
*   **Middleware -> Server Action:** The request is passed through.
*   **Server Action -> Zod:** The raw JSON body is passed to Zod. If a string is expected but an object is sent (NoSQL injection attempt), it throws a 400.
*   **Server Action -> AuthZ -> DB:** The server queries the DB: "Is User X a member of Workspace Y?" If no, throws 403 Forbidden.
*   **Server Action -> Crypto Service -> DB:** When a user links a GitHub repo, the Server Action encrypts their GitHub Personal Access Token using a master server secret, and stores the encrypted ciphertext in Postgres.

---

## 3. Technology Deep Dive

### Firebase Auth (JWT) vs Sessions
*   *Why chosen:* Offloads password hashing (bcrypt/scrypt), OAuth integrations, and MFA to a dedicated Google-backed security team. Emits stateless JWTs perfectly suited for Serverless architectures.
*   *Alternatives:* NextAuth.js (Auth.js), Auth0, Supabase Auth, custom Redis-backed Sessions.
*   *Trade-offs:* JWTs cannot be instantly revoked (unless you check a database on every request, defeating the point of statelessness). Sessions are easily revocable but require a centralized Redis cache, causing latency.
*   *Advantages:* Extremely fast Edge verification. No database hit required just to prove a user is logged in.
*   *Disadvantages:* Vendor lock-in. If Firebase goes down, login is down.

### AES-256-GCM (Encryption)
*   *Why chosen:* It provides Authenticated Encryption. Not only does it encrypt the token, but it appends an authentication tag. If an attacker manually flips a bit in the encrypted string in the database, the decryption fails entirely, proving it was tampered with.

---

## 4. Internal Working

"When a user signs in, Firebase issues a JWT. Crucially, I don't store this in `localStorage`, which is fully exposed to XSS (Cross-Site Scripting) attacks if a malicious NPM package is installed. I store it in an `HttpOnly` cookie. 

When they request a protected API, that cookie hits my Next.js Edge Middleware. The Middleware does a lightweight cryptographic math check to ensure the JWT hasn't been tampered with or expired. If it passes, the API handles the request. 

But Authentication isn't enough. I immediately run Authorization. The API checks if the user's ID is explicitly linked to the requested Workspace ID in the database. 

Finally, if they are connecting a GitHub repo, I take their GitHub Token, run it through Node's native `crypto` module using AES-256-GCM and a master key stored in my `.env`, and save the gibberish ciphertext to Postgres. Even if a hacker dumps my entire database, the GitHub tokens are completely useless to them without the master environment variable."

---

## 5. Design Decisions

*   **Why `HttpOnly` Cookies instead of `localStorage`?** `localStorage` is accessible by any JavaScript running on the page. If we have an XSS vulnerability, a hacker can read `localStorage.getItem('token')` and steal the session. `HttpOnly` cookies are invisible to JavaScript. The browser attaches them to network requests automatically, killing token-theft XSS vectors completely.
*   **Why `SameSite=Strict`?** This prevents CSRF (Cross-Site Request Forgery). It ensures the browser *only* sends the session cookie if the request originated from our exact domain, preventing an attacker on `evil.com` from tricking the user's browser into deleting their ContriTrack account.
*   **Why AES encryption for GitHub tokens instead of Hashing (bcrypt)?** We *hash* passwords because we never need to know the original password. We must *encrypt* GitHub tokens because our backend actually needs to decrypt them later to make API calls to GitHub on the user's behalf.

---

## 6. Scalability (Security Implications)

*   **10 users:** A single master encryption key in `.env` is fine.
*   **1,000 users:** We move the master encryption key to a secure managed service like **AWS KMS (Key Management Service) or HashiCorp Vault**.
*   **10,000 users:** Our Edge Middleware gets hit heavily. We implement strict **IP-based Rate Limiting** using Redis (Upstash) at the Edge to prevent brute-force attacks and DDoS.
*   **100,000 users:** We implement **Envelope Encryption**. Instead of one master key, KMS generates a unique Data Encryption Key (DEK) for every single user. This heavily isolates blast radiuses if a key is compromised.
*   **1 million users:** We deploy **WAF (Web Application Firewall)** rules at the CDN level (Cloudflare/Vercel) to block known malicious Botnets, SQL injection signatures, and geo-block suspicious traffic before it even reaches our Middleware.

---

## 7. Failure Handling

*   **Firebase Outage:** If Firebase Auth goes down, users cannot log in. *Handling:* Active sessions (valid JWTs) continue to work because verification is stateless. Only new logins fail.
*   **Master Key Compromise:** If our `ENCRYPTION_SECRET` is leaked. *Handling:* We must run an immediate key rotation script. It decrypts all tokens in the DB using the old key, re-encrypts them with a new key, and updates the `.env`. We also aggressively revoke all existing active sessions.
*   **Brute Force / Credential Stuffing:** An attacker tries 10,000 passwords. *Handling:* Firebase natively handles this by locking the account and requiring a CAPTCHA or email verification after 5 failed attempts.

---

## 8. Security (OWASP Top 10 Mitigations)

*   **SQL Injection:** Mitigated entirely by using Prisma ORM, which automatically parameterizes all queries (`$1, $2`). We *never* use string concatenation for SQL.
*   **XSS (Cross-Site Scripting):** Mitigated by React natively escaping all string variables inside JSX. E.g., `<div>{userInput}</div>` will render a literal `<script>` string, not execute it.
*   **CSRF (Cross-Site Request Forgery):** Mitigated by setting cookies to `SameSite=Lax` or `Strict`, and utilizing Next.js Server Actions which inherently use POST requests with custom anti-CSRF headers.
*   **IDOR (Insecure Direct Object Reference):** Mitigated by our explicit Authorization layer checking the `WorkspaceMember` table on every single data mutation.
*   **Mass Assignment:** Mitigated by strict Zod schemas that explicitly define which fields are allowed to be updated, stripping out unexpected fields (like `isAdmin: true`).

---

## 9. Performance

*   **JWT Verification:** Verifying a JWT signature is a CPU-bound cryptographic operation. However, doing this at the Edge (Vercel Edge Middleware) using V8 Isolates takes less than 2 milliseconds, making it vastly faster than a Redis session lookup.
*   **Encryption Overhead:** AES-256-GCM is hardware-accelerated on modern CPUs. Encrypting a 40-character GitHub token takes microseconds and has virtually zero impact on API latency.
*   **AuthZ Caching:** Querying the database to check if a user has access to a workspace on every request adds 20ms of latency. We can optimize this by caching the user's role mapping in Redis for 5 minutes.

---

## 10. Database (Security Context)

*   **Encryption at Rest:** Handled natively by Supabase (AWS EBS volume encryption). If someone physically steals the hard drive from the AWS data center, it is unreadable.
*   **Column-Level Encryption (Application Level):** The `githubToken` column in the `Repository` table. We do not rely solely on AWS disk encryption. The database administrator (who has query access) will only see `gcm:iv:ciphertext`, not the real token.
*   **Row-Level Security (RLS):** (If enabled in Supabase). Postgres can be configured so that even if the backend is hacked, the database itself refuses to return rows where `user_id != current_user_id`.

---
