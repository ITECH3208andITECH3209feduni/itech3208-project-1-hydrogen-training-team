// Renders the lab image and overlays the clickable hotspots.

'use client';   // Marks as Client Component, makes interactive

import Image from 'next/image';   // Next.js optimised Image component (replaces <img> tag)
import { HazardType, hotspots } from '@/lib/hazards';   // Imports hotspots & hazard info from data file

interface LabImageProps {
	onHotspotClick: (type: HazardType) => void;
}

export default function LabImage({ onHotspotClick }: LabImageProps) {
	return (
		<div
			className="panel"
			style={{
				position: 'relative',
				width: '70%',
				maxWidth: '900px',
				margin: '30px auto',
				padding: '20px',
				background: 'white',
			}}
		>
			<Image   // Auto-optimises image file size and format
				src="/lab.jpg"   // From public folder
				alt="Hydrogen Lab"
				width={900}   // Required to prevent layout shift while image loads
				height={600}
				style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '8px' }}
				priority   // Tells Next.js to preload image
			/>
			
			{hotspots.map(({ type, top, left }) => (   // Renders each hotspot in its stated position (from lib/hazards.ts)
				<button
					key={type}   // Identifies individual hazards
					className="hotspot"
					style={{ top, left }}   // Each hotspot positioned absolutely
					onClick={() => onHotspotClick(type)}   // Bubbles up to page.tsx to open popup
					aria-label={`Inspect ${type} hazard`}   // Adds description for screen readers
				/>
			))}
		</div>
	);
}
