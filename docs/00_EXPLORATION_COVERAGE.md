# 00 - Tavi Route and Interaction Coverage

Tavi is a bilingual learning studio focused on independently checked calculations, contextual explanations, and practice. The screenshots in `screenshots/` show the local application, not an external reference product.

Local address: `http://localhost:3456`. Desktop captures use `1440x900`, tablet captures use `768x1024`, and mobile captures use `390x844`.

## Routes and screenshots

| Area | Route or interaction | Screenshot artifacts |
|---|---|---|
| Solve | `/`, question composer and learning directory | `01-home-desktop.png`, `01-home-desktop-full.png`, `02-home-clean-desktop.png`, `02-home-full-desktop.png`, `21-home-mobile.png` |
| Navigation | Header Explore menu | `03-sidebar-resources-expanded.png` |
| Plans | Subscription dialog and `/plus` | `05-tavi-plus-modal.png`, `24-tavi-plus-page.png` |
| Authentication | `/auth` | `06-user-profile-popover.png` |
| Calculator | `/calculator`, result, function presets | `09-calculator-desktop.png`, `20-calculator-solved.png`, `22-calculator-mobile.png`, `30-calculator-functions-tab.png` |
| Atlas | `/atlas`, current article and comprehension check | `10-atlas-desktop.png`, `26-atlas-story-player.png` |
| Academy | `/course`, course chooser and slide player | `11-course-desktop.png`, `27-course-catalog-clean.png`, `28-course-interactive-player.png` |
| Subjects | `/study-resources` | `12-study-resources-math.png` |
| Solutions | `/solution/[id]`, worked steps and contextual tutor | `13-solution-calculus.png`, `14-solution-chemistry.png`, `23-solution-tablet.png` |
| Writing | `/writing-examples`, draft controls and reading shelf | `15-writing-examples.png`, `29-writing-essay-detail.png` |
| Journal | `/blog` | `16-blog-desktop.png` |
| App information | `/download`, `/aboutus`, `/honor` | `17-download-app.png`, `18-about-us.png`, `19-honor-code.png` |
| Image input | Image crop dialog on `/` | `25-image-crop-modal.png` |

Some artifact filenames are retained for existing documentation links; their contents reflect the current Tavi interface.

## Application API boundaries

| Endpoint | Responsibility |
|---|---|
| `/api/auth/[...nextauth]` | Credential and Google authentication |
| `/api/auth/register` | Invitation-based registration |
| `/api/questions` | Visible study-bank records and submitted questions |
| `/api/questions/[id]` | Solution details, bookmarks, feedback, and tutoring |
| `/api/calculator/evaluate` | Deterministic calculation and graph results |
| `/api/ocr` | Cropped-image extraction |
| `/api/atlas` | Articles and source-context questions |
| `/api/courses` | Course content and slide-context questions |
| `/api/writing` | Documents, review, polish, grammar, and outlines |
| `/api/speech` | Authenticated Azure Speech input and narration |
| `/api/subscription` | Current plan and quota management |
| `/api/admin` | Administrator-only governance |
| `/api/health` | Application, database, and provider readiness |

## Verification commands

- `npm run test:unit`: solver, graphing, admission, database, and provider regressions.
- `npm run test:math` and `npm run test:i18n`: formula rendering and language behavior.
- `npm run test:learning` and `npm run test:learning:e2e`: contextual tutoring, practice, writing, and voice.
- `npm run test:ui`: themed selects, keyboard/touch interaction, server-rendered route content, navigation stability, and history restoration.
- `npm run test:e2e`: cross-feature workflows, account administration, localization, and responsive layouts.
