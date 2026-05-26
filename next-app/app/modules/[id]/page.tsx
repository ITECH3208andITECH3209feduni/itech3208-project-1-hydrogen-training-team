'use client';

import '../modules.css';
import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getModuleById } from '@/lib/modules';
import SectionBlock from './components/SectionBlock';

export default function ModulePage() {
	const { user, loading } = useAuth();
	const router = useRouter();
	const params = useParams();
	const id = Array.isArray(params.id) ? params.id[0] : params.id;
	const mod = id ? getModuleById(id) : undefined;

	useEffect(() => {
		if (!loading && !user) router.replace('/login');
	}, [user, loading, router]);

	// Only redirect if id is known and still doesn't match any module
	useEffect(() => {
		if (!loading && user && id && !mod) router.replace('/modules');
	}, [loading, user, id, mod, router]);

	if (loading) return <div>Loading…</div>;
	if (!user)   return null;
	if (!mod)    return null;

	return (
		<main className="main" style={{ maxWidth: '820px' }}>
			{/* Breadcrumb */}
			<div className="back-crumb">
				<Link href="/modules">← Modules</Link>
				{' '}/ Hazard {mod.hazardNum} – {mod.title}
			</div>

			{/* Hero */}
			<div className="module-hero">
				<div className="module-icon-big" style={{ background: mod.iconBg }}>
					{mod.icon}
				</div>
				<div className="module-hero-text">
					<div className="hazard-label">⚠ Hazard {mod.hazardNum}</div>
					<h1>{mod.title}</h1>
					<p>Read through all sections to complete this module. Then test your knowledge in the Quizzes.</p>
				</div>
			</div>

			{/* Sections */}
			{mod.sections.map((section) => (
				<SectionBlock key={section.num} section={section} />
			))}

			{/* Key Takeaway */}
			<div className="takeaway-box">
				<h3>🔑 Key Takeaway</h3>
				<p>{mod.keyTakeaway}</p>
			</div>

			{/* Prev / Next navigation */}
			<div className="module-nav">
				{mod.prevId ? (
					<Link href={`/modules/${mod.prevId}`} className="nav-btn">
						← Previous
					</Link>
				) : (
					<span />
				)}
				{mod.nextId ? (
					<Link href={`/modules/${mod.nextId}`} className="nav-btn teal">
						Next Module →
					</Link>
				) : (
					<Link href="/modules" className="nav-btn teal">
						Back to Modules
					</Link>
				)}
			</div>
		</main>
	);
}
