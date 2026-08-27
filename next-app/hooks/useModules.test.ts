// hooks/useModules.test.ts
// Unit & Integration tests for functions in useModules.ts & related API calls
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { createRef } from 'react';
import { mapSection, mergeRow, useModules, useModuleById } from './useModules';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';
import { hazardModules } from '@/lib/hazardModules';
vi.mock("@/context/AuthContext", () => ({
    useAuth: () => ({
        user: null,
        loading: false,
    }),
}));

// â”€â”€â”€ Unit Tests (test purely internal functions) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
			callout: 'ðŸ’¡ callout',
		});

		expect(result).toEqual({
			num: '02',
			heading: 'Section 2',
			body: 'This is the second section of the module.',
			listType: 'ul',
			items: ['Item 1', 'Item 2', 'Item 3'],
			callout: 'ðŸ’¡ callout',
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
    // Example data to use in tests
    const row = {
		id: '1',
		slug: 'gas-leak-detection',
		badge_num: 1,
		icon: 'ðŸ’¨',
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
		const defaultModule = hazardModules.find((m) => m.id === '1')!;
		const result = mergeRow(row, defaultModule);

		expect(result.id).toBe('1');
		expect(result.slug).toBe('gas-leak-detection');
		expect(result.badgeNum).toBe(1);
		expect(result.icon).toBe('ðŸ’¨');
		expect(result.iconBg).toBe('rgba(0,180,216,0.15)');
		expect(result.title).toBe('Gas Leak Detection');
		expect(result.description).toBe('description');
		expect(result.keyTakeaway).toBe('key takeaway');
		expect(result.prevId).toBeUndefined();
		expect(result.nextId).toBe('2');
		expect(result.sections).toHaveLength(1);
		
        // status/progress come from the default, not Supabase (Supabase doesn't store them in the same table)
		expect(result.status).toBe(defaultModule.status);
		expect(result.progress).toBe(defaultModule.progress);
	});

    // Test if uses default status/progress when no fallback is provided
	it('2.2 falls back to default status/progress values when there is no matching default module', () => {
		const result = mergeRow(row, undefined);

		expect(result.status).toBe('todo');
		expect(result.progress).toBe(0);
	});

    // Test if uses default slug/badgeNum when Supabase has null value
	it('2.3 falls back to default badgeNum only when the row has null value', () => {
		const defaultModule = hazardModules.find((m) => m.id === '1')!;
		const rowWithNullBadge = { ...row, badge_num: null };

		const result = mergeRow(rowWithNullBadge, defaultModule);

		expect(result.badgeNum).toBe(defaultModule.badgeNum);
	});

    // Test if sets slug to undefined when Supabase has null value
    it('2.4 does NOT fall back to the default slug when the row has null value', () => {
		const defaultModule = hazardModules.find((m) => m.id === '1')!;
		const rowWithNullSlug = { ...row, slug: null };
 
		const result = mergeRow(rowWithNullSlug, defaultModule);
 
		expect(result.slug).toBeUndefined();
		expect(result.slug).not.toBe(defaultModule.slug);
	});
});

// 3. Test useModuleById
describe('3. useModuleById', () => {
    // Test if correctly returns matching module
    it('3.1 returns the module matching the given id', async () => {
		const { result } = renderHook(() => useModuleById('hazard-modules', hazardModules, '1'));

		await waitFor(() => expect(result.current.loadStatus).toBe('ready'));
		expect(result.current.item?.id).toBe('1');
	});

    // Test if returns undefined when no matching module found
	it('3.2 returns undefined when no module matches the given id', async () => {
		const { result } = renderHook(() => useModuleById('hazard-modules', hazardModules, 'nonexistent'));

		await waitFor(() => expect(result.current.loadStatus).toBe('ready'));
		expect(result.current.item).toBeUndefined();
	});

    // Test if returns undefined when no id provided
	it('3.3 returns undefined when id is undefined', async () => {
		const { result } = renderHook(() => useModuleById('hazard-modules', hazardModules, undefined));

		await waitFor(() => expect(result.current.loadStatus).toBe('ready'));
		expect(result.current.item).toBeUndefined();
	});
});

// â”€â”€â”€ Integration Tests (test API calls with mock server) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// 4. Test load-modules API call
describe('4. load-modules', () => {
    // Test if loads successfully
    it('4.1 maps response into module data, including default progress and status values', async () => {
        // Run the functions directly in the hook
        const { result } = renderHook(() => useModules("hazard-modules", hazardModules));

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
        
        // progress & status aren't stored in Supabase â€” they should default to the fallback values
        const defaultModule = hazardModules.find((m) => m.id === '1')!;
		expect(loadedModule.progress).toBe(defaultModule.progress);
		expect(loadedModule.status).toBe(defaultModule.status);
    });
    
    // Test if uses default info when section not found
    it('4.2 fall back to defaults if section is not found', async () => {
        // Replace console error with a fake (avoids clutter)
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        
        // Override default response with fail case
        server.use(
            http.get('/api/load-modules', () => HttpResponse.json({ ok: false, error: 'Missing required "section" query param' }))
        );

        const { result } = renderHook(() => useModules("hazard-modules", hazardModules));

        await waitFor(() => expect(result.current.loadStatus).toBe('error'));
        // Check that modules still have content (fell back to defaults)
        expect(result.current.modules.length).toBeGreaterThan(0);
        expect(result.current.modules).toEqual(hazardModules);
        // Check that error was logged to console (ensures error handling works)
        expect(consoleSpy).toHaveBeenCalledWith('load-modules API error:', 'Missing required "section" query param');
        // Restore console error to normal (prevents leaking to other tests)
        consoleSpy.mockRestore();
    });
    
    // Test if uses default info when API returns empty
    it('4.3 fall back to defaults if API returns empty', async () => {
        server.use(
            http.get('/api/load-modules', () => HttpResponse.json({ ok: true, data: [] }))
        );

        const { result } = renderHook(() => useModules("hazard-modules", hazardModules));

        await waitFor(() => expect(result.current.loadStatus).toBe('ready'));
        expect(result.current.modules.length).toBeGreaterThan(0);
        expect(result.current.modules).toEqual(hazardModules);
    });
    
    // Test if uses default info when API responds with an error (bad query, policy rejection, data issue, etc.)
    it('4.4 fall back to defaults if API responds with an error', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        
        server.use(
            http.get('/api/load-modules', () => HttpResponse.json({ ok: false, error: 'Supabase error' }, { status: 500 }))
        );
        
        const { result } = renderHook(() => useModules("hazard-modules", hazardModules));

        await waitFor(() => expect(result.current.loadStatus).toBe('error'));
        expect(result.current.modules.length).toBeGreaterThan(0);
        expect(result.current.modules).toEqual(hazardModules);
        expect(consoleSpy).toHaveBeenCalledWith('load-modules API error:', 'Supabase error');
        consoleSpy.mockRestore();
    });
    
    // Test if uses default info when API call fails (internet failure, server crash, etc.)
    it('4.5 fall back to defaults on a network failure', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        server.use(
            http.get('/api/load-modules', () => HttpResponse.error())
        );

        const { result } = renderHook(() => useModules("hazard-modules", hazardModules));

        await waitFor(() => expect(result.current.loadStatus).toBe('error'));
        expect(result.current.modules.length).toBeGreaterThan(0);
        expect(result.current.modules).toEqual(hazardModules);
        expect(consoleSpy).toHaveBeenCalledWith('Failed to load "hazard-modules" modules from Supabase — using defaults');
        consoleSpy.mockRestore();
    });

    // Test if uses default info when API responds with non-JSON (e.g. page crash, proxy timeout, etc.)
    it('4.6 fall back to defaults when the response body is not valid JSON', async () => {
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		server.use(
			http.get('/api/load-modules', () => new HttpResponse('Internal Server Error', { status: 500 }))
		);

		const { result } = renderHook(() => useModules('hazard-modules', hazardModules));

		await waitFor(() => expect(result.current.loadStatus).toBe('error'));
		expect(result.current.modules.length).toBeGreaterThan(0);
        expect(result.current.modules).toEqual(hazardModules);
		expect(consoleSpy).toHaveBeenCalledWith('Failed to load "hazard-modules" modules from Supabase — using defaults');
		consoleSpy.mockRestore();
	});
});
