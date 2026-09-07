// hooks/useModuleEditor.test.ts
// Unit + integration tests for functions in useModuleEditor.ts & related API calls
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { buildBlankSection, renumberSections, useModuleEditor } from './useModuleEditor';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';

// Create mock user (defaults as logged-in, since editing requires an authenticated admin)
const { mockUseAuth } = vi.hoisted(() => ({ mockUseAuth: vi.fn() }));

vi.mock('@/context/AuthContext', () => ({
	useAuth: mockUseAuth,
}));

const fakeUser = { getIdToken: vi.fn().mockResolvedValue('fake-token') };

beforeEach(() => {
	mockUseAuth.mockReturnValue({ user: fakeUser, loading: false });
});

// A mock "live" module, standing in for what useModuleById would have resolved.
const liveItem = {
	id: '1',
	slug: 'gas-leak-detection',
	badgeNum: 1,
	icon: '💨',
	iconBg: 'rgba(0,180,216,0.15)',
	title: 'Live Title',
	description: 'Live description.',
	sections: [
		{ num: '01', heading: 'Section 1', body: 'Body 1.' },
		{ num: '02', heading: 'Section 2', body: 'Body 2.' },
	],
	keyTakeaway: 'Live key takeaway.',
	status: 'todo' as const,
	progress: 0,
};

// A mock default, standing in for the matching entry in lib/hazardModules.ts
// Deliberately different from liveItem so tests can tell which one a draft came from.
const defaultItem = {
	...liveItem,
	title: 'Default Title',
	description: 'Default description.',
	sections: [{ num: '01', heading: 'Default Section', body: 'Default body.' }],
	keyTakeaway: 'Default key takeaway.',
};

// ─── Unit Tests (test purely internal functions) ────────────────────────────────────────────────────

// 1. Test renumberSections
describe('1. renumberSections', () => {
	it('1.1 assigns num sequentially based on array position', () => {
		const result = renumberSections([
			{ num: '05', heading: 'A', body: 'a' },
			{ num: '02', heading: 'B', body: 'b' },
			{ num: '09', heading: 'C', body: 'c' },
		]);
		// Check that 'num's now sequential (05 → 01, 02 → 02, 09 → 03)
		expect(result.map((s) => s.num)).toEqual(['01', '02', '03']);
	});

	it('1.2 returns an empty array unchanged', () => {
		expect(renumberSections([])).toEqual([]);
	});
});

// 2. Test buildBlankSection
describe('2. buildBlankSection', () => {
	it('2.1 numbers the new section one past the existing count', () => {
		expect(buildBlankSection(2).num).toBe('03');
	});

	it('2.2 seeds placeholder heading/body', () => {
		const section = buildBlankSection(0);
		expect(section.heading).toBeTruthy();   // Check that heading not empty
		expect(section.body).toBeTruthy();      // Check that body not empty
	});
});

// 3. Test edit-mode / draft state
describe('3. useModuleEditor draft state', () => {
	it('3.1 seeds the draft from the live item', () => {
		// Render the hook
		const { result } = renderHook(() => useModuleEditor('hazard-modules', liveItem, defaultItem));
		
		// Check that the draft contains the live item's title
		expect(result.current.draft?.title).toBe('Live Title');
	});

	it('3.2 toggling edit mode off does not discard unsaved field edits', () => {
		const { result } = renderHook(() => useModuleEditor('hazard-modules', liveItem, defaultItem));

		act(() => result.current.toggleEditMode());                       // Enter edit mode
		act(() => result.current.updateField('title', 'Edited Title'));   // Edit title
		act(() => result.current.toggleEditMode());                       // Exit edit mode

		expect(result.current.draft?.title).toBe('Edited Title');         // Check that draft still has the edited title
	});

	it('3.3 resetToDefaults reverts the draft to the bundled fallback, not the live item', () => {
		const { result } = renderHook(() => useModuleEditor('hazard-modules', liveItem, defaultItem));

		act(() => result.current.updateField('title', 'Edited Title'));   // Edit title
		act(() => result.current.resetToDefaults());                      // Reset to defaults

		expect(result.current.draft?.title).toBe('Default Title');        // Check that draft now has the default value
		expect(result.current.draft?.sections).toHaveLength(1);           // Check that the draft's sections have been reset to default (no longer the live item)
	});

	it('3.4 canReset is false when no fallback is provided', () => {
		const { result } = renderHook(() => useModuleEditor('hazard-modules', liveItem, undefined));
		expect(result.current.canReset).toBe(false);
	});

	it('3.5 switching to a different module id exits edit mode and re-seeds the draft', () => {
		const { result, rerender } = renderHook(
			({ item }) => useModuleEditor('hazard-modules', item, defaultItem),
			{ initialProps: { item: liveItem } }
		);

		act(() => result.current.toggleEditMode());   // Enter edit mode
		expect(result.current.editMode).toBe(true);   // Confirm we're in edit mode

		// Change to a different module
		const otherItem = { ...liveItem, id: '2', title: 'Other Module' };
		rerender({ item: otherItem });

		expect(result.current.editMode).toBe(false);                // Confirm edit mode exited
		expect(result.current.draft?.title).toBe('Other Module');   // Confirm draft changed to new module
	});

	it('3.6 a same-id refresh while not editing still resyncs the draft', () => {
		const { result, rerender } = renderHook(
			({ item }) => useModuleEditor('hazard-modules', item, defaultItem),
			{ initialProps: { item: liveItem } }
		);

		// A same-id item update while NOT editing (e.g. a live refresh) should still resync the draft
		const refreshedItem = { ...liveItem, title: 'Refreshed Title' };
		rerender({ item: refreshedItem });

		expect(result.current.draft?.title).toBe('Refreshed Title');
	});
});

// 4. Test section CRUD
describe('4. section add/delete/move', () => {
	it('4.1 addSection appends a renumbered section and selects it', async () => {
		const { result } = renderHook(() => useModuleEditor('hazard-modules', liveItem, defaultItem));

		act(() => result.current.addSection());                                // Add new section
		expect(result.current.draft?.sections).toHaveLength(3);                // Check that sections length accounts for new section
		expect(result.current.draft?.sections[2].num).toBe('03');              // Check that new section numbered correctly

		await waitFor(() => expect(result.current.selectedSection).toBe(2));   // Check that new section is selected
	});

	it('4.2 deleteSection removes a section and renumbers the remainder', () => {
		const { result } = renderHook(() => useModuleEditor('hazard-modules', liveItem, defaultItem));

		act(() => result.current.deleteSection(0));                            // Delete 1st section

		expect(result.current.draft?.sections).toHaveLength(1);                // Check that sections length accounts for deleted section
		expect(result.current.draft?.sections[0].num).toBe('01');              // Check that remaining section renumbered correctly
		expect(result.current.draft?.sections[0].heading).toBe('Section 2');   // Check that remaining section is the correct one
		expect(result.current.selectedSection).toBeNull();                     // Check that no section is selected after deletion
	});

	it('4.3 moveSection swaps two sections and renumbers them', () => {
		const { result } = renderHook(() => useModuleEditor('hazard-modules', liveItem, defaultItem));

		act(() => result.current.moveSection(1, 'up'));                                                     // Move 2nd section up

		expect(result.current.draft?.sections.map((s) => s.heading)).toEqual(['Section 2', 'Section 1']);   // Check that sections swapped
		expect(result.current.draft?.sections.map((s) => s.num)).toEqual(['01', '02']);                     // Check that sections renumbered correctly
	});

	it('4.4 moveSection is a no-op past the array bounds', () => {
		const { result } = renderHook(() => useModuleEditor('hazard-modules', liveItem, defaultItem));

		act(() => result.current.moveSection(0, 'up'));   // Attempt to move first section up (no-op)
		act(() => result.current.moveSection(1, 'down')); // Attempt to move last section down (no-op)

		expect(result.current.draft?.sections.map((s) => s.heading)).toEqual(['Section 1', 'Section 2']);   // Check that section headings unchanged
		expect(result.current.draft?.sections.map((s) => s.num)).toEqual(['01', '02']);                     // Check that section ids unchanged
	});
});

// 5. Test list-item editing within a section
describe('5. section list items', () => {
	it('5.1 addSectionItem appends a placeholder item', () => {
		const { result } = renderHook(() => useModuleEditor('hazard-modules', liveItem, defaultItem));

		act(() => result.current.addSectionItem(0));                             // Add new item to 1st section

		expect(result.current.draft?.sections[0].items).toEqual(['New item']);   // Check that the new item was added to the 1st section
	});

	it('5.2 updateSectionItem edits the item at the given index only', () => {
		const { result } = renderHook(() => useModuleEditor('hazard-modules', liveItem, defaultItem));

		// Add new items to 1st section
		act(() => result.current.addSectionItem(0));
		act(() => result.current.addSectionItem(0));
		// Edit 2nd item in 1st section
		act(() => result.current.updateSectionItem(0, 1, 'Edited item'));

		// Check that only the targeted item was edited
		expect(result.current.draft?.sections[0].items).toEqual(['New item', 'Edited item']);
	});

	it('5.3 deleteSectionItem removes only the targeted item', () => {
		const { result } = renderHook(() => useModuleEditor('hazard-modules', liveItem, defaultItem));

		// Add new items to 1st section
		act(() => result.current.addSectionItem(0));
		act(() => result.current.addSectionItem(0));
		// Delete 1st item in 1st section
		act(() => result.current.deleteSectionItem(0, 0));

		// Check that only the targeted item was deleted
		expect(result.current.draft?.sections[0].items).toEqual(['New item']);
	});
});

// ─── Integration Tests (test API calls with mock server) ────────────────────────────────────────────────────

// 6. Test save-module API call
describe('6. save-module', () => {
	it('6.1 sets saveStatus to saved on a successful save', async () => {
		const { result } = renderHook(() => useModuleEditor('hazard-modules', liveItem, defaultItem));

		// Mock a successful save to Supabase
		await act(async () => {
			await result.current.saveToSupabase();
		});

		expect(result.current.saveStatus).toBe('saved');   // Check that saveStatus correctly set
	});

	it('6.2 sets saveStatus to error when the server reports a failure', async () => {
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		// Mock an error response to saving the module
		server.use(
			http.post('/api/modules/save-module', () =>
				HttpResponse.json({ ok: false, error: 'Access denied' }, { status: 403 })
			)
		);

		const { result } = renderHook(() => useModuleEditor('hazard-modules', liveItem, defaultItem));

		await act(async () => {
			await result.current.saveToSupabase();
		});

		expect(result.current.saveStatus).toBe('error');
		expect(consoleSpy).toHaveBeenCalled();
		consoleSpy.mockRestore();
	});

	it('6.3 sets saveStatus to error on a network failure', async () => {
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		server.use(http.post('/api/modules/save-module', () => HttpResponse.error()));

		const { result } = renderHook(() => useModuleEditor('hazard-modules', liveItem, defaultItem));

		await act(async () => {
			await result.current.saveToSupabase();
		});

		expect(result.current.saveStatus).toBe('error');
		consoleSpy.mockRestore();
	});

	it('6.4 does nothing when there is no signed-in user', async () => {
		mockUseAuth.mockReturnValue({ user: null, loading: false });   // Simulate user being signed out

		const { result } = renderHook(() => useModuleEditor('hazard-modules', liveItem, defaultItem));

		await act(async () => {
			await result.current.saveToSupabase();
		});

		// Status stays idle — the guard clause returns before any fetch/status change.
		expect(result.current.saveStatus).toBe('idle');
	});

	it('6.5 sends the full module + sections payload', async () => {
		let capturedBody: any = null;
		// Mock a successful save to Supabase that sends the saved module data
		server.use(
			http.post('/api/modules/save-module', async ({ request }) => {
				capturedBody = await request.json();
				return HttpResponse.json({ ok: true });
			})
		);

		const { result } = renderHook(() => useModuleEditor('hazard-modules', liveItem, defaultItem));

		act(() => result.current.updateField('title', 'Saved Title'));   // Edit the title before saving

		await act(async () => {
			await result.current.saveToSupabase();
		});

		expect(result.current.saveStatus).toBe('saved');   // Check that saveStatus correctly set
		// Check that sent module data matches what was edited
		expect(capturedBody.section).toBe('hazard-modules');
		expect(capturedBody.module.id).toBe('1');
		expect(capturedBody.module.title).toBe('Saved Title');
		expect(capturedBody.sections).toHaveLength(2);
	});
});
