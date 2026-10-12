// components/ModuleCard.tsx
// Card used anywhere a module needs to be listed:
// - The student module listing (mode="student", the default) 
// - The admin per-user progress page (mode="admin", with adminProgress supplied).

'use client';

import Link from 'next/link';
import { ModuleData, ModuleStatus } from '@/lib/modules/moduleTypes';
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

interface AdminProgress {
    uid?: string;
    module_id?: number | string;
    status?: string | null;
    progress?: number | null;
    time_spent?: number | string | null;
    started_at?: string | null;
    last_accessed?: string | null;
    completed_at?: string | null;
}

interface ModuleCardProps {
    item: ModuleData;
    animationDelay?: number;
    mode?: 'student' | 'admin';
    /** Required in student mode — builds the card's href as `${basePath}/${item.id}`. */
    basePath?: string;
    /** Required in admin mode — drives the status/completed/time-spent rows. */
    adminProgress?: AdminProgress;
}

function formatDate(date: string | null | undefined): string {
    if (!date) {
        return '-';
    }

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
        return '-';
    }

    return parsed.toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

function formatTimeSpent(value: number | string | null | undefined): string {
    if (value === null || value === undefined || value === '') {
        return '-';
    }

    if (typeof value === 'string') {
        return value;
    }

    return `${value} mins`;
}

export default function ModuleCard({
    item,
    basePath,
    animationDelay = 0,
    mode = 'student',
    adminProgress,
}: ModuleCardProps) {
    const isAdmin = mode === 'admin';

    // Admin mode derives its own status from the raw progress record,  rather than trusting item.status (which the admin progress page also sets separately).
    let status: ModuleStatus = item.status;

    if (isAdmin) {
        const progressValue = adminProgress?.progress !== null && adminProgress?.progress !== undefined
            ? Math.max(0, Math.min(100, Number(adminProgress.progress)))
            : 0;

        status = 'todo';

        if (adminProgress?.status === 'done' || progressValue >= 100) {
            status = 'done';
        } else if (adminProgress?.status === 'progress' || progressValue > 0) {
            status = 'progress';
        }
    }

    const meta = statusMeta[status];
    const progressValue = isAdmin
        ? (adminProgress?.progress !== null && adminProgress?.progress !== undefined
            ? Math.max(0, Math.min(100, Number(adminProgress.progress)))
            : 0)
        : item.progress;

    const cardClassName = isAdmin
        ? 'module-card module-card--static card-hover-tint'
        : 'module-card card-hover-tint';

    const content = (
        <>
            <div className={`card-top-bar ${meta.barClass}`} />

            {item.badgeNum !== undefined && (
                <div className="module-badge">{item.badgeNum}</div>
            )}

            <div className="card-body">
                <div className="card-head">
                    <div
                        className="card-icon"
                        style={{ background: item.iconBg }}
                    >
                        {item.icon}
                    </div>
                    <span className={`status-badge ${meta.badgeClass}`}>{meta.label}</span>
                </div>

                <div className="card-title">{item.title}</div>

                {isAdmin ? (
                    <div className="admin-module-info">
                        <p>
                            <strong>Status</strong>
                            <span>{meta.label.replace('✓ ', '')}</span>
                        </p>
                        <p>
                            <strong>Completed</strong>
                            <span>{status === 'done' ? formatDate(adminProgress?.completed_at) : '-'}</span>
                        </p>
                        <p>
                            <strong>Time Spent</strong>
                            <span>{formatTimeSpent(adminProgress?.time_spent)}</span>
                        </p>
                    </div>
                ) : (
                    <div className="card-desc">{item.description}</div>
                )}

                <div className="card-progress-bar">
                    <div
                        className="card-progress-fill"
                        style={{
                            width: `${progressValue}%`,
                            background: status === 'done' ? 'var(--green)' : 'var(--teal)',
                        }}
                    />
                </div>

                <div className="card-meta">
                    <span>{item.sections.length} sections</span>
                    <span>{progressValue}%</span>
                </div>
            </div>

            {!isAdmin && <div className="card-link">{meta.linkText}</div>}
        </>
    );

    if (isAdmin) {
        return (
            <div className={cardClassName} style={{ animationDelay: `${animationDelay}s` }}>
                {content}
            </div>
        );
    }

    return (
        <Link
            href={`${basePath}/${item.id}`}
            className={cardClassName}
            style={{ animationDelay: `${animationDelay}s` }}
            data-slug={item.slug}
        >
            {content}
        </Link>
    );
}