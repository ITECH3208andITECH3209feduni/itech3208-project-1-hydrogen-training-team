// app/modules/page.tsx
// Modules hub listing available learning modules

'use client';

import './modules-hub.css';
import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function ModulesPage() {
        const { user, loading } = useAuth();
        const router = useRouter();

        useEffect(() => {
                if (!loading && !user) router.replace('/login');
        }, [user, loading, router]);

        if (loading) return <div>Loading...</div>;
        if (!user) return null;

        return (
                <main className="main">
                        <div className="page-header">
                                <h1>Learning Modules</h1>
                                <p>
                                        Explore hydrogen safety learning resources and build your knowledge.
                                </p>
                        </div>

                        <div className="module-hub-grid">
                                {/* Hydrogen Safety Modules */}
                                <Link
                                        href="/modules/hazards"
                                        className="module-hub-card"
                                >
                                        <div className="module-hub-icon">
                                                &#x26A0;&#xFE0F;
                                        </div>

                                        <div className="module-hub-body">
                                                <div className="module-hub-title">
                                                        Hydrogen Safety Modules
                                                </div>

                                                <div className="module-hub-desc">
                                                        Learn about hydrogen hazards, safe practices,
                                                        and how to identify and respond to risks.
                                                </div>
                                        </div>

                                        <div className="module-hub-link">
                                                View Modules &rarr;
                                        </div>
                                </Link>
                        </div>
                </main>
        );
}