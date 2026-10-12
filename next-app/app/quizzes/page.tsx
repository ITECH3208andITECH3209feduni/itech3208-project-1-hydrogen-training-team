// app/quizzes/page.tsx
// Quizzes hub listing all available knowledge quizzes

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useQuiz } from '@/hooks/quizzes/useQuiz';
import { QUIZ_SLUG, QUIZ_DEFAULTS } from '@/lib/questionhazards';
import HubCard from '@/components/HubCard';

export default function QuizzesPage() {
        const { user, loading, permissions } = useAuth();
        const router = useRouter();

        const { quizData, usingDefaults } = useQuiz(QUIZ_SLUG, QUIZ_DEFAULTS);

        useEffect(() => {
                if (!loading && !user) router.replace('/login');
        }, [user, loading, router]);

        if (loading) return <div>Loading…</div>;
        if (!user) return null;

        return (
                <main className="main">
                        <div className="page-header">
                                <h1>Knowledge Quizzes</h1>
                                <p>Test what you&apos;ve learned and earn a certificate for each topic.</p>
                        </div>

                        <div className="hub-grid">
                                {/* Hydrogen Hazards Quiz */}
                                <HubCard
                                        href={`/quizzes/${QUIZ_SLUG}`}
                                        icon="⚠️"
                                        title={quizData.title}
                                        desc={`${quizData.description} — ${quizData.questions.length} questions.`}
                                        linkText="Start Quiz →"
                                        notice={usingDefaults ? 'Showing default questions' : undefined}
                                        editHref={permissions?.canManageUsers ? `/quizzes/${QUIZ_SLUG}/edit` : undefined}
                                />

                                {/* Student Leaderboard */}
                                <HubCard
                                        href="/quizzes/leaderboard"
                                        icon="🏆"
                                        title="Student Leaderboard"
                                        desc="View quiz scores shared by students who have chosen to appear on the leaderboard."
                                        linkText="View Leaderboard →"
                                />
                        </div>
                </main>
        );
}