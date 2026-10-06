// hooks/unsavedChanges/useUnsavedChanges.ts
// Tracks whether an editor's draft differs from what's stored in Supabase. Shared by the lab, quiz and module editors.
// Pair with useLeaveWarning to warn before the user navigates away.

// Each editor supplies its own `snapshot` function, which reduces a draft to just the fields its Save persists (as a string).

import { useState, useCallback } from 'react';

export function useUnsavedChanges<T>(draft: T, initialSaved: T, snapshot: (value: T) => string) {
	// Snapshot of what's stored. initialSaved is only read on the first render; after that, use markSaved.
	const [savedSnapshot, setSavedSnapshot] = useState(() => snapshot(initialSaved));

	// Declare that `saved` is now what's stored. Call it when live data loads or refreshes, and after a successful save.
	// After a save, pass the draft that was sent (not the latest draft), so edits made while the request was in flight stay unsaved.
	const markSaved = useCallback((saved: T) => setSavedSnapshot(snapshot(saved)), [snapshot]);

	const hasUnsavedChanges = snapshot(draft) !== savedSnapshot;

	return { hasUnsavedChanges, markSaved };
}