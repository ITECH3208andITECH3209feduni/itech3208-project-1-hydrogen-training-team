'use client';

import Link from 'next/link';
import { ModuleData, ModuleStatus } from '@/lib/moduleTypes';

const statusMeta: Record<
    ModuleStatus,
    {
        label: string;
        barClass: string;
        badgeClass: string;
        linkText: string;
    }
> = {
    done: {
        label: '✓ Completed',
        barClass: 'bar-done',
        badgeClass: 'badge-done',
        linkText: 'View →',
    },
    progress: {
        label: 'In Progress',
        barClass: 'bar-progress',
        badgeClass: 'badge-progress',
        linkText: 'Continue →',
    },
    todo: {
        label: 'Not Started',
        barClass: 'bar-todo',
        badgeClass: 'badge-todo',
        linkText: 'Start →',
    },
};

interface HazardModuleCardProps {
    item: ModuleData;
    basePath: string;
    animationDelay?: number;
}

export default function HazardModuleCard({
    item,
    basePath,
    animationDelay = 0,
}: HazardModuleCardProps) {
    const meta = statusMeta[item.status];

    return (
        <Link
            href={`${basePath}/${item.id}`}
            className="module-card"
            style={{
                animationDelay: `${animationDelay}s`,
            }}
            data-slug={item.slug}
        >
            <div
                className={`card-top-bar ${meta.barClass}`}
            />

            {item.badgeNum !== undefined && (
                <div className="hazard-badge">
                    {item.badgeNum}
                </div>
            )}

            <div className="card-body">
                <div className="card-head">
                    <div
                        className="card-icon"
                        style={{
                            background: item.iconBg,
                        }}
                    >
                        {item.icon}
                    </div>

                    <span
                        className={`status-badge ${meta.badgeClass}`}
                    >
                        {meta.label}
                    </span>
                </div>

                <div className="card-title">
                    {item.title}
                </div>

                <div className="card-description">
                    {item.description}
                </div>

                <div className="card-progress-bar">
                    <div
                        className="card-progress-fill"
                        style={{
                            width: `${item.progress}%`,
                            background:
                                item.status === 'done'
                                    ? '#00E5A0'
                                    : 'var(--teal)',
                        }}
                    />
                </div>

                <div className="card-meta">
                    <span>
                        {item.sections.length} sections
                    </span>

                    <span>
                        {item.progress}%
                    </span>
                </div>
            </div>

            <div className="card-link">
                {meta.linkText}
            </div>
        </Link>
    );
}