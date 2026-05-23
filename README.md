# ContriTrack

ContriTrack is an AI-powered academic collaboration and telemetry platform designed for students, developers, engineering teams, and hackathon communities.

The platform helps teams manage workspaces, track contributions, monitor collaboration fairness, visualize productivity trends, conduct meetings, manage recruitment pipelines, and receive AI-powered insights through real-time analytics systems.

Built with a modern full-stack architecture and enterprise-inspired design system, ContriTrack transforms collaborative workflows into a structured and intelligent productivity ecosystem.

---

## Core Features

### Workspace Management
- Create and manage collaborative workspaces
- Dynamic workspace initialization
- Workspace-specific analytics and telemetry
- Multi-user collaboration support

### Overview Dashboard
- Workspace activity summaries
- Productivity snapshots
- Contribution insights
- Recent team activity
- AI-generated workspace observations

### AI Insights
- AI-powered collaboration analysis
- Productivity recommendations
- Contribution pattern evaluation
- Burnout-awareness indicators
- Intelligent workspace suggestions using Gemini API

### Analytics & Telemetry
- Contribution tracking systems
- Sprint analytics
- Productivity graphs
- Workspace engagement metrics
- Team activity visualizations
- Real-time telemetry dashboards

### Teams Management
- Contributor management
- Role assignment systems
- Member classifications
- Workspace identity synchronization
- Team collaboration monitoring

### Meetings System
- Meeting scheduling interface
- Team discussion workflows
- Collaboration coordination
- Workspace communication support

### Recruitment Center
- Candidate application tracking
- Resume upload management
- Recruitment analytics
- Role-based candidate filtering
- Candidate deletion workflows
- Recruitment dashboard systems

### GitHub Purging & Repository Utilities
- GitHub integration systems
- Contribution monitoring
- Repository activity tracking
- GitHub telemetry visualization

### Reports System
- Workspace performance reports
- Contribution summaries
- Analytics exports
- AI-generated reporting insights

### Settings & Security
- Profile management
- Contributor identity synchronization
- Security key management
- Alert controls
- Notification systems
- Workspace personalization
- Authentication settings

### Authentication System
- Google Authentication
- GitHub Authentication
- Email & Password Authentication
- Account restoration workflows
- Secure account deletion systems

---

## Tech Stack

### Frontend
- Next.js 15
- TypeScript
- Tailwind CSS
- Framer Motion
- shadcn/ui

### Backend
- Node.js
- Express.js

### Database & ORM
- Supabase PostgreSQL
- Prisma ORM

### Authentication
- Firebase Authentication

### AI Systems
- Gemini API

### Monitoring & Testing
- Sentry
- Playwright
- GitHub Actions CI/CD

### Deployment
- Vercel

---

## Architecture Highlights

- Full-stack scalable architecture
- Modular component-based frontend system
- Real-time telemetry workflows
- AI-integrated analytics systems
- Production-grade monitoring and testing infrastructure
- Enterprise-inspired UI/UX patterns
- Responsive workspace ecosystem

---

## Productivity & Collaboration Systems

ContriTrack focuses on solving common collaboration challenges faced by student teams and developer communities:

- Uneven contribution visibility
- Poor sprint transparency
- Lack of accountability
- Collaboration imbalance
- Disconnected workflow tracking
- Manual productivity monitoring

The platform centralizes collaboration intelligence into a single structured environment.

---

## AI Integration

ContriTrack integrates Gemini-powered AI systems to provide:

- Workspace insights
- Productivity recommendations
- Collaboration analysis
- Team engagement summaries
- Intelligent reporting workflows

The AI systems are context-aware and dynamically adapt to workspace activity.

---

## Monitoring & Reliability

### Automated End-to-End Testing
Playwright-based automated testing validates:
- Authentication workflows
- Workspace creation
- Navigation systems
- Analytics rendering
- Responsive behavior
- Settings functionality

### Real-Time Error Monitoring
Sentry integration provides:
- Production error tracking
- API monitoring
- Performance tracing
- Frontend exception reporting

---

## Design Philosophy

ContriTrack follows a modern enterprise-inspired visual system focused on:
- Productivity-first workflows
- Telemetry-driven dashboards
- Futuristic UI patterns
- Smooth user interactions
- Structured information hierarchy
- Developer-oriented experiences

---

## Deployment Infrastructure

The platform is fully deployed using:
- Vercel Production Hosting
- Supabase Cloud Database
- Firebase Authentication
- GitHub CI/CD Pipelines
- Sentry Monitoring Infrastructure

---

# 📸 Screenshots

## 🏠 Overview Dashboard
<img width="100%" alt="Overview Dashboard" src="https://drive.google.com/uc?export=view&id=1MifXrKFyauD5WwHPzeTKYoPYyQmz_ent" />

---

## 📊 Analytics Dashboard
<img width="100%" alt="Analytics Dashboard" src="https://drive.google.com/uc?export=view&id=18xzncaojF6gKn5JIDuJRYq2a5cR6atN5" />

---

## 🤖 AI Insights
<img width="100%" alt="AI Insights" src="https://drive.google.com/uc?export=view&id=1YgUjoiqrjNyOAaSKNtogZ5LrCAVtiYnA" />

---

## 👥 Teams Management
<img width="100%" alt="Teams Management" src="https://drive.google.com/uc?export=view&id=1q-1IFyoojYzeQbjjIF1JmFD9yNZS1kQl" />

---

## 📅 Meetings Workspace
<img width="100%" alt="Meetings Workspace" src="https://drive.google.com/uc?export=view&id=1kDYZx7fSqtfeQxf7n8Qj82GA6C8v8bxl" />

---

## 📄 Reports System
<img width="100%" alt="Reports System" src="https://drive.google.com/uc?export=view&id=1NIvHbQN7QA0BLtohJjOPeWRN9IufureH" />

---

## ⚙️ Settings & Security
<img width="100%" alt="Settings & Security" src="https://drive.google.com/uc?export=view&id=1wS43XUyJWfzIS9s7TJXQB0goUkoK9gYk" />

---

## 🧠 GitHub Purging & Telemetry
<img width="100%" alt="GitHub Purging" src="https://drive.google.com/uc?export=view&id=1YTRyneX_yF3Aanu9SrAIzFc_wdjDqU9f" />

---

## Getting Started

### Clone the Repository

```bash
git clone https://github.com/Khushi1310-nayak/ContriTrack.git
cd ContriTrack
```

### Install Dependencies

```bash
npm install
```

### Configure Environment Variables

Create a `.env.local` file and add:

```env
# SUPABASE DATABASE & STORAGE

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

DATABASE_URL=
DIRECT_URL=

# FIREBASE AUTHENTICATION

NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# GITHUB OAUTH

GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# AI SYSTEMS

OPENAI_API_KEY=
GEMINI_API_KEY=

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
```

### Run Development Server

```bash
npm run dev
```

---

## Future Roadmap

- Real-time collaboration systems
- AI-powered sprint optimization
- Advanced GitHub analytics
- Workspace role permissions
- Desktop application support
- Offline-first workspace architecture
- Team performance forecasting
- Cross-workspace analytics

---

## Contributing

Contributions are welcome.

Fork the repository, create a feature branch, and submit a pull request.

---

## License

This project is licensed under the MIT License.

---

## Author

### Manisa Nayak

- GitHub: https://github.com/Khushi1310-nayak
- LinkedIn: https://www.linkedin.com/in/manisa-nayak-185bb5378/
