[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/JCT9HXj3)

Project Brief: Hydrogen is a critical energy carrier as the world prepares to transition to sustainable green energy systems. However, hydrogen is very different from the traditionally used fuels (diesel, petrol) and power systems where electrons are the energy carriers. This necessitates tools to educate and increased general awareness to ensure public safety both for users and non-users.  

The project focusses on the development of virtual solutions for delivering hydrogen safety training to science and engineering undergraduate and postgraduate students.  

The as-developed tool should be able to educate a non-expert about:
i. Identifying risks linked to having hydrogen in a closed space or work environment,  
ii. Critical or key aspects to look for when ensuring safety of self and co-workers/others, and  
iii. Action-steps to ensure safety upon identification of a risk. 

The tools, preferably interactive, would mimic simulated laboratory and/or industry environment. The tools should be designed to also be suitable for non-science industry employees looking to upgrade-skills or for increasing awareness and safe-behaviour in hydrogen-spaces.  

The purpose of the tool is to take a non-expert/beginner to an intermediate stage to ensure readiness to work/navigate safely in a real hydrogen-related workspace by increasing hydrogen awareness. 

Client: 
A/Prof Surbhi Sharma (surbhi.sharma@federation.edu.au) 

Project Supervisors:   
A/Prof Surbhi Sharma (surbhi.sharma@federation.edu.au)  
Prof Bhavna Antony 

# Hydrogen Lab Safety – Next.js

A **Next.js 14 App Router** application with TypeScript for hydrogen technology training. Features an interactive lab safety simulation, informative modules, a randomised quiz, administrative progress tracking and a dashboard tracking these modules, scenarios, and quizzes.

---

## Project Structure

> **Note:** this `next-app/` folder is a subfolder of the overall Git repository, not the repo root.
	The GitHub Actions Continuous Integration workflow (`.github/workflows/test.yml`) lives one level up, at the true repo root, alongside `next-app/` — not inside it — since GitHub only looks for workflow files at the repository root.

```
hydrogen-lab/
├── app/
│   ├── globals.css						# Shared styles — reset, tokens, nav, panel, dashboard
│   ├── layout.tsx						# Root layout — renders Navbar and wraps all pages
│   ├── page.tsx						# Dashboard (home page)
│   ├── intro/
│   │   ├── page.tsx					# Public landing/intro page (/intro) — no login required
│   │   └── intro.css					# Intro-specific styles
│   ├── about/
│   │   ├── page.tsx					# Public "About" page (/about) — no login required; doesn't call useAuth() at all
│   │   └── about.css					# About-page-specific styles
│   ├── template/
│   │   └── page.tsx					# Template for creating new pages (not in navigation)
│   ├── login/
│   │   ├── auth.css					# Shared styles for login and register pages — NOT used by forgot-password, see note below
│   │   ├── page.tsx					# Login page (/login)
│   │   ├── register/
│   │   │   └── page.tsx				# Register page (/login/register)
│   │   └── forgot-password/
│   │       └── page.tsx				# Forgot-password page (/login/forgot-password) — styled with an inline JS object, not auth.css
│   ├── admin/
│   │   └── users/
│   │       ├── page.tsx				# Admin "Access Management" page (/admin/users) — user table, search, stat cards, edit modal
│   │       ├── admin.css				# Styles for the admin users page — table, modal, stat cards, admin module cards
│   │       ├── [uid]/
│   │       │   └── progress/
│   │       │       └── page.tsx		# Per-user training record (/admin/users/[uid]/progress) — read-only, admin-facing
│   │       └── components/
│   │           ├── EditUserModal.tsx	# Modal for editing a user's role, user_type, and organisation
│   │           └── AdminModuleCard.tsx	# Read-only per-user module progress card; shares ModuleCard.css with HazardModuleCard — see "Admin: Access Management" below
│   ├── lab/
│   │   ├── page.tsx					# Interactive hydrogen lab (/lab)
│   │   ├── lab.css						# Lab-specific styles
│   │   ├── styles.ts					# Shared inline style objects for lab components
│   │   └── components/
│   │       ├── EditBanner.tsx			# Yellow banner shown when edit mode is active
│   │       ├── HotspotEditor.tsx		# Edit panel for hotspot text, position, and lab image
│   │       ├── SaveBar.tsx				# Reset and save buttons for hotspots
│   │       └── HazardPopup.tsx			# Modal popup for hazard info
│   ├── modules/
│   │   ├── modules.css					# Shared styles for every section under app/modules/
│   │   ├── components/
│   │   │   ├── ModuleListingPage.tsx	# Wrapper for listing page
│   │   │   ├── ModuleReaderPage.tsx	# Wrapper for module page — also wires up live progress tracking, see "Module Progress Tracking" below
│   │   │   ├── HazardModuleCard.tsx	# Card component for each module in the listing page (despite the name, used generically by every section — see note below)
│   │   │   ├── ModuleCard.css			# Styles for HazardModuleCard, shared with AdminModuleCard (app/admin/users/components/) — see "Admin: Access Management" below
│   │   │   └── SectionBlock.tsx		# Renders a single numbered section in a module page — body supports embedded HTML, see note below
│   │   ├── hooks/
│   │   │   └── useModuleProgress.ts	# Per-user progress/time tracking for the reader page — see "Module Progress Tracking" below
│   │   ├── hazard-modules/
│   │   │   ├── page.tsx				# Hazard module listing (/modules/hazard-modules)
│   │   │   └── [id]/
│   │   │       └── page.tsx			# Hazard module reader (/modules/hazard-modules/1 … 5)
│   │   └── guides/
│   │       ├── page.tsx				# Example second section (/modules/guides) — not linked in nav
│   │       └── [id]/
│   │           └── page.tsx			# Example reader page
│   ├── api/
│   │   ├── load-hazards/
│   │   │   └── route.ts				# GET route — loads hazard data from Supabase (anon client; no auth guard — reads are intentionally public)
│   │   ├── save-hazards/
│   │   │   └── route.ts				# POST route — saves hazard data to Supabase (delete-all, then re-insert); `supabaseServer`, but no auth guard — see "Edit Mode" below
│   │   ├── load-image/
│   │   │   └── route.ts				# GET route — returns lab image URL from Supabase Storage, or `null` if none uploaded yet (anon client; no auth guard)
│   │   ├── upload-image/
│   │   │   └── route.ts				# POST route — uploads lab image to Supabase Storage, always as `lab.jpg` (overwrites); `supabaseServer`, but no auth guard — see "Edit Mode" below
│   │   ├── load-modules/
│   │   │   └── route.ts				# GET route — loads module content + sections from Supabase for a given section (anon client; no auth guard — see note under "Module Progress Tracking" below)
│   │   ├── modules/
│   │   │   └── progress/
│   │   │       └── route.ts			# GET/POST/PATCH — per-user module progress (`requireUser`-gated); backs `useModuleProgress` — see "Module Progress Tracking" below
│   │   ├── admin/
│   │   │   └── users/
│   │   │       ├── route.ts			# GET — all profiles + server-computed statistics (`requireAdmin`-gated, mostly unused by the client — see "Admin: Access Management" below)
│   │   │       └── [uid]/
│   │   │           ├── route.ts		# PATCH — updates role/user_type/organisation (`requireAdmin`-gated, no value validation)
│   │   │           └── progress/
│   │   │               └── route.ts	# GET — one user's module + quiz progress and summary (`requireAdmin`-gated)
│   │   ├── quizzes/
│   │   │   └── progress/
│   │   │       └── route.ts			# GET/POST — per-user quiz result (`requireUser`-gated); `quiz_id` hardcoded server-side — see "Quizzes & Certificate" below
│   │   └── profile/
│   │       ├── get/
│   │       │   └── route.ts			# GET route — loads a user profile by Firebase uid (no auth guard — see "Server-side auth guards" below)
│   │       └── create/
│   │           └── route.ts			# POST route — creates a user profile record if one doesn't already exist for this uid (no auth guard — same reason)
│   ├── quizzes/
│   │   ├── quizzes.css					# Shared styles for the quizzes hub and attempt pages
│   │   ├── page.tsx					# Quizzes hub — lists available quizzes (currently just one, Hazards)
│   │   └── hazards/
│   │       └── page.tsx				# Hazards quiz attempt page — see "Quizzes & Certificate" below
│   └── certificate/
│       ├── certificate.css				# Styles for the certificate page
│       └── page.tsx					# Certificate page — client-side canvas certificate, gated by localStorage — see "Quizzes & Certificate" below
├── components/
│   └── Navbar.tsx						# Reusable navigation bar — hides on auth pages, gates Administration link by permissions
├── context/
│   └── AuthContext.tsx					# Firebase auth state + user profile/role/permissions — wraps the app via layout.tsx
├── hooks/
│   ├── useHazards.ts					# Custom hook — hotspot state, Supabase load/save, drag, secret key, image upload
│   ├── useHazards.test.ts				# Unit + integration tests for useHazards.ts
│   ├── useModules.ts					# Generic hook — loads+merges Supabase module content for any app/modules/ section
│   └── useModules.test.ts				# Unit + integration tests for useModules.ts
├── mocks/
│   ├── handlers.ts						# MSW request handlers — mock responses for all /api routes
│   └── server.ts						# MSW server instance, started/stopped in vitest.setup.ts
├── lib/
│   ├── hazards.ts						# Default hazard data + hotspot positions + module link (fallback)
│   ├── moduleTypes.ts					# Generic ModuleData/ModuleSection/ModuleStatus types + getModuleById — shared by every app/modules/ section
│   ├── hazardModules.ts				# Static content for the 5 hazard modules (bundled at build time)
│   ├── guides.ts						# Example second section's data — not linked in nav
│   ├── questionhazards.ts				# Hydrogen Hazards quiz: `questionhazards` question bank, `QUIZ_TITLE`, `QUIZ_SLUG`, `PASS_THRESHOLD`, `QuizQuestion` type
│   ├── supabase.ts						# Supabase client (anon key + server-side secret key)
│   ├── firebase.ts						# Firebase client SDK init (auth + Firestore) — browser-side
│   ├── firebaseAdmin.ts				# Firebase Admin SDK init — server-side, used to verify ID tokens
│   ├── authUser.ts						# requireUser(request) — verifies a Bearer ID token, returns the caller's uid
│   └── adminAuth.ts					# requireAdmin(request) — verifies a Bearer ID token + checks role='admin' in Supabase
├── public/
│   ├── lab.jpg							# Default lab image (fallback)
│   └── hydrogen-lab-bg.svg				# Decorative background graphic used on the intro page
├── .env.local							# Environment variables (not committed to Git)
├── global.d.ts							# `declare module '*.css'` — lets .tsx files import page-specific .css files without a TypeScript error
├── next.config.js						# Active config — sets the allowed Supabase Storage image domain, see "Configure allowed image domains" below
├── postcss.config.mjs					# Enables Tailwind CSS v4 via the `@tailwindcss/postcss` plugin — see note under "CSS Structure" below
├── tsconfig.json
├── tsconfig.vitest.json				# Widened tsconfig (no test-file excludes) so vite-tsconfig-paths can resolve "@/" imports inside test files
├── vitest.config.mts					# Vitest configuration (jsdom, plugins, setup file)
├── vitest.setup.ts						# Global test setup — jest-dom matchers, MSW server lifecycle
└── package.json
```

Note: `app/modules/` has no `page.tsx` of its own — it's a code-organization directory holding every section built on the shared template (`hazard-modules`, `guides`), not a route itself.

---

## Pages

| Route                            | File                                       | Description                                                                                   |
|----------------------------------|--------------------------------------------|-----------------------------------------------------------------------------------------------|
| `/`                              | `app/page.tsx`                             | Dashboard with modules, scenarios, quizzes, and training progress                             |
| `/intro`                         | `app/intro/page.tsx`                       | Public landing page introducing the platform — no login required                              |
| `/about`                         | `app/about/page.tsx`                       | Public "About" page — project background, platform features, tech stack; no login required    |
| `/login`                         | `app/login/page.tsx`                       | Email and password login                                                                      |
| `/login/register`                | `app/login/register/page.tsx`              | New account registration                                                                      |
| `/login/forgot-password`         | `app/login/forgot-password/page.tsx`       | Firebase password-reset email request                                                         |
| `/lab`                           | `app/lab/page.tsx`                         | Interactive lab with clickable hazard hotspots                                                |
| `/modules/hazard-modules`        | `app/modules/hazard-modules/page.tsx`      | Hazard module listing grid with status filter bar                                             |
| `/modules/hazard-modules/[id]`   | `app/modules/hazard-modules/[id]/page.tsx` | Hazard module reader — sections, callouts, key takeaway, prev/next nav                        |
| `/modules/guides`                | `app/modules/guides/page.tsx`              | Example second section built on the same template — not linked in nav                         |
| `/modules/guides/[id]`           | `app/modules/guides/[id]/page.tsx`         | Example reader page for the guides section                                                    |
| `/quizzes`                       | `app/quizzes/page.tsx`                     | Quizzes hub — currently lists one quiz, Hazards                                               |
| `/quizzes/hazards`               | `app/quizzes/hazards/page.tsx`             | Hazards quiz attempt — randomised questions/options, scored, saved                            |
| `/certificate`                   | `app/certificate/page.tsx`                 | Downloadable certificate — gated by a passing quiz result in `localStorage`, not server state |
| `/admin/users`                   | `app/admin/users/page.tsx`                 | Admin-only "Access Management" page — user table, search, stat cards, edit modal              |
| `/admin/users/[uid]/progress`    | `app/admin/users/[uid]/progress/page.tsx`  | Read-only per-user training record — module progress, quiz score, certificate eligibility     |

Note: the "Hydrogen Lab Safety" title in the Navbar links to `/intro`, following the common pattern of a site's logo linking back to a landing/home page.
Note: there is no page at the bare `/modules` route. `app/modules/` is a code-organization directory holding every section built on the shared listing+reader template — not a page itself — so visiting `/modules` directly returns a 404.
	The Navbar and dashboard both link straight to `/modules/hazard-modules`.

All pages except `/login`, `/login/register`, `/login/forgot-password`, `/intro` and `/about` redirect unauthenticated users to `/login`.
	The `/intro` page calls `useAuth()` (to swap some elements for logged-in users) but doesn't gate access on it, so it's viewable by anyone.
	`/about` doesn't call `useAuth()` at all, so it's a fully static public page with no auth-dependent UI.
	`/admin/users` is a further exception to the redirect target: it checks `isAdmin` directly (not just whether a user is logged in) and redirects anyone who fails that check — logged-out or logged-in-but-non-admin alike — to `/` rather than `/login`. See "Admin: Access Management" below.

This redirect is implemented per-page, not through Next.js middleware (there's no `middleware.ts`). `app/page.tsx` shows the pattern:
	it calls `useAuth()` for `user`/`loading`, renders `<div>Loading...</div>` while `loading` is true, `router.replace('/login')` inside a `useEffect` once loading has finished and there's no `user`, and returns `null` in the render itself while that redirect is pending.
	Any new protected page needs to repeat this pattern (or a shared wrapper for it doesn't exist yet).

---

## Authentication & Permissions

Firebase handles authentication itself (sign-in, sign-up, session state), but each user also has a **profile** — role, user type, organisation — stored separately and managed through two API routes:

- `GET /api/profile/get?uid=...` — loads the profile matching a Firebase uid
- `POST /api/profile/create` — creates a profile record

`context/AuthContext.tsx` wraps the whole app via `layout.tsx` and ties the two together:
	On every Firebase auth-state change it calls `/api/profile/get`; if that comes back not-ok (a brand-new Firebase user with no profile yet), it calls `/api/profile/create` with `role: "user"` and `user_type: "public"`, then re-fetches.
	`register()` follows the same hardcoded role/type — the `RegisterData` type only allows `role: "user"` and `user_type: "public"`, so there's currently no sign-up path that creates a `staff` or `admin` account, or any `user_type` other than `"public"`.
	`organisation` is the one profile field that isn't hardcoded: the register form (`app/login/register/page.tsx`) has an optional "Organisation" input, passed straight through to `register()` and saved as entered — so it's set by the user at sign-up, not just editable by an admin afterwards (see the Edit User modal below).

### Roles and permissions

A profile's `role` is one of `"user" | "staff" | "admin"`, forming a hierarchy — `isStaff` is true for `"staff"` or `"admin"`, `isAdmin` is true for `"admin"` only. `useAuth()` derives a `permissions` object from this on every render:

| Permission           | Granted to         |
|----------------------|--------------------|
| `canAccessModules`   | any logged-in user |
| `canUseSimulation`   | any logged-in user |
| `canViewReports`     | any logged-in user |
| `canEditContent`     | staff and admin    |
| `canManageScenarios` | staff and admin    |
| `canManageUsers`     | admin only         |
| `canViewAnalytics`   | admin only         |
| `canViewAuditLogs`   | admin only         |

The only one currently wired into the UI is `canManageUsers`, which controls whether `Navbar.tsx` shows an **Administration** link to `/admin/users`.
	Promoting a user to `staff`/`admin`, or changing their `user_type`/`organisation`, is done through the **Edit User** modal on `/admin/users` (see "Admin: Access Management" below).
	`register()`'s hardcoded `role: "user"`, `user_type: "public"` (above) is still the only sign-up path, so every other value has to be set by an admin afterwards.

**The modal's `user_type` options don't match what the database actually accepts.** `EditUserModal.tsx`'s `<select>` offers `public`, `student`, `lecturer`, `researcher`, `industry_professional`.
	The `profiles` table's `user_type` check constraint allows `engineering_student`, `science_student`, `researcher`, `public`, `lecturer`, `teaching_staff`. Only `public`, `lecturer`, and `researcher` are valid in both:
- Picking `student` or `industry_professional` in the modal and saving fails at the database — `PATCH /api/admin/users/{uid}` passes `user_type` straight through to the Supabase update with no validation of its own, so the constraint violation comes back as a raw Supabase error message via the modal's `alert(data.error)`.
- `engineering_student`, `science_student`, and `teaching_staff` are valid values with no way to set them — they're not in the modal's options, and `register()` only ever hardcodes `"public"`.

Note: `Navbar.tsx` also links to `/about` and `/quizzes`, and hides itself on `/login/forgot-password` in addition to `/login` and `/login/register`.

### Server-side auth guards

Two helpers in `lib/` protect API routes using a Firebase ID token rather than the `permissions` object above (which is client-side only, computed in `AuthContext`).
	Both expect the request to carry `Authorization: Bearer <idToken>`, verify it server-side via `lib/firebaseAdmin.ts` (`adminAuth.verifyIdToken`), and `throw` a plain `Error` on failure — it's up to the calling route to catch that and respond with the appropriate status code:
- **`requireUser(request)`** (`lib/authUser.ts`) — verifies the token and returns just the caller's `uid`. For routes that only need to know *who* is calling, not their role.
- **`requireAdmin(request)`** (`lib/adminAuth.ts`) — verifies the token, then looks up the caller's row in Supabase's `profiles` table and throws unless `role === 'admin'`. Returns `{ uid, profile }` on success.

`lib/firebaseAdmin.ts` initialises the Firebase Admin SDK from a service-account credential (see `FIREBASE_ADMIN_*` in "Environment Variables"), separately from the browser-side Firebase SDK in `lib/firebase.ts`.

Routes that call `requireAdmin` consistently map its thrown message to a status code: `"Access denied"`, `"Missing authorization token"`, and `"User profile not found"` all become `403`; anything else becomes `500`.
	Routes using `requireUser` (`/api/modules/progress`, `/api/quizzes/progress`) handle Supabase errors explicitly with their own `500` response inside the `try` block, so those don't get mis-labelled.
	But anything that throws instead of returning an error object (a malformed JSON request body, for instance, since both routes call `request.json()` without their own validation) falls through to the same outer `catch` as a real auth failure and comes back as `401`, which would be misleading for that specific case.

**Coverage:** `load-hazards`, `load-image`, `load-modules`, `save-hazards`, and `upload-image` call neither guard — no server-side auth check at all. The three `GET`s are presumably intentional (their data is meant to be publicly readable).
	`save-hazards` and `upload-image` are `POST`s with real write access, though, so this means the actual write endpoints behind edit mode have no server-side access control:
	nothing stops a direct request to either one, with no login and no keystroke sequence, from overwriting the shared hazard data or lab image — the "hidden" `H Z E D I T` entry point (see "Edit Mode" below) only hides the *UI*, not the API underneath it.

Every other route uses one or the other:
- `requireUser`: `/api/modules/progress` (all methods), `/api/quizzes/progress` (all methods)
- `requireAdmin`: `/api/admin/users` (`GET`), `/api/admin/users/{uid}` (`PATCH`), `/api/admin/users/{uid}/progress` (`GET`)

`/api/profile/get` and `/api/profile/create` also call neither — reasonably, since they're what `AuthContext.tsx` itself uses to bootstrap a profile before there's necessarily anything to check a role against.

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

Requires **Node.js 20.9 or higher**. The project currently targets **Next.js 14**.

### 2. Set up Firebase

The app uses Firebase for user authentication.

**a) Create a project** at [firebase.google.com](https://firebase.google.com) and register a web app.

**b) Enable Email/Password sign-in** — go to **Authentication → Sign-in method** and enable the Email/Password provider.

**c) Find your credentials** — go to **Project Settings → Your apps → SDK setup and configuration** and copy the config values.

**d) Generate a service account** (for the server-side Firebase Admin SDK, used by `lib/firebaseAdmin.ts` to verify ID tokens in API routes) — go to **Project Settings → Service Accounts** and click **Generate new private key**.
	This downloads a JSON file containing `project_id`, `client_email`, and `private_key`, used for the `FIREBASE_ADMIN_*` variables below (see "Environment Variables").

### 3. Set up Supabase

The app uses Supabase to persistently store hotspot data across deployments. Follow these steps once:

**a) Create a free account** at [supabase.com](https://supabase.com) and create a new project.

**b) Create the database table** — go to the SQL Editor in your Supabase dashboard and run:

```sql
create table hazards (
	type            text primary key,
	title           text not null,
	text            text not null,
	top             text not null,
	"left"          text not null,
	module_section  text null,
	module_id       text null,
	sort_order      int  not null default 0
);
```

Note: `"left"` must be quoted as it is a reserved word in SQL.
Note: `module_section`/`module_id` link a hotspot to a module (see "Linking Hotspots to Modules" below) — they're left nullable here and the foreign key constraint is added in step (d), after the `modules` table exists to reference.

**c) Set permissions** — run the following in the SQL Editor:

```sql
alter table public.hazards enable row level security;

create policy "Allow public read"
on public.hazards
for select
to anon
using (true);

create policy "Allow service role write"
on public.hazards
for all
to service_role
using (true)
with check (true);

grant select on public.hazards to anon;
```

> **Note:** the `grant select` line above is required in addition to the RLS policy. `enable row level security` + a `for select to anon` policy only controls which *rows* `anon` can see once it already has the base table-level privilege — it does not grant that privilege itself.
	Tables created via the SQL Editor (rather than the dashboard's table UI) don't get this automatically, so without an explicit `grant select`, every query fails with `permission denied for table ...` (Postgres error `42501`) even though the policy above looks correct.
	This applies per table, so each table below has its own `grant select` line — don't skip it for tables created after this section (e.g. when adding a new `app/modules/` section per "Adding a New Section" below).

**d) Create the modules tables** — module content (title, sections, key takeaway, etc.) is also stored in Supabase, across two tables shared by every section under `app/modules/` (distinguished by a `section` column, e.g. `'hazard-modules'`):

```sql
create table public.modules (
  section       text not null,
  id            text not null,
  slug          text null,
  badge_num     integer null,
  icon          text not null,
  icon_bg       text not null,
  title         text not null,
  description   text not null,
  key_takeaway  text not null,
  prev_id       text null,
  next_id       text null,
  sort_order    integer not null default 0,
  constraint modules_pkey primary key (section, id)
);

create table public.module_sections (
  section     text not null,
  module_id   text not null,
  num         text not null,
  heading     text not null,
  body        text not null,
  list_type   text null,
  items       jsonb null,
  callout     text null,
  sort_order  integer not null default 0,
  constraint module_sections_pkey primary key (section, module_id, num),
  constraint module_sections_section_module_id_fkey foreign key (section, module_id) references modules (section, id) on delete cascade,
  constraint module_sections_list_type_check check ((list_type = any (array['ul'::text, 'ol'::text])))
);
```

Note: `status` and `progress` (used by the listing card) are deliberately **not** columns on `modules` — they're tracked per-user in `user_module_progress` instead (created in step (f) below), and the listing card doesn't read from that table anyway.
	Every module's status/progress on the listing card is always drawn from its entry in `lib/hazardModules.ts`, never from Supabase — see `hooks/useModules.ts` and "Module Progress Tracking" below.

Now that `modules` exists, add the foreign key constraint deferred from the `hazards` table above:

```sql
alter table public.hazards
  add constraint hazards_module_fk
  foreign key (module_section, module_id)
  references public.modules (section, id)
  match full
  on delete set null;
```

`match full` means a hazard row must have `module_section`/`module_id` either both `null` or both set to a valid, existing `(section, id)` pair on `modules` — never just one of the two.
	`on delete set null` means deleting a module doesn't delete the hazard that links to it; the hotspot's "Learn More" button just stops appearing (see "Linking Hotspots to Modules" below).

Set permissions the same way as the `hazards` table:

```sql
alter table public.modules enable row level security;
alter table public.module_sections enable row level security;

create policy "Allow public read"
on public.modules
for select
to anon
using (true);

create policy "Allow service role write"
on public.modules
for all
to service_role
using (true)
with check (true);

create policy "Allow public read"
on public.module_sections
for select
to anon
using (true);

create policy "Allow service role write"
on public.module_sections
for all
to service_role
using (true)
with check (true);

grant select on public.modules to anon;
grant select on public.module_sections to anon;
```

(See the note under step (c) — the `grant select` lines are required alongside these policies, not optional extras.)

**e) Create the image storage bucket** — run the following in the SQL Editor:

```sql
insert into storage.buckets (id, name, public)
values ('lab-images', 'lab-images', true);

create policy "Allow public read"
on storage.objects
for select
to anon
using (bucket_id = 'lab-images');

create policy "Allow service role upload"
on storage.objects
for insert
to service_role
with check (bucket_id = 'lab-images');

create policy "Allow service role update"
on storage.objects
for update
to service_role
using (bucket_id = 'lab-images');
```

**f) Create the profile and progress tables** — user accounts and per-user training progress:

```sql
create table public.profiles (
  uid           text not null,
  email         text not null,
  role          text not null default 'user',
  user_type     text not null default 'public',
  organisation  text null,
  display_name  text null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint profiles_pkey primary key (uid),
  constraint profiles_email_key unique (email),
  constraint profiles_role_check check (role in ('user', 'staff', 'admin')),
  constraint profiles_user_type_check check (
    user_type in ('engineering_student', 'science_student', 'researcher', 'public', 'lecturer', 'teaching_staff')
  )
);

create table public.user_module_progress (
  id              uuid not null default gen_random_uuid(),
  uid             text not null,
  section         text not null default 'hazard_modules',
  module_id       text not null,
  status          text not null default 'todo',
  progress        integer not null default 0,
  quiz_score      integer null,
  attempts        integer not null default 0,
  time_spent      integer not null default 0,
  started_at      timestamptz null,
  completed_at    timestamptz null,
  last_accessed   timestamptz null,
  created_at      timestamptz null default now(),
  updated_at      timestamptz null default now(),
  constraint user_module_progress_pkey primary key (id),
  constraint user_module_progress_uid_section_module_id_key unique (uid, section, module_id),
  constraint fk_user_progress foreign key (uid) references public.profiles (uid) on delete cascade,
  constraint fk_user_progress_module foreign key (section, module_id) references public.modules (section, id) on delete restrict,
  constraint user_module_progress_status_check check (status in ('todo', 'progress', 'done')),
  constraint user_module_progress_progress_check check (progress >= 0 and progress <= 100),
  constraint user_module_progress_quiz_score_check check (quiz_score >= 0 and quiz_score <= 100)
);

create table public.user_quiz_progress (
  id                 bigint generated by default as identity,
  uid                text not null,
  quiz_id            text not null,
  score              integer not null default 0,
  attempts           integer not null default 0,
  passed             boolean not null default false,
  last_attempted_at  timestamptz null,
  created_at         timestamptz not null default now(),
  constraint user_quiz_progress_pkey primary key (id),
  constraint user_quiz_progress_uid_quiz_unique unique (uid, quiz_id)
);
```

Note: `user_module_progress.section`'s column default (`'hazard_modules'`, underscore) doesn't match the actual section slug used everywhere else in the app (`'hazard-modules'`, hyphen) — moot in practice, since `/api/modules/progress` always sets `section` explicitly on insert rather than relying on the default. See "Module Progress Tracking" below.

Every route that touches these three tables uses `supabaseServer` (the service-role client, which bypasses RLS) behind `requireUser` or `requireAdmin` — see "Server-side auth guards" above — rather than the browser-side `anon` client used for `hazards`/`modules`/`module_sections`. So, unlike those tables, there's no need for an `anon` `select` policy here; enabling RLS with no `anon` policies at all keeps them inaccessible to anything but the service role:

```sql
alter table public.profiles enable row level security;
alter table public.user_module_progress enable row level security;
alter table public.user_quiz_progress enable row level security;
```

**g) Find your credentials** — go to **Settings → API Keys** in the Supabase dashboard:

- **Project URL** — in the format `https://abcdefghijkl.supabase.co`
- **`sb_publishable` key** — safe to expose in the browser
- **`sb_secret` key** — admin-level access, must be kept private

### 4. Create the `.env.local` file

Create a `.env.local` file in the project root containing all credentials for both Firebase and Supabase:

```
# Firebase (client SDK)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase (Admin SDK — server-side, from the service account JSON in "Set up Firebase" step d)
FIREBASE_ADMIN_PROJECT_ID=your_project_id
FIREBASE_ADMIN_CLIENT_EMAIL=your_service_account@your_project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour_key_here\n-----END PRIVATE KEY-----\n"

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijkl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_sb_publishable_key
SUPABASE_SECRET_KEY=your_sb_secret_key
```

No quotes around values, no spaces around `=`
	**except** `FIREBASE_ADMIN_PRIVATE_KEY`, which does need to be wrapped in quotes since the key spans multiple lines represented as literal `\n` sequences; `lib/firebaseAdmin.ts` un-escapes them (`.replace(/\\n/g, "\n")`) before passing the key to the Admin SDK.
	Restart the dev server after creating or editing this file.

When deploying, enter these same variables in your host's environment variable settings instead of uploading `.env.local`.

### 5. Configure allowed image domains

In `next.config.js`, add your Supabase project hostname to allow Next.js to load images from Supabase Storage:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
	images: {
		remotePatterns: [
			{
				protocol: 'https',
				hostname: 'abcdefghijkl.supabase.co',
				pathname: '/storage/v1/object/public/**',
			},
		],
	},
};

module.exports = nextConfig;
```

Replace `abcdefghijkl` with your actual Supabase project ID.

Note: the lab image in `app/lab/page.tsx` renders via `next/image` with the `unoptimized` prop set, which skips Next's image optimizer (and the domain allowlist it enforces) entirely, falling back to a plain `<img>`.
	Since that's the only `next/image` usage in the app, this `remotePatterns` config isn't currently doing anything for it — it'd only start mattering if `unoptimized` were removed, or another `next/image` usage without it were added elsewhere.

### 6. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. You will be redirected to `/login` until you create an account.

### 7. Seed the database

On first run the Supabase table is empty, so the app falls back to the defaults in `lib/hazards.ts`. To populate the database:

1. Log in and navigate to `/lab`
2. Type `H Z E D I T` to enter edit mode
3. Without changing anything, click **Save Changes**

The default hotspot data will be written to Supabase and loaded on every subsequent visit.

### 8. Build for production

```bash
npm run build
npm start
```

---

## Testing

The project uses **Vitest** for unit and integration tests, with **React Testing Library** for rendering hooks/components and **MSW (Mock Service Worker)** for mocking API routes — no real Supabase calls are made during tests.

### Running tests

```bash
npm test			# runs all tests once and exits — used by Continuous Integration (CI)
npm run test:watch	# reruns automatically as files change — used during local dev
```

### What's covered

- **Unit tests** — pure helper functions with no network/DOM dependency (e.g. `clamp`, `generateType`, `buildDefaultHotspots`, `addHotspot` in `hooks/useHazards.ts`; `mapSection`, `mergeRow` in `hooks/useModules.ts`)
- **Integration tests** — hooks/components interacting with mocked API routes (e.g. `useHazards` loading, saving, and uploading via mocked `/api/load-hazards`, `/api/load-image`, `/api/save-hazards`, `/api/upload-image`; `useModules`/`useModuleById` loading via mocked `/api/load-modules`)

Test files live alongside the code they cover, using a `.test.ts` / `.test.tsx` suffix (e.g. `hooks/useHazards.ts` → `hooks/useHazards.test.ts`). Vitest picks these up automatically.

### Path aliases in test files

`tsconfig.json` excludes `**/*.test.ts` / `**/*.test.tsx` / `mocks/**/*` so Next's typecheck stays scoped to app code. `vite-tsconfig-paths` (used by `vitest.config.mts` to resolve `@/*` imports) respects that same exclude list — so without a workaround, `@/`-style imports inside test files fail to resolve even though the app itself builds fine.

`tsconfig.vitest.json` exists to fix this: it extends `tsconfig.json` but drops the excludes, and `vitest.config.mts` points `vite-tsconfig-paths` at it via `projects: ['./tsconfig.vitest.json']`. `tsconfig.json` itself is untouched, so Next/Vercel's build scope is unaffected.

### Mock API conventions

`mocks/handlers.ts` defines the default MSW response for every `/api/*` route. **Defaults represent the happy path** — a successful response with realistic data, matching the actual shape returned by the corresponding file in `app/api/*/route.ts`.
Any test covering a different scenario (empty data, a server-reported error, a network failure) overrides the relevant handler locally with `server.use(...)`, rather than changing the shared default.

When adding a new API route:
1. Add its happy-path response to `mocks/handlers.ts`
2. Add at least one test exercising the happy path, and one covering its failure/edge case, using `server.use(...)` to override.

### Continuous Integration (CI)

A GitHub Actions workflow (`.github/workflows/test.yml`, at the repo root — not inside `next-app/`) runs the full test suite automatically on every push and pull request. Since `package.json` lives inside `next-app/`, the workflow sets `working-directory: next-app` so `npm install`/`npm test` run from the correct folder. Pull requests targeting `main` should show a passing check before merging.

---

## Adding a New Page

1. Create a new folder under `app/` named after the route (e.g. `app/modules/`)
2. Copy `template/page.tsx` into it
3. Update the `active` class on the correct nav link in `Navbar.tsx`
4. Replace the placeholder content with your page content

This is for a standalone page unrelated to the modules template below. If your new page is a listing+reader pair of the same shape as Hazard Modules, use the process in the next section instead.

---

## Adding a New Section to `app/modules/`

`app/modules/` holds every section built on the shared listing+reader template (currently Hazard Modules). To add another one:

1. Create a data file in `lib/` — e.g. `lib/scenarios.ts` — with an array typed `ModuleData[]` (import `ModuleData` from `lib/moduleTypes.ts`). This array is what's shown before Supabase loads and the fallback if it fails — see `useModules`/`useModuleById` in step 2 below:
   ```ts
   import { ModuleData } from './moduleTypes';

   export const scenarios: ModuleData[] = [ /* ... */ ];
   ```
2. Seed a matching set of rows in the `modules`/`module_sections` Supabase tables with `section = 'scenarios'` (see "Set up Supabase" above).
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

The `guides` section (`lib/guides.ts`, `app/modules/guides/`) is a working, unlinked example of a section built on the shared template — but it hasn't been migrated to Supabase yet, so it's still on the older static-only pattern (no `useModules` call, data comes straight from `lib/guides.ts`).
	Treat it as a reference for the overall section shape (data file + listing/reader wrappers), not for the live-loading pattern — follow `hazard-modules` for that instead.

`badgeNum` (small numbered badge on the card/hero) and `slug` (stable id exposed as a `data-slug` attribute) are both optional on `ModuleData` — omit either if a section doesn't need it, as `guides` does for both.

---

## Edit Mode

Hotspot positions and text are stored in Supabase and can be edited directly in the browser via a hidden edit mode. Edit mode is invisible to regular users — no button or link exposes it.

**To enter edit mode:** navigate to `/lab` and type `H Z E D I T` (one letter at a time, each within 2 seconds of the last, no modifier keys). A yellow banner will appear confirming edit mode is active. Type the same sequence again to exit.

Note: this keystroke sequence is the *only* barrier to editing — `/api/save-hazards` and `/api/upload-image`, the two routes it eventually calls, have no server-side auth check of their own (see "Server-side auth guards" above).
	The hidden entry point keeps casual visitors from finding the UI; it doesn't stop a direct API request from anyone who knows (or guesses) the endpoints.

**In edit mode:**

### Hotspots
- Hotspots turn blue — drag them to reposition
- Click a hotspot on the image, or select one from the list, to edit its title and description
- Position values update automatically as you drag, or can be typed directly
- Click **+** in the hotspot list header to add a new hotspot — it appears at the centre of the image and is auto-selected for editing
- Click **✕** next to a hotspot in the list to delete it
- Click **Save Changes** to write all hotspot changes to Supabase — changes persist everywhere immediately
	`/api/save-hazards` doesn't do a targeted update — it deletes every row in the `hazards` table, then re-inserts one row per current hotspot (in on-screen order, as the new `sort_order`).
	A save is a full replace, not a diff; if the request fails partway through the delete-then-insert, the table could in principle be left empty rather than reverted to its prior state.
- Click **Reset to Defaults** to revert hotspots to the values in `lib/hazards.ts` (does not affect the lab image)

### Lab image
- Click **Change Lab Image** to upload a replacement image — it is saved to Supabase Storage immediately and loads on every subsequent visit
- The original `public/lab.jpg` is used as a fallback if no image has been uploaded to Supabase
- Changing the lab image is independent of the hotspot save/reset flow — it takes effect immediately on upload and is not affected by **Reset to Defaults**

---

## Modules

`app/modules/` is a directory holding every section built on a shared listing+reader template — it isn't a page itself (there's no `page.tsx` directly under `app/modules/`). Currently there are two sections:

- **Hazard Modules** (`/modules/hazard-modules`) — the hydrogen hazards content, defined in `lib/hazardModules.ts`. Linked from the Navbar and the dashboard's Modules stat card.
- **Guides** (`/modules/guides`) — an example second section demonstrating the pattern, defined in `lib/guides.ts`. Not currently linked from navigation.

The shared template lives in `app/modules/components/`:
- `ModuleListingPage.tsx` — filter bar, grid, auth redirect
- `ModuleReaderPage.tsx` — breadcrumb, hero, sections, key takeaway, prev/next nav, and now the progress UI described in "Module Progress Tracking" below
- `HazardModuleCard.tsx` — card shown in the listing page.
	Named for the hazard-modules section (its original home), but `ModuleListingPage` imports it directly and uses it for every section, `guides` included — there's no generic/section-specific split despite the name.
- `SectionBlock.tsx` — renders a single numbered section.
	Body text is split on blank lines into paragraphs and rendered via `dangerouslySetInnerHTML`, so section `body` content can include inline HTML (e.g. `<strong>`), not just plain text.

Shared types (`ModuleData`, `ModuleSection`, `ModuleStatus`) and a generic `getModuleById(items, id)` lookup helper live in `lib/moduleTypes.ts`.
	Each section's data file wraps that helper with its own name (`getHazardModuleById`, `getGuideById`) rather than exposing the generic one directly to pages.

Module content lives in Supabase (see "Set up Supabase" above), loaded per-section through `hooks/useModules.ts`:

- **`useModules(section, defaults)`** — fetches `GET /api/load-modules?section=...`, merges each returned row over the matching entry (by `id`) in `defaults`, and returns `{ modules, loadStatus }`.
	A successful, non-empty response is authoritative for whatever it contains - Any missing modules from the fallback version are considered purposefully deleted.
	`defaults` is only used wholesale as a fallback when the fetch fails entirely or the section hasn't been seeded yet (empty response).
- **`useModuleById(section, defaults, id)`** — the same, narrowed to a single module by id;
	This is what reader pages use in place of a section's static `getXById` helper, since the lookup now has to react to data that arrives after the initial render.
- **`mergeRow`/`mapSection`** (exported from `useModules.ts`) do the field-name translation between Supabase's snake_case row shape (`badge_num`, `icon_bg`, …) and the app's camelCase `ModuleData`/`ModuleSection` shape that every component already expects.
- `status`/`progress` always come from `defaults`, never from Supabase (see the note on the `modules` table above).
	`slug` is treated differently from `badgeNum`: a `null` slug in Supabase is passed through as `undefined` rather than backfilled from `defaults`, since `slug` is a candidate for use in routing later and a stale slug silently standing in for a missing one would be a broken/misleading link — `badgeNum` is purely cosmetic (a hotspot number's position in the list), so it's fine to backfill from `defaults` when Supabase hasn't got one.

Each section's data file (e.g. `lib/hazardModules.ts`) still exports its static `ModuleData[]` array — now serving as the `defaults` passed into `useModules`/`useModuleById`, i.e. what's shown before the Supabase fetch resolves, and the fallback if it fails.
	Section-specific lookup wrappers like `getHazardModuleById` are no longer called by the reader pages (which now use `useModuleById` instead) — they're currently unused but left in place pending a decision on whether to remove them, adapt them to take an array parameter, or leave them for other non-hook use cases.

There's currently no in-app edit mode for module content (unlike the lab's hidden hotspot editor) — changing what's in Supabase means editing rows directly via the Supabase dashboard or SQL Editor. Changing `lib/hazardModules.ts` itself still requires a redeployment, same as before, but its role has narrowed to "starting/fallback content" rather than "the content."

Each lab hotspot popup includes a **Learn More** button that links to `/modules/{moduleSection}/{moduleId}`. See "Linking Hotspots to Modules" below for how that mapping is stored and loaded.

---

## Module Progress Tracking

Unlike the listing page's `status`/`progress` badges (always drawn from `defaults`, never Supabase — see above), the reader page now tracks live, per-user progress via `useModuleProgress` (`app/modules/hooks/useModuleProgress.ts`), consumed by `ModuleReaderPage.tsx`.
	The two are independent: a card can still show "Not Started" from bundled `defaults` while the signed-in user's own reader-page progress is genuinely in progress or complete.

Note: `/api/load-modules`'s own code comment says status/progress "belong to the separate per-user progress-tracking table and aren't wired up yet" — that table (`user_module_progress`) exists and is fully wired up, documented below;

`/api/modules/progress` (`requireUser`-gated) backs the hook:
- **`POST`** — body `{ module_id }`. If a `(uid, section, module_id)` row doesn't already exist, creates one with `status: "progress"`, `progress: 0`, `attempts: 1`, `started_at`/`last_accessed` set to now. If one exists, it's a no-op (`{ ok: true, message: "Progress already exists" }`) — it never resets an existing row.
- **`GET`** — returns every progress row for the caller (`{ ok, progress: ModuleProgress[] }`); the hook finds the one matching the current `moduleId`.
- **`PATCH`** — body `{ module_id, progress?, status?, quiz_score?, attempts?, time_spent?, action? }`, all optional except `module_id`. Setting `progress` also auto-derives `status` (`>= 100` → `"done"` + stamps `completed_at`; `> 0` → `"progress"`) unless `status` is passed explicitly, in which case that wins and setting it to `"done"` directly forces `progress` to `100` too.
	`action: "restart"` ignores every other field, looks the row up first (404s if it doesn't exist), and resets it: `progress: 0`, `status: "progress"`, `completed_at: null`, `time_spent: 0`, `attempts` incremented, `started_at`/`last_accessed` refreshed.
	`useModuleProgress` itself only ever sends `progress`/`time_spent` (or `action: "restart"`) — it never touches `status`, `attempts`, or `quiz_score` directly, even though the route accepts all of them.

**Bug: every progress row is hardcoded to `section: "hazard-modules"` on creation**, regardless of which section the module actually belongs to (`POST`'s insert doesn't take `section` from the request or infer it from the module).
	The `user_module_progress` table's real uniqueness constraint is on `(uid, section, module_id)` — per-section, which is presumably *why* `guides` gets working progress tracking at all (same `ModuleReaderPage`/hook, different section).
	But since the route always writes `"hazard-modules"`, a `guides` module and a `hazard-modules` module that happen to share an `id` (e.g. both `"1"`) would collide on the same row — the schema supports per-section rows, the route doesn't actually produce them.
	The `section` column's own SQL default (`'hazard_modules'`, underscore) doesn't match either — moot in practice since the route always sets it explicitly, but worth knowing if anything ever relies on the column default.

**`quiz_score`** is a real, nullable column on `user_module_progress` (0–100, separate from the `user_quiz_progress` table used by the standalone hazards quiz) and the `PATCH` route accepts it — but nothing in the frontend (`useModuleProgress`, `ModuleReaderPage`, `SectionBlock`) ever sends it. Looks like scaffolding for a since-descoped or not-yet-built per-module quiz feature.

**How progress is derived:** each section in `ModuleReaderPage` is wrapped in a `div` with `data-module-section` and `data-section-number`.
	An `IntersectionObserver` (10% visibility threshold) watches these and, the first time a new-highest section scrolls into view, computes `progress = round(highestSectionReached / sectionCount * 100)` (capped at 99% until the last section is reached, which sets 100%).
	Progress is **monotonic** on the client — a save never lowers `lastSavedProgress`, so reopening a completed module doesn't regress its percentage. (The route itself doesn't enforce this — a direct `PATCH` with a lower `progress` value would be accepted and would lower the stored value; the monotonic guarantee is a client-side convention, not a database one.)

**Time spent** is tracked alongside progress: a session timer starts on load and accumulates into `time_spent` (minutes), saved:
- every 15 seconds while the tab is open (`setInterval`),
- immediately when the tab becomes hidden or the page is unloading (`visibilitychange` / `pagehide`, using `fetch(..., { keepalive: true })` so the request survives navigation),
- and again on unmount.

Saves are queued rather than dropped if one is already in flight — a save request that arrives mid-save is merged into a pending request and re-fired once the current one finishes.

**Reader UI driven by this hook:**
- A progress bar + percentage, shown once `progressLoaded` and `currentProgress > 0`.
- A **"Continue from saved progress"** button (shown while `0 < currentProgress < 100`) that scrolls to the section matching the saved percentage.
- A **"Module completed"** banner with a **Restart Module** button once `currentProgress >= 100` — restart asks for confirmation (`window.confirm`), then `PATCH`es with `{ module_id, action: "restart" }` and resets local progress back to 0.

This applies to every section built on the shared template, including the unlinked `guides` example — `ModuleReaderPage` doesn't distinguish between sections, so `guides` gets live progress tracking too, even though its listing page has no live `useModules` call.

---

## Admin: Access Management

`/admin/users` (`app/admin/users/page.tsx`) is an admin-only page for managing user accounts and reviewing training progress. Unlike every other protected page, it doesn't just check for a logged-in user — see the `isAdmin` note under "Pages" above.

**Data loading:** on mount, it fetches `GET /api/admin/users` (`requireAdmin`-gated).
	This single call already returns everything the stat cards need — `{ ok, users: Profile[], statistics: { totalUsers, administrators, learners, trainingCompleted, averageProgress, totalModules } }` — computed server-side from the `user_module_progress` table, using `hazardModules.length` (currently 5) as `totalModules` and counting a module "complete" once its `progress >= 100`.

**The page doesn't use `data.statistics` at all.** Instead, for every user whose `role !== "admin"` and `user_type === "public"`, it separately fetches `GET /api/admin/users/{uid}/progress` (also `requireAdmin`-gated) and recomputes the same two numbers itself from the responses:
- N+1 requests where one would do — the exact `statistics` object it needs is sitting unused in the first response.
- The two computations don't even use the same completion rule.
	The list route counts `progress >= 100` only; the per-user route (below) also accepts `status === "done"` as completion, and hardcodes `totalModules` to the literal `5` rather than `hazardModules.length` — so the two are usually equivalent today, but would silently diverge if a module's `status` and `progress` ever disagreed, or if a 6th hazard module were added (the list route would pick it up automatically via `hazardModules.length`; the per-user route wouldn't, until someone updates its hardcoded `5`).
- The two routes also compute "overall progress" differently in kind, not just in source: the list route averages each module's own `progress` percentage (partial credit for a half-finished module); the per-user route (below) computes `completedModules / totalModules * 100` (no credit until a module hits 100).
	Since the page only ever uses the per-user route's numbers, "Average Progress" on the stat card is the coarser, all-or-nothing version — a user with five modules all at 80% shows 0%, not 80%.

**Stat cards** — **Users** (`users.length`), **Administrators** (`role === "admin"` count), **Training Completed**/**Average Progress** (from the redundant per-user fetches above, not from `data.statistics`).

**Search:** a single client-side text filter across `email`, `display_name`, `organisation`, `role`, and `user_type` — no server-side query, so it only filters the already-loaded list.

**Editing a user:** the **Edit** button on each row opens `EditUserModal.tsx`, which edits `role`, `user_type`, and `organisation` (email shown read-only) and saves via `PATCH /api/admin/users/{uid}` (`requireAdmin`-gated) with `{ role, user_type, organisation }`, passed straight through to a Supabase `update` with no server-side validation of the values — see the `user_type` mismatch under "Roles and permissions" above, which is exactly this endpoint's blind spot.

**Viewing a user's module progress:** the **Progress** button on each row links to `/admin/users/{uid}/progress`, a read-only training-record view for a single user, backed by `GET /api/admin/users/{uid}/progress` (`requireAdmin`-gated — see below for what that resolves).

- **The page's own client-side gate only checks `useAuth()`'s `user`, not `isAdmin`** — weaker than `/admin/users` itself.
	In practice this is a shell-only gap: `GET /api/admin/users/{uid}/progress` does enforce `requireAdmin` server-side, so a non-admin who navigates here directly gets the page's static UI but every data fetch comes back `403`.
	Worth tightening for consistency with the parent page regardless, since relying on "the API happens to reject it" is a thinner guarantee than gating the page itself.
- **Module data is static here, not live** — unlike the student-facing reader (`useModuleById`, live from Supabase), this page maps over the bundled `hazardModules` array directly and merges each with the matching `moduleProgress` record (by `module_id`).
	A module that exists only in Supabase wouldn't appear here, even though it'd show up for students.
- **`ModuleProgress`** — one row per module the user has touched, straight from `user_module_progress`: `uid`, `module_id`, `status`, `progress`, `quiz_score`, `attempts`, `time_spent`, `started_at`, `last_accessed`, `completed_at`.
- **`QuizProgress`** — one row per quiz, from `user_quiz_progress`: `uid`, `quiz_id`, `score`, `attempts`, `passed`, `last_attempted_at`. This page's Quiz panel only ever reads `quizProgress[0]`; there's only one quiz today (see "Quizzes & Certificate" below), even though the schema (`quiz_id` as part of a composite key) supports more.
- **Certificate eligibility** is shown as "Eligible"/"Pending" based on `summary.completedModules >= summary.totalModules` — finishing all modules. This has nothing to do with how `/certificate` itself decides whether to show a certificate (see "Quizzes & Certificate" below): the real page gates on a passed **quiz** result read from `localStorage`, not module completion from Supabase.
	The two can disagree in either direction, and on top of that, per-device: someone who's finished every module but never passed the quiz shows "Eligible" here while still seeing "No certificate yet" on the real page — and someone who passed the quiz on one browser sees the opposite split on a different one.
- Each module is rendered via `AdminModuleCard.tsx` (imported under the local alias `ModuleCard`) with `mode="admin"` and `adminProgress={module.adminProgress}` — matching the props documented under "Modules" above.

---

## Quizzes & Certificate

### Quizzes hub (`/quizzes`)

A grid of quiz cards (`app/quizzes/page.tsx`, styled by `quizzes.css`) — currently just one, for the Hazards quiz, built from `QUIZ_TITLE`/`QUIZ_SLUG`/`questionhazards.length` in `lib/questionhazards.ts`.

### Taking a quiz (`/quizzes/hazards`)

`app/quizzes/hazards/page.tsx` (there's currently only this one nested route under `quizzes/`, matching `QUIZ_SLUG`):

- **Randomisation:** both question order and each question's option order are shuffled (Fisher–Yates) on load and on retry, with `correctIndex` remapped to follow its option.
- **Answering:** all questions must be answered before submitting (`answers.some(a => a === null)` blocks submit with an inline error).
- **Scoring:** `percentage = round(correctCount / quiz.length * 100)`; `passed = percentage >= PASS_THRESHOLD` (from `lib/questionhazards.ts`).
- **Submitting** POSTs `{ score: percentage, passed }` to `/api/quizzes/progress` (`requireUser`-gated) with a Firebase bearer token.
	The route hardcodes `quiz_id: "hydrogen-hazards"` server-side — a different string from `QUIZ_SLUG` (`"hazards"`, used for the URL) — and `upsert`s onto `(uid, quiz_id)`: `attempts` increments from whatever was already stored, but `score`/`passed` are simply overwritten with the latest submission.
	There's no history and no "best attempt" logic — passing, then later retrying and failing, replaces the stored `passed: true` with `false`.
- **After submitting:** each question re-renders showing correct/incorrect/your-answer state and an explanation for anything missed. A **Retry Quiz** button (on fail) reshuffles and resets everything, incrementing an `attempt` counter shown as "Attempt #N" — this is client-side only and isn't itself sent anywhere; only the eventual `handleSubmit` call reaches the server.
- **On pass**, a **"Get Your Certificate"** button does *not* rely on the server-recorded result — see below.

### Certificate gating is client-side and separate from the server record

On a passing submit, `handleContinue` writes a record directly to `localStorage` (key `hydrogenlabsafety_quiz_hazards_${uid}`, containing `{ passed: true, score, date }`) and routes to `/certificate`.
	`app/certificate/page.tsx` reads *only* this `localStorage` key to decide what to show — it never calls `/api/quizzes/progress` or any other endpoint. This means:
- The `user_quiz_progress` row and the `localStorage` record are two independent, only-loosely-related copies of "did this user pass" — nothing keeps them in sync, and the server-side one can itself regress on a failed retry while the `localStorage` one, once set, never does.
- A user who passes on one browser/device won't see their certificate on another (or after clearing site data), even though their `user_quiz_progress` row would still show a pass (unless a later failed retry overwrote it).
- This is also why the admin-side "Certificate eligibility" indicator (module completion, see "Admin: Access Management" above) can't agree with what the user actually sees at `/certificate` (quiz pass) — they're not just different data, they're different criteria entirely.

**Blocked state:** if there's no passing record, `/certificate` shows a "No certificate yet" panel with a link back to the quiz. Its copy hardcodes **"70% or higher"** as prose text, separately from `PASS_THRESHOLD` used by the quiz page itself — if `PASS_THRESHOLD` ever changes, this string won't update with it.

**The certificate itself** is drawn client-side onto an HTML `<canvas>` (`drawCertificate()` in `app/certificate/page.tsx`) — title, "Certificate of Achievement", the learner's Firebase `displayName` or `email`, `QUIZ_TITLE`, score, and a formatted date — and downloaded as a PNG via `canvas.toDataURL('image/png')`.
	There's no server-generated file and no PDF; "printable certificate" (per the About page's copy) means printing this downloaded PNG yourself, not an in-app print/PDF flow.

---

## Customising Default Hotspot Data

The file `lib/hazards.ts` defines the default hotspot positions and text used as a fallback when Supabase is unavailable or the table is empty. Edit the `hotspots` array to change default positions, and the `hazardData` record to change default titles and descriptions.

To add a new hazard type, add a new entry to both `hotspots` and `hazardData`, add the new key to the `HazardType` union at the top of the file, and add a corresponding module entry to `lib/modules.ts`. Then save to Supabase via edit mode.

---

## Linking Hotspots to Modules

Each hazard's `HazardInfo` (in `lib/hazards.ts`, and the live Supabase-backed version in `hooks/useHazards.ts`) has two fields that together point at a module:

- `moduleId: string | null`
- `moduleSection: string | null`

`HazardPopup.tsx` builds the **Learn More** link as `/modules/${moduleSection}/${moduleId}`, and only renders the button when both are non-null.

**Where the values come from:** the `hazards` table's `module_section`/`module_id` columns are genuinely live from Supabase — treated the same as `title`/`text`.
	`useHazards.ts` only falls back to the full set of local defaults (including their module links) if the `/api/load-hazards` fetch fails outright or the table is empty;
	A successful, non-empty load is authoritative for `moduleId`/`moduleSection` even where they're `null`.
	`lib/hazards.ts` itself still hardcodes a `moduleId`/`moduleSection` per hazard type — this is the pre-Supabase fallback data, in the same role as the rest of that file's defaults.

**Both-or-neither:** the two columns form a matched pair enforced at the database level — the `hazards_module_fk` foreign key uses `match full`, so a row can have both `null` or both set to a valid `(section, id)` on `modules`, never just one.
	`addHotspot()` in `useHazards.ts` seeds new hotspots with both `null` accordingly.
	Deleting the linked module (`on delete set null`) doesn't delete the hazard — it just resets both columns to `null`, so the "Learn More" button disappears rather than pointing at a dead link.

**Setting a link:** there's currently no in-app UI for setting or changing a hotspot's linked module — `HotspotEditor.tsx` only edits title, description, and position.
	Linking a hotspot to a module means setting `module_section`/`module_id` directly via the Supabase dashboard or SQL Editor, the same way module content itself is currently edited (see "Customising Module Content" below).

---

## Customising Module Content

Live hazard module content lives in Supabase, in the `modules`/`module_sections` tables under `section = 'hazard-modules'` (see "Set up Supabase" above) — edit rows there directly via the Supabase dashboard or SQL Editor to change what's shown.
	`lib/hazardModules.ts` supplies the bundled `ModuleData[]` array used as `defaults`: what's shown before the Supabase fetch resolves, and the fallback if it fails or the section is empty (see "Modules" above for how `hooks/useModules.ts` merges the two).

Each entry — whether in `lib/hazardModules.ts` or a `modules`/`module_sections` row — maps onto the shared `ModuleData` shape (defined in `lib/moduleTypes.ts`):

- `id` — numeric string matching the URL segment (e.g. `'1'`) — this is the stable, permanent key; routes are built from it, not `slug`
- `slug` — optional stable identifier (e.g. `'gas-leak-detection'`); not currently used for routing, exposed as a `data-slug` attribute on the card and reader for things like analytics or test selectors. A `null` `slug` column in Supabase is **not** backfilled from `lib/hazardModules.ts` — it comes through as genuinely missing, since it's a candidate for future routing use where a stale stand-in slug would be a real (if quiet) bug rather than a cosmetic one
- `badgeNum` — optional numbered badge shown on the card and reader hero (the hazard number, for this section); a section can omit it entirely if it doesn't need a badge — see `lib/guides.ts`. Unlike `slug`, a `null` `badge_num` in Supabase **is** backfilled from the matching entry in `lib/hazardModules.ts`, since it's purely cosmetic/positional
- `title`, `icon`, `iconBg`, `description` — used by the listing card
- `status`, `progress` — used by the listing card, but **not** stored in Supabase at all; always drawn from `lib/hazardModules.ts`, pending a separate per-user progress-tracking table
- `sections` — array of `{ num, heading, body, listType?, items?, callout? }` objects; in Supabase this is the `module_sections` table (one row per section, foreign-keyed to its parent `modules` row, deleted automatically via `on delete cascade` if the module is deleted)
- `keyTakeaway` — displayed at the bottom of the reader
- `prevId` / `nextId` — optional; controls the previous/next navigation buttons — omit the key entirely (in `lib/hazardModules.ts`) or leave the column `null` (in Supabase) for the first module's `prevId` and the last module's `nextId`, rather than setting it to an empty string

Changes to `lib/hazardModules.ts` still require a redeployment to take effect, same as before — but since it's now the fallback rather than the live source, most day-to-day content edits happen in Supabase instead and take effect immediately, without a deploy.

To add a whole new section rather than another hazard module, see "Adding a New Section to `app/modules/`" above.

---

## Customising the Dashboard

Training progress, module statuses, stat card counts, and certificate details are currently hardcoded in `app/page.tsx`. Replace these with data fetched from an API or database to make the dashboard dynamic.

---

## CSS Structure

Styles are split across three files to keep page-specific rules isolated:

| File								| Scope																						                                          |
|-----------------------------------|-------------------------------------------------------------------------------------------------------------------------------------|
| `app/globals.css`					| Reset, design tokens, nav, `.panel`, animations, and dashboard styles                                                               |
| `app/lab/lab.css`					| Lab page only — hotspots, popup, edit mode, editor panels, save bar                                                                 |
| `app/modules/modules.css`			| Shared by every page under `app/modules/` — page header, cards, filter bar, section blocks, takeaway box, prev/next nav             |
| `app/login/auth.css`				| Login and register pages — card, form inputs, error box                                                                             |
| `app/intro/intro.css`				| Intro page only — hero, quick facts, content sections, CTA                                                                          |
| `app/about/about.css`				| About page only — header, section cards, info/feature/tech grids, footer                                                            |
| `app/admin/users/admin.css`		| Admin users page only — user table, role/user-type badges, edit modal, stat cards, admin module-card info block, admin modules grid |
| `app/quizzes/quizzes.css`			| Quizzes hub and attempt pages — quiz cards, question/option list, result banner                                                     |
| `app/certificate/certificate.css`	| Certificate page only — name input, canvas, action buttons, blocked state                                                           |

`globals.css` is imported once in `layout.tsx` and applies everywhere. The rest are imported directly by the pages/components that need them.

Note: `app/login/forgot-password/page.tsx` visually matches `auth.css`'s login/register look (same card, logo, form, button styling) but doesn't import the file — it defines an equivalent `styles` object inline and applies it via the `style` prop instead of `className`.
	The two are currently kept in sync by hand; a change to `auth.css` won't affect this page, and vice versa.

**Tailwind CSS v4** is a dependency and is wired up via `postcss.config.mjs` (`@tailwindcss/postcss`), but the app's own styling uses plain, hand-written CSS with custom class names and CSS custom properties (design tokens like `--teal`, `--navy` in `:root`) instead
	`globals.css` has no `@import "tailwindcss";` or other Tailwind directive, so Tailwind is currently installed and configured but not actually pulled into the stylesheet.
	`lab.css`, `modules.css`, `auth.css`, and `intro.css` follow the same hand-written approach.

---

## Fonts

The app uses **Exo 2** and **Inter** from Google Fonts, imported in `layout.tsx`. To self-host the fonts instead (recommended for performance), replace the `<link>` tag with `next/font/google`:

```tsx
import { Exo_2, Inter } from 'next/font/google';
```

See the [Next.js font documentation](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) for setup details.

---

## Environment Variables

| Variable					 					| Description							 														|
|-----------------------------------------------|-----------------------------------------------------------------------------------------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` 				| Firebase API key — safe for browser use 														|
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` 			| Firebase auth domain 																			|
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` 			| Firebase project ID 																			|
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` 		| Firebase storage bucket 																		|
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` 	| Firebase messaging sender ID 																	|
| `NEXT_PUBLIC_FIREBASE_APP_ID` 				| Firebase app ID 																				|
| `FIREBASE_ADMIN_PROJECT_ID`					| Firebase Admin SDK service account project ID — server-side only								|
| `FIREBASE_ADMIN_CLIENT_EMAIL`					| Firebase Admin SDK service account client email — server-side only							|
| `FIREBASE_ADMIN_PRIVATE_KEY`					| Firebase Admin SDK service account private key — server-side only, newlines as literal `\n`	|
| `NEXT_PUBLIC_SUPABASE_URL` 					| Supabase project URL 																			|
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` 				| Supabase `sb_publishable` key — safe for browser use 											|
| `SUPABASE_SECRET_KEY` 						| Supabase `sb_secret` key — server-side only, never exposed to browser							|

All `NEXT_PUBLIC_` variables are embedded in the client bundle at build time.
	`SUPABASE_SECRET_KEY` and the three `FIREBASE_ADMIN_*` variables are used only in server-side code (API routes and `lib/firebaseAdmin.ts`) and are never sent to the browser.