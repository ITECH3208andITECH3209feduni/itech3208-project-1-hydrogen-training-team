// app/modules/components/ModuleListingPage.tsx
// Wrapper for module listing pages

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ModuleData, ModuleStatus } from '@/lib/moduleTypes';
import HazardModuleCard from './HazardModuleCard';

type FilterValue = 'all' | ModuleStatus;

const FILTER_LABELS: Record<FilterValue, string> = {
	all: 'All',
	done: 'Completed',
	progress: 'In Progress',
	todo: 'Not Started',
};

interface ModuleListingPageProps {
	items: ModuleData[];
	basePath: string;		// Route prefix used to build card links, e.g. "/modules/hazard-modules"
	heading: string;
	subheading: string;
	emptyMessage?: string;	// Shown in the empty state when a filter matches nothing.
}

export default function ModuleListingPage({
	items,
	basePath,
	heading,
	subheading,
	emptyMessage = 'Nothing matches this filter.',
}: ModuleListingPageProps) {
	const { user, loading } = useAuth();
	const router = useRouter();
	const [filter, setFilter] = useState<FilterValue>('all');

	useEffect(() => {
		if (!loading && !user) router.replace('/login');
	}, [user, loading, router]);

	if (loading) return <div>Loading…</div>;
	if (!user)   return null;

	const visible = filter === 'all'
		? items
		: items.filter((item) => item.status === filter);

	return (
		<main className="main">
			<div className="page-header">
				<h1>{heading}</h1>
				<p>{subheading}</p>
			</div>

			{/* Filter bar */}
			<div className="filter-bar">
				{(Object.keys(FILTER_LABELS) as FilterValue[]).map((f) => (
					<button
						key={f}
						className={`filter-btn ${filter === f ? 'active' : ''}`}
						onClick={() => setFilter(f)}
					>
						{FILTER_LABELS[f]}
					</button>
				))}
			</div>
			
			{/* Module grid */}
			<div className="modules-grid">
				{visible.map((item, i) => (
					<HazardModuleCard
						key={item.id}
						item={item}
						basePath={basePath}
						animationDelay={i * 0.07}
					/>
				))}

				{/* If no modules available/match filter, show instead */}
				{visible.length === 0 && (
					<p style={{ color: 'var(--muted)', fontSize: '0.9rem', padding: '20px 0' }}>
						{emptyMessage}
					</p>
				)}
			</div>
		</main>
	);
}
