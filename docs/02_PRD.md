# 02 — Product Requirements Document (PRD)

## 1. Product Vision & Overview
**Tavi (Tavi AI Study Platform)** is an all-in-one AI homework helper, symbolic calculator, visual knowledge explorer (**Tavi Atlas**), interactive course studio (**Tavi Academy**), writing assistant, and curated STEM study bank. It empowers students and educators to solve complex problems across **12 academic subjects** with step-by-step LaTeX explanations, visual simulations, and on-demand AI/Expert tutoring, governed by enterprise-grade **invite-only account admission, RBAC, revocation, and audit logging**.

---

## 2. Target Personas & Roles

| Role | Persona | Core Capabilities |
|---|---|---|
| **`STUDENT`** | K-12 & University Learner | Submit homework questions (text, math keyboard, or cropped image), use the Symbolic Calculator & 22 specialized calculators, explore Tavi Atlas visual stories, take Tavi Academy interactive courses, use the AI Writing Helper, bookmark solutions, and manage Tavi PLUS subscription quotas. |
| **`TUTOR`** | Verified Subject Expert / Educator | All `STUDENT` capabilities plus ability to author/verify official solutions in the Study Resources Bank, publish curated Tavi Academy courses & Atlas visual stories, and respond to escalated Live Tutor requests. |
| **`ADMIN`** | Platform Administrator | All capabilities plus access to `/admin` console: issue single-use/expiring invitation codes, rotate/revoke invitations, manage user roles (`ADMIN`, `TUTOR`, `STUDENT`), revoke/restore user accounts, switch active AI provider (`Copilot SDK` vs `Azure OpenAI`), and inspect the immutable security `AuditLog`. |

---

## 3. Functional Requirements (FR)

### FR-1: AI Homework Helper & Step-by-Step Solver (`/`, `/search-question`, `/solution/[id]`)
- **FR-1.1 Multi-Modal Question Input**: Users can type a question, compose LaTeX via an inline **Math Symbol Keyboard Modal**, drag-and-drop an image file, or paste an image from clipboard (`Ctrl+V`).
- **FR-1.2 Interactive Image Crop Modal (`"Crop one question at a time"`)**: Uploaded/pasted images open an 8-handle resizable crop overlay with `Rotate 90°`, `Zoom In/Out`, `Re-upload`, `Cancel`, and `Search` (which crops and runs OCR extraction).
- **FR-1.3 Step-by-Step Solution View**: Displays the original question (with image crop if uploaded), Subject & Topic classification badge, `Tavi AI Solution` / `Expert Verified Solution` header (`99% Accuracy`), boxed LaTeX `Answer`, expandable/collapsible `Step 1..N` breakdown with `"How" & "Why"` tips, `💬 Quick Tip`, interactive 2D function graph (when mathematical functions are detected), `Tavi AI Pro Deep Thinking` toggle, helpfulness rating (`👍 / 👎`), bookmarking, and follow-up AI Tutor chat.
- **FR-1.4 Related Questions & Live Tutor Escalation**: Shows semantically related solved questions from the Study Bank and a right-rail `"Ask Tavi AI / Connect with 24/7 Verified Tutor"` panel.

### FR-2: AI Symbolic & Graphing Calculator (`/calculator`)
- **FR-2.1 Dual Input Modes**: Toggle between `Calculator` (symbolic expression/equation) and `Word problem` (natural language math problem).
- **FR-2.2 3-Tab Scientific & Symbolic Keypad**:
  - `Basic`: Numbers, variables (`x, y, z`), powers (`x², xⁿ`), roots (`√, ⁿ√`), fractions (`a/b`), absolute value (`|x|`), inequalities (`≤, ≥, <, >`), constants (`π, e`), core trig & calculus operators.
  - `Functions`: Trigonometry (`sin, cos, tan, cot, sec, csc`), Inverse Trig (`arcsin..arccsc`), Hyperbolic (`sinh..csch`), Calculus (`lim x→0, lim x→a⁻, lim x→a⁺, lim x→∞, d/dx, d²/dx², ∫, ∫ₐᵇ, ∑, ∏`), Combinatorics (`Pₙᵏ, Cₙᵏ, n!`).
  - `abc`: Full alphanumeric & Greek symbol pad (`α, β, γ, θ, λ, Δ, σ, ω`).
- **FR-2.3 Sample Questions & 22 Specialized Sub-Calculators**: Clicking any Sample Question (`x² - x - 6 = 0`, `x⁴ - 5x² + 4 = 0`, `{x + y = 5, 2x - y = 1}`, `log₃(2x - 1) = 2`, etc.) or any of the 22 Popular Calculators (`Graphing Calculator`, `Quadratic Equation Calculator`, `Derivative Calculator`, `Integral Calculator`, `Matrix Calculator`, `System of Equations Calculator`, `Standard Deviation Calculator`, etc.) loads tailored presets and solves step-by-step with an interactive SVG coordinate graph.

### FR-3: Tavi Atlas — Interactive Visual Story Explorer (`/atlas`)
- **FR-3.1 Topic-to-Visual-Story Generator**: Users can enter any topic prompt (`"Turn any topic into a visual story"`) or filter curated visual adventures across `All`, `Culture`, `Art`, `Nature`, `Architecture`, `Human Body`, `Science`, `History`, and `Technology`.
- **FR-3.2 Interactive Hotspot Canvas & Curiosity Deep-Dive**: Opening an Atlas story renders a split view:
  - Left 65%: Interactive visual diagram/map with pulsing clickable **Hotspot Pins**, zoom controls (`- / 100% / +`), and a verified **Sources Drawer** (`Britannica`, `UNESCO`, `NASA`, `Nature`, etc.).
  - Right 35%: Breadcrumb path, multi-section narrative grounded in inline source citations (`[1]`, `[2]`), `"Follow Your Curiosity"` deep-dive chips, and an interactive AI prompt bar that dynamically adds new nodes/layers as the user explores deeper.

### FR-4: Tavi Academy — AI Interactive Course Studio (`/course`)
- **FR-4.1 Prompt-to-Course Generator**: Users enter what they want to learn, optionally attach study notes/files, and select **`⚡ Infinite Mode`** (freeform interactive exploration) or **`📖 Lecture Mode`** (structured multi-chapter interactive lesson with quiz).
- **FR-4.2 Interactive Course Player & Physics/STEM Lab**: Opening any course (e.g. *The Sweet Spot*, *Bending the Light*, *How Noise-Cancelling Headphones Work*, *Golgi Apparatus and Protein Sorting*, *Atomic Number and Element Identity*) launches an interactive simulation stage (clickable zones, real-time physics/biology parameter sliders, play/pause timeline scrub bar, closed captions `CC`, speed `1x/1.5x/2x`), a multi-chapter outline, interactive comprehension quiz, and an embedded AI Course Assistant.

### FR-5: Multi-Subject Study Resources Bank (`/study-resources`)
- Browse and filter solved questions across **12 subjects** (`Math`, `Statistics`, `Calculus`, `Physics`, `Chemistry`, `Biology`, `Economics`, `Literature`, `Business`, `Writing`, `Social Science`, `Others`) and subtopics (`Equations`, `Derivatives`, `Integrals`, `Thermodynamics`, `Stoichiometry`, `Cell Biology`, `Microeconomics`, etc.), with search, pagination, and one-click deep links to `/solution/[id]`.

### FR-6: AI Writing Helper & Essay Examples (`/writing-examples`)
- Browse curated high-scoring essays across **11 genres** (`Argumentative Essay`, `Expository Essay`, `Narrative Essay`, `Descriptive Essay`, `Persuasive Essay`, `Compare and Contrast`, `Literary Analysis`, `Research Paper`, `Creative Writing`, `Book Review`, `Speech`) with annotated thesis/body/conclusion breakdowns, plus an interactive **AI Essay Generator & Grammar/Structure Reviewer** (`PDF / Assignment Helper` included).

### FR-7: Tavi PLUS Subscription & Quota System (`/plus` & Upgrade Modal)
- Tracks per-user quota (`Free Account: 3/3 Queries, 1/1 Tavi AI Pro, 3/3 Course/Atlas Credits` vs `Tavi PLUS: Unlimited Queries, 20 AI Pro trials/mo, Priority 24/7 Tutor, Ad-free`).
- Interactive plan selector (`1 Month S$6.99`, `3 Months S$16.99 with 3-Day Free Trial`, `12 Months S$43.99 Save 30%`) that upgrades the user's account tier and logs a billing audit event.

### FR-8: Invite-Only Registration, RBAC, Revocation & Audit Logging (`/auth`, `/invite/[token]`, `/admin`)
- Invite-only registration via single-use/expiring invitation codes or `/invite/[token]` links.
- Admin Console (`/admin`) for `ADMIN` users to create/rotate/revoke invitations, manage user roles & account status (`ACTIVE` / `REVOKED`), configure AI providers (`Copilot SDK` / `Azure OpenAI`), and inspect the security `AuditLog`.
