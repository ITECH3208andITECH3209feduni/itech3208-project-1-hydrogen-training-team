// app/scenarios/page.tsx
// Scenarios hub listing all available interactive safety scenarios

'use client';

import './scenarios.css';
import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function ScenariosPage() {
        const { user, loading } = useAuth();
        const router = useRouter();

        useEffect(() => {
                if (!loading && !user) router.replace('/login');
        }, [user, loading, router]);

        if (loading) return <div>LoadingÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦</div>;
        if (!user) return null;

        return (
                <main className="main">
                        <div className="page-header">
                                <h1>Safety Scenarios</h1>
                                <p>Practice hydrogen safety through realistic interactive scenarios.</p>
                        </div>

                        <div className="scenarios-grid">
                                {/* Interactive Hydrogen Lab */}
                                <Link href="/lab" className="scenario-card">
                                        <div className="scenario-card-icon">&#x1F9EA;</div>

                                        <div className="scenario-card-body">
                                                <div className="scenario-card-title">
                                                        Interactive Hydrogen Lab
                                                </div>

                                                <div className="scenario-card-desc">
                                                        Explore a hydrogen laboratory and identify potential safety hazards in the environment.
                                                </div>
                                        </div>

                                        <div className="scenario-card-link">
                                                Start Scenario &rarr;
                                        </div>
                                </Link>
                        </div>
                </main>
        );
}
