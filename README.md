<div align="center">

# 📊 ContriTrack

## AI-Powered Academic Collaboration & Telemetry Platform

*A platform designed for students, developers, engineering teams, and hackathon communities to manage workspaces, track contributions, monitor fairness, and receive AI-powered insights.*

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-blue?style=for-the-badge&logo=typescript)
![OpenRouter](https://img.shields.io/badge/OpenRouter-API-blue?style=for-the-badge)
![Supabase](https://img.shields.io/badge/Supabase-green?style=for-the-badge&logo=supabase)
![Status](https://img.shields.io/badge/Project-Active-success?style=for-the-badge)

</div>

---

# 📖 Overview

Collaboration in student teams and developer communities often suffers from uneven contribution visibility, poor sprint transparency, and a lack of accountability. Tracking workflows manually leads to collaboration imbalance and disconnected productivity monitoring.

**ContriTrack** is an AI-powered **Collaboration and Telemetry Platform** that solves these challenges.

It centralizes collaboration intelligence into a single structured environment. By combining dynamic workspace management, real-time analytics, and AI-powered insights, ContriTrack transforms collaborative workflows into a structured, intelligent productivity ecosystem.

---

# ✨ Core Features

- 🏢 **Workspace Management:** Dynamic multi-user collaborative workspaces.
- 📊 **Analytics & Telemetry:** Contribution tracking, sprint analytics, and real-time dashboards.
- 🤖 **AI Insights:** Gemini-powered collaboration analysis and burnout-awareness indicators.
- 👥 **Teams Management:** Contributor roles, member classifications, and identity synchronization.
- 📅 **Meetings System:** Meeting scheduling, team discussions, and collaboration coordination.
- 🎯 **Recruitment Center:** Candidate application tracking and resume upload management.
- 🧠 **GitHub Integration:** Contribution monitoring and repository activity tracking.
- 📄 **Reports System:** Workspace performance reports and AI-generated insights.
- 🔒 **Settings & Security:** Profile management, alert controls, and secure authentication workflows.

---

# 🏗 Architecture

```mermaid
graph TD
    Client["Client Browser (Next.js UI)"]

    subgraph Vercel ["Vercel Hosting Network"]
        NextApp["Next.js 15 Application"]
        ServerActions["Server Actions API (/actions)"]
        Cron["Background/Cron Endpoints (/api/cron)"]
    end

    subgraph Supabase ["Supabase Cloud"]
        Prisma["Prisma ORM Layer"]
        DB["PostgreSQL Database"]
    end
    
    subgraph External ["External Services"]
        GitHub["GitHub REST API (Octokit)"]
        FirebaseAuth["Firebase Auth (Identity)"]
        Sentry["Sentry (Telemetry & Monitoring)"]
    end

    Client -- "HTTP/React State" --> NextApp
    Client -- "Auth Tokens" --> FirebaseAuth
    
    NextApp -- "RPC / Forms" --> ServerActions
    NextApp -- "Verify JWT" --> FirebaseAuth
    NextApp -- "Client / Server Errors" --> Sentry
    
    ServerActions -- "Prisma Client" --> Prisma
    Cron -- "Prisma Client" --> Prisma
    
    Cron -- "Fetch Repo/Commits" --> GitHub
    Cron -- "Rate-Limited Polling" --> GitHub
    
    Prisma <-->|"Postgres TCP"| DB
```

---

# 💻 System Modules

## 🏢 Workspace Management

Create and manage collaborative workspaces with dynamic initialization, workspace-specific analytics, telemetry, and comprehensive multi-user support.

---

## 📊 Overview Dashboard

Gain immediate visibility with workspace activity summaries, productivity snapshots, recent team activity, and AI-generated workspace observations.

---

## 🤖 AI Insights

Leverage the OpenRouter API for AI-powered collaboration analysis, productivity recommendations, contribution pattern evaluation, and burnout-awareness indicators.

---

## 📈 Analytics & Telemetry

Monitor engagement through contribution tracking systems, sprint analytics, productivity graphs, workspace engagement metrics, and real-time telemetry dashboards.

---

## 👥 Teams Management

Manage your contributors efficiently with role assignment systems, member classifications, workspace identity synchronization, and team collaboration monitoring.

---

## 📅 Meetings System

Coordinate effortlessly with a dedicated meeting scheduling interface, team discussion workflows, and robust workspace communication support.

---

## 🎯 Recruitment Center

Streamline team expansion with candidate application tracking, resume upload management, recruitment analytics, role-based candidate filtering, and recruitment dashboard systems.

---

## 🧠 GitHub Purging & Repository Utilities

Integrate seamlessly with GitHub for contribution monitoring, repository activity tracking, and visual GitHub telemetry.

---

## 📄 Reports System

Export and analyze workspace performance reports, contribution summaries, analytics exports, and AI-generated reporting insights.

---

## 🔒 Authentication System

Secure user access via Google Authentication, GitHub Authentication, and Email/Password with account restoration and secure account deletion workflows.

---

# 🧠 Engineering Concepts & Architecture Highlights

This project demonstrates several production-grade engineering concepts:

✅ Full-stack scalable architecture
✅ Modular component-based frontend system
✅ Real-time telemetry workflows
✅ AI-integrated analytics systems
✅ Production-grade monitoring (Sentry) and testing (Playwright) infrastructure
✅ Enterprise-inspired UI/UX patterns
✅ Responsive workspace ecosystem

---

# 🛠 Tech Stack

| Category | Technology |
| --- | --- |
| **Frontend** | Next.js 15, TypeScript, Tailwind CSS, Framer Motion, shadcn/ui |
| **Backend** | Node.js, Express.js |
| **Database & ORM** | Supabase PostgreSQL, Prisma ORM |
| **Authentication** | Firebase Authentication |
| **AI Systems** | OpenRouter API |
| **Monitoring & Testing** | Sentry, Playwright, GitHub Actions CI/CD |
| **Deployment** | Vercel |

---

# 📸 Screenshots

## 🏠 Overview Dashboard Screenshot

<img width="100%" alt="Overview Dashboard" src="https://drive.google.com/uc?export=view&id=1MifXrKFyauD5WwHPzeTKYoPYyQmz_ent" />

---

## 📊 Analytics Dashboard Screenshot

<img width="100%" alt="Analytics Dashboard" src="https://drive.google.com/uc?export=view&id=18xzncaojF6gKn5JIDuJRYq2a5cR6atN5" />

---

## 🤖 AI Insights Screenshot

<img width="100%" alt="AI Insights" src="https://drive.google.com/uc?export=view&id=1YgUjoiqrjNyOAaSKNtogZ5LrCAVtiYnA" />

---

## 👥 Teams Management Screenshot

<img width="100%" alt="Teams Management" src="https://drive.google.com/uc?export=view&id=1q-1IFyoojYzeQbjjIF1JmFD9yNZS1kQl" />

---

## 📅 Meetings Workspace Screenshot

<img width="100%" alt="Meetings Workspace" src="https://drive.google.com/uc?export=view&id=1kDYZx7fSqtfeQxf7n8Qj82GA6C8v8bxl" />

---

## 📄 Reports System Screenshot

<img width="100%" alt="Reports System" src="https://drive.google.com/uc?export=view&id=1NIvHbQN7QA0BLtohJjOPeWRN9IufureH" />

---

## ⚙️ Settings & Security Screenshot

<img width="100%" alt="Settings & Security" src="https://drive.google.com/uc?export=view&id=1wS43XUyJWfzIS9s7TJXQB0goUkoK9gYk" />

---

## 🧠 GitHub Purging & Telemetry Screenshot

<img width="100%" alt="GitHub Purging" src="https://drive.google.com/uc?export=view&id=1YTRyneX_yF3Aanu9SrAIzFc_wdjDqU9f" />

---

# 🚀 Getting Started

## 1. Clone the Repository

```bash
git clone https://github.com/Khushi1310-nayak/ContriTrack.git
cd ContriTrack
```

## 2. Install Dependencies

```bash
npm install
```

## 3. Configure Environment Variables

Create a `.env.local` file and add the required variables:

```env
# SUPABASE DATABASE & STORAGE
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
DATABASE_URL=
DIRECT_URL=
SUPABASE_SERVICE_ROLE_KEY=

# FIREBASE AUTHENTICATION & ADMIN SDK
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# GITHUB OAUTH
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# AI SYSTEMS
OPENROUTER_API_KEY=

# SITE CONFIGURATION
NEXT_PUBLIC_SITE_URL=

# SMTP / EMAIL SYSTEM
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=

# SENTRY MONITORING
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_AUTH_TOKEN=
SENTRY_ORG=
SENTRY_PROJECT=

# WEB PUSH NOTIFICATIONS (VAPID KEYS)
# How to generate: run 'npx web-push generate-vapid-keys' in terminal
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:your-email@example.com

# SECURITY & CRON SECRET
# How to generate ENCRYPTION_KEY: run 'node -e "console.log(require(\"crypto\").randomBytes(32).toString(\"hex\"))"'
ENCRYPTION_KEY=
CRON_SECRET=
```

### 💡 Environment Key Explanations & Generators

* **VAPID Keys (`NEXT_PUBLIC_VAPID_PUBLIC_KEY` & `VAPID_PRIVATE_KEY`):** Used for browser Push Notifications. Generate them by running:
  ```bash
  npx web-push generate-vapid-keys
  ```
* **Encryption Key (`ENCRYPTION_KEY`):** Encrypts sensitive database tokens. Generate a cryptographically secure 256-bit key by running:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
* **Cron Secret (`CRON_SECRET`):** Secures background cron tasks (e.g. workspace synchronizations) from unauthorized triggers.
  * **Local Dev:** Set this to any random strong string of your choice.
  * **Production (Vercel):** Automatically created and configured by Vercel when you link Vercel Cron Jobs. No manual environment key addition is required in Vercel for production.

## 4. Run Development Server

```bash
npm run dev
```

---

# 🔮 Future Roadmap

- Real-time collaboration systems
- AI-powered sprint optimization
- Advanced GitHub analytics
- Workspace role permissions
- Desktop application support
- Offline-first workspace architecture
- Team performance forecasting
- Cross-workspace analytics

---

# 🤝 Contributing

Contributions are welcome! Fork the repository, create a feature branch, and submit a pull request.

---

# 📄 License

This project is licensed under the MIT License.

---

# 👩💻 Author

## **Manisa Nayak**

🎓 Student | Full-Stack Developer | AI Product Builder

Passionate about:
- Full-Stack Architecture
- User Experience (UI/UX)
- AI Automation & Product Building

### Connect with Me

**GitHub:** [Khushi1310-nayak](https://github.com/Khushi1310-nayak)  
**LinkedIn:** [Manisa Nayak](https://www.linkedin.com/in/manisa-nayak-185bb5378/)

---

## ⭐ If you found this project interesting, consider giving it a Star
