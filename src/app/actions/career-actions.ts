"use server";

import { prisma } from "@/lib/db";
import crypto from "crypto";

// Ensure recruiting tables are fully initialized in PostgreSQL without locking
async function ensureRecruitingTablesExist() {
  try {
    // 1. Initialize JobRole
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "JobRole" (
        "id" TEXT PRIMARY KEY,
        "slug" TEXT UNIQUE NOT NULL,
        "title" TEXT NOT NULL,
        "department" TEXT NOT NULL,
        "level" TEXT NOT NULL DEFAULT 'fresher',
        "location" TEXT NOT NULL DEFAULT 'Remote',
        "remoteType" TEXT NOT NULL DEFAULT 'Full-Time',
        "salaryMin" INTEGER NOT NULL DEFAULT 0,
        "salaryMax" INTEGER NOT NULL DEFAULT 0,
        "description" TEXT NOT NULL,
        "fresherRequirements" TEXT NOT NULL,
        "experiencedRequirements" TEXT NOT NULL,
        "technologies" TEXT[] NOT NULL DEFAULT '{}',
        "status" TEXT NOT NULL DEFAULT 'open',
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    // 2. Initialize ApplicationDraft
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ApplicationDraft" (
        "id" TEXT PRIMARY KEY,
        "userId" TEXT,
        "roleId" TEXT NOT NULL,
        "fullName" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "progress" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "resumeUrl" TEXT,
        "portfolio" TEXT,
        "github" TEXT,
        "linkedin" TEXT,
        "status" TEXT NOT NULL DEFAULT 'draft',
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    // 3. Auto-seed missing career positions individually by slug
    const existingJobs = await prisma.$queryRawUnsafe<any[]>(`SELECT "slug" FROM "JobRole"`);
    const existingSlugs = new Set((existingJobs || []).map(j => j.slug));

    const seedJobs = [
      {
        slug: "frontend-engineer",
        title: "Frontend Engineer",
        department: "Engineering",
        level: "fresher",
        location: "Remote (Global)",
        remoteType: "Full-Time",
        salaryMin: 90000,
        salaryMax: 130000,
        description: "Craft immersive, cinematically animated web interfaces. Drive academic transparency using beautiful data structures, micro-interactions, and real-time graphs.",
        technologies: ["React", "Next.js", "TypeScript", "Framer Motion", "TailwindCSS"],
        fresherRequirements: JSON.stringify({
          overview: "Join as an ambitious associate developer. Show off your passion projects, deep clean React fundamentals, and excellent communication.",
          responsibilities: [
            "Implement beautiful glassmorphic layout styles using pure CSS and Tailwind.",
            "Translate Figma files into pixel-perfect, highly responsive React structures.",
            "Debug telemetry graphs and audit state management trees.",
            "Contribute to documentation UI upgrades and accessible navigation designs."
          ],
          requirements: [
            "Strong mastery of HTML5 semantic tags, CSS animations, and ES6+ JavaScript syntax.",
            "Practical experience constructing web applications using React or Next.js.",
            "Understanding of Git branching workflows and package builders (npm/yarn).",
            "A signature high-fidelity portfolio demonstrating polished design aesthetics."
          ],
          salaryRange: "$90,000 - $110,000 USD",
          interviewRounds: ["Portfolio Review & Screening", "Practical Frontend Canvas challenge", "Culture sync meeting"]
        }),
        experiencedRequirements: JSON.stringify({
          overview: "Lead Frontend Architecture at ContriTrack. Refine performance boundaries, maintain reusable design tokens, and mentor junior colleagues.",
          responsibilities: [
            "Architect high-velocity rendering engines using Next.js Turbopack frameworks.",
            "Refine layout animation speeds using custom Framer Motion variants.",
            "Enforce strict WCAG AA accessibility metrics across workspace dashboards.",
            "Set structural guidelines for shared design systems and state contexts."
          ],
          requirements: [
            "3+ years leading frontend engineering pipelines at scaling tech companies.",
            "Mastery of SSR optimizations, layout shifts prevention, and bundle splits.",
            "Advanced proficiency with Framer Motion, GSAP, or modular webgl engines.",
            "Active contribution history to open source communities or component systems."
          ],
          salaryRange: "$120,000 - $145,000 USD",
          interviewRounds: ["Technical Design Deep-dive", "Advanced System Architecture audit", "Leadership & Values check"]
        })
      },
      {
        slug: "backend-engineer",
        title: "Backend Engineer",
        department: "Engineering",
        level: "experienced",
        location: "Remote (US/Global)",
        remoteType: "Full-Time",
        salaryMin: 110000,
        salaryMax: 160000,
        description: "Architect high-availability API gateways, secure bearer token middleware systems, and telemetry streaming workers mapping directly to PostgreSQL database layers.",
        technologies: ["Node.js", "Prisma", "PostgreSQL", "Docker", "Supabase"],
        fresherRequirements: JSON.stringify({
          overview: "Dive into backend design and relational schemas. Learn safe parameterized query mappings, database normalization, and secure encryption standards.",
          responsibilities: [
            "Assist in drafting relational Prisma schemas and SQL migrations scripts.",
            "Build secure, modular controller endpoints validating JSON schemas.",
            "Monitor gateway execution times and diagnose slow raw queries.",
            "Collaborate with lead architects on database optimization projects."
          ],
          requirements: [
            "Familiarity with Node.js environments and server frameworks (Express/Next.js).",
            "Basic knowledge of relational query languages and tables normalization schemas.",
            "Understanding of encryption protocols (sha256/bcrypt) and REST API principles.",
            "Proven history building backend side-projects with database hooks."
          ],
          salaryRange: "$110,000 - $125,000 USD",
          interviewRounds: ["SQL & Database Schema challenge", "Node REST API creation script", "Culture Fit session"]
        }),
        experiencedRequirements: JSON.stringify({
          overview: "Own data models, high-performance telemetry processing engines, and secure transaction workflows at global scale.",
          responsibilities: [
            "Architect zero-downtime database pipelines handling hundreds of concurrent syncs.",
            "Deploy secure Bearer authentication engines with active Redis/in-memory rate limiters.",
            "Implement robust event-driven webhook ingestion workflows with automated retry mechanics.",
            "Lead security audits and design secure PostgreSQL policies."
          ],
          requirements: [
            "4+ years building secure relational databases and enterprise API microservices.",
            "Deep expertise in raw SQL tuning, database lock avoidance, and connection pools management.",
            "Practical experience deploying scalable container services (Docker/Kubernetes).",
            "Mastery of security paradigms, RLS architectures, and OAuth pipelines."
          ],
          salaryRange: "$140,000 - $160,000 USD",
          interviewRounds: ["System Design & Telemetry Scales", "Live Database Refactoring under lock", "Executive Leadership sync"]
        })
      },
      {
        slug: "full-stack-engineer",
        title: "Full Stack Engineer",
        department: "Engineering",
        level: "hybrid",
        location: "Hybrid (San Francisco)",
        remoteType: "Full-Time",
        salaryMin: 105000,
        salaryMax: 155000,
        description: "Maintain vertical features end-to-end. Bridge elegant frontend components with robust PostgreSQL backends, building modular, performant collaborative workspaces.",
        technologies: ["Next.js", "TypeScript", "PostgreSQL", "TailwindCSS", "Prisma"],
        fresherRequirements: JSON.stringify({
          overview: "Begin your full-stack roadmap building responsive collaborative dashboards and structured databases under active developer mentoring.",
          responsibilities: [
            "Develop responsive, fully-typed UI layouts tied to real database triggers.",
            "Write reliable unit tests across both frontend blocks and server actions.",
            "Coordinate Git sync branches and participate in code reviews.",
            "Debug layout misalignments and refactor basic database fetchers."
          ],
          requirements: [
            "Proficiency with modern TypeScript, React patterns, and Node.js frameworks.",
            "Practical understanding of SQL query formats and relational schema layers.",
            "Familiarity with CSS variables, responsive design rules, and Git tools.",
            "Energetic collaborative mindset and strong technical curiosity."
          ],
          salaryRange: "$105,000 - $120,000 USD",
          interviewRounds: ["Full-Stack Telemetry app assembly", "API Mappings & Data binding review", "Mentoring & Team sync"]
        }),
        experiencedRequirements: JSON.stringify({
          overview: "Architect flexible SaaS workspace portals, coordinate platform integrations, and maintain security parities.",
          responsibilities: [
            "Lead modular full-stack product iterations with zero production interruptions.",
            "Refine complex data fetch latencies using specialized edge pooling and server actions.",
            "Enforce end-to-end type safety constraints across the whole workspace codebase.",
            "Design high-performance webhook handlers and real-time sync adapters."
          ],
          requirements: [
            "3+ years managing full-stack production deployments and relational schemas.",
            "Thorough expertise with TypeScript interfaces, Prisma queries, and React architecture.",
            "Demonstrated track record preventing race conditions and optimizing layout shifts.",
            "Strong product-centric engineering vision and cross-functional leadership skills."
          ],
          salaryRange: "$135,000 - $155,000 USD",
          interviewRounds: ["Product Engineering System design", "Secure Application assembly under load", "Product Strategy sync"]
        })
      },
      {
        slug: "cloud-computing-engineer",
        title: "Cloud Computing Engineer",
        department: "Infrastructure",
        level: "experienced",
        location: "Remote (Global)",
        remoteType: "Full-Time",
        salaryMin: 120000,
        salaryMax: 170000,
        description: "Scale high-performance cloud resources, secure remote networks, manage Docker deployments, and optimize data latency patterns using serverless edge infrastructures.",
        technologies: ["AWS", "Docker", "Kubernetes", "Terraform", "Serverless"],
        fresherRequirements: JSON.stringify({
          overview: "Dive deep into cloud operations. Learn infrastructure as code, container structures, server configuration, and secure edge routing.",
          responsibilities: [
            "Assist in managing basic AWS services (EC2, S3, IAM policies).",
            "Maintain container logs and verify server status statistics.",
            "Write basic shell scripts to automate local developer environment tasks.",
            "Coordinate deployment schedules and support build setups."
          ],
          requirements: [
            "Familiarity with cloud principles and basic container tools (Docker).",
            "Understanding of networking layers, port configurations, and protocols (HTTPS).",
            "Proficiency with command line interfaces and basic Linux operations.",
            "Eagerness to study modern infrastructure automation paradigms."
          ],
          salaryRange: "$120,000 - $135,000 USD",
          interviewRounds: ["Cloud Architecture screening", "Terminal scripting & container sync", "Culture Alignment session"]
        }),
        experiencedRequirements: JSON.stringify({
          overview: "Architect highly scalable cloud services, secure container patterns, and manage continuous delivery arrays.",
          responsibilities: [
            "Construct stable environments using code-driven configurations (Terraform).",
            "Deploy secure clustering configurations handling hundreds of transactions.",
            "Assert absolute system security profiles and minimize deployment cycles.",
            "Monitor operational budgets and optimize cloud database costs."
          ],
          requirements: [
            "3+ years managing complex high-availability cloud platforms.",
            "Practical expertise in server configurations, load balancers, and VPC setups.",
            "Proven mastery deploying container clusters using Kubernetes or similar engines.",
            "Relevant certifications in cloud engineering or security setups."
          ],
          salaryRange: "$150,000 - $170,000 USD",
          interviewRounds: ["AWS Terraform Scalability task", "Network failure diagnosis session", "Director Strategy sync"]
        })
      },
      {
        slug: "ai-ml-engineer",
        title: "AI/ML Engineer",
        department: "Engineering",
        level: "hybrid",
        location: "Hybrid (Seattle)",
        remoteType: "Full-Time",
        salaryMin: 130000,
        salaryMax: 180000,
        description: "Integrate LLM model pipelines, compile user git telemetry summaries, automate task tracking reports, and construct intelligent work anomaly metrics.",
        technologies: ["Python", "TensorFlow", "OpenAI API", "PyTorch", "Next.js"],
        fresherRequirements: JSON.stringify({
          overview: "Master modern AI/ML integration. Apply models to active data feeds, manage semantic lookups, and test intelligent response quality.",
          responsibilities: [
            "Help build responsive prompts and format JSON payload parameters.",
            "Evaluate algorithm accuracy statistics and analyze edge cases.",
            "Integrate standard model APIs with active web backend tools.",
            "Maintain regression test suites for machine learning scripts."
          ],
          requirements: [
            "Strong familiarity with Python, data manipulation libraries (NumPy/Pandas).",
            "Knowledge of API models, vector datastores, and token structures.",
            "Familiarity with modern machine learning theories and data formatting.",
            "A creative portfolio presenting active machine learning projects."
          ],
          salaryRange: "$130,000 - $145,000 USD",
          interviewRounds: ["Data processing & Prompt analysis", "Python ML API Integration code challenge", "Culture sync"]
        }),
        experiencedRequirements: JSON.stringify({
          overview: "Lead ML systems design, optimize custom embeddings networks, and manage complex pipeline architectures.",
          responsibilities: [
            "Architect high-velocity analytics loops compiling contributor statistics.",
            "Manage semantic memory nodes using secure relational vector architectures.",
            "Deploy automated models checking code patterns with low latency.",
            "Manage operational budgets for model requests and optimize token footprints."
          ],
          requirements: [
            "3+ years leading AI/ML deployments at tech scale.",
            "Deep expertise in prompt engineering, model tuning, and database formats.",
            "Thorough proficiency deploying models in scalable Node/Python pipelines.",
            "Background in mathematical optimization or telemetry data systems."
          ],
          salaryRange: "$160,000 - $180,000 USD",
          interviewRounds: ["ML System Design & prompt architecture", "Vector Datastore & latency audit", "Executive values session"]
        })
      },
      {
        slug: "devops-engineer",
        title: "DevOps Engineer",
        department: "Infrastructure",
        level: "fresher",
        location: "Remote (Global)",
        remoteType: "Full-Time",
        salaryMin: 100000,
        salaryMax: 145000,
        description: "Maintain solid release checks, verify CI/CD scripts, ensure developer workflows stay rapid, and monitor active server parities.",
        technologies: ["Docker", "GitHub Actions", "AWS", "Bash", "Linux"],
        fresherRequirements: JSON.stringify({
          overview: "Start your DevOps route. Learn workflow automations, release schedules, container structures, and log management tools.",
          responsibilities: [
            "Construct and verify basic deploy actions using GitHub Actions.",
            "Analyze deployment reports and alert on build failures.",
            "Write basic configuration scripts to configure local developers.",
            "Help monitor live server status indicators."
          ],
          requirements: [
            "Familiarity with Git systems, branching rules, and build tools.",
            "Basic understanding of server containers (Docker) and configurations.",
            "Working knowledge of Unix shell environments and bash scripting.",
            "Enthusiastic attitude toward automation and infrastructure scaling."
          ],
          salaryRange: "$100,000 - $115,000 USD",
          interviewRounds: ["GitHub Actions workflow screening", "Docker container build script", "Team Culture sync"]
        }),
        experiencedRequirements: JSON.stringify({
          overview: "Lead DevOps setups, construct absolute security matrices, and automate global platform deployments.",
          responsibilities: [
            "Architect complex, secure continuous delivery routes.",
            "Enforce absolute security setups across database structures.",
            "Formulate detailed analytics systems capturing response delays.",
            "Optimize build durations and manage cloud operations budgets."
          ],
          requirements: [
            "3+ years managing operational production delivery frameworks.",
            "Thorough expertise with CI/CD scripts, container tools, and cloud networks.",
            "Proven history implementing system failovers and monitoring loops.",
            "Strong communication skills and collaborative leadership history."
          ],
          salaryRange: "$130,000 - $145,000 USD",
          interviewRounds: ["CI/CD Architecture optimization task", "Live server recovery drill", "Director Strategy check"]
        })
      },
      {
        slug: "ui-ux-designer",
        title: "UI/UX Designer",
        department: "Design",
        level: "fresher",
        location: "Remote (Global)",
        remoteType: "Full-Time",
        salaryMin: 80000,
        salaryMax: 120000,
        description: "Design gorgeous layout guidelines, pair high-end typography, establish interactive prototypes, and align visual elements to present champagne luxury aesthetics.",
        technologies: ["Figma", "CSS Grid", "Design Systems", "Prototypes", "TailwindCSS"],
        fresherRequirements: JSON.stringify({
          overview: "Build modern academic designs. Learn luxury layout configurations, high-end type setups, and modern interface animations.",
          responsibilities: [
            "Create interactive prototypes using modern layout properties in Figma.",
            "Assist in managing the team shared design libraries and variables.",
            "Participate in user reviews and translate responses into designs.",
            "Verify interface margins and ensure designs render pixel-perfect."
          ],
          requirements: [
            "Mastery of Figma tools, components configurations, and prototyping.",
            "Strong eye for luxury design aesthetics, spatial alignment, and type.",
            "Understanding of HTML/CSS capabilities and grid layouts.",
            "A portfolio demonstrating beautiful web interface designs."
          ],
          salaryRange: "$80,000 - $95,000 USD",
          interviewRounds: ["Portfolio review & spatial analysis", "Figma interface composition task", "Design Culture sync"]
        }),
        experiencedRequirements: JSON.stringify({
          overview: "Lead Design Strategy, maintain premium tokens libraries, and orchestrate interactive user journeys.",
          responsibilities: [
            "Own product guidelines and maintain consistent luxury styles.",
            "Design complex interactive layouts presenting rich academic statistics.",
            "Validate interface usability using telemetry data and research.",
            "Collaborate with developers to ensure design details match build outputs."
          ],
          requirements: [
            "3+ years creating premium interfaces at tech scaling startups.",
            "Deep expertise building massive, flexible design systems in Figma.",
            "Complete understanding of animation principles and UX patterns.",
            "Excellent communication skills and background managing designers."
          ],
          salaryRange: "$105,000 - $120,000 USD",
          interviewRounds: ["Design Portfolio Deep-dive", "Product UX redesign task", "Executive Brand alignment check"]
        })
      },
      {
        slug: "product-designer",
        title: "Product Designer",
        department: "Design",
        level: "experienced",
        location: "Remote (Global)",
        remoteType: "Full-Time",
        salaryMin: 95000,
        salaryMax: 140000,
        description: "Lead product designs end-to-end. Bridge user research with beautiful interactive layouts, establishing product vision and maintaining clean UX paths.",
        technologies: ["Figma", "Prototypes", "User Research", "TailwindCSS", "CSS Grid"],
        fresherRequirements: JSON.stringify({
          overview: "Begin your product design roadmap. Learn product strategies, user research, wireframes, and design testing systems.",
          responsibilities: [
            "Create detailed mockups and wireframes for desktop and mobile layouts.",
            "Perform user interviews and document qualitative findings.",
            "Help verify responsive structures across standard device viewpoints.",
            "Draft design descriptions and support builder teams."
          ],
          requirements: [
            "Strong familiarity with interface layouts, Figma, and prototyping.",
            "Knowledge of user-centric designs, usability principles, and grids.",
            "Basic understanding of code parameters and layout frameworks.",
            "Portfolio presenting active product interface experiments."
          ],
          salaryRange: "$95,000 - $110,000 USD",
          interviewRounds: ["Portfolio presentation & UX critique", "Responsive wireframe draft exercise", "Team sync"]
        }),
        experiencedRequirements: JSON.stringify({
          overview: "Lead Product UX, outline core feature layouts, and manage platform design directions.",
          responsibilities: [
            "Translate broad conceptual requirements into highly-detailed layouts.",
            "Deploy structured research loops asserting usability benchmarks.",
            "Define modular tokens libraries and lead layout system designs.",
            "Formulate user retention layouts and present models to leaders."
          ],
          requirements: [
            "3+ years managing complex SaaS product layouts.",
            "Thorough expertise with Figma structures, design patterns, and research.",
            "Demonstrated history of driving product metrics through spatial UX.",
            "Collaborative leadership history and excellent presentation skills."
          ],
          salaryRange: "$120,000 - $140,000 USD",
          interviewRounds: ["Product Strategy & design critique", "Complex SaaS interface task", "Founder values check"]
        })
      },
      {
        slug: "developer-relations",
        title: "Developer Relations",
        department: "Marketing",
        level: "hybrid",
        location: "Remote (Global)",
        remoteType: "Full-Time",
        salaryMin: 85000,
        salaryMax: 130000,
        description: "Bridge external developers with ContriTrack's API features. Design walkthrough guides, organize telemetry webinars, and support active community libraries.",
        technologies: ["API Integrations", "Technical Writing", "Next.js", "GitHub", "Community"],
        fresherRequirements: JSON.stringify({
          overview: "Start your DevRel track. Draft simple quickstart guides, write API sample integrations, and engage with developers.",
          responsibilities: [
            "Write clear, readable tutorials explaining API configurations.",
            "Moderate community communication pipelines and assist developers.",
            "Help coordinate developer hackathons and student events.",
            "Record basic walkthrough videos presenting product integrations."
          ],
          requirements: [
            "Experience with technical writing or active content creation.",
            "Strong communication skills and enthusiasm for developer tools.",
            "Familiarity with web principles (JavaScript/GitHub operations).",
            "Active presence in developer student clubs or community groups."
          ],
          salaryRange: "$85,000 - $100,000 USD",
          interviewRounds: ["Writing & technical presentation screening", "Technical tutorial outline task", "Community Fit session"]
        }),
        experiencedRequirements: JSON.stringify({
          overview: "Orchestrate DevRel strategies, build active global student developer frameworks, and write comprehensive technical specs.",
          responsibilities: [
            "Lead outreach programs connecting thousands of developer hubs.",
            "Author high-level technical documentation explaining platform APIs.",
            "Deliver keynote presentations representing the product at CS events.",
            "Translate community feedback into concrete product requirements."
          ],
          requirements: [
            "3+ years leading Developer Relations or Developer Outreach.",
            "Thorough proficiency authoring highly-regarded technical content.",
            "Public history of active speaking or community leadership roles.",
            "Excellent coding skills in modern web configurations."
          ],
          salaryRange: "$110,000 - $125,000 USD",
          interviewRounds: ["Developer Content & Strategy critique", "API Tutorial live writing task", "VP Outreach sync"]
        })
      },
      {
        slug: "technical-program-coordinator",
        title: "Technical Program Coordinator",
        department: "Operations",
        level: "fresher",
        location: "Remote (Global)",
        remoteType: "Full-Time",
        salaryMin: 75000,
        salaryMax: 110000,
        description: "Coordinate team sprint milestones, manage task tracking setups, organize retrospective reviews, and ensure clean async collaboration.",
        technologies: ["Agile", "Kanban", "GitHub Projects", "Operations"],
        fresherRequirements: JSON.stringify({
          overview: "Start your program management track. Learn agile setups, milestone schedules, backlog audits, and teamwork coordinates.",
          responsibilities: [
            "Organize daily backlog status audits and document blockers.",
            "Support coordinators in scheduling retrospective meetings.",
            "Maintain task dashboards and ensure assignee details remain current.",
            "Prepare weekly progress summaries for review."
          ],
          requirements: [
            "Exceptional structural skills and thorough scheduling precision.",
            "Basic understanding of Agile software development principles.",
            "Familiarity with task boards (Trello/GitHub Projects/Jira).",
            "Clear communication style and excellent written skills."
          ],
          salaryRange: "$75,000 - $90,000 USD",
          interviewRounds: ["Sprint scheduling & organization screening", "Task tracking dashboard audit task", "Team Operations sync"]
        }),
        experiencedRequirements: JSON.stringify({
          overview: "Own platform program execution, coordinate massive development sprints, and optimize async workspace setups.",
          responsibilities: [
            "Define global product roadmap milestones and check timelines.",
            "Orchestrate major engineering sprints involving multiple teams.",
            "Establish highly-efficient async collaborative guidelines.",
            "Diagnose workflow bottlenecks and optimize operations throughput."
          ],
          requirements: [
            "3+ years leading technical program operations.",
            "Thorough expertise with Agile setups, timeline maps, and backlog management.",
            "Proven history of successfully executing massive developer releases.",
            "Superb communication skills and leadership traits."
          ],
          salaryRange: "$95,000 - $110,000 USD",
          interviewRounds: ["Program Roadmap & Milestones design", "Emergency Release mitigation task", "VP Operations sync"]
        })
      }
    ];

    let seededCount = 0;
    for (const job of seedJobs) {
      if (!existingSlugs.has(job.slug)) {
        const jobId = crypto.randomUUID();
        await prisma.$executeRawUnsafe(`
          INSERT INTO "JobRole" (
            "id", "slug", "title", "department", "level", "location", "remoteType", 
            "salaryMin", "salaryMax", "description", "fresherRequirements", "experiencedRequirements", 
            "technologies", "status", "createdAt"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'open', NOW())
        `,
          jobId,
          job.slug,
          job.title,
          job.department,
          job.level,
          job.location,
          job.remoteType,
          job.salaryMin,
          job.salaryMax,
          job.description,
          job.fresherRequirements,
          job.experiencedRequirements,
          job.technologies
        );
        seededCount++;
      }
    }
    if (seededCount > 0) {
      console.log(`Seeded ${seededCount} missing ContriTrack career positions successfully!`);
    }
  } catch (error) {
    console.error("Error checking or seeding recruiting tables:", error);
  }
}

export interface JobRoleMetadata {
  id: string;
  slug: string;
  title: string;
  department: string;
  level: string;
  location: string;
  remoteType: string;
  salaryMin: number;
  salaryMax: number;
  description: string;
  fresherRequirements: string;
  experiencedRequirements: string;
  technologies: string[];
  status: string;
  createdAt: string;
}

/**
 * Retrieve all open jobs in the platform
 */
export async function getJobRolesAction(): Promise<JobRoleMetadata[]> {
  try {
    await ensureRecruitingTablesExist();

    const jobs = await prisma.$queryRawUnsafe<any[]>(`
      SELECT * FROM "JobRole"
      WHERE "status" = 'open'
      ORDER BY "createdAt" DESC
    `);

    return jobs.map(j => ({
      id: j.id,
      slug: j.slug,
      title: j.title,
      department: j.department,
      level: j.level,
      location: j.location,
      remoteType: j.remoteType,
      salaryMin: j.salaryMin,
      salaryMax: j.salaryMax,
      description: j.description,
      fresherRequirements: j.fresherRequirements,
      experiencedRequirements: j.experiencedRequirements,
      technologies: Array.isArray(j.technologies) ? j.technologies : [],
      status: j.status,
      createdAt: new Date(j.createdAt).toISOString()
    }));
  } catch (error) {
    console.error("Failed to query open job roles:", error);
    return [];
  }
}

/**
 * Retrieve a specific open job role using its unique slug parameter
 */
export async function getJobRoleBySlugAction(slug: string): Promise<JobRoleMetadata | null> {
  try {
    await ensureRecruitingTablesExist();

    const jobs = await prisma.$queryRawUnsafe<any[]>(`
      SELECT * FROM "JobRole"
      WHERE "slug" = $1 AND "status" = 'open'
      LIMIT 1
    `, slug);

    if (jobs.length === 0) return null;
    const j = jobs[0];

    return {
      id: j.id,
      slug: j.slug,
      title: j.title,
      department: j.department,
      level: j.level,
      location: j.location,
      remoteType: j.remoteType,
      salaryMin: j.salaryMin,
      salaryMax: j.salaryMax,
      description: j.description,
      fresherRequirements: j.fresherRequirements,
      experiencedRequirements: j.experiencedRequirements,
      technologies: Array.isArray(j.technologies) ? j.technologies : [],
      status: j.status,
      createdAt: new Date(j.createdAt).toISOString()
    };
  } catch (error) {
    console.error("Failed to query job by slug:", error);
    return null;
  }
}

/**
 * Register a new applicant draft details
 */
export async function createApplicationDraftAction(payload: {
  roleId: string;
  fullName: string;
  email: string;
  portfolio?: string;
  github?: string;
  linkedin?: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    await ensureRecruitingTablesExist();
    const { roleId, fullName, email, portfolio = "", github = "", linkedin = "" } = payload;

    if (!roleId || !fullName || !email) {
      return { success: false, error: "Required details are missing." };
    }

    const draftId = crypto.randomUUID();
    await prisma.$executeRawUnsafe(`
      INSERT INTO "ApplicationDraft" (
        "id", "roleId", "fullName", "email", "progress", "portfolio", "github", "linkedin", "status", "createdAt"
      ) VALUES ($1, $2, $3, $4, 100.0, $5, $6, $7, 'submitted', NOW())
    `,
      draftId,
      roleId,
      fullName,
      email,
      portfolio,
      github,
      linkedin
    );

    return { success: true, id: draftId };
  } catch (error) {
    console.error("Failed to record application draft:", error);
    return { success: false, error: (error as Error).message };
  }
}
