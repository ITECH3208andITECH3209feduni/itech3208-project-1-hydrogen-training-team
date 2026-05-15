// Main page
// Renders lab image and popups together

'use client';   // Marks as Client Component, makes interactive

import { useState } from 'react';
import LabImage from '@/components/LabImage';
import HazardPopup from '@/components/HazardPopup';
import { HazardType, hazardData } from '@/lib/hazards';

export default function Home() {
	// Tracks which hotspot clicked (null = no popup)
	const [activeHazard, setActiveHazard] = useState<HazardType | null>(null);
	
	// Event Handlers
	const handleHotspotClick = (type: HazardType) => {
		setActiveHazard(type);  // Opens popup for hotspot clicked
	};
	
	const handleClose = () => {
		setActiveHazard(null);   // Closes popup
	};
	
	return (   // The actual page
		<main>
			<h1 style={{ marginTop: '20px', fontSize: '28px', textAlign: 'center' }}>
				Interactive Hydrogen Lab
			</h1>
			<p style={{ color: '#666', textAlign: 'center', marginTop: '8px' }}>
				Click on highlighted areas to identify hazards.
			</p>
			
			// Render lab image with hotspots
			<LabImage onHotspotClick={handleHotspotClick} />
			
			// Render popup when hotspot clicked
			{activeHazard && (
				<HazardPopup
					info={hazardData[activeHazard]}   // Looks up hazard in lib/hazards.ts
					onClose={handleClose}
				/>
			)}
		</main>
	);
}
