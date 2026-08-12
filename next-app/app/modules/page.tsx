'use client';

// @ts-ignore - CSS imports are handled by Next.js
import './modules.css';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/context/AuthContext';
import { modules, ModuleStatus } from '@/lib/modules';
import ModuleCard from './components/ModuleCard';

type FilterValue = 'all' | ModuleStatus;

type ModuleProgressRecord = {
    module_id: number | string;
    status?: string | null;
    progress?: number | null;
};

export default function ModulesPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    const [filter, setFilter] =
        useState<FilterValue>('all');

    const [modulesWithProgress, setModulesWithProgress] =
        useState(modules);

    const [progressLoading, setProgressLoading] =
        useState(true);

    useEffect(() => {
        if (!loading && !user) {
            router.replace('/login');
        }
    }, [loading, user, router]);

    useEffect(() => {
        if (loading || !user) {
            return;
        }

        const loadProgress = async () => {
            try {
                setProgressLoading(true);

                const token = await user.getIdToken();

                const response = await fetch(
                    '/api/modules/progress',
                    {
                        method: 'GET',
                        headers: {
                            Authorization:
                                `Bearer ${token}`,
                        },
                        cache: 'no-store',
                    }
                );

                const result = await response.json();

                if (!response.ok || !result.ok) {
                    throw new Error(
                        result.error ||
                            'Failed to load module progress.'
                    );
                }

                const savedProgress:
                    ModuleProgressRecord[] =
                    Array.isArray(result.progress)
                        ? result.progress
                        : [];

                const updatedModules =
                    modules.map((module) => {
                        const record =
                            savedProgress.find(
                                (item) =>
                                    String(
                                        item.module_id
                                    ) ===
                                    String(module.id)
                            );

                        // No progress record means
                        // the learner has not started it.
                        if (!record) {
                            return {
                                ...module,
                                status:
                                    'todo' as ModuleStatus,
                                progress: 0,
                            };
                        }

                        const progressValue =
                            Number(
                                record.progress ?? 0
                            );

                        const safeProgress =
                            Number.isFinite(
                                progressValue
                            )
                                ? Math.max(
                                      0,
                                      Math.min(
                                          100,
                                          progressValue
                                      )
                                  )
                                : 0;

                        let status: ModuleStatus;

                        if (safeProgress >= 100) {
                            status = 'done';
                        } else if (
                            safeProgress > 0
                        ) {
                            status = 'progress';
                        } else {
                            status = 'todo';
                        }

                        return {
                            ...module,
                            status,
                            progress: safeProgress,
                        };
                    });

                setModulesWithProgress(
                    updatedModules
                );
            } catch (error) {
                console.error(
                    'Failed to load module progress:',
                    error
                );

                // Do not use the hardcoded progress
                // values if the database request fails.
                const resetModules = modules.map(
                    (module) => ({
                        ...module,
                        status:
                            'todo' as ModuleStatus,
                        progress: 0,
                    })
                );

                setModulesWithProgress(
                    resetModules
                );
            } finally {
                setProgressLoading(false);
            }
        };

        loadProgress();
    }, [loading, user]);

    if (loading) {
        return <div>Loading...</div>;
    }

    if (!user) {
        return null;
    }

    const visible =
        filter === 'all'
            ? modulesWithProgress
            : modulesWithProgress.filter(
                  (module) =>
                      module.status === filter
              );

    return (
        <main className="main">
            <div className="page-header">
                <h1>Hydrogen Safety Modules</h1>

                <p>
                    5 modules · Each linked to a real lab
                    hazard · Learn, identify, respond
                </p>
            </div>

            {progressLoading && (
                <p
                    style={{
                        color: 'var(--muted)',
                        fontSize: '0.9rem',
                        marginBottom: '15px',
                    }}
                >
                    Loading your training progress...
                </p>
            )}

            <div className="filter-bar">
                {(
                    [
                        'all',
                        'done',
                        'progress',
                        'todo',
                    ] as FilterValue[]
                ).map((f) => (
                    <button
                        key={f}
                        className={`filter-btn ${
                            filter === f
                                ? 'active'
                                : ''
                        }`}
                        onClick={() =>
                            setFilter(f)
                        }
                    >
                        {
                            {
                                all: 'All',
                                done: 'Completed',
                                progress: 'In Progress',
                                todo: 'Not Started',
                            }[f]
                        }
                    </button>
                ))}
            </div>

            <div className="modules-grid">
                {visible.map((mod, index) => (
                    <ModuleCard
                        key={mod.id}
                        mod={mod}
                        animationDelay={
                            index * 0.07
                        }
                    />
                ))}

                {visible.length === 0 && (
                    <p
                        style={{
                            color: 'var(--muted)',
                            fontSize: '0.9rem',
                            padding: '20px 0',
                        }}
                    >
                        No modules match this filter.
                    </p>
                )}
            </div>
        </main>
    );
}
