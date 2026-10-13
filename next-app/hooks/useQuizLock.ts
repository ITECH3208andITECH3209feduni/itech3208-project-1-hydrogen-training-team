// hooks/useQuizLock.ts
// Checks whether a quiz is locked behind its topic's modules (AC2): the quiz
// unlocks only once every module in that topic is done for this user.
// The module list comes from Supabase (falling back to the static defaults),
// so modules added through the in-app editor are counted automatically.
// Fails closed (locked) if progress can't be loaded — the server enforces the
// same rule in lib/progressLock.ts, so a failed lookup can't be submitted anyway.

import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import type { ModuleData } from '@/lib/modules/moduleTypes';

interface ModuleProgressRow {
	module_id: string | number;
	status?: string | null;
	progress?: number | null;
}

interface UseQuizLockResult {
	locked: boolean;
	ready: boolean;
	doneCount: number;
	totalCount: number;
}

// Same "done" rule useModules applies when merging progress onto modules.
export function isProgressDone(row: ModuleProgressRow): boolean {
	return row.status === 'done' || Number(row.progress ?? 0) >= 100;
}

export function useQuizLock(
	topic: string,
	defaults: ModuleData[],
	user: User | null,
	loading: boolean
): UseQuizLockResult {
	const [moduleIds, setModuleIds] = useState<string[]>([]);
	const [doneIds, setDoneIds] = useState<Set<string>>(new Set());
	const [ready, setReady] = useState(false);

	useEffect(() => {
		if (loading || !user) return;
		let cancelled = false;
		const currentUser = user;
		setReady(false);

		async function load() {
			// Which modules make up this topic — live list first, defaults otherwise.
			let ids = defaults.map((m) => String(m.id));
			try {
				const modRes = await fetch(`/api/modules/load-modules?topic=${encodeURIComponent(topic)}`, {
					cache: 'no-store',
				});
				const modJson = await modRes.json();
				if (modJson.ok && Array.isArray(modJson.data) && modJson.data.length) {
					ids = modJson.data.map((row: { id: string | number }) => String(row.id));
				}
			} catch {
				console.error(`Quiz lock: failed to load "${topic}" modules — using defaults`);
			}

			let done = new Set<string>();
			try {
				const token = await currentUser.getIdToken();
				const progRes = await fetch(`/api/modules/progress?topic=${encodeURIComponent(topic)}`, {
					headers: { Authorization: `Bearer ${token}` },
					cache: 'no-store',
				});
				const progJson = await progRes.json();

				if (progJson.ok && Array.isArray(progJson.progress)) {
					const rows: ModuleProgressRow[] = progJson.progress;
					done = new Set(rows.filter(isProgressDone).map((r) => String(r.module_id)));
				} else {
					console.error(`Quiz lock: /api/modules/progress failed (${progRes.status}) — quiz locked:`, progJson.error);
				}
			} catch (error) {
				console.error('Quiz lock: failed to load module progress — quiz locked:', error);
			}

			if (cancelled) return;
			setModuleIds(ids);
			setDoneIds(done);
			setReady(true);
		}

		load();
		return () => {
			cancelled = true;
		};
	}, [topic, defaults, user, loading]);

	const doneCount = moduleIds.filter((id) => doneIds.has(id)).length;

	return {
		locked: ready && doneCount < moduleIds.length,
		ready,
		doneCount,
		totalCount: moduleIds.length,
	};
}
