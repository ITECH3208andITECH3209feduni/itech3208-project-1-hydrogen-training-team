// components/HazardPopup.tsx
// Modal popup shown when a hotspot is clicked

'use client';   // Marks as Client Component, makes interactive

import Link from 'next/link';				// For 'Learn More' links
import { useEffect } from 'react';			// For keyboard listener
import { HazardInfo } from '@/lib/hazards';	// Imports the hazard info from lib/hazards.ts

// Defines props that this component accepts
interface HazardPopupProps {
	info: HazardInfo;		// Hazard data to display
	onClose: () => void;	// Function to close popup
}

export default function HazardPopup({ info, onClose }: HazardPopupProps) {
	// Close popup on Escape key
	useEffect(() => {
		const handleKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose();
		};
		window.addEventListener('keydown', handleKey);
		return () => window.removeEventListener('keydown', handleKey);	// Removes listener to prevent memory leak
	}, [onClose]);
	
	return (
		<div
			className="popup-overlay"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
			role="dialog"
			aria-modal="true"
			aria-labelledby="popup-title"
		>
			<div className="popup-content">
				{/* Close button */}
				<button className="close-btn" onClick={onClose} aria-label="Close">
					×
				</button>
				{/* Title & Text */}
				<h2 id="popup-title">{info.title}</h2>
				<p id="popup-text">{info.text}</p>
				{/* Learn More button (only renders if connected to a module) */}
				{info.moduleSection && info.moduleId && (
					<Link
						href={`/modules/${info.moduleSection}/${info.moduleId}`}
						className="popup-module-link"
						onClick={onClose}
					>
						Learn More →
					</Link>
				)}
			</div>
		</div>
	);
}
