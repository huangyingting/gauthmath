# Gauth AI Study Companion & STEM Homework Platform

A full-stack Next.js 16 + Auth.js/NextAuth + Prisma 7 study-platform prototype informed by browser exploration of `https://www.gauthmath.com`. It includes an initial mathjs-based solver, SVG graphing, Copilot/Azure completion helpers, and invitation-management workflows.

**Implementation status:** Not production-ready. The core review found incorrect mathematical results, unsupported requests labeled as verified, misleading provider provenance, preset-only OCR, and gaps in ownership, atomicity, and deployment migrations. The original specs describe targets, not verified feature parity. Start with the [core review](./docs/07_CORE_SYSTEM_REVIEW.md) and [improvement plan](./docs/08_CORE_SYSTEM_IMPROVEMENT_PLAN.md).

---

## 1. Documentation & Exploration Artifacts

All architectural, product, algorithm, and parity documents live in `docs/`:

- [`docs/00_EXPLORATION_COVERAGE.md`](./docs/00_EXPLORATION_COVERAGE.md) — Systematic Playwright exploration across Desktop (`1440×900`), Tablet (`768×1024`), and Mobile (`390×844`) viewports, 26 captured screenshots in `screenshots/`, and 1,067 network/API telemetry events.
- [`docs/01_ADR.md`](./docs/01_ADR.md) — Architecture Decision Records (Hybrid Symbolic + LLM pipeline, Pluggable AI SDK, Dual SQLite/PostgreSQL Prisma 7 adapters, CLI-only admin bootstrap).
- [`docs/02_PRD.md`](./docs/02_PRD.md) — Product Requirements Document covering all 12 subjects, user personas, and workflows.
- [`docs/03_TECHNICAL_SPEC.md`](./docs/03_TECHNICAL_SPEC.md) — Deep dive into the Symbolic Math/STEM Solver, Adaptive 2D Function Grapher, OCR Cropper, and Pluggable AI Adapter.
- [`docs/04_ARCHITECTURE_AND_DATA_MODEL.md`](./docs/04_ARCHITECTURE_AND_DATA_MODEL.md) — System architecture & 11-model Prisma schema specification.
- [`docs/05_IMPLEMENTATION_PLAN_AND_BACKLOG.md`](./docs/05_IMPLEMENTATION_PLAN_AND_BACKLOG.md) — Phased implementation plan and task backlog.
- [`docs/06_ACCEPTANCE_CRITERIA_AND_PARITY.md`](./docs/06_ACCEPTANCE_CRITERIA_AND_PARITY.md) — Route-by-route and feature-by-feature parity matrix.
- [`docs/07_CORE_SYSTEM_REVIEW.md`](./docs/07_CORE_SYSTEM_REVIEW.md) — Evidence-backed implementation gaps, reproducible correctness failures, and current capability limits.
- [`docs/08_CORE_SYSTEM_IMPROVEMENT_PLAN.md`](./docs/08_CORE_SYSTEM_IMPROVEMENT_PLAN.md) — Proposed core contracts, algorithms, provider/OCR architecture, phased backlog, and release gates.

---

## 2. Quick Start & Commands

```bash
# 1. Install dependencies
npm install

# 2. Push SQLite schema and seed demo data (12 subjects, Atlas stories, STEM courses, invitations)
npx prisma db push
npm run db:seed

# 3. Bootstrap or promote a root ADMIN account via CLI (no HTTP bootstrap endpoint exists)
npm run bootstrap:admin -- --email=admin@gauthmath.com --password='AdminPassword123!' --name='Platform Admin'

# 4. Run the existing smoke suite against a disposable database
# This script mutates the configured database; it is not a correctness certification.
npm run test:unit

# 5. Build and start production server (default port 3456)
npm run build
npm run start

# 6. Run the existing Playwright workflow smoke checks (also mutate the database)
npm run test:e2e
```

---

## 3. Pluggable AI Engine (`@github/copilot-sdk` ⇄ Azure OpenAI ⇄ Symbolic CAS)

Configured in `src/lib/ai/provider.ts` and switchable via environment variables or live inside `/admin`:

```env
# Options: "auto" | "copilot" | "azure-openai" | "symbolic"
AI_PROVIDER="auto"
COPILOT_MODEL="gpt-4o"

# Optional Azure OpenAI cutover configuration:
AZURE_OPENAI_ENDPOINT="https://<your-resource>.openai.azure.com"
AZURE_OPENAI_API_KEY="<your-api-key>"
AZURE_OPENAI_DEPLOYMENT="gpt-4o"
AZURE_OPENAI_API_VERSION="2024-10-21"
```

---

## 4. Database Configuration (SQLite Local Dev & PostgreSQL Production)

- **Local Development (SQLite)**: `prisma/schema.prisma` with `@prisma/adapter-better-sqlite3` (`DATABASE_URL="file:./dev.db"`).
- **Production (PostgreSQL)**: `prisma/schema.postgres.prisma` with `@prisma/adapter-pg` (`DATABASE_URL="postgresql://user:pass@host:5432/gauthmath"`).
