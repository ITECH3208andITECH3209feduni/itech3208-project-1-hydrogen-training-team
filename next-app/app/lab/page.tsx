// app/lab/page.tsx  –  Interactive Hydrogen Lab
// Secret key sequence to enter edit mode: H → Z → E → D → I → T
// (type each character in the sequence, in order, within 2 seconds of each other)

'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import HazardPopup from '@/components/HazardPopup';
import EditBanner from './components/EditBanner';
import HotspotEditor from './components/HotspotEditor';
import SaveBar from './components/SaveBar';
import { useHazards } from '@/hooks/useHazards';
import { HazardType } from '@/lib/hazards';

export default function LabPage() {
	const containerRef = useRef<HTMLDivElement>(null);							// Attached to image container div, so drag logic knows its position & size
	const [activeHazard, setActiveHazard] = useState<HazardType | null>(null);	// Which hotspot's popup is currently open (default none/null)
	
	const {
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
	} = useHazards(containerRef);
	
	return (
		<main className="main">
			
			{editMode && <EditBanner />}
			
			{/* Header - Title and subtitle (latter changes based on loadStatus and editMode */}
			<h1 className="lab-title">Interactive Hydrogen Lab</h1>
			<p className="lab-subtitle">
				{editMode ? 'Drag hotspots · select to edit · save when done'
					: loadStatus === 'loading' ? 'Loading lab data…'
					: 'Click on highlighted areas to identify hazards.'
				}
			</p>
			
			{/* Lab image + hotspots */}
			{/* Hotspots turn blue in edit mode, yellow if selected */}
			<div
				ref={containerRef}
				className={`lab-image-container panel ${editMode ? 'lab-image-container--edit' : ''}`}
				style={{ opacity: loadStatus === 'loading' ? 0.5 : 1 }}
			>
				<Image
					src={imageUrl}
					alt="Hydrogen Lab"
					width={900}
					height={600}
					className="lab-image"
					unoptimized
					priority
				/>
				
				{loadStatus === 'ready' && hotspots.map((hs, index) => {
					const isSelected = selected === index;
					return (
						<button
							key={hs.type}
							className={`hotspot ${editMode ? (isSelected ? 'hotspot--selected' : 'hotspot--edit') : ''}`}
							style={{ top: hs.top, left: hs.left }}
							aria-label={`Inspect ${hs.type} hazard`}
							onMouseDown={editMode ? handleDragStart(index) : undefined}
							onClick={() => { if (editMode) setSelected(index); else setActiveHazard(hs.type); }}
						/>
					);
				})}
			</div>
			
			{/* Edit panel - Only visible in edit mode*/}
			{editMode && (
				<HotspotEditor
					hotspots={hotspots}
					selected={selected}
					uploadStatus={uploadStatus}
					onSelect={setSelected}
					onUpdateInfo={updateInfo}
					onUpdatePosition={updatePosition}
					onAdd={addHotspot}
					onDelete={deleteHotspot}
					onUploadImage={uploadImage}
				/>
			)}
			
			{/* Save / reset bar - Only visible in edit mode */}
			{/* Save button changes colour and label based on saveStatus */}
			{editMode && (
				<SaveBar
					saveStatus={saveStatus}
					onReset={resetDefaults}
					onSave={saveToSupabase}
				/>
			)}
			
			{/* Hazard popup - Only appears outside edit mode and if clicked on a hotspot */}
			{!editMode && activeHazard && (
				<HazardPopup
					info={liveHazardData[activeHazard]}
					onClose={() => setActiveHazard(null)}
				/>
			)}
		</main>
	);
}
