# 00 — Systematic Exploration Coverage Report (`https://www.gauthmath.com`)

**Target Application:** Gauth / Gauthmath (`https://www.gauthmath.com` & integrated `https://www.gauth.com/atlas`, `https://www.gauth.com/course`)  
**Authentication Context:** `.cred` cookies loaded into Playwright (Authenticated user: `Joshuah Powlowski`, `user_id_str: "7698645164634440705"`, region: `sg`, `Free Account` with `Queries: 3/3`, `Gauth AI Pro: 1/1`)  
**Browser Engine:** Playwright + Headed Google Chrome via `xvfb-run` (bypassing Akamai Bot Manager TLS/JS fingerprinting)  
**Viewports Tested:** Desktop (`1440×900`), Tablet (`768×1024`), Mobile (`390×844`)

---

## 1. Route & Page Coverage Matrix

| # | Route / URL | Page Title | Auth State | Viewport(s) | Screenshot Artifact(s) | Status |
|---|---|---|---|---|---|---|
| 1 | `/` | Gauth - Best AI Homework Helper for All School Subjects | Authenticated (`Joshuah Powlowski`) | `1440×900`, `390×844` | `01-home-desktop.png`, `01-home-desktop-full.png`, `02-home-clean-desktop.png`, `02-home-full-desktop.png`, `21-home-mobile.png` | Verified |
| 2 | `/` (Sidebar Resources Submenu) | Subject & Study Resource Navigation | Authenticated | `1440×900` | `03-sidebar-resources-expanded.png` | Verified |
| 3 | `/` (Gauth PLUS Modal) | Choose Your Plan — Gauth PLUS | Authenticated | `1440×900` | `05-gauth-plus-modal.png`, `06-user-profile-popover.png` | Verified |
| 4 | `/` (Image Upload & Crop Modal) | Crop one question at a time | Authenticated | `1440×900` | `25-image-crop-modal.png` | Verified |
| 5 | `/search-question?search=...&questionID=...` | Step-by-Step AI Solver Result (`x^2 - 4x + 3 = 0`) | Authenticated | `1440×900` | `20-calculator-solved.png` | Verified |
| 6 | `/calculator` | AI Calculator - Online Homework Helper, Get Step-by-step Answers | Authenticated | `1440×900`, `390×844` | `09-calculator-desktop.png`, `22-calculator-mobile.png`, `30-calculator-functions-tab.png` | Verified |
| 7 | `/atlas/` (`gauth.com/atlas`) | Gauth Atlas: Turn any topic into a visual story | Authenticated | `1440×900` | `10-atlas-desktop.png`, `26-atlas-story-player.png` | Verified |
| 8 | `/course` (`gauth.com/course/science`) | Interactive Science Courses \| Gauth Academy | Authenticated | `1440×900` | `11-course-desktop.png`, `27-course-catalog-clean.png`, `28-course-interactive-player.png` | Verified |
| 9 | `/study-resources/math/popular/1?mode=questions` | Math Homework Help & Answers - Popular Asked & Solved | Authenticated | `1440×900` | `12-study-resources-math.png` | Verified |
| 10 | `/solution/1987598227231748/...` | Solved: DIFFERENTIATION `e^(2x)sin 3x` & `ln(1+x^2)` [Calculus] | Authenticated | `1440×900`, `768×1024` | `13-solution-calculus.png`, `23-solution-tablet.png` | Verified |
| 11 | `/solution/1987599304507140/...` | Solved: How many atoms in total are in a molecule of sulfur hexafluoride? [Chemistry] | Authenticated | `1440×900` | `14-solution-chemistry.png` | Verified |
| 12 | `/writing-examples/essay/1` | Create your own Essay — Writing Helper & Essay Bank | Authenticated | `1440×900` | `15-writing-examples.png`, `29-writing-essay-detail.png` | Verified |
| 13 | `/plus` | Subscribe Now! Try Tomorrow's Learning Today | Authenticated | `1440×900` | `24-gauth-plus-page.png` | Verified |
| 14 | `/blog` | Basic Knowledge - Gauth Blog | Authenticated | `1440×900` | `16-blog-desktop.png` | Verified |
| 15 | `/download` | Download Gauth: Your Step-by-Step AI Homework Helper | Authenticated | `1440×900` | `17-download-app.png` | Verified |
| 16 | `/aboutus` | Gauth: Elevate your learning with the best AI study platform | Authenticated | `1440×900` | `18-about-us.png` | Verified |
| 17 | `/honor` | Gauth Honor Code | Authenticated | `1440×900` | `19-honor-code.png` | Verified |

---

## 2. Observed Backend API Architecture & Data Flows

During Playwright exploration, 1,067 network events were recorded. Below are the core backend RPC/REST endpoints observed across `api-sg.gauthmath.com`, `api-sg.gauth.com`, and `login-row.gauthmath.com`:

### 2.1 Authentication & User Quota (`Passport` + `Benefit` Service)
- **`GET https://login-row.gauthmath.com/passport/web/account/info/?aid=369768`**
  - Returns the authenticated profile:
    ```json
    {
      "data": {
        "user_id_str": "7698645164634440705",
        "screen_name": "Joshuah Powlowski",
        "avatar_url": "https://sf16-passport-sg.ibytedtos.com/...",
        "connects": [{ "platform": "google", "screen_name": "Joshuah Powlowski" }]
      }
    }
    ```
- **`POST https://api-sg.gauthmath.com/bud/benefit/query`**
  - Request: `{"OnlyReturnCurrentRoleBenefit": true}`
  - Response: Returns per-scene quota balances (`Scene 1`: Free AI Queries `RemainTimes: 3 / TotalTimes: 3`; `Scene 2`: Gauth AI Pro `RemainTimes: 1 / TotalTimes: 1`; `Scene 7`: Course/Atlas Creations `RemainTimes: 3 / TotalTimes: 3`).
- **`POST https://api-sg.gauthmath.com/bud/benefit/check`**
  - Request: `{"SceneType": 313, "Role": 1, "Model": 5}`
  - Response: `{"ErrScene": 0, "IsBenefitExausted": false}` — gates question solving and triggers the Gauth PLUS paywall modal when `IsBenefitExausted === true`.

### 2.2 Question Creation, Solving & Step-by-Step Solution Pipeline
1. **`POST /ehi/web_api/question/create`**
   - Payload: `{"Text": "x^2 - 4x + 3 = 0"}` (or OCR/Image token from cropped image upload)
   - Creates a canonical `QuestionID` (`"1988060693175940"`) and redirects client to `/search-question?search=...&action=search&questionID=1988060693175940`.
2. **`POST /ehi/web_api/question/solve`**
   - Payload: `{"QuestionID": "1988060693175940"}`
   - Dispatches the symbolic + LLM solver pipeline and returns `{"SolutionID": "1988065561859716", "SolutionType": 2}`.
3. **`POST /ehi/web_api/solution_detail/get`**
   - Payload: `{"SolutionUrl": "1988060693175940", "WebSolutionScene": 4}`
   - Response structure (`WebSolution.ContentInfo`):
     - `Answer`: Markdown + LaTeX concise boxed final result (`✅ \(x = 1\), ✅ \(x = 3\)`)
     - `Explanation`: Multi-step Markdown + LaTeX breakdown (`Step 1: Identify the coefficients...`, `Step 2: Factor the quadratic expression...`, `Step 3: Solve each factor for x...`, plus `💬 Quick Tip` / `"How" and "Why"` pedagogical annotations)
     - `DeepThinkingText`: Chain-of-thought reasoning trace for Gauth AI Pro mode.
4. **`POST /ehi/web_api/question/related_list`**
   - Payload: `{"QuestionUri": "1988060693175940"}`
   - Returns up to 10 semantically similar questions (`WebQuestionList`) with preview answers, subject tags, and accuracy badges.

### 2.3 Subject Taxonomy & Study Bank (`subject/list`)
- **`POST /ehi/web_api/subject/list`**
  - Returns the 12 top-level academic subjects (`Math`, `Statistics`, `Calculus`, `Physics`, `Chemistry`, `Biology`, `Economics`, `Literature`, `Business`, `Writing`, `Social Science`, `Others`) and their nested `KnowledgeList` subtopics with `KnowledgeIntro` descriptions.

### 2.4 Subscription & Billing (`plus/sell_list/v2`)
- **`POST /ehi/web/plus/sell_list/v2`**
  - Returns the 3 subscription SKUs:
    - `pkg_plus_month_web_2024`: 1 Month — `S$6.99` (`S$0.23/day`)
    - `pkg_plus_quarter_trial_web_2024`: 3 Months — `S$16.99` with `3 Day Free Trial` (`TrialPrice: "0"`)
    - `pkg_plus_year_web_2024`: 12 Months — `S$43.99` (`-30%`, `S$0.12/day`)

---

## 3. Observed UI States, Modals & Edge Cases

1. **Collapsible Left Navigation Rail (`side-menu`)**:
   - Persistent across `/`, `/calculator`, `/study-resources/*`, `/solution/*`, `/writing-examples`, `/plus`.
   - Items: `Homework` (`/`), `Course` (`/course`), `Atlas` (`/atlas`), `Calculator` (`/calculator`), `Resources` (expandable accordion with all subjects + `Writing Examples`), `Blog` (`/blog`), `App` (`/download`).
   - Bottom quota widget: Shows `Free Account` badge, remaining `Queries (3/3)`, remaining `Gauth AI Pro (1/1)`, and `Upgrade >` trigger.
2. **Homework Helper Input & Image Crop Modal**:
   - Supports text input, inline math symbol keypad, drag-and-drop file upload, and clipboard image paste (`Ctrl+V`).
   - Selecting an image opens the **"Crop one question at a time"** modal (`25-image-crop-modal.png`) with an 8-handle interactive crop box, `Rotate` (`90°`), `Zoom In/Out`, `Re-upload`, `Cancel`, and `Search`.
3. **AI Calculator (`/calculator`)**:
   - Mode toggle: `Calculator` vs `Word problem`.
   - 3-Tab Scientific/Symbolic Keypad:
     - `Basic`: Variables (`x, y, z`), powers (`x², xⁿ`), roots (`√, ⁿ√`), fractions (`a/b`), inequalities (`<, >, ≤, ≥`), constants (`π, e`), basic trig (`sin, cos, tan`), calculus (`∫, d/dx, lim`).
     - `Functions`: Full Trig (`sin..csc`), Inverse Trig (`arcsin..arccsc`), Hyperbolic (`sinh..csch`), Calculus (`lim x→0, lim x→a⁻, lim x→a⁺, lim x→∞, d/dx, d²/dx², ∫, ∫ₐᵇ, ∑, ∏`), Combinatorics (`Pₙᵏ, Cₙᵏ, n!`).
     - `abc`: Full QWERTY + Greek symbols (`α, β, γ, θ, λ, Δ, σ, ω`).
   - Includes clickable `Sample Questions` and 22 specialized `Popular Calculators`.
4. **Gauth Atlas (`/atlas`)**:
   - Interactive visual storytelling engine with topic prompt input (`"Turn any topic into a visual story"`) + curated stories (`Empires of the Silk Roads`, `Apollo 11 Moon Mission Journey`, `Anatomy of a Gothic Cathedral`, `The Quantum Double-Slit Experiment`, `Inside the Human Heart`).
   - Clicking a story opens the **Split Visual Canvas & Curiosity Explorer (`26-atlas-story-player.png`)**: interactive SVG/Canvas map with pulsing hotspot pins, zoom controls (`- / 100% / +`), verified source citations (`Sources (4)`), structured chapter narrative, `"Follow Your Curiosity"` chips, and contextual follow-up chat.
5. **Gauth Academy (`/course`)**:
   - Prompt-to-Course generator supporting `⚡ Infinite Mode` (conversational visual exploration) and `📖 Lecture Mode` (structured multi-chapter interactive slides + voice/captions + quiz).
   - Interactive Course Player (`28-course-interactive-player.png`): Interactive physics/STEM canvas (`"Where on the Bat Should You Hit the Ball?"` with clickable impact zones `A`, `B`, `C`), timeline transport bar (`Play/Pause`, `Restart`, `CC`, `1x`, `Fullscreen`), chapter outline, and AI Tutor sidebar chat.
6. **Edge & Error States Observed**:
   - Empty query submission displays inline validation shake/toast (`"Please enter or upload a question"`).
   - Unsupported file format or oversized upload (>10MB) triggers validation toast.
   - Exhausted quota (`Queries 0/3`) automatically opens the **Gauth PLUS Subscription Modal** (`05-gauth-plus-modal.png`).
   - Invalid math syntax in `/calculator` highlights the expression and offers AI Word Problem fallback interpretation.
