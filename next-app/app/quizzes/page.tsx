// app/quizzes/page.tsx
// Quizzes hub listing all available knowledge quizzes

'use client';

import './quizzes.css';
import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useQuizLock } from '@/hooks/useQuizLock';
import { hazardModules } from '@/lib/hazardModules';
import { getModuleById } from '@/lib/moduleTypes';
import { QUIZ_TITLE, QUIZ_SLUG, QUIZ_ID, questionhazards } from '@/lib/questionhazards';

export default function QuizzesPage() {
	const { user, loading } = useAuth();
	const router = useRouter();
	const { locked, requiredModuleId } = useQuizLock(QUIZ_ID, user, loading);
	const requiredModuleTitle = requiredModuleId
		? getModuleById(hazardModules, requiredModuleId)?.title
		: undefined;

	useEffect(() => {
		if (!loading && !user) router.replace('/login');
	}, [user, loading, router]);

	if (loading) return <div>Loading…</div>;
	if (!user) return null;

	const cardBody = (
		<>
			<div className="quiz-card-icon">{locked ? '🔒' : '⚠️'}</div>
			<div className="quiz-card-body">
				<div className="quiz-card-title">{QUIZ_TITLE}</div>
				<div className="quiz-card-desc">
					{locked
						? `Complete "${requiredModuleTitle ?? 'the required module'}" to unlock this quiz.`
						: `Flammability, storage, buoyancy, and detection — ${questionhazards.length} questions.`}
				</div>
			</div>
			<div className="quiz-card-link">{locked ? '🔒 Locked' : 'Start Quiz →'}</div>
		</>
	);

	return (
		<main className="main">
			<div className="page-header">
				<h1>Knowledge Quizzes</h1>
				<p>Test what you&apos;ve learned and earn a certificate for each topic.</p>
			</div>

			<div className="quizzes-grid">
				{locked ? (
					<div
						className="quiz-card quiz-card-locked"
						title={`Complete "${requiredModuleTitle ?? 'the required module'}" to unlock this quiz`}
						aria-disabled="true"
					>
						{cardBody}
					</div>
				) : (
					<Link href={`/quizzes/${QUIZ_SLUG}`} className="quiz-card">
						{cardBody}
					</Link>
				)}
			</div>
		</main>
	);
}
