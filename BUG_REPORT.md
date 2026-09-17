# Bug Report

Known bugs and inconsistencies in the Hydrogen Lab Safety app. This is a working list — items should move here as they're found and out once fixed, rather than being scattered through the README.

---

## Security / access control

### `save-hazards` and `upload-image` have no server-side auth guard
The `/lab` edit-mode toggle is gated client-side by `permissions.canManageUsers`, but that only hides the *UI*. The two write endpoints it eventually calls — `POST /api/save-hazards` and `POST /api/upload-image` — have no server-side auth check of their own. Nothing stops a direct, unauthenticated request to either one from overwriting the shared hazard data or lab image, regardless of the caller's permissions.
**Fix:** add `requireUser` or `requireAdmin` (as appropriate) to both routes.

### `load-module-options`'s "no auth needed" call was made against an already-unguarded write endpoint
`GET /api/load-module-options` (added to populate the lab editor's Linked Module dropdowns) was deliberately left public, on the reasoning that it returns a subset of data — `section`, `id`, `title`, `badge_num` — already exposed publicly per-section via `GET /api/load-modules`, so gating it wouldn't reduce any real exposure. That reasoning holds on its own.
But it was evaluated in a context where the write endpoint it feeds into, `POST /api/save-hazards`, has no auth guard either (see above) — so "is this data already effectively public" was judged against a write surface that itself shouldn't be reachable unauthenticated. Once `save-hazards`/`upload-image` get proper guards, it's worth re-confirming `load-module-options`'s public status still makes sense on its own terms, rather than carrying forward a conclusion reached alongside an open gap.

### `/admin/users/[uid]/progress` client-side gate is weaker than its parent page
`/admin/users` checks `isAdmin` before rendering. `/admin/users/[uid]/progress` only checks that a user is logged in (`useAuth()`'s `user`), not `isAdmin`. In practice this is a shell-only gap — the API route behind it, `GET /api/admin/users/{uid}/progress`, does enforce `requireAdmin`, so a non-admin who navigates here directly gets a static shell and every data fetch comes back `403`. Still worth tightening for consistency, since relying on "the API happens to reject it" is a thinner guarantee than gating the page itself.

### `/feedback` doesn't redirect unauthenticated visitors, unlike every other protected page
Every other page gated on login (`/dashboard`, `/lab`, the module and quiz pages, etc.) calls `useAuth()` and redirects to `/login` via a `useEffect` when there's no user (see `ADDITIONAL_INFO.md`, "Auth redirect pattern"). `app/feedback/page.tsx` calls `useAuth()` too, but never redirects — the form renders fully for a logged-out visitor, and the only auth check happens inside `handleSubmit`, which sets an inline "You must be logged in to submit feedback." error rather than routing anywhere. A logged-out visitor can fill out the whole form before discovering they can't submit it.
**Fix:** add the same `useEffect`-based redirect used by every other protected page, or, if the form is meant to be publicly viewable, document that as an intentional exception rather than an oversight.

### Status-code mapping is inconsistent between the two auth helpers
Routes using `requireAdmin` map specific thrown messages (`"Access denied"`, `"Missing authorization token"`, `"User profile not found"`) to `403`; anything else becomes `500`. Routes using `requireUser` (`/api/modules/progress`, `/api/quizzes/progress`, `/api/quizzes/leaderboard`) return a blanket `401` for anything thrown in the `try` block — including non-auth errors, such as a malformed JSON body (`/api/modules/progress` and `/api/quizzes/progress` call `request.json()` with no validation of their own). A malformed request currently looks identical to an auth failure on these routes.

---

## Data model / naming mismatches

### `user_type` values don't match between the UI, the type, and the database
`EditUserModal.tsx`'s dropdown offers `public`, `student`, `lecturer`, `researcher`, `industry_professional` — sourced from `AuthContext.tsx`'s own `UserProfile['user_type']` TypeScript type, which uses the same five values. The `profiles` table's check constraint actually allows `engineering_student`, `science_student`, `researcher`, `public`, `lecturer`, `teaching_staff`. Only `public`, `lecturer`, and `researcher` are valid in both.

- Picking `student` or `industry_professional` in the modal and saving fails at the database — `PATCH /api/admin/users/{uid}` passes `user_type` straight through to Supabase with no validation, so the constraint violation surfaces as a raw Supabase error via `alert(data.error)`.
- `engineering_student`, `science_student`, and `teaching_staff` are valid database values with no UI path to set them.
- The root cause is the TypeScript type in `AuthContext.tsx`, not just the modal — every place that reads `profile.user_type` type-checks against 5 possible values while the real column can hold 6, 3 of them different from the type's list.

**Fix:** correct `UserProfile['user_type']` in `AuthContext.tsx` to the real 6-value set, update the modal's options to match, and add server-side validation in the PATCH route.

### Quiz ID naming mismatch
`POST /api/quizzes/progress` hardcodes `quiz_id: "hydrogen-hazards"` server-side — a different string from `QUIZ_SLUG` (`"hazards"`, used in the URL and in `lib/questionhazards.ts`). Cosmetic today (there's only one quiz), but a trap for anything that assumes `quiz_id` matches the URL slug. The `quizzes`/`quiz_questions` tables (loaded via `useQuiz`/`GET /api/quizzes/load-quiz`, see `ADDITIONAL_INFO.md`) are not affected — both are keyed by `QUIZ_SLUG` (`"hazards"`) directly, so this mismatch is isolated to `user_quiz_progress` and the two routes below.

### Quiz ID is hardcoded independently in two places
`const QUIZ_ID = "hydrogen-hazards"` is declared separately in both `app/api/quizzes/progress/route.ts` and `app/api/quizzes/leaderboard/route.ts`, rather than shared from one location. This is in addition to the existing mismatch against `QUIZ_SLUG` (`"hazards"`) noted above. Nothing enforces the two `QUIZ_ID` copies staying in sync — if one is ever changed without the other (e.g. when a second quiz is added and this gets refactored), the leaderboard would silently query for a `quiz_id` that no `user_quiz_progress` row actually has, returning an empty leaderboard rather than an error.
**Fix:** export `QUIZ_ID` from a single shared location (e.g. alongside `QUIZ_SLUG` in `lib/questionhazards.ts`) and import it in both routes.

---

## Data integrity

### Quiz submissions overwrite prior results with no "best attempt" logic
`POST /api/quizzes/progress` `upsert`s onto `(uid, quiz_id)`: `attempts` increments, but `score`/`passed` are simply overwritten by the latest submission. There's no history. Passing a quiz, then retrying and failing, replaces the stored `passed: true` with `false` — the prior pass is lost. This has a downstream effect on the leaderboard page: since `GET /api/quizzes/leaderboard` reads `score` straight from `user_quiz_progress`, a student who posts a high score, opts into the leaderboard, then retries and does worse will see their leaderboard rank drop to match the new (lower) score - there's not "best score" retained anywhere to rank on instead.
**Fix:** either keep a best-attempt column separately, or stop clearing `passed` on a failed retry.

### `handleContinue`'s `localStorage` write is now dead code
`/certificate` used to gate entirely on a `localStorage` record written by `/quizzes/hazards`'s `handleContinue` — this has been fixed; the page now fetches `/api/modules/progress` and `/api/quizzes/progress` server-side instead (see `ADDITIONAL_INFO.md`). But `handleContinue` still writes `{ passed: true, score, date }` to `localStorage` (key `hydrogenlabsafety_quiz_hazards_${uid}`) before routing to `/certificate`, and `/certificate` no longer reads that key at all. The write, and the `storageKey()` helper that builds it, currently do nothing.
**Fix:** remove the `localStorage` write (and `storageKey()`) from `handleContinue`.

### Admin panel's two progress numbers disagree with each other, and with reality
`GET /api/admin/users` already returns a server-computed `statistics` object (`totalUsers`, `administrators`, `learners`, `trainingCompleted`, `averageProgress`, `totalModules`), derived from `user_module_progress` using `hazardModules.length` (currently 5) as `totalModules` and `progress >= 100` as "complete." **The admin page ignores this entirely.** Instead, for every non-admin, non-`public`-type user, it separately fetches `GET /api/admin/users/{uid}/progress` and recomputes the same two numbers itself:
- N+1 requests where one would do — the exact `statistics` object it needs is sitting unused in the first response.
- The two computations don't use the same completion rule: the list route counts `progress >= 100` only; the per-user route also accepts `status === "done"`, and hardcodes `totalModules` to the literal `5` rather than deriving it from `hazardModules.length` — so they'd silently diverge if a module's `status`/`progress` disagreed, or if a 6th module were added.
- The two routes compute "overall progress" differently in kind, not just source: the list route averages each module's own `progress` percentage (partial credit); the per-user route computes `completedModules / totalModules * 100` (no credit until 100%). Since the page only uses the per-user route's numbers, "Average Progress" on the stat card is the coarser, all-or-nothing version — a user with five modules all at 80% shows 0%, not 80%.

**Fix:** use `data.statistics` from the list route directly, and make the two completion/progress formulas agree (or delete one).

### Admin "Certificate eligibility" measures a different thing than the real certificate page
The admin panel shows "Eligible"/"Pending" based on `completedModules >= totalModules` (module completion). The real `/certificate` page gates on a passed **quiz** result in `localStorage` (see above). These are different criteria entirely, not just different data sources — someone who's finished every module but never passed the quiz shows "Eligible" in admin while seeing "No certificate yet" on the real page, and vice versa.

### Admin progress views only account for `hazard-modules`, not `guides`
`GET /api/admin/users` and `GET /api/admin/users/{uid}/progress` both scope their `user_module_progress` queries to `section = "hazard-modules"`, and `totalModules` is `hazardModules.length` in both routes. A learner's progress in any other `app/modules/` section (currently just `guides`) never appears anywhere in the admin panel — not in the dashboard statistics, the per-user progress page, or certificate eligibility. `guides` is a template section not linked in navigation, so this is low-priority today, but the admin routes would need to generalize before any future real second section could get admin visibility.
**Fix:** generalize the admin routes' section scoping (aggregate across sections, or accept a section list) if/when a second section needs admin visibility, rather than hardcoding `hazard-modules`.

### Certificate pass-threshold is hardcoded separately from the real threshold — now in both copy and logic
`/certificate`'s "No certificate yet" panel hardcodes "70% or higher" as prose text, independent of `PASS_THRESHOLD` in `lib/questionhazards.ts` (used by the actual scoring logic). This now goes beyond copy: `quizPassed` itself is computed as `record.score >= 70`, a second independent hardcoded `70`, rather than trusting the `passed` boolean that `/api/quizzes/progress` already computed and stored from `PASS_THRESHOLD` at submit time. If `PASS_THRESHOLD` ever changes, both this string and the certificate's actual gating logic would silently disagree with the real threshold — and with each other.
**Fix:** import `PASS_THRESHOLD` in both the prose and `quizPassed`, or gate on `record.passed` directly instead of recomputing it from `score`.

### Logout's `sessionStorage` flag can go stale, silently eating the next Login click
`Navbar.tsx`'s `handleLogout` sets `sessionStorage.setItem("logoutRedirect", "true")` before logging out, meant to be consumed by `/login` on its next mount to suppress a flash of the login form during the logout redirect race (see `ADDITIONAL_INFO.md`). But it's only consumed if `/login` actually mounts during that race — which only happens if the page the user logged out *from* has its own competing redirect-to-`/login` effect. Logging out from `/` or `/about` (both allow logged-in users and have no such effect) means the flag is never cleared at logout time; it just persists in `sessionStorage` for that tab.
The next time the user visits `/login` in that tab — e.g. clicking "Login" from the navbar to sign back in — the page finds the stale flag, silently redirects straight back to `/`, and only then clears it. The user's first "Login" click after such a logout does nothing visible; they have to click it again to actually see the form.
**Fix:** clear the flag in `handleLogout` itself once its own `router.replace('/')` fires (rather than relying solely on `/login` to consume it), or use a one-shot mechanism that doesn't depend on `/login` being the next page visited.

### `save-hazards` does a full delete-then-reinsert, not a diff
`/api/save-hazards` deletes every row in the `hazards` table, then re-inserts one row per current hotspot. If the request fails partway through, the table could in principle be left empty rather than reverted to its prior state.

### Several tables store a `uid` (or other cross-table reference) with no foreign key enforcing it
`user_module_progress` does this correctly — `fk_user_progress` ties its `uid` to `profiles.uid`, and `fk_user_progress_module` ties `(section, module_id)` to `modules`. Nothing else follows that pattern:
- `user_quiz_progress.uid` has no FK to `profiles.uid`; `quiz_id` has no FK to `quizzes.quiz_id`.
- `feedback.user_id` has no FK to `profiles.uid`.
- `user_hazard_progress.uid` has no FK to `profiles.uid`; `hazard_id` has no FK to `hazards.type`.

Application code checks referential validity in some of these cases (e.g. `POST /api/hazards/progress` looks up the hazard before inserting), but the database itself doesn't enforce it — a row could be inserted directly, or by a future code path that skips the check, referencing a `uid`/`hazard_id`/`quiz_id` that doesn't exist.
**Fix:** add the missing foreign keys, following `user_module_progress`'s existing pattern.

---

## Dashboard placeholder content

`app/dashboard/page.tsx` is entirely static JSX past the auth check — no data fetching at all, so nothing here reflects real user state:

- The three stat cards (**Modules**, **Scenarios / Simulation**, **Quizzes**) show fixed counts (`12`, `8`, `16`) and fixed completion text (e.g. "4 completed · 3 in progress"), unrelated to the real data — there are only 5 hazard modules, one lab, and one live quiz. Their links (`/modules/hazard-modules`, `/lab`, `/quizzes`) are correct, at least.
- The **Training Progress** panel lists five module names ("H₂ Fundamentals & Properties," "Safety Protocols & Handling," "Electrolysis & Production," "Fuel Cell Technology," "Storage & Transportation," fixed at 65%) that don't correspond to any real module. The real hazard modules are about flammability, storage, buoyancy, and detection — this looks like leftover mockup content from an earlier, differently-scoped curriculum.
- The **Completed Modules** panel always claims "You've completed the Safety Protocols & Handling module" and links to `/certificate`, regardless of whether the signed-in user has actually passed the quiz.

**Fix:** replace with data fetched from Supabase (module/quiz progress).

---

## Dead / unwired code

### 7 of 8 `Permissions` flags are computed but never consulted
`useAuth()` derives an 8-flag `Permissions` object on every render. Only `canManageUsers` is actually read anywhere (`Navbar.tsx`, gating the Administration link; and `EditModeToggle.tsx`, gating the `/lab` edit-mode switch). The other seven (`canAccessModules`, `canUseSimulation`, `canViewReports`, `canEditContent`, `canManageScenarios`, `canViewAnalytics`, `canViewAuditLogs`) are dead: there's no `/reports`, `/analytics`, or audit-log page for the last three to gate, and the pages that do exist (modules, lab) check `user`/`isAdmin` directly rather than consulting any of the others. Note: `canEditContent`/`canManageScenarios` are the semantically-closer fit for gating lab edit mode than `canManageUsers`.

### `next.config.ts` coexists with `next.config.js`
`next.config.ts` is an empty stub; `next.config.js` holds the real, active config. Harmless but potentially confusing — Next.js only loads one of them.

### `GET /api/admin/feedback` has no admin-facing page reading it
The route (`requireAdmin`-gated) returns every row from the `feedback` table ordered by `created_at` descending, but no page under `app/admin/` currently calls it — feedback submitted via `/feedback` reaches the database with no way to view it in the app.
**Fix:** add an admin feedback-listing page, or, if reviewing submissions directly in the Supabase dashboard is the intended workflow, note that here so this isn't mistaken for an unfinished feature.

### `GET /api/hazards/progress` has no page reading it
The route returns the signed-in user's hazard-click history, `completedHazards`, and `totalHazards`, but no page in the app currently displays lab/hotspot progress anywhere — not the dashboard, not the admin per-user progress page (which only reads module and quiz progress). Only the `POST` side is currently wired up.

### `leaderboard_visible` is returned by the admin per-user progress route but never displayed
`GET /api/admin/users/{uid}/progress` selects `*` on `user_quiz_progress`, so `leaderboard_visible` comes through in the response, but no admin UI currently reads or shows it.

### `eslint.config.mjs` references packages that aren't installed
The config references `eslint-config-next`, but neither it nor `eslint` itself appear in `package.json`. Linting likely doesn't currently run as configured.

### Tailwind CSS v4 is installed but not used
`postcss.config.mjs` wires up `@tailwindcss/postcss`, but `globals.css` has no `@import "tailwindcss";` or other Tailwind directive, so Tailwind is installed and configured but never actually pulled into the stylesheet. All styling is hand-written CSS with custom properties.

### `next/image`'s `remotePatterns` config is currently a no-op
`next.config.js` configures `images.remotePatterns` to allow the Supabase Storage hostname, but the app's only `next/image` usage (the lab image in `app/lab/page.tsx`) sets the `unoptimized` prop, which skips Next's image optimizer — and the domain allowlist it enforces — entirely, falling back to a plain `<img>`. The config isn't wrong, just inert until `unoptimized` is removed or another `next/image` usage without it is added.

---

## Performance

### Fonts are loaded via a `<link>` tag instead of `next/font/google`
`layout.tsx` pulls in **Exo 2** and **Inter** from Google Fonts using a plain `<link>` tag rather than `next/font/google`. This means the fonts aren't self-hosted or subset by Next's font optimizer — an extra render-blocking request to Google's CDN on every page load, and no automatic `font-display`/preload handling.
**Fix:** replace the `<link>` tag with `next/font/google`:
```tsx
import { Exo_2, Inter } from 'next/font/google';
```
See the [Next.js font documentation](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) for setup details.

---

## Architecture / structure

### The lab's edit mode lives entirely in `app/lab/page.tsx` + `useHazards.ts` — worth revisiting if a third editable page appears
The module reader-page editor (`useModuleEditor.ts`, `ModuleEditor.tsx`, etc.) was deliberately split into its own hook/components rather than folded into `useModules.ts`, since that hook is shared read-only infrastructure used by multiple sections and (eventually) both listing and reader pages. `useHazards.ts` doesn't face that same pressure today — `/lab` is its only consumer — so it still reasonably combines load+edit+save in one hook. But if a third page gains an in-app editor (or `/lab`'s edit mode is refactored alongside the modules one), it's worth deciding on one consistent shape across all of them — e.g. a generic "load defaults + live data, with an edit/save layer on top" pattern — rather than three independently-evolved editors. Not worth reworking `useHazards.ts` preemptively for a pattern used by only one page today.

### The quiz editor has an "unsaved changes" warning that the lab and module editors don't
`app/quizzes/[quizId]/edit/page.tsx` warns before an admin loses in-progress edits — on tab close/refresh, on any in-app link click while a change is unsaved, and on the page's own "Back to Quizzes" link (see `ADDITIONAL_INFO.md`, "Quiz Content Editor"). Neither `/lab`'s edit mode nor the module reader pages' editors have any equivalent — navigating away from either with unsaved hotspot/module edits loses them silently, with no prompt. Worth deciding whether the other two should get the same treatment for consistency, or whether the quiz editor's separate-page structure (as opposed to the other two's in-place edit-mode toggle) makes the warning more necessary there specifically.

### `app/api/` has no subfolder grouping for `hazards`/lab-image/module routes
Of the module-content routes, only `save-module` (added this round) and the pre-existing `modules/progress` live under `app/api/modules/` — `load-modules` and `load-module-options` are still flat top-level folders under `app/api/`, alongside `load-hazards`, `save-hazards`, `load-image`, and `upload-image`. Moving those remaining ones into `app/api/lab/` and `app/api/modules/` respectively would finish the grouping, at the cost of updating every `fetch('/api/...')` call site for them. Worth doing as one deliberate pass rather than piecemeal, since it's a routing/URL change, not just a file move.
`app/api/lab/video/route.ts` and `app/api/hazards/progress/route.ts` add a third and fourth flavor to this same inconsistency: `lab/video` already sits under the eventual target folder (`app/api/lab/`), while `hazards/progress` sits under a folder (`app/api/hazards/`) that matches neither the flat routes above nor the `app/api/lab/` grouping either is headed toward. Folding `load-hazards`, `save-hazards`, `load-image`, `upload-image`, and `hazards/progress` all into `app/api/lab/` (alongside `video`, which is already there) would resolve all of it in one pass.

### `hooks/` has no subfolder grouping, and is growing one file per editable page
`hooks/` holds a flat mix of read-only data hooks (`useHazards.ts`, `useModules.ts`, `useQuiz.ts`, `useModuleOptions.ts`) and editor hooks (`useModuleEditor.ts`, `useQuizEditor.ts`), each pair mostly used by only one page or section. This is the same shape of issue as `app/api/`'s flat routes above, just for hooks instead of routes — worth grouping before a fourth or fifth editable page adds two more files to the same flat list. Two reasonable directions, not mutually exclusive: subfolders within `hooks/` itself (e.g. `hooks/lab/`, `hooks/quizzes/`), or moving each pair into the `app/` folder of the page that actually uses it (e.g. `app/lab/hooks/`), colocating the hook with its one consumer. The latter is closer to Next.js's general colocation conventions but is a bigger reorganization since it touches every import path across the app; the former is a smaller, more mechanical move.

### `lib/` has no subfolder grouping either
Same shape of issue as `app/api/` and `hooks/` above: `lib/` is a flat mix of data files (`hazards.ts`, `hazardModules.ts`, `guides.ts`, `questionhazards.ts`, `moduleTypes.ts`), auth helpers (`authUser.ts`, `adminAuth.ts`), service clients (`supabase.ts`, `firebase.ts`, `firebaseAdmin.ts`), and now `video.ts`. Worth grouping into subfolders along the same lines once a natural split presents itself, rather than continuing to add files to one flat list.

### CSS is split across many page-specific files with no canonical reference for which classes are global vs. local
Every page/component folder that needs styling imports its own `.css` file (see the CSS Structure table in `README.md`), and `globals.css` holds `nav`, `.main`, `.panel`, edit-mode toggle, and save-bar styles used everywhere. But there's no single place listing which classes are safe to assume as globally available versus which need a local definition — confirming this for a new page means reading `globals.css` in full, or checking how an existing page with similar markup handles it.

`app/quizzes/[quizId]/edit/quizEditor.css` duplicates `.quiz-defaults-notice` (already defined once in `quizzes.css`) rather than sharing it, since the two pages don't import each other's stylesheets and there's no shared partial for classes used by more than one page but not all of them. Some classes are also used identically across multiple page-specific files without being pulled into `globals.css`, even though they're not page-specific in nature — `.page-header` is used by the admin pages, the quizzes pages, and others, but is defined independently (or, in at least one case, not confirmed to be defined at all) in each.

**Fix:** an audit of every `.css` file against the classes actually used in its corresponding page(s) — confirming each class is defined exactly once, in the appropriate scope (`globals.css` for genuinely shared patterns, a page-specific file for one-off use) — would likely surface both missing and duplicated rules, and is worth doing as its own deliberate pass rather than catching each instance individually as new pages are added.

---

## Cosmetic / minor

### `ModuleVideo.tsx`/`VideoEditorPanel.tsx` still use "module"-prefixed names despite being shared with the lab page
`ModuleVideo.tsx`'s CSS classes (`module-video-*`, defined in `globals.css`) and the classes `VideoEditorPanel.tsx` reuses from the module editor (`module-field-stack`, `module-select`, `module-add-item-btn`, `module-delete-btn`) read as module-specific, but both files are shared with `HotspotEditor.tsx`/`HazardPopup.tsx` on `/lab` too. The component name itself has the same problem — `ModuleVideo` for something that's just as much a lab component now would more accurately be `EmbeddedVideo`. Purely cosmetic — nothing behaves incorrectly — but worth a rename pass (component, file, and the CSS classes) for clarity.
