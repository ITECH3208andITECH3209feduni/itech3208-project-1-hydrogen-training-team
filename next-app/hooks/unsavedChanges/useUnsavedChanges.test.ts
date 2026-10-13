// hooks/unsavedChanges/useUnsavedChanges.test.ts
// Unit tests for useUnsavedChanges.ts
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUnsavedChanges } from './useUnsavedChanges';

type Draft = { text: string } | undefined;

// A trivial snapshot function is enough here — real ones are tested alongside their own editor.
const snapshot = (v: Draft) => (v ? JSON.stringify(v) : '');
const seed: Draft = { text: 'saved' };

const renderTracker = () =>
	renderHook(({ draft }: { draft: Draft }) => useUnsavedChanges(draft, seed, snapshot), {
		initialProps: { draft: seed },
	});

// 1. Test useUnsavedChanges
describe('1. useUnsavedChanges', () => {
	it('1.1 is false while the draft matches what is stored', () => {
		const { result } = renderTracker();
		expect(result.current.hasUnsavedChanges).toBe(false);
	});

	it('1.2 is true once the draft differs, and false again if it is reverted', () => {
		const { result, rerender } = renderTracker();
		rerender({ draft: { text: 'edited' } });
		expect(result.current.hasUnsavedChanges).toBe(true);
		rerender({ draft: { text: 'saved' } });
		expect(result.current.hasUnsavedChanges).toBe(false);
	});

	it('1.3 markSaved makes a matching draft clean', () => {
		const { result, rerender } = renderTracker();
		rerender({ draft: { text: 'edited' } });
		act(() => result.current.markSaved({ text: 'edited' }));
		expect(result.current.hasUnsavedChanges).toBe(false);
	});

	// The in-flight case: the request sent 'first', then the user typed 'second' before it resolved
	it('1.4 markSaved with an older value leaves later edits unsaved', () => {
		const { result, rerender } = renderTracker();
		const sent = { text: 'first' };
		rerender({ draft: sent });
		rerender({ draft: { text: 'second' } });
		act(() => result.current.markSaved(sent));
		expect(result.current.hasUnsavedChanges).toBe(true);
	});

	// The refresh case: live data arrives that differs from the draft
	it('1.5 markSaved with new live data makes a differing draft unsaved', () => {
		const { result } = renderTracker();
		act(() => result.current.markSaved({ text: 'refreshed' }));
		expect(result.current.hasUnsavedChanges).toBe(true);
	});

	it('1.6 handles an undefined draft and saved state', () => {
		const { result } = renderHook(() => useUnsavedChanges<Draft>(undefined, undefined, snapshot));
		expect(result.current.hasUnsavedChanges).toBe(false);
	});

	// Editors list markSaved in effect/callback dependencies, so it must not change identity between renders
	it('1.7 keeps markSaved stable across renders', () => {
		const { result, rerender } = renderTracker();
		const first = result.current.markSaved;
		rerender({ draft: { text: 'edited' } });
		expect(result.current.markSaved).toBe(first);
	});
});