// hooks/useModules.test.ts
// Unit & Integration tests for functions in useModules.ts & related API calls
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { mapSection, mergeRow, useModules, useModuleById } from './useModules';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';

// Create mock user (defaults as logged-out) that individual tests can choose to change.
const { mockUseAuth } = vi.hoisted(() => ({ mockUseAuth: vi.fn() }));

vi.mock("@/context/AuthContext", () => ({
    useAuth: mockUseAuth,
}));

beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
});

// A minimal fake logged-in user — only getIdToken is used by useModules.
const fakeUser = { getIdToken: vi.fn().mockResolvedValue('fake-token') };

// A mock default used in place of the /lib/hazardModules.ts file
const testModule = {
    id: '1',    // Matches harcoded Supabase row in mock API response
    slug: 'test-module-one',
    badgeNum: 1,
    icon: '🧪',
    iconBg: 'rgba(0,0,0,0.1)',
    title: 'Test Module One',
    description: 'A fixture module used only in these tests.',
    sections: [
        {
            num: '01',
            heading: 'Test Section',
            body: 'Fixture body text.',
        },
    ],
    keyTakeaway: 'Fixture key takeaway.',
    status: 'todo' as const,    // 'as const' prevents TypeScript from widening the literal
    progress: 0,
};

const testModules = [testModule];

// ─── Unit Tests (test purely internal functions) ────────────────────────────────────────────────────

// 1. Test mapSection
describe('1. mapSection', () => {
    // Test if fully populated row mapped correctly
    it('1.1 map a fully populated row', () => {
		const result = mapSection({
			num: '02',
			heading: 'Section 2',
			body: 'This is the second section of the module.',
			list_type: 'ul',
			items: ['Item 1', 'Item 2', 'Item 3'],
			callout: '💡 callout',
		});

		expect(result).toEqual({
			num: '02',
			heading: 'Section 2',
			body: 'This is the second section of the module.',
			listType: 'ul',
			items: ['Item 1', 'Item 2', 'Item 3'],
			callout: '💡 callout',
		});
	});

    // Test if null items are converted to undefined
	it('1.2 convert null list_type/items/callout to undefined', () => {
		const result = mapSection({
			num: '01',
			heading: 'Section 1',
			body: 'This is the 1st section of the module.',
			list_type: null,
			items: null,
			callout: null,
		});

		expect(result.listType).toBeUndefined();
		expect(result.items).toBeUndefined();
		expect(result.callout).toBeUndefined();
	});
});

// 2. Test mergeRow
describe('2. mergeRow', () => {
    // Example data to use in tests (different from mock default)
    const row = {
		id: '1',
		slug: 'gas-leak-detection',
		badge_num: 1,
		icon: '🔥',
		icon_bg: 'rgba(0,180,216,0.15)',
		title: 'Gas Leak Detection',
		description: 'description',
		key_takeaway: 'key takeaway',
		prev_id: null,
		next_id: '2',
		module_sections: [
			{
				num: '01',
				heading: 'Section 1',
				body: 'This is the 1st section of the module.',
				list_type: null,
				items: null,
				callout: null,
			},
		],
	};
    
    // Test if merges correctly (with default status/progress)
    it('2.1 Map a fully populated row (with default status/progress)', () => {
		const result = mergeRow(row, testModule);

		expect(result.id).toBe('1');
		expect(result.slug).toBe('gas-leak-detection');
		expect(result.badgeNum).toBe(1);
		expect(result.icon).toBe('🔥');
		expect(result.iconBg).toBe('rgba(0,180,216,0.15)');
		expect(result.title).toBe('Gas Leak Detection');
		expect(result.description).toBe('description');
		expect(result.keyTakeaway).toBe('key takeaway');
		expect(result.prevId).toBeUndefined();
		expect(result.nextId).toBe('2');
		expect(result.sections).toHaveLength(1);
		
        // status/progress come from the default, not Supabase (Supabase doesn't store them in the same table)
		expect(result.status).toBe(testModule.status);
		expect(result.progress).toBe(testModule.progress);
	});

    // Test if uses default status/progress when no fallback is provided
	it('2.2 falls back to default status/progress values when there is no matching default module', () => {
		const result = mergeRow(row, undefined);

		expect(result.status).toBe('todo');
		expect(result.progress).toBe(0);
	});

    // Test if uses default slug/badgeNum when Supabase has null value
	it('2.3 falls back to default badgeNum only when the row has null value', () => {
		const rowWithNullBadge = { ...row, badge_num: null };

		const result = mergeRow(rowWithNullBadge, testModule);

		expect(result.badgeNum).toBe(testModule.badgeNum);
	});

    // Test if sets slug to undefined when Supabase has null value
    it('2.4 does NOT fall back to the default slug when the row has null value', () => {
		const rowWithNullSlug = { ...row, slug: null };
 
		const result = mergeRow(rowWithNullSlug, testModule);
 
		expect(result.slug).toBeUndefined();
		expect(result.slug).not.toBe(testModule.slug);
	});
});

// 3. Test useModuleById
describe('3. useModuleById', () => {
    // Test if correctly returns matching module
    it('3.1 returns the module matching the given id', async () => {
		const { result } = renderHook(() => useModuleById('hazard-modules', testModules, '1'));

		await waitFor(() => expect(result.current.loadStatus).toBe('ready'));
		expect(result.current.item?.id).toBe('1');
	});

    // Test if returns undefined when no matching module found
	it('3.2 returns undefined when no module matches the given id', async () => {
		const { result } = renderHook(() => useModuleById('hazard-modules', testModules, 'nonexistent'));

		await waitFor(() => expect(result.current.loadStatus).toBe('ready'));
		expect(result.current.item).toBeUndefined();
	});

    // Test if returns undefined when no id provided
	it('3.3 returns undefined when id is undefined', async () => {
		const { result } = renderHook(() => useModuleById('hazard-modules', testModules, undefined));

		await waitFor(() => expect(result.current.loadStatus).toBe('ready'));
		expect(result.current.item).toBeUndefined();
	});
});

// ─── Integration Tests (test API calls with mock server) ────────────────────────────────────────────────────

// 4. Test load-modules API call
describe('4. load-modules', () => {
    // Test if loads successfully
    it('4.1 maps response into module data, including default progress and status values', async () => {
        // Run the functions directly in the hook
        const { result } = renderHook(() => useModules("hazard-modules", testModules));

        // Wait for data to finish loading
        await waitFor(() => expect(result.current.loadStatus).toBe('ready'));

        // Check that modules not empty (& have the right length)
        expect(result.current.modules).toHaveLength(1);

        // Grab the first module to check over (ensures mapping logic works)
        const loadedModule = result.current.modules[0];
        expect(loadedModule.id).toBe('1');
        expect(loadedModule.slug).toBe('gas-leak-detection');
        expect(loadedModule.badgeNum).toBe(1);
        expect(loadedModule.icon).toBe('\u{1F4A8}');
        expect(loadedModule.iconBg).toBe('rgba(0,180,216,0.15)');
        expect(loadedModule.title).toBe('Gas Leak Detection');
        expect(loadedModule.description).toBe('description');
        expect(loadedModule.keyTakeaway).toBe('key takeaway');
        expect(loadedModule.prevId).toBeUndefined();
        expect(loadedModule.nextId).toBe('2');
        
        // Check that the sections are mapped correctly as well
        expect(loadedModule.sections).toHaveLength(3);
        expect(loadedModule.sections[0].num).toBe('01');
        expect(loadedModule.sections[0].heading).toBe('Section 1');
        expect(loadedModule.sections[0].body).toBe('This is the 1st section of the module.');
        expect(loadedModule.sections[0].listType).toBeUndefined();
        expect(loadedModule.sections[0].items).toBeUndefined();
        expect(loadedModule.sections[0].callout).toBeUndefined();
        expect(loadedModule.sections[1].listType).toBe('ul');
        expect(loadedModule.sections[1].items).toEqual(["Item 1", "Item 2", "Item 3"]);
        expect(loadedModule.sections[1].callout).toBe('\u{1F4A1} callout');
        expect(loadedModule.sections[2].listType).toBe('ol');
        expect(loadedModule.sections[2].items).toEqual(["First", "Second", "Third"]);
        expect(loadedModule.sections[2].callout).toBeUndefined();
        
        // This test is with a logged-out user, so the progress and status values (which live in a separate table) fall back to defaults.
		expect(loadedModule.progress).toBe(testModule.progress);
		expect(loadedModule.status).toBe(testModule.status);

        // Live Supabase content loaded successfully — should not be flagged as fallback
        expect(result.current.usingDefaults).toBe(false);
    });
    
    // Test if uses default info when section not found
    it('4.2 fall back to defaults if section is not found', async () => {
        // Replace console error with a fake (avoids clutter)
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        
        // Override default response with fail case
        server.use(
            http.get('/api/load-modules', () => HttpResponse.json({ ok: false, error: 'Missing required "section" query param' }))
        );

        const { result } = renderHook(() => useModules("hazard-modules", testModules));

        await waitFor(() => expect(result.current.loadStatus).toBe('error'));
        // Check that modules still have content (fell back to defaults)
        expect(result.current.modules.length).toBeGreaterThan(0);
        expect(result.current.modules).toEqual(testModules);
        // Check that error was logged to console (ensures error handling works)
        expect(consoleSpy).toHaveBeenCalledWith('load-modules API error:', 'Missing required "section" query param');
        // Should be flagged as showing fallback content, not verified live content
        expect(result.current.usingDefaults).toBe(true);
        // Restore console error to normal (prevents leaking to other tests)
        consoleSpy.mockRestore();
    });
    
    // Test if uses default info when API returns empty
    it('4.3 fall back to defaults if API returns empty', async () => {
        server.use(
            http.get('/api/load-modules', () => HttpResponse.json({ ok: true, data: [] }))
        );

        const { result } = renderHook(() => useModules("hazard-modules", testModules));

        await waitFor(() => expect(result.current.loadStatus).toBe('ready'));
        expect(result.current.modules.length).toBeGreaterThan(0);
        expect(result.current.modules).toEqual(testModules);
        expect(result.current.usingDefaults).toBe(true);
    });
    
    // Test if uses default info when API responds with an error (bad query, policy rejection, data issue, etc.)
    it('4.4 fall back to defaults if API responds with an error', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        
        server.use(
            http.get('/api/load-modules', () => HttpResponse.json({ ok: false, error: 'Supabase error' }, { status: 500 }))
        );
        
        const { result } = renderHook(() => useModules("hazard-modules", testModules));

        await waitFor(() => expect(result.current.loadStatus).toBe('error'));
        expect(result.current.modules.length).toBeGreaterThan(0);
        expect(result.current.modules).toEqual(testModules);
        expect(consoleSpy).toHaveBeenCalledWith('load-modules API error:', 'Supabase error');
        expect(result.current.usingDefaults).toBe(true);
        consoleSpy.mockRestore();
    });
    
    // Test if uses default info when API call fails (internet failure, server crash, etc.)
    it('4.5 fall back to defaults on a network failure', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        server.use(
            http.get('/api/load-modules', () => HttpResponse.error())
        );

        const { result } = renderHook(() => useModules("hazard-modules", testModules));

        await waitFor(() => expect(result.current.loadStatus).toBe('error'));
        expect(result.current.modules.length).toBeGreaterThan(0);
        expect(result.current.modules).toEqual(testModules);
        expect(consoleSpy).toHaveBeenCalledWith('Failed to load "hazard-modules" modules from Supabase — using defaults');
        expect(result.current.usingDefaults).toBe(true);
        consoleSpy.mockRestore();
    });

    // Test if uses default info when API responds with non-JSON (e.g. page crash, proxy timeout, etc.)
    it('4.6 fall back to defaults when the response body is not valid JSON', async () => {
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		server.use(
			http.get('/api/load-modules', () => new HttpResponse('Internal Server Error', { status: 500 }))
		);

		const { result } = renderHook(() => useModules('hazard-modules', testModules));

		await waitFor(() => expect(result.current.loadStatus).toBe('error'));
		expect(result.current.modules.length).toBeGreaterThan(0);
        expect(result.current.modules).toEqual(testModules);
		expect(consoleSpy).toHaveBeenCalledWith('Failed to load "hazard-modules" modules from Supabase — using defaults');
		expect(result.current.usingDefaults).toBe(true);
        consoleSpy.mockRestore();
	});
});

// 5. Test using modules/progress to merge in per-user progress onto loaded modules.
describe('5. modules/progress', () => {
    // Test if successfully overrides with 'live' progress/status values
    it('5.1 overrides fallback status/progress with a live progress record for a completed module', async () => {
        mockUseAuth.mockReturnValue({ user: fakeUser, loading: false });

        const { result } = renderHook(() => useModules('hazard-modules', testModules));

        await waitFor(() => expect(result.current.loadStatus).toBe('ready'));

        const loadedModule = result.current.modules.find((m) => m.id === '1');
        expect(loadedModule?.progress).toBe(100);
        expect(loadedModule?.status).toBe('done');
    });

    // Test if 'done' status maintained even if progress != 100
    it('5.2 honors an explicit "done" status from a live record even when progress is below 100', async () => {
        mockUseAuth.mockReturnValue({ user: fakeUser, loading: false });

        server.use(
            http.get('/api/modules/progress', () => HttpResponse.json({
                ok: true,
                progress: [{ module_id: '1', progress: 60, status: 'done' }],
            }))
        );

        const { result } = renderHook(() => useModules('hazard-modules', testModules));

        await waitFor(() => expect(result.current.loadStatus).toBe('ready'));

        const loadedModule = result.current.modules.find((m) => m.id === '1');
        expect(loadedModule?.progress).toBe(60);
        expect(loadedModule?.status).toBe('done');
    });

    // Test if correctly infers status based on progress value.
    it('5.3 derives status from progress magnitude alone when a live record has no status field', async () => {
        mockUseAuth.mockReturnValue({ user: fakeUser, loading: false });

        server.use(
            http.get('/api/modules/progress', () => HttpResponse.json({
                ok: true,
                progress: [{ module_id: '1', progress: 45 }],
            }))
        );

        const { result } = renderHook(() => useModules('hazard-modules', testModules));

        await waitFor(() => expect(result.current.loadStatus).toBe('ready'));

        const loadedModule = result.current.modules.find((m) => m.id === '1');
        // no explicit status — derived as "progress" since 0 < 45 < 100
        expect(loadedModule?.progress).toBe(45);
        expect(loadedModule?.status).toBe('progress');
    });

    // Test if clamps above-maximum progress value to the valid range.
    it('5.4 clamps an above-maximum progress value from a live record to 100', async () => {
        mockUseAuth.mockReturnValue({ user: fakeUser, loading: false });

        server.use(
            http.get('/api/modules/progress', () => HttpResponse.json({
                ok: true,
                progress: [{ module_id: '1', progress: 150 }],
            }))
        );

        const { result } = renderHook(() => useModules('hazard-modules', testModules));

        await waitFor(() => expect(result.current.loadStatus).toBe('ready'));

        const loadedModule = result.current.modules.find((m) => m.id === '1');
        // progress is clamped to 100, and status derived as "done" since progress >= 100
        expect(loadedModule?.progress).toBe(100);
        expect(loadedModule?.status).toBe('done');
    });

    // Test if clamps below-minimum progress value to the valid range.
    it('5.5 clamps a below-minimum progress value from a live record to 0', async () => {
        mockUseAuth.mockReturnValue({ user: fakeUser, loading: false });

        server.use(
            http.get('/api/modules/progress', () => HttpResponse.json({
                ok: true,
                progress: [{ module_id: '1', progress: -20 }],
            }))
        );

        // Make the default different from what the mock response will clamp to (in case the mock response doesn't come through)
        const customDefaults = [
            {
                ...testModule,
                status: 'done' as const,
                progress: 100,
            },
        ];

        const { result } = renderHook(() => useModules('hazard-modules', customDefaults));

        await waitFor(() => expect(result.current.loadStatus).toBe('ready'));

        const loadedModule = result.current.modules.find((m) => m.id === '1');
        // progress is clamped to 0, and status derived as "todo" since progress is not > 0
        expect(loadedModule?.progress).toBe(0);
        expect(loadedModule?.status).toBe('todo');
    });

    // Test if maintains non-default values when logged in but having no live record.
    it('5.6 preserves a non-default (done/100) fallback status/progress when logged in but no matching progress record exists', async () => {
        mockUseAuth.mockReturnValue({ user: fakeUser, loading: false });

        server.use(
            http.get('/api/modules/progress', () => HttpResponse.json({ ok: true, progress: [] }))
        );

        const customDefaults = [
            {
                ...testModule,
                status: 'done' as const,
                progress: 100,
            },
        ];

        const { result } = renderHook(() => useModules('hazard-modules', customDefaults));

        await waitFor(() => expect(result.current.loadStatus).toBe('ready'));

        const loadedModule = result.current.modules.find((m) => m.id === '1');
        expect(loadedModule?.status).toBe('done');
        expect(loadedModule?.progress).toBe(100);
    });

    // Test if maintains non-default values when logged out.
    it('5.7 preserves a non-default (done/100) fallback status/progress when logged out', async () => {
        const customDefaults = [
            {
                ...testModule,
                status: 'done' as const,
                progress: 100,
            },
        ];

        const { result } = renderHook(() => useModules('hazard-modules', customDefaults));

        await waitFor(() => expect(result.current.loadStatus).toBe('ready'));

        const loadedModule = result.current.modules.find((m) => m.id === '1');
        expect(loadedModule?.status).toBe('done');
        expect(loadedModule?.progress).toBe(100);
    });
});
