// hooks/lab/useHotspots.test.ts
// Unit & Integration tests for functions in useHotspots.ts & related API calls
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { createRef } from 'react';
import { buildDefaultHotspots, clamp, generateType, useHotspots } from './useHotspots';
import { server } from '../../mocks/server';
import { http, HttpResponse } from 'msw';
import { File } from 'node:buffer';

// Create mock user (defaults as logged-in — video saves require an authenticated admin)
const { mockUseAuth } = vi.hoisted(() => ({ mockUseAuth: vi.fn() }));

vi.mock('@/context/AuthContext', () => ({
	useAuth: mockUseAuth,
}));

const fakeUser = { getIdToken: vi.fn().mockResolvedValue('fake-token') };

beforeEach(() => {
	mockUseAuth.mockReturnValue({ user: fakeUser, loading: false });
});

// ─── Unit Tests (test purely internal functions) ───────────────

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

// 3. Test if new hotspots get new hotspot types (no duplicates)
describe('3. generateType', () => {
  // Test if 1st hotspot added gets 1st hotspot type
  it('3.1 returns 1st hotspot type when no hotspots exist', () => {
    expect(generateType([])).toBe('hotspot_1');
  });
  
  // Test if new hotspots get next available hotspot type
  it('3.2 skips existing hotspot types', () => {
    const existing = [
      { type: 'hotspot_1' },
      { type: 'hotspot_2' },
    ] as any;
    expect(generateType(existing)).toBe('hotspot_3');
  });
  
  // Test if new hotspots get next available hotspot type even if existing types are non-sequential
  it('3.3 skips non-sequential existing hotspot types', () => {
    const existing = [
      { type: 'hotspot_1' },
      { type: 'hotspot_3' },
    ] as any;
    expect(generateType(existing)).toBe('hotspot_2');
  });
});

// 4. Test addHotspot
// Note: does call on APIs during testing, but not to test them, so this is still a unit test.
describe('4. addHotspot', () => {
  // Test if a new hotspot is added with the default info
  it('4.1 seeds a new hotspot with default info', async () => {
    const ref = createRef<HTMLDivElement>();
    const { result } = renderHook(() => useHotspots(ref));

    const countBefore = result.current.hotspots.length;
    act(() => { result.current.addHotspot(); });

    expect(result.current.hotspots.length).toBe(countBefore + 1);

    const newHotspot = result.current.hotspots[result.current.hotspots.length - 1];
    expect(newHotspot.info.title).toBe('⚠️ New Hotspot');
    expect(newHotspot.info.moduleId).toBeNull();
    expect(newHotspot.info.moduleTopic).toBeNull();
  });
});

// 5. Test updateModuleLink
// Note: same as addHotspot above — calls APIs but doesn't test them.
describe('5. updateModuleLink', () => {
  // Test if topic and id are both written together onto the target hotspot
  it('5.1 sets moduleTopic and moduleId together on the target hotspot', async () => {
    const ref = createRef<HTMLDivElement>();
    const { result } = renderHook(() => useHotspots(ref));

    act(() => { result.current.updateModuleLink(0, 'guides', '2'); });

    expect(result.current.hotspots[0].info.moduleTopic).toBe('guides');
    expect(result.current.hotspots[0].info.moduleId).toBe('2');
  });

  // Test if only the targeted hotspot is affected, not every hotspot in state
  it('5.2 only updates the targeted hotspot, leaving others unchanged', async () => {
    const ref = createRef<HTMLDivElement>();
    const { result } = renderHook(() => useHotspots(ref));

    act(() => { result.current.updateModuleLink(0, 'guides', '2'); });

    // index 1 should be untouched by an update targeting index 0
    expect(result.current.hotspots[1].info.moduleTopic).toBe('hazards');
    expect(result.current.hotspots[1].info.moduleId).toBe('2');
  });

  // Test if both fields can be cleared back to null in one call (e.g. "None" picked in the editor)
  it('5.3 can clear both fields back to null', async () => {
    const ref = createRef<HTMLDivElement>();
    const { result } = renderHook(() => useHotspots(ref));

    // Default hotspots start linked (see lib/hazards.ts)
    expect(result.current.hotspots[0].info.moduleTopic).not.toBeNull();

    act(() => { result.current.updateModuleLink(0, null, null); });

    expect(result.current.hotspots[0].info.moduleTopic).toBeNull();
    expect(result.current.hotspots[0].info.moduleId).toBeNull();
  });
});

// 6. Test hasInvalidModuleLink
describe('6. hasInvalidModuleLink', () => {
  // Test if default hotspots return false (all links valid)
  it('6.1 is false for the default hotspots (every link fully set)', async () => {
    const ref = createRef<HTMLDivElement>();
    const { result } = renderHook(() => useHotspots(ref));

    expect(result.current.hasInvalidModuleLink).toBe(false);
  });

  // Test if true when have a topic but no ID (mid-edit in the UI)
  it('6.2 becomes true when a hotspot has only moduleTopic set', async () => {
    const ref = createRef<HTMLDivElement>();
    const { result } = renderHook(() => useHotspots(ref));

    act(() => { result.current.updateModuleLink(0, 'hazards', null); });

    expect(result.current.hasInvalidModuleLink).toBe(true);
  });

  // Test if true when have an ID but no topic (not reachable via the UI)
  it('6.3 becomes true when a hotspot has only moduleId set', async () => {
    const ref = createRef<HTMLDivElement>();
    const { result } = renderHook(() => useHotspots(ref));

    act(() => { result.current.updateModuleLink(0, null, '1'); });

    expect(result.current.hasInvalidModuleLink).toBe(true);
  });

  // Test if it goes back to false once the mismatched hotspot is fixed
  it('6.4 returns to false once the mismatched hotspot is resolved', async () => {
    const ref = createRef<HTMLDivElement>();
    const { result } = renderHook(() => useHotspots(ref));

    act(() => { result.current.updateModuleLink(0, 'hazards', null); });
    expect(result.current.hasInvalidModuleLink).toBe(true);

    act(() => { result.current.updateModuleLink(0, null, null); });
    expect(result.current.hasInvalidModuleLink).toBe(false);
  });
});

// 7. Test toggleEditMode
describe('7. toggleEditMode', () => {
  // Test if edit mode turns on from its default (off) state
  it('7.1 turns edit mode on', () => {
    const ref = createRef<HTMLDivElement>();
    const { result } = renderHook(() => useHotspots(ref));

    expect(result.current.editMode).toBe(false);
    act(() => { result.current.toggleEditMode(); });
    expect(result.current.editMode).toBe(true);
  });

  // Test if edit mode turns back off on a second call
  it('7.2 turns edit mode back off on a second call', () => {
    const ref = createRef<HTMLDivElement>();
    const { result } = renderHook(() => useHotspots(ref));

    act(() => { result.current.toggleEditMode(); });  // enter edit mode
    expect(result.current.editMode).toBe(true);

    act(() => { result.current.toggleEditMode(); });  // exit edit mode
    expect(result.current.editMode).toBe(false);
  });

  // Test if the selected hotspot is cleared when exiting edit mode
  it('7.3 clears the selected hotspot when exiting edit mode', () => {
    const ref = createRef<HTMLDivElement>();
    const { result } = renderHook(() => useHotspots(ref));

    act(() => { result.current.toggleEditMode(); });  // enter edit mode
    act(() => { result.current.setSelected(0); });
    expect(result.current.selected).toBe(0);

    act(() => { result.current.toggleEditMode(); });  // exit edit mode
    expect(result.current.editMode).toBe(false);
    expect(result.current.selected).toBeNull();
  });

  // Test if selection is left untouched when entering edit mode
  it('7.4 does not touch selection when entering edit mode', () => {
    const ref = createRef<HTMLDivElement>();
    const { result } = renderHook(() => useHotspots(ref));

    expect(result.current.selected).toBeNull();
    act(() => { result.current.toggleEditMode(); });
    expect(result.current.selected).toBeNull();
  });
});

// 8. Test video draft state syncing with the selected hotspot
describe('8. video draft sync', () => {
  it('8.1 loads the selected hotspot\'s persisted video into the draft', () => {
    const ref = createRef<HTMLDivElement>();
    const { result } = renderHook(() => useHotspots(ref));

    act(() => { result.current.addHotspot(); });
    const index = result.current.hotspots.length - 1;
    act(() => { result.current.updateInfo(index, 'videoUrl', 'https://www.youtube.com/watch?v=abc123'); });
    act(() => { result.current.updateInfo(index, 'videoType', 'youtube'); });

    act(() => { result.current.setSelected(index); });

    expect(result.current.videoDraftType).toBe('youtube');
    expect(result.current.videoDraftYoutubeUrl).toBe('https://www.youtube.com/watch?v=abc123');
    expect(result.current.videoDraftFile).toBeNull();
  });

  it('8.2 defaults to an empty YouTube draft for a hotspot with no video', () => {
    const ref = createRef<HTMLDivElement>();
    const { result } = renderHook(() => useHotspots(ref));

    act(() => { result.current.setSelected(0); });

    expect(result.current.videoDraftType).toBe('youtube');
    expect(result.current.videoDraftYoutubeUrl).toBe('');
  });

  it('8.3 resets the draft file when switching to a different hotspot', () => {
    const ref = createRef<HTMLDivElement>();
    const { result } = renderHook(() => useHotspots(ref));

    act(() => { result.current.setSelected(0); });
    const fakeFile = new File(['x'], 'test.mp4', { type: 'video/mp4' });
    act(() => { result.current.selectVideoDraftFile(fakeFile); });
    expect(result.current.videoDraftFile).toBe(fakeFile);

    act(() => { result.current.addHotspot(); });
    const newIndex = result.current.hotspots.length - 1;
    act(() => { result.current.setSelected(newIndex); });

    expect(result.current.videoDraftFile).toBeNull();
  });
});

// 9. Test selectVideoDraftFile
describe('9. selectVideoDraftFile', () => {
  it('9.1 accepts a file under the 50MB limit', () => {
    const ref = createRef<HTMLDivElement>();
    const { result } = renderHook(() => useHotspots(ref));

    const smallFile = new File(['x'.repeat(10)], 'small.mp4', { type: 'video/mp4' });
    act(() => { result.current.selectVideoDraftFile(smallFile); });

    expect(result.current.videoDraftFile).toBe(smallFile);
  });

  it('9.2 rejects a file over the 50MB limit and alerts', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const ref = createRef<HTMLDivElement>();
    const { result } = renderHook(() => useHotspots(ref));

    const bigFile = new File(['x'], 'big.mp4', { type: 'video/mp4' });
    Object.defineProperty(bigFile, 'size', { value: 51 * 1024 * 1024 });

    act(() => { result.current.selectVideoDraftFile(bigFile); });

    expect(result.current.videoDraftFile).toBeNull();
    expect(alertSpy).toHaveBeenCalledWith('MP4 videos must be smaller than 50MB.');
    alertSpy.mockRestore();
  });
});

// ─── Integration Tests (test API calls with mock server) ───────────────

// 10. Test load-hotspots API call
describe('10. load-hotspots', () => {
  // Test if loads successfully
  it('10.1 maps response into hotspots, including moduleId from defaults', async () => {
    // Set up a page to run the tests in
    const ref = createRef<HTMLDivElement>();
    const { result } = renderHook(() => useHotspots(ref));

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
  it('10.2 falls back to defaults when API returns empty', async () => {
    // Override default response with fail case
    server.use(
      http.get('/api/lab/load-hotspots', () => HttpResponse.json({ ok: true, data: [] }))
    );

    const ref = createRef<HTMLDivElement>();
    const { result } = renderHook(() => useHotspots(ref));
    
    await waitFor(() => expect(result.current.loadStatus).toBe('ready'));
    
    // Check that hotspots still have content (fell back to defaults)
    expect(result.current.hotspots.length).toBeGreaterThan(0);
  });
  
  // Test if uses default info when API responds with an error (bad query, policy rejection, data issue, etc.)
  it('10.3 falls back to defaults when API responds with an error', async () => {
    // Replace console error with a fake (avoids clutter)
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    server.use(
      http.get('/api/lab/load-hotspots', () => HttpResponse.json({ ok: false, error: 'Supabase error' }, { status: 500 }))
    );

    const ref = createRef<HTMLDivElement>();
    const { result } = renderHook(() => useHotspots(ref));

    await waitFor(() => expect(result.current.loadStatus).toBe('error'));
    expect(result.current.hotspots.length).toBeGreaterThan(0);
    // Check that error was logged to console (ensures error handling works)
    expect(consoleSpy).toHaveBeenCalledWith('load-hotspots API error:', 'Supabase error');
    // Restore console error to normal (prevents leaking to other tests)
    consoleSpy.mockRestore();
  });

  // Test if uses default info when API call fails (internet failure, server crash, etc.)
  it('10.4 falls back to defaults on a network failure', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    server.use(
      http.get('/api/lab/load-hotspots', () => HttpResponse.error())
    );

    const ref = createRef<HTMLDivElement>();
    const { result } = renderHook(() => useHotspots(ref));

    await waitFor(() => expect(result.current.loadStatus).toBe('error'));
    expect(result.current.hotspots.length).toBeGreaterThan(0);
    expect(consoleSpy).toHaveBeenCalledWith('Failed to load hotspots from Supabase — using defaults');
    consoleSpy.mockRestore();
  });

  // Test if a hotspot with no linked module doesn't show values for module_topic/module_id (doesn't use default values from hazards.ts)
  it('10.5 passes through module_topic/module_id as null when the hotspot has no linked module', async () => {
    server.use(
      http.get('/api/lab/load-hotspots', () => HttpResponse.json({
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

    const ref = createRef<HTMLDivElement>();
    const { result } = renderHook(() => useHotspots(ref));

    await waitFor(() => expect(result.current.loadStatus).toBe('ready'));

    const loadedHotspot = result.current.hotspots[0];
    expect(loadedHotspot.info.moduleId).toBeNull();
    expect(loadedHotspot.info.moduleTopic).toBeNull();
  });
});

// 11. Test load-image API call
describe('11. load-image', () => {
  // Test if loads successfully and sets imageUrl state
  it('11.1 sets imageUrl from API when available', async () => {
    const ref = createRef<HTMLDivElement>();
    const { result } = renderHook(() => useHotspots(ref));
    
    await waitFor(() => expect(result.current.imageUrl).toContain('/uploads/lab-photo.jpg'));
  });

  // Test if uses default when API returns empty
  it('11.2 keeps the default image when no image exists in the API', async () => {
    server.use(http.get('/api/lab/load-image', () => HttpResponse.json({ ok: true, url: null })));

    const ref = createRef<HTMLDivElement>();
    const { result } = renderHook(() => useHotspots(ref));

    await waitFor(() => expect(result.current.loadStatus).toBe('ready'));
    // Check that current image is the default (lab.jpg)
    expect(result.current.imageUrl).toBe('/lab.jpg');
  });

  // Test if uses default when API responds with an error (bad query, policy rejection, data issue, etc.)
  it('11.3 keeps the default image when API responds with an error', async () => {
    server.use(
      http.get('/api/lab/load-image', () => HttpResponse.json({ ok: false, error: 'Storage error' }, { status: 500 }))
    );

    const ref = createRef<HTMLDivElement>();
    const { result } = renderHook(() => useHotspots(ref));

    await waitFor(() => expect(result.current.loadStatus).toBe('ready'));
    expect(result.current.imageUrl).toBe('/lab.jpg');
  });
});

// 12. Test save-hotspots API call
describe('12. save-hotspots', () => {
  // Test a successful save
  it('12.1 sets saveStatus to saved on a successful save', async () => {
    const ref = createRef<HTMLDivElement>();
    const { result } = renderHook(() => useHotspots(ref));

    await waitFor(() => expect(result.current.loadStatus).toBe('ready'));
    // Invoke function and wait for it to finish running
    await act(async () => { await result.current.saveToSupabase(); });
    expect(result.current.saveStatus).toBe('saved');
  });

  // Test a failed save
  it('12.2 sets saveStatus to error if the save request fails', async () => {
    server.use(
      http.post('/api/lab/save-hotspots', () => HttpResponse.json({ ok: false, error: 'Save failed' }, { status: 500 }))
    );

    const ref = createRef<HTMLDivElement>();
    const { result } = renderHook(() => useHotspots(ref));

    await waitFor(() => expect(result.current.loadStatus).toBe('ready'));
    await act(async () => { await result.current.saveToSupabase(); });
    expect(result.current.saveStatus).toBe('error');
  });

  // Test if all fields are sent to the API (hotspots + hotspotData)
  it('12.3 sends the full hotspots + hotspotData payload', async () => {
    let capturedBody: any = null;
    server.use(
      http.post('/api/lab/save-hotspots', async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ ok: true });
      })
    );
 
    const ref = createRef<HTMLDivElement>();
    const { result } = renderHook(() => useHotspots(ref));
 
    // Wait for the load to complete so hotspots carry the mock's info
    await waitFor(() => expect(result.current.loadStatus).toBe('ready'));
    await act(async () => { await result.current.saveToSupabase(); });
    expect(result.current.saveStatus).toBe('saved');
 
    // hotspots: only position/type fields — no leaked `info`
    expect(capturedBody.hotspots).toEqual([
      { type: 'gas', top: '20.0%', left: '30.0%' },
    ]);
 
    // hotspotData: the HazardInfo for the loaded hotspot
    expect(capturedBody.hotspotData.gas).toEqual({
      title: 'Loaded Title',
      text: 'Loaded description text.',
      moduleId: '1',
      moduleTopic: 'hazards',
      videoUrl: null,
      videoType: null,
    });
  });

  // Test if guards against saving when a hotspot has an invalid module link
  it('12.4 sets saveStatus to error and skips the API call when hasInvalidModuleLink is true', async () => {
    let called = false;
    server.use(
      http.post('/api/lab/save-hotspots', () => {
        called = true;
        return HttpResponse.json({ ok: true });
      })
    );
    
    const ref = createRef<HTMLDivElement>();
    const { result } = renderHook(() => useHotspots(ref));
    
    await waitFor(() => expect(result.current.loadStatus).toBe('ready'));
    
    // Break validity: give the (only) loaded hotspot a topic but no id
    act(() => { result.current.updateModuleLink(0, 'hazards', null); });
    expect(result.current.hasInvalidModuleLink).toBe(true);
    
    await act(async () => { await result.current.saveToSupabase(); });
    
    expect(result.current.saveStatus).toBe('error');
    expect(called).toBe(false);
  });
  
  // Test if a save proceeds normally once the link is fixed back to a valid state
  it('12.5 proceeds with the save once the module link is valid again', async () => {
    let called = false;
    server.use(
      http.post('/api/lab/save-hotspots', () => {
        called = true;
        return HttpResponse.json({ ok: true });
      })
    );
    
    const ref = createRef<HTMLDivElement>();
    const { result } = renderHook(() => useHotspots(ref));
    
    await waitFor(() => expect(result.current.loadStatus).toBe('ready'));
    
    act(() => { result.current.updateModuleLink(0, 'hazards', null); });
    expect(result.current.hasInvalidModuleLink).toBe(true);

    act(() => { result.current.updateModuleLink(0, null, null); });
    expect(result.current.hasInvalidModuleLink).toBe(false);
    
    await act(async () => { await result.current.saveToSupabase(); });
    
    expect(result.current.saveStatus).toBe('saved');
    expect(called).toBe(true);
  });
});

// 13. Test upload-image API call
describe('13. upload-image', () => {
  // Test a successful upload
  it('13.1 updates imageUrl with a cache-busted URL on successful upload', async () => {
    const ref = createRef<HTMLDivElement>();
    const { result } = renderHook(() => useHotspots(ref));

    await waitFor(() => expect(result.current.loadStatus).toBe('ready'));

    // Create fake file to upload (content doesn't matter)
    const fakeFile = new File(['fake image content'], 'test.jpg', { type: 'image/jpeg' });

    await act(async () => { await result.current.uploadImage(fakeFile); });
    // Check that mock image returned with the cache-busting parameter (ensures that new image loaded instead of cached one)
    expect(result.current.imageUrl).toContain('/uploads/mock-image.jpg?t=');
    expect(result.current.uploadStatus).toBe('uploaded');
  });

  // Test a failed upload
  it('13.2 sets uploadStatus to error if the upload fails', async () => {
    server.use(
      http.post('/api/lab/upload-image', () => HttpResponse.json({ ok: false, error: 'Upload failed' }))
    );

    const ref = createRef<HTMLDivElement>();
    const { result } = renderHook(() => useHotspots(ref));

    const fakeFile = new File(['fake'], 'test.jpg', { type: 'image/jpeg' });

    await act(async () => { await result.current.uploadImage(fakeFile); });
    expect(result.current.uploadStatus).toBe('error');
  });
});

// 14. Test saveHotspotYoutubeVideo API call
describe('14. saveHotspotYoutubeVideo', () => {
  it('14.1 saves the draft YouTube URL and updates the hotspot\'s info', async () => {
    const ref = createRef<HTMLDivElement>();
    const { result } = renderHook(() => useHotspots(ref));

    await waitFor(() => expect(result.current.loadStatus).toBe('ready'));
    act(() => { result.current.setSelected(0); });
    act(() => { result.current.changeVideoDraftYoutubeUrl('https://www.youtube.com/watch?v=xyz'); });

    await act(async () => { await result.current.saveHotspotYoutubeVideo(); });

    expect(result.current.hotspots[0].info.videoUrl).toBe('https://www.youtube.com/watch?v=xyz');
    expect(result.current.hotspots[0].info.videoType).toBe('youtube');
  });

  it('14.2 does nothing when there is no signed-in user', async () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    let called = false;
    server.use(
      http.put('/api/lab/video', () => { called = true; return HttpResponse.json({ ok: true, hazard: {} }); })
    );

    const ref = createRef<HTMLDivElement>();
    const { result } = renderHook(() => useHotspots(ref));

    await waitFor(() => expect(result.current.loadStatus).toBe('ready'));
    act(() => { result.current.setSelected(0); });
    act(() => { result.current.changeVideoDraftYoutubeUrl('https://www.youtube.com/watch?v=xyz'); });

    await act(async () => { await result.current.saveHotspotYoutubeVideo(); });

    expect(called).toBe(false);
  });

  it('14.3 alerts and leaves the hotspot unchanged on a failed save', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    server.use(
      http.put('/api/lab/video', () => HttpResponse.json({ ok: false, error: 'Invalid URL' }, { status: 400 }))
    );

    const ref = createRef<HTMLDivElement>();
    const { result } = renderHook(() => useHotspots(ref));

    await waitFor(() => expect(result.current.loadStatus).toBe('ready'));
    act(() => { result.current.setSelected(0); });
    act(() => { result.current.changeVideoDraftYoutubeUrl('not a real url'); });

    await act(async () => { await result.current.saveHotspotYoutubeVideo(); });

    expect(result.current.hotspots[0].info.videoUrl).toBeNull();
    expect(alertSpy).toHaveBeenCalledWith('Invalid URL');
    alertSpy.mockRestore();
  });
});

// 15. Test uploadHotspotMp4Video API call
describe('15. uploadHotspotMp4Video', () => {
  it('15.1 uploads the draft file, updates the hotspot\'s info, and clears the draft file', async () => {
    const ref = createRef<HTMLDivElement>();
    const { result } = renderHook(() => useHotspots(ref));

    await waitFor(() => expect(result.current.loadStatus).toBe('ready'));
    act(() => { result.current.setSelected(0); });

    const fakeFile = new File(['fake video content'], 'test.mp4', { type: 'video/mp4' });
    act(() => { result.current.selectVideoDraftFile(fakeFile); });

    await act(async () => { await result.current.uploadHotspotMp4Video(); });

    expect(result.current.hotspots[0].info.videoUrl).toBe('/uploads/mock-video.mp4');
    expect(result.current.hotspots[0].info.videoType).toBe('mp4');
    expect(result.current.videoDraftFile).toBeNull();
  });

  it('15.2 alerts and leaves the hotspot unchanged on a failed upload', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    server.use(
      http.put('/api/lab/video', () => HttpResponse.json({ ok: false, error: 'Upload failed' }, { status: 500 }))
    );

    const ref = createRef<HTMLDivElement>();
    const { result } = renderHook(() => useHotspots(ref));

    await waitFor(() => expect(result.current.loadStatus).toBe('ready'));
    act(() => { result.current.setSelected(0); });

    const fakeFile = new File(['fake video content'], 'test.mp4', { type: 'video/mp4' });
    act(() => { result.current.selectVideoDraftFile(fakeFile); });

    await act(async () => { await result.current.uploadHotspotMp4Video(); });

    expect(result.current.hotspots[0].info.videoUrl).toBeNull();
    expect(alertSpy).toHaveBeenCalledWith('Upload failed');
    alertSpy.mockRestore();
  });
});

// 16. Test removeHotspotVideo API call
describe('16. removeHotspotVideo', () => {
  it('16.1 clears the hotspot\'s video after confirming', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    server.use(
      http.get('/api/lab/load-hotspots', () => HttpResponse.json({
        ok: true,
        data: [{
          type: 'gas', top: '20.0%', left: '30.0%',
          title: 'Loaded Title', text: 'Loaded description text.',
          module_topic: 'hazards', module_id: '1',
          video_url: 'https://www.youtube.com/watch?v=abc', video_type: 'youtube',
        }],
      }))
    );

    const ref = createRef<HTMLDivElement>();
    const { result } = renderHook(() => useHotspots(ref));

    await waitFor(() => expect(result.current.loadStatus).toBe('ready'));
    act(() => { result.current.setSelected(0); });
    expect(result.current.hotspots[0].info.videoUrl).not.toBeNull();

    await act(async () => { await result.current.removeHotspotVideo(); });

    expect(result.current.hotspots[0].info.videoUrl).toBeNull();
    expect(result.current.hotspots[0].info.videoType).toBeNull();
    vi.restoreAllMocks();
  });

  it('16.2 does nothing if the confirmation is declined', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    let called = false;
    server.use(
      http.delete('/api/lab/video', () => { called = true; return HttpResponse.json({ ok: true, hazard: {} }); })
    );

    const ref = createRef<HTMLDivElement>();
    const { result } = renderHook(() => useHotspots(ref));

    await waitFor(() => expect(result.current.loadStatus).toBe('ready'));
    act(() => { result.current.setSelected(0); });

    await act(async () => { await result.current.removeHotspotVideo(); });

    expect(called).toBe(false);
    vi.restoreAllMocks();
  });

  it('16.3 alerts and leaves the hotspot unchanged on a failed removal', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    server.use(
      http.get('/api/lab/load-hotspots', () => HttpResponse.json({
        ok: true,
        data: [{
          type: 'gas', top: '20.0%', left: '30.0%',
          title: 'Loaded Title', text: 'Loaded description text.',
          module_topic: 'hazards', module_id: '1',
          video_url: 'https://www.youtube.com/watch?v=abc', video_type: 'youtube',
        }],
      })),
      http.delete('/api/lab/video', () => HttpResponse.json({ ok: false, error: 'Removal failed' }, { status: 500 }))
    );

    const ref = createRef<HTMLDivElement>();
    const { result } = renderHook(() => useHotspots(ref));

    await waitFor(() => expect(result.current.loadStatus).toBe('ready'));
    act(() => { result.current.setSelected(0); });

    await act(async () => { await result.current.removeHotspotVideo(); });

    expect(result.current.hotspots[0].info.videoUrl).toBe('https://www.youtube.com/watch?v=abc');
    expect(alertSpy).toHaveBeenCalledWith('Removal failed');
    vi.restoreAllMocks();
  });
});