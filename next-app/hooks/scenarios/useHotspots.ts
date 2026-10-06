// hooks/scenarios/useHotspots.ts
// Loads the lab's live hotspot data and image URL from Supabase, with fallback to the bundled defaults in lib/hazards.ts.
// Editing/saving lives in useHotspotEditor.ts, per-user click tracking in useHotspotProgress.ts.

import { useState, useCallback, useEffect } from 'react';
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

// load states and video types so page file can use them
export type LoadStatus =   'loading' | 'ready' | 'error';
export type VideoType =    'youtube' | 'mp4';

// ─── Constants ────────────────────────────────────────────────────────────────
const DEFAULT_IMAGE = '/lab.jpg';	// Default name of image file

// ─── Helpers ──────────────────────────────────────────────────────────────────
// Combines position data from defaultHotspots & text from defaultHazardData into editable array
export function buildDefaultHotspots(): EditableHotspot[] {
	return defaultHotspots.map((hs) => ({
		...hs,
		info: { ...defaultHazardData[hs.type] },
	}));
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useHotspots() {
	// States
	const [hotspots, setHotspots]     = useState<EditableHotspot[]>(buildDefaultHotspots);   // Live array of hotspot data
	const [loadStatus, setLoadStatus] = useState<LoadStatus>('loading');                     // Tracks status of Supabase fetch
	const [imageUrl, setImageUrl]         = useState<string>(DEFAULT_IMAGE);                 // Image state — starts with the local fallback, replaced by Supabase URL after load
	const [reloadKey, setReloadKey]   = useState(0);

	// Re-fetches the live hotspots (e.g. after the editor has saved). Doesn't flip loadStatus back to 'loading'.
	const reload = useCallback(() => setReloadKey((k) => k + 1), []);

	// ── Load hotspots from Supabase ─────────────────────────────────────────
	// Runs once when page first loads, again on reload
	useEffect(() => {
		let cancelled = false;
		
		async function loadHotspots() {
			try {
				// Fetch hotspots from Supabase
				const res  = await fetch('/api/scenarios/load-hotspots', { cache: 'no-store' });
				const json = await res.json();
				if (cancelled) return;
				
				// If fetch fails, use fallback
				if (!json.ok) {
  					console.error('load-hotspots API error:', json.error);
  					setLoadStatus((s) => (s === 'ready' ? s : 'error'));
  					return;
				}
				
				// If table empty, use fallback
				if (!json.data?.length) {
					setHotspots(buildDefaultHotspots());
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
						module_topic:   string | null;
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
							moduleTopic:   row.module_topic,
							videoUrl:      row.video_url,
							videoType:     row.video_type as VideoType | null,
						},
					})
				);
				
				setHotspots(loaded);	// Replace defaults
				setLoadStatus('ready');
			} catch {
				if (!cancelled) {
					console.error('Failed to load hotspots from Supabase — using defaults');
					setLoadStatus((s) => (s === 'ready' ? s : 'error'));
				}
			}
		}
		loadHotspots();
		return () => { cancelled = true; };
	}, [reloadKey]);
	
	// ── Load image URL from Supabase on mount ──────────────────────
	useEffect(() => {
		async function loadImage() {
			try {
				const res = await fetch('/api/scenarios/load-image', { cache: 'no-store' });
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

	// ── live hotspot info map for popup ──────────────────────────────────────
	// Converts hotspots array into a key-value map that the program can directly lookup hotspots from
	const liveHotspotData: Record<string, HazardInfo> = Object.fromEntries(
		hotspots.map((hs) => [hs.type, hs.info])
	);
	
	return {
		hotspots,
		loadStatus,
		imageUrl,
		setImageUrl,
		reload,
		liveHotspotData,
	};
}
