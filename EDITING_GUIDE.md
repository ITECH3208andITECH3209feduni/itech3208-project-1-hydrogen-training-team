# Editing Guide

How to change or update the content the app shows — hotspot data, module content, and the lab image.
	For how the underlying systems work (data merging, progress tracking, etc.), see `ADDITIONAL_INFO.md`.
	For known bugs affecting these flows (e.g. no server-side auth guard on the write endpoints below, despite the client-side edit-mode gate), see `BUG_REPORT.md`.

---

## Edit Mode

Hotspot positions and text are stored in Supabase and can be edited directly in the browser via edit mode.
	Edit mode is only visible to users with the `canManageUsers` permission (i.e. are admins) — regular users see no trace of it.

**To enter edit mode:** navigate to `/lab` and click the switch at the top-left of the page.
	It expands into a banner confirming edit mode is active while it's on. Click it again to exit.

**Hotspots:**
- Hotspots turn blue — drag them to reposition.
- Click a hotspot on the image, or select one from the list, to edit its title and description.
- Position values update automatically as you drag (clamped to 0–95% on each axis, so a hotspot can't be dragged fully off the image), or can be typed directly.
- Click **+** in the hotspot list header to add a new hotspot — it appears at the centre of the image, titled "⚠️ New Hazard" with no linked module, and is auto-selected for editing.
	Its `type` is auto-generated as `hazard_N`, using the first number not already in use (so deleting `hazard_2` and adding a new hotspot reuses `hazard_2` rather than continuing to `hazard_4`).
- Click **✕** next to a hotspot in the list to delete it.
- Click **Save Changes** to write all hotspot changes to Supabase — changes persist everywhere immediately.
- Click **Reset to Defaults** to revert hotspots to the values in `lib/hazards.ts` (does not affect the lab image).

**Lab image:**
- Click **Change Lab Image** to upload a replacement image — saved to Supabase Storage immediately and loaded on every subsequent visit.
	Every upload overwrites the same `lab.jpg` path, so the returned URL is otherwise identical between uploads — the client appends a cache-busting `?t=` query parameter so the browser fetches the replacement instead of serving a cached previous image.
- `public/lab.jpg` is used as a fallback if no image has been uploaded to Supabase.
- Changing the lab image is independent of the hotspot save/reset flow — it takes effect immediately on upload and is not affected by Reset to Defaults.

---

## Customising Module Content

Live hazard module content lives in Supabase, in the `modules`/`module_sections` tables under `section = 'hazard-modules'` — edit rows there directly via the Supabase dashboard or SQL Editor to change what's shown.

> **Note:** `guides` also has rows in these tables (seeded to match `lib/guides.ts`), and `/modules/guides` follows the same live-loading pattern as `hazard-modules` — editing a `guides` row here changes what both the hotspot editor's Linked Module dropdown and `/modules/guides` itself show.
	`guides` is a template section not linked from navigation, so day-to-day editing here is mainly relevant for keeping the dropdown's options in sync with any real section you build from it.

`lib/hazardModules.ts` supplies the bundled `ModuleData[]` array used as `defaults`: what's shown before the Supabase fetch resolves, and the fallback if it fails or the section is empty (see `ADDITIONAL_INFO.md` for how `hooks/useModules.ts` merges the two).

Each entry — whether in `lib/hazardModules.ts` or a `modules`/`module_sections` row — maps onto the shared `ModuleData` shape (defined in `lib/moduleTypes.ts`):
- `id` — numeric string matching the URL segment (e.g. `'1'`) — this is the stable, permanent key; routes are built from it, not `slug`
- `slug` — optional stable identifier (e.g. `'gas-leak-detection'`); not currently used for routing, exposed as a `data-slug` attribute on the card and reader for things like analytics or test selectors.
	It is also under consideration for replacing the current url scheme, going from '/section/id' to '/section/slug'.
- `badgeNum` — optional numbered badge shown on the card and reader hero (the hazard number, for this section); a section can omit it entirely if it doesn't need a badge — see `lib/guides.ts`
- `title`, `icon`, `iconBg`, `description` — used by the listing card
- `status`, `progress` — used by the listing card; live per-user values come from the separate `user_module_progress` table, merged in by `useModules` for a signed-in user.
	Not a column on `modules`/`module_sections` itself — the value set on the entry in the bundled `lib/` file (e.g. `lib/hazardModules.ts`) is only used as the fallback when there's no live per-user record (see `ADDITIONAL_INFO.md` for how the merge works)
- `sections` — array of `{ num, heading, body, listType?, items?, callout? }` objects;
	in Supabase this is the `module_sections` table (one row per section, foreign-keyed to its parent `modules` row, deleted automatically via `on delete cascade` if the module is deleted)
- `keyTakeaway` — displayed at the bottom of the reader
- `prevId` / `nextId` — optional; controls the previous/next navigation buttons — omit the key entirely (in `lib/hazardModules.ts`) or leave the column `null` (in Supabase) for the first module's `prevId` and the last module's `nextId`, rather than setting it to an empty string

Changes to `lib/hazardModules.ts` require a redeployment to take effect, but since it's the fallback rather than the live source, most day-to-day content edits happen in Supabase instead and take effect immediately, without a deploy.

To add a whole new section rather than another hazard module, see "Adding a new `app/modules/`-style section" in `ADDITIONAL_INFO.md`.

---

## Customising Default Hotspot Data

The file `lib/hazards.ts` defines the default hotspot positions and text used as a fallback when Supabase is unavailable or the table is empty.
	Edit the `hotspots` array to change default positions, and the `hazardData` record to change default titles and descriptions.

To add a new hazard type, add a new entry to both `hotspots` and `hazardData`, add the new key to the `HazardType` union at the top of the file, and add a corresponding module entry.
	Then save to Supabase via edit mode.

---

## Linking Hotspots to Modules

Each hotspot can optionally link to a module, via its `moduleId`/`moduleSection` fields — this is what powers the Learn More button in the hazard popup.

**In edit mode**, select a hotspot and use the **Linked Module** field: pick a section from the first dropdown, then a module from the second (its options are scoped to whichever section you just picked).
	Pick "None" to remove the link — this clears both fields together, since a hotspot's link must be fully set or fully empty, never half-set.
	If you pick a section but haven't picked a module yet (or vice versa), **Save Changes** disables with a warning until you either finish picking a module or set the section back to "None".

**A module only appears as an option once it actually exists in Supabase** — the dropdowns are populated live from the `modules` table, not from `lib/hazardModules.ts`/`lib/guides.ts`'s bundled defaults.
	If you've added a module to one of those files but haven't seeded a matching row in Supabase yet (see "Customising Module Content" above), it won't show up here yet — add the Supabase row first.

You can still set or clear a link directly in Supabase if you prefer (set the `hazards` table's `module_section`/`module_id` columns for the relevant row, either both to a valid `(section, id)` pair from the `modules` table, or both to `null`) — the in-app editor is just the more convenient path for day-to-day use now.

See `ADDITIONAL_INFO.md` for how these fields are read and enforced.