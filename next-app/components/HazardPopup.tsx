// The textbox that appears upon clicking a hotspot

'use client';   // Marks as Client Component, makes interactive

import { useEffect } from 'react';   // For keyboard listener
import { HazardInfo } from '@/lib/hazards';   // Imports the hazard info from lib/hazards.ts

// Defines props that this component accepts
interface HazardPopupProps {
	info: HazardInfo;   // Hazard data to display
	onClose: () => void;   // Function to close popup
}

export default function HazardPopup({ info, onClose }: HazardPopupProps) {
	// Close popup on Escape key
	useEffect(() => {
		const handleKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose();
		};
		window.addEventListener('keydown', handleKey);
		return () => window.removeEventListener('keydown', handleKey);   // Removes listener to prevent memory leak
	}, [onClose]);
	
	return (
		// Darken & blur background
		<div
			className="popup-overlay"
			onClick={(e) => {
				// Popup only closes if click outside popup
				if (e.target === e.currentTarget) onClose();
			}}
			role="dialog"
			aria-modal="true"
			aria-labelledby="popup-title"
		>
			// Popup
			<div className="popup-content">
				// Popup close button
				<button className="close-btn" onClick={onClose} aria-label="Close">
					×
				</button>
				<h2 id="popup-title">{info.title}</h2>   // Hazard title
				<p id="popup-text">{info.text}</p>   // Hazard text
			</div>
		</div>
	);
}
