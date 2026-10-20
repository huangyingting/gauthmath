# Core System Implementation Review

**Review date:** 2026-10-20

**Baseline:** `a1fd984`

**Scope:** Mathematical solving, AI orchestration, OCR, graphing, question persistence, and the admission/deployment foundations those systems depend on.

## 1. Assessment

The application is a working demonstration of the intended workflows, **not yet a trustworthy general-purpose STEM solver**. The main issue is not missing pages: it is that incorrect, unsupported, simulated, and provider-fallback outcomes are represented as successful, verified answers.

The existing separation between math utilities, AI helpers, API handlers, and UI components is reusable. Direct probes confirmed ordinary quadratic solving, a polynomial definite integral, a simple descriptive-statistics query, and determinant evaluation. Credentials-based admission, invitation lifecycle helpers, database adapters, and an SVG renderer also exist. Their presence does not establish the broader correctness and production guarantees claimed in the original specification.

Recommended order: **truthful outcomes and access boundaries -> mathematical correctness -> reliable AI/OCR execution -> durable workflow state -> additional content features**. The implementation plan and release gates are in [08_CORE_SYSTEM_IMPROVEMENT_PLAN.md](08_CORE_SYSTEM_IMPROVEMENT_PLAN.md).

### Evidence and limitations

- Source references below refer to the baseline commit, not proposed code.
- **Reproduced** means a local function/route invocation demonstrated the behavior. Solver/provider probes used `NODE_ENV=test` and `SKIP_LIVE_LLM=1`. Provider-routing probes replaced `fetch` with an in-process fixture; no live model requests were made.
- Migration SQL was executed against an in-memory SQLite database, not the development database.
- **Source-confirmed** means the behavior follows from the inspected implementation. Concurrency, real provider authentication, PostgreSQL deployment, and container startup were not exercised.
- The existing unit/E2E scripts were read, not rerun: they mutate the configured database and do not provision an isolated test database. Earlier passing results are not evidence that the counterexamples below work.
- This is a core implementation review, not an exhaustive security assessment or a new exploration of the reference website. Browser observations cannot establish the reference website's internal algorithms. Earlier documents mix observations, design targets, and implementation claims.

## 2. Actual core flow

```text
Home text / math keyboard ----------> POST /api/questions
Image modal -> preset OCR response -> text in home composer
                                        |
                                        v
                              getActiveOrDemoUser()
                                        |
                                        v
                              solveMathOrStemProblem()
                              regex routing + mathjs
                                        |
                         fixed-grid graph, where applicable
                                        |
                  optional LLM conceptual-insight paragraph
                                        |
                persist as a "verified" HomeworkQuestion
                                        |
                     solution page / shared JSON chat

Calculator -> separate math + graph API (no AI orchestration)
Course chat -> same follow-up helper (title/summary only)
Writing -> deterministic scoring/template helper (no model call)
Atlas -> seeded content retrieval and view increment
```

There is no typed unsupported/error result from the math solver, no independent verifier, no solve-attempt state model, and no shared task-level provider contract. The LLM cannot replace an unsupported symbolic answer: its successful response is appended as explanatory text.

Sources: `src/app/api/questions/route.ts:49-162`, `src/lib/ai/provider.ts:192-294`, `src/app/api/calculator/evaluate/route.ts:4-27`, `src/app/api/courses/route.ts:23-55`, `src/app/api/atlas/route.ts:4-33`.

## 3. Prioritized findings

Priorities here are delivery priorities, not vulnerability severity: **P0** blocks use with real learners/data; **P1** blocks the claimed core capability; **P2** is a subsequent capability or usability improvement.

| ID | Priority | Gap | Evidence |
|---|---|---|---|
| C01 | P0 | Correctness, provider execution, and human verification are asserted without evidence | Reproduced + source-confirmed |
| C02 | P1 | Text normalization and statistics change the meaning of valid input | Reproduced |
| C03 | P1 | Finite sampling is treated as proof of polynomial degree | Reproduced |
| C04 | P1 | Calculus accepts incomplete work and unreliable approximations as final answers | Reproduced |
| C05 | P1 | Graph annotations can invent roots and omit real roots | Reproduced |
| C06 | P1 | AI is an enrichment helper, not a shared, reliable solving system | Fixture-reproduced + source-confirmed |
| C07 | P1 | Image upload and OCR do not process image pixels | Route-reproduced + source-confirmed |
| C08 | P0 | Demo identity, public/private data, and quotas are not separated | Source-confirmed |
| C09 | P1 | Admission, chat, and feedback lack required atomicity | Source-confirmed; races not executed |
| C10 | P0 | Checked-in migrations and deployment configuration cannot establish the promised production system | Migration-reproduced + source-confirmed |
| C11 | P1 | Current evaluation primarily verifies happy-path presentation | Source-confirmed; lint failure reproduced |
| C12 | P2 | Writing, Atlas, courses, and math rendering are narrower than the spec | Reproduced + source-confirmed |

### C01. Success and verification are not trustworthy

Unsupported text returns `Verified step-by-step analysis`, `Verified Solution Ready`, and confidence `0.9`. PRO mode that stays local is relabeled `copilot-sdk`, even when the configured mode is explicitly `symbolic`. It appends a substitution/domain-check claim without performing that check. Offline chat similarly claims Copilot execution and can affirm an intentionally false supplied answer.

The question API then stores `accuracyScore: 99` and `isVerifiedBank: true` for every generated result. The solution page exposes those values as verified accuracy. Live-tutor escalation immediately writes a canned human response and `ANSWERED`; there is no actual expert assignment or response.

**Impact:** Learners cannot distinguish a supported computation from a placeholder, provider failure, or simulated human service. Generated answers also contaminate the purported verified study bank.

**Required direction:** Explicit result and provenance states, independently executed verification, a separate curated-content lifecycle, and removal or clear gating of simulated experts/accuracy labels. Existing generated records need a provenance repair policy, not just corrected new responses.

Sources: `src/lib/math-engine/solver.ts:980-1023`; `src/lib/ai/provider.ts:263-293,300-345`; `src/app/api/questions/route.ts:106-137`; `src/app/api/questions/[id]/route.ts:94-120`; `src/app/solution/[id]/page.tsx:251-313`; `prisma/seed.ts:257-298`.

### C02. Input semantics are not preserved

The implicit-multiplication regex rewrites scientific notation: `1e-3` becomes `1*e-3`. Normalization also replaces plus/minus with plus, losing one branch. These are mathematical changes, not formatting changes.

The derivative regex strips a function's closing parenthesis in inputs such as `derivative of sin(x)`. The failed derivative parse falls through into general algebra, where words such as `derivative` and `of` can become symbolic variables. Statistics has separate correctness bugs: `variance(...)` selects the mean; a trailing space inside a dataset can become an extra zero through `Number('')`.

**Required direction:** Parse task intent separately from expressions. Use a bounded mathematical grammar/AST, preserve source spans and domain assumptions, reject unsupported constructs, and make sample/population statistics explicit.

Sources: `src/lib/math-engine/solver.ts:39-88,360-370,560-584,819-855`.

### C03. Polynomial classification is mathematically unsound

The solver evaluates an expression at `0, 1, -1, 2, -2`, fits a quadratic, and uses agreement at those points to infer degree. A higher-degree polynomial can agree at all five points.

For `x^2 - 5x + 6 + x*(x^2-1)*(x^2-4) = 0`, the solver returns `x = 2, x = 3`. Substituting `3` into the original left-hand side gives **120**, not zero. The reported confidence is still `0.99`.

There are also no explicit solution-set cases for an identity or contradiction (`x = x`, `x = x + 1`). Biquadratic equations and systems described in the spec have no dedicated solver path. Numeric coefficients, fixed tolerances, the ordinary quadratic formula, and six-decimal formatting are not an exact-arithmetic implementation.

**Required direction:** Extract coefficients and degree structurally from an allowed AST. Preserve denominator exclusions before simplification. Handle empty/infinite solution sets explicitly, retain exact values where supported, use stable numeric formulas otherwise, and check candidate roots against the original problem. Do not "fix" degree detection by adding more sample points.

Sources: `src/lib/math-engine/solver.ts:92-98,106-159,205-223,819-835,912-929`.

### C04. Calculus claims exceed computation

Indefinite integration returns the original integral plus `C`; it does not produce an antiderivative. Definite integration always uses 200 Simpson subintervals, with no error estimate, convergence check, singularity classification, or non-finite-result rejection. The explanation calls this an exact area and refers to an antiderivative that was not computed.

An oscillatory integrand can alias to zero at every sample. A singular integrand can produce `Infinity` with confidence `0.98`. The LaTeX definite-integral regex contains an unescaped `^` assertion; normal definite-integral notation is not recognized. Limits are listed as a result type but have no dedicated limit solver.

**Required direction:** Start with a declared polynomial antiderivative subset, verify by differentiation, and distinguish exact results from numerical approximations. Numerical integration needs documented tolerances, evaluation budgets, error reporting, and explicit unsupported/improper-integral handling. More sampling alone does not prove correctness for arbitrary functions.

Sources: `src/lib/math-engine/solver.ts:436-550,796-839`.

### C05. Graph output is not discontinuity-safe or complete

The graph uses a fixed 320-interval grid, not adaptive sampling. Discontinuities depend on absolute jump thresholds; bisection assumes continuity and reports roots without checking residuals. A scaled pole such as `0.001/(x-0.03)` is drawn as one segment and labeled as a root at its asymptote.

Repeated roots between sample points are missed. Roots within `0.15` are merged, irrespective of viewport scale. The final domain endpoint is not checked as a root. Equal domain endpoints generate SVG coordinates containing `NaN`. Invalid expressions become empty graphs rather than explicit errors.

**Required direction:** Validate finite ordered bounds, preserve domain exclusions, use bounded adaptive subdivision, verify root residuals/continuity, refine stationary points, and distinguish incomplete feature detection from "no roots." A graph is a visualization of a result, not evidence that the result is correct.

Sources: `src/lib/math-engine/grapher.ts:45-104,143-213,216-235`; `src/app/api/calculator/evaluate/route.ts:8-26`.

### C06. AI routing and execution are not a complete core service

Even a successful model call supplies only a conceptual paragraph about the preexisting answer. It cannot solve unsupported STEM questions or replace a wrong final answer. Physics/chemistry keyword branches produce generic formulas without extracting quantities, units, or the requested unknown.

Provider policy also differs by task. In `auto`, homework can fall back from Copilot to Azure, but follow-up chat cannot. Writing does not call either provider, while its reported provider comes from configuration. `getAIProviderStatus()` hardcodes SDK availability. The admin override is process-local memory, so it is neither durable nor reliably shared across server instances.

Operationally, every Copilot completion creates a client/session; errors are collapsed into `{ ok: false }`; timeouts/cleanup errors are hidden. `Promise.race` does not itself cancel the losing operation. Azure clears its timeout after response headers, before parsing the body, and lacks typed failure reporting. There is no common request deadline, token/cost accounting, bounded retry policy, or cancellation propagated from the request.

**Required direction:** One small task-aware provider interface and resolver, truthful per-attempt telemetry, a supported deterministic tool layer, and a constrained structured-output path for model-assisted problem interpretation. Keep mathematical answers separate from explanatory prose. A fake transport validates routing contracts, not live provider availability.

Sources: `src/lib/ai/provider.ts:12-64,67-154,192-260,300-345,351-413`; `src/lib/math-engine/solver.ts:634-789`; `src/app/api/admin/route.ts:199-210`.

### C07. OCR is a preset simulator

Uploading a file stores its filename only. The preview is rendered worksheet text, rotation affects that preview, and handles change percentages via clicks. No pixel buffer is decoded, cropped, or sent to the server.

`POST /api/ocr` selects one of five fixed examples or echoes manual text. An empty body and an unknown preset both return the same quadratic with `0.99` confidence. Out-of-image crop bounds are echoed without rejection. Crop position/rotation cannot affect recognition.

**Required direction:** Explicitly label presets as examples until a real image path exists. Implement image decoding, bounded upload validation, source-pixel crop transforms, a vision/OCR adapter, and user confirmation of uncertain transcription before solving.

Sources: `src/components/modals/ImageCropModal.tsx:87-130,155-156,203-285`; `src/app/api/ocr/route.ts:3-79`; `src/app/page.tsx:119-129`.

### C08. Real-user boundaries and usage accounting are incomplete

`getActiveOrDemoUser()` turns an anonymous or revoked session into a seeded user, or even the earliest active account. Question/writing list routes do not separate private user submissions from public curated examples. Question detail and mutations have no session/ownership check; bookmarks are a single shared boolean.

Quota bypass and decrement are controlled by request-body flags. The home composer does not request decrement. Subscription POST updates entitlements directly from a selected plan without a payment-confirmation flow. The admin guard also accepts a shared-secret header path in addition to a session.

**Impact:** Invite-only login is not equivalent to invite-only access to the core system; usage and ownership cannot be relied on.

**Required direction:** Fail-closed real-user mode, explicitly isolated demo mode, public-curated/private-owned query scopes, server-authoritative quotas, and a distinct billing-disabled/demo state until payment handling exists. Preserve CLI-only bootstrap; administrative HTTP actions should require an active authorized session.

Sources: `src/lib/server-session.ts:5-38`; `src/app/api/questions/route.ts:6-29,69-95,139-148`; `src/app/api/questions/[id]/route.ts:5-89`; `src/app/api/writing/route.ts:6-17,46-72`; `src/app/api/subscription/route.ts:39-75`; `src/app/api/admin/route.ts:19-35`.

### C09. Related writes can diverge or overwrite each other

Invitation validation, user creation, invitation consumption, and audit creation are separate operations. A failure after creating the user can leave a pending invitation; a concurrent revocation/rotation can race with an update that predicates only on the invitation ID. The unique user email does prevent two accounts with the same email: the finding is not that a simple replay always creates duplicate users.

Chat rewrites an entire JSON array after reading it, so simultaneous requests can lose turns. Votes use read/increment/write rather than atomic increments. There is no per-user vote uniqueness. Solve creation and optional quota decrement are separate, with no idempotency key to deduplicate retries. Course chat does not receive the current slide or earlier conversation.

**Required direction:** Conditional transactional invitation claim plus user/credential/audit creation; atomic usage reservation/finalization; append-only message rows; unique user feedback records; idempotent solve submissions. Test races and injected failures on both supported databases.

Sources: `src/lib/account-admission/registration.ts:55-162`; `src/lib/account-admission/invitations.ts:255-342`; `src/lib/account-admission/audit.ts:13-25`; `src/app/api/questions/[id]/route.ts:82-151`; `src/app/api/questions/route.ts:106-148`; `src/app/api/courses/route.ts:43-47`.

### C10. Database and deployment guarantees are not established

Executing the initial migration creates only `User`; the schema declares eleven models. The other ten tables are missing. The migration uses `DATETIME`, which is not a PostgreSQL type, while both schema configurations point at the same migration directory. `db push` on a developer database bypasses this defect rather than validating deployment.

The Docker build generates a PostgreSQL client and then calls `npm run build`, which generates the default SQLite client again. The container/Compose expose port 3000, while `npm start` hardcodes 3456. No tracked `public/` files satisfy the fresh-checkout asset assumption. The runner copies the bootstrap script but not its imported `src/` code or `tsconfig.json`. There is no tracked `.dockerignore`, and `COPY . .` lacks exclusions for local credentials, databases, and build artifacts.

**Required direction:** Complete provider-specific migration histories, explicit build-time schema selection, one port contract, a runnable deployment CLI, isolated build context, and clean-database/container smoke gates. Do not rewrite an already deployed migration without checking migration history; document a baseline/upgrade path.

Sources: `prisma/migrations/20261020000000_init/migration.sql:1-23`; `prisma.config.ts:45-54`; `prisma/schema.prisma`; `prisma/schema.postgres.prisma`; `Dockerfile:12-27`; `docker-compose.yml:17-29`; `package.json:6-15`; `scripts/bootstrap-admin.ts:1-2`.

### C11. Passing demonstrations do not establish core quality

The unit script checks a few canonical inputs, often by substring or score range. The graph assertion counts roots but does not test their coordinates, residuals, poles, or repeated roots. Provider switching checks configuration values, not actual provider calls or failure states. It bootstraps an account in the configured database and only partially cleans up on success.

E2E confirms a nonempty OCR preset, a displayed `/ 100` score, and several clicks without asserting the resulting content. Chat/writing use fixed sleeps. The section labeled tablet/mobile creates only a mobile context. There are no systematic unsupported-input, provider-outage, ownership, race, migration, or all-role matrices.

`npm run lint` currently fails because `next lint` is interpreted as a project directory by the installed Next.js CLI.

**Required direction:** An independent mathematical oracle corpus, property/metamorphic tests, provider fixtures, isolated integration databases, assertion-driven E2E, and working quality scripts. Report capability-specific correctness and unsupported rates, not a blanket "all features verified."

Sources: `tests/unit-tests.ts:25-76,90-186`; `tests/verify-all-features.mjs:52-59,85-96,142-155,178-235`; `package.json:9,17-18`.

### C12. Adjacent learning features remain limited

Writing scores are determined by text length/sentence counts with a constant grammar score. Polishing appends an enhancement claim without editing the text. Atlas serves seeded chapters/quiz data, not topic generation or source-grounded knowledge expansion. Course rendering is a slide reader plus 2D graph; tutoring receives title/summary, not the active slide. Formula strings are displayed as text rather than through a math typesetter.

These surfaces should reuse the repaired core rather than grow separate prompt/validation stacks. Keep them labeled as curated examples, heuristic feedback, or planned capabilities until implemented.

Sources: `src/lib/ai/provider.ts:351-413`; `src/app/api/atlas/route.ts:4-33`; `src/app/api/courses/route.ts:23-55`; `src/app/course/page.tsx:59-79,205-219`; `src/app/solution/[id]/page.tsx:301`; `src/app/calculator/page.tsx:337`.

## 4. Reproduced regression cases

Expected results below are mathematical or contract requirements, not outputs generated by the existing solver. Unsupported tasks may return an explicit unsupported state instead of a computed answer.

| Case | Input / setup | Baseline observation | Required result |
|---|---|---|---|
| R01 | `1e-3` | `-0.281718` | `0.001` |
| R02 | `2E3` | Generic verified analysis | `2000` |
| R03 | `1 +/- 2` using the Unicode plus/minus operator | `3` only | Both branches or explicit unsupported notation |
| R04 | `derivative of sin(x)` | Algebra containing `derivative` and `of` | `cos(x)` |
| R05 | `derivative of x*sin(x)` | Algebra containing the instruction words | `sin(x) + x*cos(x)` |
| R06 | `x^2 - 5x + 6 + x*(x^2-1)*(x^2-4) = 0` | Quadratic roots `2, 3` | Never certify `3`; original residual is `120` |
| R07 | `x = x`; `x = x + 1` | Generic verified analyses | All real numbers; empty solution set, respectively |
| R08 | `x^4 - 5x^2 + 4 = 0` | Generic verified analysis | `{-2,-1,1,2}` or unsupported |
| R09 | `x^2 <= 4` | Treated as a function with placeholder derivative | `[-2,2]` or unsupported |
| R10 | `integrate x^2` | Unevaluated integral plus `C` | `x^3/3 + C` or unsupported |
| R11 | `integrate 1/x from -1 to 1` | `Infinity`, confidence `0.98` | Divergent ordinary improper integral; do not silently use principal value |
| R12 | `integrate sin(200*pi*x)^2 from 0 to 1` | `0`, confidence `0.98` | `0.5`, or explicit nonconvergence/unsupported |
| R13 | `\int_{0}^{3} (x^2 + 4x) dx` | Generic verified analysis | `27` |
| R14 | `variance(1, 3)` | Mean `2` | Population variance `1`; sample variance `2`, explicitly distinguished |
| R15 | `mean(1, 3 )` | `1.333333` | `2`, same as without the trailing space |
| R16 | `limit sin(x)/x as x approaches 0` | Expression containing `Infinity`, derivative `NaN` | `1` or unsupported |
| R17 | Kinetic energy, `m=4 kg`, `v=15 m/s` | Generic laws, no numeric answer | `450 J` or an explicit unsupported state |
| R18 | pH of `0.001 M HCl` | Generic pH/gas-law text | `3`, with dilute strong-acid assumptions, or unsupported |
| R19 | `this is not a math expression` | Verified analysis, confidence `0.9` | Invalid input / clarification needed |
| R20 | Graph `(x-0.03)^2` on the default domain | No root; minimum rounded to `(0,0)` | Root/minimum at `0.03`, within declared tolerance |
| R21 | Graph `(x-0.03)*(x-0.10)` | Only one root retained | Two distinct roots |
| R22 | Graph `0.001/(x-0.03)` | One segment; root at `0.03` | No roots; split/exclude the pole |
| R23 | Graph `x-1` on `[0,1]` | No root | Endpoint root at `1` |
| R24 | Graph `x`, `xMin=xMax=1` | SVG contains `NaN` | Invalid-bounds result |
| R25 | Symbolic provider + PRO solve | Reports Copilot and appended verification | Local provenance; no invented check |
| R26 | Offline chat asked to verify `x=99` for `x^2=4` | Claims identity and 100% accuracy | Reject the candidate or say it was not checked |
| R27 | Writing content `asdf`, action `polish` | Score `88`; text unchanged except appended claim | No fabricated assessment or edit claim |
| R28 | OCR `{}` or unknown preset with out-of-image crop | HTTP 200, same quadratic and `0.99` confidence | Missing-image / invalid-crop error outside explicit example mode |
| R29 | Initial migration in empty SQLite | Only `User` exists | All eleven declared models and constraints |

### Provider contract fixture result

With Copilot deliberately skipped and Azure `fetch` replaced by a successful local fixture:

| Mode | Homework Azure calls | Chat Azure calls | Writing model calls | Important observation |
|---|---:|---:|---:|---|
| `auto` | 1 | 0 | 0 | Fallback policy differs across tasks |
| `copilot` | 0 | 0 | 0 | Local fallback is still labeled Copilot |
| `azure-openai` | 1 | 1 | 0 | Writing reports Azure without calling it |
| `symbolic` | 0 | 0 | 0 | PRO solving/chat still report Copilot |

The fixture returned a correct kinetic-energy statement, but the returned `answerSummary` remained the generic symbolic template. This demonstrates the enrichment-only boundary; it does not measure model quality.

### Minimal reproduction

Run from the repository with its installed dependencies. This command does not connect to a database or model service:

```bash
NODE_ENV=test SKIP_LIVE_LLM=1 node --import tsx <<'NODE'
const { solveMathOrStemProblem: solve } =
  require('./src/lib/math-engine/solver.ts');
const { generateFunctionGraph: graph } =
  require('./src/lib/math-engine/grapher.ts');
const { solveHomeworkProblem } = require('./src/lib/ai/provider.ts');

for (const prompt of [
  '1e-3',
  'derivative of sin(x)',
  'x^2 - 5x + 6 + x*(x^2-1)*(x^2-4) = 0',
  'integrate sin(200*pi*x)^2 from 0 to 1',
  'variance(1, 3)',
  'mean(1, 3 )',
]) {
  const result = solve(prompt);
  console.log(prompt, '=>', result.answerSummary, result.confidence);
}
console.log(graph('0.001/(x-0.03)').features);
solveHomeworkProblem({
  prompt: 'x^2 - 5x + 6 = 0',
  mode: 'PRO',
  providerOverride: 'symbolic',
}).then(result => console.log(result.aiProvider, result.steps.at(-1)))
  .catch(error => { console.error(error); process.exitCode = 1; });
NODE
```

## 5. What should not be inferred from this review

The wrong-answer examples establish concrete defects; they are not an estimated error rate across all mathematics. Static transaction risks still require concurrency/fault-injection tests. Fake provider responses do not validate real authentication, model support, latency, vision capability, or Azure cutover. The proposed roadmap is future work, not a claim that these gaps have been fixed.
