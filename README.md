[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/JCT9HXj3)

Project Brief: Hydrogen is a critical energy carrier as the world prepares to transition to sustainable green energy systems.
	However, hydrogen is very different from the traditionally used fuels (diesel, petrol) and power systems where electrons are the energy carriers.
	This necessitates tools to educate and increased general awareness to ensure public safety both for users and non-users.

The project focuses on the development of virtual solutions for delivering hydrogen safety training to science and engineering undergraduate and postgraduate students.

The as-developed tool should be able to educate a non-expert about:
i. Identifying risks linked to having hydrogen in a closed space or work environment,
ii. Critical or key aspects to look for when ensuring safety of self and co-workers/others, and
iii. Action-steps to ensure safety upon identification of a risk.

The tools, preferably interactive, would mimic simulated laboratory and/or industry environment.
	The tools should be designed to also be suitable for non-science industry employees looking to upgrade-skills or for increasing awareness and safe-behaviour in hydrogen-spaces.

The purpose of the tool is to take a non-expert/beginner to an intermediate stage to ensure readiness to work/navigate safely in a real hydrogen-related workspace by increasing hydrogen awareness.

Client:
A/Prof Surbhi Sharma (surbhi.sharma@federation.edu.au)

Project Supervisors:
A/Prof Surbhi Sharma (surbhi.sharma@federation.edu.au)
Prof Bhavna Antony

# Hydrogen Lab Safety – Next.js

A **Next.js 14 App Router** application with TypeScript for hydrogen technology training.
	Features an interactive lab safety simulation, informative modules, a randomised quiz, administrative progress tracking and a dashboard tracking these modules, scenarios, and quizzes.

This README covers project structure and getting the app running.
	Known bugs and inconsistencies are tracked in [`BUG_REPORT.md`](./BUG_REPORT.md);
	Deeper explanations of how individual features work are in [`ADDITIONAL_INFO.md`](./ADDITIONAL_INFO.md);
	How to change or update the app's content (hotspots, module content, lab image) is in [`EDITING_GUIDE.md`](./EDITING_GUIDE.md).

---

## Project Structure

> **Note:** this `next-app/` folder is a subfolder of the overall Git repository, not the repo root.
	The GitHub Actions Continuous Integration workflow (`.github/workflows/test.yml`) lives one level up, at the true repo root, alongside `next-app/` — not inside it — since GitHub only looks for workflow files at the repository root.

```
hydrogen-lab/
├── app/
│   ├── globals.css						# Shared styles — reset, tokens, nav, panel, animations
│   ├── layout.tsx						# Root layout — renders Navbar and wraps all pages
│   ├── page.tsx              			# Public landing/intro page (/) — root, no login required
│   ├── intro.css						# Landing-page-specific styles
│   ├── dashboard/
│   │   ├── page.tsx					# Dashboard (/dashboard) — static placeholder data, see BUG_REPORT
│   │   └── dashboard.css				# Dashboard-specific styles
│   ├── about/
│   │   ├── page.tsx					# Public "About" page (/about) — no login required
│   │   └── about.css					# About-page-specific styles
│   ├── template/
│   │   └── page.tsx					# Template for creating new pages (not in navigation)
│   ├── login/
│   │   ├── auth.css					# Shared styles for login and register pages
│   │   ├── page.tsx					# Login page (/login)
│   │   ├── register/
│   │   │   └── page.tsx				# Register page (/login/register)
│   │   └── forgot-password/
│   │       └── page.tsx				# Forgot-password page (/login/forgot-password)
│   ├── admin/
│   │   └── users/
│   │       ├── page.tsx				# Admin "Access Management" page (/admin/users) — user table, search, stat cards, edit modal
│   │       ├── admin.css				# Styles for the admin users page — table, modal, stat cards, admin module cards
│   │       ├── [uid]/
│   │       │   └── progress/
│   │       │       └── page.tsx		# Per-user training record (/admin/users/[uid]/progress) — read-only, admin-facing
│   │       └── components/
│   │           ├── EditUserModal.tsx	# Modal for editing a user's role, user_type, and organisation
│   │           └── AdminModuleCard.tsx	# Read-only per-user module progress card; shares ModuleCard.css with ModuleCard
│   ├── lab/
│   │   ├── page.tsx					# Interactive hydrogen lab (/lab)
│   │   ├── lab.css						# Lab-specific styles
│   │   └── components/
│   │       ├── HotspotEditor.tsx		# Edit panel for hotspot text, position, lab image and linked module
│   │       └── HazardPopup.tsx			# Modal popup for hazard info
│   ├── modules/
│   │   ├── modules.css					# Shared styles for every section under app/modules/
│   │   ├── components/
│   │   │   ├── ModuleListingPage.tsx	# Wrapper for listing page
│   │   │   ├── ModuleReaderPage.tsx	# Wrapper for module page — progress tracking & in-app editing
│   │   │   ├── ModuleEditor.tsx		# Edit panel for a module's fields and sections, rendered by ModuleReaderPage
│   │   │   ├── ModuleCard.tsx			# Card component for each module in the listing page (used generically by every section)
│   │   │   ├── ModuleCard.css			# Styles for ModuleCard, shared with AdminModuleCard (app/admin/users/components/)
│   │   │   └── SectionBlock.tsx		# Renders a single numbered section in a module page — body supports embedded HTML
│   │   ├── hazard-modules/
│   │   │   ├── page.tsx				# Hazard module listing (/modules/hazard-modules)
│   │   │   └── [id]/
│   │   │       └── page.tsx			# Hazard module reader (/modules/hazard-modules/1 … 5)
│   │   └── guides/
│   │       ├── page.tsx				# Example second section (/modules/guides) — template, not linked in nav
│   │       └── [id]/
│   │           └── page.tsx			# Example reader page
│   ├── quizzes/
│   │   ├── quizzes.css					# Shared styles for the quizzes hub and attempt pages
│   │   ├── page.tsx					# Quizzes hub — lists available quizzes (currently just one, Hazards)
│   │   ├── leaderboard/
│   │   │   ├── page.tsx				# Student leaderboard (/quizzes/leaderboard) — top scorers who opted in
│   │   │   └── leaderboard.css			# Leaderboard-specific styles
│   │   └── hazards/
│   │       └── page.tsx				# Hazards quiz attempt page
│   ├── certificate/
│   │   ├── certificate.css				# Styles for the certificate page
│   │   └── page.tsx					# Certificate page — client-side canvas certificate, gated by localStorage
│   └── api/
│       ├── load-hazards/
│       │   └── route.ts				# GET — loads hazard data from Supabase (anon client; public read, no auth guard)
│       ├── save-hazards/
│       │   └── route.ts				# POST — saves hazard data to Supabase (delete-all, then re-insert); no auth guard
│       ├── load-image/
│       │   └── route.ts				# GET — returns lab image URL from Supabase Storage, or `null` if none uploaded yet (public read)
│       ├── upload-image/
│       │   └── route.ts				# POST — uploads lab image to Supabase Storage, always as `lab.jpg` (overwrites); no auth guard
│       ├── load-modules/
│       │   └── route.ts				# GET — loads module content + sections from Supabase for a given section (public read)
│       ├── load-module-options/
│       │   └── route.ts				# GET — flat list across all sections, for the lab editor's Linked Module dropdowns (public read, no lib/ fallback)
│       ├── modules/
│       │   ├── progress/
│       │   │   └── route.ts			# GET/POST/PATCH — per-user module progress (`requireUser`-gated); backs `useModuleProgress` and `useModules`' listing-card progress
│       │   └── save-module/
│       │       └── route.ts			# POST — upserts a module's row and replaces its sections in Supabase (`requireAdmin`-gated); backs the reader-page editor
│       ├── admin/
│       │   └── users/
│       │       ├── route.ts			# GET — all profiles + server-computed statistics (`requireAdmin`-gated)
│       │       └── [uid]/
│       │           ├── route.ts		# PATCH — updates role/user_type/organisation (`requireAdmin`-gated, no value validation)
│       │           └── progress/
│       │               └── route.ts	# GET — one user's module + quiz progress and summary (`requireAdmin`-gated)
│       ├── quizzes/
│       │   ├── progress/
│       │   │   └── route.ts			# GET/POST/PATCH — per-user quiz result + leaderboard opt-in (`requireUser`-gated)
│       │   └── leaderboard/
│       │       └── route.ts			# GET — ranked leaderboard of opted-in scores (`requireUser`-gated)
│       └── profile/
│           ├── get/
│           │   └── route.ts			# GET — loads a user profile by Firebase uid (no auth guard)
│           └── create/
│               └── route.ts			# POST — creates a user profile record if one doesn't already exist for this uid (no auth guard)
├── components/
│   ├── Navbar.tsx						# Reusable navigation bar — hides on auth pages, gates Administration link by permissions
│   ├── EditModeToggle.tsx				# Toggle switch to enter/exit edit mode; expands into the banner text when on.
│   ├── SaveBar.tsx						# Reset and save buttons for an in-app editor;
│   └── editorStyles.ts					# Shared inline style objects (labels, inputs, buttons) used by in-app editors
├── context/
│   └── AuthContext.tsx					# Firebase auth state + user profile/role/permissions — wraps the app via layout.tsx
├── hooks/
│   ├── useHazards.ts					# Custom hook — hotspot state, Supabase load/save, drag, edit-mode toggle, image upload
│   ├── useHazards.test.ts				# Unit + integration tests for useHazards.ts
│   ├── useModules.ts					# Generic hook — loads+merges Supabase module content and live per-user progress, for any app/modules/ section
│   ├── useModules.test.ts				# Unit + integration tests for useModules.ts
│   ├── useModuleOptions.ts				# Hook — flat Supabase (section, id, title, badgeNum) list, grouped per section
│   ├── useModuleOptions.test.ts		# Integration tests for useModuleOptions.ts
│   ├── useModuleProgress.ts			# Per-user progress/time tracking for the reader page
│   ├── useModuleEditor.ts				# Edit-mode/draft/save state for a module reader page's in-app editor
│   └── useModuleEditor.test.ts			# Unit + integration tests for useModuleEditor.ts
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
│   └── hydrogen-lab-bg.svg				# Decorative background graphic used on the landing/intro page
├── .env.local							# Environment variables (not committed to Git)
├── global.d.ts							# `declare module '*.css'` — lets .tsx files import page-specific .css files without a TypeScript error
├── next.config.js						# Active config — sets the allowed Supabase Storage image domain
├── postcss.config.mjs					# Enables Tailwind CSS v4 via the `@tailwindcss/postcss` plugin
├── tsconfig.json
├── tsconfig.vitest.json				# Widened tsconfig (no test-file excludes) so vite-tsconfig-paths can resolve "@/" imports inside test files
├── vitest.config.mts					# Vitest configuration (jsdom, plugins, setup file)
├── vitest.setup.ts						# Global test setup — jest-dom matchers, MSW server lifecycle
└── package.json
```

---

## Pages

| Route                            | File                                       | Description                                                                                 |
|----------------------------------|--------------------------------------------|---------------------------------------------------------------------------------------------|
| `/`                              | `app/page.tsx`                             | Public landing page introducing the platform — no login required                            |
| `/dashboard`                     | `app/dashboard/page.tsx`                   | Dashboard with modules, scenarios, quizzes, and training progress                           |
| `/about`                         | `app/about/page.tsx`                       | Public "About" page — project background, platform features, tech stack; no login required  |
| `/login`                         | `app/login/page.tsx`                       | Email and password login                                                                    |
| `/login/register`                | `app/login/register/page.tsx`              | New account registration                                                                    |
| `/login/forgot-password`         | `app/login/forgot-password/page.tsx`       | Firebase password-reset email request                                                       |
| `/lab`                           | `app/lab/page.tsx`                         | Interactive lab with clickable hazard hotspots                                              |
| `/modules/hazard-modules`        | `app/modules/hazard-modules/page.tsx`      | Hazard module listing grid with status filter bar                                           |
| `/modules/hazard-modules/[id]`   | `app/modules/hazard-modules/[id]/page.tsx` | Hazard module reader — sections, callouts, key takeaway, prev/next nav                      |
| `/modules/guides`                | `app/modules/guides/page.tsx`              | Example second section built on the same template — not linked in nav                       |
| `/modules/guides/[id]`           | `app/modules/guides/[id]/page.tsx`         | Example reader page for the guides section                                                  |
| `/quizzes`                       | `app/quizzes/page.tsx`                     | Quizzes hub — lists the Hazards quiz and links to the Leaderboard                           |
| `/quizzes/hazards`               | `app/quizzes/hazards/page.tsx`             | Hazards quiz attempt — randomised questions/options, scored, saved                          |
| `/quizzes/leaderboard`           | `app/quizzes/leaderboard/page.tsx`         | Student leaderboard — top scorers who opted in, requires login                              |
| `/certificate`                   | `app/certificate/page.tsx`                 | Downloadable certificate — gated server-side on completing all modules and passing the quiz |
| `/admin/users`                   | `app/admin/users/page.tsx`                 | Admin-only "Access Management" page — user table, search, stat cards, edit modal            |
| `/admin/users/[uid]/progress`    | `app/admin/users/[uid]/progress/page.tsx`  | Read-only per-user training record — module progress, quiz score, certificate eligibility   |

There is no page at the bare `/modules` route — `app/modules/` is a code-organization directory, not a page itself, so visiting `/modules` directly returns a 404.
	The Navbar and dashboard both link straight to `/modules/hazard-modules`.

All pages except `/`, `/login`, `/login/register`, `/login/forgot-password`, and `/about` redirect unauthenticated users to `/login`.
	`/admin/users` is a further exception: it checks `isAdmin` specifically and redirects anyone who fails that check to `/dashboard` rather than `/login`.
	See `ADDITIONAL_INFO.md` for the redirect implementation pattern and per-page exceptions in more detail.

---

## Navigation Links

| Page                           | Element                      | Links to                       |
|--------------------------------|------------------------------|--------------------------------|
| *(all pages)*                  | Navbar → Hydrogen Lab Safety | `/`                            |
| *(all pages)*                  | Navbar → Home                | `/dashboard`                   |
| *(all pages)*                  | Navbar → Modules             | `/modules/hazard-modules`      |
| *(all pages)*                  | Navbar → Scenarios           | `/lab`                         |
| *(all pages)*                  | Navbar → Quizzes             | `/quizzes`                     |
| *(all pages)*                  | Navbar → About               | `/about`                       |
| *(all pages)*                  | Navbar → Administration      | `/admin/users`                 |
| *(all pages)*                  | Navbar → Logout              | `/`                            |
| `/`                            | Get Started → || Continue →  | `/dashboard`                   |
| `/`                            | Learn the Basics             | `/modules/hazard-modules`      |
| `/dashboard`                   | "Modules" card               | `/modules/hazard-modules`      |
| `/dashboard`                   | "Scenarios/Simulation" card  | `/lab`                         |
| `/dashboard`                   | "Quizzes" card               | `/quizzes`                     |
| `/dashboard`                   | Download Certificate →       | `/certificate`                 |
| `/modules/hazard-modules`      | 'Module' card                | `/modules/hazard-modules/[id]` |
| `/modules/hazard-modules/[id]` | ← Hazard Modules             | `/modules/hazard-modules`      |
| `/modules/hazard-modules/[id]` | ← Previous                   | `/modules/hazard-modules/[id]` |
| `/modules/hazard-modules/[id]` | Next →                       | `/modules/hazard-modules/[id]` |
| `/lab`                         | Learn More →                 | `/modules/hazard-modules/[id]` |
| `/quizzes`                     | "Hydrogen Hazards Quiz" card | `/quizzes/hazards`             |
| `/quizzes`                     | "Student Leaderboard" card   | `/quizzes/leaderboard`         |
| `/quizzes/hazards`             | Get Your Certificate →       | `/certificate`                 |
| `/quizzes/leaderboard`         | ← Back to Quizzes            | `/quizzes`                     |
| `/quizzes/leaderboard`         | Take Quiz →                  | `/quizzes/hazards`             |
| `/quizzes/leaderboard`         | Login → (logged out)         | `/login`                       |
| `/certificate`                 | Retake Quiz                  | `/quizzes/hazards`             |
| `/admin/users`                 | Progress                     | `/admin/users/[uid]/progress`  |
| `/admin/users/[uid]/progress`  | ← Back to Users              | `/admin/users`                 |
| `/login`                       | Sign in                      | `/dashboard`                   |
| `/login`                       | Forgot Password?             | `/login/forgot-password`       |
| `/login`                       | Create one                   | `/login/register`              |
| `/login/forgot-password`       | ← Back to Login              | `/login`                       |
| `/login/register`              | Create account               | `/dashboard`                   |
| `/login/register`              | Sign in                      | `/login`                       |

Most links come from `Navbar.tsx`, shown on every page except `/login`, `/login/register`, and `/login/forgot-password`.

---

## CSS Structure

Styles are split across several files to keep page-specific rules isolated:

| File                                      | Scope																																	                                             |
|-------------------------------------------|--------------------------------------------------------------------------------------------------------------------|
| `app/globals.css`                         | Reset, design tokens, nav, panel/field-layout helpers, animations, edit-mode toggle and save bar                   |
| `app/intro.css`                           | Landing page only — hero, quick facts, content sections, CTA                                                       |
| `app/dashboard/dashboard.css`             | Dashboard page only — greeting, stat cards, bottom grid, progress panel, certificate panel                         |
| `app/lab/lab.css`                         | Lab page only — hotspots, popup, hotspot editor                                                                    |
| `app/modules/modules.css`                 | Shared by every page under `app/modules/` — page header, cards, filter bar, section blocks, prev/next nav, editor  |
| `app/modules/components/ModuleCard.css`   | Shared base styles used by both ModuleCard and AdminModuleCard (found in admin folder)                             |
| `app/login/auth.css`                      | Login and register pages — card, form inputs, error box                                                            |
| `app/about/about.css`                     | About page only — header, section cards, info/feature/tech grids, footer                                           |
| `app/admin/users/admin.css`               | Admin users page only — user table, role/user-type badges, edit modal, stat cards, admin module-card, modules grid |
| `app/quizzes/quizzes.css`                 | Quizzes hub and attempt pages — quiz cards, question/option list, result banner, leaderboard opt-in banner         |
| `app/quizzes/leaderboard/leaderboard.css` | Leaderboard page only — badge, podium (top 3), ranked list, empty/error states                                     |
| `app/certificate/certificate.css`         | Certificate page only — name input, canvas, action buttons, blocked state                                          |

`globals.css` is imported once in `layout.tsx` and applies everywhere. The rest are imported directly by the pages/components that need them.

**Tailwind CSS v4** is a dependency, wired up via `postcss.config.mjs` (`@tailwindcss/postcss`), but the app's own styling uses plain, hand-written CSS with custom class names and CSS custom properties (design tokens like `--teal`, `--navy` in `:root`) — see `BUG_REPORT.md`.

---

## Authentication & Permissions

Firebase handles authentication (sign-in, sign-up, session state).
	Each user also has a **profile** — role, user type, organisation — stored separately in Supabase and managed through two API routes:
- `GET /api/profile/get?uid=...` — loads the profile matching a Firebase uid
- `POST /api/profile/create` — creates a profile record

A profile's `role` is one of `"user" | "staff" | "admin"`. `useAuth()` derives a `permissions` object from this:

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

Only `canManageUsers` is currently wired into the UI — it gates the **Administration** link in `Navbar.tsx` and the **Edit Mode** switch on `/lab` (`EditModeToggle.tsx`). see `BUG_REPORT.md` for the other seven.
	Promoting a user to `staff`/`admin`, or changing their `user_type`/`organisation`, is done through the **Edit User** modal on `/admin/users`.

Two server-side helpers protect API routes using a Firebase ID token:
- `requireUser` (`lib/authUser.ts`) verifies the token and returns the caller's `uid`.
- `requireAdmin` (`lib/adminAuth.ts`) additionally looks up the caller's Supabase profile and requires `role === 'admin'`.

See `ADDITIONAL_INFO.md` for full route-by-route auth coverage and behavioural details.

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

**b) Create the database tables, storage bucket, and permissions** — go to the SQL Editor in your Supabase dashboard, paste in the contents of [`supabase_setup.sql`](./supabase_setup.sql), and run it.
	It creates the `hazards`, `modules`, `module_sections`, `profiles`, `user_module_progress`, and `user_quiz_progress` tables (in dependency order, with the `hazards`→`modules` foreign key added once `modules` exists), the `lab-images` storage bucket, and all the Row Level Security policies and grants those tables and the bucket need (public `anon` read + `service_role` write for `hazards`/`modules`/`module_sections`/the bucket;
	`service_role`-only access for `profiles`/`user_module_progress`/`user_quiz_progress`, since those are only ever touched server-side behind `requireUser`/`requireAdmin`).
	See the comments in that file for the reasoning behind each step.

**c) Find your credentials** — go to **Settings → API Keys** in the Supabase dashboard:

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

No quotes around values, no spaces around `=`.
	**except** `FIREBASE_ADMIN_PRIVATE_KEY`, which does need to be wrapped in quotes since the key spans multiple lines represented as literal `\n` sequences;
	`lib/firebaseAdmin.ts` un-escapes them (`.replace(/\\n/g, "\n")`) before passing the key to the Admin SDK.
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

### 6. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser — this loads the public landing page. Log in or register to go to the dashboard.

### 7. Seed the database

On first run the Supabase tables are empty, so the app falls back to the bundled defaults in `lib/hazards.ts` and `lib/hazardModules.ts`.

**Seed `modules`/`module_sections` first:** log in as an admin and visit each hazard module reader page in turn (`/modules/hazard-modules/1` through `/modules/hazard-modules/5`), click the **Edit Mode** toggle, and click **Save Changes** without changing anything
	The page already shows `lib/hazardModules.ts`'s bundled content since Supabase is still empty, so this writes that content into `modules`/`module_sections` as-is.

**Then seed `hazards`:**
1. Navigate to `/lab`.
2. Click the **Edit Mode** toggle switch.
3. Without changing anything, click **Save Changes**.

The default hotspot data will be written to Supabase and loaded on every subsequent visit.

> **Note:** the default hotspots each link to a `hazard-modules` id (`hazards_module_fk` requires that pair to exist as a real row in `modules`), so seeding `hazards` before `modules`/`module_sections` exist for `hazard-modules` fails with a foreign-key violation — hence seeding modules first, above.

### 8. Build for production

```bash
npm run build
npm start
```

### Running tests

```bash
npm test			# runs all tests once and exits — used by Continuous Integration (CI)
npm run test:watch	# reruns automatically as files change — used during local dev
```

See `ADDITIONAL_INFO.md` for what's covered, mock API conventions, and CI details.

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

---

## Extending the app

For adding a new standalone page or a new `app/modules/`-style section, see `ADDITIONAL_INFO.md`. For customising existing module or hotspot content, see `EDITING_GUIDE.md`.
