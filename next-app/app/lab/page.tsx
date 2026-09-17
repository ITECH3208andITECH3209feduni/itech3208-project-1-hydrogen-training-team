// app/lab/page.tsx  –  Interactive Hydrogen Lab
// Edit mode entered/exited via toggle switch (only visible to admins)

'use client';

import './lab.css';		// css specific to this page
import { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import HazardPopup from './components/HazardPopup';
import EditModeToggle from '@/components/EditModeToggle';
import HotspotEditor from './components/HotspotEditor';
import SaveBar from '@/components/SaveBar';
import { useHazards } from '@/hooks/useHazards';
import { useModuleOptions } from '@/hooks/useModuleOptions';

export default function LabPage() {
	// Authentication
	const { user, loading, permissions } = useAuth();
	const router = useRouter();

	// Page constants
	const containerRef = useRef<HTMLDivElement>(null);						// Attached to image container div, so drag logic knows its position & size
	const [activeHazard, setActiveHazard] = useState<string | null>(null);	// Which hotspot's popup is currently open (default none/null)

	const {
		hotspots,
		loadStatus,
		editMode,
		toggleEditMode,
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
	} = useHazards(containerRef);

	const moduleOptions = useModuleOptions();

	useEffect(() => {
		if (!loading && !user) {
			router.replace("/login");
		}
	}, [user, loading, router]);

	// Safety Net - Exit edit mode if lose permission mid-session (e.g. role change)
	useEffect(() => {
		if (editMode && !permissions.canManageUsers) {
			toggleEditMode();
		}
	}, [editMode, permissions.canManageUsers, toggleEditMode]);

	async function recordHazardProgress(hazardId: string) {
    if (!user) return;

    try {
        const token = await user.getIdToken();

        const response = await fetch(
            "/api/hazards/progress",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    hazardId,
                }),
            }
        );

        if (!response.ok) {
            const data = await response.json();

            console.error(
                "Failed to record hazard progress:",
                data.error
            );
        }
    } catch (error) {
        console.error(
            "Failed to record hazard progress:",
            error
        );
    }
}

	if (loading) {
		return <div>Loading...</div>;
	}

	if (!user) {
		return null;
	}
	
	return (
		<main className="main">

			{/* Edit mode toggle — only visible to permitted users */}
			{permissions.canManageUsers && (
				<EditModeToggle editMode={editMode} onToggle={toggleEditMode} className="lab-edit-mode-toggle-bar" />
			)}
			
			{/* Header */}
			{/* Title and subtitle (latter changes based on loadStatus and editMode */}
			<h1 className="lab-title">Interactive Hydrogen Lab</h1>
			<p className="lab-subtitle">
				{editMode ? 'Drag hotspots · select to edit · save when done'
					: loadStatus === 'loading' ? 'Loading lab data…'
					: loadStatus === 'error'   ? 'Could not load latest lab data — showing defaults.'
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

				{loadStatus !== 'loading' && hotspots.map((hs, index) => {
					const isSelected = selected === index;
					return (
						<button
							key={hs.type}
							className={`hotspot ${editMode ? (isSelected ? 'hotspot--selected' : 'hotspot--edit') : ''}`}
							style={{ top: hs.top, left: hs.left }}
							aria-label={`Inspect ${hs.type} hazard`}
							onMouseDown={editMode ? handleDragStart(index) : undefined}
							onClick={() => {
								if (editMode) {
									setSelected(index);
								} else {
									setActiveHazard(hs.type);
									recordHazardProgress(hs.type);
								}
							}}
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
					moduleOptions={moduleOptions}
					onSelect={setSelected}
					onUpdateInfo={updateInfo}
					onUpdatePosition={updatePosition}
					onUpdateModuleLink={updateModuleLink}
					onAdd={addHotspot}
					onDelete={deleteHotspot}
					onUploadImage={uploadImage}
					videoType={videoDraftType}
					youtubeUrl={videoDraftYoutubeUrl}
					selectedVideoFile={videoDraftFile}
					videoSaving={videoSaving}
					onChangeVideoType={changeVideoDraftType}
					onChangeYoutubeUrl={changeVideoDraftYoutubeUrl}
					onSelectVideoFile={selectVideoDraftFile}
					onSaveYoutubeVideo={saveHotspotYoutubeVideo}
					onUploadMp4Video={uploadHotspotMp4Video}
					onRemoveVideo={removeHotspotVideo}
				/>
			)}
			
			{/* Save / reset bar - Only visible in edit mode */}
			{/* Save button changes colour and label based on saveStatus */}
			{editMode && (
				<SaveBar
					saveStatus={saveStatus}
					onReset={resetDefaults}
					onSave={saveToSupabase}
					saveDisabled={hasInvalidModuleLink}
					saveDisabledReason="One or more hotspots have a module section without a module selected (or vice versa). Pick a module or set the link back to “None” for each before saving."
				/>
			)}
			
			{/* Hazard popup - Only appears outside edit mode and if clicked on a hotspot */}
			{!editMode && activeHazard && (
				<HazardPopup
					info={liveHazardData[activeHazard]}
					onClose={() =>
						setActiveHazard(null)
					}
				/>
			)}
		</main>
	);
}