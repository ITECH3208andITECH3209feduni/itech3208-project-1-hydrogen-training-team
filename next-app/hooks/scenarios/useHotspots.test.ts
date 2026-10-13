// hooks/scenarios/useHotspots.test.ts
// Unit + integration tests for functions in useHotspots.ts & related API calls
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { buildDefaultHotspots, useHotspots } from './useHotspots';
import { server } from '../../mocks/server';
import { http, HttpResponse } from 'msw';

// ─── Unit Tests (test purely internal behaviour) ────────────────────────────────────────────────────

// 1. Test if hotspot data and text merge correctly
describe('1. buildDefaultHotspots', () => {
  it('1.1 merges default positions with default hotspot text', () => {
    const result = buildDefaultHotspots();
    expect(result.length).toBeGreaterThan(0);   // Check that list isn't empty
    result.forEach((hs) => {
      expect(hs.info).toHaveProperty('title');  // Check that title merged in
      expect(hs.info).toHaveProperty('text');   // Check that text merged in
    });
  });
});

// 2. Test derived and exposed state
describe('2. derived and exposed state', () => {
  it('2.1 liveHotspotData maps each hotspot type to its info', async () => {
    const { result } = renderHook(() => useHotspots());
    await waitFor(() => expect(result.current.loadStatus).toBe('ready'));

    expect(result.current.liveHotspotData.gas).toEqual(result.current.hotspots[0].info);
  });

  it('2.2 setImageUrl replaces the displayed image', async () => {
    const { result } = renderHook(() => useHotspots());
    await waitFor(() => expect(result.current.loadStatus).toBe('ready'));

    act(() => { result.current.setImageUrl('/uploads/new.jpg?t=1'); });
    expect(result.current.imageUrl).toBe('/uploads/new.jpg?t=1');
  });
});

// ─── Integration Tests (test API calls with mock server) ────────────────────────────────────────────

// 3. Test load-hotspots API call
describe('3. load-hotspots', () => {
  // Test if loads successfully
  it('3.1 maps response into hotspots, including moduleId from defaults', async () => {
    const { result } = renderHook(() => useHotspots());

    // Wait for data to finish loading
    await waitFor(() => expect(result.current.loadStatus).toBe('ready'));

    // Check that hotspots not empty
    expect(result.current.hotspots).toHaveLength(1);

    // Grab the first hotspot to check over (ensures mapping logic works)
    const loadedHotspot = result.current.hotspots[0];
    expect(loadedHotspot.type).toBe('gas');
    expect(loadedHotspot.top).toBe('20.0%');
    expect(loadedHotspot.left).toBe('30.0%');
    expect(loadedHotspot.info.title).toBe('Loaded Title');
    expect(loadedHotspot.info.text).toBe('Loaded description text.');
    expect(loadedHotspot.info.moduleId).toBe('1');
    expect(loadedHotspot.info.moduleTopic).toBe('hazards');
    expect(loadedHotspot.info.videoUrl).toBeNull();
    expect(loadedHotspot.info.videoType).toBeNull();
  });

  // Test if uses default info when API returns empty
  it('3.2 falls back to defaults when API returns empty', async () => {
    server.use(
      http.get('/api/scenarios/load-hotspots', () => HttpResponse.json({ ok: true, data: [] }))
    );

    const { result } = renderHook(() => useHotspots());

    await waitFor(() => expect(result.current.loadStatus).toBe('ready'));

    // Check that hotspots still have content (fell back to defaults)
    expect(result.current.hotspots.length).toBeGreaterThan(0);
  });

  // Test if uses default info when API responds with an error (bad query, policy rejection, data issue, etc.)
  it('3.3 falls back to defaults when API responds with an error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    server.use(
      http.get('/api/scenarios/load-hotspots', () => HttpResponse.json({ ok: false, error: 'Supabase error' }, { status: 500 }))
    );

    const { result } = renderHook(() => useHotspots());

    await waitFor(() => expect(result.current.loadStatus).toBe('error'));
    expect(result.current.hotspots.length).toBeGreaterThan(0);
    // Check that error was logged to console (ensures error handling works)
    expect(consoleSpy).toHaveBeenCalledWith('load-hotspots API error:', 'Supabase error');
    consoleSpy.mockRestore();
  });

  // Test if uses default info when API call fails (internet failure, server crash, etc.)
  it('3.4 falls back to defaults on a network failure', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    server.use(
      http.get('/api/scenarios/load-hotspots', () => HttpResponse.error())
    );

    const { result } = renderHook(() => useHotspots());

    await waitFor(() => expect(result.current.loadStatus).toBe('error'));
    expect(result.current.hotspots.length).toBeGreaterThan(0);
    expect(consoleSpy).toHaveBeenCalledWith('Failed to load hotspots from Supabase — using defaults');
    consoleSpy.mockRestore();
  });

  // Test if a hotspot with no linked module doesn't show values for module_topic/module_id (doesn't use default values from hazards.ts)
  it('3.5 passes through module_topic/module_id as null when the hotspot has no linked module', async () => {
    server.use(
      http.get('/api/scenarios/load-hotspots', () => HttpResponse.json({
        ok: true,
        data: [
          {
            type: 'ventilation',
            top: '25.0%',
            left: '35.0%',
            title: 'Unlinked Hotspot',
            text: 'No module linked to this one.',
            module_topic: null,
            module_id: null,
            video_url: null,
            video_type: null,
          },
        ],
      }))
    );

    const { result } = renderHook(() => useHotspots());

    await waitFor(() => expect(result.current.loadStatus).toBe('ready'));

    const loadedHotspot = result.current.hotspots[0];
    expect(loadedHotspot.info.moduleId).toBeNull();
    expect(loadedHotspot.info.moduleTopic).toBeNull();
  });
});

// 4. Test load-image API call
describe('4. load-image', () => {
  // Test if loads successfully and sets imageUrl state
  it('4.1 sets imageUrl from API when available', async () => {
    const { result } = renderHook(() => useHotspots());

    await waitFor(() => expect(result.current.imageUrl).toContain('/uploads/lab-photo.jpg'));
  });

  // Test if uses default when API returns empty
  it('4.2 keeps the default image when no image exists in the API', async () => {
    server.use(http.get('/api/scenarios/load-image', () => HttpResponse.json({ ok: true, url: null })));

    const { result } = renderHook(() => useHotspots());

    await waitFor(() => expect(result.current.loadStatus).toBe('ready'));
    // Check that current image is the default (lab.jpg)
    expect(result.current.imageUrl).toBe('/lab.jpg');
  });

  // Test if uses default when API responds with an error (bad query, policy rejection, data issue, etc.)
  it('4.3 keeps the default image when API responds with an error', async () => {
    server.use(
      http.get('/api/scenarios/load-image', () => HttpResponse.json({ ok: false, error: 'Storage error' }, { status: 500 }))
    );

    const { result } = renderHook(() => useHotspots());

    await waitFor(() => expect(result.current.loadStatus).toBe('ready'));
    expect(result.current.imageUrl).toBe('/lab.jpg');
  });
});

// 5. Test reload
describe('5. reload', () => {
  const row = {
    type: 'gas', top: '20.0%', left: '30.0%', title: 'Reloaded Title', text: 'Reloaded text.',
    module_topic: 'hazards', module_id: '1', video_url: null, video_type: null,
  };

  it('5.1 re-fetches and replaces the hotspots without going back to loading', async () => {
    const { result } = renderHook(() => useHotspots());
    await waitFor(() => expect(result.current.loadStatus).toBe('ready'));
    expect(result.current.hotspots[0].info.title).toBe('Loaded Title');

    server.use(http.get('/api/scenarios/load-hotspots', () => HttpResponse.json({ ok: true, data: [row] })));
    act(() => { result.current.reload(); });

    expect(result.current.loadStatus).toBe('ready');
    await waitFor(() => expect(result.current.hotspots[0].info.title).toBe('Reloaded Title'));
  });

  it('5.2 a failed reload keeps the loaded hotspots and the ready status', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useHotspots());
    await waitFor(() => expect(result.current.loadStatus).toBe('ready'));

    server.use(http.get('/api/scenarios/load-hotspots', () => HttpResponse.json({ ok: false, error: 'Boom' }, { status: 500 })));
    act(() => { result.current.reload(); });

    await waitFor(() => expect(consoleSpy).toHaveBeenCalledWith('load-hotspots API error:', 'Boom'));
    expect(result.current.loadStatus).toBe('ready');
    expect(result.current.hotspots[0].info.title).toBe('Loaded Title');
    consoleSpy.mockRestore();
  });

  it('5.3 an empty table on reload falls back to the defaults', async () => {
    const { result } = renderHook(() => useHotspots());
    await waitFor(() => expect(result.current.hotspots).toHaveLength(1));

    server.use(http.get('/api/scenarios/load-hotspots', () => HttpResponse.json({ ok: true, data: [] })));
    act(() => { result.current.reload(); });

    await waitFor(() => expect(result.current.hotspots).toEqual(buildDefaultHotspots()));
  });
});