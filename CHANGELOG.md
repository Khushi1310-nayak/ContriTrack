# 📜 Changelog

All notable changes to the **ContriTrack** platform are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.3.0] - 2026-08-18

### 🚀 Added
- **Developer REST API Ecosystem (`/api/developer/...`)**:
  - Implemented 9 functional REST API routes backed by live PostgreSQL queries.
  - Added cryptographic `ct_live_...` Bearer token generation with SHA-256 key hashing (`hashedKey`).
  - Added scoped permission validation (`read`, `write`, `read:tasks`, `write:tasks`, `read:metrics`, `admin`).
  - Added in-memory token rate limiting (60 requests/minute per key).
- **Interactive REST API Playground & Docs (`/docs`)**:
  - Built an in-browser sandbox allowing developers to execute live queries against PostgreSQL.
  - Added automatic CSV text rendering for grading export endpoints.
- **LMS Grading & Report Exporting**:
  - `GET /api/developer/reports/export-csv`: Formatted `.csv` streaming for Canvas LMS, Blackboard, and Excel.
  - `POST /api/developer/reports/generate-pdf`: Certified contribution certificate generation with signed URLs.
- **DevOps & External Integrations**:
  - `POST /api/developer/ci/build-event`: CI/CD build telemetry ingestion for GitLab CI, Jenkins, CircleCI, and GitHub Actions.
  - `GET / POST /api/developer/standups`: Daily standup activity feeds with Discord and Slack bot webhook integration.
  - `GET / POST /api/developer/webhooks`: Outgoing event subscription gateway.

### 🛠 Changed
- Enhanced permission checking in `validateApiKey` to match scoped prefixes and admin privileges.

---

## [1.2.0] - 2026-08-15

### 🚀 Added
- **Academic Hubs Observatory (`/hubs`, `/hubs/[slug]`)**:
  - Dedicated university directory with 5 certified academic hubs (*Senior Capstone, Open-Source Innovation, AI Research Labs, Hackathon Sprints, and Faculty Oversight*).
  - Workspace project linking modal and cross-team milestone progress leaderboards.
- **Admin Governance & Forensic Data Erasure (`/admin/users`)**:
  - Hardened `deleteUserAccountAdmin` to execute atomic cascade deletion across all 20 database tables.
  - Added synchronized user deletion in Firebase Authentication by UID and email.
- **Recruitment Center & ATS Portal (`/careers`, `/admin/careers`)**:
  - Public candidate application workflow with resume file upload management.
  - Private admin applicant review, stage transitions, and candidate filtering.
- **In-App Notification Center & Real-Time Inbox**:
  - 10-second silent polling notification inbox with unread counters and audio chime alerts.
  - Threaded replies table (`NotificationReply`) allowing inline comment threads.
  - Nodemailer SMTP integration for automated workspace invite emails and 2FA OTP verification.
- **Settings Vault & GDPR Backups**:
  - Encrypted JSON data snapshot archive generator with one-click direct download.
  - 30-day soft deletion recovery grace period.

---

## [1.1.0] - 2026-07-16

### 🚀 Added
- **OpenRouter AI Engine Integration**: LLM-based collaboration coaching, burnout pattern detection, and workload balancing recommendations.
- Open-source developer guidelines (`CONTRIBUTING.md`) and high-level architecture documentation (`ARCHITECTURE.md`).
- Issue and Pull Request templates for standardizing contributions.

### 🛠 Changed
- Upgraded dashboard UI to consume dynamic JSON recommendations and automated workload balancing algorithms.

---

## [1.0.0] - 2026-07-10

### 🚀 Added
- Initial production release of **ContriTrack**.
- GitHub OAuth integration for repository telemetry and commit monitoring.
- Supabase PostgreSQL schema with Prisma ORM for Workspaces, Tasks, and Metrics.
- Firebase Authentication supporting Google, GitHub, and Email/Password logins.
- Playwright end-to-end testing suite.
