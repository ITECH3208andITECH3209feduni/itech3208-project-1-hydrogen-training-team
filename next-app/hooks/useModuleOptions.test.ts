// hooks/useModuleOptions.test.ts
// Unit & Integration tests for useModuleOptions.ts & its API call
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useModuleOptions } from './useModuleOptions';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';

// ─── Unit Tests (test purely internal functions) ───────────────
// None here (all tests go through API call, therefore integration tests)

// ─── Integration Tests (test API calls with mock server) ───────────────

// 1. Test load-module-options API call
describe('1. load-module-options', () => {
  // Test if loads successfully and groups the flat row list into one entry per section (i.e. go from one section - one ID, to one section - many IDs)
  it('1.1 groups rows into one ModuleSectionOptions entry per section', async () => {
    const { result } = renderHook(() => useModuleOptions());

    // Hook exposes no loadStatus — wait on the grouped result itself settling
    await waitFor(() => expect(result.current.length).toBeGreaterThan(0));

    expect(result.current).toHaveLength(2);

    const hazardSection = result.current.find((s) => s.value === 'hazard-modules');
    const guidesSection = result.current.find((s) => s.value === 'guides');

    expect(hazardSection).toBeDefined();
    expect(guidesSection).toBeDefined();

    expect(hazardSection!.options).toEqual([
      { id: '1', title: 'Gas Leak Detection', badgeNum: 1 },
      { id: '2', title: 'Ventilation System', badgeNum: 2 },
    ]);
    expect(guidesSection!.options).toEqual([
      { id: '1', title: 'Sample Guide One', badgeNum: null },
      { id: '2', title: 'Sample Guide Two', badgeNum: null },
    ]);
  });

  // Test if rows for the same section are grouped together even when not sorted together
  it('1.2 groups non-contiguous rows for the same section together', async () => {
    server.use(
      http.get('/api/load-module-options', () => HttpResponse.json({
        ok: true,
        data: [
          { section: 'hazard-modules', id: '1', badge_num: 1, title: 'Gas Leak Detection' },
          { section: 'guides', id: '1', badge_num: null, title: 'Sample Guide One' },
          { section: 'hazard-modules', id: '2', badge_num: 2, title: 'Ventilation System' },
        ],
      }))
    );

    const { result } = renderHook(() => useModuleOptions());

    await waitFor(() => expect(result.current.length).toBeGreaterThan(0));

    const hazardSection = result.current.find((s) => s.value === 'hazard-modules');
    expect(hazardSection!.options).toHaveLength(2);
    expect(hazardSection!.options.map((o) => o.id)).toEqual(['1', '2']);
  });

  // Test if a null badge_num is kept as null rather than dropped or changed to 0/undefined
  it('1.3 preserves a null badgeNum rather than coercing or dropping it', async () => {
    server.use(
      http.get('/api/load-module-options', () => HttpResponse.json({
        ok: true,
        data: [{ section: 'guides', id: '1', badge_num: null, title: 'Sample Guide One' }],
      }))
    );

    const { result } = renderHook(() => useModuleOptions());

    await waitFor(() => expect(result.current.length).toBeGreaterThan(0));
    expect(result.current[0].options[0]).toEqual({ id: '1', title: 'Sample Guide One', badgeNum: null });
  });

  // Test if returns an empty array when API responds with an error
  it('1.4 resolves to an empty array when the API responds with an error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    server.use(
      http.get('/api/load-module-options', () => HttpResponse.json({ ok: false, error: 'Supabase error' }, { status: 500 }))
    );

    const { result } = renderHook(() => useModuleOptions());

    await waitFor(() => expect(consoleSpy).toHaveBeenCalled());
    expect(result.current).toEqual([]);
    expect(consoleSpy).toHaveBeenCalledWith('load-module-options API error:', 'Supabase error');

    consoleSpy.mockRestore();
  });

  // Test if returns an empty array when the API returns empty
  it('1.5 resolves to an empty array when the API returns no rows', async () => {
    let called = false;
    server.use(
      http.get('/api/load-module-options', () => {
        called = true;
        return HttpResponse.json({ ok: true, data: [] });
      })
    );

    const { result } = renderHook(() => useModuleOptions());

    // Confirm the request was actually processed (not that it just returned the API's response)
    await waitFor(() => expect(called).toBe(true));
    expect(result.current).toEqual([]);
  });

  // Test if returns an empty array on a network failure
  it('1.6 resolves to an empty array on a network failure', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    server.use(
      http.get('/api/load-module-options', () => HttpResponse.error())
    );

    const { result } = renderHook(() => useModuleOptions());

    await waitFor(() => expect(consoleSpy).toHaveBeenCalled());
    expect(result.current).toEqual([]);
    expect(consoleSpy).toHaveBeenCalledWith('Failed to load module options');

    consoleSpy.mockRestore();
  });

  // Test if returns an empty array when the response body is not valid JSON (e.g. proxy timeout)
  it('1.7 resolves to an empty array when the response body is not valid JSON', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    server.use(
      http.get('/api/load-module-options', () => new HttpResponse('Internal Server Error', { status: 500 }))
    );

    const { result } = renderHook(() => useModuleOptions());

    await waitFor(() => expect(consoleSpy).toHaveBeenCalled());
    expect(result.current).toEqual([]);
    expect(consoleSpy).toHaveBeenCalledWith('Failed to load module options');

    consoleSpy.mockRestore();
  });
});
