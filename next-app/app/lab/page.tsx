'use client';

import { useState, useEffect } from 'react';

import Link from 'next/link';

import { useRouter } from "next/navigation";

import { useAuth } from "@/context/AuthContext";

import LabImage from '@/components/LabImage';

import HazardPopup from '@/components/HazardPopup';

import { HazardType, hazardData } from '@/lib/hazards';

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

	const [activeHazard, setActiveHazard] =
		useState<HazardType | null>(null);

	const handleHotspotClick = (
		type: HazardType
	) => setActiveHazard(type);

	const handleClose = () =>
		setActiveHazard(null);

	return (

		<main className="main">

			<h1
				style={{
					marginTop: '20px',
					fontSize: '28px',
					textAlign: 'center',
					color: 'var(--white)'
				}}
			>

				Interactive Hydrogen Lab

			</h1>

			<p
				style={{
					color: 'var(--muted)',
					textAlign: 'center',
					marginTop: '8px'
				}}
			>

				Click on highlighted areas to identify hazards.

			</p>

			<LabImage
				onHotspotClick={handleHotspotClick}
			/>

			{activeHazard && (

				<HazardPopup
					info={hazardData[activeHazard]}
					onClose={handleClose}
				/>

			)}

		</main>

	);

}