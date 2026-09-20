# Bug Report

Known bugs and inconsistencies in the Hydrogen Lab Safety app. This is a working list — items should move here as they're found and out once fixed, rather than being scattered through the README.

---

## Security / access control

### `save-hazards` and `upload-image` have no server-side auth guard
The `/lab` edit-mode toggle is gated client-side by `permissions.canManageUsers`, but that only hides the *UI*. The two write endpoints it eventually calls — `POST /api/lab/save-hazards` and `POST /api/lab/upload-image` — have no server-side auth check of their own. Nothing stops a direct, unauthenticated request to either one from overwriting the shared hazard data or lab image, regardless of the caller's permissions.
**Fix:** add `requireUser` or `requireAdmin` (as appropriate) to both routes.

### `/api/profile/get` and `/api/profile/create` have no auth guard and no ownership check
Both routes take `uid` as a plain request parameter (query string on `GET`, body field on `POST`) with no `Authorization` header check at all — this is deliberate, since `AuthContext.tsx` calls both to bootstrap a brand-new user's profile before there's necessarily a token relationship to check (see `ADDITIONAL_INFO.md`, "Roles and permissions"). But neither route additionally confirms the caller *is* the `uid` in question, so as written, anyone can read (`GET /api/profile/get?uid=...`) or create (`POST /api/profile/create`) a profile for an arbitrary uid they don't own, including choosing their own `role`/`user_type` on creation (not currently exploitable client-side, since `AuthContext.tsx`'s own calls always hardcode `role: "user"`, `user_type: "public"`, but the route itself doesn't enforce that).
**Fix:** at minimum, verify a Firebase bearer token and require it to match the `uid` being read or created.

### `GET /api/admin/feedback` doesn't follow the same status-code convention as other `requireAdmin` routes
Every other `requireAdmin` route maps `"Access denied"`/`"Missing authorization token"`/`"User profile not found"` to `403`. `GET /api/admin/feedback` instead maps `"Missing authorization token"` to `401` and doesn't special-case `"User profile not found"` at all, falling through to a generic `500`. Functionally similar (an unauthorized caller still gets rejected), but the exact status code returned for the same underlying failure differs depending on which admin route you hit.

### `load-module-options`'s "no auth needed" call was made against an already-unguarded write endpoint
`GET /api/lab/load-module-options` (added to populate the lab editor's Linked Module dropdowns) was deliberately left public, on the reasoning that it returns a subset of data — `section`, `id`, `title`, `badge_num` — already exposed publicly per-section via `GET /api/modules/load-modules`, so gating it wouldn't reduce any real exposure. That reasoning holds on its own.
But it was evaluated in a context where the write endpoint it feeds into, `POST /api/lab/save-hazards`, has no auth guard either (see above) — so "is this data already effectively public" was judged against a write surface that itself shouldn't be reachable unauthenticated. Once `save-hazards`/`upload-image` get proper guards, it's worth re-confirming `load-module-options`'s public status still makes sense on its own terms, rather than carrying forward a conclusion reached alongside an open gap.

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

### Quiz ID is hardcoded independently in three places
`const QUIZ_ID = "hydrogen-hazards"` is declared separately in `app/api/quizzes/progress/route.ts`, `app/api/quizzes/leaderboard/route.ts`, and `app/api/admin/users/[uid]/progress/route.ts`, rather than shared from one location. This is in addition to the existing mismatch against `QUIZ_SLUG` (`"hazards"`) noted above. Nothing enforces the three `QUIZ_ID` copies staying in sync — if one is ever changed without the others (e.g. when a second quiz is added and this gets refactored), routes reading it would silently query for a `quiz_id` that no `user_quiz_progress` row actually has, returning empty results rather than an error.
The third copy, in the admin per-user progress route, also declares its own `const QUIZ_PASS_SCORE = 70` alongside its `QUIZ_ID` — a fourth independent hardcoded pass threshold, on top of the two described below under "Certificate pass-threshold." Its own comment says this exists specifically to "match the certificate page eligibility rule," which makes the duplication intentional in spirit but still a fourth place that has to be kept in sync by hand.
**Fix:** export `QUIZ_ID` (and, ideally, the real pass threshold) from a single shared location (e.g. alongside `QUIZ_SLUG` in `lib/questionhazards.ts`) and import it in all three routes.

---

## Data integrity

### Quiz submissions overwrite prior results with no "best attempt" logic
`POST /api/quizzes/progress` `upsert`s onto `(uid, quiz_id)`: `attempts` increments, but `score`/`passed` are simply overwritten by the latest submission. There's no history. Passing a quiz, then retrying and failing, replaces the stored `passed: true` with `false` — the prior pass is lost. This has a downstream effect on the leaderboard page: since `GET /api/quizzes/leaderboard` reads `score` straight from `user_quiz_progress`, a student who posts a high score, opts into the leaderboard, then retries and does worse will see their leaderboard rank drop to match the new (lower) score - there's not "best score" retained anywhere to rank on instead.
**Fix:** either keep a best-attempt column separately, or stop clearing `passed` on a failed retry.

### Leaderboard opt-in banner shows the wrong state right after submitting or retrying
`/quizzes/hazards` fetches the caller's existing `leaderboard_visible` preference once on page load (`GET /api/quizzes/progress`). But `handleSubmit` unconditionally resets local `leaderboardVisible` state to `false` immediately after a successful submission (and `handleRetry` does the same), discarding whatever was actually loaded. So the "🏆 Show My Score" / "🔒 Keep Private" banner shows "Keep Private" as the active choice right after every submit or retry — even for a learner who'd previously opted in — until they explicitly click one of the two buttons again.
This is a display/interaction bug, not a data-loss one: `POST /api/quizzes/progress` deliberately preserves the existing `leaderboard_visible` value on a retry (`existing?.leaderboard_visible ?? false`) rather than clearing it, so the real stored preference — and what the leaderboard itself reads — is untouched by submitting or retrying. The risk is purely that a learner sees "Keep Private" highlighted and, believing they're just confirming the status quo, clicks it — which *would* then genuinely overwrite their real preference to private via `PATCH /api/quizzes/progress`, since that click is a real, correctly-saved action.
**Fix:** seed `leaderboardVisible` from the already-fetched preference after a submit/retry instead of unconditionally resetting it to `false`.

### `handleContinue`'s `localStorage` write is now dead code
`/certificate` used to gate entirely on a `localStorage` record written by `/quizzes/hazards`'s `handleContinue` — this has been fixed; the page now fetches `/api/modules/progress` and `/api/quizzes/progress` server-side instead (see `ADDITIONAL_INFO.md`). But `handleContinue` still writes `{ passed: true, score, date }` to `localStorage` (key `hydrogenlabsafety_quiz_hazards_${uid}`) before routing to `/certificate`, and `/certificate` no longer reads that key at all. The write, and the `storageKey()` helper that builds it, currently do nothing.
**Fix:** remove the `localStorage` write (and `storageKey()`) from `handleContinue`.

### Admin panel's two progress numbers disagree with each other, and with reality
`GET /api/admin/users` already returns a server-computed `statistics` object (`totalUsers`, `administrators`, `learners`, `trainingCompleted`, `averageProgress`, `totalModules`), derived from `user_module_progress` using `hazardModules.length` as `totalModules` and `progress >= 100` as "complete." **The admin page ignores this entirely.** Instead, for every non-admin, non-`public`-type user, it separately fetches `GET /api/admin/users/{uid}/progress` and recomputes its own "Training Completed"/"Average Progress" stat-card numbers from each response's `summary` object:
- N+1 requests where one would do — the exact `statistics` object it needs is sitting unused in the first response.
- The two routes don't use the same completion rule for "done": the list route counts `progress >= 100` only; the per-user route also accepts `status === "done"`. Both now derive `totalModules` from `hazardModules.length`, so that part stays in sync — but the completion-rule difference would still let the two disagree about whether a specific module counts as finished.
- The two routes compute "overall progress" differently in kind, not just source: the list route's `statistics.averageProgress` averages each module's own `progress` percentage across learners (partial credit); the per-user route's `summary.overallProgress` computes `completedModules / totalModules * 100` for that one learner (no credit until 100%). Since the page displays an average of the per-user route's numbers, "Average Progress" on the stat card is the coarser, all-or-nothing version — a user with five modules all at 80% contributes 0%, not 80%, to that average.
- The "Training Completed" count itself uses yet a third, different rule from either route's own `trainingCompleted`/`summary` fields: the admin page counts a learner as complete when `completedModules >= totalModules && result.quizPassed`, factoring in the quiz — but the list route's own (unused) `statistics.trainingCompleted` is module-completion only, with no quiz condition at all. So the three "is this learner done" computations sitting in the codebase (list route's `statistics.trainingCompleted`, the admin page's own count, and the per-user page's Certificate panel below) all disagree with each other.

**Fix:** use `data.statistics` from the list route directly, and make the completion/progress formulas and the definition of "training completed" agree (or delete the redundant ones).

### Admin "Certificate eligibility" measures a different thing than the real certificate page
The per-user admin progress page's own Certificate panel shows "Eligible"/"Pending" based purely on `completedModules >= totalModules` — module completion only, no quiz condition. The route backing that page, `GET /api/admin/users/{uid}/progress`, already computes a `summary.quizPassed` value specifically so callers can factor the quiz in (its own comment says this exists to "match the certificate page eligibility rule" — see "Quiz ID is hardcoded independently" above) — the per-user page just doesn't use it for its Certificate panel, even though the `/admin/users` list page does use that same field for its "Training Completed" count (see above).
The real `/certificate` page's actual rule is `allModulesCompleted && quizPassed`, where `quizPassed` is `record.score >= 70` — a hardcoded threshold, not the admin route's `QUIZ_PASS_SCORE`/`quizzes.pass_threshold` (see "Certificate pass-threshold" below). So today there are three independently-computed "is this learner certificate-eligible" answers in the codebase (the admin list page's count, the per-user page's Certificate panel, and the real `/certificate` page), and none of the three currently agree in every case.
Separately, none of the three account for lab/scenario progress (`GET /api/lab/progress`) at all — only module completion and the quiz factor into "eligible" anywhere in the app today, even though the lab is one of the three tracked activities. If lab completion is ever meant to count toward certificate eligibility, all three of these computations would need to change together, not just one.
**Fix:** compute eligibility once (e.g. as a shared helper or a single API field) and have the admin list page, the per-user progress page, and `/certificate` itself all read from it.

### Admin progress views only account for `hazard-modules`, not `guides`
`GET /api/admin/users` and `GET /api/admin/users/{uid}/progress` both scope their `user_module_progress` queries to `section = "hazard-modules"`, and `totalModules` is `hazardModules.length` in both routes. A learner's progress in any other `app/modules/` section (currently just `guides`) never appears anywhere in the admin panel — not in the dashboard statistics, the per-user progress page, or certificate eligibility. `guides` is a template section not linked in navigation, so this is low-priority today, but the admin routes would need to generalize before any future real second section could get admin visibility.
**Fix:** generalize the admin routes' section scoping (aggregate across sections, or accept a section list) if/when a second section needs admin visibility, rather than hardcoding `hazard-modules`.

### Certificate pass-threshold is hardcoded separately from the real threshold — in `/certificate`, and independently again in the dashboard
`/quizzes/hazards` (the actual quiz attempt page) gets this right: it computes `passed = percentage >= passThreshold`, where `passThreshold` is the quiz's live, admin-editable `pass_threshold` from Supabase (`lib/questionhazards.ts`'s `PASS_THRESHOLD` is only the fallback default, used when live content isn't available), and POSTs the correctly-computed `passed` to `/api/quizzes/progress`, which stores it as-is.
The bug is downstream: both `app/certificate/page.tsx` and `app/dashboard/page.tsx` independently ignore that stored `passed` value and instead each recompute their own `quizPassed`/`certificateEligible` as `record.score >= 70` / `quizProgress.score >= 70` — two separate hardcoded `70`s, in two separate files, both bypassing the value that was already correctly computed once. `/certificate`'s "No certificate yet" panel also hardcodes "70% or higher" as prose text, a third place the same number would need updating.
If a quiz's `pass_threshold` is ever changed via the quiz editor, a learner's genuinely current pass/fail state (correctly reflected in `user_quiz_progress.passed` and on the leaderboard) could then be shown backwards on the certificate and dashboard pages, which would keep checking against the old hardcoded `70` instead.
**Fix:** gate on `record.passed`/`quizProgress.passed` directly in both files instead of recomputing it from `score`, and update the certificate page's prose to reference the quiz's actual threshold rather than a literal "70%."

### Logout's `sessionStorage` flag can go stale, silently eating the next Login click
`Navbar.tsx`'s `handleLogout` sets `sessionStorage.setItem("logoutRedirect", "true")` before logging out, meant to be consumed by `/login` on its next mount to suppress a flash of the login form during the logout redirect race (see `ADDITIONAL_INFO.md`). But it's only consumed if `/login` actually mounts during that race — which only happens if the page the user logged out *from* has its own competing redirect-to-`/login` effect. Logging out from `/` or `/about` (both allow logged-in users and have no such effect) means the flag is never cleared at logout time; it just persists in `sessionStorage` for that tab.
The next time the user visits `/login` in that tab — e.g. clicking "Login" from the navbar to sign back in — the page finds the stale flag, silently redirects straight back to `/`, and only then clears it. The user's first "Login" click after such a logout does nothing visible; they have to click it again to actually see the form.
**Fix:** clear the flag in `handleLogout` itself once its own `router.replace('/')` fires (rather than relying solely on `/login` to consume it), or use a one-shot mechanism that doesn't depend on `/login` being the next page visited.

### `save-hazards` does a full delete-then-reinsert, not a diff
`/api/lab/save-hazards` deletes every row in the `hazards` table, then re-inserts one row per current hotspot. If the request fails partway through, the table could in principle be left empty rather than reverted to its prior state.

### Several tables store a `uid` (or other cross-table reference) with no foreign key enforcing it
`user_module_progress` does this correctly — `fk_user_progress` ties its `uid` to `profiles.uid`, and `fk_user_progress_module` ties `(section, module_id)` to `modules`. Nothing else follows that pattern:
- `user_quiz_progress.uid` has no FK to `profiles.uid`; `quiz_id` has no FK to `quizzes.quiz_id`.
- `feedback.user_id` has no FK to `profiles.uid`.
- `user_hazard_progress.uid` has no FK to `profiles.uid`; `hazard_id` has no FK to `hazards.type`.

Application code checks referential validity in some of these cases (e.g. `POST /api/lab/progress` looks up the hazard before inserting), but the database itself doesn't enforce it — a row could be inserted directly, or by a future code path that skips the check, referencing a `uid`/`hazard_id`/`quiz_id` that doesn't exist.
**Fix:** add the missing foreign keys, following `user_module_progress`'s existing pattern.

---

## Dead / unwired code

### 7 of 8 `Permissions` flags are computed but never consulted
`useAuth()` derives an 8-flag `Permissions` object on every render. Only `canManageUsers` is actually read anywhere — `Navbar.tsx` (gating the Administration link), `EditModeToggle.tsx` (gating the `/lab` and every module reader page's edit-mode switch), and `/quizzes/[quizId]/edit`'s own `isAdmin` redirect check plus the "✏️ Edit" tab on `/quizzes` that links to it. The other seven (`canAccessModules`, `canUseSimulation`, `canViewReports`, `canEditContent`, `canManageScenarios`, `canViewAnalytics`, `canViewAuditLogs`) are dead: there's no `/reports`, `/analytics`, or audit-log page for the last three to gate, and every page that does gate on something checks `user`/`isAdmin` (i.e. `canManageUsers`) directly rather than consulting any of the others. Note: `canEditContent`/`canManageScenarios` are the semantically-closer fit for gating the lab/module/quiz editors than `canManageUsers`.

### `next.config.ts` coexists with `next.config.js`
`next.config.ts` is an empty stub; `next.config.js` holds the real, active config. Harmless but potentially confusing — Next.js only loads one of them.

### `GET /api/lab/progress` is read by the dashboard but nowhere in the admin panel
The dashboard's "Scenarios / Simulation" stat card reads `completedHazards`/`totalHazards` from this route for the signed-in learner. But the admin panel — the per-user progress page, and the `/admin/users` list page's own stats — never reads it, so lab/hotspot progress is visible to a learner about themselves but invisible to an admin looking at that same learner. See "Admin 'Certificate eligibility'" above for how this also means lab progress plays no part in certificate eligibility anywhere in the app.

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

### CSS is split across many page-specific files with no canonical reference for which classes are global vs. local
Every page/component folder that needs styling imports its own `.css` file (see the CSS Structure table in `README.md`), and `globals.css` holds `nav`, `.main`, `.panel`, edit-mode toggle, and save-bar styles used everywhere. But there's no single place listing which classes are safe to assume as globally available versus which need a local definition — confirming this for a new page means reading `globals.css` in full, or checking how an existing page with similar markup handles it.

`app/quizzes/[quizId]/edit/quizEditor.css` duplicates `.quiz-defaults-notice` (already defined once in `quizzes.css`) rather than sharing it, since the two pages don't import each other's stylesheets and there's no shared partial for classes used by more than one page but not all of them. Some classes are also used identically across multiple page-specific files without being pulled into `globals.css`, even though they're not page-specific in nature — `.page-header` is used by the admin pages, the quizzes pages, and others, but is defined independently (or, in at least one case, not confirmed to be defined at all) in each.

**Fix:** an audit of every `.css` file against the classes actually used in its corresponding page(s) — confirming each class is defined exactly once, in the appropriate scope (`globals.css` for genuinely shared patterns, a page-specific file for one-off use) — would likely surface both missing and duplicated rules, and is worth doing as its own deliberate pass rather than catching each instance individually as new pages are added.

---

## Cosmetic / minor

### `ModuleVideo.tsx`/`VideoEditorPanel.tsx` still use "module"-prefixed names despite being shared with the lab page
`ModuleVideo.tsx`'s CSS classes (`module-video-*`, defined in `globals.css`) and the classes `VideoEditorPanel.tsx` reuses from the module editor (`module-field-stack`, `module-select`, `module-add-item-btn`, `module-delete-btn`) read as module-specific, but both files are shared with `HotspotEditor.tsx`/`HazardPopup.tsx` on `/lab` too. The component name itself has the same problem — `ModuleVideo` for something that's just as much a lab component now would more accurately be `EmbeddedVideo`. Purely cosmetic — nothing behaves incorrectly — but worth a rename pass (component, file, and the CSS classes) for clarity.

### `AdminModuleCard`'s `mode` prop is accepted but never read
`AdminModuleCardProps` declares `mode?: "student" | "admin"`, and the per-user progress page passes `mode="admin"` when rendering it, but the component body never references `mode` anywhere — it always renders the same admin-style layout regardless of the value passed. Harmless, but either dead prop or an unfinished student/admin variant.

### Admin feedback dashboard's "Average Rating" card always shows five filled stars
`app/admin/feedback/page.tsx`'s summary card renders the numeric average correctly (e.g. "3.7") but the star row beneath it is a fixed `★★★★★` string, not scaled to the actual average — a 2.0-average dataset and a 5.0-average dataset show identical stars.

### Register form has an unused `userType` field in its local state
`app/login/register/page.tsx`'s form state includes `userType: "public"`, wired through the same generic `update()` handler as the other fields, but no input in the form is actually bound to it, and `register()` is called with a separately hardcoded `user_type: "public"` regardless of the state value. Functionally harmless (new accounts are meant to start as `public` either way), just dead state left over from what may have been a planned user-type selector.
