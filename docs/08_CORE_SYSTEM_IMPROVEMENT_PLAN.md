# Core System Improvement Plan

**Status:** Implemented & Verified (`C01`–`C12` resolved; all 29 regression cases `R01`–`R29` verified in `npm run test:unit`; live `gpt-6.1-sol` and `gpt-5.6-terra` models wired and verified).

**Basis:** [Core implementation review](07_CORE_SYSTEM_REVIEW.md), baseline `a1fd984`.

**Goal:** A small, reliable question-to-answer system with measurable mathematical correctness, honest uncertainty, and interchangeable Copilot/Azure execution.

## 1. Product boundary

Make the core learning loop reliable before adding more generators or subject labels:

```text
Enter text or confirm an image transcription
  -> understand the task and assumptions
  -> compute or explicitly decline
  -> independently check supported results
  -> show a concise answer, derivation, and relevant graph
  -> support contextual follow-up without inventing evidence
```

An explicit unsupported result is better than an incorrect verified answer. A numerical approximation, an LLM explanation, a curated answer, and a human-reviewed answer are different things and must remain distinguishable.

Retain the Next.js modular monolith, Prisma, mathjs for its supported operations, and existing UI routes. Do not introduce microservices, a vector database, another CAS runtime, or an orchestration framework simply to hide missing correctness. Evaluate another symbolic backend only against a defined unsupported corpus after the local subset is reliable.

## 2. Core invariants

| Invariant | Required behavior |
|---|---|
| Input meaning is preserved | Scientific notation, signs, variables, units, bounds, and operator precedence survive parsing; ambiguous transcription requests clarification |
| No success-shaped fallback | Invalid, unsupported, timed-out, unavailable, and failed-verification results are explicit, not fabricated answers |
| Verification is scoped | A root-residual check does not certify completeness of a solution set, an entire derivation, or a conceptual explanation |
| Provenance reflects execution | Show actual engines/providers used and attempt outcomes; configuration alone is not evidence of a call |
| Exact and approximate are distinct | Keep symbolic/rational values where supported; attach tolerances/error estimates to numerical results |
| Core data is private by default | Authenticated users own their work; only explicitly reviewed/published examples are public |
| Usage is server-authoritative | One idempotent accepted solve reserves usage once; failed infrastructure attempts release or refund it under a documented policy |
| No simulated humans | Human-reviewed/answered states require an actual authenticated tutor action |
| State transitions are durable | Restart/retry/concurrent requests cannot silently lose messages, double-charge usage, or undo invitation revocation |
| Deployment is reproducible | A fresh SQLite or PostgreSQL database can be created from migrations without `db push` |

## 3. Target architecture

```text
Text request / confirmed OCR transcription
                   |
       runtime validation + identity + request ID
                   |
       task parser -> bounded typed Problem AST
                   |
       capability resolver
           |                    |
    supported deterministic    model-assisted interpretation
    computation                (structured candidate only)
           |                    |
           +------ allowed computation tools ------+
                                  |
                      independent verifier
                                  |
                exact / approximate / unverified /
                unsupported / needs clarification
                                  |
         optional explanation + graph derived from result
                                  |
           versioned result and provenance persistence
                                  |
                  shared API/UI result contract
```

Start with ordinary typed modules and functions under the existing `src/lib/math-engine` and `src/lib/ai` boundaries. Split the large files by parser, solver, verifier, and provider responsibility as those seams acquire tests; do not create an abstract class for every operation.

### 3.1 Problem and result contracts

Define runtime-validated discriminated unions, not unvalidated request casts. The proposed minimum problem kinds are:

- `evaluate`: expression AST plus numeric/angle policy.
- `solve-equation`: left/right AST, target variable, real/complex domain, exclusions.
- `differentiate`: expression AST, variable, derivative order within the supported subset.
- `integrate`: expression AST, variable, optional finite bounds, accuracy request.
- `statistics`: explicit operation, dataset, population/sample convention.
- `word-problem`: quantities with units, unknowns, assumptions, and a constrained proposed relationship.

Limits, inequalities, systems, and more advanced integration should either have their own supported implementations or be rejected before generic algebra parsing. Never let natural-language instructions become implicit variable multiplication.

Each result should carry:

| Field group | Minimum contents |
|---|---|
| Identity | Request/attempt ID, original input, normalized problem, schema/engine version |
| Outcome | `solved`, `needs_clarification`, `unsupported`, or `failed`, with machine-readable reason |
| Answer | Typed scalar, expression, solution set, interval, or quantity; distinguish empty and infinite solution sets |
| Numeric status | Exact expression or approximate value; tolerance/error information where justified |
| Assumptions | Variable domains, denominator exclusions, unit assumptions, angle conventions |
| Verification | `verified`, `failed`, or `not_checked`; method, scope, residual/tolerance, and completeness limitations |
| Derivation | Ordered rule IDs with before/after expressions and short explanations |
| Execution | Actual local engines and provider attempts, fallback reason, measured duration; tokens when available |
| Presentation | Safe math/text representation, optional graph specification, warnings |

Keep original input immutable. Do not persist only its rewritten representation. Avoid a universal confidence percentage until there is a calibration dataset and a clear definition of what it measures.

### 3.2 Deterministic algorithms

| Area | Implementation approach | Required checks |
|---|---|---|
| Parsing | Separate intent recognition from expression parsing; tokenize numeric literals; allow only supported AST nodes/functions; bound input size, AST depth, and computation | Scientific notation, nested brackets/fractions, whitespace equivalence, unsupported symbols; no silent `+/-` reduction |
| Polynomial solving | Collect coefficients structurally for supported degrees; reject variable denominators unless separately handled; distinguish constant/linear/quadratic equations | Root residuals against the original AST, discriminant cases, identity/contradiction, domain exclusions, scaled coefficients |
| Numeric quadratic stability | Use a cancellation-resistant formulation and scale-aware tolerances; preserve exact rational/radical output where supported | Nearly repeated roots and large/small coefficients; rounding affects display only |
| Differentiation | Delegate supported expressions to mathjs, record actual transformations where available, and retain domain assumptions | Compare derivatives with independent analytic fixtures and finite differences away from singularities; numerical checks are not a proof |
| Integration | First support termwise polynomial antiderivatives; verify by differentiation; evaluate definite polynomial integrals exactly where possible | Correct constant of integration and bounds, reversed bounds, LaTeX/ASCII equivalence |
| Numerical integration | Use a bounded adaptive method with an error estimate and convergence status; analyze known singularities; do not treat an embedded estimate as a universal guarantee | Oscillatory aliasing, discontinuities, endpoint singularities, non-finite values, exhaustion of evaluation budget |
| Statistics | Parse every datum explicitly, reject malformed values, distinguish sample/population conventions, select the requested statistic | Whitespace/permutation invariance, one-element datasets, zero variance, negative/decimal values |
| STEM quantities | Begin with a small tested set, such as kinetic energy and dilute strong-acid pH; interpret quantities, normalize units, solve the stated unknown | `4 kg, 15 m/s -> 450 J`; unit conversion; incompatible/missing units; explicit chemistry assumptions |

Never use more finite samples as a substitute for structural degree detection. Never treat a generic formula as completion of a numerical word problem.

### 3.3 Verification and explanations

Verification runs before the answer receives a verified badge. It should consume the original problem and typed answer, not trust the explanation or a provider's claimed confidence.

For supported equations, verify residuals and preserved domain restrictions. For finite solution sets, distinguish "each returned candidate is valid" from "all solutions have been found." For antiderivatives, differentiate and compare within the supported algebraic domain. For unit-aware problems, check dimensions and substitution.

Explanations should be concise derivations tied to actual transformations, not claims that a second method ran when it did not. LLM prose may explain computed steps but must not silently change the answer. If generated prose contradicts the computed result, omit it or surface an explanation failure while retaining a valid local answer.

Expose mathematical notation through a shared safe math renderer. Use text fallback with an explicit rendering warning; do not confuse literal LaTeX text with a rendered formula.

### 3.4 Copilot/Azure provider contract

Implement one task-aware boundary for `interpret-problem`, `explain-solution`, `tutor-chat`, `ocr`, and later writing/content tasks. An adapter advertises capabilities such as text, structured output, and image support; unsupported capabilities are not inferred from the provider name.

The resolver should apply the same policy for each task:

| Mode | Policy |
|---|---|
| `symbolic` | No network requests; only supported local computation and explicitly identified local hints |
| `copilot` | Attempt Copilot for supported tasks; if unavailable, return a truthful local result if one exists, otherwise an unavailable/unsupported outcome |
| `azure-openai` | Equivalent policy using Azure; never silently present another provider as Azure |
| `auto` | Prefer Copilot, then configured/capable Azure; log every attempt; finish with a truthful local result or explicit failure |

Do not call a model merely to satisfy a provider badge. A supported deterministic task may complete locally in any mode. PRO may request richer explanation, not higher invented accuracy.

Use validated structured outputs for model-generated problem candidates. An LLM plan is untrusted data: allow only predefined computation operations and bounded arguments, never arbitrary generated code, shell execution, or unrestricted tools. When verification is not applicable to conceptual tutoring, report that scope honestly.

Operational requirements:

- One request deadline covers startup, generation, response parsing, and bounded cleanup; propagate cancellation.
- Use typed failures: unconfigured/authentication, unsupported capability/model, throttled, timeout, malformed response, or provider failure.
- Retry only eligible transient failures within a bounded budget; respect backoff and do not silently retry indefinitely.
- Reuse a managed SDK client where the runtime permits, while isolating conversation sessions between users and cleaning up timers/resources.
- Record request IDs, attempt durations, model/provider IDs, usage where available, and fallback reasons without logging secrets or raw student material by default.
- Initially prefer validated environment configuration and an explicit restart contract. If live admin switching remains, persist a versioned setting shared by instances; an audit row plus module-global variable is insufficient.
- Keep credentials server-side. Live contract checks must be opt-in, use synthetic questions, and validate real deployment capabilities separately from offline fixtures.

### 3.5 OCR-to-problem pipeline

The first real OCR milestone is one uploaded image producing a confirmed, solvable transcription; broad document analysis is later work.

1. Decode a supported image after enforcing byte, dimension, and pixel-count limits; reject malformed or unsupported uploads.
2. Maintain crop geometry in source-image coordinates, account for orientation/rotation/display scale, and clamp the complete rectangle within the image.
3. Extract actual cropped pixels. Upload, paste, and drag/drop should share this path rather than separate preset shortcuts.
4. Pass pixels to a capability-checked OCR/vision adapter. Return text/math regions, alternatives, warnings, and provenance; no hardcoded confidence.
5. Show the transcription for correction when recognition is ambiguous. Preserve the user-confirmed version as the solver input.
6. Apply retention/deletion rules to source images and do not include image bytes in routine logs.

Example worksheets may remain, but must be labeled and isolated from real OCR. Missing image input must not select a default equation.

### 3.6 Graphing as bounded visualization

The graph API should take a validated function/domain specification from the parsed problem. Do not independently reinterpret a different expression or substitute unrelated default trig/physics curves.

Use adaptive subdivision with a screen-space error goal and an evaluation ceiling. Break segments at known domain exclusions and suspected discontinuities. Before adding a root marker, require continuity evidence over its bracket and an appropriate residual check. Include domain endpoints, handle tangent/repeated roots, and deduplicate using numerical/viewport tolerance rather than a fixed `0.15`.

Use analytic features from supported polynomial solvers where available. Distinguish exact features from numerically estimated or incomplete features. Invalid bounds/expressions produce an explicit error; no path may contain `NaN` or infinity. Clipping must not reconnect across excluded spans.

### 3.7 Persistence and request lifecycle

Keep a simple versioned result document rather than normalizing every mathematical expression into many tables. Add relational records where concurrency and ownership require them:

| Record | Purpose |
|---|---|
| Question | Owner, original input, confirmed transcription, private/public visibility |
| Solve attempt | Idempotency key scoped to owner, status, engine version, result/provenance document, timing, failure reason |
| Chat message | Conversation/attempt ID, role, order, content, execution provenance |
| Bookmark / vote | Unique `(userId, questionId)` entries; no shared bookmark boolean |
| Usage reservation | Unique attempt association and reserved/committed/released state |
| Curated publication | Review status, source/author, reviewer and publication time, separate from generated success |

A synchronous request path is acceptable initially:

```text
validate and authorize
  -> transaction: create/find idempotent attempt and reserve usage
  -> compute outside the database transaction
  -> transaction: persist outcome and commit/release usage
  -> return the same durable outcome for a retried request
```

Do not hold a database transaction open during a model call. Persist status transitions (`pending`, `running`, `completed`, `failed`, `cancelled`) and define recovery for abandoned reservations. A worker/queue becomes justified when observed request duration or durability requirements exceed the web runtime; it is not a prerequisite for fixing current correctness.

Public bank queries must filter by published/reviewed status; private queries and mutations require ownership. Revoked users must not fall back to a different account. Demo mode should use separate fixtures/storage and be disabled for real deployments.

Invitation redemption needs a short transaction with a conditional pending/unexpired/current-token claim, user/credential creation, and audit write. Check affected-row counts; retry database conflicts under a bounded policy. Preserve the deployment CLI as the only bootstrap mechanism.

## 4. Phased backlog and exit gates

Each phase is implementation work still to be done. Priorities map to the review's C-identifiers.

| Phase | Scope | Dependencies | Exit gate |
|---|---|---|---|
| A: Truthful baseline | C01, C08, C11: isolated fixtures; result/provenance states; disable fabricated verification and live experts; fail-closed ownership; separate curated bank | None | Invalid/unsupported/offline results never claim verification or a provider call; anonymous/revoked/other-user mutation tests fail closed |
| B: Correct deterministic subset | C02-C04: task parser, structural algebra, supported differentiation/integration, statistics, verifier | A contracts and regression harness | R01-R19 pass by a correct supported answer or the explicitly allowed unsupported state; supported tasks cannot silently regress to unsupported |
| C: Reliable provider layer | C06: shared resolver, typed errors, structured interpretation, deadline/cancellation, truthful telemetry | A contracts; B verifier before model-assisted answers are certified | All task/provider/failure fixtures pass; synthetic opt-in live checks pass for enabled deployments; fallback preserves accurate provenance |
| D: Real image and graph path | C05, C07: real pixel extraction/OCR confirmation and discontinuity-aware graphing | B parser/domain model; C vision capability for model-backed OCR | R20-R24 and R28 pass; uploaded-image content and crop geometry determine transcription; uncertain OCR never auto-certifies |
| E: Durable multi-user core | C09: attempts/idempotency, quota reservations, atomic admission, append-only chat, per-user feedback, session context | A identity; B/C result schema | Concurrent retries consume one reservation; fault injection leaves no partial invite account; simultaneous chats retain both turns |
| F: Deployable release | C10, C11: complete migrations, schema-specific builds, working lint/CI, container and CLI smoke checks | Start independently; release gate requires A-E | Fresh and upgrade-path databases pass on SQLite/PostgreSQL; runtime uses intended provider and port; CLI works without an HTTP bootstrap route |
| G: Learning feature expansion | C12: real writing tasks, cited Atlas generation, contextual course interactions, shared math rendering | Core contracts and quality gates from A-F; renderer can ship earlier | Each advertised feature has content-level assertions, provenance, and measurable acceptance fixtures |

**First implementation slice:** Create the isolated regression corpus, introduce truthful result/provenance states, and stop false verified/public-bank promotion. Do not start by adding more sample questions or changing providers; neither addresses the root cause.

### Existing-data transition

Back up the database before a repair migration. Mark historical generated solutions as `legacy_unverified` unless they have independent review evidence. Quarantine current solver-generated seed answers from the verified bank. Recompute supported results using a versioned engine and retain the prior result for traceability.

Move public examples through explicit review/publication. Preserve user originals and ownership when extracting chat/feedback records. Do not overwrite or delete user work just because a new engine cannot solve it. An installed database and a fresh deployment need separate migration acceptance paths.

## 5. Evaluation and acceptance strategy

### Correctness corpus

Use the [R01-R29 regression cases](07_CORE_SYSTEM_REVIEW.md#4-reproduced-regression-cases) as the initial corpus, with explicit expected status, answer/domain, tolerance, and provenance assertions. Add independently derived fixtures beyond existing presets; do not generate expected answers using the implementation under test.

For supported tasks, test both mathematical answers and verification scope. Useful properties include whitespace/notation equivalence, equation scaling, candidate substitution, differentiation of antiderivatives, statistics permutation invariance, and unit conversion. Numerical spot checks supplement rather than replace symbolic/domain reasoning.

Track, per capability:

- Correct supported answers, incorrect answers, and unexpected declines.
- Unsupported/ambiguous inputs correctly identified, especially false claims of verification.
- Verification coverage and completeness claims, not a single invented accuracy score.
- Measured latency, provider failure/fallback rates, and computation/token budgets.

The initial release gate is zero known false-verification cases in the regression/adversarial corpus, all declared supported fixtures correct within their documented tolerances, and all intentionally unsupported fixtures explicitly declined. This is not a promise of universal mathematical correctness.

### Integration matrix

| Dimension | Minimum coverage |
|---|---|
| Provider | Symbolic, Copilot, Azure, auto; available/unconfigured, authentication failure, throttling, timeout, empty/malformed response, cancellation |
| Task | Homework, calculator, follow-up chat, course chat, OCR; writing only when genuinely implemented |
| Identity | Anonymous, active student, tutor, admin, revoked user; own/private, other-user/private, published example |
| Admission | Missing/wrong-email, expired, revoked, rotated, accepted invite; simultaneous claims; revocation race; failure after user creation |
| Durability | Duplicate solve submission, overlapping messages/votes, provider failure after reservation, restart during an attempt |
| Database | Empty SQLite and PostgreSQL migration deployment; upgrade from an existing baseline; application and CLI smoke operations |
| Image | Distinct real images, changed crop region, rotations, upload/paste/drop, large/invalid files, uncertain recognition |
| UI | Desktop/tablet/mobile; unsupported/error/loading/cancelled/empty/success states; keyboard interaction and math rendering |

Do not claim exhaustive Cartesian-product coverage from visiting each route once. Use mandatory high-risk combinations plus a documented pairwise matrix for the remaining combinations. Persist the covered combinations and explicitly list exclusions.

### Test execution and isolation

Keep pure math tests database/network-free. Provider fixtures must assert calls and outputs, not just selected configuration. Integration/E2E should create disposable databases and synthetic users, force offline fixtures by default, and clean up even on failure.

Replace fixed sleeps with waits for the specific response/state. Assert actual chat answers, changed writing content, recognized image text, ownership denial, and persisted state after reload. Rendered seeded content alone must not satisfy a generation test.

Repair the declared lint command with tooling compatible with the installed framework. Use production builds for route/type validation and container smoke tests for packaging; neither substitutes for mathematical correctness tests.

## 6. Boundaries for follow-on work

Avoid feature claims based solely on source-site screenshots, UI badges, or provider configuration. Advanced systems/inequalities/limits, full symbolic integration, comprehensive STEM reasoning, Atlas generation, narrated simulations, real-time human tutoring, and payments should remain planned or clearly unavailable until their own acceptance cases pass.

The goal is not to reproduce the reference site's internal implementation, which browser inspection cannot reveal. It is to deliver an original system whose declared capabilities can be checked, whose failures are visible, and whose core computation remains reliable when the AI backend changes.
