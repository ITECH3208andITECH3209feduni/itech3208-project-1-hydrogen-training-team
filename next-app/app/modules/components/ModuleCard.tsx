// app/modules/components/ModuleCard.tsx
// Card displayed in the modules listing grid for each module

import Link from 'next/link';
import { ModuleData, ModuleStatus } from '@/lib/modules';

const statusMeta: Record<ModuleStatus, { label: string; barClass: string; badgeClass: string; linkText: string }> = {
	done:     { label: '✓ Completed', barClass: 'bar-done',     badgeClass: 'badge-done',     linkText: 'View Module →'  },
	progress: { label: 'In Progress', barClass: 'bar-progress', badgeClass: 'badge-progress', linkText: 'Continue →'     },
	todo:     { label: 'Not Started', barClass: 'bar-todo',     badgeClass: 'badge-todo',     linkText: 'Start Module →' },
};

interface ModuleCardProps {
	mod: ModuleData;
	animationDelay?: number;
}

export default function ModuleCard({ mod, animationDelay = 0 }: ModuleCardProps) {
	const meta = statusMeta[mod.status];

	return (
		<Link
			href={`/modules/${mod.id}`}
			className="module-card"
			style={{ animationDelay: `${animationDelay}s` }}
		>
			<div className={`card-top-bar ${meta.barClass}`} />
			<div className="hazard-badge">{mod.hazardNum}</div>

			<div className="card-body">
				<div className="card-head">
					<div className="card-icon" style={{ background: mod.iconBg }}>
						{mod.icon}
					</div>
					<span className={`status-badge ${meta.badgeClass}`}>
						{meta.label}
					</span>
				</div>

				<div className="card-title">{mod.title}</div>
				<div className="card-desc">{mod.description}</div>

				<div className="card-progress-bar">
					<div
						className="card-progress-fill"
						style={{
							width: `${mod.progress}%`,
							background: mod.status === 'done' ? '#00E5A0' : 'var(--teal)',
						}}
					/>
				</div>
				<div className="card-meta">
					<span>{mod.sections.length} sections</span>
					<span>{mod.progress}%</span>
				</div>
			</div>

			<div className="card-link">{meta.linkText}</div>
		</Link>
	);
}
