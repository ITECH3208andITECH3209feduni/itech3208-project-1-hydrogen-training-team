// hooks/quizzes/useQuizProgress.ts
// Per-user quiz progress for the attempt page: saving a result, and loading/updating the leaderboard opt-in.

import { useCallback, useEffect, useState, useRef } from 'react';
import type { User } from 'firebase/auth';

interface UseQuizProgressProps {
	user: User | null;
	loading: boolean;
}

export function useQuizProgress({ user, loading }: UseQuizProgressProps) {
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState('');

	// null = no saved preference (yet); the leaderboard banner only renders after a submission
	const [leaderboardVisible, setLeaderboardVisible] = useState<boolean | null>(null);
	const [leaderboardSaving, setLeaderboardSaving] = useState(false);
	const [leaderboardSaved, setLeaderboardSaved] = useState(false);

	// Guard against a slow retrieval overwriting the user's input
	const suppressLoadRef = useRef(false);

	// ── Load the learner's saved leaderboard preference ─────────────────────────
	useEffect(() => {
		let cancelled = false;
		suppressLoadRef.current = false;   // fresh guard for this session (new user / re-mount)

		async function loadLeaderboardPreference() {
			if (loading) return;

			if (!user) {
				setLeaderboardVisible(null);
				return;
			}

			try {
				const token = await user.getIdToken();

				const response = await fetch('/api/quizzes/progress', {
					method: 'GET',
					headers: { Authorization: `Bearer ${token}` },
					cache: 'no-store',
				});

				const result = await response.json();

				if (!cancelled && !suppressLoadRef.current && response.ok && result.ok && result.progress && typeof result.progress.leaderboard_visible === 'boolean') {
					setLeaderboardVisible(result.progress.leaderboard_visible);
				}
			} catch (error) {
				console.error('LEADERBOARD: failed to load saved preference', error);
			}
		}

		loadLeaderboardPreference();

		return () => {
			cancelled = true;
		};
	}, [user, loading]);

	// ── Save a quiz result ──────────────────────────────────────────────────────
	// Resolves true if the result was saved, false otherwise (the reason is in `error`).
	const submitQuizResult = useCallback(async (score: number, passed: boolean): Promise<boolean> => {
		if (!user) return false;
		suppressLoadRef.current = true;

		try {
			setSaving(true);
			setError('');

			const token = await user.getIdToken();

			const response = await fetch('/api/quizzes/progress', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ score, passed }),
			});

			const result = await response.json();

			if (!response.ok || !result.ok) {
				throw new Error(result.error || 'Failed to save quiz result.');
			}

			// The route keeps a learner's existing preference on a retry (new records default to private),
			// so mirror what it stored instead of assuming private.
			setLeaderboardVisible(
				typeof result.progress?.leaderboard_visible === 'boolean' ? result.progress.leaderboard_visible : false
			);
			setLeaderboardSaved(false);
			return true;
		} catch (error) {
			console.error('QUIZ SUBMIT: submission failed', error);
			setError(error instanceof Error ? error.message : 'Failed to save quiz result.');
			return false;
		} finally {
			setSaving(false);
		}
	}, [user]);

	// ── Update the leaderboard preference ───────────────────────────────────────
	const updateLeaderboardPreference = useCallback(async (visible: boolean) => {
		if (!user || leaderboardSaving) return;
		suppressLoadRef.current = true;

		try {
			setLeaderboardSaving(true);
			setError('');

			const token = await user.getIdToken();

			const response = await fetch('/api/quizzes/progress', {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ leaderboard_visible: visible }),
			});

			const result = await response.json();

			if (!response.ok || !result.ok) {
				throw new Error(result.error || 'Failed to update leaderboard preference.');
			}

			setLeaderboardVisible(visible);
			setLeaderboardSaved(true);
		} catch (error) {
			console.error('LEADERBOARD: preference update failed', error);
			setError(error instanceof Error ? error.message : 'Failed to update leaderboard preference.');
		} finally {
			setLeaderboardSaving(false);
		}
	}, [user, leaderboardSaving]);

	// Hides the "✓ saved" note (used on retry). Deliberately leaves the preference itself alone.
	const resetLeaderboardNotice = useCallback(() => setLeaderboardSaved(false), []);
	const clearError = useCallback(() => setError(''), []);

	return {
		saving,
		error,
		clearError,
		leaderboardVisible,
		leaderboardSaving,
		leaderboardSaved,
		submitQuizResult,
		updateLeaderboardPreference,
		resetLeaderboardNotice,
	};
}