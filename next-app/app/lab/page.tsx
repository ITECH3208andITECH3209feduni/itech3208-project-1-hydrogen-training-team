'use client';



import { useRef, useState, useEffect } from 'react';

import Image from 'next/image';

import { useRouter } from "next/navigation";

import { useAuth } from "@/context/AuthContext";

import HazardPopup from './components/HazardPopup';

import EditBanner from './components/EditBanner';

import HotspotEditor from './components/HotspotEditor';

import SaveBar from './components/SaveBar';

import { useHazards } from '@/hooks/useHazards';

export default function LabPage() {

	const { user, loading } = useAuth();

	const router = useRouter();

	useEffect(() => {

		if (!loading && !user) {

			router.replace("/login");

		}

	}, [user, loading, router]);

	if (loading) {

		return <div>Loading...</div>;

	}

	if (!user) {

		return null;

	}

	const containerRef = useRef<HTMLDivElement>(null);

	const [activeHazard, setActiveHazard] =
		useState<string | null>(null);

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

			<h1 className="lab-title">
				Interactive Hydrogen Lab
			</h1>

			<p className="lab-subtitle">

				{editMode
					? 'Drag hotspots · select to edit · save when done'
					: loadStatus === 'loading'
					? 'Loading lab data…'
					: 'Click on highlighted areas to identify hazards.'
				}

			</p>

			<div
				ref={containerRef}
				className={`lab-image-container panel ${
					editMode
						? 'lab-image-container--edit'
						: ''
				}`}
				style={{
					opacity:
						loadStatus === 'loading'
							? 0.5
							: 1
				}}
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

				{loadStatus === 'ready' &&
					hotspots.map((hs, index) => {

						const isSelected =
							selected === index;

						return (

							<button
								key={hs.type}
								className={`hotspot ${
									editMode
										? (
											isSelected
												? 'hotspot--selected'
												: 'hotspot--edit'
										)
										: ''
								}`}
								style={{
									top: hs.top,
									left: hs.left
								}}
								aria-label={`Inspect ${hs.type} hazard`}
								onMouseDown={
									editMode
										? handleDragStart(index)
										: undefined
								}
								onClick={() => {

									if (editMode) {

										setSelected(index);

									} else {

										setActiveHazard(hs.type);

									}

								}}
							/>

						);

					})}

			</div>

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

			{editMode && (

				<SaveBar
					saveStatus={saveStatus}
					onReset={resetDefaults}
					onSave={saveToSupabase}
				/>

			)}

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