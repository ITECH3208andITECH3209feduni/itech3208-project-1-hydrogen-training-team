// app/quizzes/hazards/page.tsx
// Google-Forms-style attempt at the Hydrogen Hazards quiz — review answers on
// submit, retry freely below the pass threshold, unlock the certificate above it

'use client';

import '../quizzes.css';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { questionhazards, QUIZ_TITLE, PASS_THRESHOLD } from '@/lib/questionhazards';

function storageKey(uid: string) {
	return `h2academy_quiz_hazards_${uid}`;
}

export default function HazardsQuizPage() {
	const { user, loading } = useAuth();
	const router = useRouter();

	const [answers, setAnswers] = useState<(number | null)[]>(
		Array(questionhazards.length).fill(null)
	);
	const [submitted, setSubmitted] = useState(false);
	const [attempt, setAttempt] = useState(1);
	const [error, setError] = useState('');

	useEffect(() => {
		if (!loading && !user) router.replace('/login');
	}, [user, loading, router]);

	const correctCount = useMemo(
		() => answers.filter((a, i) => a === questionhazards[i].correctIndex).length,
		[answers]
	);
	const percentage = Math.round((correctCount / questionhazards.length) * 100);
	const passed = percentage >= PASS_THRESHOLD;

	if (loading) return <div>Loading…</div>;
	if (!user) return null;

	function selectOption(qIndex: number, optIndex: number) {
		if (submitted) return;
		setAnswers((prev) => {
			const next = [...prev];
			next[qIndex] = optIndex;
			return next;
		});
	}

	function handleSubmit() {
		if (answers.some((a) => a === null)) {
			setError('Please answer every question before submitting.');
			return;
		}
		setError('');
		setSubmitted(true);
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	function handleRetry() {
		setAnswers(Array(questionhazards.length).fill(null));
		setSubmitted(false);
		setError('');
		setAttempt((a) => a + 1);
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	function handleContinue() {
		if (!user) return;
		localStorage.setItem(
			storageKey(user.uid),
			JSON.stringify({ passed: true, score: percentage, date: new Date().toISOString() })
		);
		router.push('/certificate');
	}

	return (
		<main className="main">
			<div className="quiz-attempt">
				<div className="quiz-attempt-header">
					<span className="quiz-badge">⚠️ Knowledge Check</span>
					<h1>{QUIZ_TITLE}</h1>
					<p>
						Answer all {questionhazards.length} questions, then submit to see your results.
						You need {PASS_THRESHOLD}% or higher to pass.
					</p>
					{attempt > 1 && <p className="quiz-attempt-count">Attempt #{attempt}</p>}
				</div>

				{submitted && (
					<div className={`quiz-result-banner ${passed ? 'quiz-result-pass' : 'quiz-result-fail'}`}>
						<div className="quiz-result-score">{percentage}%</div>
						<div>
							<p className="quiz-result-headline">
								{passed ? 'You passed!' : 'Not quite there yet'}
							</p>
							<p className="quiz-result-text">
								You got {correctCount} out of {questionhazards.length} correct.
								{!passed && ` You need at least ${PASS_THRESHOLD}% to pass.`}
							</p>
						</div>
						<div className="quiz-result-action">
							{passed ? (
								<button className="btn-quiz" onClick={handleContinue}>
									Get Your Certificate →
								</button>
							) : (
								<button className="btn-quiz" onClick={handleRetry}>
									Retry Quiz
								</button>
							)}
						</div>
					</div>
				)}

				<div className="quiz-question-list">
					{questionhazards.map((q, qIndex) => {
						const userAnswer = answers[qIndex];
						const isCorrect = userAnswer === q.correctIndex;

						return (
							<div key={q.id} className="quiz-question-card">
								<p className="quiz-question-text">
									{qIndex + 1}. {q.question}
								</p>
								<div className="quiz-options">
									{q.options.map((option, optIndex) => {
										const isSelected = userAnswer === optIndex;
										const isCorrectOption = optIndex === q.correctIndex;

										let optionClass = 'quiz-option';
										let tag: string | null = null;

										if (submitted) {
											if (isCorrectOption) {
												optionClass += ' quiz-option-correct';
												tag = isSelected ? '✓ Your answer — Correct' : '✓ Correct answer';
											} else if (isSelected) {
												optionClass += ' quiz-option-wrong';
												tag = '✗ Your answer';
											} else {
												optionClass += ' quiz-option-disabled';
											}
										} else if (isSelected) {
											optionClass += ' quiz-option-selected';
										}

										return (
											<div
												key={optIndex}
												className={optionClass}
												onClick={() => selectOption(qIndex, optIndex)}
											>
												<span className="quiz-radio">{isSelected ? '●' : '○'}</span>
												<span className="quiz-option-text">{option}</span>
												{tag && <span className="quiz-option-tag">{tag}</span>}
											</div>
										);
									})}
								</div>
								{submitted && !isCorrect && (
									<p className="quiz-explanation">💡 {q.explanation}</p>
								)}
							</div>
						);
					})}
				</div>

				{!submitted && (
					<div className="quiz-submit-row">
						{error && <p className="quiz-error">{error}</p>}
						<button className="btn-quiz" onClick={handleSubmit}>
							Submit Answers
						</button>
					</div>
				)}
			</div>
		</main>
	);
}
