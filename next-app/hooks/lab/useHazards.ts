// hooks/lab/useHazards.ts
// Manages all hotspot state, Supabase load/save, drag logic, edit mode, lab image URL state and upload, and per-hotspot video embeds

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { MAX_MP4_BYTES } from '@/lib/video/video';
import {
	HazardType,
	hazardData as defaultHazardData,
	hotspots as defaultHotspots,
	HotspotConfig,
	HazardInfo,
} from '@/lib/hazards';   // Given "default" prefix as are fallbacks from hazards.ts, not the live data from Supabase

// ─── Types ────────────────────────────────────────────────────────────────────
// Bundles hazard info together with hotspot position for easier state management
export interface EditableHotspot extends Omit<HotspotConfig, 'type'> {
	type: string;
	info: HazardInfo;
}

// Export save, load and upload states, and video types so page file can use them
export type SaveStatus =   'idle' | 'saving' | 'saved' | 'error';
export type LoadStatus =   'loading' | 'ready' | 'error';
export type UploadStatus = 'idle' | 'uploading' | 'uploaded' | 'error';
export type VideoType =    'youtube' | 'mp4';

// ─── Constants ──────────────────────────────────────────────────────
const DEFAULT_IMAGE = '/lab.jpg';	// Default name of image file

// ─── Helpers ──────────────────────────────────────────────────────────────────
// Combines position data from defaultHotspots & text from defaultHazardData into editable array
export function buildDefaultHotspots(): EditableHotspot[] {
	return defaultHotspots.map((hs) => ({
		...hs,
		info: { ...defaultHazardData[hs.type] },
	}));
}

// Prevents dragging hotspots outside image boundaries
export function clamp(val: number, min: number, max: number) {
	return Math.max(min, Math.min(max, val));
}

// Generate a unique type key that doesn't clash with existing hotspots
export function generateType(existing: EditableHotspot[]): string {
	const existingTypes = new Set(existing.map((hs) => hs.type));
	let i = 1;
	while (existingTypes.has(`hazard_${i}`)) i++;
	return `hazard_${i}`;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useHazards(containerRef: React.RefObject<HTMLDivElement | null>) {
	const { user } = useAuth();
	
	// States
	const [hotspots, setHotspots]     = useState<EditableHotspot[]>(buildDefaultHotspots);   // Live array of hotspot data
	const [loadStatus, setLoadStatus] = useState<LoadStatus>('loading');                     // Tracks status of Supabase fetch
	const [editMode, setEditMode]     = useState(false);                                     // Whether edit mode is active
	const [selected, setSelected]     = useState<number | null>(null);                       // Index of hotspot currently being edited
	const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');                        // Handles appearance of save button in edit mode
	
	// Image state — starts with the local fallback, replaced by Supabase URL after load
	const [imageUrl, setImageUrl]         = useState<string>(DEFAULT_IMAGE);
	const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
	
	// Video editor state ─ Only one hotspot is ever being edited at a time.
	const [videoDraftType, setVideoDraftType]             = useState<VideoType>('youtube');
	const [videoDraftYoutubeUrl, setVideoDraftYoutubeUrl] = useState('');
	const [videoDraftFile, setVideoDraftFile]             = useState<File | null>(null);
	const [videoSaving, setVideoSaving]                   = useState(false);

	// ── Load hazards from Supabase on mount ─────────────────────────────────────────
	// Runs once when page first loads
	useEffect(() => {
		async function loadHazards() {
			try {
				// Fetch hazards from Supabase
				const res  = await fetch('/api/lab/load-hazards', { cache: 'no-store' });
				const json = await res.json();
				
				// If fetch fails or table empty, use hazards.ts instead
				if (!json.ok) {
  					console.error('load-hazards API error:', json.error);
  					setLoadStatus('error');
  					return;
				}
				
				if (!json.data?.length) {
  					setLoadStatus('ready');
  					return;
				}
				
				// If rows returned from fetch, maps into hotspot objects
				const loaded: EditableHotspot[] = json.data.map(
					(row: {
						type:           string;
						top:            string;
						left:           string;
						title:          string;
						text:           string;
						module_section: string | null;
						module_id:      string | null;
						video_url:      string | null;
						video_type:     string | null;
					}) => ({
						type: row.type as HazardType,
						top:  row.top,
						left: row.left,
						info: {
							title:         row.title,
							text:          row.text,
							moduleId:      row.module_id,
							moduleSection: row.module_section,
							videoUrl:      row.video_url,
							videoType:     row.video_type as VideoType | null,
						},
					})
				);
				
				setHotspots(loaded);	// Replace defaults
				setLoadStatus('ready');
			} catch {
				console.error('Failed to load hazards from Supabase — using defaults');
				setLoadStatus('error');
			}
		}
		loadHazards();
	}, []);
	
	// ── Load image URL from Supabase on mount ──────────────────────
	useEffect(() => {
		async function loadImage() {
			try {
				const res = await fetch('/api/lab/load-image', { cache: 'no-store' });
				const json = await res.json();
				if (json.ok && json.url) {
					// Append timestamp to bust browser cache on each load
					setImageUrl(`${json.url}?t=${Date.now()}`);
				} // If no image in storage yet, keep the local /lab.jpg fallback
			} catch {
				console.error('Failed to load image URL — using default');
			}
		}
		loadImage();
	}, []);

	// ── Keep video draft in sync with the selected hotspot ──────────────────
	// Maintains edits to embedded video for each hotspot
	useEffect(() => {
		if (selected === null) return;
		const hs = hotspots[selected];
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
				setHotspots((prev) =>
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
	// Updates either the title or text field for a chosen hotspot in state (i.e. not yet saved to Supabase)
	const updateInfo = useCallback((index: number, field: keyof HazardInfo, value: string | null) => {
		setHotspots((prev) =>
			prev.map((hs, i) => (i === index ? { ...hs, info: { ...hs.info, [field]: value } } : hs))
		);
	}, []);
	
	// Updates the position of a chosen hotspot in state (i.e. not yet saved to Supabase)
	const updatePosition = useCallback((index: number, field: 'top' | 'left', value: string) => {
		setHotspots((prev) =>
			prev.map((hs, i) => (i === index ? { ...hs, [field]: value } : hs))
		);
	}, []);

	// Updates the linked modules for a chosen hotspot in state (i.e. not yet saved to Supabase).
	const updateModuleLink = useCallback(
		(index: number, moduleSection: string | null, moduleId: string | null) => {
			setHotspots((prev) =>
				prev.map((hs, i) => (i === index ? { ...hs, info: { ...hs.info, moduleSection, moduleId } } : hs))
			);
		},
		[]
	);
	
	// ── Add hotspot ─────────────────────────────────────────────────────────
	const addHotspot = useCallback(() => {
		setHotspots((prev) => {
			const newHotspot: EditableHotspot = {
				type: generateType(prev),
				top:  '50%',
				left: '50%',
				info: {
					title: '⚠️ New Hazard',
					text:  'Describe this hazard here.',
					moduleId: null,
					moduleSection: null,
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
		setHotspots((prev) => prev.filter((_, i) => i !== index));
		setSelected(null);
	}, []);
	
	// ── Upload image ────────────────────────────────────────────────────────
	const uploadImage = useCallback(async (file: File) => {
		setUploadStatus('uploading');
		try {
			const formData = new FormData();
			formData.append('image', file);
			
			const res = await fetch('/api/lab/upload-image', {
				method: 'POST',
				body: formData,
			});
			
			const json = await res.json();
			if (!json.ok) throw new Error(json.error);
			
			// Update the displayed image immediately, with cache-busting timestamp
			setImageUrl(`${json.url}?t=${Date.now()}`);
			setUploadStatus('uploaded');
			setTimeout(() => setUploadStatus('idle'), 2500);
		} catch (err) {
			console.error('Image upload failed:', err);
			setUploadStatus('error');
			setTimeout(() => setUploadStatus('idle'), 3000);
		}
	}, []);
	
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
		const hs = hotspots[selected];

		try {
			setVideoSaving(true);
			const token = await user.getIdToken();
			const formData = new FormData();
			formData.append('hazardType', hs.type);
			formData.append('videoType', 'youtube');
			formData.append('videoUrl', videoDraftYoutubeUrl.trim());

			const res = await fetch('/api/lab/video', {
				method: 'PUT',
				headers: { Authorization: `Bearer ${token}` },
				body: formData,
			});
			const json = await res.json();
			if (!res.ok || !json.ok) throw new Error(json.error ?? 'Unable to save video.');

			updateInfo(selected, 'videoUrl', json.hazard.video_url);
			updateInfo(selected, 'videoType', json.hazard.video_type);
		} catch (err) {
			console.error('SAVE HOTSPOT YOUTUBE VIDEO ERROR:', err);
			alert(err instanceof Error ? err.message : 'Unable to save YouTube video.');
		} finally {
			setVideoSaving(false);
		}
	}, [user, selected, hotspots, videoDraftYoutubeUrl, updateInfo]);

	// Upload an embedded video to Supabase as an mp4 file
	const uploadHotspotMp4Video = useCallback(async () => {
		if (!user || selected === null || !videoDraftFile) return;
		const hs = hotspots[selected];

		try {
			setVideoSaving(true);
			const token = await user.getIdToken();
			const formData = new FormData();
			formData.append('hazardType', hs.type);
			formData.append('videoType', 'mp4');
			formData.append('file', videoDraftFile);

			const res = await fetch('/api/lab/video', {
				method: 'PUT',
				headers: { Authorization: `Bearer ${token}` },
				body: formData,
			});
			const json = await res.json();
			if (!res.ok || !json.ok) throw new Error(json.error ?? 'Unable to upload video.');

			updateInfo(selected, 'videoUrl', json.hazard.video_url);
			updateInfo(selected, 'videoType', json.hazard.video_type);
			setVideoDraftFile(null);
		} catch (err) {
			console.error('UPLOAD HOTSPOT MP4 VIDEO ERROR:', err);
			alert(err instanceof Error ? err.message : 'Unable to upload MP4 video.');
		} finally {
			setVideoSaving(false);
		}
	}, [user, selected, hotspots, videoDraftFile, updateInfo]);

	// Delete the embedded video from Supabase (no matter the type)
	const removeHotspotVideo = useCallback(async () => {
		if (!user || selected === null) return;
		const hs = hotspots[selected];

		const confirmed = window.confirm('Remove this video from the hotspot?');
		if (!confirmed) return;

		try {
			setVideoSaving(true);
			const token = await user.getIdToken();

			const res = await fetch('/api/lab/video', {
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
		} catch (err) {
			console.error('REMOVE HOTSPOT VIDEO ERROR:', err);
			alert(err instanceof Error ? err.message : 'Unable to remove video.');
		} finally {
			setVideoSaving(false);
		}
	}, [user, selected, hotspots, updateInfo]);

	// ── Linked-module validity ───────────────────────────────────────────────────
	// Hotspots must have both a section and module set, or neither.
	const hasInvalidModuleLink = hotspots.some(
		(hs) => (hs.info.moduleSection === null) !== (hs.info.moduleId === null)
	);

	// ── Save hazards to Supabase ────────────────────────────────────────────────────
	// Save current hotspots to Supabase
	const saveToSupabase = useCallback(async () => {
		// Cancel save if any hotspots have an invalid module link
		if (hasInvalidModuleLink) {
			setSaveStatus('error');
			setTimeout(() => setSaveStatus('idle'), 3000);
			return;
		}
		setSaveStatus('saving');	// Updated over course of function to show progress
		try {
			const res = await fetch('/api/lab/save-hazards', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					hotspots:   hotspots.map(({ type, top, left }) => ({ type, top, left })),
					hazardData: Object.fromEntries(hotspots.map((hs) => [hs.type, hs.info])),
				}),
			});
			if (!res.ok) throw new Error('API error');
			setSaveStatus('saved');
			setTimeout(() => setSaveStatus('idle'), 2500);
		} catch {
			setSaveStatus('error');
			setTimeout(() => setSaveStatus('idle'), 3000);
		}
	}, [hotspots]);
	
	// ── Reset ───────────────────────────────────────────────────────────────
	// Rebuild hotspots from hazards.ts and discard unsaved edits
	const resetDefaults = useCallback(() => {
		setHotspots(buildDefaultHotspots());
		setSelected(null);
	}, []);
	
	// ── live hazard info map for popup ──────────────────────────────────────
	// Converts hotspots array into a key-value map that the program can directly lookup hotspots from
	const liveHazardData: Record<string, HazardInfo> = Object.fromEntries(
		hotspots.map((hs) => [hs.type, hs.info])
	);
	
	return {
		hotspots,
		loadStatus,
		editMode,
		selected,
		toggleEditMode,
		setSelected,
		saveStatus,
		handleDragStart,
		updateInfo,
		updatePosition,
		updateModuleLink,
		hasInvalidModuleLink,
		addHotspot,
		deleteHotspot,
		imageUrl,
		uploadStatus,
		uploadImage,
		saveToSupabase,
		resetDefaults,
		liveHazardData,
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
