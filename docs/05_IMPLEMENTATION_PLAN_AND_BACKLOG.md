# 05 — Implementation Plan & Prioritized Task Backlog

## 1. Phased Implementation Plan

### Phase 1: Discovery & Specification (`COMPLETED`)
- Systematic Playwright exploration of `https://www.gauthmath.com` using `.cred` cookies across Desktop (`1440×900`), Tablet (`768×1024`), and Mobile (`390×844`).
- Captured 26 screenshots covering Home, Sidebar Resources, Gauth PLUS Modal & Page, Image Crop Modal, AI Calculator (`Basic` & `Functions` keypads + solved result), Gauth Atlas gallery & interactive story player, Gauth Academy course catalog & interactive simulation player, Study Resources, Solution Details (Calculus & Chemistry), Writing Examples, Blog, Download, About Us, and Honor Code.
- Authored ADR, PRD, Technical Specification, Architecture & Data Model, Implementation Plan, and Acceptance Criteria documents.

### Phase 2: Project Scaffolding & Dual-Database Prisma Layer
- Initialize `package.json` with Next.js 16, React 19, NextAuth 4.24.15, Prisma 7 (`@prisma/adapter-better-sqlite3` & `@prisma/adapter-pg`), `@github/copilot-sdk`, Tailwind CSS, and Lucide icons.
- Create `prisma/schema.prisma` (SQLite) and `prisma/schema.postgres.prisma` (PostgreSQL), `prisma.config.ts`, initial SQL migration, and `src/lib/prisma.ts`.
- Create comprehensive `prisma/seed.ts` pre-populating:
  - Default accounts (`admin@gauthmath.local`, `tutor@gauthmath.local`, `student@gauthmath.local`, plus `joshuah@gauthmath.local` matching the `.cred` persona).
  - Pre-seeded `AccountInvitation` codes (`GAUTH-2026-VIP1`, `GAUTH-TUTOR-2026`, plus expired/revoked test fixtures).
  - Rich Study Bank (`HomeworkQuestion` items across all 12 subjects including exact Gauthmath Calculus differentiation, Quadratic equations, Chemistry $SF_6$, Physics, Biology, Economics monopoly, and Statistics problems).
  - Curated `AtlasStory` visual adventures (*Empires of the Silk Roads*, *Apollo 11 Moon Mission Journey*, *The Quantum Double-Slit Experiment*, *Inside the Human Heart & Conduction System*, *Anatomy of a Gothic Cathedral*).
  - Curated `AcademyCourse` interactive courses (*The Sweet Spot*, *Bending the Light*, *How Noise-Cancelling Headphones Work*, *Golgi Apparatus and Protein Sorting*, *Atomic Number and Element Identity*).
  - Curated `WritingDocument` essay examples across all 11 essay genres.

### Phase 3: Invite-Only Authentication, RBAC, Revocation & CLI Bootstrap
- Implement `src/lib/account-admission/` (`errors.ts`, `policy.ts`, `tokens.ts`, `passwords.ts`, `audit.ts`, `bootstrap.ts`, `invitations.ts`, `registration.ts`, `index.ts`).
- Implement `scripts/bootstrap-admin.ts` (`npm run bootstrap:admin -- --email <email> --password-stdin`) with zero HTTP bootstrap endpoints.
- Implement NextAuth configuration (`src/lib/auth.ts`) with `PasswordCredential` verification, live `REVOKED` account check, and audit logging.
- Build `/auth` (Sign In + Invite-Only Registration tab) and `/invite/[token]` (One-Click Invitation Acceptance page).

### Phase 4: Core Symbolic Math Engine & Pluggable AI SDK
- Implement `src/lib/math-engine/`:
  - `solver.ts`: Symbolic & numerical solver for linear/quadratic/biquadratic equations, $2\times 2$ systems of equations, inequalities, absolute value, radical, logarithmic equations, symbolic derivatives (product, quotient, chain, power rules), definite/indefinite integrals, limits, matrices, combinatorics ($P_n^k, C_n^k, n!$), and descriptive statistics.
  - `grapher.ts`: Discontinuity-aware 2D function evaluator with root, y-intercept, and local extrema extraction.
- Implement `src/lib/ai/provider.ts`:
  - Pluggable `@github/copilot-sdk` (`CopilotClient`) + Azure OpenAI (`AZURE_OPENAI_*`) + deterministic symbolic/domain synthesis fallback.

### Phase 5: Full-Stack API Routes & Responsive Gauthmath UI Workspaces
- Implement API routes (`/api/questions/solve`, `/api/questions/[id]`, `/api/questions/[id]/chat`, `/api/calculator/evaluate`, `/api/ocr`, `/api/atlas`, `/api/courses`, `/api/writing`, `/api/subscription`, `/api/admin/*`).
- Implement shared Gauth navigation shell (`Sidebar` with collapsible rail, `Resources` accordion, quota card, `GauthPlusModal`, `MathKeyboardModal`, `ImageCropModal`, and responsive mobile drawer).
- Implement all pages: `/`, `/search-question`, `/solution/[id]`, `/calculator`, `/atlas`, `/course`, `/study-resources`, `/writing-examples`, `/plus`, `/blog`, `/download`, `/aboutus`, `/honor`, `/auth`, `/invite/[token]`, and `/admin`.

### Phase 6: Automated Verification (Unit Tests, Production Build & E2E Playwright Suite)
- Run unit tests verifying the Symbolic CAS Engine, 2D Grapher, and Invite-Only Account Admission invariants.
- Run `npm run build` to verify TypeScript and Next.js production compilation.
- Run comprehensive Playwright E2E test suite verifying every route, feature combination, modal, role, invitation lifecycle, revocation gate, and responsive viewport.

---

## 2. Prioritized Task Backlog

| ID | Priority | Epic | Task | Status |
|---|---|---|---|---|
| `B-01` | P0 | Discovery | Playwright exploration of `gauthmath.com` with `.cred` & 26 screenshots | Done |
| `B-02` | P0 | Docs | Complete ADR, PRD, Spec, Architecture, Plan, Parity docs in `docs/` | In Progress |
| `B-03` | P0 | Database | Dual SQLite/PostgreSQL Prisma 7 schema, migrations, and seed data | Pending |
| `B-04` | P0 | Security | Invite-only admission, single-use/expiring codes, revocation, audit logs, CLI `bootstrap:admin` | Pending |
| `B-05` | P0 | Core AI/Math | Pluggable AI (`@github/copilot-sdk` + Azure OpenAI) & Symbolic CAS + 2D Grapher | Pending |
| `B-06` | P0 | UI — Solver | Home Homework Helper, Math Keyboard, 8-Handle Image Crop Modal, `/search-question`, `/solution/[id]` | Pending |
| `B-07` | P0 | UI — Calc | `/calculator` with `Basic`/`Functions`/`abc` keypad, 22 calculators, sample questions & live graphing | Pending |
| `B-08` | P1 | UI — Atlas | `/atlas` Gauth Atlas gallery, prompt generator & interactive hotspot visual story player | Pending |
| `B-09` | P1 | UI — Academy | `/course` Gauth Academy generator (`Infinite`/`Lecture`) & interactive physics/STEM course player | Pending |
| `B-10` | P1 | UI — Resources | `/study-resources`, `/writing-examples`, `/plus`, `/blog`, `/download`, `/aboutus`, `/honor`, `/admin` | Pending |
| `B-11` | P0 | QA | Unit tests + E2E Playwright verification across all features, roles, and viewports | Pending |
