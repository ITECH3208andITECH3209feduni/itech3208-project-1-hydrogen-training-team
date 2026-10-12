// app/modules/page.tsx
// Modules hub listing available learning modules

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import HubCard from '@/components/HubCard';

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

                        <div className="hub-grid">
                                <HubCard
                                        href="/modules/hazards"
                                        icon="⚠️"
                                        title="Hydrogen Safety Modules"
                                        desc="Learn about hydrogen hazards, safe practices, and how to identify and respond to risks."
                                        linkText="View Modules →"
                                />
                        </div>
                </main>
        );
}