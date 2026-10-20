# 03 — Technical Specification & Core Algorithm Deep Dive

> **Implementation-status correction (2026-10-20):** This document mixes proposed design with claims not supported by the current code. In particular, general symbolic integration, adaptive graphing, pixel-based OCR, and transactional invitation redemption are not implemented as described. Browser exploration also cannot establish the reference site's internal algorithms. Use [07_CORE_SYSTEM_REVIEW.md](07_CORE_SYSTEM_REVIEW.md) for the evidence-backed baseline and [08_CORE_SYSTEM_IMPROVEMENT_PLAN.md](08_CORE_SYSTEM_IMPROVEMENT_PLAN.md) for follow-on work; the descriptions below are not proof of implementation.

## 1. Core System Overview

Our reverse-engineering and Playwright inspection of `https://www.gauthmath.com` revealed five core algorithmic pillars that make Gauth work:
1. **Hybrid Neuro-Symbolic Math & STEM Solver Engine (`QuestionCreate -> QuestionSolve -> SolutionDetail`)**
2. **Interactive 8-Handle Image Crop & Vision/OCR Expression Extractor**
3. **Adaptive 2D Function Graphing & Interactive Physics/STEM Simulation Engine**
4. **Gauth Atlas Spatial Knowledge Graph & Multi-Depth Curiosity Tree**
5. **Invite-Only Account Admission, Cryptographic Token Claim & Revocation State Machine**

Below is the formal specification and algorithmic design for each core system.

---

## 2. Core Algorithm 1: Hybrid Neuro-Symbolic Math & STEM Solver (`src/lib/math-engine/`)

### 2.1 Architecture Pipeline
When a user submits a mathematical expression or STEM question $Q$:

```text
Input Q (Text / LaTeX / Cropped Image OCR)
   │
   ├──► 1. Canonical Tokenizer & Normalizer
   │       (Converts Unicode math √, π, ÷, ×, ^, LaTeX \frac{a}{b}, \sqrt{}, \int, \frac{d}{dx} into canonical AST tokens)
   │
   ├──► 2. Problem Classifier & Domain Router
   │       ├── Algebraic Equation (Linear, Quadratic, Biquadratic, Rational, Radical, Absolute Value, Exponential/Logarithmic)
   │       ├── System of Linear Equations (2×2 / 3×3 Gaussian Elimination & Cramer's Rule)
   │       ├── Inequality Solver (Linear & Quadratic interval sign-chart analysis)
   │       ├── Symbolic Calculus (Differentiation via Sum/Product/Quotient/Chain Rules; Indefinite & Definite Integration; Limits)
   │       ├── Matrix & Linear Algebra (Determinant, Inverse, Transpose, Eigenvalues, Matrix Multiplication)
   │       ├── Statistics & Combinatorics (Mean, Median, Mode, Variance, StdDev, Permutations P(n,k), Combinations C(n,k), Binomial PDF)
   │       └── Multi-Subject STEM & Word Problem (Physics, Chemistry, Biology, Economics, Business, Writing)
   │
   ├──► 3. Deterministic Step-Trace Generator
   │       Produces exact ordered steps S = [s_1, s_2, ..., s_k], where each step s_i contains:
   │         - title: Action summary (e.g., "Apply the Product Rule to e^(2x) sin(3x)")
   │         - formulaLatex: Exact LaTeX derivation state
   │         - explanation: Clear "How & Why" conceptual rationale
   │         - subSteps: Intermediate algebraic simplifications
   │
   └──► 4. Pluggable AI Enricher (@github/copilot-sdk / Azure OpenAI)
           Synthesizes Deep-Thinking chain-of-thought, pedagogical Quick Tips, and multi-subject STEM word problem reasoning.
```

### 2.2 Key Mathematical Algorithms Implemented

#### A. Polynomial & Biquadratic Root Solver with Step Generation
- **Linear ($ax + b = c$)**: Isolates variable term $ax = c - b$, divides by $a$, simplifies fraction $\frac{c-b}{\gcd(c-b, a)}$.
- **Quadratic ($ax^2 + bx + c = 0$)**:
  1. Computes discriminant $\Delta = b^2 - 4ac$.
  2. Checks if $\Delta \ge 0$ is a perfect square ($k^2 = \Delta$). If so, generates **Factoring by Grouping / AC-Method** steps AND **Quadratic Formula** verification steps:
     $$x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$$
  3. If $\Delta < 0$, computes exact complex conjugate roots $x = -\frac{b}{2a} \pm i\frac{\sqrt{|\Delta|}}{2a}$.
- **Biquadratic ($ax^4 + bx^2 + c = 0$)**:
  1. Applies substitution $u = x^2$ to reduce to $au^2 + bu + c = 0$.
  2. Solves for $u_1, u_2$ and back-substitutes $x = \pm\sqrt{u_1}, \pm\sqrt{u_2}$ (e.g., $x^4 - 5x^2 + 4 = 0 \implies (x^2 - 1)(x^2 - 4) = 0 \implies x \in \{-2, -1, 1, 2\}$).

#### B. Symbolic Differentiation Engine (`d/dx`)
Parses the expression into an operator tree and recursively applies symbolic differentiation rules while recording human-readable derivation steps:
- **Power Rule**: $\frac{d}{dx}[cx^n] = c \cdot n x^{n-1}$
- **Product Rule**: $\frac{d}{dx}[u(x)\cdot v(x)] = u'(x)v(x) + u(x)v'(x)$ (e.g., $\frac{d}{dx}[e^{2x}\sin(3x)] = 2e^{2x}\sin(3x) + 3e^{2x}\cos(3x) = e^{2x}(2\sin 3x + 3\cos 3x)$)
- **Quotient Rule**: $\frac{d}{dx}\left[\frac{u(x)}{v(x)}\right] = \frac{u'(x)v(x) - u(x)v'(x)}{[v(x)]^2}$
- **Chain Rule**: $\frac{d}{dx}[f(g(x))] = f'(g(x))\cdot g'(x)$ (e.g., $\frac{d}{dx}[\ln(1+x^2)] = \frac{1}{1+x^2}\cdot \frac{d}{dx}(1+x^2) = \frac{2x}{1+x^2}$)

#### C. Symbolic & Numerical Integration Engine (`∫`)
- **Indefinite Integrals**: Applies linearity, power rule $\int x^n dx = \frac{x^{n+1}}{n+1} + C$, exponential/trig antiderivatives, and $u$-substitution recognition.
- **Definite Integrals ($\int_a^b f(x)dx$)**: Computes symbolic antiderivative $F(x)$, evaluates $F(b) - F(a)$ via the Fundamental Theorem of Calculus, and cross-verifies to $10^{-10}$ precision using **Composite Simpson's 1/3 Quadrature**:
  $$\int_a^b f(x)\,dx \approx \frac{h}{3}\left[f(x_0) + 4\sum_{i=1,3,\dots}^{n-1} f(x_i) + 2\sum_{i=2,4,\dots}^{n-2} f(x_i) + f(x_n)\right]$$

#### D. System of Linear Equations (`Gaussian Elimination + Cramer's Rule`)
For a $2\times 2$ or $3\times 3$ system $A\mathbf{x} = \mathbf{b}$:
1. Parses equations into augmented matrix $[A \mid \mathbf{b}]$.
2. Computes determinant $\det(A)$.
3. Emits step-by-step elimination (`Multiply Row 1 by ... and add to Row 2`) and back-substitution to solve $(x, y)$ or $(x, y, z)$.

#### E. Quadratic & Rational Inequality Interval Solver
For $ax^2 + bx + c \ge 0$ (e.g., $-2x^2 + 5x + 7 \ge 0$):
1. Normalizes leading coefficient sign (dividing by $-1$ and flipping inequality direction if $a < 0$).
2. Finds boundary roots $r_1 \le r_2$.
3. Performs sign-chart test on intervals $(-\infty, r_1)$, $(r_1, r_2)$, $(r_2, +\infty)$ and outputs both inequality form ($-1 \le x \le \frac{7}{2}$) and interval notation ($\left[-1, \frac{7}{2}\right]$).

---

## 3. Core Algorithm 2: Adaptive 2D Function Graphing Engine (`src/lib/math-engine/grapher.ts`)

Whenever a question or calculator input contains a single-variable function $y = f(x)$ or equation $g(x) = h(x)$ (plotted as $f(x) = g(x) - h(x)$):
1. **Domain Selection**: Centers viewport around detected roots/critical points $[x_{\min}, x_{\max}]$ (default $[-10, 10]$).
2. **Discontinuity-Aware Sampling**: Evaluates $N = 240$ points across $[x_{\min}, x_{\max}]$. If $|\Delta y / \Delta x|$ exceeds a vertical asymptote threshold and changes sign, splits the SVG `<path>` into separate continuous segments so vertical asymptotes (such as $\frac{x-1}{x+2}$ at $x = -2$) render cleanly without false connecting lines.
3. **Feature Detection**: Automatically locates and pins interactive SVG markers for:
   - **Roots / X-intercepts** ($f(x) = 0$ via bisection/Newton-Raphson refinement)
   - **Y-intercept** ($f(0)$)
   - **Local Extrema** ($f'(x) = 0$)

---

## 4. Core Algorithm 3: Interactive 8-Handle Image Crop & OCR Pipeline (`src/components/ImageCropModal.tsx` & `/api/ocr`)

1. **Coordinate Transformation**:
   - Maintains crop rectangle $R = (x, y, w, h)$ in normalized $[0, 1]$ image coordinates, rotation angle $\theta \in \{0^\circ, 90^\circ, 180^\circ, 270^\circ\}$, and zoom factor $z \in [0.5, 3.0]$.
   - Dragging any of the 8 handles (`NW, N, NE, E, SE, S, SW, W`) updates $R$ with minimum dimension clamping ($w, h \ge 0.08$).
2. **Canvas Sub-Region Extraction**:
   - Applies 2D affine rotation and scale on an offscreen `<canvas>`, extracts the cropped pixel buffer, and encodes a high-contrast PNG data URL.
3. **Vision/OCR Extraction (`/api/ocr`)**:
   - Extracts embedded problem metadata or invokes the pluggable AI Vision/Text recognizer to return clean LaTeX/text + detected subject, pre-filling or immediately solving the cropped problem.

---

## 5. Core Algorithm 4: Pluggable AI Provider SDK (`src/lib/ai/provider.ts`)

```typescript
export interface AiCompletionRequest {
  task: 'solve' | 'atlas' | 'course' | 'writing' | 'tutor-chat' | 'ocr';
  systemPrompt: string;
  userPrompt: string;
  preferredProvider?: 'auto' | 'copilot' | 'azure-openai';
  model?: string;
}
```
- **Provider Resolution Order (`auto`)**:
  1. If `preferredProvider === 'azure-openai'` (or `AI_PROVIDER=azure-openai`) and `AZURE_OPENAI_ENDPOINT` + `AZURE_OPENAI_API_KEY` are configured, dispatches to Azure OpenAI Chat Completions API.
  2. Otherwise, dispatches to `@github/copilot-sdk` (`CopilotClient`), starting a lightweight session with `availableTools: []` and `enableSessionStore: false`.
  3. If the external SDK times out or is unavailable in an isolated test environment, seamlessly falls back to the deterministic Neuro-Symbolic & Domain Synthesis Engine so 100% of user flows succeed with zero downtime.

---

## 6. Core Algorithm 5: Invite-Only Admission & Security Invariants (`src/lib/account-admission/`)

- **Single-Use & Expiring Invitation Claim**:
  - Each `AccountInvitation` has both a human-typeable code (`GAUTH-XXXX-XXXX`) and a 256-bit cryptographic token (`tokenHash = sha256(token)`), `role` (`ADMIN | TUTOR | STUDENT`), `maxUses` (default `1`), `usedCount`, and `expiresAt`.
  - Registration executes inside a serializable `prisma.$transaction`:
    1. Verifies `status === "PENDING"`, `expiresAt > now`, `usedCount < maxUses`, and email match.
    2. Hashes password using `scrypt` (`N=16384, r=8, p=1`, 64-byte derived key with random 16-byte salt).
    3. Creates `User` + `PasswordCredential`.
    4. Atomically updates `AccountInvitation` (`usedCount + 1`; if `usedCount + 1 >= maxUses`, sets `status = "ACCEPTED"`, `acceptedById = user.id`, `acceptedAt = now`, `activeForEmail = null`, `tokenHash = null`).
    5. Inserts an immutable `AuditLog` entry (`INVITATION_ACCEPTED`).
- **CLI-Only Admin Bootstrap (`scripts/bootstrap-admin.ts`)**:
  - Reads password from `--password-stdin` (or `--password`), upserts `User` with `role: "ADMIN"`, `status: "ACTIVE"`, `planTier: "PLUS"`, upserts `PasswordCredential`, and logs `ADMIN_BOOTSTRAPPED_CLI` in `AuditLog`. No HTTP bootstrap endpoint exists anywhere in the codebase.
