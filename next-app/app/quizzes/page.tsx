// app/quizzes/page.tsx
// Quizzes hub listing all available knowledge quizzes

'use client';

import './quizzes.css';
import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useQuiz } from '@/hooks/useQuiz';
import { QUIZ_SLUG, QUIZ_DEFAULTS } from '@/lib/questionhazards';

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

                        <div className="quizzes-grid">
                                {/* Hydrogen Hazards Quiz */}
				<div className="quiz-card-wrap">
                                        <Link href={`/quizzes/${QUIZ_SLUG}`} className="quiz-card">
                                                <div className="quiz-card-icon">⚠️</div>

                                                <div className="quiz-card-body">
                                                        <div className="quiz-card-title">{quizData.title}</div>
                                                        <div className="quiz-card-desc">
                                                                {quizData.description} — {quizData.questions.length} questions.
                                                        </div>

                                                        {usingDefaults && <div className="quiz-card-notice">Showing default questions</div>}
                                                </div>

                                                <div className="quiz-card-link">Start Quiz →</div>
                                        </Link>

                                        {permissions?.canManageUsers && (
                                                <Link href={`/quizzes/${QUIZ_SLUG}/edit`} className="quiz-card-edit-tab">
                                                        ✏️ Edit
                                                </Link>
                                        )}
                                </div>

                                {/* Student Leaderboard */}
                                <Link
                                        href="/quizzes/leaderboard"
                                        className="quiz-card"
                                >
                                        <div
                                                className="quiz-card-icon"
                                                style={{ background: 'rgba(0, 180, 216, 0.12)', }}
                                        >
                                                🏆
                                        </div>

                                        <div className="quiz-card-body">
                                                <div className="quiz-card-title">Student Leaderboard</div>
                                                <div className="quiz-card-desc">View quiz scores shared by students who have chosen to appear on the leaderboard.</div>
                                        </div>

                                        <div className="quiz-card-link">View Leaderboard →</div>
                                </Link>
                        </div>
                </main>
        );
}
