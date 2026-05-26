// app/modules/page.tsx
// Modules page listing all module pages

'use client';

import './modules.css';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { modules, ModuleStatus } from '@/lib/modules';
import ModuleCard from './components/ModuleCard';

type FilterValue = 'all' | ModuleStatus;

export default function ModulesPage() {
	const { user, loading } = useAuth();
	const router = useRouter();
	const [filter, setFilter] = useState<FilterValue>('all');

	useEffect(() => {
		if (!loading && !user) router.replace('/login');
	}, [user, loading, router]);

	if (loading) return <div>Loading…</div>;
	if (!user)   return null;

	const visible = filter === 'all'
		? modules
		: modules.filter((m) => m.status === filter);

	return (
		<main className="main">
			<div className="page-header">
				<h1>Hydrogen Safety Modules</h1>
				<p>5 modules · Each linked to a real lab hazard · Learn, identify, respond</p>
			</div>

			{/* Filter bar */}
			<div className="filter-bar">
				{(['all', 'done', 'progress', 'todo'] as FilterValue[]).map((f) => (
					<button
						key={f}
						className={`filter-btn ${filter === f ? 'active' : ''}`}
						onClick={() => setFilter(f)}
					>
						{{ all: 'All', done: 'Completed', progress: 'In Progress', todo: 'Not Started' }[f]}
					</button>
				))}
			</div>

			{/* Module grid */}
			<div className="modules-grid">
				{/* List all available modules */}
				{visible.map((mod, i) => (
					<ModuleCard
						key={mod.id}
						mod={mod}
						animationDelay={i * 0.07}
					/>
				))}
				
				{/* If no modules available/match filter, show instead */}
				{visible.length === 0 && (
					<p style={{ color: 'var(--muted)', fontSize: '0.9rem', padding: '20px 0' }}>
						No modules match this filter.
					</p>
				)}
			</div>
		</main>
	);
}
