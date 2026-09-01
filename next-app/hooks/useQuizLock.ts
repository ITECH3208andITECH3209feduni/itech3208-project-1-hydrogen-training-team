// hooks/useQuizLock.ts
// Checks whether a quiz is locked behind its required module (AC2).
// Fails open (unlocked) if no requirement row exists yet or a fetch fails —
// a missing/pending migration should never permanently block a quiz nobody
// could otherwise reach.

import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';

export interface QuizRequirementRow {
	quiz_id: string;
	required_module_id: string;
	section: string;
}

interface ModuleProgressRow {
	module_id: string | number;
	status?: string | null;
}

interface UseQuizLockResult {
	locked: boolean;
	ready: boolean;
	requiredModuleId: string | null;
}

export function useQuizLock(quizId: string, user: User | null, loading: boolean): UseQuizLockResult {
	const [requirement, setRequirement] = useState<QuizRequirementRow | null>(null);
	const [requiredModuleStatus, setRequiredModuleStatus] = useState<string | null>(null);
	const [ready, setReady] = useState(false);

	useEffect(() => {
		if (loading || !user) return;
		let cancelled = false;
		const currentUser = user;

		async function load() {
			try {
				const token = await currentUser.getIdToken();

				const [reqRes, progRes] = await Promise.all([
					fetch('/api/quiz-requirements', { cache: 'no-store' }),
					fetch('/api/modules/progress', {
						headers: { Authorization: `Bearer ${token}` },
						cache: 'no-store',
					}),
				]);

				const reqJson = await reqRes.json();
				const progJson = await progRes.json();

				if (cancelled) return;

				const row: QuizRequirementRow | undefined =
					reqJson.ok && Array.isArray(reqJson.data)
						? reqJson.data.find((r: QuizRequirementRow) => r.quiz_id === quizId)
						: undefined;

				if (!row) {
					setRequirement(null);
					return;
				}

				setRequirement(row);

				const progressRows: ModuleProgressRow[] =
					progJson.ok && Array.isArray(progJson.progress) ? progJson.progress : [];
				const moduleRow = progressRows.find(
					(p) => String(p.module_id) === String(row.required_module_id)
				);
				setRequiredModuleStatus(moduleRow?.status ?? null);
			} catch {
				console.error(`Failed to load lock state for quiz "${quizId}"`);
			} finally {
				if (!cancelled) setReady(true);
			}
		}

		load();
		return () => {
			cancelled = true;
		};
	}, [quizId, user, loading]);

	return {
		locked: ready && !!requirement && requiredModuleStatus !== 'done',
		ready,
		requiredModuleId: requirement?.required_module_id ?? null,
	};
}
