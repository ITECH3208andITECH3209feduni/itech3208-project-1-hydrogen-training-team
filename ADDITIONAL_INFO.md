# Additional Info

Detail on how individual features and subsystems work — background for `README.md`.
	Known bugs and inconsistencies referenced below live in `BUG_REPORT.md` rather than here.

---

## Auth redirect pattern

All protected pages redirect unauthenticated users to `/login`, implemented per-page rather than through Next.js middleware — there's no `middleware.ts`.
	`app/dashboard/page.tsx` shows the pattern: it calls `useAuth()` for `user`/`loading`, renders `<div>Loading...</div>` while `loading` is true, calls `router.replace('/login')` inside a `useEffect` once loading has finished and there's no `user`, and returns `null` in the render itself while that redirect is pending.
	Any new protected page needs to repeat this pattern (or a shared wrapper for it doesn't exist yet).

Exceptions:
- `/login`, `/login/register`, `/login/forgot-password` — auth pages themselves.
- `/` — the public landing/intro page; calls `useAuth()` (to swap some elements for logged-in users) but doesn't gate access on it, so it's viewable by anyone.
- `/about` — doesn't call `useAuth()` at all; a fully static public page with no auth-dependent UI.
- `/admin/users` — checks `isAdmin` directly (not just whether a user is logged in) and redirects anyone who fails that check to `/dashboard` rather than `/login`.

`Navbar.tsx` hides itself on `/login`, `/login/register`, and `/login/forgot-password`. Its site-title logo links to `/` (the landing page), its "Home" nav link goes to `/dashboard`.

---

## Roles and permissions

Firebase handles authentication itself (sign-in, sign-up, session state);
	a separate **profile** — role, user type, organisation — is stored in Supabase and managed through `GET /api/profile/get?uid=...` and `POST /api/profile/create`.
	Neither route has an auth guard, reasonably, since they're what `AuthContext.tsx` uses to bootstrap a profile before there's necessarily a role to check against.

`context/AuthContext.tsx` wraps the whole app via `layout.tsx` and ties the two together: on every Firebase auth-state change it calls `/api/profile/get`;
	if that comes back not-ok (a brand-new Firebase user with no profile yet), it calls `/api/profile/create` with `role: "user"` and `user_type: "public"`, then re-fetches.
	`register()` follows the same hardcoded role/type — the `RegisterData` type only allows `role: "user"` and `user_type: "public"`, so there's currently no sign-up path that creates a `staff` or `admin` account, or any `user_type` other than `"public"`.
	`organisation` is the one profile field that isn't hardcoded: the register form (`app/login/register/page.tsx`) has an optional "Organisation" input, passed straight through to `register()` and saved as entered.

`role` forms a hierarchy: `isStaff` is true for `"staff"` or `"admin"`, `isAdmin` is true for `"admin"` only.
	Since `register()`'s hardcoded values are still the only sign-up path, every value besides `"user"`/`"public"` has to be set by an admin afterwards, through the Edit User modal on `/admin/users` (see "Admin: Access Management" below).

---

## Server-side auth guards

Two helpers in `lib/` protect API routes using a Firebase ID token rather than the client-side `permissions` object above.
	Both expect the request to carry `Authorization: Bearer <idToken>`, verify it server-side via `lib/firebaseAdmin.ts` (`adminAuth.verifyIdToken`), and `throw` a plain `Error` on failure — it's up to the calling route to catch that and respond with the appropriate status code:
- **`requireUser(request)`** (`lib/authUser.ts`) — verifies the token and returns just the caller's `uid`. For routes that only need to know *who* is calling, not their role — it never queries Supabase at all, so it can't distinguish a `user` from a `staff` or `admin` account.
- **`requireAdmin(request)`** (`lib/adminAuth.ts`) — verifies the token, then looks up the caller's row in Supabase's `profiles` table and throws unless `role === 'admin'`. Returns `{ uid, profile }` on success.

`lib/firebaseAdmin.ts` initialises the Firebase Admin SDK from a service-account credential (see `FIREBASE_ADMIN_*` in "Environment Variables"), separately from the browser-side Firebase SDK in `lib/firebase.ts`.

**Route coverage:**
- `requireUser`: `/api/modules/progress` (all methods), `/api/quizzes/progress` (all methods)
- `requireAdmin`: `/api/admin/users` (`GET`), `/api/admin/users/{uid}` (`PATCH`), `/api/admin/users/{uid}/progress` (`GET`)
- No guard: `load-hazards`, `load-image`, `load-modules` (`GET`s, intentionally public reads), `/api/profile/get`, `/api/profile/create` (bootstrap routes, see above). `save-hazards` and `upload-image` also call no guard — see `BUG_REPORT.md`, since these are writes rather than reads.

---

## Modules system

`app/modules/` is a directory holding every section built on a shared listing+reader template — it isn't a page itself (there's no `page.tsx` directly under `app/modules/`).
	Currently there are two sections:
- **Hazard Modules** (`/modules/hazard-modules`) — the hydrogen hazards content, defined in `lib/hazardModules.ts`.
	Linked from the Navbar and the dashboard's Modules stat card.
- **Guides** (`/modules/guides`) — an example second section demonstrating the pattern, defined in `lib/guides.ts`.
	Not currently linked from navigation. It's a working example of a section built on the shared template, but hasn't been migrated to Supabase yet — no `useModules` call, data comes straight from `lib/guides.ts`.
	Treat it as a reference for the overall section shape, not the live-loading pattern (follow `hazard-modules` for that).

The shared template lives in `app/modules/components/`:
- `ModuleListingPage.tsx` — filter bar, grid, auth redirect
- `ModuleReaderPage.tsx` — breadcrumb, hero, sections, key takeaway, prev/next nav, and the progress UI described under "Module Progress Tracking" below
- `HazardModuleCard.tsx` — card shown in the listing page, used for every section
- `SectionBlock.tsx` — renders a single numbered section. Body text is split on blank lines into paragraphs and rendered via `dangerouslySetInnerHTML`, so section `body` content can include inline HTML (e.g. `<strong>`), not just plain text.

Shared types (`ModuleData`, `ModuleSection`, `ModuleStatus`) and a generic `getModuleById(items, id)` lookup helper live in `lib/moduleTypes.ts`.
	Each section's data file wraps that helper with its own name (`getHazardModuleById`, `getGuideById`) rather than exposing the generic one directly to pages — though these section-specific wrappers are no longer called by the reader pages (which now use `useModuleById` instead);
	they're currently unused but left in place pending a decision on whether to remove them, adapt them to take an array parameter, or leave them for other non-hook use cases.

Module content lives in Supabase, loaded per-section through `hooks/useModules.ts`:
- **`useModules(section, defaults)`** — fetches `GET /api/load-modules?section=...`, merges each returned row over the matching entry (by `id`) in `defaults`, and returns `{ modules, loadStatus }`.
	A successful, non-empty response is authoritative for whatever it contains — any missing modules from the fallback version are considered purposefully deleted.
	`defaults` is only used wholesale as a fallback when the fetch fails entirely or the section hasn't been seeded yet (empty response).
- **`useModuleById(section, defaults, id)`** — the same, narrowed to a single module by id.
	This is what reader pages use in place of a section's static `getXById` helper, since the lookup now has to react to data that arrives after the initial render.
- **`mergeRow`/`mapSection`** (exported from `useModules.ts`) do the field-name translation between Supabase's snake_case row shape (`badge_num`, `icon_bg`, …) and the app's camelCase `ModuleData`/`ModuleSection` shape.
- `status`/`progress` always come from `defaults`, never from Supabase — `status` and `progress` are deliberately not columns on `modules`; they're tracked per-user in `user_module_progress` instead (see "Module Progress Tracking"), and the listing card doesn't read from that table.
- `slug` is treated differently from `badgeNum`: a `null` slug in Supabase is passed through as `undefined` rather than backfilled from `defaults`, since `slug` is a candidate for use in routing later and a stale slug silently standing in for a missing one would be a broken/misleading link.
	`badgeNum` is purely cosmetic (a hotspot number's position in the list), so it's fine to backfill from `defaults` when Supabase hasn't got one.

Each section's data file (e.g. `lib/hazardModules.ts`) still exports its static `ModuleData[]` array, now serving as the `defaults` passed into `useModules`/`useModuleById` — what's shown before the Supabase fetch resolves, and the fallback if it fails.
	Changes to this file still require a redeployment to take effect, but since it's now the fallback rather than the live source, most day-to-day content edits happen in Supabase instead and take effect immediately.

There's currently no in-app edit mode for module content (unlike the lab's hidden hotspot editor) — changing what's in Supabase means editing rows directly via the Supabase dashboard or SQL Editor.

For the `ModuleData` field reference and how to edit live module content, see `EDITING_GUIDE.md`.

### Adding a new `app/modules/`-style section

1. Create a data file in `lib/` — e.g. `lib/scenarios.ts` — with an array typed `ModuleData[]` (import `ModuleData` from `lib/moduleTypes.ts`):
   ```ts
   import { ModuleData } from './moduleTypes';

   export const scenarios: ModuleData[] = [ /* ... */ ];
   ```
2. Seed a matching set of rows in the `modules`/`module_sections` Supabase tables with `section = 'scenarios'`.
3. Create `app/modules/scenarios/page.tsx`, a thin wrapper around `ModuleListingPage`, pulling live data via `useModules`:
   ```tsx
   'use client';

   import '../modules.css';
   import ModuleListingPage from '../components/ModuleListingPage';
   import { useModules } from '@/hooks/useModules';
   import { scenarios } from '@/lib/scenarios';

   export default function ScenariosPage() {
   	const { modules } = useModules('scenarios', scenarios);

   	return (
   		<ModuleListingPage
   			items={modules}
   			basePath="/modules/scenarios"
   			heading="Scenarios"
   			subheading="Your subheading here"
   		/>
   	);
   }
   ```
4. Create `app/modules/scenarios/[id]/page.tsx`, a thin wrapper around `ModuleReaderPage`, using `useModuleById` in place of a static per-section lookup — see `app/modules/hazard-modules/[id]/page.tsx` for the current pattern.
5. If the section should appear in navigation, add a link in `Navbar.tsx`.

### Adding a standalone page

For a page unrelated to the modules template:

1. Create a new folder under `app/` named after the route.
2. Copy `template/page.tsx` into it.
3. Update the `active` class on the correct nav link in `Navbar.tsx`.
4. Replace the placeholder content with your page content.

---

## Module Progress Tracking

Unlike the listing page's `status`/`progress` badges (always drawn from `defaults`, never Supabase), the reader page tracks live, per-user progress via `useModuleProgress` (`app/modules/hooks/useModuleProgress.ts`), consumed by `ModuleReaderPage.tsx`.
	The two are independent: a card can still show "Not Started" from bundled `defaults` while the signed-in user's own reader-page progress is genuinely in progress or complete. This applies to every section built on the shared template, including the unlinked `guides` example — `ModuleReaderPage` doesn't distinguish between sections.

`/api/modules/progress` (`requireUser`-gated) backs the hook:
- **`POST`** — body `{ module_id }`. If a `(uid, section, module_id)` row doesn't already exist, creates one with `status: "progress"`, `progress: 0`, `attempts: 1`, `started_at`/`last_accessed` set to now. If one exists, it's a no-op (`{ ok: true, message: "Progress already exists" }`) — it never resets an existing row.
- **`GET`** — returns every progress row for the caller (`{ ok, progress: ModuleProgress[] }`); the hook finds the one matching the current `moduleId`.
- **`PATCH`** — body `{ module_id, progress?, status?, quiz_score?, attempts?, time_spent?, action? }`, all optional except `module_id`.
	Setting `progress` also auto-derives `status` (`>= 100` → `"done"` + stamps `completed_at`; `> 0` → `"progress"`) unless `status` is passed explicitly, in which case that wins and setting it to `"done"` directly forces `progress` to `100` too.
	`action: "restart"` ignores every other field, looks the row up first (404s if it doesn't exist), and resets it: `progress: 0`, `status: "progress"`, `completed_at: null`, `time_spent: 0`, `attempts` incremented, `started_at`/`last_accessed` refreshed.
	`useModuleProgress` itself only ever sends `progress`/`time_spent` (or `action: "restart"`) — it never touches `status`, `attempts`, or `quiz_score` directly, even though the route accepts all of them.

**How progress is derived:** each section in `ModuleReaderPage` is wrapped in a `div` with `data-module-section` and `data-section-number`.
	An `IntersectionObserver` (10% visibility threshold) watches these and, the first time a new-highest section scrolls into view, computes `progress = round(highestSectionReached / sectionCount * 100)` (capped at 99% until the last section is reached, which sets 100%).
	Progress is monotonic on the client — a save never lowers `lastSavedProgress`, so reopening a completed module doesn't regress its percentage. (The route itself doesn't enforce this — a direct `PATCH` with a lower `progress` value would be accepted; the monotonic guarantee is a client-side convention, not a database one.)

**Time spent** is tracked alongside progress: a session timer starts on load and accumulates into `time_spent` (minutes), saved every 15 seconds while the tab is open (`setInterval`), immediately when the tab becomes hidden or the page is unloading (`visibilitychange`/`pagehide`, using `fetch(..., { keepalive: true })` so the request survives navigation), and again on unmount.
	Saves are queued rather than dropped if one is already in flight — a save request that arrives mid-save is merged into a pending request and re-fired once the current one finishes.

**Reader UI driven by this hook:**
- A progress bar + percentage, shown once `progressLoaded` and `currentProgress > 0`.
- A "Continue from saved progress" button (shown while `0 < currentProgress < 100`) that scrolls to the section matching the saved percentage.
- A "Module completed" banner with a Restart Module button once `currentProgress >= 100` — restart asks for confirmation (`window.confirm`), then `PATCH`es with `{ module_id, action: "restart" }` and resets local progress back to 0.

---

## Quizzes & Certificate

### Quizzes hub (`/quizzes`)

A grid of quiz cards (`app/quizzes/page.tsx`, styled by `quizzes.css`) — currently just one, for the Hazards quiz, built from `QUIZ_TITLE`/`QUIZ_SLUG`/`questionhazards.length` in `lib/questionhazards.ts`.

### Taking a quiz (`/quizzes/hazards`)

- **Randomisation:** both question order and each question's option order are shuffled (Fisher–Yates) on load and on retry, with `correctIndex` remapped to follow its option.
- **Answering:** all questions must be answered before submitting (`answers.some(a => a === null)` blocks submit with an inline error).
- **Scoring:** `percentage = round(correctCount / quiz.length * 100)`; `passed = percentage >= PASS_THRESHOLD`.
- **Submitting** POSTs `{ score: percentage, passed }` to `/api/quizzes/progress` (`requireUser`-gated) with a Firebase bearer token.
- **After submitting:** each question re-renders showing correct/incorrect/your-answer state and an explanation for anything missed.
	A Retry Quiz button (on fail) reshuffles and resets everything, incrementing a client-side "Attempt #N" counter that isn't itself sent anywhere — only the eventual `handleSubmit` call reaches the server.
- **On pass**, a "Get Your Certificate" button routes to `/certificate` via a client-side write — see below.

### Certificate gating

On a passing submit, `handleContinue` writes `{ passed: true, score, date }` to `localStorage` (key `hydrogenlabsafety_quiz_hazards_${uid}`) and routes to `/certificate`. `app/certificate/page.tsx` reads only this key to decide what to show.

**Blocked state:** if there's no passing record, `/certificate` shows a "No certificate yet" panel with a link back to the quiz.

**The certificate itself** is drawn client-side onto an HTML `<canvas>` (`drawCertificate()` in `app/certificate/page.tsx`) — title, "Certificate of Achievement", the learner's Firebase `displayName` or `email`, `QUIZ_TITLE`, score, and a formatted date — and downloaded as a PNG via `canvas.toDataURL('image/png')`.
	There's no server-generated file and no PDF; "printable certificate" (per the About page's copy) means printing this downloaded PNG yourself, not an in-app print/PDF flow.

---

## Admin: Access Management

`/admin/users` (`app/admin/users/page.tsx`) is an admin-only page for managing user accounts and reviewing training progress.

**Data loading:** on mount, it fetches `GET /api/admin/users` (`requireAdmin`-gated), then separately fetches `GET /api/admin/users/{uid}/progress` per learner to compute stat-card numbers — see `BUG_REPORT.md` for the inefficiency and formula mismatch this involves.

**Stat cards** — **Users** (`users.length`), **Administrators** (`role === "admin"` count), **Training Completed**/**Average Progress** (from the per-user fetches described above).

**Search:** a single client-side text filter across `email`, `display_name`, `organisation`, `role`, and `user_type` — no server-side query, so it only filters the already-loaded list.

**Editing a user:** the Edit button on each row opens `EditUserModal.tsx`, which edits `role`, `user_type`, and `organisation` (email shown read-only) and saves via `PATCH /api/admin/users/{uid}` (`requireAdmin`-gated) with `{ role, user_type, organisation }`.

**Viewing a user's module progress:** the Progress button on each row links to `/admin/users/{uid}/progress`, a read-only training-record view for a single user, backed by `GET /api/admin/users/{uid}/progress` (`requireAdmin`-gated).

- **Module data is static here, not live** — unlike the student-facing reader (`useModuleById`, live from Supabase), this page maps over the bundled `hazardModules` array directly and merges each with the matching `moduleProgress` record (by `module_id`).
	A module that exists only in Supabase wouldn't appear here, even though it'd show up for students.
- **`ModuleProgress`** — one row per module the user has touched, straight from `user_module_progress`: `uid`, `module_id`, `status`, `progress`, `quiz_score`, `attempts`, `time_spent`, `started_at`, `last_accessed`, `completed_at`.
- **`QuizProgress`** — one row per quiz, from `user_quiz_progress`: `uid`, `quiz_id`, `score`, `attempts`, `passed`, `last_attempted_at`. This page's Quiz panel only ever reads `quizProgress[0]`; there's only one quiz today, even though the schema (`quiz_id` as part of a composite key) supports more.
- Each module is rendered via `AdminModuleCard.tsx` (imported under the local alias `ModuleCard`) with `mode="admin"` and `adminProgress={module.adminProgress}`.

---

## Linking Hotspots to Modules

Each hazard's `HazardInfo` (in `lib/hazards.ts`, and the live Supabase-backed version in `hooks/useHazards.ts`) has two fields that together point at a module:
- `moduleId: string | null`
- `moduleSection: string | null`

`HazardPopup.tsx` builds the Learn More link as `/modules/${moduleSection}/${moduleId}`, and only renders the button when both are non-null.

**Where the values come from:** the `hazards` table's `module_section`/`module_id` columns are genuinely live from Supabase, treated the same as `title`/`text`.
	`useHazards.ts` only falls back to the full set of local defaults (including their module links) if the `/api/load-hazards` fetch fails outright or the table is empty; a successful, non-empty load is authoritative for `moduleId`/`moduleSection`, even where they're `null`.

**Both-or-neither:** the two columns form a matched pair enforced at the database level — the `hazards_module_fk` foreign key uses `match full`, so a row can have both `null` or both set to a valid `(section, id)` on `modules`, never just one. `addHotspot()` in `useHazards.ts` seeds new hotspots with both `null` accordingly.
	Deleting the linked module (`on delete set null`) doesn't delete the hazard — it just resets both columns to `null`, so the Learn More button disappears rather than pointing at a dead link.

For how to set or change a hotspot's linked module, see `EDITING_GUIDE.md`.

---

## Testing

The project uses **Vitest** for unit and integration tests, with **React Testing Library** for rendering hooks/components and **MSW (Mock Service Worker)** for mocking API routes — no real Supabase calls are made during tests.

### What's covered

- **Unit tests** — pure helper functions with no network/DOM dependency (e.g. `clamp`, `generateType`, `buildDefaultHotspots`, `addHotspot` in `hooks/useHazards.ts`; `mapSection`, `mergeRow` in `hooks/useModules.ts`)
- **Integration tests** — hooks/components interacting with mocked API routes (e.g. `useHazards` loading, saving, and uploading via mocked `/api/load-hazards`, `/api/load-image`, `/api/save-hazards`, `/api/upload-image`; `useModules`/`useModuleById` loading via mocked `/api/load-modules`)

Test files live alongside the code they cover, using a `.test.ts` / `.test.tsx` suffix (e.g. `hooks/useHazards.ts` → `hooks/useHazards.test.ts`). Vitest picks these up automatically.

### Path aliases in test files

`tsconfig.json` excludes `**/*.test.ts` / `**/*.test.tsx` / `mocks/**/*` so Next's typecheck stays scoped to app code.
	`vite-tsconfig-paths` (used by `vitest.config.mts` to resolve `@/*` imports) respects that same exclude list — so without a workaround, `@/`-style imports inside test files fail to resolve even though the app itself builds fine.

`tsconfig.vitest.json` exists to fix this:
	it extends `tsconfig.json` but drops the excludes, and `vitest.config.mts` points `vite-tsconfig-paths` at it via `projects: ['./tsconfig.vitest.json']`.
	`tsconfig.json` itself is untouched, so Next/Vercel's build scope is unaffected.

### Mock API conventions

`mocks/handlers.ts` defines the default MSW response for every `/api/*` route.
	Defaults represent the happy path — a successful response with realistic data, matching the actual shape returned by the corresponding file in `app/api/*/route.ts`.
	Any test covering a different scenario (empty data, a server-reported error, a network failure) overrides the relevant handler locally with `server.use(...)`, rather than changing the shared default.

When adding a new API route:
1. Add its happy-path response to `mocks/handlers.ts`.
2. Add at least one test exercising the happy path, and one covering its failure/edge case, using `server.use(...)` to override.

### Continuous Integration (CI)

A GitHub Actions workflow (`.github/workflows/test.yml`, at the repo root — not inside `next-app/`) runs the full test suite automatically on every push and pull request.
	Since `package.json` lives inside `next-app/`, the workflow sets `working-directory: next-app` so `npm install`/`npm test` run from the correct folder.
	Pull requests targeting `main` should show a passing check before merging.
