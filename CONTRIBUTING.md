# Contributing to ContriTrack

First off, thank you for considering contributing to **ContriTrack**! It's people like you that make this AI-powered academic collaboration platform a great tool for students, developers, and engineering teams.

This document outlines the process for contributing, setting up the project locally, creating issues, and getting your pull requests merged.

## 🤝 Code of Conduct
By participating in this project, you are expected to uphold a welcoming and inclusive environment. Please treat all maintainers and contributors with respect. 

---

## 🚀 How to Contribute

We welcome contributions of all kinds: bug fixes, new features, documentation improvements, and UI enhancements. 

### 1. Finding an Issue
Before you write any code, please check the [Issue Tracker](../../issues) to see if someone is already working on what you have in mind.
- If you find an unassigned issue you'd like to work on, drop a comment saying **"I would like to work on this!"**
- If you have a new idea or found a bug, **please open a new issue first** (see below).

### 2. Creating an Issue
When creating an issue, please provide as much context as possible:
- **Bug Reports**: Describe the bug, provide steps to reproduce, what you expected to happen, and what actually happened. Include your OS, browser, and screenshots if applicable.
- **Feature Requests**: Clearly describe the feature, the problem it solves, and how you envision it working in the dashboard.

### 3. Issue Assignment (For Maintainers & Contributors)
To prevent duplicate work, **please do not start coding until a maintainer has officially assigned the issue to you.**

**How the maintainer assigns issues:**
1. A contributor comments on an open issue requesting to be assigned.
2. The maintainer reviews the request and uses the GitHub UI (right sidebar > Assignees) to assign the issue to the contributor.
3. The maintainer may apply labels like `in-progress` to visually indicate the issue is being actively worked on.
4. If a contributor becomes inactive for an extended period (e.g., 2 weeks), the maintainer reserves the right to unassign them so others can take over.

---

## 💻 Local Development Setup

ContriTrack is built with **Next.js 15**, **TypeScript**, **Tailwind CSS**, **Prisma**, **Supabase**, **Firebase**, and **OpenRouter**. Follow these steps to run the app locally.

### Prerequisites
- Node.js (v20+ recommended)
- npm or pnpm
- A Supabase PostgreSQL database
- A Firebase project (for Auth)
- An OpenRouter API Key (for AI telemetry insights)
- A GitHub OAuth app (for repository syncing)

### Setup Steps
1. **Fork the repository** to your own GitHub account and clone it to your local machine:
   ```bash
   git clone https://github.com/YOUR_USERNAME/ContriTrack.git
   cd ContriTrack
   ```
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Configure Environment Variables**:
   Copy the `.env.example` to `.env` (or just create a `.env` file in the root):
   ```bash
   cp .env.example .env
   ```
   Fill in your `.env` with the necessary keys (Supabase, Firebase, OpenRouter, GitHub OAuth).

4. **Initialize the Database**:
   Generate the Prisma client and push the schema to your Supabase database:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Run the Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

---

## 🌿 Branching & Commit Guidelines

### Branching Strategy
Never push directly to the `main` branch. Always create a new branch from `main` using the following naming conventions:
- `feature/your-feature-name` (For new features)
- `fix/issue-description` (For bug fixes)
- `docs/what-you-changed` (For documentation updates)

```bash
git checkout main
git pull origin main
git checkout -b feature/cool-new-metric
```

### Commit Messages
We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification. This helps us maintain a clean and readable git history.

Examples:
- `feat: add new burnout indicator to AI dashboard`
- `fix: resolve mobile layout overflow on tasks page`
- `docs: update setup instructions in README`
- `style: format codebase with Prettier`

---

## 📤 Submitting a Pull Request (PR)

Once you've completed your feature or bug fix:

1. Ensure your code compiles successfully and there are no linting errors (`npm run lint`).
2. If you changed the database schema, make sure to include the Prisma migration.
3. Push your branch to your forked repository:
   ```bash
   git push origin feature/your-feature-name
   ```
4. Open a Pull Request against the `main` branch of the original ContriTrack repository.
5. In your PR description, explain what you changed and **link the related issue** (e.g., `Closes #12`).
6. Wait for a maintainer to review your code. They may request changes before it can be merged.

---

## 🧪 Testing
ContriTrack uses **Playwright** for end-to-end testing. Before submitting a large PR, you can run tests to ensure critical user flows remain intact:
```bash
npx playwright test
```

---

Thank you for contributing! Your efforts help make this platform better for everyone. Happy coding! 🎉
