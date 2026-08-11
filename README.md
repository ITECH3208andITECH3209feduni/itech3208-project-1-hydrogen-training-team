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

A **Next.js 16 App Router** application with TypeScript for hydrogen technology training. Features an interactive lab safety simulation and a dashboard tracking modules, scenarios, and quizzes.

---

## Project Structure

> **Note:** this `next-app/` folder is a subfolder of the overall Git repository, not the repo root. The GitHub Actions Continuous Integration workflow (`.github/workflows/test.yml`) lives one level up, at the true repo root, alongside `next-app/` — not inside it — since GitHub only looks for workflow files at the repository root.

```
hydrogen-lab/
├── app/
│   ├── globals.css						# Shared styles — reset, tokens, nav, panel, dashboard
│   ├── layout.tsx						# Root layout — renders Navbar and wraps all pages
│   ├── page.tsx						# Dashboard (home page)
│   ├── intro/
│   │   ├── page.tsx					# Public landing/intro page (/intro) — no login required
│   │   └── intro.css					# Intro-specific styles
│   ├── template/
│   │   └── page.tsx					# Template for creating new pages (not in navigation)
│   ├── login/
│   │   ├── auth.css					# Shared styles for login and register pages
│   │   ├── page.tsx					# Login page (/login)
│   │   └── register/
│   │       └── page.tsx				# Register page (/login/register)
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
│   │   │   ├── ModuleReaderPage.tsx	# Wrapper for module page
│   │   │   ├── ModuleCard.tsx			# Card component for each module in the listing page
│   │   │   └── SectionBlock.tsx		# Renders a single numbered section in a module page
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
│   │   │   └── route.ts				# GET route — loads hazard data from Supabase
│   │   ├── save-hazards/
│   │   │   └── route.ts				# POST route — saves hazard data to Supabase
│   │   ├── load-image/
│   │   │   └── route.ts				# GET route — returns lab image URL from Supabase Storage
│   │   ├── upload-image/
│   │   │   └── route.ts				# POST route — uploads lab image to Supabase Storage
│   │   └── load-modules/
│   │       └── route.ts				# GET route — loads module content + sections from Supabase for a given section
│   └── quizzes/
├── components/
│   └── Navbar.tsx						# Reusable navigation bar
├── context/
│   └── AuthContext.tsx					# Firebase auth state — wraps the app via layout.tsx
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
│   ├── supabase.ts						# Supabase client (anon key + server-side secret key)
│   └── firebase.ts						# Firebase app initialisation (auth + Firestore)
├── public/
│   ├── lab.jpg							# Default lab image (fallback)
│   └── hydrogen-lab-bg.svg				# Decorative background graphic used on the intro page
├── .env.local							# Environment variables (not committed to Git)
├── next.config.js
├── tsconfig.json
├── tsconfig.vitest.json				# Widened tsconfig (no test-file excludes) so vite-tsconfig-paths can resolve "@/" imports inside test files
├── vitest.config.ts					# Vitest configuration (jsdom, plugins, setup file)
├── vitest.setup.ts						# Global test setup — jest-dom matchers, MSW server lifecycle
└── package.json
```

Note: `app/modules/` has no `page.tsx` of its own — it's a code-organization directory holding every section built on the shared template (`hazard-modules`, `guides`), not a route itself.

---

## Pages

| Route                            | File                                       | Description                                                            |
|----------------------------------|--------------------------------------------|------------------------------------------------------------------------|
| `/`                              | `app/page.tsx`                             | Dashboard with modules, scenarios, quizzes, and training progress      |
| `/intro`                         | `app/intro/page.tsx`                       | Public landing page introducing the platform — no login required       |
| `/login`                         | `app/login/page.tsx`                       | Email and password login                                               |
| `/login/register`                | `app/login/register/page.tsx`              | New account registration                                               |
| `/lab`                           | `app/lab/page.tsx`                         | Interactive lab with clickable hazard hotspots                         |
| `/modules/hazard-modules`        | `app/modules/hazard-modules/page.tsx`      | Hazard module listing grid with status filter bar                      |
| `/modules/hazard-modules/[id]`   | `app/modules/hazard-modules/[id]/page.tsx` | Hazard module reader — sections, callouts, key takeaway, prev/next nav |
| `/modules/guides`                | `app/modules/guides/page.tsx`              | Example second section built on the same template — not linked in nav  |
| `/modules/guides/[id]`           | `app/modules/guides/[id]/page.tsx`         | Example reader page for the guides section                             |

Note: the "Hydrogen Lab Safety" title in the Navbar links to `/intro`, following the common pattern of a site's logo linking back to a landing/home page.
Note: there is no page at the bare `/modules` route. `app/modules/` is a code-organization directory holding every section built on the shared listing+reader template — not a page itself — so visiting `/modules` directly returns a 404. The Navbar and dashboard both link straight to `/modules/hazard-modules`.

All pages except `/login`, `/login/register` and `/intro` redirect unauthenticated users to `/login`. The `/intro` page calls `useAuth()` (to swap some elements for logged-in users) but doesn't gate access on it, so it's viewable by anyone.

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

Note: `status` and `progress` (used by the listing card) are deliberately **not** columns on `modules` — they're intended to come from a separate per-user progress-tracking table, not yet built. Until then, every module's status/progress is always drawn from its entry in `lib/hazardModules.ts`, never from Supabase — see `hooks/useModules.ts`.

Now that `modules` exists, add the foreign key constraint deferred from the `hazards` table above:

```sql
alter table public.hazards
  add constraint hazards_module_fk
  foreign key (module_section, module_id)
  references public.modules (section, id)
  match full
  on delete set null;
```

`match full` means a hazard row must have `module_section`/`module_id` either both `null` or both set to a valid, existing `(section, id)` pair on `modules` — never just one of the two. `on delete set null` means deleting a module doesn't delete the hazard that links to it; the hotspot's "Learn More" button just stops appearing (see "Linking Hotspots to Modules" below).

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

**f) Find your credentials** — go to **Settings → API Keys** in the Supabase dashboard:

- **Project URL** — in the format `https://abcdefghijkl.supabase.co`
- **`sb_publishable` key** — safe to expose in the browser
- **`sb_secret` key** — admin-level access, must be kept private

### 4. Create the `.env.local` file

Create a `.env.local` file in the project root containing all credentials for both Firebase and Supabase:

```
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijkl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_sb_publishable_key
SUPABASE_SECRET_KEY=your_sb_secret_key
```

No quotes around values, no spaces around `=`. Restart the dev server after creating or editing this file.

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

`tsconfig.json` excludes `**/*.test.ts` / `**/*.test.tsx` / `mocks/**/*` so Next's typecheck stays scoped to app code. `vite-tsconfig-paths` (used by `vitest.config.ts` to resolve `@/*` imports) respects that same exclude list — so without a workaround, `@/`-style imports inside test files fail to resolve even though the app itself builds fine.

`tsconfig.vitest.json` exists to fix this: it extends `tsconfig.json` but drops the excludes, and `vitest.config.ts` points `vite-tsconfig-paths` at it via `projects: ['./tsconfig.vitest.json']`. `tsconfig.json` itself is untouched, so Next/Vercel's build scope is unaffected.

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

The `guides` section (`lib/guides.ts`, `app/modules/guides/`) is a working, unlinked example of a section built on the shared template — but it hasn't been migrated to Supabase yet, so it's still on the older static-only pattern (no `useModules` call, data comes straight from `lib/guides.ts`). Treat it as a reference for the overall section shape (data file + listing/reader wrappers), not for the live-loading pattern — follow `hazard-modules` for that instead.

`badgeNum` (small numbered badge on the card/hero) and `slug` (stable id exposed as a `data-slug` attribute) are both optional on `ModuleData` — omit either if a section doesn't need it, as `guides` does for both.

---

## Edit Mode

Hotspot positions and text are stored in Supabase and can be edited directly in the browser via a hidden edit mode. Edit mode is invisible to regular users — no button or link exposes it.

**To enter edit mode:** navigate to `/lab` and type `H Z E D I T` (one letter at a time, each within 2 seconds of the last, no modifier keys). A yellow banner will appear confirming edit mode is active. Type the same sequence again to exit.

**In edit mode:**

### Hotspots
- Hotspots turn blue — drag them to reposition
- Click a hotspot on the image, or select one from the list, to edit its title and description
- Position values update automatically as you drag, or can be typed directly
- Click **+** in the hotspot list header to add a new hotspot — it appears at the centre of the image and is auto-selected for editing
- Click **✕** next to a hotspot in the list to delete it
- Click **Save Changes** to write all hotspot changes to Supabase — changes persist everywhere immediately
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
- `ModuleReaderPage.tsx` — breadcrumb, hero, sections, key takeaway, prev/next nav
- `ModuleCard.tsx` — card shown in the listing page
- `SectionBlock.tsx` — renders a single numbered section

Shared types (`ModuleData`, `ModuleSection`, `ModuleStatus`) and a generic `getModuleById(items, id)` lookup helper live in `lib/moduleTypes.ts`. Each section's data file wraps that helper with its own name (`getHazardModuleById`, `getGuideById`) rather than exposing the generic one directly to pages.

Module content lives in Supabase (see "Set up Supabase" above), loaded per-section through `hooks/useModules.ts`:

- **`useModules(section, defaults)`** — fetches `GET /api/load-modules?section=...`, merges each returned row over the matching entry (by `id`) in `defaults`, and returns `{ modules, loadStatus }`. A successful, non-empty response is authoritative for whatever it contains — modules Supabase doesn't return for that section are **not** padded back in from `defaults`, so removing a module from Supabase actually removes it from the app rather than having it silently reappear from stale bundled content. `defaults` is only used wholesale as a fallback when the fetch fails entirely or the section hasn't been seeded yet (empty response).
- **`useModuleById(section, defaults, id)`** — the same, narrowed to a single module by id; this is what reader pages use in place of a section's static `getXById` helper, since the lookup now has to react to data that arrives after the initial render.
- **`mergeRow`/`mapSection`** (also exported from `useModules.ts`) do the field-name translation between Supabase's snake_case row shape (`badge_num`, `icon_bg`, `key_takeaway`, `list_type`, …) and the app's camelCase `ModuleData`/`ModuleSection` shape that every component already expects.
- `status`/`progress` always come from `defaults`, never from Supabase (see the note on the `modules` table above). `slug` is treated differently from `badgeNum`: a `null` slug in Supabase is passed through as `undefined` rather than backfilled from `defaults`, since `slug` is a candidate for use in routing later and a stale slug silently standing in for a missing one would be a broken/misleading link — `badgeNum` is purely cosmetic (a hotspot number's position in the list), so it's fine to backfill from `defaults` when Supabase hasn't got one.

Each section's data file (e.g. `lib/hazardModules.ts`) still exports its static `ModuleData[]` array — now serving as the `defaults` passed into `useModules`/`useModuleById`, i.e. what's shown before the Supabase fetch resolves, and the fallback if it fails. Section-specific lookup wrappers like `getHazardModuleById` are no longer called by the reader pages (which now use `useModuleById` instead) — they're currently unused but left in place pending a decision on whether to remove them, adapt them to take an array parameter, or leave them for other non-hook use cases.

There's currently no in-app edit mode for module content (unlike the lab's hidden hotspot editor) — changing what's in Supabase means editing rows directly via the Supabase dashboard or SQL Editor. Changing `lib/hazardModules.ts` itself still requires a redeployment, same as before, but its role has narrowed to "starting/fallback content" rather than "the content."

Each lab hotspot popup includes a **Learn More** button that links to `/modules/{moduleSection}/{moduleId}`. See "Linking Hotspots to Modules" below for how that mapping is stored and loaded.

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

**Where the values come from:** the `hazards` table's `module_section`/`module_id` columns are genuinely live from Supabase — treated the same as `title`/`text`. `useHazards.ts` only falls back to the full set of local defaults (including their module links) if the `/api/load-hazards` fetch fails outright or the table is empty; a successful, non-empty load is authoritative for `moduleId`/`moduleSection` even where they're `null`. `lib/hazards.ts` itself still hardcodes a `moduleId`/`moduleSection` per hazard type — this is the pre-Supabase fallback data, in the same role as the rest of that file's defaults.

**Both-or-neither:** the two columns form a matched pair enforced at the database level — the `hazards_module_fk` foreign key uses `match full`, so a row can have both `null` or both set to a valid `(section, id)` on `modules`, never just one. `addHotspot()` in `useHazards.ts` seeds new hotspots with both `null` accordingly. Deleting the linked module (`on delete set null`) doesn't delete the hazard — it just resets both columns to `null`, so the "Learn More" button disappears rather than pointing at a dead link.

**Setting a link:** there's currently no in-app UI for setting or changing a hotspot's linked module — `HotspotEditor.tsx` only edits title, description, and position. Linking a hotspot to a module means setting `module_section`/`module_id` directly via the Supabase dashboard or SQL Editor, the same way module content itself is currently edited (see "Customising Module Content" below).

---

## Customising Module Content

Live hazard module content lives in Supabase, in the `modules`/`module_sections` tables under `section = 'hazard-modules'` (see "Set up Supabase" above) — edit rows there directly via the Supabase dashboard or SQL Editor to change what's shown. `lib/hazardModules.ts` supplies the bundled `ModuleData[]` array used as `defaults`: what's shown before the Supabase fetch resolves, and the fallback if it fails or the section is empty (see "Modules" above for how `hooks/useModules.ts` merges the two).

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

| File						| Scope																						  |
|---------------------------|---------------------------------------------------------------------------------------------|
| `app/globals.css` 		| Reset, design tokens, nav, `.panel`, animations, and dashboard styles                       |
| `app/lab/lab.css` 		| Lab page only — hotspots, popup, edit mode, editor panels, save bar                         |
| `app/modules/modules.css` | Shared by every page under `app/modules/` — cards, filter bar, section blocks, takeaway box |
| `app/login/auth.css` 		| Login and register pages — card, form inputs, error box                                     |
| `app/intro/intro.css` 	| Intro page only — hero, quick facts, content sections, CTA                                  |

`globals.css` is imported once in `layout.tsx` and applies everywhere. The other three files are imported directly by the pages that need them.

---

## Fonts

The app uses **Exo 2** and **Inter** from Google Fonts, imported in `layout.tsx`. To self-host the fonts instead (recommended for performance), replace the `<link>` tag with `next/font/google`:

```tsx
import { Exo_2, Inter } from 'next/font/google';
```

See the [Next.js font documentation](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) for setup details.

---

## Environment Variables

| Variable					 					| Description							 								|
|-----------------------------------------------|-----------------------------------------------------------------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` 				| Firebase API key — safe for browser use 								|
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` 			| Firebase auth domain 													|
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` 			| Firebase project ID 													|
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` 		| Firebase storage bucket 												|
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` 	| Firebase messaging sender ID 											|
| `NEXT_PUBLIC_FIREBASE_APP_ID` 				| Firebase app ID 														|
| `NEXT_PUBLIC_SUPABASE_URL` 					| Supabase project URL 													|
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` 				| Supabase `sb_publishable` key — safe for browser use 					|
| `SUPABASE_SECRET_KEY` 						| Supabase `sb_secret` key — server-side only, never exposed to browser |

All `NEXT_PUBLIC_` variables are embedded in the client bundle at build time. The `SUPABASE_SECRET_KEY` is used only in server-side API routes and is never sent to the browser.
