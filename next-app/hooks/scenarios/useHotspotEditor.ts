// hooks/scenarios/useHotspotEditor.ts
// Manages the /scenarios/hazards editor: edit mode, the draft hotspots, dragging, save/reset, lab image upload and per-hotspot embedded video.
// Live data comes from useHotspots (its `item`); this hook never loads anything itself.

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { MAX_MP4_BYTES } from '@/lib/video/video';
import { useUnsavedChanges } from '@/hooks/unsavedChanges/useUnsavedChanges';
import { HazardInfo } from '@/lib/hazards';
import { EditableHotspot, VideoType, buildDefaultHotspots } from './useHotspots';

export type SaveStatus =   'idle' | 'saving' | 'saved' | 'error';
export type UploadStatus = 'idle' | 'uploading' | 'uploaded' | 'error';

interface UseHotspotEditorOptions {
	onSaved?:         () => void;              // Called once something has been persisted (a save, or a video change), so live data can refresh
	onImageUploaded?: (url: string) => void;   // Called with the new (cache-busted) image URL after a successful upload
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
// Prevents dragging hotspots outside image boundaries
export function clamp(val: number, min: number, max: number) {
	return Math.max(min, Math.min(max, val));
}

// Generate a unique type key that doesn't clash with existing hotspots
export function generateType(existing: EditableHotspot[]): string {
	const existingTypes = new Set(existing.map((hs) => hs.type));
	let i = 1;
	while (existingTypes.has(`hotspot_${i}`)) i++;
	return `hotspot_${i}`;
}

// Make a snapshot of the current hotspots to compare against what was last loaded/saved. Used for warnings about unsaved changes
export function snapshotHotspots(hotspots: EditableHotspot[]): string {
	return JSON.stringify(
		hotspots.map((hs) => ({
			type: hs.type,
			top: hs.top,
			left: hs.left,
			title: hs.info.title,
			text: hs.info.text,
			moduleTopic: hs.info.moduleTopic ?? null,
			moduleId: hs.info.moduleId ?? null,
		}))
	);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
// containerRef: the image container, so drag logic knows its position & size.
// item: the live hotspots from useHotspots — seeds the draft. Pass a stable reference (state), not a fresh array each render.
export function useHotspotEditor(
	containerRef: React.RefObject<HTMLDivElement | null>,
	item: EditableHotspot[],
	{ onSaved, onImageUploaded }: UseHotspotEditorOptions = {}
) {
	const { user } = useAuth();

	// States
	const [draft, setDraft]           = useState<EditableHotspot[]>(item);   // Hotspots being edited
	const [editMode, setEditMode]     = useState(false);                     // Whether edit mode is active
	const [selected, setSelected]     = useState<number | null>(null);       // Index of hotspot currently being edited
	const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');        // Handles appearance of save button in edit mode

	// Whether the draft differs from what's stored, plus how to tell it what's now stored (see useUnsavedChanges)
	const { hasUnsavedChanges, markSaved } = useUnsavedChanges(draft, item, snapshotHotspots);
	// Unsaved-changes flag, stops background refreshes of live data overwriting in-progress edits.
	const hasUnsavedChangesRef = useRef(hasUnsavedChanges);
	hasUnsavedChangesRef.current = hasUnsavedChanges;

	// Image upload state
	const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');

	// Video editor state ─ Only one hotspot video is ever being edited at a time.
	const [videoDraftType, setVideoDraftType]               = useState<VideoType>('youtube');
	const [videoDraftYoutubeUrl, setVideoDraftYoutubeUrl]   = useState('');
	const [videoDraftFile, setVideoDraftFile]               = useState<File | null>(null);
	const [videoSaving, setVideoSaving]                     = useState(false);

	// ── Keep the draft in step with the live data ────────────────────────────────
	// Maintain unsaved edits until they are saved or reverted; otherwise follow the live data.
	useEffect(() => {
		if (!hasUnsavedChangesRef.current) setDraft(item);
		markSaved(item);
	}, [item, markSaved]);

	// ── Keep video draft in sync with the selected hotspot ──────────────────
	// Maintains edits to embedded video for each hotspot
	useEffect(() => {
		if (selected === null) return;
		const hs = draft[selected];
		if (!hs) return;
		setVideoDraftType(hs.info.videoType === 'mp4' ? 'mp4' : 'youtube');
		setVideoDraftYoutubeUrl(hs.info.videoType === 'youtube' ? hs.info.videoUrl ?? '' : '');
		setVideoDraftFile(null);
	}, [selected]);

	// ── Edit mode toggle ────────────────────────────────────────────────────
	// A toggle switch for edit mode, only seen if the user is an admin.
	const toggleEditMode = useCallback(() => {
		setEditMode((v) => {
			if (v) setSelected(null);	// clear selection when leaving edit mode
			return !v;
		});
	}, []);

	// ── Drag logic ──────────────────────────────────────────────────────────
	// Attaches listeners to a hotspot for dragging it around the image (after clicking and holding on it)
	const handleDragStart = useCallback(
		(index: number) => (e: React.MouseEvent) => {
			if (!editMode) return;   // If edit mode not active, does nothing
			e.preventDefault();      // Stops browser's default drag behaviour
			setSelected(index);      // Highlights selected hotspot

			const container = containerRef.current;
			if (!container) return;
			const rect = container.getBoundingClientRect();   // Measures image container's position & size for reference

			// Upon moving the mouse, calculate the mouse's position relative to the lab image
			const onMouseMove = (ev: MouseEvent) => {
				// Calculate position of hotspot as percentage values
				const topPct  = clamp(((ev.clientY - rect.top)  / rect.height) * 100, 0, 95);
				const leftPct = clamp(((ev.clientX - rect.left) / rect.width)  * 100, 0, 95);
				// Update the hotspot's position (toFixed(1) rounds to one decimal place)
				setDraft((prev) =>
					prev.map((hs, i) =>
						i === index
						? { ...hs, top: `${topPct.toFixed(1)}%`, left: `${leftPct.toFixed(1)}%` }
						: hs
					)
				);
			};

			// Upon releasing the mouse (i.e. not holding down the click), remove the listeners (Otherwise drag would continue)
			const onMouseUp = () => {
				window.removeEventListener('mousemove', onMouseMove);
				window.removeEventListener('mouseup', onMouseUp);
			};

			// Attach listeners to window for better performance (i.e. Drag is smooth regardless of mouse speed)
			window.addEventListener('mousemove', onMouseMove);
			window.addEventListener('mouseup', onMouseUp);
		},
		[editMode, containerRef]
	);

	// ── Hotspot editing ────────────────────────────────────────────────────────
	// Updates a field of a chosen hotspot's info in the draft (i.e. not yet saved to Supabase)
	const updateInfo = useCallback((index: number, field: keyof HazardInfo, value: string | null) => {
		setDraft((prev) =>
			prev.map((hs, i) => (i === index ? { ...hs, info: { ...hs.info, [field]: value } } : hs))
		);
	}, []);

	// Updates the position of a chosen hotspot in the draft
	const updatePosition = useCallback((index: number, field: 'top' | 'left', value: string) => {
		setDraft((prev) =>
			prev.map((hs, i) => (i === index ? { ...hs, [field]: value } : hs))
		);
	}, []);

	// Updates the linked module for a chosen hotspot in the draft
	const updateModuleLink = useCallback((index: number, moduleTopic: string | null, moduleId: string | null) => {
        setDraft((prev) =>
            prev.map((hs, i) => (i === index ? { ...hs, info: { ...hs.info, moduleTopic, moduleId } } : hs))
        );
    }, []);

	// ── Add hotspot ─────────────────────────────────────────────────────────
	const addHotspot = useCallback(() => {
		setDraft((prev) => {
			const newHotspot: EditableHotspot = {
				type: generateType(prev),
				top:  '50%',
				left: '50%',
				info: {
					title: '⚠️ New Hotspot',
					text:  'Describe this hotspot here.',
					moduleId: null,
					moduleTopic: null,
					videoUrl: null,
					videoType: null,
				},
			};
			const next = [...prev, newHotspot];
			// Auto-select the new hotspot
			setTimeout(() => setSelected(next.length - 1), 0);
			return next;
		});
	}, []);

	// ── Delete hotspot ──────────────────────────────────────────────────────
	const deleteHotspot = useCallback((index: number) => {
		setDraft((prev) => prev.filter((_, i) => i !== index));
		setSelected(null);
	}, []);

	// ── Upload image ────────────────────────────────────────────────────────
	const uploadImage = useCallback(async (file: File) => {
		setUploadStatus('uploading');
		try {
			const formData = new FormData();
			formData.append('image', file);

			const res = await fetch('/api/scenarios/upload-image', {
				method: 'POST',
				body: formData,
			});

			const json = await res.json();
			if (!json.ok) throw new Error(json.error);

			// Hand the new URL (with cache-busting timestamp) to whoever owns the displayed image
			onImageUploaded?.(`${json.url}?t=${Date.now()}`);
			setUploadStatus('uploaded');
			setTimeout(() => setUploadStatus('idle'), 2500);
		} catch (err) {
			console.error('Image upload failed:', err);
			setUploadStatus('error');
			setTimeout(() => setUploadStatus('idle'), 3000);
		}
	}, [onImageUploaded]);

	// ── Video editing ────────────────────────────────────────────────────────
	const changeVideoDraftType = useCallback((type: VideoType) => setVideoDraftType(type), []);
	const changeVideoDraftYoutubeUrl = useCallback((url: string) => setVideoDraftYoutubeUrl(url), []);

	// Check the mp4 file is below the size limit
	const selectVideoDraftFile = useCallback((file: File | null) => {
		if (file && file.size > MAX_MP4_BYTES) {
			alert('MP4 videos must be smaller than 50MB.');
			return;
		}
		setVideoDraftFile(file);
	}, []);

	// Save an embedded video to Supabase as a YouTube link
	const saveHotspotYoutubeVideo = useCallback(async () => {
		if (!user || selected === null || !videoDraftYoutubeUrl.trim()) return;
		const hs = draft[selected];

		try {
			setVideoSaving(true);
			const token = await user.getIdToken();
			const formData = new FormData();
			formData.append('hazardType', hs.type);
			formData.append('videoType', 'youtube');
			formData.append('videoUrl', videoDraftYoutubeUrl.trim());

			const res = await fetch('/api/scenarios/video', {
				method: 'PUT',
				headers: { Authorization: `Bearer ${token}` },
				body: formData,
			});
			const json = await res.json();
			if (!res.ok || !json.ok) throw new Error(json.error ?? 'Unable to save video.');

			updateInfo(selected, 'videoUrl', json.hazard.video_url);
			updateInfo(selected, 'videoType', json.hazard.video_type);
			onSaved?.();   // Videos persist immediately, so the live data needs to catch up
		} catch (err) {
			console.error('SAVE HOTSPOT YOUTUBE VIDEO ERROR:', err);
			alert(err instanceof Error ? err.message : 'Unable to save YouTube video.');
		} finally {
			setVideoSaving(false);
		}
	}, [user, selected, draft, videoDraftYoutubeUrl, updateInfo, onSaved]);

	// Upload an embedded video to Supabase as an mp4 file
	const uploadHotspotMp4Video = useCallback(async () => {
		if (!user || selected === null || !videoDraftFile) return;
		const hs = draft[selected];

		try {
			setVideoSaving(true);
			const token = await user.getIdToken();
			const formData = new FormData();
			formData.append('hazardType', hs.type);
			formData.append('videoType', 'mp4');
			formData.append('file', videoDraftFile);

			const res = await fetch('/api/scenarios/video', {
				method: 'PUT',
				headers: { Authorization: `Bearer ${token}` },
				body: formData,
			});
			const json = await res.json();
			if (!res.ok || !json.ok) throw new Error(json.error ?? 'Unable to upload video.');

			updateInfo(selected, 'videoUrl', json.hazard.video_url);
			updateInfo(selected, 'videoType', json.hazard.video_type);
			setVideoDraftFile(null);
			onSaved?.();
		} catch (err) {
			console.error('UPLOAD HOTSPOT MP4 VIDEO ERROR:', err);
			alert(err instanceof Error ? err.message : 'Unable to upload MP4 video.');
		} finally {
			setVideoSaving(false);
		}
	}, [user, selected, draft, videoDraftFile, updateInfo, onSaved]);

	// Delete the embedded video from Supabase (no matter the type)
	const removeHotspotVideo = useCallback(async () => {
		if (!user || selected === null) return;
		const hs = draft[selected];

		const confirmed = window.confirm('Remove this video from the hotspot?');
		if (!confirmed) return;

		try {
			setVideoSaving(true);
			const token = await user.getIdToken();

			const res = await fetch('/api/scenarios/video', {
				method: 'DELETE',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ hazardType: hs.type }),
			});
			const json = await res.json();
			if (!res.ok || !json.ok) throw new Error(json.error ?? 'Unable to remove video.');

			updateInfo(selected, 'videoUrl', null);
			updateInfo(selected, 'videoType', null);
			setVideoDraftYoutubeUrl('');
			setVideoDraftFile(null);
			setVideoDraftType('youtube');
			onSaved?.();
		} catch (err) {
			console.error('REMOVE HOTSPOT VIDEO ERROR:', err);
			alert(err instanceof Error ? err.message : 'Unable to remove video.');
		} finally {
			setVideoSaving(false);
		}
	}, [user, selected, draft, updateInfo, onSaved]);

	// ── Linked-module validity ───────────────────────────────────────────────────
	// Hotspots must have both a topic and module set, or neither.
	const hasInvalidModuleLink = draft.some(
		(hs) => (hs.info.moduleTopic === null) !== (hs.info.moduleId === null)
	);

	// ── Save hotspots to Supabase ────────────────────────────────────────────────────
	const saveToSupabase = useCallback(async () => {
		// Cancel save if any hotspots have an invalid module link
		if (hasInvalidModuleLink) {
			setSaveStatus('error');
			setTimeout(() => setSaveStatus('idle'), 3000);
			return;
		}
		setSaveStatus('saving');	// Updated over course of function to show progress
		try {
			const res = await fetch('/api/scenarios/save-hotspots', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					hotspots:   draft.map(({ type, top, left }) => ({ type, top, left })),
					hotspotData: Object.fromEntries(draft.map((hs) => [hs.type, hs.info])),
				}),
			});
			if (!res.ok) throw new Error('API error');
			markSaved(draft);   // `draft` is the closure value that was sent, so edits made while saving stay unsaved
			setSaveStatus('saved');
			setTimeout(() => setSaveStatus('idle'), 2500);
			onSaved?.();
		} catch {
			setSaveStatus('error');
			setTimeout(() => setSaveStatus('idle'), 3000);
		}
	}, [draft, hasInvalidModuleLink, markSaved, onSaved]);

	// ── Reset ───────────────────────────────────────────────────────────────
	// Rebuild hotspots from hazards.ts and discard unsaved edits
	const resetDefaults = useCallback(() => {
		setDraft(buildDefaultHotspots());
		setSelected(null);
	}, []);

	return {
		draft,
		editMode,
		toggleEditMode,
		hasUnsavedChanges,
		selected,
		setSelected,
		saveStatus,
		handleDragStart,
		updateInfo,
		updatePosition,
		updateModuleLink,
		hasInvalidModuleLink,
		addHotspot,
		deleteHotspot,
		uploadStatus,
		uploadImage,
		saveToSupabase,
		resetDefaults,
		videoDraftType,
		videoDraftYoutubeUrl,
		videoDraftFile,
		videoSaving,
		changeVideoDraftType,
		changeVideoDraftYoutubeUrl,
		selectVideoDraftFile,
		saveHotspotYoutubeVideo,
		uploadHotspotMp4Video,
		removeHotspotVideo,
	};
}