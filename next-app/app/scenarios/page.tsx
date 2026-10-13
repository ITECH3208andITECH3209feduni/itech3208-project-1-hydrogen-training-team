// app/scenarios/page.tsx
// Scenarios hub listing all available interactive safety scenarios

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import HubCard from '@/components/HubCard';

export default function ScenariosPage() {
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
                                <h1>Safety Scenarios</h1>
                                <p>Practice hydrogen safety through realistic interactive scenarios.</p>
                        </div>

                        <div className="hub-grid">
                                <HubCard
                                        href="/scenarios/hazards"
                                        icon="🧪"
                                        title="Interactive Hydrogen Lab"
                                        desc="Explore a hydrogen laboratory and identify potential safety hazards in the environment."
                                        linkText="Start Scenario →"
                                />
                        </div>
                </main>
        );
}