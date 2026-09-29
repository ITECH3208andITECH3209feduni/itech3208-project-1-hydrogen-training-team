// hooks/lab/useHotspotEditor.test.ts
// Unit + integration tests for functions in useHotspotEditor.ts & related API calls
// Note: several of the unit tests below set up API mocks, but only to test derived state or guard clauses, not the API calls themselves.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { createRef } from 'react';
import { File } from 'node:buffer';
import { buildDefaultHotspots, EditableHotspot } from './useHotspots';
import { clamp, generateType, snapshotHotspots, useHotspotEditor } from './useHotspotEditor';
import { server } from '../../mocks/server';
import { http, HttpResponse } from 'msw';

// Create mock user (defaults as logged-in — video saves require an authenticated admin)
const { mockUseAuth } = vi.hoisted(() => ({ mockUseAuth: vi.fn() }));

vi.mock('@/context/AuthContext', () => ({
	useAuth: mockUseAuth,
}));

const fakeUser = { getIdToken: vi.fn().mockResolvedValue('fake-token') };

beforeEach(() => {
	mockUseAuth.mockReturnValue({ user: fakeUser, loading: false });
});

// Stable references: useHotspotEditor treats a new `item` as fresh live data, so a new array every render would loop.
const defaultItem = buildDefaultHotspots();
const loadedItem: EditableHotspot[] = [{
	type: 'gas', top: '20.0%', left: '30.0%',
	info: { title: 'Loaded Title', text: 'Loaded description text.', moduleTopic: 'hazards', moduleId: '1', videoUrl: null, videoType: null },
}];
const videoItem: EditableHotspot[] = [{
	...loadedItem[0],
	info: { ...loadedItem[0].info, videoUrl: 'https://www.youtube.com/watch?v=abc', videoType: 'youtube' },
}];

function renderEditor(item: EditableHotspot[] = defaultItem, options = {}) {
	const ref = createRef<HTMLDivElement>();
	return renderHook(({ item }: { item: EditableHotspot[] }) => useHotspotEditor(ref, item, options), { initialProps: { item } });
}

// ─── Unit Tests (test purely internal behaviour) ────────────────────────────────────────────────────

// 1. Test if hotspots are stopped from being dragged off-image
describe('1. clamp', () => {
  it('1.1 returns the value unchanged when within bounds', () => {
    expect(clamp(50, 0, 95)).toBe(50);
  });

  it('1.2 clamps below the minimum', () => {
    expect(clamp(-10, 0, 95)).toBe(0);
  });

  it('1.3 clamps above the maximum', () => {
    expect(clamp(999, 0, 95)).toBe(95);
  });
});

// 2. Test if new hotspots get new hotspot types (no duplicates)
describe('2. generateType', () => {
  it('2.1 returns 1st hotspot type when no hotspots exist', () => {
    expect(generateType([])).toBe('hotspot_1');
  });

  it('2.2 skips existing hotspot types', () => {
    const existing = [
      { type: 'hotspot_1' },
      { type: 'hotspot_2' },
    ] as any;
    expect(generateType(existing)).toBe('hotspot_3');
  });

  it('2.3 skips non-sequential existing hotspot types', () => {
    const existing = [
      { type: 'hotspot_1' },
      { type: 'hotspot_3' },
    ] as any;
    expect(generateType(existing)).toBe('hotspot_2');
  });
});

// 3. Test addHotspot
describe('3. addHotspot', () => {
  it('3.1 seeds a new hotspot with default info', () => {
    const { result } = renderEditor();

    const countBefore = result.current.draft.length;
    act(() => { result.current.addHotspot(); });

    expect(result.current.draft.length).toBe(countBefore + 1);

    const newHotspot = result.current.draft[result.current.draft.length - 1];
    expect(newHotspot.info.title).toBe('⚠️ New Hotspot');
    expect(newHotspot.info.moduleId).toBeNull();
    expect(newHotspot.info.moduleTopic).toBeNull();
  });
});

// 4. Test updateModuleLink
describe('4. updateModuleLink', () => {
  it('4.1 sets moduleTopic and moduleId together on the target hotspot', () => {
    const { result } = renderEditor();

    act(() => { result.current.updateModuleLink(0, 'guides', '2'); });

    expect(result.current.draft[0].info.moduleTopic).toBe('guides');
    expect(result.current.draft[0].info.moduleId).toBe('2');
  });

  it('4.2 only updates the targeted hotspot, leaving others unchanged', () => {
    const { result } = renderEditor();

    act(() => { result.current.updateModuleLink(0, 'guides', '2'); });

    // index 1 should be untouched by an update targeting index 0
    expect(result.current.draft[1].info.moduleTopic).toBe('hazards');
    expect(result.current.draft[1].info.moduleId).toBe('2');
  });

  it('4.3 can clear both fields back to null', () => {
    const { result } = renderEditor();

    // Default hotspots start linked (see lib/hazards.ts)
    expect(result.current.draft[0].info.moduleTopic).not.toBeNull();

    act(() => { result.current.updateModuleLink(0, null, null); });

    expect(result.current.draft[0].info.moduleTopic).toBeNull();
    expect(result.current.draft[0].info.moduleId).toBeNull();
  });
});

// 5. Test hasInvalidModuleLink
describe('5. hasInvalidModuleLink', () => {
  it('5.1 is false for the default hotspots (every link fully set)', () => {
    const { result } = renderEditor();
    expect(result.current.hasInvalidModuleLink).toBe(false);
  });

  it('5.2 becomes true when a hotspot has only moduleTopic set', () => {
    const { result } = renderEditor();
    act(() => { result.current.updateModuleLink(0, 'hazards', null); });
    expect(result.current.hasInvalidModuleLink).toBe(true);
  });

  it('5.3 becomes true when a hotspot has only moduleId set', () => {
    const { result } = renderEditor();
    act(() => { result.current.updateModuleLink(0, null, '1'); });
    expect(result.current.hasInvalidModuleLink).toBe(true);
  });

  it('5.4 returns to false once the mismatched hotspot is resolved', () => {
    const { result } = renderEditor();

    act(() => { result.current.updateModuleLink(0, 'hazards', null); });
    expect(result.current.hasInvalidModuleLink).toBe(true);

    act(() => { result.current.updateModuleLink(0, null, null); });
    expect(result.current.hasInvalidModuleLink).toBe(false);
  });
});

// 6. Test toggleEditMode
describe('6. toggleEditMode', () => {
  it('6.1 turns edit mode on', () => {
    const { result } = renderEditor();

    expect(result.current.editMode).toBe(false);
    act(() => { result.current.toggleEditMode(); });
    expect(result.current.editMode).toBe(true);
  });

  it('6.2 turns edit mode back off on a second call', () => {
    const { result } = renderEditor();

    act(() => { result.current.toggleEditMode(); });
    expect(result.current.editMode).toBe(true);

    act(() => { result.current.toggleEditMode(); });
    expect(result.current.editMode).toBe(false);
  });

  it('6.3 clears the selected hotspot when exiting edit mode', () => {
    const { result } = renderEditor();

    act(() => { result.current.toggleEditMode(); });
    act(() => { result.current.setSelected(0); });
    expect(result.current.selected).toBe(0);

    act(() => { result.current.toggleEditMode(); });
    expect(result.current.editMode).toBe(false);
    expect(result.current.selected).toBeNull();
  });

  it('6.4 does not touch selection when entering edit mode', () => {
    const { result } = renderEditor();

    expect(result.current.selected).toBeNull();
    act(() => { result.current.toggleEditMode(); });
    expect(result.current.selected).toBeNull();
  });
});

// 7. Test video draft state syncing with the selected hotspot
describe('7. video draft sync', () => {
  it('7.1 loads the selected hotspot\'s persisted video into the draft', () => {
    const { result } = renderEditor();

    act(() => { result.current.addHotspot(); });
    const index = result.current.draft.length - 1;
    act(() => { result.current.updateInfo(index, 'videoUrl', 'https://www.youtube.com/watch?v=abc123'); });
    act(() => { result.current.updateInfo(index, 'videoType', 'youtube'); });

    act(() => { result.current.setSelected(index); });

    expect(result.current.videoDraftType).toBe('youtube');
    expect(result.current.videoDraftYoutubeUrl).toBe('https://www.youtube.com/watch?v=abc123');
    expect(result.current.videoDraftFile).toBeNull();
  });

  it('7.2 defaults to an empty YouTube draft for a hotspot with no video', () => {
    const { result } = renderEditor();

    act(() => { result.current.setSelected(0); });

    expect(result.current.videoDraftType).toBe('youtube');
    expect(result.current.videoDraftYoutubeUrl).toBe('');
  });

  it('7.3 resets the draft file when switching to a different hotspot', () => {
    const { result } = renderEditor();

    act(() => { result.current.setSelected(0); });
    const fakeFile = new File(['x'], 'test.mp4', { type: 'video/mp4' });
    act(() => { result.current.selectVideoDraftFile(fakeFile as any); });
    expect(result.current.videoDraftFile).toBe(fakeFile);

    act(() => { result.current.addHotspot(); });
    const newIndex = result.current.draft.length - 1;
    act(() => { result.current.setSelected(newIndex); });

    expect(result.current.videoDraftFile).toBeNull();
  });
});

// 8. Test selectVideoDraftFile
describe('8. selectVideoDraftFile', () => {
  it('8.1 accepts a file under the 50MB limit', () => {
    const { result } = renderEditor();

    const smallFile = new File(['x'.repeat(10)], 'small.mp4', { type: 'video/mp4' });
    act(() => { result.current.selectVideoDraftFile(smallFile as any); });

    expect(result.current.videoDraftFile).toBe(smallFile);
  });

  it('8.2 rejects a file over the 50MB limit and alerts', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const { result } = renderEditor();

    const bigFile = new File(['x'], 'big.mp4', { type: 'video/mp4' });
    Object.defineProperty(bigFile, 'size', { value: 51 * 1024 * 1024 });

    act(() => { result.current.selectVideoDraftFile(bigFile as any); });

    expect(result.current.videoDraftFile).toBeNull();
    expect(alertSpy).toHaveBeenCalledWith('MP4 videos must be smaller than 50MB.');
    alertSpy.mockRestore();
  });
});

// 9. Test snapshotHotspots (the helper behind hasUnsavedChanges)
describe('9. snapshotHotspots', () => {
  const base = {
    type: 'a', top: '1%', left: '2%',
    info: { title: 'T', text: 'X', moduleTopic: null, moduleId: null, videoUrl: null, videoType: null },
  } as any;

  it('9.1 ignores video fields', () => {
    const withVideo = { ...base, info: { ...base.info, videoUrl: 'u', videoType: 'youtube' } };
    expect(snapshotHotspots([withVideo])).toBe(snapshotHotspots([base]));
  });

  it('9.2 treats an undefined module link the same as null', () => {
    const undefinedLink = { ...base, info: { title: 'T', text: 'X' } };
    expect(snapshotHotspots([undefinedLink])).toBe(snapshotHotspots([base]));
  });

  it('9.3 differs when any persisted field differs', () => {
    expect(snapshotHotspots([{ ...base, top: '9%' }])).not.toBe(snapshotHotspots([base]));
    expect(snapshotHotspots([{ ...base, info: { ...base.info, text: 'Y' } }])).not.toBe(snapshotHotspots([base]));
  });
});

// 10. Test hasUnsavedChanges
describe('10. hasUnsavedChanges', () => {
  it('10.1 becomes true after an edit, and false again if the edit is reverted', () => {
    const { result } = renderEditor(loadedItem);
    act(() => { result.current.updateInfo(0, 'title', 'Edited'); });
    expect(result.current.hasUnsavedChanges).toBe(true);
    act(() => { result.current.updateInfo(0, 'title', 'Loaded Title'); });
    expect(result.current.hasUnsavedChanges).toBe(false);
  });

  it('10.2 becomes true after a position change, a module link change, an add, and a delete', () => {
    const { result } = renderEditor(loadedItem);

    act(() => { result.current.updatePosition(0, 'top', '55.0%'); });
    expect(result.current.hasUnsavedChanges).toBe(true);
    act(() => { result.current.updatePosition(0, 'top', '20.0%'); });
    expect(result.current.hasUnsavedChanges).toBe(false);

    act(() => { result.current.updateModuleLink(0, null, null); });
    expect(result.current.hasUnsavedChanges).toBe(true);
    act(() => { result.current.updateModuleLink(0, 'hazards', '1'); });
    expect(result.current.hasUnsavedChanges).toBe(false);

    act(() => { result.current.addHotspot(); });
    expect(result.current.hasUnsavedChanges).toBe(true);
    act(() => { result.current.deleteHotspot(result.current.draft.length - 1); });
    expect(result.current.hasUnsavedChanges).toBe(false);

    act(() => { result.current.deleteHotspot(0); });
    expect(result.current.hasUnsavedChanges).toBe(true);
  });

  it('10.3 ignores embedded video changes', () => {
    const { result } = renderEditor(loadedItem);
    act(() => {
      result.current.updateInfo(0, 'videoUrl', 'https://youtu.be/abc');
      result.current.updateInfo(0, 'videoType', 'youtube');
    });
    expect(result.current.hasUnsavedChanges).toBe(false);
  });

  it('10.4 is unaffected by toggling edit mode', () => {
    const { result } = renderEditor(loadedItem);
    act(() => { result.current.toggleEditMode(); });
    act(() => { result.current.updateInfo(0, 'title', 'Edited'); });
    act(() => { result.current.toggleEditMode(); });
    expect(result.current.editMode).toBe(false);
    expect(result.current.hasUnsavedChanges).toBe(true);
  });

  it('10.5 becomes false after a successful save', async () => {
    const { result } = renderEditor(loadedItem);
    act(() => { result.current.updateInfo(0, 'title', 'Edited'); });
    await act(async () => { await result.current.saveToSupabase(); });
    expect(result.current.saveStatus).toBe('saved');
    expect(result.current.hasUnsavedChanges).toBe(false);
  });

  it('10.6 stays true after a failed save', async () => {
    server.use(
      http.post('/api/lab/save-hotspots', () => HttpResponse.json({ ok: false, error: 'Save failed' }, { status: 500 }))
    );
    const { result } = renderEditor(loadedItem);
    act(() => { result.current.updateInfo(0, 'title', 'Edited'); });
    await act(async () => { await result.current.saveToSupabase(); });
    expect(result.current.saveStatus).toBe('error');
    expect(result.current.hasUnsavedChanges).toBe(true);
  });

  it('10.7 keeps edits made while a save is in flight marked as unsaved', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    server.use(
      http.post('/api/lab/save-hotspots', async () => {
        await gate;
        return HttpResponse.json({ ok: true });
      })
    );

    const { result } = renderEditor(loadedItem);
    act(() => { result.current.updateInfo(0, 'title', 'First edit'); });

    let savePromise!: Promise<void>;
    act(() => { savePromise = result.current.saveToSupabase(); });
    act(() => { result.current.updateInfo(0, 'title', 'Second edit'); });

    await act(async () => { release(); await savePromise; });
    expect(result.current.hasUnsavedChanges).toBe(true);
  });

  it('10.8 Reset to Defaults counts as unsaved when the defaults differ from what is stored', () => {
    const { result } = renderEditor(loadedItem);
    act(() => { result.current.resetDefaults(); });
    expect(result.current.hasUnsavedChanges).toBe(true);
  });

  it('10.9 Reset to Defaults is not unsaved when nothing is stored yet', () => {
    const { result } = renderEditor(defaultItem);
    act(() => { result.current.updateInfo(0, 'title', 'Edited'); });
    expect(result.current.hasUnsavedChanges).toBe(true);
    act(() => { result.current.resetDefaults(); });
    expect(result.current.hasUnsavedChanges).toBe(false);
  });
});

// 11. Test following live data
describe('11. following live data', () => {
  it('11.1 seeds the draft from the live hotspots and starts clean', () => {
    const { result } = renderEditor(loadedItem);
    expect(result.current.draft[0].info.title).toBe('Loaded Title');
    expect(result.current.hasUnsavedChanges).toBe(false);
  });

  it('11.2 a refresh with nothing edited follows the refreshed data and stays clean', () => {
    const { result, rerender } = renderEditor(loadedItem);
    const refreshed = [{ ...loadedItem[0], info: { ...loadedItem[0].info, title: 'Refreshed Title' } }];

    rerender({ item: refreshed });

    expect(result.current.draft[0].info.title).toBe('Refreshed Title');
    expect(result.current.hasUnsavedChanges).toBe(false);
  });

  it('11.3 a refresh with unsaved edits keeps them, and they count as unsaved against the new data', () => {
    const { result, rerender } = renderEditor(loadedItem);
    act(() => { result.current.updateInfo(0, 'title', 'Edited'); });
    const refreshed = [{ ...loadedItem[0], info: { ...loadedItem[0].info, text: 'Refreshed text.' } }];

    rerender({ item: refreshed });

    expect(result.current.draft[0].info.title).toBe('Edited');
    expect(result.current.hasUnsavedChanges).toBe(true);
  });
});

// ─── Integration Tests (test API calls with mock server) ────────────────────────────────────────────

// 12. Test save-hotspots API call
describe('12. save-hotspots', () => {
  it('12.1 sets saveStatus to saved on a successful save', async () => {
    const { result } = renderEditor(loadedItem);
    await act(async () => { await result.current.saveToSupabase(); });
    expect(result.current.saveStatus).toBe('saved');
  });

  it('12.2 sets saveStatus to error if the save request fails', async () => {
    server.use(
      http.post('/api/lab/save-hotspots', () => HttpResponse.json({ ok: false, error: 'Save failed' }, { status: 500 }))
    );

    const { result } = renderEditor(loadedItem);
    await act(async () => { await result.current.saveToSupabase(); });
    expect(result.current.saveStatus).toBe('error');
  });

  it('12.3 sends the full hotspots + hotspotData payload', async () => {
    let capturedBody: any = null;
    server.use(
      http.post('/api/lab/save-hotspots', async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ ok: true });
      })
    );

    const { result } = renderEditor(loadedItem);
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

  it('12.4 sets saveStatus to error and skips the API call when hasInvalidModuleLink is true', async () => {
    let called = false;
    server.use(
      http.post('/api/lab/save-hotspots', () => {
        called = true;
        return HttpResponse.json({ ok: true });
      })
    );

    const { result } = renderEditor(loadedItem);

    // Break validity: give the (only) loaded hotspot a topic but no id
    act(() => { result.current.updateModuleLink(0, 'hazards', null); });
    expect(result.current.hasInvalidModuleLink).toBe(true);

    await act(async () => { await result.current.saveToSupabase(); });

    expect(result.current.saveStatus).toBe('error');
    expect(called).toBe(false);
  });

  it('12.5 proceeds with the save once the module link is valid again', async () => {
    let called = false;
    server.use(
      http.post('/api/lab/save-hotspots', () => {
        called = true;
        return HttpResponse.json({ ok: true });
      })
    );

    const { result } = renderEditor(loadedItem);

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
  it('13.1 hands the cache-busted URL to onImageUploaded on a successful upload', async () => {
    const onImageUploaded = vi.fn();
    const { result } = renderEditor(loadedItem, { onImageUploaded });

    const fakeFile = new File(['fake image content'], 'test.jpg', { type: 'image/jpeg' });

    await act(async () => { await result.current.uploadImage(fakeFile as any); });

    expect(onImageUploaded).toHaveBeenCalledWith(expect.stringContaining('/uploads/mock-image.jpg?t='));
    expect(result.current.uploadStatus).toBe('uploaded');
  });

  it('13.2 sets uploadStatus to error, and does not call onImageUploaded, if the upload fails', async () => {
    const onImageUploaded = vi.fn();
    server.use(
      http.post('/api/lab/upload-image', () => HttpResponse.json({ ok: false, error: 'Upload failed' }))
    );

    const { result } = renderEditor(loadedItem, { onImageUploaded });
    const fakeFile = new File(['fake'], 'test.jpg', { type: 'image/jpeg' });

    await act(async () => { await result.current.uploadImage(fakeFile as any); });
    expect(result.current.uploadStatus).toBe('error');
    expect(onImageUploaded).not.toHaveBeenCalled();
  });
});

// 14. Test saveHotspotYoutubeVideo API call
describe('14. saveHotspotYoutubeVideo', () => {
  it('14.1 saves the draft YouTube URL and updates the hotspot\'s info', async () => {
    const { result } = renderEditor(loadedItem);
    act(() => { result.current.setSelected(0); });
    act(() => { result.current.changeVideoDraftYoutubeUrl('https://www.youtube.com/watch?v=xyz'); });

    await act(async () => { await result.current.saveHotspotYoutubeVideo(); });

    expect(result.current.draft[0].info.videoUrl).toBe('https://www.youtube.com/watch?v=xyz');
    expect(result.current.draft[0].info.videoType).toBe('youtube');
  });

  it('14.2 does nothing when there is no signed-in user', async () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    let called = false;
    server.use(
      http.put('/api/lab/video', () => { called = true; return HttpResponse.json({ ok: true, hazard: {} }); })
    );

    const { result } = renderEditor(loadedItem);
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

    const { result } = renderEditor(loadedItem);
    act(() => { result.current.setSelected(0); });
    act(() => { result.current.changeVideoDraftYoutubeUrl('not a real url'); });

    await act(async () => { await result.current.saveHotspotYoutubeVideo(); });

    expect(result.current.draft[0].info.videoUrl).toBeNull();
    expect(alertSpy).toHaveBeenCalledWith('Invalid URL');
    alertSpy.mockRestore();
  });
});

// 15. Test uploadHotspotMp4Video API call
describe('15. uploadHotspotMp4Video', () => {
  it('15.1 uploads the draft file, updates the hotspot\'s info, and clears the draft file', async () => {
    const { result } = renderEditor(loadedItem);
    act(() => { result.current.setSelected(0); });

    const fakeFile = new File(['fake video content'], 'test.mp4', { type: 'video/mp4' });
    act(() => { result.current.selectVideoDraftFile(fakeFile as any); });

    await act(async () => { await result.current.uploadHotspotMp4Video(); });

    expect(result.current.draft[0].info.videoUrl).toBe('/uploads/mock-video.mp4');
    expect(result.current.draft[0].info.videoType).toBe('mp4');
    expect(result.current.videoDraftFile).toBeNull();
  });

  it('15.2 alerts and leaves the hotspot unchanged on a failed upload', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    server.use(
      http.put('/api/lab/video', () => HttpResponse.json({ ok: false, error: 'Upload failed' }, { status: 500 }))
    );

    const { result } = renderEditor(loadedItem);
    act(() => { result.current.setSelected(0); });

    const fakeFile = new File(['fake video content'], 'test.mp4', { type: 'video/mp4' });
    act(() => { result.current.selectVideoDraftFile(fakeFile as any); });

    await act(async () => { await result.current.uploadHotspotMp4Video(); });

    expect(result.current.draft[0].info.videoUrl).toBeNull();
    expect(alertSpy).toHaveBeenCalledWith('Upload failed');
    alertSpy.mockRestore();
  });
});

// 16. Test removeHotspotVideo API call
describe('16. removeHotspotVideo', () => {
  it('16.1 clears the hotspot\'s video after confirming', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    const { result } = renderEditor(videoItem);
    act(() => { result.current.setSelected(0); });
    expect(result.current.draft[0].info.videoUrl).not.toBeNull();

    await act(async () => { await result.current.removeHotspotVideo(); });

    expect(result.current.draft[0].info.videoUrl).toBeNull();
    expect(result.current.draft[0].info.videoType).toBeNull();
    vi.restoreAllMocks();
  });

  it('16.2 does nothing if the confirmation is declined', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    let called = false;
    server.use(
      http.delete('/api/lab/video', () => { called = true; return HttpResponse.json({ ok: true, hazard: {} }); })
    );

    const { result } = renderEditor(videoItem);
    act(() => { result.current.setSelected(0); });

    await act(async () => { await result.current.removeHotspotVideo(); });

    expect(called).toBe(false);
    vi.restoreAllMocks();
  });

  it('16.3 alerts and leaves the hotspot unchanged on a failed removal', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    server.use(
      http.delete('/api/lab/video', () => HttpResponse.json({ ok: false, error: 'Removal failed' }, { status: 500 }))
    );

    const { result } = renderEditor(videoItem);
    act(() => { result.current.setSelected(0); });

    await act(async () => { await result.current.removeHotspotVideo(); });

    expect(result.current.draft[0].info.videoUrl).toBe('https://www.youtube.com/watch?v=abc');
    expect(alertSpy).toHaveBeenCalledWith('Removal failed');
    vi.restoreAllMocks();
  });
});

// 17. Test onSaved
describe('17. onSaved', () => {
  it('17.1 is called after a successful save', async () => {
    const onSaved = vi.fn();
    const { result } = renderEditor(loadedItem, { onSaved });
    await act(async () => { await result.current.saveToSupabase(); });
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('17.2 is not called after a failed save, or when the module link is invalid', async () => {
    const onSaved = vi.fn();
    server.use(http.post('/api/lab/save-hotspots', () => HttpResponse.json({ ok: false }, { status: 500 })));
    const { result } = renderEditor(loadedItem, { onSaved });

    await act(async () => { await result.current.saveToSupabase(); });
    act(() => { result.current.updateModuleLink(0, 'hazards', null); });
    await act(async () => { await result.current.saveToSupabase(); });

    expect(onSaved).not.toHaveBeenCalled();
  });

  it('17.3 is called after a video is saved, uploaded or removed, but not after a failure', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const onSaved = vi.fn();
    const { result } = renderEditor(videoItem, { onSaved });

    act(() => { result.current.setSelected(0); });
    await act(async () => { await result.current.removeHotspotVideo(); });
    expect(onSaved).toHaveBeenCalledTimes(1);

    server.use(http.put('/api/lab/video', () => HttpResponse.json({ ok: false, error: 'Nope' }, { status: 400 })));
    act(() => { result.current.changeVideoDraftYoutubeUrl('https://www.youtube.com/watch?v=xyz'); });
    await act(async () => { await result.current.saveHotspotYoutubeVideo(); });
    expect(onSaved).toHaveBeenCalledTimes(1);   // unchanged

    alertSpy.mockRestore();
    vi.restoreAllMocks();
  });
});