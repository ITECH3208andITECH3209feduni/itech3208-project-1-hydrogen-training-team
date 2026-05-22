// hooks/useHazards.ts
// Manages all hotspot state, Supabase load/save, drag logic, secret key sequence and lab image URL state and upload

import { useState, useRef, useCallback, useEffect } from 'react';
import {
	HazardType,
	hazardData as defaultHazardData,
	hotspots as defaultHotspots,
	HotspotConfig,
	HazardInfo,
} from '@/lib/hazards';   // Given "default" prefix as are fallbacks from hazards.ts, not the live data from Supabase

// ─── Types ────────────────────────────────────────────────────────────────────
// Bundles hazard info together with hotspot position for easier state management
export interface EditableHotspot extends HotspotConfig {
	info: HazardInfo;
}

// Export save, load and upload states so page file can use them
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
export type LoadStatus = 'loading' | 'ready' | 'error';
export type UploadStatus = 'idle' | 'uploading' | 'uploaded' | 'error';

// ─── Constants ──────────────────────────────────────────────────────
const SECRET_SEQUENCE = ['h', 'z', 'e', 'd', 'i', 't'];	// Secret key sequence to unlock edit mode
const DEFAULT_IMAGE   = '/lab.jpg';						// Default name of image file

// ─── Helpers ──────────────────────────────────────────────────────────────────
// Combines position data from defaultHotspots & text from defaultHazardData into editable array
export function buildDefaultHotspots(): EditableHotspot[] {
	return defaultHotspots.map((hs) => ({
		...hs,
		info: { ...defaultHazardData[hs.type] },
	}));
}

// Prevents dragging hotspots outside image boundaries
function clamp(val: number, min: number, max: number) {
	return Math.max(min, Math.min(max, val));
}

// Generate a unique type key that doesn't clash with existing hotspots
function generateType(existing: EditableHotspot[]): string {
	const existingTypes = new Set(existing.map((hs) => hs.type));
	let i = 1;
	while (existingTypes.has(`hazard_${i}`)) i++;
	return `hazard_${i}`;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useHazards(containerRef: React.RefObject<HTMLDivElement | null>) {
	// States
	const [hotspots, setHotspots]     = useState<EditableHotspot[]>(buildDefaultHotspots);	// Live array of hotspot data
	const [loadStatus, setLoadStatus] = useState<LoadStatus>('loading');					// Tracks status of Supabase fetch
	const [editMode, setEditMode]     = useState(false);									// Whether edit mode is active
	const [selected, setSelected]     = useState<number | null>(null);						// Index of hotspot currently being edited
	const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');						// Handles appearance of save button in edit mode
	
	// Image state — starts with the local fallback, replaced by Supabase URL after load
	const [imageUrl, setImageUrl]           = useState<string>(DEFAULT_IMAGE);
	const [uploadStatus, setUploadStatus]   = useState<UploadStatus>('idle');
	
	// Refs
	const seqRef     = useRef<string[]>([]);								// Tracks keypresses that have been typed for edit mode key sequence
	const seqTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);	// Timer to reset edit mode key sequence
	
	// ── Load hazards from Supabase on mount ─────────────────────────────────────────
	// Runs once when page first loads
	useEffect(() => {
		async function loadHazards() {
			try {
				// Fetch hazards from Supabase
				const res  = await fetch('/api/load-hazards', { cache: 'no-store' });
				const json = await res.json();
				
				// If table empty or fetch fails, use hazards.ts instead
				if (!json.ok || !json.data?.length) {
					setLoadStatus('ready');
					return;
				}
				
				// If rows returned from fetch, maps into hotspot objects
				const loaded: EditableHotspot[] = json.data.map(
					(row: { type: string; top: string; left: string; title: string; text: string }) => ({
						type: row.type as HazardType,
						top:  row.top,
						left: row.left,
						info: { title: row.title, text: row.text },
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
				const res = await fetch('/api/load-image', { cache: 'no-store' });
				const json = await res.json();
				if (json.ok && json.url) {
					// Append timestamp to bust browser cache on each load
					setImageUrl(`${json.url}?t=${Date.now()}`);
				}
				// If no image in storage yet, keep the local /lab.jpg fallback
			} catch {
				console.error('Failed to load image URL — using default');
			}
		}
		loadImage();
	}, []);
	
	// ── Secret key listener ─────────────────────────────────────────────────
	// Listens to keypresses on page
	useEffect(() => {
		const handleKey = (e: KeyboardEvent) => {
			const tag = (e.target as HTMLElement).tagName;
			if (tag === 'INPUT' || tag === 'TEXTAREA') return;	// Ignores keypresses inside inputs and textareas
			
			// Append keypresses to seqRef
			const key   = e.key.toLowerCase();
			const next  = [...seqRef.current, key];
			const slice = next.slice(-SECRET_SEQUENCE.length);
			
			// Key sequence resets if more than 2 seconds pass before next keystroke
			if (seqTimeout.current) clearTimeout(seqTimeout.current);
			seqTimeout.current = setTimeout(() => { seqRef.current = []; }, 2000);
			
			// Check if the keypresses match the length and content of the edit mode key sequence
			if (
				slice.length === SECRET_SEQUENCE.length &&
				slice.every((k, i) => k === SECRET_SEQUENCE[i])
			) {
				// If true, activates edit mode
				setEditMode((v) => { if (v) setSelected(null); return !v; });
				seqRef.current = [];
				clearTimeout(seqTimeout.current!);
			} else {
				seqRef.current = slice;
			}
		};
		window.addEventListener('keydown', handleKey);
		return () => window.removeEventListener('keydown', handleKey);	// Removes listener to prevent memory leaks
	}, []);
	
	// ── Drag logic ──────────────────────────────────────────────────────────
	// Attaches listeners to a hotspot for dragging it around the image (after clicking and holding on it)
	const handleDragStart = useCallback(
		(index: number) => (e: React.MouseEvent) => {
			if (!editMode) return;	// If edit mode not active, does nothing
			e.preventDefault();		// Stops browser's default drag behaviour
			setSelected(index);		// Highlights selected hotspot
			
			const container = containerRef.current;
			if (!container) return;
			const rect = container.getBoundingClientRect();	// Measures image container's position & size for reference
			
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
	const updateInfo = useCallback((index: number, field: keyof HazardInfo, value: string) => {
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
	
	// ── Add hotspot ─────────────────────────────────────────────────────────
	const addHotspot = useCallback(() => {
		setHotspots((prev) => {
			const newHotspot: EditableHotspot = {
				type: generateType(prev) as HazardType,
				top:  '50%',
				left: '50%',
				info: {
					title: '⚠️ New Hazard',
					text:  'Describe this hazard here.',
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
			
			const res = await fetch('/api/upload-image', {
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
	
	// ── Save hazards to Supabase ────────────────────────────────────────────────────
	// Save current hotspots to Supabase
	const saveToSupabase = useCallback(async () => {
		setSaveStatus('saving');	// Updated over course of function to show progress
		try {
			const res = await fetch('/api/save-hazards', {
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
		setSelected,
		saveStatus,
		handleDragStart,
		updateInfo,
		updatePosition,
		addHotspot,
		deleteHotspot,
		imageUrl,
		uploadStatus,
		uploadImage,
		saveToSupabase,
		resetDefaults,
		liveHazardData,
	};
}
