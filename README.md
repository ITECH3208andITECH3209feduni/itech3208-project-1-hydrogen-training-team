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

```
hydrogen-lab/
├── app/
│   ├── globals.css						# Shared styles — reset, tokens, nav, panel, dashboard
│   ├── layout.tsx						# Root layout — renders Navbar and wraps all pages
│   ├── page.tsx						# Dashboard (home page)
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
│           └── HazardPopup.tsx			# Modal popup for hazard info
│   ├── modules/
│   │   ├── page.tsx					# Module listing with filter bar (/modules)
│   │   ├── modules.css					# Modules-specific styles
│   │   ├── components/
│   │   │   └── ModuleCard.tsx			# Card component for each module in the listing
│   │   └── [id]/
│   │       ├── page.tsx				# Module reader — dynamic route (/modules/1 … /modules/5)
│   │       └── components/
│   │           └── SectionBlock.tsx	# Renders a single numbered section in a module
│   ├── api/
│   │   ├── load-hazards/
│   │   │   └── route.ts				# GET route — loads hazard data from Supabase
│   │   ├── save-hazards/
│   │   │   └── route.ts				# POST route — saves hazard data to Supabase
│   │   ├── load-image/
│   │   │   └── route.ts				# GET route — returns lab image URL from Supabase Storage
│   │   └── upload-image/
│   │       └── route.ts				# POST route — uploads lab image to Supabase Storage
│   └── quizzes/
├── components/
│   └── Navbar.tsx						# Reusable navigation bar
├── context/
│   └── AuthContext.tsx					# Firebase auth state — wraps the app via layout.tsx
├── hooks/
│   └── useHazards.ts					# Custom hook — hotspot state, Supabase load/save, drag, secret key, image upload
├── lib/
│   ├── hazards.ts						# Default hazard data + hotspot positions + moduleId map (fallback)
│   ├── modules.ts						# Static content for all 5 modules (bundled at build time)
│   ├── supabase.ts						# Supabase client (anon key + server-side secret key)
│   └── firebase.ts						# Firebase app initialisation (auth + Firestore)
├── public/
│   └── lab.jpg							# Default lab image (fallback)
├── .env.local							# Environment variables (not committed to Git)
├── next.config.js
├── tsconfig.json
└── package.json
```

---

## Pages

| Route               | File                          | Description                                                        |
|---------------------|-------------------------------|--------------------------------------------------------------------|
| `/`                 | `app/page.tsx`                | Dashboard with modules, scenarios, quizzes, and training progress  |
| `/login`            | `app/login/page.tsx`          | Email and password login                                           |
| `/login/register`   | `app/login/register/page.tsx` | New account registration                                           |
| `/lab`              | `app/lab/page.tsx`            | Interactive lab with clickable hazard hotspots                     |
| `/modules`          | `app/modules/page.tsx`        | Module listing grid with status filter bar                         |
| `/modules/[id]`     | `app/modules/[id]/page.tsx`   | Module reader — sections, callouts, key takeaway, prev/next nav    |

All pages except `/login` and `/login/register` redirect unauthenticated users to `/login`.

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

Requires **Node.js 20.9 or higher** (Next.js 16 minimum).

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
	type        text primary key,
	title       text not null,
	text        text not null,
	top         text not null,
	"left"      text not null,
	sort_order  int  not null default 0
);
```

Note: `"left"` must be quoted as it is a reserved word in SQL.

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
```

**d) Create the image storage bucket** — run the following in the SQL Editor:

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

**e) Find your credentials** — go to **Settings → API Keys** in the Supabase dashboard:

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

## Adding a New Page

1. Create a new folder under `app/` named after the route (e.g. `app/modules/`)
2. Copy `template/page.tsx` into it
3. Update the `active` class on the correct nav link in `Navbar.tsx`
4. Replace the placeholder content with your page content

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

Module content is defined in `lib/modules.ts` as a static TypeScript array bundled at build time — no database calls are made when loading module pages. Each module contains sections, optional lists and callouts, a key takeaway, and links to the previous and next module.

The module reader at `/modules/[id]` uses `useParams()` to read the route segment and look up the module from the static array. Invalid IDs redirect to `/modules`.

Each lab hotspot popup includes a **Read Module** button that links directly to the corresponding module page. The mapping between hazard types and module IDs is defined in `lib/hazards.ts` via the `moduleId` field on each `HazardInfo` entry, and is re-attached to Supabase-loaded hotspots at runtime in `useHazards.ts`.

---

## Customising Default Hotspot Data

The file `lib/hazards.ts` defines the default hotspot positions and text used as a fallback when Supabase is unavailable or the table is empty. Edit the `hotspots` array to change default positions, and the `hazardData` record to change default titles and descriptions.

To add a new hazard type, add a new entry to both `hotspots` and `hazardData`, add the new key to the `HazardType` union at the top of the file, and add a corresponding module entry to `lib/modules.ts`. Then save to Supabase via edit mode.

---

## Customising Module Content

All module content lives in `lib/modules.ts`. Each entry in the `modules` array contains:

- `id` — numeric string matching the URL segment (e.g. `'1'`)
- `title`, `icon`, `iconBg`, `description`, `status`, `progress` — used by the listing card
- `sections` — array of `{ num, heading, body, listType?, items?, callout? }` objects
- `keyTakeaway` — displayed at the bottom of the reader
- `prevId` / `nextId` — controls the previous/next navigation buttons

Changes to this file require a redeployment to take effect.

---

## Customising the Dashboard

Training progress, module statuses, stat card counts, and certificate details are currently hardcoded in `app/page.tsx`. Replace these with data fetched from an API or database to make the dashboard dynamic.

---

## CSS Structure

Styles are split across three files to keep page-specific rules isolated:

| File						| Scope																			|
|---------------------------|-------------------------------------------------------------------------------|
| `app/globals.css` 		| Reset, design tokens, nav, `.panel`, animations, and dashboard styles 		|
| `app/lab/lab.css` 		| Lab page only — hotspots, popup, edit mode, editor panels, save bar 			|
| `app/modules/modules.css` | Modules listing and reader — cards, filter bar, section blocks, takeaway box 	|
| `app/login/auth.css` 		| Login and register pages — card, form inputs, error box 						|

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
