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

## 11. Interview Questions (100 Questions)

### 20 Easy
1. What is Authentication?
2. What is Authorization?
3. What is a JWT?
4. What does HTTPS do?
5. Why is it bad to store passwords in plain text?
6. What is XSS?
7. What is SQL Injection?
8. Why do we use Environment Variables (`.env`)?
9. What is an `HttpOnly` cookie?
10. What is a salt in password hashing?
11. What is Firebase?
12. What does OAuth do?
13. What is Two-Factor Authentication (2FA/MFA)?
14. What is a DDoS attack?
15. What is a brute-force attack?
16. What is encryption?
17. What is the difference between hashing and encryption?
18. Why do we use Zod?
19. What is a 401 status code?
20. What is a 403 status code?

### 20 Medium
21. Explain the difference between Authentication (AuthN) and Authorization (AuthZ) in this architecture.
22. How does an `HttpOnly` cookie prevent Cross-Site Scripting (XSS) from stealing a session?
23. What is CSRF (Cross-Site Request Forgery) and how does `SameSite=Strict` prevent it?
24. Explain what an IDOR vulnerability is and exactly how your API prevents it.
25. Walk me through the structure of a JWT (Header, Payload, Signature).
26. Why can't a user just modify the `userId: 1` inside their JWT payload to become an admin?
27. Why do we encrypt GitHub tokens using AES instead of hashing them like passwords?
28. Explain the concept of the Principle of Least Privilege in your application.
29. How does Prisma ORM prevent SQL Injection attacks?
30. What is the difference between Encryption at Rest and Encryption in Transit?
31. How do you securely handle third-party API keys (like the Gemini API key) in a Next.js environment?
32. What is a CORS (Cross-Origin Resource Sharing) policy, and why does the browser enforce it?
33. Explain the difference between Symmetric and Asymmetric encryption. Which one did you use for the GitHub tokens?
34. How does React natively protect against most XSS attacks when rendering variables in JSX?
35. What is Mass Assignment (or Over-posting) and how does Zod mitigate it?
36. Why is it dangerous to verify a JWT purely on the client side (in the browser)?
37. How would you implement rate-limiting to prevent a malicious user from spamming the "Generate Insight" AI button?
38. Explain what an Initialization Vector (IV) is in AES encryption and why it must be unique.
39. What is a Replay Attack and how do JWT expiration times (`exp`) mitigate it?
40. How do you handle securely logging a user out when using stateless JWTs?

### 20 Hard
41. Design a system to instantly revoke a specific user's compromised JWT before its 1-hour expiration time, without slowing down the Edge Middleware for every other user.
42. Walk me through a Key Rotation strategy. If your `ENCRYPTION_SECRET` is compromised, how do you re-encrypt all database tokens with zero downtime?
43. How do you implement Envelope Encryption using AWS KMS to protect the GitHub tokens instead of relying on a single environment variable?
44. Explain how you would architect a Role-Based Access Control (RBAC) system vs an Attribute-Based Access Control (ABAC) system for this platform.
45. A hacker finds a Server-Side Request Forgery (SSRF) vulnerability in your Next.js API. How do you architect your VPC network to ensure they cannot query your internal Postgres database?
46. How do you mitigate Timing Attacks when comparing cryptographic signatures or hashes in Node.js?
47. Architect a Zero Trust Network for your microservices. How do the internal services authenticate with each other? (mTLS).
48. Explain the cryptographic vulnerabilities of using ECB mode in AES encryption compared to GCM mode.
49. How do you implement robust audit logging for security events (like modifying roles or exporting data) in a way that is tamper-proof, even if the database is compromised?
50. Walk me through configuring Content Security Policy (CSP) headers to prevent unauthorized external scripts from executing on your frontend.
51. How do you defend against a sophisticated account takeover (ATO) attack where the attacker has valid stolen credentials from another website breach?
52. Design a rate-limiting architecture that uses a sliding window algorithm in Redis to prevent burst attacks perfectly.
53. How do you ensure that your Vercel Edge Middleware is secure against HTTP Request Smuggling attacks?
54. Explain the mechanics of a Prototype Pollution attack in JavaScript and how you ensure your backend dependencies are immune.
55. If a developer accidentally commits a plaintext GitHub Personal Access Token into the Git repository, what is your automated incident response architecture?
56. How do you handle the secure storage and transmission of large files (e.g., CSV exports) ensuring they cannot be intercepted or accessed by unauthorized users via direct S3 URL guessing?
57. Architect a mechanism to dynamically ban IP addresses across your global CDN within 5 seconds of detecting a Distributed Denial of Service (DDoS) attack.
58. Explain how you would implement biometric WebAuthn (Passkeys) as a primary authentication mechanism to replace passwords entirely.
59. How do you mathematically guarantee that your API rate limiting does not inadvertently block users operating behind a massive corporate NAT (where 1,000 users share one IP)?
60. Walk me through the security implications of utilizing GraphQL instead of REST, specifically focusing on Query Depth limits and Introspection attacks.

### 20 Senior
61. Critique the decision to use stateless JWTs. At what scale or security-sensitivity level does the lack of absolute revocation make JWTs an architectural anti-pattern?
62. How would you redesign this security architecture to comply with FedRAMP High (US Government) standards, specifically regarding FIPS 140-2 validated cryptography boundaries?
63. Walk me through a post-mortem: An attacker bypassed Zod validation and managed to perform a NoSQL-style injection against your Prisma ORM, dropping a table. How did your defense-in-depth fail?
64. How do you architect a "Break Glass" emergency access protocol for SREs to access production databases securely without sharing permanent root credentials?
65. Design a system that automatically detects and alerts on anomalous insider threat behavior (e.g., an engineer querying salaries from the database at 3 AM).
66. If a critical zero-day vulnerability (like Log4j) hits, how do you architect your pipeline to automatically patch, test, and deploy a fix to 100 microservices simultaneously?
67. Explain how you would implement eBPF (Extended Berkeley Packet Filter) in your infrastructure to monitor the exact syscalls made by your application to detect malicious behavior (e.g., a reverse shell).
68. How do you manage the orchestration of schema changes and security policy updates in an Event-Sourced architecture (Kafka) during a deployment?
69. Design a highly available OAuth 2.0 Identity Provider (IdP) architecture running on your own AWS infrastructure that scales to 10,000 logins per second.
70. How do you enforce compliance (SOC2) in your CI/CD pipeline to mathematically prove that no code reaches production without passing Static Application Security Testing (SAST)?
71. Critique the use of third-party Identity Providers like Firebase. When is it architecturally necessary to build and manage your own authentication state machines?
72. How do you architect a multi-region deployment strategy (US, EU) that strictly ensures European user data and encryption keys never physically cross into US data centers (Data Sovereignty)?
73. Design a system that securely shares analytical data with third-party partners without exposing PII, utilizing Differential Privacy techniques.
74. How do you handle the secure deployment of machine learning models (TensorFlow) ensuring that an attacker cannot extract the proprietary training data via Model Inversion attacks?
75. Walk me through implementing a GitOps methodology (ArgoCD) to make Git the absolute source of truth for both application code and infrastructure security state (IAM roles).
76. How do you prevent "Configuration Drift" where the cloud provider dashboard settings diverge from the secure infrastructure-as-code definitions?
77. Design a strategy to handle database replication lag during an authorization change (e.g., User A is removed from Workspace B, but the Read Replica hasn't synced yet, allowing them 5 seconds of unauthorized access).
78. How do you architect a chaotic testing environment (Chaos Mesh) that automatically injects security faults (like invalid tokens or expired certs) into the staging CD pipeline?
79. Explain the security implications of using Alpine Linux vs Distroless Docker base images for your production artifacts.
80. Architect a unified security dashboard that aggregates SAST, DAST, Dependency vulnerabilities, and WAF blocked requests for the CISO.

### 20 Staff Engineer
81. Assume the company acquires 3 startups using completely different authentication mechanisms (SAML, Custom Sessions, Auth0). Architect a unified, federated Identity proxy that all teams must adopt with zero downtime for users.
82. You must achieve a Zero Trust architecture for a monolithic codebase of 5 million lines. Architect the SPIFFE/SPIRE identity issuance and mTLS network policies.
83. How do you design a deterministic build system (Bazel) to mathematically guarantee that the same source code always produces the exact same bit-for-bit binary, preventing Supply Chain Injection?
84. Walk me through designing a cryptographic key management system for a decentralized, peer-to-peer (P2P) architecture where there is no central server to hold the master keys.
85. How do you convince the organization to transition from perimeter-based security (VPNs) to BeyondCorp (Zero Trust) principles using advanced device posture checks?
86. Architect a geographically distributed CI runner network that compiles code securely in enclaves (AWS Nitro Enclaves) to protect proprietary algorithms from the infrastructure providers themselves.
87. Design a self-healing security pipeline that uses LLMs to automatically read vulnerability reports, generate a fix, and open a remediation PR.
88. How do you orchestrate the revocation of a compromised Root Certificate Authority (CA) in a massive IoT deployment where devices are rarely online?
89. Explain how you would implement formal verification in your core authorization logic to mathematically prove the absence of privilege escalation bugs.
90. Architect a zero-knowledge AI pipeline where even the database administrators cannot read the prompts being sent to the internal LLM cluster, utilizing Homomorphic Encryption.
91. How do you build a custom capability-based security model (Object Capabilities) to replace traditional ACLs/RBAC in a highly dynamic plugin ecosystem?
92. Design a disaster recovery protocol for the Identity platform itself. If Firebase goes down globally, how does the company authenticate critical staff to manage infrastructure?
93. How do you manage the ethical and legal implications of Law Enforcement requests for data in an architecture designed with end-to-end (E2EE) encryption?
94. Architect a memory-safe, high-performance Rust proxy that intercepts all outbound traffic to strictly enforce Data Loss Prevention (DLP) policies at line rate (100 Gbps).
95. Design a strategy for implementing Post-Quantum Cryptography (PQC) algorithms across your entire infrastructure to defend against future quantum computer attacks.
96. How do you build a culture of "Security Champions", ensuring that developers take ownership of threat modeling rather than tossing code over the wall to the Security team?
97. Explain the implications of AI regulation (like the EU AI Act) on your architectural decisions regarding the auditability of automated security bans.
98. Architect a real-time observability mesh that automatically correlates a spike in failed logins directly back to the specific Git commit and developer who modified the authentication middleware.
99. Propose a technical strategy for implementing continuous fuzz testing in production, safely feeding malformed inputs into the live system to discover memory corruption bugs before attackers do.
100. Draw the exact architecture of this Security Workflow 10 years from now, factoring in the emergence of decentralized autonomous identities (DID) and zero-knowledge proofs (ZKP) for authentication.

---

*(Due to length, Perfect Answers and Follow-Ups for the 100 questions are continued in the subsequent section.)*
