# 01 — Architecture Decision Records (ADR)

## ADR-001: Full-Stack Framework — Next.js 16 App Router with TypeScript
- **Status:** Accepted
- **Context:** Tavi combines SEO-indexed public/authorized educational pages (`/`, `/calculator`, `/study-resources/[subject]`, `/solution/[id]`, `/writing-examples`, `/blog`) with rich interactive client workspaces (`/atlas`, `/course`, `/search-question`, Image Cropper, Symbolic Calculator, and Admin Console).
- **Decision:** Build the application on **Next.js 16 (App Router)** with React 19 and strict TypeScript. Server Components and Route Handlers (`/api/*`) power data persistence, authentication, and AI orchestration, while Client Components with Zustand state management drive interactive canvases, math keypads, and streaming/stepwise solvers.
- **Consequences:** Unified repository, zero CORS overhead, fast server-rendered initial loads, and seamless API Route integration with Prisma and NextAuth.

---

## ADR-002: Dual-Database Prisma 7 Architecture (SQLite Local + PostgreSQL Production)
- **Status:** Accepted
- **Context:** Local development and CI/E2E verification require zero-dependency embedded SQLite (`file:./dev.db`), while production deployments require horizontally scalable PostgreSQL.
- **Decision:** Use **Prisma 7** with driver adapters (`@prisma/adapter-better-sqlite3` for local SQLite via `prisma/schema.prisma` and `@prisma/adapter-pg` for PostgreSQL via `prisma/schema.postgres.prisma`). All enum-like status and role fields are modeled as portable `String` columns with strict TypeScript union validation in the application layer.
- **Consequences:** 100% schema parity between local SQLite and production PostgreSQL without native enum migration incompatibilities.

---

## ADR-003: Invite-Only Account Admission, Role-Based Access Control, Revocation & Audit Logging
- **Status:** Accepted
- **Reference:** `../Arcade` (`src/lib/account-admission/*` & `docs/NEXTAUTH_INVITE_ONLY_SPEC.md`)
- **Context:** The application requires Auth.js / NextAuth authentication with invite-only registration, single-use/expiring invitation codes, role-based access control (`ADMIN`, `TUTOR`, `STUDENT`), immediate account revocation, and immutable audit logging. Furthermore, per security policy, **no HTTP bootstrap admin endpoint may ever be exposed**.
- **Decision:**
  1. **Fail-Closed Admission (`ACCOUNT_ADMISSION_MODE=invitation-only`)**: Public self-registration without a valid invitation token/code is rejected (`403 invitation_required`).
  2. **Cryptographic Token Hashing**: Invitation tokens are generated with 32 bytes of CSPRNG entropy (`base64url`) alongside human-readable single-use codes (`TAVI-XXXX-XXXX`). Only SHA-256 `tokenHash` is stored for secret links; upon acceptance, revocation, or expiration, `tokenHash` and `activeForEmail` are cleared.
  3. **CLI-Only Admin Bootstrap (`npm run bootstrap:admin`)**: Root administrator accounts are provisioned exclusively via `scripts/bootstrap-admin.ts` (`--email <email> --password-stdin`). Zero HTTP bootstrap routes exist.
  4. **Immediate Revocation Enforcement**: Every JWT/session callback re-verifies `user.status !== "REVOKED"` against the database, immediately blocking revoked users and logging `REVOKED_USER_LOGIN_BLOCKED` in `AuditLog`.
- **Consequences:** Eliminates privilege-escalation surfaces while giving administrators full lifecycle control over invitations, user roles, account revocation, and security audit trails.

---

## ADR-004: Pluggable AI Provider Architecture (`@github/copilot-sdk` + Azure OpenAI + Deterministic Symbolic Engine)
- **Status:** Accepted
- **Context:** The application needs AI capability powered by `@github/copilot-sdk` calling Copilot models today, with a clean runtime/configuration switch to **Azure OpenAI** (`AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_DEPLOYMENT`) later, plus guaranteed high-speed reliability even in offline/air-gapped test environments.
- **Decision:** Implement a unified `AiProviderRegistry` (`src/lib/ai/provider.ts`) supporting three pluggable strategies:
  1. **Copilot SDK Adapter (`copilot`)**: Uses `CopilotClient` from `@github/copilot-sdk` to create a stateless session with domain-specific system prompts (`HomeworkSolver`, `AtlasStoryGenerator`, `AcademyCourseBuilder`, `WritingTutor`) and structured JSON/Markdown output parsing.
  2. **Azure OpenAI Adapter (`azure-openai`)**: Uses REST Chat Completions against the configured Azure OpenAI deployment with automatic timeout and retry handling.
  3. **Deterministic Symbolic CAS & Domain Knowledge Fallback (`symbolic-engine`)**: Always computes exact algebraic, calculus, matrix, statistics, and STEM solutions first and enriches or falls back gracefully if external LLM credentials are unconfigured or rate-limited.
- **Consequences:** Administrators or environment variables (`AI_PROVIDER=auto|copilot|azure-openai`) can switch AI backends at runtime without changing any caller code.

---

## ADR-005: Hybrid Symbolic Computer Algebra System (CAS) + LLM Step-by-Step Pedagogical Solver
- **Status:** Accepted
- **Context:** Pure LLMs occasionally hallucinate arithmetic or algebraic manipulations, whereas pure symbolic calculators lack natural-language `"How" and "Why"` pedagogical explanations across word problems and non-math STEM subjects (Chemistry, Physics, Biology, Economics).
- **Decision:** Implement a two-stage **Hybrid Neuro-Symbolic Solver (`src/lib/math-engine/`)**:
  - **Stage 1 (Deterministic Symbolic CAS)**: Tokenizes mathematical expressions/equations into an Abstract Syntax Tree (AST), classifies problem type (linear/quadratic/quartic/polynomial equation, system of linear equations, inequality, absolute value, radical, logarithm, derivative, definite/indefinite integral, limit, matrix, statistics, trigonometry), computes exact symbolic & numerical results, and emits an ordered sequence of verified algebraic transformation steps.
  - **Stage 2 (Pedagogical Step & Deep-Thinking Enricher)**: Formats each step with KaTeX/LaTeX markup, attaches `"How & Why"` conceptual tips, generates interactive 2D function plots (`svg` coordinate plotter with root/extremum/asymptote markers), and invokes the active AI provider (`Copilot SDK` / `Azure OpenAI`) for open-ended STEM word problems, essay critiques, Atlas stories, and follow-up tutoring.

---

## ADR-006: Client+Server Interactive 8-Handle Image Crop & OCR Math Extraction Pipeline
- **Status:** Accepted
- **Context:** A signature Tavi workflow is uploading or pasting a homework photo and cropping a single question (`"Crop one question at a time"`) with rotation and zoom before OCR extraction.
- **Decision:** Build an HTML5 Canvas interactive crop modal supporting 8 resize handles (`NW, N, NE, E, SE, S, SW, W`), 90° clockwise/counter-clockwise rotation, zoom (`50%–300%`), and region extraction to a normalized data URL. The cropped image is sent to `/api/ocr` which extracts text/LaTeX using canvas pattern recognition + AI Vision/OCR and pipes the extracted prompt directly into the Homework Solver.
