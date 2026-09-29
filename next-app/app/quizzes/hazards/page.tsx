// app/quizzes/hazards/page.tsx

'use client';

import '../quizzes.css';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useQuiz, drawQuizPool } from '@/hooks/quizzes/useQuiz';
import { useQuizProgress } from '@/hooks/quizzes/useQuizProgress';
import {
    QUIZ_SLUG,
    QUIZ_DEFAULTS,
    QuizQuestion,
} from '@/lib/questionhazards';

// Array Shuffler (Fisher-Yates method)
function shuffleArray<T>(array: T[]): T[] {
    const result = [...array];

    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
}

// Shuffles each question's answer options (question order decided drawQuizPool).
function shuffleOptions(questions: QuizQuestion[]): QuizQuestion[] {
    return questions.map((q) => {
        const indexedOptions = q.options.map((option, index) => ({
            option,
            originalIndex: index,
        }));

        const shuffledOptions = shuffleArray(indexedOptions);
        const newCorrectIndex = shuffledOptions.findIndex((o) => o.originalIndex === q.correctIndex);

        return {
            ...q,
            options: shuffledOptions.map((o) => o.option),
            correctIndex: newCorrectIndex,
        };
    });
}

export default function HazardsQuizPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    const { quizData, loadStatus, usingDefaults } = useQuiz(QUIZ_SLUG, QUIZ_DEFAULTS);
    const { title, passThreshold, questions } = quizData;
    const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
    const [answers, setAnswers] = useState<(number | null)[]>([]);

    // Set up and shuffle the quiz questions pool once either the live or defaults are loaded.
    const [seeded, setSeeded] = useState(false);
    useEffect(() => {
        if (loadStatus === 'loading' || seeded) return;
        const pool = shuffleOptions(drawQuizPool(quizData));
        setQuiz(pool);
        setAnswers(Array(pool.length).fill(null));
        setSeeded(true);
    }, [loadStatus, quizData, seeded]);

    const [submitted, setSubmitted] = useState(false);
    const [attempt, setAttempt] = useState(1);
    const [error, setError] = useState('');   // Validation ("answer every question") only — save/leaderboard errors come from the hook

    const {
        saving,
        error: progressError,
        clearError: clearProgressError,
        leaderboardVisible,
        leaderboardSaving,
        leaderboardSaved,
        submitQuizResult,
        updateLeaderboardPreference,
        resetLeaderboardNotice,
    } = useQuizProgress({ user, loading });

    const displayedError = error || progressError;
    
    const correctCount = answers.filter((answer, index) => answer === quiz[index].correctIndex).length;
    const percentage = Math.round((correctCount / quiz.length) * 100);
    const passed = percentage >= passThreshold;

    if (loading) {
        return (
            <main className="main">
                <div>Loading...</div>
            </main>
        );
    }

    if (!user) {
        router.replace('/login');
        return null;
    }

    // Loading message while retrieving live data
    if (loadStatus === 'loading' || !seeded) {
        return (
            <main className="main">
                <div>Loading quiz…</div>
            </main>
        );
    }

    function selectOption(qIndex: number, optIndex: number) {
        if (submitted || saving) return;

        setAnswers((prev) => {
            const next = [...prev];
            next[qIndex] = optIndex;
            return next;
        });

        setError('');
        clearProgressError();
    }

    async function handleSubmit() {
        if (!user) return;

        if (answers.some((answer) => answer === null)) {
            setError('Please answer every question before submitting.');
            return;
        }

        setError('');
        const saved = await submitQuizResult(percentage, passed);
        if (!saved) return;

        setSubmitted(true);

        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });
    }

    function handleRetry() {
        const pool = shuffleOptions(drawQuizPool(quizData));
        setQuiz(pool);
        setAnswers(Array(pool.length).fill(null));
        setSubmitted(false);
        setError('');
        clearProgressError();
        resetLeaderboardNotice();

        setAttempt((a) => a + 1);

        window.scrollTo({ top: 0, behavior: 'smooth', });
    }

    function handleContinue() {
        router.push('/certificate');
    }

    return (
        <main className="main">
            <div className="quiz-attempt">
                <div className="quiz-attempt-header">
                    <span className="quiz-badge">⚠️ Knowledge Check</span>
                    <h1>{title}</h1>
                    <p>Answer all{' '}{quiz.length} questions, then submit to see your results. You need{' '}{passThreshold}% or higher to pass.</p>

                    {attempt > 1 && (
                        <p className="quiz-attempt-count">
                            Attempt #{attempt}
                        </p>
                    )}

                    {usingDefaults && (
                        <p className="quiz-defaults-notice">⚠️ Showing the default question set — live content is unavailable right now.</p>
                    )}
                </div>

               {displayedError && (
                    <p className="quiz-error">{displayedError}</p>
                )}

                {submitted && (
                    <div className={`quiz-result-banner ${
                        passed ? 'quiz-result-pass' : 'quiz-result-fail'
                    }`}>
                        <div className="quiz-result-score">{percentage}%</div>
                        <div className="quiz-result-summary">
                            <p className="quiz-result-headline">
                                {passed ? 'You passed!' : 'Not quite there yet'}
                            </p>

                            <p className="quiz-result-text">
                                You got{' '}{correctCount} out of {quiz.length}{' '}correct.
                                {!passed && ` You need at least ${passThreshold}% to pass.`}
                            </p>
                        </div>

                        {/* LEADERBOARD PRIVACY */}
                        <div className="quiz-leaderboard">
                            <p className="quiz-leaderboard-title">🏆 Leaderboard</p>
                            <p className="quiz-leaderboard-text">Would you like your score to appear on the student leaderboard?</p>

                            <div className="quiz-leaderboard-actions">
                                <button
                                    type="button"
                                    className={`quiz-leaderboard-btn quiz-leaderboard-show ${leaderboardVisible === true ? 'active' : ''}`}
                                    disabled={leaderboardSaving}
                                    onClick={() => updateLeaderboardPreference(true)}
                                >
                                    {leaderboardSaving && leaderboardVisible
                                        ? 'Saving...'
                                        : '🏆 Show My Score'
                                    }
                                </button>

                                <button
                                    type="button"
                                    className={`quiz-leaderboard-btn quiz-leaderboard-private ${leaderboardVisible === false ? 'active' : ''}`}
                                    disabled={leaderboardSaving}
                                    onClick={() => updateLeaderboardPreference(false)}
                                >
                                    {leaderboardSaving && !leaderboardVisible
                                        ? 'Saving...'
                                        : '🔒 Keep Private'
                                    }
                                </button>
                            </div>

                            {leaderboardSaved && (
                                <p className="quiz-leaderboard-saved">
                                    {leaderboardVisible
                                        ? '✓ Your score will appear on the leaderboard.'
                                        : '✓ Your score will remain private.'
                                    }
                                </p>
                            )}
                        </div>

                        <div className="quiz-result-action">
                            {passed ? (
                                <button
                                    className="btn-quiz"
                                    onClick={handleContinue}
                                >
                                    Get Your Certificate →
                                </button>
                            ) : (
                                <button
                                    className="btn-quiz"
                                    onClick={handleRetry}
                                >
                                    Retry Quiz
                                </button>
                            )}
                        </div>
                    </div>
                )}

                <div className="quiz-question-list">
                    {quiz.map((q, qIndex) => {
                        const userAnswer = answers[qIndex];
                        const isCorrect = userAnswer === q.correctIndex;

                        return (
                            <div
                                key={q.id}
                                className="quiz-question-card"
                            >
                                <p className="quiz-question-text">{qIndex + 1}.{' '}{q.question}</p>

                                <div className="quiz-options">
                                    {q.options.map((option, optIndex) => {
                                        const isSelected = userAnswer === optIndex;
                                        const isCorrectOption = optIndex === q.correctIndex;
                                        let optionClass = 'quiz-option';
                                        let tag: | string | null = null;

                                        if (submitted) {
                                            if (isCorrectOption) {
                                                optionClass += ' quiz-option-correct';

                                                tag = isSelected
                                                    ? '✓ Your answer — Correct'
                                                    : '✓ Correct answer';
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

                                                {tag && (
                                                    <span className="quiz-option-tag">{tag}</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {submitted && !isCorrect && (
                                    <p className="quiz-explanation">💡{' '}{q.explanation}</p>
                                )}
                            </div>
                        );
                    })}
                </div>

                {!submitted && (
                    <div className="quiz-submit-row">
                        {displayedError && (
                            <p className="quiz-error">{displayedError}</p>
                        )}

                        <button
                            className="btn-quiz"
                            onClick={handleSubmit}
                            disabled={saving}
                        >
                            {saving ? 'Saving Result...' : 'Submit Answers'}
                        </button>
                    </div>
                )}
            </div>
        </main>
    );
}