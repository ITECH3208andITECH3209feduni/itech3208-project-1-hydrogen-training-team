// hooks/useHazards.test.ts
// Unit & Integration tests for functions in useHazards.ts & related API calls
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { createRef } from 'react';
import { buildDefaultHotspots, clamp, generateType, useHazards } from './useHazards';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';

// ─── Unit Tests (test purely internal functions) ───────────────

// 1. Test if hotspot data and hazard text merge correctly
describe('1. buildDefaultHotspots', () => {
  it('1.1 merges default positions with default hazard text', () => {
    const result = buildDefaultHotspots();
    expect(result.length).toBeGreaterThan(0);   // Check that list isn't empty
    result.forEach((hs) => {
      expect(hs.info).toHaveProperty('title');  // Check that title merged in
      expect(hs.info).toHaveProperty('text');   // Check that text merged in
    });
  });
});

// 2. Test if hotspots are stopped from being dragged off-image
describe('2. clamp', () => {
  // Test if dragging within image bounds returns accurate position
  it('2.1 returns the value unchanged when within bounds', () => {
    expect(clamp(50, 0, 95)).toBe(50);
  });
  
  // Test if stopped from dragging past left or top edge of image
  it('2.2 clamps below the minimum', () => {
    expect(clamp(-10, 0, 95)).toBe(0);
  });
  
  // Test if stopped from dragging past right or bottom edge of image
  it('2.3 clamps above the maximum', () => {
    expect(clamp(999, 0, 95)).toBe(95);
  });
});

// 3. Test if new hotspots get new hazard types (no duplicates)
describe('3. generateType', () => {
  // Test if 1st hotspot added gets 1st hazard type
  it('3.1 returns 1st hazard type when no hotspots exist', () => {
    expect(generateType([])).toBe('hazard_1');
  });
  
  // Test if new hotspots get next available hazard type
  it('3.2 skips existing hazard types', () => {
    const existing = [
      { type: 'hazard_1' },
      { type: 'hazard_2' },
    ] as any;
    expect(generateType(existing)).toBe('hazard_3');
  });
  
  // Test if new hotspots get next available hazard type even if existing types are non-sequential
  it('3.3 skips non-sequential existing hazard types', () => {
    const existing = [
      { type: 'hazard_1' },
      { type: 'hazard_3' },
    ] as any;
    expect(generateType(existing)).toBe('hazard_2');
  });
});

// ─── Integration Tests (test API calls with mock server) ───────────────

// 4. Test load-hazards API call
describe('4. load-hazards', () => {
  // Test if loads successfully
  it('4.1 maps response into hotspots, including moduleId from defaults', async () => {
    // Set up a page to run the tests in
    const ref = createRef<HTMLDivElement>();
    const { result } = renderHook(() => useHazards(ref));

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
    // moduleId isn't stored in Supabase — it should come from hazards.ts, not be empty
    expect(loadedHotspot.info.moduleId).not.toBe('');
  });
  
  // Test if uses default info when API returns empty
  it('4.2 falls back to defaults when API returns empty', async () => {
    // Override default response with fail case
    server.use(
      http.get('/api/load-hazards', () => HttpResponse.json({ ok: true, data: [] }))
    );

    const ref = createRef<HTMLDivElement>();
    const { result } = renderHook(() => useHazards(ref));
    
    await waitFor(() => expect(result.current.loadStatus).toBe('ready'));
    
    // Check that hotspots still have content (fell back to defaults)
    expect(result.current.hotspots.length).toBeGreaterThan(0);
  });
  
  // Test if uses default info when API responds with an error (bad query, policy rejection, data issue, etc.)
  it('4.3 falls back to defaults when API responds with an error', async () => {
    // Replace console error with a fake (avoids clutter)
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    server.use(
      http.get('/api/load-hazards', () => HttpResponse.json({ ok: false, error: 'Supabase error' }, { status: 500 }))
    );

    const ref = createRef<HTMLDivElement>();
    const { result } = renderHook(() => useHazards(ref));

    await waitFor(() => expect(result.current.loadStatus).toBe('error'));
    expect(result.current.hotspots.length).toBeGreaterThan(0);
    // Check that error was logged to console (ensures error handling works)
    expect(consoleSpy).toHaveBeenCalledWith('load-hazards API error:', 'Supabase error');
    // Restore console error to normal (prevents leaking to other tests)
    consoleSpy.mockRestore();
  });

  // Test if uses default info when API call fails (internet failure, server crash, etc.)
  it('4.4 falls back to defaults on a network failure', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    server.use(
      http.get('/api/load-hazards', () => HttpResponse.error())
    );

    const ref = createRef<HTMLDivElement>();
    const { result } = renderHook(() => useHazards(ref));

    await waitFor(() => expect(result.current.loadStatus).toBe('error'));
    expect(result.current.hotspots.length).toBeGreaterThan(0);
    expect(consoleSpy).toHaveBeenCalledWith('Failed to load hazards from Supabase — using defaults');
    consoleSpy.mockRestore();
  });
});

// 5. Test load-image API call
describe('5. load-image', () => {
  // Test if loads successfully and sets imageUrl state
  it('5.1 sets imageUrl from API when available', async () => {
    const ref = createRef<HTMLDivElement>();
    const { result } = renderHook(() => useHazards(ref));
    
    await waitFor(() => expect(result.current.imageUrl).toContain('/uploads/lab-photo.jpg'));
  });

  // Test if uses default when API returns empty
  it('5.2 keeps the default image when no image exists in the API', async () => {
    server.use(http.get('/api/load-image', () => HttpResponse.json({ ok: true, url: null })));

    const ref = createRef<HTMLDivElement>();
    const { result } = renderHook(() => useHazards(ref));

    await waitFor(() => expect(result.current.loadStatus).toBe('ready'));
    // Check that current image is the default (lab.jpg)
    expect(result.current.imageUrl).toBe('/lab.jpg');
  });

  // Test if uses default when API responds with an error (bad query, policy rejection, data issue, etc.)
  it('5.3 keeps the default image when API responds with an error', async () => {
    server.use(
      http.get('/api/load-image', () => HttpResponse.json({ ok: false, error: 'Storage error' }, { status: 500 }))
    );

    const ref = createRef<HTMLDivElement>();
    const { result } = renderHook(() => useHazards(ref));

    await waitFor(() => expect(result.current.loadStatus).toBe('ready'));
    expect(result.current.imageUrl).toBe('/lab.jpg');
  });
});

// 6. Test save-hazards API call
describe('6. save-hazards', () => {
  // Test a successful save
  it('6.1 sets saveStatus to saved on a successful save', async () => {
    const ref = createRef<HTMLDivElement>();
    const { result } = renderHook(() => useHazards(ref));

    await waitFor(() => expect(result.current.loadStatus).toBe('ready'));
    // Invoke function and wait for it to finish running
    await act(async () => { await result.current.saveToSupabase(); });
    expect(result.current.saveStatus).toBe('saved');
  });

  // Test a failed save
  it('6.2 sets saveStatus to error if the save request fails', async () => {
    server.use(
      http.post('/api/save-hazards', () => HttpResponse.json({ ok: false, error: 'Save failed' }, { status: 500 }))
    );

    const ref = createRef<HTMLDivElement>();
    const { result } = renderHook(() => useHazards(ref));

    await waitFor(() => expect(result.current.loadStatus).toBe('ready'));
    await act(async () => { await result.current.saveToSupabase(); });
    expect(result.current.saveStatus).toBe('error');
  });
});

// 7. Test upload-image API call
describe('7. upload-image', () => {
  // Test a successful upload
  it('7.1 updates imageUrl with a cache-busted URL on successful upload', async () => {
    const ref = createRef<HTMLDivElement>();
    const { result } = renderHook(() => useHazards(ref));

    await waitFor(() => expect(result.current.loadStatus).toBe('ready'));

    // Create fake file to upload (content doesn't matter)
    const fakeFile = new File(['fake image content'], 'test.jpg', { type: 'image/jpeg' });

    await act(async () => { await result.current.uploadImage(fakeFile); });
    // Check that mock image returned with the cache-busting parameter (ensures that new image loaded instead of cached one)
    expect(result.current.imageUrl).toContain('/uploads/mock-image.jpg?t=');
    expect(result.current.uploadStatus).toBe('uploaded');
  });

  // Test a failed upload
  it('7.2 sets uploadStatus to error if the upload fails', async () => {
    server.use(
      http.post('/api/upload-image', () => HttpResponse.json({ ok: false, error: 'Upload failed' }))
    );

    const ref = createRef<HTMLDivElement>();
    const { result } = renderHook(() => useHazards(ref));

    const fakeFile = new File(['fake'], 'test.jpg', { type: 'image/jpeg' });

    await act(async () => { await result.current.uploadImage(fakeFile); });
    expect(result.current.uploadStatus).toBe('error');
  });
});