// hooks/modules/useModuleEditor.test.ts
// Unit + integration tests for functions in useModuleEditor.ts & related API calls
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { buildBlankSection, renumberSections, snapshotModule, useModuleEditor } from './useModuleEditor';
import { server } from '../../mocks/server';
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
		const { result } = renderHook(() => useModuleEditor('hazards', liveItem, defaultItem));
		
		// Check that the draft contains the live item's title
		expect(result.current.draft?.title).toBe('Live Title');
	});

	it('3.2 toggling edit mode off does not discard unsaved field edits', () => {
		const { result } = renderHook(() => useModuleEditor('hazards', liveItem, defaultItem));

		act(() => result.current.toggleEditMode());                       // Enter edit mode
		act(() => result.current.updateField('title', 'Edited Title'));   // Edit title
		act(() => result.current.toggleEditMode());                       // Exit edit mode

		expect(result.current.draft?.title).toBe('Edited Title');         // Check that draft still has the edited title
		expect(result.current.hasUnsavedChanges).toBe(true);              // Check the edit still counts as unsaved with edit mode off
	});

	it('3.3 resetToDefaults reverts the draft to the bundled fallback, not the live item', () => {
		const { result } = renderHook(() => useModuleEditor('hazards', liveItem, defaultItem));

		act(() => result.current.updateField('title', 'Edited Title'));   // Edit title
		act(() => result.current.resetToDefaults());                      // Reset to defaults

		expect(result.current.draft?.title).toBe('Default Title');        // Check that draft now has the default value
		expect(result.current.draft?.sections).toHaveLength(1);           // Check that the draft's sections have been reset to default (no longer the live item)
		expect(result.current.hasUnsavedChanges).toBe(true);              // Check the reset counts as unsaved (defaults differ from the live item)
	});

	it('3.4 canReset is false when no fallback is provided', () => {
		const { result } = renderHook(() => useModuleEditor('hazards', liveItem, undefined));
		expect(result.current.canReset).toBe(false);
	});

	it('3.5 switching to a different module id exits edit mode and re-seeds the draft', () => {
		const { result, rerender } = renderHook(
			({ item }) => useModuleEditor('hazards', item, defaultItem),
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
			({ item }) => useModuleEditor('hazards', item, defaultItem),
			{ initialProps: { item: liveItem } }
		);

		// A same-id item update while NOT editing (e.g. a live refresh) should still resync the draft
		const refreshedItem = { ...liveItem, title: 'Refreshed Title' };
		rerender({ item: refreshedItem });

		expect(result.current.draft?.title).toBe('Refreshed Title');
		expect(result.current.hasUnsavedChanges).toBe(false);   // Check the refresh became the new baseline
	});

	// Regression: a refresh arriving after edit mode was turned off used to replace the unsaved draft
	it('3.7 a same-id refresh while edit mode is off does not discard unsaved edits', () => {
		const { result, rerender } = renderHook(
			({ item }) => useModuleEditor('hazards', item, defaultItem),
			{ initialProps: { item: liveItem } }
		);

		act(() => result.current.toggleEditMode());                       // Enter edit mode
		act(() => result.current.updateField('title', 'Edited Title'));   // Edit title
		act(() => result.current.toggleEditMode());                       // Exit edit mode

		rerender({ item: { ...liveItem, description: 'Refreshed description.' } });

		expect(result.current.draft?.title).toBe('Edited Title');         // Check that the edit was not clobbered
		expect(result.current.hasUnsavedChanges).toBe(true);              // Check it counts as unsaved against the refreshed data
	});

	it('3.8 a same-id refresh in edit mode with nothing edited follows the refreshed item and stays clean', () => {
		const { result, rerender } = renderHook(
			({ item }) => useModuleEditor('hazards', item, defaultItem),
			{ initialProps: { item: liveItem } }
		);

		act(() => result.current.toggleEditMode());   // Enter edit mode without editing anything

		rerender({ item: { ...liveItem, title: 'Refreshed Title' } });

		expect(result.current.draft?.title).toBe('Refreshed Title');   // Check that the draft followed the refresh
		expect(result.current.hasUnsavedChanges).toBe(false);          // Check that the refresh isn't counted as an edit
	});
});

// 4. Test section CRUD
describe('4. section add/delete/move', () => {
	it('4.1 addSection appends a renumbered section and selects it', async () => {
		const { result } = renderHook(() => useModuleEditor('hazards', liveItem, defaultItem));

		act(() => result.current.addSection());                                // Add new section
		expect(result.current.draft?.sections).toHaveLength(3);                // Check that sections length accounts for new section
		expect(result.current.draft?.sections[2].num).toBe('03');              // Check that new section numbered correctly

		await waitFor(() => expect(result.current.selectedSection).toBe(2));   // Check that new section is selected
	});

	it('4.2 deleteSection removes a section and renumbers the remainder', () => {
		const { result } = renderHook(() => useModuleEditor('hazards', liveItem, defaultItem));

		act(() => result.current.deleteSection(0));                            // Delete 1st section

		expect(result.current.draft?.sections).toHaveLength(1);                // Check that sections length accounts for deleted section
		expect(result.current.draft?.sections[0].num).toBe('01');              // Check that remaining section renumbered correctly
		expect(result.current.draft?.sections[0].heading).toBe('Section 2');   // Check that remaining section is the correct one
		expect(result.current.selectedSection).toBeNull();                     // Check that no section is selected after deletion
	});

	it('4.3 moveSection swaps two sections and renumbers them', () => {
		const { result } = renderHook(() => useModuleEditor('hazards', liveItem, defaultItem));

		act(() => result.current.moveSection(1, 'up'));                                                     // Move 2nd section up

		expect(result.current.draft?.sections.map((s) => s.heading)).toEqual(['Section 2', 'Section 1']);   // Check that sections swapped
		expect(result.current.draft?.sections.map((s) => s.num)).toEqual(['01', '02']);                     // Check that sections renumbered correctly
	});

	it('4.4 moveSection is a no-op past the array bounds', () => {
		const { result } = renderHook(() => useModuleEditor('hazards', liveItem, defaultItem));

		act(() => result.current.moveSection(0, 'up'));   // Attempt to move first section up (no-op)
		act(() => result.current.moveSection(1, 'down')); // Attempt to move last section down (no-op)

		expect(result.current.draft?.sections.map((s) => s.heading)).toEqual(['Section 1', 'Section 2']);   // Check that section headings unchanged
		expect(result.current.draft?.sections.map((s) => s.num)).toEqual(['01', '02']);                     // Check that section ids unchanged
	});
});

// 5. Test list-item editing within a section
describe('5. section list items', () => {
	it('5.1 addSectionItem appends a placeholder item', () => {
		const { result } = renderHook(() => useModuleEditor('hazards', liveItem, defaultItem));

		act(() => result.current.addSectionItem(0));                             // Add new item to 1st section

		expect(result.current.draft?.sections[0].items).toEqual(['New item']);   // Check that the new item was added to the 1st section
	});

	it('5.2 updateSectionItem edits the item at the given index only', () => {
		const { result } = renderHook(() => useModuleEditor('hazards', liveItem, defaultItem));

		// Add new items to 1st section
		act(() => result.current.addSectionItem(0));
		act(() => result.current.addSectionItem(0));
		// Edit 2nd item in 1st section
		act(() => result.current.updateSectionItem(0, 1, 'Edited item'));

		// Check that only the targeted item was edited
		expect(result.current.draft?.sections[0].items).toEqual(['New item', 'Edited item']);
	});

	it('5.3 deleteSectionItem removes only the targeted item', () => {
		const { result } = renderHook(() => useModuleEditor('hazards', liveItem, defaultItem));

		// Add new items to 1st section
		act(() => result.current.addSectionItem(0));
		act(() => result.current.addSectionItem(0));
		// Delete 1st item in 1st section
		act(() => result.current.deleteSectionItem(0, 0));

		// Check that only the targeted item was deleted
		expect(result.current.draft?.sections[0].items).toEqual(['New item']);
	});
});

// 6. Test snapshotModule (the helper behind hasUnsavedChanges)
describe('6. snapshotModule', () => {
	// Returns liveItem with the first section patched
	const withSection = (patch: Record<string, unknown>) =>
		({ ...liveItem, sections: [{ ...liveItem.sections[0], ...patch }, liveItem.sections[1]] }) as any;

	// Videos persist immediately via /api/modules/video, and aren't part of Save
	it('6.1 ignores video fields', () => {
		const withVideo = { ...liveItem, videoUrl: 'https://youtu.be/abc', videoType: 'youtube' } as any;
		expect(snapshotModule(withVideo)).toBe(snapshotModule(liveItem as any));
	});

	// The editor's inputs produce undefined for blank optional fields; Supabase returns null
	it('6.2 treats undefined and null optional fields the same', () => {
		const withUndefined = { ...liveItem, slug: undefined, prevId: undefined, nextId: undefined } as any;
		const withNull = { ...liveItem, slug: null, prevId: null, nextId: null } as any;
		expect(snapshotModule(withUndefined)).toBe(snapshotModule(withNull));
		expect(snapshotModule(withSection({ listType: undefined, callout: undefined })))
			.toBe(snapshotModule(withSection({ listType: null, callout: null })));
	});

	// Adding then deleting a list item leaves [] where there was undefined
	it('6.3 treats a missing and an empty list of items the same', () => {
		expect(snapshotModule(withSection({ items: undefined }))).toBe(snapshotModule(withSection({ items: [] })));
	});

	// ModuleEditor casts the typed string to the badgeNum type
	it('6.4 treats badgeNum the same as a number or a string', () => {
		expect(snapshotModule({ ...liveItem, badgeNum: '1' } as any)).toBe(snapshotModule(liveItem as any));
	});

	it('6.5 differs when any persisted field differs', () => {
		const base = snapshotModule(liveItem as any);

		[{ title: 'X' }, { description: 'X' }, { keyTakeaway: 'X' }, { icon: 'X' }, { iconBg: 'X' },
		 { slug: 'x' }, { prevId: 'x' }, { nextId: 'x' }, { badgeNum: 2 }].forEach((patch) => {
			expect(snapshotModule({ ...liveItem, ...patch } as any)).not.toBe(base);
		});

		[{ heading: 'X' }, { body: 'X' }, { listType: 'ul' }, { items: ['a'] }, { callout: 'X' }].forEach((patch) => {
			expect(snapshotModule(withSection(patch))).not.toBe(base);
		});

		const reordered = { ...liveItem, sections: [liveItem.sections[1], liveItem.sections[0]] } as any;
		expect(snapshotModule(reordered)).not.toBe(base);
	});
});

// 7. Test hasUnsavedChanges
// Note: some of these wait on the save API, but they're testing hasUnsavedChanges, not the API call itself.
describe('7. hasUnsavedChanges', () => {
	const renderEditor = () =>
		renderHook(
			({ item }: { item: typeof liveItem }) => useModuleEditor('hazards', item, defaultItem),
			{ initialProps: { item: liveItem } }
		);

	it('7.1 is false before anything is edited, true after an edit, and false again if the edit is reverted', () => {
		const { result } = renderEditor();
		expect(result.current.hasUnsavedChanges).toBe(false);
		act(() => result.current.updateField('title', 'Edited Title'));
		expect(result.current.hasUnsavedChanges).toBe(true);
		act(() => result.current.updateField('title', 'Live Title'));
		expect(result.current.hasUnsavedChanges).toBe(false);
	});

	it('7.2 is true after section and list item edits, and false again once they are undone', () => {
		const { result } = renderEditor();

		act(() => result.current.updateSection(0, 'heading', 'Changed'));
		expect(result.current.hasUnsavedChanges).toBe(true);
		act(() => result.current.updateSection(0, 'heading', 'Section 1'));
		expect(result.current.hasUnsavedChanges).toBe(false);

		act(() => result.current.addSection());
		expect(result.current.hasUnsavedChanges).toBe(true);
		act(() => result.current.deleteSection(result.current.draft!.sections.length - 1));
		expect(result.current.hasUnsavedChanges).toBe(false);

		act(() => result.current.addSectionItem(0));
		expect(result.current.hasUnsavedChanges).toBe(true);
		act(() => result.current.deleteSectionItem(0, 0));
		expect(result.current.hasUnsavedChanges).toBe(false);   // [] vs undefined items counts as unchanged
	});

	// The reader page calls updateField for videos after /api/modules/video succeeds
	it('7.3 ignores embedded video changes', () => {
		const { result } = renderEditor();
		act(() => {
			result.current.updateField('videoUrl', 'https://youtu.be/abc');
			result.current.updateField('videoType', 'youtube');
		});
		expect(result.current.hasUnsavedChanges).toBe(false);
	});

	it('7.4 a refresh while in edit mode keeps the draft, and it counts as unsaved against the refreshed data', () => {
		const { result, rerender } = renderEditor();
		act(() => result.current.toggleEditMode());
		act(() => result.current.updateField('title', 'Edited Title'));

		rerender({ item: { ...liveItem, title: 'Refreshed From Server' } });

		expect(result.current.draft?.title).toBe('Edited Title');
		expect(result.current.hasUnsavedChanges).toBe(true);
	});

	it('7.5 switching to a different module id clears it', () => {
		const { result, rerender } = renderEditor();
		act(() => result.current.updateField('title', 'Edited Title'));
		expect(result.current.hasUnsavedChanges).toBe(true);

		rerender({ item: { ...liveItem, id: '2', title: 'Other Module' } });

		expect(result.current.hasUnsavedChanges).toBe(false);
	});

	it('7.6 Reset to Defaults is not unsaved when the live module already matches the defaults', () => {
		const { result } = renderHook(() => useModuleEditor('hazards', defaultItem, defaultItem));
		act(() => result.current.updateField('title', 'Edited Title'));
		expect(result.current.hasUnsavedChanges).toBe(true);
		act(() => result.current.resetToDefaults());
		expect(result.current.hasUnsavedChanges).toBe(false);
	});

	it('7.7 becomes false after a successful save', async () => {
		const { result } = renderEditor();
		act(() => result.current.updateField('title', 'Edited Title'));

		await act(async () => { await result.current.saveToSupabase(); });

		expect(result.current.saveStatus).toBe('saved');
		expect(result.current.hasUnsavedChanges).toBe(false);
	});

	it('7.8 stays true after a failed save', async () => {
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		server.use(
			http.post('/api/modules/save-module', () =>
				HttpResponse.json({ ok: false, error: 'Access denied' }, { status: 403 })
			)
		);

		const { result } = renderEditor();
		act(() => result.current.updateField('title', 'Edited Title'));
		await act(async () => { await result.current.saveToSupabase(); });

		expect(result.current.saveStatus).toBe('error');
		expect(result.current.hasUnsavedChanges).toBe(true);
		consoleSpy.mockRestore();
	});

	it('7.9 keeps edits made while a save is in flight marked as unsaved', async () => {
		let release!: () => void;
		const gate = new Promise<void>((resolve) => { release = resolve; });
		server.use(
			http.post('/api/modules/save-module', async () => {
				await gate;
				return HttpResponse.json({ ok: true });
			})
		);

		const { result } = renderEditor();
		act(() => result.current.updateField('title', 'First edit'));

		let savePromise!: Promise<void>;
		act(() => { savePromise = result.current.saveToSupabase(); });
		act(() => result.current.updateField('title', 'Second edit'));   // edited while the request is in flight

		await act(async () => { release(); await savePromise; });
		expect(result.current.hasUnsavedChanges).toBe(true);
	});
});

// ─── Integration Tests (test API calls with mock server) ────────────────────────────────────────────────────

// 8. Test save-module API call
describe('8. save-module', () => {
	it('8.1 sets saveStatus to saved on a successful save', async () => {
		const { result } = renderHook(() => useModuleEditor('hazards', liveItem, defaultItem));

		// Mock a successful save to Supabase
		await act(async () => {
			await result.current.saveToSupabase();
		});

		expect(result.current.saveStatus).toBe('saved');   // Check that saveStatus correctly set
	});

	it('8.2 sets saveStatus to error when the server reports a failure', async () => {
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		// Mock an error response to saving the module
		server.use(
			http.post('/api/modules/save-module', () =>
				HttpResponse.json({ ok: false, error: 'Access denied' }, { status: 403 })
			)
		);

		const { result } = renderHook(() => useModuleEditor('hazards', liveItem, defaultItem));

		await act(async () => {
			await result.current.saveToSupabase();
		});

		expect(result.current.saveStatus).toBe('error');
		expect(consoleSpy).toHaveBeenCalled();
		consoleSpy.mockRestore();
	});

	it('8.3 sets saveStatus to error on a network failure', async () => {
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		server.use(http.post('/api/modules/save-module', () => HttpResponse.error()));

		const { result } = renderHook(() => useModuleEditor('hazards', liveItem, defaultItem));

		await act(async () => {
			await result.current.saveToSupabase();
		});

		expect(result.current.saveStatus).toBe('error');
		consoleSpy.mockRestore();
	});

	it('8.4 does nothing when there is no signed-in user', async () => {
		mockUseAuth.mockReturnValue({ user: null, loading: false });   // Simulate user being signed out

		const { result } = renderHook(() => useModuleEditor('hazards', liveItem, defaultItem));

		await act(async () => {
			await result.current.saveToSupabase();
		});

		// Status stays idle — the guard clause returns before any fetch/status change.
		expect(result.current.saveStatus).toBe('idle');
	});

	it('8.5 sends the full module + sections payload', async () => {
		let capturedBody: any = null;
		// Mock a successful save to Supabase that sends the saved module data
		server.use(
			http.post('/api/modules/save-module', async ({ request }) => {
				capturedBody = await request.json();
				return HttpResponse.json({ ok: true });
			})
		);

		const { result } = renderHook(() => useModuleEditor('hazards', liveItem, defaultItem));

		act(() => result.current.updateField('title', 'Saved Title'));   // Edit the title before saving

		await act(async () => {
			await result.current.saveToSupabase();
		});

		expect(result.current.saveStatus).toBe('saved');   // Check that saveStatus correctly set
		// Check that sent module data matches what was edited
		expect(capturedBody.topic).toBe('hazards');
		expect(capturedBody.module.id).toBe('1');
		expect(capturedBody.module.title).toBe('Saved Title');
		expect(capturedBody.sections).toHaveLength(2);
	});
});
