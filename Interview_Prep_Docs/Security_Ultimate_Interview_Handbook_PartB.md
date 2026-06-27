# ContriTrack Ultimate Interview Handbook: Security Architecture (Part B)

---

## 12. Perfect Answers & 13. Follow-Up Questions (Selected Core Questions)

*(Note: To maximize interview impact, these are the 25 most frequently tested concepts from the 100 questions. Mastering these ensures you can extrapolate answers to the rest.)*

### Easy / Medium Tier

**Q21. Explain the difference between Authentication (AuthN) and Authorization (AuthZ) in this architecture.**
*   **Perfect Answer:** "Authentication (AuthN) is answering 'Who are you?' In my app, Firebase handles AuthN. If you provide the correct Google credentials, Firebase gives you a JWT proving your identity. Authorization (AuthZ) answers 'Are you allowed to do this?' Even if you are logged in (AuthN), my API checks the database to see if you have permission to view a specific Workspace (AuthZ). Being authenticated does not mean you are authorized."
*   **Follow-Up:** "What happens if you forget to implement Authorization on an endpoint?" -> *Answer:* "You create an IDOR vulnerability. Any logged-in user can change the ID in the URL to view any other user's private data."

**Q22. How does an `HttpOnly` cookie prevent Cross-Site Scripting (XSS) from stealing a session?**
*   **Perfect Answer:** "If a JWT is stored in `localStorage`, any JavaScript running on the page can read it via `window.localStorage.getItem()`. If a hacker injects malicious JavaScript via XSS, they can steal the token and impersonate the user. An `HttpOnly` cookie is a special flag sent by the server. It tells the browser: 'Attach this cookie to network requests, but completely hide it from the JavaScript engine.' The hacker's script cannot access `document.cookie`, making session theft impossible via XSS."
*   **Follow-Up:** "Does `HttpOnly` prevent XSS from taking actions on behalf of the user?" -> *Answer:* "No. The XSS script can still make `fetch` requests to your API, and the browser will attach the `HttpOnly` cookie automatically. It just prevents the *theft* of the token itself."

**Q27. Why do we encrypt GitHub tokens using AES instead of hashing them like passwords?**
*   **Perfect Answer:** "Hashing (like bcrypt) is a one-way mathematical function. You can turn a password into a hash, but you can never turn the hash back into the password. That's great for login verification. However, I actually need to *use* the GitHub token to fetch commits from the GitHub API. Therefore, I must use two-way Encryption (AES-256). I encrypt the token to store it safely at rest, and I decrypt it in memory on my Node.js server right before I send the API request to GitHub."
*   **Follow-Up:** "Where do you store the decryption key?" -> *Answer:* "In a secure environment variable on the server, completely separated from the database. If the database is stolen, the tokens are useless without that server-side key."

**Q35. What is Mass Assignment (or Over-posting) and how does Zod mitigate it?**
*   **Perfect Answer:** "Mass Assignment happens when an API blindly accepts an entire JSON object from the client and updates the database row. A hacker might send `{"name": "John", "isAdmin": true}` to a profile update endpoint. If you just pass `req.body` to Prisma, the hacker becomes an admin. Zod mitigates this. I define a strict schema: `z.object({ name: z.string() })`. When I call `schema.parse(req.body)`, Zod automatically strips out `isAdmin` or any other undocumented fields before the data reaches my database logic."

### Hard / Senior Tier

**Q41. Design a system to instantly revoke a specific user's compromised JWT before its 1-hour expiration time, without slowing down the Edge Middleware.**
*   **Perfect Answer:** "JWTs are stateless, meaning the Edge Middleware verifies them using math (CPU), not by checking a database. This makes them extremely fast but impossible to instantly revoke. To solve this, I would implement a Redis-backed Denylist. When a user clicks 'Logout Everywhere' or we detect a breach, we push the JWT's unique `jti` (JWT ID) to Redis with a TTL of 1 hour. The Edge Middleware does a sub-millisecond check against Upstash Redis: `EXISTS jti`. If true, block the request. This maintains Edge performance while providing instant revocation."
*   **Follow-Up:** "Why does the Redis key only need a 1-hour TTL?" -> *Answer:* "Because after 1 hour, the JWT natively expires anyway. The cryptographic math check will fail, so we don't need to bloat Redis by storing it forever."

**Q42. Walk me through a Key Rotation strategy. If your `ENCRYPTION_SECRET` is compromised, how do you re-encrypt all database tokens with zero downtime?**
*   **Perfect Answer:** "You can't just change the `.env` variable, because the app will crash trying to decrypt old data. 
    1. Update the app to accept *two* keys: `CURRENT_KEY` and `OLD_KEY`.
    2. Any new GitHub tokens are encrypted with `CURRENT_KEY`.
    3. When reading old tokens, try `CURRENT_KEY`. If decryption fails, fallback to `OLD_KEY`.
    4. Write a background script that iterates through the database, reads every token using `OLD_KEY`, and immediately overwrites it encrypted with `CURRENT_KEY`.
    5. Once the script finishes, remove `OLD_KEY` from the environment."
*   **Follow-Up:** "How do you know which key was used to encrypt a specific row?" -> *Answer:* "Append a Key ID version to the ciphertext. e.g., `v1:cipherText` or `v2:cipherText`."

**Q43. How do you implement Envelope Encryption using AWS KMS to protect the GitHub tokens instead of relying on a single environment variable?**
*   **Perfect Answer:** "Relying on one `.env` key is a massive blast radius. If it leaks, all users are compromised. Envelope Encryption fixes this. We create a Master Key (CMK) in AWS KMS that never leaves Amazon's secure hardware. When a user connects GitHub, my app calls AWS KMS: 'Give me a Data Encryption Key (DEK)'. AWS returns the DEK in two forms: plaintext and encrypted (by the Master Key). I use the plaintext DEK to encrypt the GitHub token via AES-256. Then, I throw away the plaintext DEK and store the *encrypted token AND the encrypted DEK* in my database. To decrypt, I must send the encrypted DEK to AWS KMS, get the plaintext DEK back, and then decrypt the token. The blast radius is restricted, and AWS logs every single decryption attempt."

### Staff Engineer Tier

**Q82. You must achieve a Zero Trust architecture for a monolithic codebase of 5 million lines. Architect the SPIFFE/SPIRE identity issuance and mTLS network policies.**
*   **Perfect Answer:** "In traditional security, once you are inside the firewall, you are trusted. In Zero Trust, we assume the network is already compromised. I would deploy SPIRE (SPIFFE Runtime Environment). It acts as an internal Certificate Authority. It issues short-lived, cryptographically signed X.509 certificates to every single microservice (or internal Node process) based on strict hardware/OS attestations (e.g., 'Is this process actually running the correct SHA-256 binary?'). Every internal network call (e.g., Node communicating with Redis or Postgres) is forced over mTLS (Mutual TLS). The client verifies the server, AND the server verifies the client. If an attacker breaches a container, they cannot query the database because they do not possess a valid SPIFFE certificate for that specific workload."
*   **Follow-Up:** "How do you manage the overhead of rotating these certificates?" -> *Answer:* "SPIRE handles it automatically. Certificates are kept extremely short-lived (e.g., 1 hour), and SPIRE agents push new certificates into the memory of the workloads via a Unix Domain Socket, requiring zero application restarts."

**Q94. Architect a memory-safe, high-performance proxy that intercepts all outbound traffic to strictly enforce Data Loss Prevention (DLP) policies at line rate.**
*   **Perfect Answer:** "If a malicious internal developer tries to dump the PostgreSQL database and curl it to an external server, standard firewalls won't catch it. I would write a sidecar proxy in Rust (for memory safety, avoiding C++ buffer overflows). It sits in the network namespace of the container. All outbound traffic routes through it. It terminates TLS (using eBPF or a forward proxy CA) to inspect the plaintext payload. It uses highly optimized Aho-Corasick algorithms to scan for high-entropy strings (AWS keys) or Regex patterns (credit cards). If DLP violations are found, it drops the TCP packet instantly and triggers a P1 alert to the Security Operations Center (SOC)."

---

## 14. Whiteboard Explanation

### 30-Second Pitch
"This diagram represents our Defense-in-Depth security posture. The perimeter is secured by Firebase Auth and Next.js Edge Middleware verifying stateless JWTs in HttpOnly cookies. The application layer enforces strict Zod input validation and explicit Authorization checks to prevent OWASP top 10 vulnerabilities like XSS and IDOR. Finally, sensitive data like GitHub tokens are encrypted at the application level using AES-256-GCM before ever hitting the database."

### 2-Minute Explanation
*Draw: [Browser] -> [Firebase] -> [Cookie]*
"We delegate identity verification to Firebase. It gives us a JWT, which we lock inside an HttpOnly, SameSite=Strict cookie. This completely mitigates XSS token theft and CSRF attacks.
*Draw: [Cookie] -> [Next.js Middleware]*
When a request hits our server, the Edge Middleware instantly verifies the JWT signature cryptographically. It acts as our bouncer.
*Draw: [Middleware] -> [Zod] -> [AuthZ]*
Once inside, we assume the payload is hostile. Zod validates the JSON structure to prevent Mass Assignment and Injection. Then, AuthZ checks Postgres to ensure User A is actually allowed to modify Workspace B, preventing IDOR.
*Draw: [App] -> [Crypto Service] -> [DB]*
Finally, for sensitive third-party API keys, we don't trust database-level encryption alone. We use Node's crypto module to AES-encrypt the token. The database only stores ciphertext. If our DB is breached, the attacker gets nothing but gibberish."

---

## 15. Common Mistakes Candidates Make

1.  **Storing JWTs in LocalStorage:** Defending this in an interview is an instant fail. It proves a lack of understanding of XSS vulnerabilities.
2.  **Confusing AuthN and AuthZ:** Stating "The user is logged in, so they can access the dashboard" without mentioning the database lookup that verifies they *own* that specific dashboard.
3.  **Hashing vs Encryption:** Saying "I encrypt passwords with bcrypt" (passwords are hashed) or "I hash the GitHub token" (tokens must be encrypted to be used).
4.  **Security by Obscurity:** Saying "I use random UUIDs for the URL so hackers can't guess them." This is not security. If a UUID leaks, the data is compromised unless an AuthZ layer exists.

---

## 16. Resume Mapping

*   "Engineered a Defense-in-Depth security architecture, leveraging Next.js Edge Middleware and Firebase JWTs stored in HttpOnly cookies to neutralize XSS and CSRF attack vectors."
*   "Implemented strict application-layer encryption (AES-256-GCM) for third-party API tokens, mitigating data exfiltration risks in the event of a database compromise."
*   "Enforced strict Authorization (AuthZ) boundaries and Zod schema validation across all API endpoints, effectively preventing IDOR and Mass Assignment vulnerabilities."

---

## 17. Storytelling (Natural Delivery)

"Security is usually an afterthought, but I designed this architecture assuming we would be breached. I asked myself: 'If someone gets full read access to Postgres, how much damage can they do?' That's why I implemented application-level AES encryption for the GitHub tokens. Then I asked: 'If someone bypasses the Edge Middleware, what happens?' That's why every Server Action explicitly runs a Zod parse and an IDOR database check. By layering the security (Edge, API, Crypto, Database), I ensured that a failure in one layer doesn't result in a catastrophic company-ending breach."

---

## 18. Industry Comparison

*   **Google:** They implement BeyondCorp (Zero Trust). They don't rely on VPNs. Every single request, internal or external, must be strongly authenticated (often using hardware YubiKeys) and authorized based on device posture (e.g., 'Is this laptop fully patched?').
*   **Netflix:** Uses heavily distributed identity. When an edge gateway authenticates a user, it passes a "Passport" (a cryptographically signed token) downstream to the microservices, so internal services don't have to re-authenticate the user constantly.
*   **Atlassian:** Because they handle source code and Jira tickets for Fortune 500s, they focus heavily on Tenant Isolation. They would likely implement Row-Level Security (RLS) deep in the Postgres database to mathematically guarantee that Tenant A can never query Tenant B's data, even if the Node.js API has a bug.

---

## 19. Interview Difficulty

*   **Rating:** **Senior Software Engineer (SDE-3) / Security Engineer**
*   **Why:** A Junior knows how to add Firebase to a React app. A Senior understands the cryptographic differences between hashing and encryption, the mechanics of AES-GCM, how `HttpOnly` cookies mitigate XSS, and how to execute Key Rotation with zero downtime.

---

## 20. Improvements (Making it Production-Ready)

### Already Implemented in Project
*   JWT authentication via Firebase.
*   HttpOnly / SameSite secure cookies.
*   Zod input validation & IDOR checks.
*   AES-256-GCM encryption for GitHub tokens.

### Recommended Future Enhancements (To discuss in interview)
1.  **Envelope Encryption (AWS KMS):** Migrate from a single `.env` master key to dynamically generated Data Encryption Keys (DEKs) via a managed Key Management Service to reduce blast radius.
2.  **JWT Revocation Denylist:** Implement an Upstash Redis cache at the Edge Middleware to allow for instant, stateful revocation of compromised stateless JWTs.
3.  **WAF (Web Application Firewall):** Enable Vercel's WAF to automatically block known malicious IP addresses, Botnets, and SQL injection payloads before they even trigger the Edge Middleware compute.
