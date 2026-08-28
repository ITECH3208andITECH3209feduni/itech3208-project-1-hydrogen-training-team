// app/quizzes/page.tsx
// Quizzes hub listing all available knowledge quizzes

'use client';

import './quizzes.css';
import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { QUIZ_TITLE, QUIZ_SLUG, questionhazards } from '@/lib/questionhazards';

export default function QuizzesPage() {
        const { user, loading } = useAuth();
        const router = useRouter();

        useEffect(() => {
                if (!loading && !user) router.replace('/login');
        }, [user, loading, router]);

        if (loading) return <div>Loading…</div>;
        if (!user) return null;

        return (
                <main className="main">
                        <div className="page-header">
                                <h1>Knowledge Quizzes</h1>
                                <p>
                                        Test what you&apos;ve learned and earn a certificate for each topic.
                                </p>
                        </div>

                        <div className="quizzes-grid">

                                {/* Hydrogen Hazards Quiz */}
                                <Link
                                        href={`/quizzes/${QUIZ_SLUG}`}
                                        className="quiz-card"
                                >
                                        <div className="quiz-card-icon">
                                                ⚠️
                                        </div>

                                        <div className="quiz-card-body">
                                                <div className="quiz-card-title">
                                                        {QUIZ_TITLE}
                                                </div>

                                                <div className="quiz-card-desc">
                                                        Flammability, storage, buoyancy, and detection —
                                                        {questionhazards.length} questions.
                                                </div>
                                        </div>

                                        <div className="quiz-card-link">
                                                Start Quiz →
                                        </div>
                                </Link>

                                {/* Student Leaderboard */}
                                <Link
                                        href="/quizzes/leaderboard"
                                        className="quiz-card"
                                >
                                        <div
                                                className="quiz-card-icon"
                                                style={{
                                                        background:
                                                                'rgba(0, 180, 216, 0.12)',
                                                }}
                                        >
                                                🏆
                                        </div>

                                        <div className="quiz-card-body">
                                                <div className="quiz-card-title">
                                                        Student Leaderboard
                                                </div>

                                                <div className="quiz-card-desc">
                                                        View quiz scores shared by students who
                                                        have chosen to appear on the leaderboard.
                                                </div>
                                        </div>

                                        <div className="quiz-card-link">
                                                View Leaderboard →
                                        </div>
                                </Link>

                        </div>
                </main>
        );
}
