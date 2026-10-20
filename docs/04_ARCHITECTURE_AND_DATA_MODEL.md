# 04 — System Architecture & Prisma Data Model

## 1. High-Level System Architecture

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                     Client Layer (Next.js 16 App Router + React 19)                    │
│                                                                                        │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────┐  │
│  │ Homework Helper  │  │  AI Calculator   │  │   Gauth Atlas    │  │ Gauth Academy  │  │
│  │ + Image Cropper  │  │ 3-Tab Math Pad + │  │  2D Hotspot Map  │  │ Interactive    │  │
│  │ + Math Keyboard  │  │ 22 Calculators   │  │ + Curiosity Tree │  │ Course Player  │  │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘  └───────┬────────┘  │
│           │                     │                     │                    │           │
│  ┌────────┴─────────┐  ┌────────┴─────────┐  ┌────────┴─────────┐  ┌───────┴────────┐  │
│  │ Solution Detail  │  │ Study Resources  │  │  Writing Helper  │  │ Admin Console  │  │
│  │ Step-by-Step +   │  │ 12 STEM Subjects │  │  11 Essay Genres │  │ Invites, RBAC, │  │
│  │ 2D SVG Graph     │  │ + Subtopics Bank │  │ + Essay Builder  │  │ Revoke & Audit │  │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘  └───────┬────────┘  │
└───────────┼─────────────────────┼─────────────────────┼────────────────────┼───────────┘
            │                     │                     │                    │
            ▼                     ▼                     ▼                    ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                       Next.js Route Handlers (/api/*) & Auth Gate                      │
│                                                                                        │
│  • /api/auth/[...nextauth]      (NextAuth JWT + PasswordCredential + Revocation Gate)  │
│  • /api/auth/invitation         (Token/Code Inspection)                                │
│  • /api/auth/register           (Invite-Only Atomic Registration Claim)                │
│  • /api/admin/invitations/*     (Create, List, Rotate, Revoke Invitations)             │
│  • /api/admin/users             (Role Updates, Account Revocation/Restore)             │
│  • /api/admin/audit-logs        (Immutable Security Audit Trail)                       │
│  • /api/questions/solve         (Hybrid Symbolic CAS + AI Step-by-Step Solver)         │
│  • /api/questions/[id]/chat     (Contextual AI Tutor Follow-Up & Escalation)           │
│  • /api/calculator/evaluate     (Symbolic Algebra, Calculus, Matrix, Stats & Graph)    │
│  • /api/ocr                     (Cropped Homework Image OCR & Expression Extractor)    │
│  • /api/atlas                   (Visual Story Explorer, Hotspot Deep-Dive & Generator) │
│  • /api/courses                 (Gauth Academy Infinite & Lecture Course Engine)       │
│  • /api/writing                 (Essay Bank + AI Essay Outline/Draft/Critique Helper)  │
│  • /api/subscription            (Gauth PLUS Plan Upgrade & Quota Management)           │
└───────────────┬───────────────────────────────────────────────────────┬────────────────┘
                │                                                       │
                ▼                                                       ▼
┌───────────────────────────────────────────┐   ┌────────────────────────────────────────┐
│      Prisma 7 Dual Database Layer         │   │      Pluggable AI & CAS Engine         │
│  • Local Dev: SQLite (better-sqlite3)     │   │  1. @github/copilot-sdk (CopilotClient)│
│  • Production: PostgreSQL (@prisma/pg)    │   │  2. Azure OpenAI REST Chat Completions │
│  • Identical Portable Relational Models   │   │  3. Deterministic Symbolic CAS Engine  │
└───────────────────────────────────────────┘   └────────────────────────────────────────┘
```

---

## 2. Complete Relational Data Model (`prisma/schema.prisma` & `prisma/schema.postgres.prisma`)

### 2.1 Authentication, Invite-Only Admission & Governance Models
- **`User`**:
  - `id` (`String @id @default(cuid())`)
  - `email` (`String @unique`)
  - `name` (`String`)
  - `image` (`String?`)
  - `role` (`String @default("STUDENT")`) — `"ADMIN" | "TUTOR" | "STUDENT"`
  - `status` (`String @default("ACTIVE")`) — `"ACTIVE" | "REVOKED"`
  - `planTier` (`String @default("FREE")`) — `"FREE" | "PLUS"`
  - `billingCycle` (`String @default("yearly")`) — `"monthly" | "quarterly" | "yearly"`
  - `freeQueriesRemaining` (`Int @default(3)`)
  - `aiProRemaining` (`Int @default(1)`)
  - `courseCreditsRemaining` (`Int @default(3)`)
  - `preferredAiProvider` (`String @default("auto")`) — `"auto" | "copilot" | "azure-openai"`
  - `revokedAt` (`DateTime?`), `revokedReason` (`String?`)
- **`PasswordCredential`**:
  - `id`, `userId` (`@unique`), `passwordHash`, `passwordChangedAt`, `resetTokenHash` (`@unique`)
- **`AccountInvitation`**:
  - `id`, `code` (`@unique`, e.g. `GAUTH-2026-STEM`), `email`, `normalizedEmail`, `activeForEmail` (`@unique`), `tokenHash` (`@unique`), `role` (`ADMIN | TUTOR | STUDENT`), `status` (`PENDING | ACCEPTED | REVOKED | EXPIRED`), `maxUses` (`Int @default(1)`), `usedCount` (`Int @default(0)`), `invitedById`, `acceptedById`, `expiresAt`, `acceptedAt`, `revokedAt`
- **`AuditLog`**:
  - `id`, `actorId`, `actorEmail`, `action`, `targetType`, `targetId`, `metadataJson`, `ipAddress`, `createdAt`

### 2.2 Homework Solver, Study Bank, Atlas, Academy & Writing Models
- **`HomeworkQuestion`**:
  - `id` (`String @id @default(cuid())`)
  - `slug` (`String @unique`)
  - `userId` (`String?`)
  - `subject` (`String`) — `"Math" | "Calculus" | "Statistics" | "Physics" | "Chemistry" | "Biology" | "Economics" | "Literature" | "Business" | "Writing" | "Social Science" | "Others"`
  - `topic` (`String`) — e.g. `"Quadratic Equations"`, `"Differentiation"`, `"Molecular Structure"`
  - `promptText` (`String`)
  - `latexExpression` (`String?`)
  - `croppedImageData` (`String?`)
  - `answerSummary` (`String`)
  - `stepsJson` (`String`) — JSON array of `{ stepNumber, title, formulaLatex, explanation, howAndWhyTip }`
  - `quickTip` (`String`)
  - `deepThinkingText` (`String`)
  - `graphConfigJson` (`String?`) — JSON config for 2D SVG plot (`expression`, `domain`, `roots`, `extrema`, `asymptotes`, `points`)
  - `providerUsed` (`String @default("symbolic+copilot")`)
  - `accuracyScore` (`Int @default(99)`)
  - `isVerifiedBank` (`Boolean @default(false)`)
  - `isBookmarked` (`Boolean @default(false)`)
  - `helpfulCount` (`Int @default(12)`)
  - `unhelpfulCount` (`Int @default(0)`)
  - `followUpMessagesJson` (`String @default("[]")`)
  - `tutorEscalationStatus` (`String @default("NONE")`) — `"NONE" | "ASSIGNED" | "ANSWERED"`
  - `createdAt`, `updatedAt`
- **`AtlasStory`**:
  - `id`, `slug` (`@unique`), `title`, `category` (`Culture | Art | Nature | Architecture | Human Body | Science | History | Technology`), `summary`, `visualTheme`, `hotspotsJson` (array of `{ id, label, x, y, title, narrative, facts, citations, childPrompts }`), `sourcesJson` (array of `{ id, publisher, title, url, year }`), `viewsCount`, `createdById`, `createdAt`
- **`AcademyCourse`**:
  - `id`, `slug` (`@unique`), `title`, `category` (`Science | Math | Humanities | Tech & Coding | Business & Econ | Test Prep`), `subCategory`, `mode` (`INFINITE | LECTURE`), `durationSec`, `simulationType` (`sweet-spot-physics | snell-refraction | noise-cancelling-wave | cell-transport | projectile-motion | custom-lab`), `chaptersJson` (array of `{ id, number, title, durationSec, captionText, keyFormula, interactivePrompt }`), `quizJson` (array of `{ question, options, correctIndex, explanation }`), `chatHistoryJson`, `createdById`, `createdAt`
- **`WritingDocument`**:
  - `id`, `slug` (`@unique`), `title`, `genre` (`Argumentative Essay | Expository Essay | Narrative Essay | Descriptive Essay | Persuasive Essay | Compare and Contrast | Literary Analysis | Research Paper | Creative Writing | Book Review | Speech`), `gradeLevel`, `wordCount`, `promptText`, `annotationsJson` (array of `{ section: "Thesis & Hook" | "Body Paragraph 1" | "Body Paragraph 2" | "Counterargument" | "Conclusion", content, tutorComment }`), `aiScore`, `isCuratedExample`, `userId`, `createdAt`
