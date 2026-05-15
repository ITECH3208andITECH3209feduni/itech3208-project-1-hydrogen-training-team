// app/lab/page.tsx  –  Interactive Hydrogen Lab (Hazards)

'use client';   // Marks as Client Component, makes interactive

import { useState } from 'react';
import Link from 'next/link';
import LabImage from '@/components/LabImage';
import HazardPopup from '@/components/HazardPopup';
import { HazardType, hazardData } from '@/lib/hazards';

export default function LabPage() {
	// Tracks which hotspot clicked (null = no popup)
	const [activeHazard, setActiveHazard] = useState<HazardType | null>(null);
	
	const handleHotspotClick = (type: HazardType) => setActiveHazard(type);
	const handleClose = () => setActiveHazard(null);
	
	// The actual page
	return (
		<div className="page-wrap">
			<nav className="nav">
				<div className="logo">
					<span>Hydrogen Lab Safety</span>
				</div>
				<div className="nav-links">
					<Link href="/"        className="nav-link">Home</Link>
					<Link href="/modules" className="nav-link">Modules</Link>
					<Link href="/lab"     className="nav-link active">Scenarios</Link>
					<Link href="/quizzes" className="nav-link">Quizzes</Link>
				</div>
				<div className="nav-right">
					<div className="avatar" title="My Account">JD</div>
				</div>
			</nav>
			
			<main className="main">
				<h1 style={{ marginTop: '20px', fontSize: '28px', textAlign: 'center', color: 'var(--white)' }}>
					Interactive Hydrogen Lab
				</h1>
				<p style={{ color: 'var(--muted)', textAlign: 'center', marginTop: '8px' }}>
					Click on highlighted areas to identify hazards.
				</p>
				
				<LabImage onHotspotClick={handleHotspotClick} />
				
				{activeHazard && (
					<HazardPopup
						info={hazardData[activeHazard]}
						onClose={handleClose}
					/>
				)}
			</main>
		</div>
	);
}
