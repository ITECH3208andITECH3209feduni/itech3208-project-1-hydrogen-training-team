// app/lab/page.tsx  –  Interactive Hydrogen Lab
// Secret key sequence to enter edit mode: H → Z → E → D → I → T
// (type the letters in order within 2 seconds of each other; no modifier keys needed)

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';   // React hooks
import HazardPopup from '@/components/HazardPopup';
import Image from 'next/image';
import {
	HazardType,
	hazardData as defaultHazardData,
	hotspots as defaultHotspots,
	HotspotConfig,
	HazardInfo,
} from '@/lib/hazards';   // Given "default" prefix as are fallbacks from hazards.ts, not the live data from Supabase

// ─── Types ────────────────────────────────────────────────────────────────────
// Bundles hazard info together with hotspot position for easier state management
interface EditableHotspot extends HotspotConfig {
	info: HazardInfo;
}

// ─── Secret key sequence ──────────────────────────────────────────────────────
// Keystrokes needed to unlock edit mode
const SECRET_SEQUENCE = ['h', 'z', 'e', 'd', 'i', 't'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
// Combines position data from defaultHotspots & text from defaultHazardData into editable array
function buildDefaultHotspots(): EditableHotspot[] {
	return defaultHotspots.map((hs) => ({
		...hs,
		info: { ...defaultHazardData[hs.type] },
	}));
}
// Prevents dragging hotspots outside image boundaries
function clamp(val: number, min: number, max: number) {
	return Math.max(min, Math.min(max, val));
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LabPage() {
	// State
	const [activeHazard, setActiveHazard] = useState<HazardType | null>(null);							// Which hotspot's popup currently open (default none/null)
	const [hotspots, setHotspots]         = useState<EditableHotspot[]>(buildDefaultHotspots);			// Live array of hotspot data
	const [loadStatus, setLoadStatus]     = useState<'loading' | 'ready' | 'error'>('loading');			// Tracks status of Supabase fetch
	const [editMode, setEditMode]         = useState(false);											// Whether edit mode is active
	const [selected, setSelected]         = useState<number | null>(null);								// Index of hotspot currently being edited
	const [saveStatus, setSaveStatus]     = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');	// Handles appearance of save button in edit mode
	
	// Refs
	const seqRef       = useRef<string[]>([]);									// Tracks keypresses that have been typed for edit mode key sequence
	const seqTimeout   = useRef<ReturnType<typeof setTimeout> | null>(null);	// Timer to reset edit mode key sequence if take too long
	const containerRef = useRef<HTMLDivElement>(null);							// Attached to image container div, so drag logic knows its position & size

	// ── Load from Supabase on mount ───────────────────────────────────────────
	// Runs once when page first loads
	useEffect(() => {
		async function loadHazards() {
			try {
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

	// ── Secret key listener ───────────────────────────────────────────────────
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

	// ── Drag logic ────────────────────────────────────────────────────────────
	// Attaches listeners to a hotspot for dragging it around the image (after clicking and holding on it)
	const handleDragStart = useCallback(	// Wrapped in 'useCallback' so only recreated when edit mode changes
		(index: number) => (e: React.MouseEvent) => {
			if (!editMode) return;
			e.preventDefault();
			setSelected(index);
			
			const container = containerRef.current;
			if (!container) return;
			const rect = container.getBoundingClientRect();
			
			// Upon moving the mouse, calculate the mouse's position relative to the lab image
			const onMouseMove = (ev: MouseEvent) => {
				const topPct  = clamp(((ev.clientY - rect.top)  / rect.height) * 100, 0, 95);	
				const leftPct = clamp(((ev.clientX - rect.left) / rect.width)  * 100, 0, 95);
				// Update the hotspot's position
				setHotspots((prev) =>
					prev.map((hs, i) =>
						i === index
						? { ...hs, top: `${topPct.toFixed(1)}%`, left: `${leftPct.toFixed(1)}%` }
						: hs
					)
				);
			};
			// Upon releasing the mouse (i.e. not holding down the click), remove the listeners
			const onMouseUp = () => {
				window.removeEventListener('mousemove', onMouseMove);
				window.removeEventListener('mouseup', onMouseUp);
			};
			window.addEventListener('mousemove', onMouseMove);
			window.addEventListener('mouseup', onMouseUp);
		},
		[editMode]
	);
	
	// ── Text editing ──────────────────────────────────────────────────────────
	// Updates either the title or text field for a chosen hotspot in state (i.e. not saved to Supabase)
	const updateInfo = (index: number, field: keyof HazardInfo, value: string) =>
	setHotspots((prev) =>
		prev.map((hs, i) => (i === index ? { ...hs, info: { ...hs.info, [field]: value } } : hs))
	);
	
	// ── Save to Supabase ──────────────────────────────────────────────────────
	const saveToSupabase = async () => {
		setSaveStatus('saving');	// Updated over course of function to show progress
		// Send current hotspots to '/api/save-hazards' to be saved to Supabase
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
	};
	
	// Rebuild hotspots from hazards.ts and discard unsaved edits
	const resetDefaults = () => { setHotspots(buildDefaultHotspots()); setSelected(null); };
	
	const liveHazardData: Record<string, HazardInfo> = Object.fromEntries(
		hotspots.map((hs) => [hs.type, hs.info])
	);
	
	// ─────────────────────────────────────────────────────────────────────────
	
	return (
		<main className="main">
			{/* Edit Mode Banner - Yellow bar signaling edit mode active */}
			{editMode && (
				<div style={{
					background: 'rgba(250,204,21,0.08)', border: '1px solid rgba(250,204,21,0.35)',
					borderRadius: '10px', padding: '10px 20px', marginBottom: '18px',
					display: 'flex', alignItems: 'center', justifyContent: 'space-between',
					gap: '16px', flexWrap: 'wrap',
				}}>
				<span style={{ color: '#facc15', fontSize: '0.88rem', fontWeight: 600 }}>
					✏️ Edit Mode — drag hotspots to reposition · select one to edit text
				</span>
				<span style={{ color: 'rgba(250,204,21,0.55)', fontSize: '0.78rem' }}>
					Type the sequence again to exit
				</span>
				</div>
			)}
			
			{/* Header - Title and subtitle (latter changes based on loadStatus and editMode) */}
			<h1 style={{ fontSize: '28px', textAlign: 'center', color: 'var(--white)', marginTop: editMode ? '0' : '20px' }}>
				Interactive Hydrogen Lab
			</h1>
			<p style={{ color: 'var(--muted)', textAlign: 'center', marginTop: '6px' }}>
				{editMode ? 'Drag hotspots · select to edit · save when done'
					: loadStatus === 'loading' ? 'Loading lab data…'
					: 'Click on highlighted areas to identify hazards.'
				}
			</p>
			
			{/* Lab image - Includes hotspots */}
			{/* Hotspots turn blue in edit mode, yellow if selected */}
			<div
				ref={containerRef}
				className="panel"
				style={{
					position: 'relative', width: '70%', maxWidth: '900px',
					margin: '30px auto', padding: '20px', background: 'white',
					borderRadius: '14px', userSelect: editMode ? 'none' : 'auto',
					cursor: editMode ? 'crosshair' : 'default',
					outline: editMode ? '2px dashed rgba(250,204,21,0.4)' : 'none',
					outlineOffset: '4px',
					opacity: loadStatus === 'loading' ? 0.5 : 1, transition: 'opacity 0.3s',
				}}
			>
				<Image
					src="/lab.jpg"
					alt="Hydrogen Lab"
					width={900}
					height={600}
					style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '8px' }}
					priority
				/>
				
				{loadStatus === 'ready' && hotspots.map((hs, index) => {
					const isSelected = selected === index;
					return (
						<button
							key={hs.type}
							className="hotspot"
							style={{
								top: hs.top, left: hs.left,
								cursor: editMode ? 'grab' : 'pointer',
								outline: editMode && isSelected ? '3px solid #facc15' : undefined,
								outlineOffset: '3px',
								background: editMode
									? isSelected ? 'rgba(250,204,21,0.95)' : 'rgba(0,180,216,0.9)'
									: undefined,
							}}
							aria-label={`Inspect ${hs.type} hazard`}
							onMouseDown={editMode ? handleDragStart(index) : undefined}
							onClick={() => { if (editMode) setSelected(index); else setActiveHazard(hs.type); }}
						/>
					);
				})}
			</div>
			
			{/* Edit panel - Only visible in edit mode*/}
			{editMode && (
				<div style={{
					width: '70%', maxWidth: '900px', margin: '0 auto 24px',
					display: 'grid', gridTemplateColumns: '220px 1fr', gap: '16px', alignItems: 'start',
				}}>
					{/* Hotspot list */}
					<div className="panel" style={{ overflow: 'hidden' }}>
						<div className="panel-header">🎯 Hotspots</div>
						<div style={{ padding: '10px' }}>
							{hotspots.map((hs, index) => (
								<button key={hs.type} onClick={() => setSelected(index)} style={{
									display: 'block', width: '100%', textAlign: 'left',
									padding: '9px 12px', borderRadius: '8px', border: '1px solid',
									borderColor: selected === index ? 'var(--teal)' : 'transparent',
									background: selected === index ? 'rgba(0,180,216,0.12)' : 'transparent',
									color: selected === index ? 'var(--teal)' : 'var(--text)',
									cursor: 'pointer', fontSize: '0.85rem', marginBottom: '4px', transition: 'all 0.15s',
								}}>
									{hs.info.title.split(' ')[0]} {hs.type.charAt(0).toUpperCase() + hs.type.slice(1)}
									<div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '2px' }}>
										top {hs.top} · left {hs.left}
									</div>
								</button>
							))}
						</div>
					</div>
					{/* Text/position editor */}
					<div className="panel" style={{ overflow: 'hidden' }}>
						<div className="panel-header">
							✏️ {selected !== null ? `Editing: ${hotspots[selected].type}` : 'Select a hotspot'}
						</div>
						<div style={{ padding: '20px' }}>
							{selected === null ? (
								<p style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>
									Click a hotspot on the image or pick one from the list to edit its title and description.
								</p>
							) : (
								<div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
									<div style={{ display: 'flex', gap: '12px' }}>
										{(['top', 'left'] as const).map((field) => (
											<div key={field} style={{ flex: 1 }}>
												<label style={labelStyle}>{field.charAt(0).toUpperCase() + field.slice(1)} (%)</label>
												<input style={inputStyle} value={hotspots[selected][field]}
													onChange={(e) => setHotspots((prev) =>
														prev.map((hs, i) => i === selected ? { ...hs, [field]: e.target.value } : hs)
													)}
												/>
											</div>
										))}
									</div>
									<div>
										<label style={labelStyle}>Title</label>
										<input style={inputStyle} value={hotspots[selected].info.title}
											onChange={(e) => updateInfo(selected, 'title', e.target.value)}
											placeholder="e.g. ⚠️ Gas Leak Detection"
										/>
									</div>
									<div>
										<label style={labelStyle}>Description</label>
										<textarea style={{ ...inputStyle, minHeight: '100px', resize: 'vertical', lineHeight: '1.5' }}
											value={hotspots[selected].info.text}
											onChange={(e) => updateInfo(selected, 'text', e.target.value)}
										/>
									</div>
									<p style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
										💡 Drag the hotspot on the image to reposition — values above update automatically.
									</p>
								</div>
							)}
						</div>
					</div>
				</div>
			)}
			
			{/* Save / reset bar - Only visible in edit mode */}
			{/* Save button changes colour and label based on saveStatus */}
			{editMode && (
				<div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '40px' }}>
					<button onClick={resetDefaults} style={secondaryBtnStyle}>🔄 Reset to Defaults</button>
					<button onClick={saveToSupabase} disabled={saveStatus === 'saving'} style={{
						...primaryBtnStyle,
						opacity: saveStatus === 'saving' ? 0.7 : 1,
						background: saveStatus === 'saved'  ? 'linear-gradient(135deg, #059669, #10b981)'
							: saveStatus === 'error' ? 'linear-gradient(135deg, #b91c1c, #ef4444)'
							: primaryBtnStyle.background,
					}}>
					{saveStatus === 'saving' ? '⏳ Saving…'
						: saveStatus === 'saved'  ? '✅ Saved to database!'
						: saveStatus === 'error'  ? '❌ Save failed — check console'
						: '💾 Save Changes'}
					</button>
				</div>
			)}
			
			{!editMode && activeHazard && (
				<HazardPopup info={liveHazardData[activeHazard]} onClose={() => setActiveHazard(null)} />
			)}
		</main>
	);
}

const labelStyle: React.CSSProperties = {
	display: 'block', fontSize: '0.78rem', color: 'var(--muted)',
	marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px',
};
const inputStyle: React.CSSProperties = {
	width: '100%', padding: '9px 12px', borderRadius: '8px',
	border: '1px solid var(--border)', background: 'rgba(255,255,255,0.05)',
	color: 'var(--white)', fontSize: '0.88rem', fontFamily: 'inherit', outline: 'none',
};
const primaryBtnStyle: React.CSSProperties = {
	padding: '10px 24px', borderRadius: '8px', border: 'none',
	background: 'linear-gradient(135deg, var(--teal-dark), var(--teal))',
	color: 'white', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
	boxShadow: '0 4px 20px rgba(0,180,216,0.3)', transition: 'all 0.2s',
};
const secondaryBtnStyle: React.CSSProperties = {
	padding: '10px 24px', borderRadius: '8px', border: '1px solid var(--border)',
	background: 'var(--card-bg)', color: 'var(--muted)', fontWeight: 500,
	fontSize: '0.9rem', cursor: 'pointer',
};
