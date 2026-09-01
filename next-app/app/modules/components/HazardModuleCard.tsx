'use client';

import Link from 'next/link';
import { ModuleData, ModuleStatus } from '@/lib/moduleTypes';
import './ModuleCard.css';

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
    locked?: boolean;
    lockedReason?: string;
}

export default function HazardModuleCard({
    item,
    basePath,
    animationDelay = 0,
    locked = false,
    lockedReason = 'Complete the previous module to unlock this one',
}: HazardModuleCardProps) {
    const meta = statusMeta[item.status];

    const cardBody = (
        <>
            <div
                className={`card-top-bar ${locked ? 'bar-todo' : meta.barClass}`}
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
                        {locked ? '🔒' : item.icon}
                    </div>

                    <span
                        className={`status-badge ${locked ? 'badge-todo' : meta.badgeClass}`}
                    >
                        {locked ? 'Locked' : meta.label}
                    </span>
                </div>

                <div className="card-title">
                    {item.title}
                </div>

                <div className="card-desc">
                    {item.description}
                </div>

                {!locked && (
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
                )}

                <div className="card-meta">
                    <span>
                        {item.sections.length} sections
                    </span>

                    <span>
                        {locked ? '' : `${item.progress}%`}
                    </span>
                </div>
            </div>

            <div className="card-link">
                {locked ? '🔒 Locked' : meta.linkText}
            </div>
        </>
    );

    if (locked) {
        return (
            <div
                className="module-card module-card-locked"
                style={{ animationDelay: `${animationDelay}s` }}
                data-slug={item.slug}
                title={lockedReason}
                aria-disabled="true"
            >
                {cardBody}
            </div>
        );
    }

    return (
        <Link
            href={`${basePath}/${item.id}`}
            className="module-card"
            style={{
                animationDelay: `${animationDelay}s`,
            }}
            data-slug={item.slug}
        >
            {cardBody}
        </Link>
    );
}

