# ContriTrack Architecture Overview

ContriTrack is a full-stack, AI-powered academic collaboration platform. This document outlines the high-level system architecture, data flow, and technology integrations.

## 🛠 Tech Stack
- **Frontend & API Routes:** Next.js 16 (App Router), React 19, Tailwind CSS v4.
- **Database & ORM:** Supabase (PostgreSQL), Prisma ORM.
- **Authentication:** Firebase Auth (Client & Admin SDK).
- **AI Engine:** OpenRouter (currently using Google Gemma 4 31B) for LLM-based insights.
- **Testing:** Playwright.

## 🏛 High-Level Data Flow

1. **GitHub Telemetry Ingestion:**
   - ContriTrack links to user repositories via GitHub OAuth (`GITHUB_CLIENT_ID` / `SECRET`).
   - The system ingests commits, pull requests, and issues, mapping them into the Supabase database via Prisma (`CommitTelemetry`, `ContributionMetric`).

2. **Workspace & Task Management:**
   - Users create `Workspaces` and invite `WorkspaceMembers`.
   - `Tasks` are created, assigned, and tracked across custom sprints.
   - Task completion rates, overdue counts, and workload balances are continually aggregated.

3. **AI Insight Generation (`ai-actions.ts`):**
   - When a user loads the AI Dashboard, the backend aggregates their workspace telemetry (e.g., `taskOverflow`, `missedDeadlines`, `sprintVelocity`, `burnoutScore`).
   - This aggregated JSON is sent securely via server-side fetch to the **OpenRouter API**.
   - The LLM acts as an expert agile coach, returning structured JSON containing dynamic `recommendations` and specific `insights` (e.g., Burnout Warnings, Free Rider Alerts, Parity Adjustments).
   - The response is persisted in the database (`AIInsight`) and surfaced in the Next.js frontend (`AIInsightsPanel.tsx`).

4. **Automated Load Balancing:**
   - ContriTrack includes an algorithmic engine to identify overloaded members (e.g., >= 4 open tasks) and underloaded members.
   - It can automatically transactionally re-assign tasks within Supabase to maintain sprint velocity.

## 🗄 Database Schema (Prisma)
Core entities include:
- `User` & `UserProfile`: Identity and academic details.
- `Workspace` & `WorkspaceMember`: Team grouping and permissions.
- `Task` & `TaskActivity`: Ticket tracking and audit logs.
- `GitHubRepository` & `Commit`: Linked code contributions.
- `AIInsight` & `ProductivityForecast`: Persisted AI evaluations and sprint projections.

## 🔐 Security & Auth
- User sessions are managed entirely by **Firebase**.
- The Next.js backend uses `firebase-admin` to verify session tokens before executing Prisma mutations.
- API Keys (`OPENROUTER_API_KEY`, `GITHUB_CLIENT_SECRET`) are strictly kept on the server environment variables.
