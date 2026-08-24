# Bug Report

Known bugs and inconsistencies in the Hydrogen Lab Safety app. This is a working list — items should move here as they're found and out once fixed, rather than being scattered through the README.

---

## Security / access control

### `save-hazards` and `upload-image` have no server-side auth guard
The "hidden" `H Z E D I T` edit-mode entry point on `/lab` only hides the *UI*. The two write endpoints it eventually calls — `POST /api/save-hazards` and `POST /api/upload-image` — have no server-side auth check of their own. Nothing stops a direct, unauthenticated request to either one from overwriting the shared hazard data or lab image.
**Fix:** add `requireUser` or `requireAdmin` (as appropriate) to both routes.

### `load-module-options`'s "no auth needed" call was made against an already-unguarded write endpoint
`GET /api/load-module-options` (added to populate the lab editor's Linked Module dropdowns) was deliberately left public, on the reasoning that it returns a subset of data — `section`, `id`, `title`, `badge_num` — already exposed publicly per-section via `GET /api/load-modules`, so gating it wouldn't reduce any real exposure. That reasoning holds on its own.
But it was evaluated in a context where the write endpoint it feeds into, `POST /api/save-hazards`, has no auth guard either (see above) — so "is this data already effectively public" was judged against a write surface that itself shouldn't be reachable unauthenticated. Once `save-hazards`/`upload-image` get proper guards, it's worth re-confirming `load-module-options`'s public status still makes sense on its own terms, rather than carrying forward a conclusion reached alongside an open gap.

### `/admin/users/[uid]/progress` client-side gate is weaker than its parent page
`/admin/users` checks `isAdmin` before rendering. `/admin/users/[uid]/progress` only checks that a user is logged in (`useAuth()`'s `user`), not `isAdmin`. In practice this is a shell-only gap — the API route behind it, `GET /api/admin/users/{uid}/progress`, does enforce `requireAdmin`, so a non-admin who navigates here directly gets a static shell and every data fetch comes back `403`. Still worth tightening for consistency, since relying on "the API happens to reject it" is a thinner guarantee than gating the page itself.

### Status-code mapping is inconsistent between the two auth helpers
Routes using `requireAdmin` map specific thrown messages (`"Access denied"`, `"Missing authorization token"`, `"User profile not found"`) to `403`; anything else becomes `500`. Routes using `requireUser` (`/api/modules/progress`, `/api/quizzes/progress`) return a blanket `401` for anything thrown in the `try` block — including non-auth errors, such as a malformed JSON body (both routes call `request.json()` with no validation of their own). A malformed request currently looks identical to an auth failure on these routes.

---

## Data model / naming mismatches

### `user_type` values don't match between the UI, the type, and the database
`EditUserModal.tsx`'s dropdown offers `public`, `student`, `lecturer`, `researcher`, `industry_professional` — sourced from `AuthContext.tsx`'s own `UserProfile['user_type']` TypeScript type, which uses the same five values. The `profiles` table's check constraint actually allows `engineering_student`, `science_student`, `researcher`, `public`, `lecturer`, `teaching_staff`. Only `public`, `lecturer`, and `researcher` are valid in both.

- Picking `student` or `industry_professional` in the modal and saving fails at the database — `PATCH /api/admin/users/{uid}` passes `user_type` straight through to Supabase with no validation, so the constraint violation surfaces as a raw Supabase error via `alert(data.error)`.
- `engineering_student`, `science_student`, and `teaching_staff` are valid database values with no UI path to set them.
- The root cause is the TypeScript type in `AuthContext.tsx`, not just the modal — every place that reads `profile.user_type` type-checks against 5 possible values while the real column can hold 6, 3 of them different from the type's list.

**Fix:** correct `UserProfile['user_type']` in `AuthContext.tsx` to the real 6-value set, update the modal's options to match, and add server-side validation in the PATCH route.

### `POST /api/modules/progress` hardcodes `section: "hazard-modules"` on every insert
This ignores which section the module actually belongs to. The `user_module_progress` table's real uniqueness constraint is on `(uid, section, module_id)` — per-section — which is presumably why `guides` gets working progress tracking at all (same `ModuleReaderPage`/hook, different section). But since the route always writes `"hazard-modules"`, a `guides` module and a `hazard-modules` module that happen to share an `id` (e.g. both `"1"`) would collide on the same row.
**Fix:** derive `section` from the request/module instead of hardcoding it.

### `user_module_progress.section`'s SQL default doesn't match the app's slug
The column defaults to `'hazard_modules'` (underscore); every other reference to this section in the app uses `'hazard-modules'` (hyphen). Moot in practice since `/api/modules/progress` always sets `section` explicitly on insert, but worth fixing so the default isn't actively wrong if anything ever relies on it.

### Quiz ID naming mismatch
`POST /api/quizzes/progress` hardcodes `quiz_id: "hydrogen-hazards"` server-side — a different string from `QUIZ_SLUG` (`"hazards"`, used in the URL and in `lib/questionhazards.ts`). Cosmetic today (there's only one quiz), but a trap for anything that assumes `quiz_id` matches the URL slug.

### `HazardModuleCard.tsx` name doesn't match its usage
Originally named for the hazard-modules section, but `ModuleListingPage` imports it directly and uses it for every `app/modules/` section, `guides` included — there's no generic/section-specific split despite the hazard-specific name.

---

## Data integrity

### Quiz submissions overwrite prior results with no "best attempt" logic
`POST /api/quizzes/progress` `upsert`s onto `(uid, quiz_id)`: `attempts` increments, but `score`/`passed` are simply overwritten by the latest submission. There's no history. Passing a quiz, then retrying and failing, replaces the stored `passed: true` with `false` — the prior pass is lost.
**Fix:** either keep a best-attempt column separately, or stop clearing `passed` on a failed retry.

### Certificate gating is entirely client-side and disconnected from the server record
On a passing submit, `/quizzes/hazards` writes a record directly to `localStorage` (key `hydrogenlabsafety_quiz_hazards_${uid}`) and routes to `/certificate`. `/certificate` reads *only* this `localStorage` key — it never calls `/api/quizzes/progress` or any other endpoint. Consequences:
- The `user_quiz_progress` row and the `localStorage` record are two independent, only loosely related copies of "did this user pass" — nothing keeps them in sync, and the server-side one can itself regress on a failed retry (see above) while the `localStorage` one, once set, never does.
- A user who passes on one browser/device won't see their certificate on another, or after clearing site data, even if their `user_quiz_progress` row still shows a pass.
- The admin panel's "Certificate eligibility" indicator (see below) measures something different from what `/certificate` actually gates on.

**Fix:** have `/certificate` check `/api/quizzes/progress` (or a dedicated endpoint) instead of, or in addition to, `localStorage`.

### Admin panel's two progress numbers disagree with each other, and with reality
`GET /api/admin/users` already returns a server-computed `statistics` object (`totalUsers`, `administrators`, `learners`, `trainingCompleted`, `averageProgress`, `totalModules`), derived from `user_module_progress` using `hazardModules.length` (currently 5) as `totalModules` and `progress >= 100` as "complete." **The admin page ignores this entirely.** Instead, for every non-admin, non-`public`-type user, it separately fetches `GET /api/admin/users/{uid}/progress` and recomputes the same two numbers itself:
- N+1 requests where one would do — the exact `statistics` object it needs is sitting unused in the first response.
- The two computations don't use the same completion rule: the list route counts `progress >= 100` only; the per-user route also accepts `status === "done"`, and hardcodes `totalModules` to the literal `5` rather than deriving it from `hazardModules.length` — so they'd silently diverge if a module's `status`/`progress` disagreed, or if a 6th module were added.
- The two routes compute "overall progress" differently in kind, not just source: the list route averages each module's own `progress` percentage (partial credit); the per-user route computes `completedModules / totalModules * 100` (no credit until 100%). Since the page only uses the per-user route's numbers, "Average Progress" on the stat card is the coarser, all-or-nothing version — a user with five modules all at 80% shows 0%, not 80%.

**Fix:** use `data.statistics` from the list route directly, and make the two completion/progress formulas agree (or delete one).

### Admin "Certificate eligibility" measures a different thing than the real certificate page
The admin panel shows "Eligible"/"Pending" based on `completedModules >= totalModules` (module completion). The real `/certificate` page gates on a passed **quiz** result in `localStorage` (see above). These are different criteria entirely, not just different data sources — someone who's finished every module but never passed the quiz shows "Eligible" in admin while seeing "No certificate yet" on the real page, and vice versa.

### `quiz_score` column is dead scaffolding
`user_module_progress.quiz_score` is a real, nullable column, and the `PATCH /api/modules/progress` route accepts it — but nothing in the frontend (`useModuleProgress`, `ModuleReaderPage`, `SectionBlock`) ever sends it. Looks like scaffolding for a since-descoped or not-yet-built per-module quiz feature; safe to leave alone but worth knowing it does nothing today.

### Certificate pass-threshold copy is hardcoded separately from the real threshold
`/certificate`'s "No certificate yet" panel hardcodes "70% or higher" as prose text, independent of `PASS_THRESHOLD` in `lib/questionhazards.ts` (used by the actual scoring logic). If `PASS_THRESHOLD` ever changes, this string won't update with it.

### `save-hazards` does a full delete-then-reinsert, not a diff
`/api/save-hazards` deletes every row in the `hazards` table, then re-inserts one row per current hotspot. If the request fails partway through, the table could in principle be left empty rather than reverted to its prior state.

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
`useAuth()` derives an 8-flag `Permissions` object on every render. Only `canManageUsers` is actually read anywhere (`Navbar.tsx`, gating the Administration link). The other seven (`canAccessModules`, `canUseSimulation`, `canViewReports`, `canEditContent`, `canManageScenarios`, `canViewAnalytics`, `canViewAuditLogs`) are dead: there's no `/reports`, `/analytics`, or audit-log page for the last three to gate, and the pages that do exist (modules, lab, edit mode) check `user`/`isAdmin` directly rather than consulting any of the others.

### `next.config.ts` coexists with `next.config.js`
`next.config.ts` is an empty stub; `next.config.js` holds the real, active config. Harmless but potentially confusing — Next.js only loads one of them.

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

## Cosmetic / minor

### `forgot-password` duplicates `auth.css`'s look as an inline style object
`app/login/forgot-password/page.tsx` visually matches the login/register card, logo, form, and button styling, but doesn't import `auth.css` — it defines an equivalent `styles` object inline and applies it via the `style` prop. The two are kept in sync by hand; a change to `auth.css` won't propagate here, and vice versa.
**Fix:** have the page import and use `auth.css` directly.
