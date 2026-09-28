// hooks/unsavedChanges/useLeaveWarning.ts
// Warns before an admin loses in-progress edits by leaving the page.
// Guards: tab close/refresh (beforeunload) and in-app link clicks.
// Not covered: browser Back/Forward, and non-link navigation such as the navbar's Logout button.

import { useEffect } from 'react';

export function useLeaveWarning(hasUnsavedChanges: boolean) {
	// Tab close / refresh
	useEffect(() => {
		if (!hasUnsavedChanges) return;

		const handleBeforeUnload = (e: BeforeUnloadEvent) => {
			e.preventDefault();
			e.returnValue = '';   // Some browsers need this as well as preventDefault()
		};
		window.addEventListener('beforeunload', handleBeforeUnload);
		return () => window.removeEventListener('beforeunload', handleBeforeUnload);
	}, [hasUnsavedChanges]);

	// In-app link clicks
	useEffect(() => {
		if (!hasUnsavedChanges) return;

		const handleClick = (e: MouseEvent) => {
			if (!(e.target instanceof Element)) return;
			const anchor = e.target.closest('a[href]') as HTMLAnchorElement | null;
			if (!anchor) return;

			const url = new URL(anchor.href, window.location.href);
			const isSamePage = url.pathname === window.location.pathname;
			const isExternal = url.origin !== window.location.origin;
			const isModifiedClick = e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0;
			// NEW: links that open a new tab/window or download a file don't navigate this tab away either
			const opensElsewhere = (!!anchor.target && anchor.target !== '_self') || anchor.hasAttribute('download');

			if (isSamePage || isExternal || isModifiedClick || opensElsewhere) return;

			const confirmed = window.confirm('You have unsaved changes. Leave without saving?');
			if (!confirmed) {
				e.preventDefault();
				e.stopPropagation();
			}
			// If confirmed, let the click continue to Next's own Link handler as normal.
		};

		document.addEventListener('click', handleClick, true);
		return () => document.removeEventListener('click', handleClick, true);
	}, [hasUnsavedChanges]);
}