// app/modules/components/ModuleReaderPage.tsx
// Wrapper for module pages

'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ModuleData } from '@/lib/moduleTypes';
import SectionBlock from './SectionBlock';

interface ModuleReaderPageProps {
	item: ModuleData | undefined;	// The module, or undefined if the id didn't match anything.
	basePath: string;				// Route prefix for the back link and prev/next nav, e.g. "/modules/hazard-modules"
	badgeLabel?: string;			// Label shown before the badge number, e.g. "⚠ Hazard". Omitted for sections whose items have no badgeNum.
	heroHint: string;				// Text shown under the title in the hero.
	backLabel?: string;				// Label for the breadcrumb's back link. Defaults to "Back".
}

export default function ModuleReaderPage({
	item,
	basePath,
	badgeLabel,
	heroHint,
	backLabel = 'Back',
}: ModuleReaderPageProps) {
	const { user, loading } = useAuth();
	const router = useRouter();

	useEffect(() => {
		if (!loading && !user) router.replace('/login');
	}, [user, loading, router]);

	// Only redirect once we know the id genuinely doesn't match anything
	useEffect(() => {
		if (!loading && user && !item) router.replace(basePath);
	}, [loading, user, item, router, basePath]);

	if (loading) return <div>Loading…</div>;
	if (!user)   return null;
	if (!item)   return null;

	const hasBadge = item.badgeNum !== undefined && !!badgeLabel;

	return (
		<main className="main" style={{ maxWidth: '820px' }} data-slug={item.slug}>
			{/* Breadcrumb */}
			<div className="back-crumb">
				<Link href={basePath}>← {backLabel}</Link>
				{' '}/ {hasBadge ? `${badgeLabel} ${item.badgeNum} – ` : ''}{item.title}
			</div>

			{/* Hero */}
			<div className="module-hero">
				<div className="module-icon-big" style={{ background: item.iconBg }}>
					{item.icon}
				</div>
				<div className="module-hero-text">
					{hasBadge && (
						<div className="hazard-label">{badgeLabel} {item.badgeNum}</div>
					)}
					<h1>{item.title}</h1>
					<p>{heroHint}</p>
				</div>
			</div>

			{/* Sections */}
			{item.sections.map((section) => (
				<SectionBlock key={section.num} section={section} />
			))}

			{/* Key Takeaway */}
			<div className="takeaway-box">
				<h3>🔑 Key Takeaway</h3>
				<p>{item.keyTakeaway}</p>
			</div>

			{/* Prev / Next navigation */}
			<div className="module-nav">
				{item.prevId ? (
					<Link href={`${basePath}/${item.prevId}`} className="nav-btn">
						← Previous
					</Link>
				) : (
					<span />
				)}
				{item.nextId ? (
					<Link href={`${basePath}/${item.nextId}`} className="nav-btn teal">
						Next →
					</Link>
				) : (
					<Link href={basePath} className="nav-btn teal">
						← {backLabel}
					</Link>
				)}
			</div>
		</main>
	);
}
