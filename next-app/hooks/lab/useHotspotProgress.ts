// hooks/lab/useHotspotProgress.ts
// Records that the signed-in learner has clicked a hotspot on /lab.

import { useCallback } from 'react';
import type { User } from 'firebase/auth';

interface UseHotspotProgressProps {
	user: User | null;
}

export function useHotspotProgress({ user }: UseHotspotProgressProps) {
	// Fire-and-forget: failures are logged, never thrown, so a progress hiccup can't block the popup opening.
	const recordHotspotProgress = useCallback(async (hotspotId: string) => {
		if (!user) return;

		try {
			const token = await user.getIdToken();

			const response = await fetch('/api/lab/progress', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ hotspotId }),
			});

			if (!response.ok) {
				const data = await response.json();
				console.error('Failed to record hotspot progress:', data.error);
			}
		} catch (error) {
			console.error('Failed to record hotspot progress:', error);
		}
	}, [user]);

	return { recordHotspotProgress };
}