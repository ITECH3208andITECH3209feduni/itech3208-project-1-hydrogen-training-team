// hooks/useModules.ts
// Loads module content from Supabase for a given section, merged over the defaults.

import { useState, useEffect } from 'react';
import { useAuth } from "@/context/AuthContext";
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
// status/progress always default — Supabase doesn't carry them.
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

// ─── Hook ───────────────────────────────────────────────────────────────────
// section: Identifies set of modules to load.
// defaults: Static version of modules kept in application.
export function useModules(section: string, defaults: ModuleData[]) {
	const [modules, setModules] = useState<ModuleData[]>(defaults);
	const [loadStatus, setLoadStatus] = useState<LoadStatus>('loading');
	const { user, loading: authLoading } = useAuth();

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

				let progressRecords: Array<{
				    module_id: string | number;
				    progress?: number | null;
				    status?: string | null;
				}> = [];

				if (user && !authLoading) {
				    try {
				        const token = await user.getIdToken();

				        const progressResponse = await fetch(
				            "/api/modules/progress",
				            {
				                method: "GET",
				                headers: {
				                    Authorization: "Bearer " + token,
				                },
				                cache: "no-store",
				            }
				        );

				        const progressResult = await progressResponse.json();

				        if (
				            progressResponse.ok &&
				            progressResult.ok &&
				            Array.isArray(progressResult.progress)
				        ) {
				            progressRecords = progressResult.progress;
				        }
				    } catch (error) {
				        console.error("Failed to load user module progress:", error);
				    }
				}

				const progressMap = new Map(
				    progressRecords.map((record) => [
				        String(record.module_id),
				        record,
				    ])
				);

				const modulesWithProgress = merged.map((module) => {
				    const record = progressMap.get(String(module.id));

				    if (!record) {
				        return {
				            ...module,
				            progress: 0,
				            status: "todo" as const,
				        };
				    }

				    const numericProgress = Number(record.progress ?? 0);

				    const progress = Number.isFinite(numericProgress)
				        ? Math.max(0, Math.min(100, numericProgress))
				        : 0;

				    const status: ModuleData["status"] =
				        record.status === "done" || progress >= 100
				            ? "done"
				            : progress > 0
				                ? "progress"
				                : "todo";

				    return {
				        ...module,
				        progress,
				        status,
				    };
				});

				setModules(modulesWithProgress);
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
	}, [section, defaults, user, authLoading]);

	return { modules, loadStatus };
}

// Convenience wrapper for reader pages that just need one module by id.
export function useModuleById(section: string, defaults: ModuleData[], id: string | undefined) {
	const { modules, loadStatus } = useModules(section, defaults);
	const item = id ? getModuleById(modules, id) : undefined;
	return { item, loadStatus };
}
