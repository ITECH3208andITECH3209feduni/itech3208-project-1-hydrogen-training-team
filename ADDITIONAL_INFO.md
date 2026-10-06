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
- `/admin`, `/admin/users`, `/admin/users/[uid]/progress`, `/admin/feedback` and `/quizzes/[quizId]/edit` — each checks `isAdmin` directly (not just whether a user is logged in) and redirects anyone who fails that check to `/dashboard` rather than `/login`.

`Navbar.tsx` hides itself on `/login`, `/login/register`, and `/login/forgot-password`. Its site-title logo links to `/` (the landing page), its "Home" nav link goes to `/dashboard`.
	Its Simulations/Modules/Quizzes links only render while a user is signed in; the Administration link only renders while `permissions.canManageUsers` (i.e. `isAdmin`) is true, and points at `/admin`.

**Logout** (`handleLogout` in `Navbar.tsx`) sets a `sessionStorage` flag (`logoutRedirect: "true"`), awaits Firebase `logout()`, then `router.replace('/')` — logging out now lands on the home page, not `/login`.
	The flag exists to suppress a flash of the login form: during `await logout()`, the currently-mounted protected page's own redirect-to-`/login` effect (the pattern described above) can fire before the navbar's own `replace('/')` does, briefly navigating to `/login` first.
	`app/login/page.tsx` checks this flag on mount; if set, it clears it and immediately redirects to `/` instead of rendering the form, hiding that flash.
	See `BUG_REPORT.md` for a case where this flag isn't reliably cleared.

---

## Roles and permissions

Firebase handles authentication itself (sign-in, sign-up, session state);
	a separate **profile** — role, user type, organisation — is stored in Supabase and managed through `GET /api/profile/get?uid=...` and `POST /api/profile/create`.
	Neither route has an auth guard, reasonably, since they're what `AuthContext.tsx` uses to bootstrap a profile before there's necessarily a role to check against.

`context/AuthContext.tsx` wraps the whole app via `layout.tsx` and ties the two together: on every Firebase auth-state change it calls `/api/profile/get`;
	if that comes back not-ok (a brand-new Firebase user with no profile yet), it calls `/api/profile/create` with `organisation: null`, no `student_id`, `role: "user"` and `user_type: "public"`, then re-fetches.
	`/api/profile/create` returns the existing profile unchanged when one already exists for the uid, so a repeated call never overwrites stored values.
	`register()` follows the same hardcoded role/type — the `RegisterData` type only allows `role: "user"` and `user_type: "public"`, so there's currently no sign-up path that creates a `staff` or `admin` account, or any `user_type` other than `"public"`.
	`organisation` and `student_id` are the profile fields the sign-up form controls.
	The register form (`app/login/register/page.tsx`) has a required Organisation dropdown (`Fed Uni` or `Other`); choosing `Fed Uni` reveals a required Student ID input, and `student_id` is passed to `register()` only in that case.
	`register()` posts both fields to `/api/profile/create`, which stores them as given (empty values become `null`) and always writes `role: "user"` and `user_type: "public"`, whatever the request body contains.
	`student_id` lives on the `profiles` row and is not shown in the admin user table; it appears only in the quiz-results export (see "Admin: Access Management" below).

`role` forms a hierarchy: `isStaff` is true for `"staff"` or `"admin"`, `isAdmin` is true for `"admin"` only.
	Since `register()`'s hardcoded values are still the only sign-up path, every value besides `"user"`/`"public"` has to be set by an admin afterwards, through the Edit User modal on `/admin/users` (see "Admin: Access Management" below).

`AuthContext.tsx`'s `permissions` object also derives `canEditContent` and `canManageScenarios` from `isStaff`, but nothing in the app currently checks either flag — every in-app editor (the lab hotspot editor, the module reader's editor, the quiz editor) gates on `permissions.canManageUsers` (i.e. `isAdmin`) instead.
	So a `staff`-role account currently behaves identically to a plain `user` account everywhere in the UI; the `staff` tier exists in the data model and permission object but has no observable effect yet.

The `user_type` values `AuthContext.tsx`'s `UserProfile` type declares (`student`, `lecturer`, `researcher`, `industry_professional`, `public`) don't match the set the database actually accepts (`engineering_student`, `science_student`, `researcher`, `public`, `lecturer`, `teaching_staff` — see `profiles_user_type_check` in `supabase_setup.sql`).
	The Edit User modal on `/admin/users` offers the same mismatched set as its dropdown options — see `BUG_REPORT.md`.

---

## Server-side auth guards

Two helpers in `lib/` protect API routes using a Firebase ID token rather than the client-side `permissions` object above.
	Both expect the request to carry `Authorization: Bearer <idToken>`, verify it server-side via `lib/firebase/firebaseAdmin.ts` (`adminAuth.verifyIdToken`), and `throw` a plain `Error` on failure — it's up to the calling route to catch that and respond with the appropriate status code:
- **`requireUser(request)`** (`lib/firebase/authUser.ts`) — verifies the token and returns just the caller's `uid`. For routes that only need to know *who* is calling, not their role — it never queries Supabase at all, so it can't distinguish a `user` from a `staff` or `admin` account.
- **`requireAdmin(request)`** (`lib/firebase/adminAuth.ts`) — verifies the token, then looks up the caller's row in Supabase's `profiles` table and throws unless `role === 'admin'`. Returns `{ uid, profile }` on success.

`lib/firebase/firebaseAdmin.ts` initialises the Firebase Admin SDK from a service-account credential (see `FIREBASE_ADMIN_*` in "Environment Variables"), separately from the browser-side Firebase SDK in `lib/firebase/firebase.ts`.

**Route coverage:**
- `requireUser`: `/api/modules/progress` (all methods), `/api/quizzes/progress` (all methods), `/api/quizzes/leaderboard` (`GET`), `/api/lab/progress` (all methods), `/api/feedback` (`POST`)
- `requireAdmin`: `/api/admin/users` (`GET`), `/api/admin/users/export` (`GET`), `/api/admin/users/{uid}` (`PATCH`, `DELETE`), `/api/admin/users/{uid}/progress` (`GET`), `/api/admin/feedback` (`GET`), `/api/modules/save-module` (`POST`), `/api/modules/video` (`PUT`/`DELETE`), `/api/quizzes/save-quiz` (`POST`), `/api/lab/video` (`PUT`/`DELETE`)
- No guard: `/api/lab/load-hotspots`, `/api/lab/load-image`, `/api/lab/load-module-options`, `/api/modules/load-modules` (`GET`s, intentionally public reads), `/api/profile/get`, `/api/profile/create` (bootstrap routes, see above).
	`/api/lab/save-hotspots` and `/api/lab/upload-image` also call no guard — see `BUG_REPORT.md`, since these are writes rather than reads.
	`/api/profile/get` and `/api/profile/create` also take no steps to confirm the caller owns the `uid` they pass, so either route can be used to read or create a profile for an arbitrary uid — see `BUG_REPORT.md`.

Status-code handling for a caught auth failure isn't perfectly uniform across `requireAdmin` routes:
	most map `"Access denied"`/`"Missing authorization token"`/`"User profile not found"` to `403`, but `GET /api/admin/feedback` maps `"Missing authorization token"` to `401` instead and falls through to a generic `500` for `"User profile not found"`.

**`export const dynamic = 'force-dynamic'` on `GET` routes:** any `GET` handler that calls `requireUser`/`requireAdmin` (or otherwise reads `request.headers`) needs this export declared above the handler.
	Next.js attempts to statically render `GET` route handlers at build time by default;
	it can't know at build time what a request's `Authorization` header will contain, so without this export `npm run build` fails with a "Dynamic server usage" error the first time it reaches such a route.
	`POST`/`PATCH`/`DELETE` handlers are exempt — Next treats them as dynamic automatically, since there's no meaningful "build-time version" of a request with a body.
	Every `GET` route listed under `requireUser`/`requireAdmin` above declares this export.
	
---

## API Routes Reference

Every route under `app/api/`, what it reads/writes in Supabase, and what in the app actually calls it. Auth column refers to the guards described above; "public" means no guard is applied (see `BUG_REPORT.md` for which of those are write endpoints and arguably shouldn't be).

| Route                             | Method(s)       | Auth                         | Supabase tables / storage                                | Called from                                                                                                            |
|-----------------------------------|-----------------|------------------------------|----------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------|
| `/api/lab/load-hotspots`          | `GET`           | public                       | `hotspots`                                               | `useHotspots.ts` (`/lab`)                                                                                              |
| `/api/lab/save-hotspots`          | `POST`          | public — see `BUG_REPORT.md` | `hotspots` (delete-all, reinsert)                        | `useHotspotEditor.ts` (`/lab` editor save)                                                                             |
| `/api/lab/load-image`             | `GET`           | public                       | `lab-images` storage bucket                              | `useHotspots.ts` (`/lab`)                                                                                              |
| `/api/lab/upload-image`           | `POST`          | public — see `BUG_REPORT.md` | `lab-images` storage bucket                              | `useHotspotEditor.ts` (`/lab` editor image upload)                                                                     |
| `/api/lab/load-module-options`    | `GET`           | public                       | `modules`                                                | `useModuleOptions.ts` (`/lab` editor's Linked Module dropdown)                                                         |
| `/api/lab/progress`               | `GET`, `POST`   | `requireUser`                | `user_lab_progress`, `hotspots` (count)                  | `useHotspotProgress.ts` (`POST` on hotspot click`), `app/dashboard/page.tsx` (`GET` for the Simulations stat card)     |
| `/api/lab/video`                  | `PUT`, `DELETE` | `requireAdmin`               | `hotspots`, `lab-videos` storage bucket                  | `useHotspotEditor.ts` (`/lab` editor video panel)                                                                      |
| `/api/modules/load-modules`       | `GET`           | public                       | `modules`, `module_sections`                             | `useModules.ts`/`useModuleById` (every `app/modules/` listing + reader page)                                           |
| `/api/modules/video`              | `PUT`, `DELETE` | `requireAdmin`               | `modules`, `module-videos` storage bucket                | `useModuleEditor.ts` (module reader editor video panel)                                                                |
| `/api/modules/progress`           | `GET`, `POST`,  | `requireUser`                | `user_module_progress`                                   | `useModuleProgress.ts`/`useModules.ts` (reader + listing-card progress),                                               |
| ^^^^^                             | `PATCH`         | ^^^^^                        | ^^^^^                                                    | `app/dashboard/page.tsx` (Modules stat card, via `useModules`), `app/certificate/page.tsx` (module-completion check)   |
| `/api/modules/save-module`        | `POST`          | `requireAdmin`               | `modules`, `module_sections`                             | `useModuleEditor.ts` (module reader editor save)                                                                       |
| `/api/quizzes/load-quiz`          | `GET`           | public                       | `quizzes`, `quiz_questions`                              | `useQuiz.ts` (`/quizzes` hub, `/quizzes/hazards`, quiz editor)                                                         |
| `/api/quizzes/save-quiz`          | `POST`          | `requireAdmin`               | `quizzes`, `quiz_questions`                              | `useQuizEditor.ts` (`/quizzes/[quizId]/edit` save)                                                                     |
| `/api/quizzes/progress`           | `GET`, `POST`,  | `requireUser`                | `user_quiz_progress`                                     | `useQuizProgress.ts` (`/quizzes/hazards` submit + leaderboard opt-in), `app/dashboard/page.tsx` (Quizzes stat card)    |
| ^^^^^                             | `PATCH`         | ^^^^^                        | ^^^^^                                                    | `app/certificate/page.tsx` (quiz-pass check)                                                                           |
| `/api/quizzes/leaderboard`        | `GET`           | `requireUser`                | `user_quiz_progress`, `profiles`                         | `app/quizzes/leaderboard/page.tsx`                                                                                     |
| `/api/feedback`                   | `POST`          | `requireUser`                | `feedback`, `profiles` (email lookup)                    | `app/feedback/page.tsx`                                                                                                |
| `/api/admin/feedback`             | `GET`           | `requireAdmin`               | `feedback`                                               | `app/admin/feedback/page.tsx`                                                                                          |
| `/api/admin/users`                | `GET`           | `requireAdmin`               | `profiles`, `user_module_progress`                       | `app/admin/users/page.tsx`                                                                                             |
| `/api/admin/users/export`         | `GET`           | `requireAdmin`               | `profiles`, `user_quiz_progress`                         | `app/admin/users/page.tsx` (Export Excel button)                                                                       |
| `/api/admin/users/{uid}`          | `PATCH`         | `requireAdmin`               | `profiles`, `user_quiz_progress`,                        | `EditUserModal.tsx`, `app/admin/users/page.tsx` (Delete button)                                                        |
| ^^^^^                             | `DELETE`        | ^^^^^                        | `user_lab_progress`, `user_module_progress`              | ^^^^^                                                                                                                  |
| `/api/admin/users/{uid}/progress` | `GET`           | `requireAdmin`               | `profiles`, `user_module_progress`, `user_quiz_progress` | `app/admin/users/[uid]/progress/page.tsx`, and `app/admin/users/page.tsx` (one fetch per learner, see `BUG_REPORT.md`) |
| `/api/profile/get`                | `GET`           | public — see `BUG_REPORT.md` | `profiles`                                               | `AuthContext.tsx` (profile bootstrap on every auth-state change)                                                       |
| `/api/profile/create`             | `POST`          | public — see `BUG_REPORT.md` | `profiles`                                               | `AuthContext.tsx` (bootstrap for a brand-new Firebase user), `register()` (called from `app/login/register/page.tsx`)  |

---

## Modules system

`app/modules/` is a directory holding every topic built on a shared listing+reader template — it isn't a page itself (there's no `page.tsx` directly under `app/modules/`).
	Currently there are two topics:
- **Hazard Modules** (`/modules/hazards`) — the hydrogen hazards content, defined in `lib/modules/hazards.ts`.
	Linked from the Navbar and the dashboard's Modules stat card.
- **Guides** (`/modules/guides`) — an example second topic demonstrating the pattern, defined in `lib/modules/guides.ts`.
	Not currently linked from navigation — it's a template topic, kept unlinked deliberately so its placeholder content stays available as a reference rather than needing to look like real content.
	It follows the same live-loading pattern as `modules/hazards`: `app/modules/guides/page.tsx`/`[id]/page.tsx` call `useModules`/`useModuleById` with `topic: 'guides'`, merging over `lib/modules/guides.ts` as `defaults`.

The shared template lives in `app/modules/components/`:
- `ModuleListingPage.tsx` — filter bar, grid, auth redirect
- `ModuleReaderPage.tsx`  — breadcrumb, hero, sections, key takeaway, prev/next nav, and the progress UI described under "Module Progress Tracking" below
- `ModuleEditor.tsx`      — edit panel for a module's fields and sections, rendered by `ModuleReaderPage` while its edit mode is on
- `ModuleCard.tsx`        — card shown in the listing page, used for every topic
- `SectionBlock.tsx`      — renders a single numbered section.
	Body text is split on blank lines into paragraphs and rendered via `dangerouslySetInnerHTML`, so section `body` content can include inline HTML (e.g. `<strong>`), not just plain text.
	A `callout` is rendered with a 💡 prefix added by this component.

Shared types (`ModuleData`, `ModuleSection`, `ModuleStatus`) and a generic `getModuleById(items, id)` lookup helper live in `lib/modules/moduleTypes.ts`.
	Each topic's data file wraps that helper with its own name (`getHazardModuleById`, `getGuideById`) rather than exposing the generic one directly to pages — though these topic-specific wrappers are no longer called by the reader pages (which now use `useModuleById` instead);
	they're currently unused but left in place pending a decision on whether to remove them, adapt them to take an array parameter, or leave them for other non-hook use cases.

Module content lives in Supabase, loaded per-topic through `hooks/modules/useModules.ts`:
- **`useModules(topic, defaults)`** — fetches `GET /api/modules/load-modules?topic=...`, merges each returned row over the matching entry (by `id`) in `defaults`, and returns `{ modules, loadStatus, usingDefaults, reload }`.
	A successful, non-empty response is authoritative for whatever it contains — any missing modules from the fallback version are considered purposefully deleted.
	`defaults` is only used wholesale as a fallback when the fetch fails entirely or the topic hasn't been seeded yet (empty response).
	`usingDefaults` is `true` in exactly those fallback cases (an error, an empty response, or a network failure), `false` on a verified live load.
- **`useModuleById(topic, defaults, id)`** — the same, narrowed to a single module by id; returns `{ item, loadStatus, usingDefaults, reload }`.
	This is what reader pages use in place of a topic's static `getXById` helper, since the lookup now has to react to data that arrives after the initial render.
- **`mergeRow`/`mapSection`** (exported from `useModules.ts`) do the field-name translation between Supabase's snake_case row shape (`badge_num`, `icon_bg`, …) and the app's camelCase `ModuleData`/`ModuleSection` shape.
- `status`/`progress` are never present in the Supabase `modules` row itself — they're deliberately not columns on `modules`; they're tracked per-user in `user_module_progress` instead.
	`useModules` merges live per-user progress into module content: after merging content, it fetches `GET /api/modules/progress?topic=...` (when a user is signed in) and overwrites each module's `status`/`progress` with the matching per-user record — `"done"` if the record's `status` is `"done"` or its `progress >= 100`, `"progress"` if `> 0`, else `"todo"`.
	The `?topic=` query param scopes the fetch to the current topic, so a `module_id` shared across two topics (e.g. `hazards` and `guides` both using `"1"`) can't have its progress conflated.
	If there's no signed-in user, or no matching record for a given module, that module's `status`/`progress` are left as whatever `mergeRow` already set from `defaults`.
- `slug` is treated differently from `badgeNum`: a `null` slug in Supabase is passed through as `undefined` rather than backfilled from `defaults`, since `slug` is a candidate for use in routing later and a stale slug silently standing in for a missing one would be a broken/misleading link.
	`badgeNum` is purely cosmetic (a hotspot number's position in the list), so it's fine to backfill from `defaults` when Supabase hasn't got one.
- `videoUrl`/`videoType` come from Supabase alone once a module has a Supabase row — a `null` there is authoritative (no video) and is never backfilled from `defaults`.
	Unlike `badgeNum`, a bundled default video is only ever shown before Supabase has responded (or if the row is missing entirely); it's never used to paper over a video that was explicitly removed.
- `reload()` — also returned by both `useModules` and `useModuleById`, re-runs the same fetch (content, then per-user progress) without resetting `loadStatus` back to 'loading'.
	The module reader page's editor passes this in as `onSaved` (see "Module Content Editor" below), so a content or video save is reflected in the page's live-mode display without a manual refresh.`

Each topic's data file (e.g. `lib/modules/hazards.ts`) still exports its static `ModuleData[]` array, now serving as the `defaults` passed into `useModules`/`useModuleById` — what's shown before the Supabase fetch resolves, and the fallback if it fails.
	Changes to this file still require a redeployment to take effect, but since it's now the fallback rather than the live source, most day-to-day content edits happen in Supabase instead and take effect immediately.

For the `ModuleData` field reference and how to edit live module content, see `EDITING_GUIDE.md`.

### Module Content Editor

Every reader page built on `ModuleReaderPage.tsx` has an in-app editor for that module's content, gated on `canManageUsers` — the same permission and the same shared toggle component (`components/EditModeToggle.tsx`) used by `/lab`.
	`components/SaveBar.tsx` is likewise shared between the two.
	Neither component carries any lab- or module-specific copy; the one thing that differs between the two pages is layout width, passed through via an optional `className` on `EditModeToggle`.

**State (`hooks/modules/useModuleEditor.ts`):** takes the topic name, the live `item` from `useModuleById`, and an optional `fallback` (the matching bundled `lib/` entry, looked up by `ModuleReaderPage` via `getModuleById(defaults, item.id)`). It holds a `draft` copy of the module, seeded from `item`.
- Toggling edit mode off does **not** discard unsaved changes — mirroring `useHotspotEditor`'s `toggleEditMode` on `/lab` — only `resetToDefaults` (below) or navigating to a different module does.
- Navigating to a different module (the prev/next links, or the listing page) re-seeds the draft from the new module and forces edit mode off.
	This is driven by an effect keyed on `item?.id` alone, since the Next.js App Router reuses the same page component instance across `[id]` param changes rather than remounting it — the same reason `useModuleProgress` keys its own reset effect on `[moduleId]`.
	A second effect resyncs the draft from `item` when it changes for other reasons (e.g. the initial live fetch resolving), but only while there are no unsaved changes, so a background refresh can't overwrite an in-progress edit — including one made before edit mode was switched off.
- **`resetToDefaults`** replaces the whole draft with `fallback` — reverting to the bundled `lib/` entry, the same semantics as `/lab`'s Reset to Defaults reverting to `lib/hazards.ts` rather than to whatever Supabase last returned.
	Disabled (`canReset: false`) when no `fallback` was supplied — a topic whose wrapper page doesn't pass a `defaults` prop into `ModuleReaderPage` has no bundled content to revert to.
- **Unsaved changes:** `hasUnsavedChanges` reports whether the draft differs from the live module.
	`snapshotModule` compares only the fields `save-module` persists — `videoUrl`/`videoType` are excluded, since they save immediately (see "Embedded Videos").
	`ModuleReaderPage.tsx` passes the flag to `useLeaveWarning`; see "Unsaved-Changes Protection" below.
- **Embedded video:** the hook also owns the module's video draft state (`videoDraftType`, `videoDraftYoutubeUrl`, `videoDraftFile`, `videoSaving`) and its three save/upload/remove handlers, kept in sync with the current draft's `videoUrl`/`videoType` by their own effect — see "Embedded Videos" below.
- **`onSaved`:** an optional callback, passed by `ModuleReaderPage.tsx` as the loading hook's `reload` (`useModuleById`/`useModules`).
	Called after a successful content save and after each video change, so the live `item` — and the page's non-edit-mode display — reflects it without a manual refresh.
- While edit mode is on, `ModuleReaderPage` renders the whole reading view (hero, sections, key takeaway, prev/next links) from `draft` instead of `item`, so edits appear live above the editor panel.

**Editable fields (`ModuleEditor.tsx`):** `id` is read-only (routes are built from it); `slug`, `badgeNum`, `icon`, `iconBg`, `title`, `description`, `keyTakeaway`, `prevId`, `nextId` are free-text fields.
	Sections can be added, deleted, reordered (↑/↓), and each edited for `heading`, `body`, `listType` (none/bulleted/numbered), `items`, and `callout`.
	A section's `num` is not directly editable — `renumberSections` (in `useModuleEditor.ts`) recomputes it from array position on every add/delete/move, since `num` is what `ModuleReaderPage` renders as `data-section-number`, which `useModuleProgress`'s `IntersectionObserver` reads positionally (see "Module Progress Tracking" below) — an out-of-sequence `num` would throw that off.

**Saving:** `POST /api/modules/save-module` (`requireAdmin`-gated) takes `{ topic, module, sections }` and:
1. Upserts the `modules` row (`onConflict: 'topic,id'`) — this also means saving works the first time even if the module previously only existed as `lib/` fallback content, with no Supabase row yet. `sort_order` (the module's position in its topic's listing) is deliberately left untouched — reordering modules within a listing is out of scope for this editor.
2. Deletes and reinserts that module's `module_sections` rows, scoped to `(topic, module_id)` — not the whole table. This mirrors `save-hotspots`' delete-then-reinsert approach for the same reason: `module_sections` is a variable-length list keyed by an editable field (`num`), addable/removable/reorderable in the editor, with nothing else referencing its rows directly.

### Adding a new `app/modules/`-style topic

1. Create a data file in `lib/` — e.g. `lib/modules/scenarios.ts` — with an array typed `ModuleData[]` (import `ModuleData` from `lib/modules/moduleTypes.ts`):
   ```ts
   import { ModuleData } from './moduleTypes';

   export const scenarios: ModuleData[] = [ /* ... */ ];
   ```
2. Seed a matching set of rows in the `modules`/`module_sections` Supabase tables with `topic = 'scenarios'`.
	Either directly via the Supabase dashboard/SQL Editor, or, once step 4 below is done, by visiting each reader page as an admin, turning on Edit Mode, and clicking Save Changes without changing anything (see "Module Content Editor" above and `EDITING_GUIDE.md`).
3. Create `app/modules/scenarios/page.tsx`, a thin wrapper around `ModuleListingPage`, pulling live data via `useModules`:
   ```tsx
   'use client';

   import '../modules.css';
   import ModuleListingPage from '../components/ModuleListingPage';
   import { useModules } from '@/hooks/modules/useModules';
   import { scenarios } from '@/lib/modules/scenarios';

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
4. Create `app/modules/scenarios/[id]/page.tsx`, a thin wrapper around `ModuleReaderPage`, using `useModuleById` in place of a static per-topic lookup — see `app/modules/hazards/[id]/page.tsx` for the current pattern.
	Pass `defaults={scenarios}` into `ModuleReaderPage` alongside `item`/`topic`/`basePath` — this is what the in-app editor's Reset to Defaults button reverts to; omitting it leaves Reset disabled for this topic.
5. If the topic should appear in navigation, add a link in `Navbar.tsx`.

Embedded-video editing (see "Embedded Videos") and its API routes work for any topic without further configuration, since they key off (topic, id) directly rather than a fixed topic.

### Adding a standalone page

For a page unrelated to the modules template:

1. Create a new folder under `app/` named after the route.
2. Copy `template/page.tsx` into it.
3. Update the `active` class on the correct nav link in `Navbar.tsx`.
4. Replace the placeholder content with your page content.

---

## Module Progress Tracking

The reader page tracks live, per-user progress via `useModuleProgress` (`hooks/modules/useModuleProgress.ts`), consumed by `ModuleReaderPage.tsx`.
	The listing page's cards now read from the same underlying data too (see above, `useModules`' progress merge) — but the two fetch and interpret `/api/modules/progress` independently of each other, so a momentary mismatch between a card's badge and the reader page's own progress bar is possible if one has fetched more recently than the other.
	This applies to every topic built on the shared template, including the unlinked `guides` example — each topic passes its own `topic` string into `ModuleReaderPage`/`useModuleProgress`/`useModules`, so progress stays correctly scoped per topic even where module ids collide across topics.

`/api/modules/progress` (`requireUser`-gated) backs the hook:
- **`POST`** — body `{ module_id, topic }`. If a `(uid, topic, module_id)` row doesn't already exist, creates one with `status: "progress"`, `progress: 0`, `attempts: 1`, `started_at`/`last_accessed` set to now, via an upsert (`onConflict: 'uid,topic,module_id'`, `ignoreDuplicates: true`) rather than a plain insert, so two concurrent create calls for the same module (e.g. React StrictMode's double-invoked effects in development) can't collide on the unique constraint.
	If one exists, it's a no-op (`{ ok: true, message: "Progress already exists" }`) — it never resets an existing row.
- **`GET`** — returns every progress row for the caller (`{ ok, progress: ModuleProgress[] }`), optionally scoped to one topic via a `?topic=` query param; the hook finds the one matching the current `moduleId`.
- **`PATCH`** — body `{ module_id, topic, progress?, status?, attempts?, time_spent?, action? }`, all optional except `module_id`/`topic`.
	Setting `progress` also auto-derives `status` (`>= 100` → `"done"` + stamps `completed_at`; `> 0` → `"progress"`) unless `status` is passed explicitly, in which case that wins and setting it to `"done"` directly forces `progress` to `100` too.
	`action: "restart"` ignores every other field, looks the row up first (404s if it doesn't exist), and resets it: `progress: 0`, `status: "progress"`, `completed_at: null`, `time_spent: 0`, `attempts` incremented, `started_at`/`last_accessed` refreshed.
	`useModuleProgress` itself always sends `module_id`/`topic`, and otherwise only ever sends `progress`/`time_spent` (or `action: "restart"`) — it never touches `status` or `attempts` directly, even though the route accepts both.

**How progress is derived:** each section in `ModuleReaderPage` is wrapped in a `div` with `data-module-section` and `data-section-number`.
	An `IntersectionObserver` (50% visibility threshold) watches these and, the first time a new-highest section scrolls into view, computes `progress = round(highestSectionReached / sectionCount * 100)` (capped at 99% until the last section is reached, which sets 100%).
	Progress is monotonic on the client — a save never lowers `lastSavedProgress`, so reopening a completed module doesn't regress its percentage. (The route itself doesn't enforce this — a direct `PATCH` with a lower `progress` value would be accepted; the monotonic guarantee is a client-side convention, not a database one.)

**Time spent** is tracked alongside progress: a session timer starts on load and accumulates into `time_spent` (minutes), saved every 15 seconds while the tab is open (`setInterval`), immediately when the tab becomes hidden or the page is unloading (`visibilitychange`/`pagehide`, using `fetch(..., { keepalive: true })` so the request survives navigation), and again on unmount.
	Saves are queued rather than dropped if one is already in flight — a save request that arrives mid-save is merged into a pending request and re-fired once the current one finishes.

**Reader UI driven by this hook:**
- A progress bar + percentage, shown once `progressLoaded` and `currentProgress > 0`.
- A "Continue from saved progress" button (shown while `0 < currentProgress < 100`) that scrolls to the section matching the saved percentage.
- A "Module completed" banner with a Restart Module button once `currentProgress >= 100` — restart asks for confirmation (`window.confirm`), then `PATCH`es with `{ module_id, action: "restart" }` and resets local progress back to 0.
	A `restartPendingRef` guard also suppresses the section-visibility observer until the user scrolls down past 20px, so the scroll-to-top that follows a restart doesn't immediately re-trigger progress on section 1.

---

## Quizzes & Certificate

### Quiz content

Quiz content lives in Supabase, loaded per-quiz through `hooks/quizzes/useQuiz.ts`:
- **`useQuiz(quizId, defaults)`** — fetches `GET /api/quizzes/load-quiz?quiz_id=...`, which joins the `quizzes` table (`title`, `description`, `pass_threshold`, `pool_size`) with its `quiz_questions` rows (FK'd on `quiz_id`, `on delete cascade`), and returns `{ quizData, loadStatus, usingDefaults }` where `quizData` is `{ title, description, passThreshold, poolSize, questions }`.
- Unlike `useModules`, there's no per-field merge: a successful, non-empty load (a `quizzes` row that also has at least one `quiz_questions` row) is used **entirely** as-is.
	Anything else — no matching `quizzes` row, a `quizzes` row with zero questions, a Supabase error, or a network failure — falls back to `defaults` **entirely**, never a mix of live and fallback fields within the same quiz.
	`usingDefaults` is `true` in exactly those fallback cases, `false` on a verified live load with at least one question.
- `defaults` is `QUIZ_DEFAULTS` from `lib/questionhazards.ts` — `{ title: QUIZ_TITLE, description: QUIZ_DESCRIPTION, passThreshold: PASS_THRESHOLD, poolSize: POOL_SIZE, questions: questionhazards }` — a module-scope constant, since a fresh object literal on every render would fail the `useEffect` dependency check inside `useQuiz` and re-fire the fetch in a loop.
- `mapQuestionRow`/`mapQuizRow` (exported from `useQuiz.ts`) do the field-name translation between Supabase's snake_case row shape (`correct_index`, `pass_threshold`, `is_core`, …) and the app's camelCase `QuizQuestion`/`QuizData` shape (`correctIndex`, `passThreshold`, `isCore`, …).
- **`drawQuizPool(quizData)`** (also exported from `useQuiz.ts`) draws the set of questions presented for one attempt: every question with `isCore: true`, topped up to `poolSize` with a random sample of the rest, with the result shuffled as a whole.
	`poolSize === null`, or a `poolSize` at or above the bank's total question count, presents every question (shuffled).
- `app/quizzes/page.tsx` and `app/quizzes/hazards/page.tsx` both call `useQuiz('hazards', QUIZ_DEFAULTS)` and show a small notice (`.quiz-defaults-notice`/`.quiz-card-notice` in `quizzes.css`) whenever `usingDefaults` is `true`.
- An in-app editor for quiz content exists at `/quizzes/[quizId]/edit`, admin-only — see "Quiz Content Editor" below and `EDITING_GUIDE.md` for how to use it.
- `quiz_id` for this quiz is `'hazards'`, matching `QUIZ_SLUG` — deliberately, since `user_quiz_progress`/the leaderboard routes use an independently-hardcoded, differently-spelled `quiz_id` (`"hydrogen-hazards"`); see `BUG_REPORT.md`.
	`quizzes`/`quiz_questions` are not affected by that mismatch, since both are keyed by `QUIZ_SLUG` directly.

### Quiz Content Editor

`/quizzes/[quizId]/edit` (`app/quizzes/[quizId]/edit/page.tsx`) is an admin-only editor for a quiz's metadata and question bank, gated the same way as `/admin/users` — it checks `isAdmin` directly and redirects anyone who fails that check to `/dashboard`.

Unlike the lab and module reader pages, this editor is a separate page rather than an in-place edit mode on the quiz itself — there's no toggle switch, since navigating to the page is itself the edit mode.
	This is deliberate: the attempt page shuffles question and option order per attempt, and the editor needs to work against the underlying, unshuffled question list rather than whatever order a given attempt happened to render in.
	The entry point is a small ✏️ Edit tab attached to the bottom edge of a quiz's card on `/quizzes`, shown only when `permissions.canManageUsers` is true.

**State (`hooks/quizzes/useQuizEditor.ts`):** takes the `quizId`, the live `item` from `useQuiz`, and an optional `fallback` (the matching bundled `QUIZ_DEFAULTS`, looked up via a `quiz_id`-keyed map in the page component).
	It holds a `draft` copy of the quiz, seeded from `item`.
- A background refresh of `item` (e.g. the initial live fetch resolving) only overwrites `draft` while there are no unsaved changes — the same rule `useModuleEditor` applies.
	There's no `editMode` flag; `hasUnsavedChanges` alone decides.
- Switching `quizId` discards the draft and re-seeds it from the current `item` — relevant once a second quiz exists, since the dynamic `[quizId]` route reuses the same page component instance across different quiz ids.
- **Unsaved changes:** `hasUnsavedChanges` reports whether the draft differs from the last loaded or saved quiz.
	`snapshotQuiz` compares `title`, `description`, `passThreshold`, `poolSize` and each question's `id`, `question`, `options`, `correctIndex`, `explanation` and `isCore`.
	`page.tsx` passes the flag to `useLeaveWarning`; see "Unsaved-Changes Protection" below.
- **`resetToDefaults`** replaces the whole draft with `fallback`, the same semantics as the module editor's Reset to Defaults.
	Disabled (`canReset: false`) when no `fallback` is supplied — currently only the `hazards` quiz has bundled defaults wired into the lookup map.
- **Validation:** every question needs at least 2 options and a `correctIndex` pointing at one of them (`hasInvalidQuestion`/`invalidQuestionIndex`);
	`poolSize`, if set, must be at least 1, at least equal to the number of questions marked `isCore` (`coreCount`), and no more than the total question count (`hasInvalidPoolSize`/`poolSizeError`);
	`passThreshold` must be a whole number from 0 to 100, since it is the percentage of questions a learner must answer correctly to pass (`hasInvalidPassThreshold`/`passThresholdError`).
	All three checks happen client-side (disabling Save via `SaveBar`'s `saveDisabled`/`saveDisabledReason` props) and again inside `saveToSupabase` itself before any request is sent, then server-side in the API route below, and finally in the database, where `quizzes.pass_threshold` carries the check constraint `quizzes_pass_threshold_check` (0–100).
- Deleting an option keeps `correctIndex` pointing at the same answer where possible: it shifts down if a preceding option was removed, or resets to `0` if the correct option itself was the one deleted.
- New questions are numbered via `nextQuestionId` — the first id not currently in use, mirroring `useHotspots.ts`'s hotspot-type generation, so deleting question 2 and adding a new one reuses id 2 rather than continuing past the current highest id.

**Editable fields (`app/quizzes/[quizId]/edit/page.tsx`):** `title`, `description`, `passThreshold`, and `poolSize` (blank/null = use every question) are free-text/number fields.
	An invalid `passThreshold` or `poolSize` shows its error message directly beneath the field.
	Questions can be added, deleted, and reordered (↑/↓); each question's `question` text, `options` (add/delete), correct answer (radio selection), `explanation`, and `isCore` (checkbox) are editable once selected from the question list.

**Saving:** `POST /api/quizzes/save-quiz` (`requireAdmin`-gated) takes `{ quizId, quiz, questions }` and:
1. Validates that `quiz.poolSize`, if provided, is a positive integer no smaller than the number of questions with `isCore: true`, rejecting the request with a 400 otherwise.
2. Validates that `quiz.passThreshold` is a whole number from 0 to 100, rejecting the request with a 400 otherwise.
3. Upserts the `quizzes` row (`onConflict: 'quiz_id'`), writing `title`, `description`, `pass_threshold`, and `pool_size` — `sort_order` is deliberately left untouched, the same reasoning `save-module` applies to a module's own `sort_order`.
4. Deletes and reinserts that quiz's `quiz_questions` rows, scoped to `quiz_id` — not the whole table, mirroring `save-module`'s per-module section replacement — including each question's `is_core` value.

This route's `select` grant on `quizzes`/`quiz_questions` for `service_role` (see `supabase_setup.sql`) is required for both operations above, independent of which DML statement each performs — PostgREST constructs its response (matched-row data, counts) via a read-back that needs `select` privilege regardless of whether the underlying call is an upsert, insert, update, or delete.

### Quizzes hub (`/quizzes`)

A grid of quiz cards (`app/quizzes/page.tsx`, styled by `quizzes.css`) — the Hazards quiz, built from `QUIZ_TITLE`/`QUIZ_SLUG`/`questionhazards.length` in `lib/questionhazards.ts`, and a Student Leaderboard card linking to `/quizzes/leaderboard` (see below).

### Taking a quiz (`/quizzes/hazards`)

- **Randomisation:** the set of questions presented for an attempt is drawn via `drawQuizPool` — every `isCore` question plus a random sample of the rest, up to the quiz's `poolSize` (or the full bank if `poolSize` is null).
	Both question order and each question's option order are then shuffled (Fisher–Yates method) on load and on retry, with `correctIndex` remapped to follow its option.
	A retry draws a fresh pool rather than reshuffling the same one.
- **Answering:** all questions must be answered before submitting (`answers.some(a => a === null)` blocks submit with an inline error).
- **Scoring:** `percentage = round(correctCount / quiz.length * 100)`, where `quiz` is the pool drawn for that attempt — the denominator is the number of questions actually presented, not the full bank;
	`passed = percentage >= passThreshold`, where `passThreshold` is `quizData.passThreshold` from `useQuiz` — the quiz's live, admin-editable pass threshold (falling back to `PASS_THRESHOLD` from `lib/questionhazards.ts` only when Supabase content isn't available), not a hardcoded value.
- **Submitting and progress tracking (`hooks/quizzes/useQuizProgress.ts`):** `submitQuizResult(score, passed)` POSTs `{ score, passed }` to `/api/quizzes/progress` (`requireUser`-gated) with a Firebase bearer token — `passed` here is computed against the live threshold above and stored as-is.
	The hook also owns the leaderboard opt-in (below) and exposes `saving`/`error` for the page to render.
- **After submitting:** each question re-renders showing correct/incorrect/your-answer state and an explanation for anything missed.
	A Retry Quiz button (on fail) reshuffles and resets everything via `drawQuizPool`, incrementing a client-side "Attempt #N" counter that isn't itself sent anywhere — only the eventual `submitQuizResult` call reaches the server.
	Retrying calls the hook's `resetLeaderboardNotice()`, which hides the "✓ saved" note from a prior opt-in choice without touching the choice itself.
	The hook fetches the caller's existing leaderboard preference once on mount (`GET /api/quizzes/progress`);
	a guard discards that fetch's result if it resolves after a more recent explicit submit or opt-in change, so a slow initial load can never overwrite a choice the learner has already made.
- **Leaderboard opt-in:** once submitted, a banner offers "🏆 Show My Score" / "🔒 Keep Private", each calling the hook's `updateLeaderboardPreference(visible)`, which `PATCH`es `/api/quizzes/progress` with `{ leaderboard_visible }`.
	After a submission, the banner's active choice is seeded from what `POST /api/quizzes/progress` actually stored — the route preserves an existing preference across retries rather than resetting it (see below) — so a learner who previously opted in still sees "Show My Score" highlighted right after retrying.
	The preference can currently only be changed from this banner, which only appears after submitting a quiz in the current session — see `BUG_REPORT.md`.
- **On pass**, a "Get Your Certificate" button routes straight to `/certificate`.

### Leaderboard (`/quizzes/leaderboard`)

`GET /api/quizzes/leaderboard` (`requireUser`-gated — login required to view, independent of the viewer's own opt-in status) returns every `user_quiz_progress` row for the hazards quiz where `leaderboard_visible = true`, joined against `profiles` for `display_name` (falls back to `"Anonymous"` if no matching profile row exists).
	Results are ranked by score descending, ties broken by fewer attempts, then most recent `last_attempted_at`.

`leaderboard_visible` defaults to `false` on a brand-new quiz record (`POST /api/quizzes/progress`) and is explicitly preserved — not reset — across retries: the route reads the existing row's value before upserting and writes the same value back.
	It's changed via `PATCH /api/quizzes/progress` with `{ leaderboard_visible: boolean }`, which 404s if the caller has no quiz record yet.

The page itself (`app/quizzes/leaderboard/page.tsx`) shows a podium for the top 3 and a ranked list for the rest; it requires login to view (shows a "please log in" panel rather than redirecting to `/login`) but has no opt-in requirement of its own.

### Certificate gating

`app/certificate/page.tsx` no longer reads `localStorage` at all — despite `handleContinue` in the hazards quiz page still writing a passing record there (see above), that write is now dead code.
	Instead, on mount the certificate page fetches both `GET /api/modules/progress?topic=hazards` and `GET /api/quizzes/progress` (both `requireUser`-gated) and computes eligibility itself:
- **`allModulesCompleted`** — every row in the fetched `moduleProgress` array must have `status === "done"` or `progress >= 100`, checked against `hazardModules.length` as the total.
	The `?topic=hazards` scoping keeps a `guides` progress row from being counted toward this.
- **`quizPassed`** — `record.score >= 70`, a hardcoded threshold independent of `PASS_THRESHOLD` (`lib/questionhazards.ts`) and independent of the `passed` boolean already computed and stored by `/api/quizzes/progress` itself. See `BUG_REPORT.md`.
- **`certificateEligible`** — both of the above must be true.

**Blocked state:** if not eligible, `/certificate` shows a "No certificate yet" panel with messaging that distinguishes three cases — modules incomplete, quiz not passed, or both — each with its own explanatory text and a link to whichever is missing (`/modules/hazards` and/or `/quizzes/hazards`).

**The certificate itself** is drawn client-side onto an HTML `<canvas>` (`drawCertificate()` in `app/certificate/page.tsx`) — title, "Certificate of Achievement", the learner's Firebase `displayName` or `email`, `QUIZ_TITLE`, score, and a formatted date — and downloaded as a PNG via `canvas.toDataURL('image/png')`.
	There's no server-generated file and no PDF; "printable certificate" (per the About page's copy) means printing this downloaded PNG yourself, not an in-app print/PDF flow.

---

## Feedback

`/feedback` (`app/feedback/page.tsx`, styled by `feedback.css`) is a form for submitting a 1–5 star rating, a category (one of a fixed six-item list — `Training Modules`, `Simulations`, `Quizzes`, `Website / Navigation`, `Technical Issue`, `Other`, duplicated as `VALID_CATEGORIES` in the route below), and a free-text message (up to 5000 characters).
	All three fields are required before the Submit button enables.

**Submitting** — `POST /api/feedback` (`requireUser`-gated) validates the rating (integer 1–5), category (must be one of `VALID_CATEGORIES`), and message (non-empty, ≤5000 characters after trimming), looks up the caller's `email` from their `profiles` row, then inserts `{ user_id, email, rating, category, message }` into the `feedback` table.
	A successful submission swaps the form for a thank-you panel linking back to `/dashboard`.

**Reading submissions** — `GET /api/admin/feedback` (`requireAdmin`-gated) returns every row from `feedback`, ordered by `created_at` descending.
	`/admin/feedback` (`app/admin/feedback/page.tsx`) is the admin-facing view for this: a summary row (total responses, average rating, date of the most recent submission), a star-rating breakdown bar chart, and the full list of submissions with rating, category, message, submitter email, and timestamp.
	Its "Average Rating" summary card always renders a fixed five-star string (`★★★★★`) regardless of the computed average — the average itself is only shown as the numeric value next to it, not reflected in the stars.

Unlike `/quizzes/hazards`, `/lab`, and the module reader pages, `/feedback` doesn't redirect unauthenticated visitors to `/login` — it renders for anyone, and only blocks at submit time (an inline error, not a redirect) if there's no signed-in user.
	See "Auth redirect pattern" above and `BUG_REPORT.md`.

---

## Admin: Access Management

`/admin` (`app/admin/page.tsx`) is the admin-only landing page for these tools — two cards, "User Management" (→ `/admin/users`) and "Learner Feedback" (→ `/admin/feedback`, see "Feedback" above).

`/admin/users` (`app/admin/users/page.tsx`) is an admin-only page for managing user accounts and reviewing training progress.

**Data loading:** on mount, it fetches `GET /api/admin/users` (`requireAdmin`-gated), then separately fetches `GET /api/admin/users/{uid}/progress` per learner to compute stat-card numbers — see `BUG_REPORT.md` for the inefficiency and formula mismatch this involves.

**Stat cards** — **Users** (`users.length`), **Administrators** (`role === "admin"` count), **Training Completed**/**Average Progress** (from the per-user fetches described above).

**Search:** a single client-side text filter across `email`, `display_name`, `organisation`, `role`, and `user_type` — no server-side query, so it only filters the already-loaded list.

**Editing a user:** the Edit button on each row opens `EditUserModal.tsx`, which edits `role`, `user_type`, and `organisation` (email shown read-only) and saves via `PATCH /api/admin/users/{uid}` (`requireAdmin`-gated) with `{ role, user_type, organisation }`.

**Deleting a user:** every row except the signed-in admin's own has a Delete button.
	After a `window.confirm`, it calls `DELETE /api/admin/users/{uid}` (`requireAdmin`-gated) and, on success, removes the row from the loaded list.
	The Users and Administrators stat cards follow the list immediately; Training Completed and Average Progress are recalculated by Refresh.
	The route rejects a request for the caller's own uid (`400`) and returns `404` when no `profiles` row matches.
	It then deletes the user's `user_quiz_progress` rows, their `user_lab_progress` rows, and the `profiles` row — which removes their `user_module_progress` rows through the `on delete cascade` on `fk_user_progress` — and finally deletes the Firebase Authentication account with `adminAuth.deleteUser`.
	These steps run one after another rather than in a single transaction, and `feedback` rows the user submitted are not touched; see `BUG_REPORT.md`.

**Exporting quiz results:** the toolbar has an organisation dropdown (`Fed Uni` or `Other`) and an Export Excel button.
	The button calls `GET /api/admin/users/export?organisation=...` (`requireAdmin`-gated) with a Firebase bearer token and downloads the returned workbook; any other `organisation` value is rejected with `400`.
	The route reads every `profiles` row together with its `user_quiz_progress` rows in one query (the embed relies on the foreign key from `user_quiz_progress.uid` to `profiles.uid`), keeps the profiles whose trimmed `organisation` equals the selected value, and builds a single-sheet workbook ("Quiz Results") with `exceljs`, a dependency in `package.json`.
	Columns are Student ID, Name, Email, Score, Attempts, Passed (`Yes`/`No`), and Last Attempted At (formatted with the `en-AU` locale on the server). The header row is bold and frozen.
	Every profile in the selected organisation gets one row, drawn from its progress for the quiz with `quiz_id` `"hydrogen-hazards"` (`QUIZ_ID` in the route).
	A user who has not attempted the quiz still appears, with Attempts `0` and Score, Passed and Last Attempted At blank.
	Student ID comes from `profiles.student_id`, which the register form collects only for Fed Uni accounts, so the `Other` export's Student ID column is blank throughout.
	The download is named `hydrogen-quiz-results-Fed-Uni.xlsx` or `hydrogen-quiz-results-Other.xlsx` and is served with `Cache-Control: no-store`.
	Profiles whose organisation is neither `Fed Uni` nor `Other` appear in neither export; see `BUG_REPORT.md`.

**Viewing a user's module progress:** the Progress button on each row links to `/admin/users/{uid}/progress`, a read-only training-record view for a single user, backed by `GET /api/admin/users/{uid}/progress` (`requireAdmin`-gated).

- **Module data is static here, not live** — unlike the student-facing reader (`useModuleById`, live from Supabase), this page maps over the bundled `hazardModules` array directly and merges each with the matching `moduleProgress` record (by `module_id`).
	A module that exists only in Supabase wouldn't appear here, even though it'd show up for students.
	The underlying `user_module_progress` query (in both this route and `GET /api/admin/users`) is scoped to `topic = "hazards"`, so a learner's progress in any other topic (currently just `guides`) never appears anywhere in the admin panel — see `BUG_REPORT.md`.
- **`ModuleProgress`** — one row per module the user has touched, straight from `user_module_progress`: `uid`, `module_id`, `status`, `progress`, `attempts`, `time_spent`, `started_at`, `last_accessed`, `completed_at`.
- **`QuizProgress`** — one row per quiz, from `user_quiz_progress`: `uid`, `quiz_id`, `score`, `attempts`, `passed`, `last_attempted_at`, and now `leaderboard_visible` (the route selects `*`, so it comes through automatically).
	This page's Quiz panel only ever reads `quizProgress[0]`; there's only one quiz today, even though the schema (`quiz_id` as part of a composite key) supports more.
- **`summary`** — alongside the raw `moduleProgress`/`quizProgress` arrays, `GET /api/admin/users/{uid}/progress` also returns `{ totalModules, completedModules, overallProgress, quizAverage, quizPassed }`.
	`quizPassed` is computed route-side against its own hardcoded `QUIZ_ID`/pass-score constants (see `BUG_REPORT.md`) and is what `/admin/users`' "Training Completed" stat card checks alongside module completion.
	The per-user progress page's own **Certificate** panel, however, only checks module completion (`completedModules >= totalModules`) for its "Eligible"/"Pending" status — it doesn't factor in `summary.quizPassed` at all, so it can disagree with both the "Training Completed" stat card and the learner-facing `/certificate` page's own (differently-computed) eligibility rule. See `BUG_REPORT.md`.
	Nothing in the admin UI currently displays `leaderboard_visible`.
- Each module is rendered via `AdminModuleCard.tsx` with `mode="admin"` and `adminProgress={module.adminProgress}`.

---

## Linking Hotspots to Modules

Each hotspot's `HazardInfo` (in `lib/hazards.ts`, and the live Supabase-backed version in `hooks/lab/useHotspots.ts`) has two fields that together point at a module:
- `moduleId: string | null`
- `moduleTopic: string | null`

`Popup.tsx` builds the Learn More link as `/modules/${moduleTopic}/${moduleId}`, and only renders the button when both are non-null.

**Where the values come from:** the `hotspots` table's `module_topic`/`module_id` columns are genuinely live from Supabase, treated the same as `title`/`text`.
	`useHotspots.ts` only falls back to the full set of local defaults (including their module links) if the `/api/lab/load-hotspots` fetch fails outright or the table is empty; a successful, non-empty load is authoritative for `moduleId`/`moduleTopic`, even where they're `null`.

**Both-or-neither:** the two columns form a matched pair enforced at the database level — the `hotspots_module_fk` foreign key uses `match full`, so a row can have both `null` or both set to a valid `(topic, id)` on `modules`, never just one.
	`addHotspot()` in `useHotspotEditor.ts` seeds new hotspots with both `null` accordingly.
	Deleting the linked module (`on delete set null`) doesn't delete the hotspot — it just resets both columns to `null`, so the Learn More button disappears rather than pointing at a dead link.

**In-app editing:** `HotspotEditor.tsx`'s edit-mode panel has a Linked Module field — a Topic dropdown, and, once a topic is picked, a Module dropdown scoped to that topic. Picking "None" (or switching topic) always clears the module id in the same update, via `useHotspotEditor.ts`'s `updateModuleLink(index, moduleTopic, moduleId)`, which writes both fields together rather than as two separate state updates.
	The database's both-or-neither rule is mirrored client-side: `hasInvalidModuleLink` (also in `useHotspotEditor.ts`) flags any hotspot currently half-set (a topic picked with no module yet, or vice versa), and `saveToSupabase` refuses to call the API while it's true — the Save button disables and shows why, and the guard sits behind the button too, not just as a UI affordance.

**Where the dropdown options come from:** `hooks/lab/useModuleOptions.ts` fetches `GET /api/lab/load-module-options` — a dedicated route (no auth guard, see `BUG_REPORT.md`) that returns every `(topic, id, title, badge_num)` row across all topics, flat, ordered by `topic, sort_order`.
	The hook groups the response client-side into one entry per topic.
	This intentionally bypasses `useModules`/`lib/modules/` defaults entirely: since the FK requires a real Supabase row, a default-only id would just fail to save, so this route has no fallback — if it's unreachable, the dropdowns come back empty rather than silently offering something that wouldn't actually save.
	Practically, this means a topic only appears as a linkable option once it has real rows in `modules` — a `lib/modules/`-only topic (nothing seeded yet) won't show up at all.
	See `BUG_REPORT.md` for what that requires for `hazards` on a fresh install.

For how to set or change a hotspot's linked module, see `EDITING_GUIDE.md`.

---

## Lab Progress Tracking

`user_lab_progress` records the first time a signed-in user clicks each hotspot on `/lab`, outside edit mode — `scenario_id` defaults to `'interactive-lab'`, a forward-looking column for if a second interactive simulation is ever added, always that one value today.

**`POST /api/lab/progress`** (`requireUser`-gated): called from `recordHotspotProgress` in `useHotspotProgress.ts`, invoked by `app/lab/page.tsx` on every hotspot click.
	Confirms the hotspot type exists in `hotspots` first, then upserts onto `(uid, scenario_id, hotspot_id)` with `ignoreDuplicates: true` — so only the first click on a given hotspot is ever recorded;
	later clicks on the same hotspot are silent no-ops, and `first_clicked_at` reflects that first click specifically, not the most recent one.

**`GET /api/lab/progress`** (`requireUser`-gated): returns the signed-in user's recorded rows, `completedHotspots` (their row count), and `totalHotspots` (a live count of every row currently in `hotspots`, not a fixed number). See `BUG_REPORT.md`.

---

## Embedded Videos

Both module reader pages and lab hotspots can have one embedded video — a YouTube link or an uploaded mp4 (50MB limit, the ceiling Supabase Storage enforces on the free tier).
	`modules.video_url`/`modules.video_type` and `hotspots.video_url`/`hotspots.video_type` store it;
	`video_type` is `'youtube'`, `'mp4'`, or `null`.

**Display (`components/ModuleVideo.tsx`):** a shared, stateless component taking `videoUrl`/`videoType` and rendering nothing when both are absent.
	Otherwise it renders a compact launcher card; clicking it opens a modal with either a YouTube `<iframe>` (the URL is parsed into an embed URL first) or a native `<video>` element for mp4.
	The modal closes on Escape, on clicking its backdrop, or its own close button, and locks body scroll while open.
	`ModuleReaderPage.tsx` renders it above a module's sections; `Popup.tsx` renders it inline, under the hotspot's description and above the Learn More link — the same component, two different surrounding contexts, styled via a light-background override in `lab.css` scoped to `.popup-content`.

**Editing (`components/VideoEditorPanel.tsx`):** the fields shared by both editors — a YouTube/mp4 type toggle, a YouTube URL field with its own save button, an mp4 file input with its own upload button, and a remove button when a video is already set.
	`ModuleEditor.tsx` and `HotspotEditor.tsx` each wrap it in their own panel chrome and wire it to their own draft state and handlers; the component itself holds no state of its own.

**Saving:** unlike a module's other fields or a hotspot's title/position, a video change is written to Supabase immediately when its own save/upload/remove button is clicked — not staged into the draft and sent along with the rest of a Save Changes click.
	`PUT /api/modules/video` and `PUT /api/lab/video` (both `requireAdmin`-gated) handle a YouTube URL or an mp4 file upload; `DELETE` on each removes the video.
	An mp4 upload goes to Supabase Storage (`module-videos` or `lab-videos`, one file per module/hotspot) and the route updates `video_url`/`video_type` afterwards; replacing or removing an existing mp4 deletes the old Storage object once the database write succeeds.
	`lib/video/video.ts` holds the logic both routes share — YouTube URL parsing (`getYouTubeVideoId`), Storage path parsing for cleanup (`getStoragePath`), mp4 validation (`validateMp4File`, `isMp4File`, `MAX_MP4_BYTES`), and `safeFileName` (lowercases and hyphenates an uploaded file's name before it's used in the Storage path, e.g. `my video (final)!.mp4` → `my-video--final--.mp4`) — the same 50MB check runs client-side (immediate rejection before an upload starts) and server-side (so it isn't just cosmetic).
	A video change therefore never counts as an unsaved change (see "Unsaved-Changes Protection").

Once a video is saved through either route, the editor hook managing that page — `useModuleEditor.ts`'s `saveYoutubeVideo`/`uploadMp4Video`/`removeModuleVideo`, or `useHotspotEditor.ts`'s `saveHotspotYoutubeVideo`/`uploadHotspotMp4Video`/`removeHotspotVideo` — writes the returned `video_url`/`video_type` into its own draft, so the display component picks it up immediately without a full page reload.
	Each also calls its optional `onSaved` callback, which both pages wire to their loading hook's `reload()` (`useModules`/`useModuleById` for a module, `useHotspots` for the lab), so the underlying live data is refreshed too — relevant once edit mode is switched back off, since the page then reads from `item`/`hotspots` rather than the draft.
	A video removed this way is not re-derived from any bundled `lib/` default on that refresh — see the `videoUrl`/`videoType` bullet under "Modules system" above.

---

## Unsaved-Changes Protection

The lab (`/lab`), the module reader pages and the quiz editor (`/quizzes/[quizId]/edit`) all warn an admin before an edit in progress is lost. Two hooks in `hooks/unsavedChanges/` provide it. Learners never see a warning, since only admins can edit.

**Tracking (`useUnsavedChanges.ts`):** `useUnsavedChanges(draft, initialSaved, snapshot)` returns `hasUnsavedChanges` and `markSaved`.
	It holds a snapshot of what's stored in Supabase and reports `hasUnsavedChanges` while the draft's snapshot differs from it.
	The comparison is independent of edit mode, so unsaved edits are still reported after edit mode is switched off.
	Editing a value and putting it back leaves nothing unsaved, and Reset to Defaults counts as an unsaved change unless the defaults already equal what's stored.
- **`snapshot`** is supplied by each editor and reduces a draft to just the fields its Save persists, as a string: `snapshotHotspots` in `useHotspotEditor.ts`, `snapshotQuiz` in `useQuizEditor.ts` and `snapshotModule` in `useModuleEditor.ts`.
	Each is defined at module scope, so its identity is stable.
	Equivalent values produce the same string: `undefined` and `null` for optional fields, a missing or empty list of a module section's `items`, and a module's `badgeNum` whether it holds a number or the string typed into its input.
	Embedded video fields are excluded from the lab and module snapshots, since a video is written to Supabase as soon as it's saved (see "Embedded Videos").
- **`markSaved(value)`** declares that `value` is what's now stored.
	Each editor calls it with the live data whenever that loads or refreshes, and after a successful save with the draft that was sent, so an edit made while the save request is in flight stays unsaved.
- **`initialSaved`** is only read on the first render.
- Each editor decides for itself when live data may replace its draft; `useModuleEditor` and `useQuizEditor` do so only while there are no unsaved changes. `useUnsavedChanges` only measures the difference.

**Warning (`useLeaveWarning.ts`):** `useLeaveWarning(hasUnsavedChanges)` is called from `app/lab/page.tsx`, `ModuleReaderPage.tsx` and `app/quizzes/[quizId]/edit/page.tsx`.
	While `hasUnsavedChanges` is true it installs two independent guards, and removes them when it's false:
- a `beforeunload` handler (tab close/reload);
- a capture-phase `click` listener on `document` that asks for confirmation before any in-app link click navigates away — including the navigation bar, since it's rendered into the same document via `layout.tsx` — and otherwise lets the click continue to Next.js's own `Link` handling.
	It ignores clicks that don't navigate the current tab away: links to the current path, external links, links with a `target` other than `_self` or a `download` attribute, and modified clicks (Ctrl/Cmd/Shift/Alt, or a non-primary button).
	This doesn't cover the navigation bar's Logout button (a plain `<button>`, not a link, so the click listener has nothing to intercept) or the browser's own Back/Forward buttons.

---

## Testing

The project uses **Vitest** for unit and integration tests, with **React Testing Library** for rendering hooks/components and **MSW (Mock Service Worker)** for mocking API routes — no real Supabase calls are made during tests.

### What's covered

- **Unit tests** — helper functions and hook state, checked on their own terms rather than through an API route's behaviour (e.g. `buildDefaultHotspots` in `hooks/lab/useHotspots.ts`; `getYouTubeVideoId`, `getStoragePath`, `validateMp4File` in `lib/video/video.ts`;)
	A test that waits on a mocked API still counts as a unit test when it checks a helper or derived value rather than the API call itself — e.g. `hasUnsavedChanges` after a save in `useHotspotEditor.test.ts`.
- **Integration tests** — hooks/components interacting with mocked API routes (e.g. `useHotspots` loading via mocked `/api/lab/load-hotspots`/`/api/lab/load-image`;)

Test files live alongside the code they cover, using a `.test.ts` / `.test.tsx` suffix (e.g. `hooks/lab/useHotspots.ts` → `hooks/lab/useHotspots.test.ts`). Vitest picks these up automatically.

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
