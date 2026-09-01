// hooks/useModules.ts
// Loads module content from Supabase for a given section, merged over the defaults,
// then overlays each module's real per-user status/progress from /api/modules/progress.

import { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import { ModuleData, ModuleSection, getModuleById } from '@/lib/moduleTypes';

export type LoadStatus = 'loading' | 'ready' | 'error';

// ─── Shapes returned by /api/load-modules ──────────────────────────────────
export interface SupabaseSectionRow {
	num: string;
	heading: string;
	body: string;
	list_type: 'ul' | 'ol' | null;
	items: string[] | null;
	callout: string | null;
}

export interface SupabaseModuleRow {
	id: string;
	slug: string | null;
	badge_num: number | null;
	icon: string;
	icon_bg: string;
	title: string;
	description: string;
	key_takeaway: string;
	prev_id: string | null;
	next_id: string | null;
	module_sections: SupabaseSectionRow[];
}

// ─── Mapping helpers ────────────────────────────────────────────────────────
export function mapSection(row: SupabaseSectionRow): ModuleSection {
	return {
		num: row.num,
		heading: row.heading,
		body: row.body,
		listType: row.list_type ?? undefined,
		items: row.items ?? undefined,
		callout: row.callout ?? undefined,
	};
}

// Combines a Supabase row with the matching local default (if any).
// status/progress default here — the real per-user values get overlaid
// separately by applyProgress() once /api/modules/progress has loaded.
export function mergeRow(row: SupabaseModuleRow, fallback?: ModuleData): ModuleData {
	return {
		id: row.id,
		slug: row.slug ?? undefined,
		badgeNum: row.badge_num ?? fallback?.badgeNum,
		icon: row.icon,
		iconBg: row.icon_bg,
		title: row.title,
		description: row.description,
		sections: row.module_sections.map(mapSection),
		keyTakeaway: row.key_takeaway,
		prevId: row.prev_id ?? undefined,
		nextId: row.next_id ?? undefined,
		status: fallback?.status ?? 'todo',
		progress: fallback?.progress ?? 0,
	};
}

// ─── Per-user progress overlay ──────────────────────────────────────────────
// Matches the row shape returned by GET /api/modules/progress
// (backed by the user_module_progress table — see app/api/modules/progress/route.ts).
export interface ModuleProgressRow {
	module_id: string | number;
	status?: ModuleData['status'] | null;
	progress?: number | null;
}

// Overlays real per-user status/progress onto module content, matched by
// module_id. Modules with no matching row (not started yet) keep their
// content-default status/progress untouched.
export function applyProgress<T extends ModuleData>(items: T[], rows: ModuleProgressRow[]): T[] {
	if (!rows.length) return items;
	const byId = new Map(rows.map((row) => [String(row.module_id), row]));
	return items.map((item) => {
		const row = byId.get(String(item.id));
		if (!row) return item;
		return {
			...item,
			status: row.status ?? item.status,
			progress: row.progress ?? item.progress,
		};
	});
}

// ─── Hook ───────────────────────────────────────────────────────────────────
// section: Identifies set of modules to load.
// defaults: Static version of modules kept in application.
// user/loading: Current auth state — needed to fetch this user's real progress,
// which progression-locking checks against.
export function useModules(section: string, defaults: ModuleData[], user: User | null, loading: boolean) {
	const [contentModules, setContentModules] = useState<ModuleData[]>(defaults);
	const [progressRows, setProgressRows] = useState<ModuleProgressRow[]>([]);
	const [loadStatus, setLoadStatus] = useState<LoadStatus>('loading');

	useEffect(() => {
		let cancelled = false;

		async function loadModules() {
			try {
				const res = await fetch(`/api/load-modules?section=${encodeURIComponent(section)}`, {
					cache: 'no-store',
				});
				const json = await res.json();
				if (cancelled) return;

				// If fetch fails, keep the defaults already sitting in state
				if (!json.ok) {
					console.error('load-modules API error:', json.error);
					setLoadStatus('error');
					return;
				}

				if (!json.data?.length) {
					setLoadStatus('ready');
					return;
				}

				const rows: SupabaseModuleRow[] = json.data;
				const byId = new Map(defaults.map((m) => [m.id, m]));
				const merged = rows.map((row) => mergeRow(row, byId.get(row.id)));

				setContentModules(merged);
				setLoadStatus('ready');
			} catch {
				if (!cancelled) {
					console.error(`Failed to load "${section}" modules from Supabase — using defaults`);
					setLoadStatus('error');
				}
			}
		}

		loadModules();
		return () => {
			cancelled = true;
		};
	}, [section, defaults]);

	useEffect(() => {
		if (loading || !user) return;
		let cancelled = false;
		const currentUser = user;

		async function loadProgress() {
			try {
				const token = await currentUser.getIdToken();
				const res = await fetch('/api/modules/progress', {
					headers: { Authorization: `Bearer ${token}` },
					cache: 'no-store',
				});
				const json = await res.json();
				if (!cancelled && json.ok && Array.isArray(json.progress)) {
					setProgressRows(json.progress);
				}
			} catch {
				// Keep whatever progress we already have — locking fails open on error.
				console.error(`Failed to load progress for "${section}" modules`);
			}
		}

		loadProgress();
		return () => {
			cancelled = true;
		};
	}, [section, user, loading]);

	// Derived, not stored — avoids a race between the two independent loads above.
	const modules = applyProgress(contentModules, progressRows);

	return { modules, loadStatus };
}

// Convenience wrapper for reader pages that just need one module by id.
// Also returns the full list, since the reader needs it to check whether
// this module is locked behind an incomplete prerequisite.
export function useModuleById(
	section: string,
	defaults: ModuleData[],
	id: string | undefined,
	user: User | null,
	loading: boolean
) {
	const { modules, loadStatus } = useModules(section, defaults, user, loading);
	const item = id ? getModuleById(modules, id) : undefined;
	return { item, modules, loadStatus };
}
