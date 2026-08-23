// app/quizzes/hazards

'use client';

import '../quizzes.css';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

import {
    questionhazards,
    QUIZ_TITLE,
    PASS_THRESHOLD,
    QuizQuestion,
} from '@/lib/questionhazards';

function storageKey(uid: string) {
    return `hydrogenlabsafety_quiz_hazards_${uid}`;
}

// Array Shuffler (Fisher-Yates method)
function shuffleArray<T>(array: T[]): T[] {
    const result = [...array];

    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
}

// Quiz Shuffler
function shuffleQuiz(
    questions: QuizQuestion[]
): QuizQuestion[] {
    const shuffledQuestions =
        shuffleArray(questions);

    return shuffledQuestions.map((q) => {
        const indexedOptions = q.options.map(
            (option, index) => ({
                option,
                originalIndex: index,
            })
        );

        const shuffledOptions =
            shuffleArray(indexedOptions);

        const newCorrectIndex =
            shuffledOptions.findIndex(
                (o) =>
                    o.originalIndex === q.correctIndex
            );

        return {
            ...q,
            options: shuffledOptions.map(
                (o) => o.option
            ),
            correctIndex: newCorrectIndex,
        };
    });
}

export default function HazardsQuizPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    const [quiz, setQuiz] = useState<
        QuizQuestion[]
    >(() => shuffleQuiz(questionhazards));

    const [answers, setAnswers] = useState<
        (number | null)[]
    >(
        Array(questionhazards.length).fill(null)
    );

    const [submitted, setSubmitted] =
        useState(false);

    const [attempt, setAttempt] = useState(1);

    const [error, setError] = useState('');

    const [saving, setSaving] = useState(false);

    const [leaderboardVisible, setLeaderboardVisible] =
        useState(false);

    const [leaderboardSaving, setLeaderboardSaving] =
        useState(false);

    const [leaderboardSaved, setLeaderboardSaved] =
        useState(false);

    const correctCount = answers.filter(
        (answer, index) =>
            answer === quiz[index].correctIndex
    ).length;

    const percentage = Math.round(
        (correctCount / quiz.length) * 100
    );

    const passed =
        percentage >= PASS_THRESHOLD;

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

    function selectOption(
        qIndex: number,
        optIndex: number
    ) {
        if (submitted || saving) return;

        setAnswers((prev) => {
            const next = [...prev];
            next[qIndex] = optIndex;
            return next;
        });

        setError('');
    }

    async function handleSubmit() {
        if (!user) return;

        if (
            answers.some(
                (answer) => answer === null
            )
        ) {
            setError(
                'Please answer every question before submitting.'
            );
            return;
        }

        try {
            setSaving(true);
            setError('');

            const token =
                await user.getIdToken();

            const response = await fetch(
                '/api/quizzes/progress',
                {
                    method: 'POST',

                    headers: {
                        'Content-Type':
                            'application/json',
                        Authorization:
                            `Bearer ${token}`,
                    },

                    body: JSON.stringify({
                        score: percentage,
                        passed: passed,
                    }),
                }
            );

            const result =
                await response.json();

            if (
                !response.ok ||
                !result.ok
            ) {
                throw new Error(
                    result.error ||
                        'Failed to save quiz result.'
                );
            }

            setLeaderboardVisible(false);
            setLeaderboardSaved(false);

            setSubmitted(true);

            window.scrollTo({
                top: 0,
                behavior: 'smooth',
            });
        } catch (error) {
            console.error(
                'QUIZ SUBMIT: submission failed',
                error
            );

            setError(
                error instanceof Error
                    ? error.message
                    : 'Failed to save quiz result.'
            );
        } finally {
            setSaving(false);
        }
    }

    async function updateLeaderboardPreference(
        visible: boolean
    ) {
        if (!user || leaderboardSaving) {
            return;
        }

        try {
            setLeaderboardSaving(true);
            setError('');

            const token =
                await user.getIdToken();

            const response = await fetch(
                '/api/quizzes/progress',
                {
                    method: 'PATCH',

                    headers: {
                        'Content-Type':
                            'application/json',
                        Authorization:
                            `Bearer ${token}`,
                    },

                    body: JSON.stringify({
                        leaderboard_visible:
                            visible,
                    }),
                }
            );

            const result =
                await response.json();

            if (
                !response.ok ||
                !result.ok
            ) {
                throw new Error(
                    result.error ||
                        'Failed to update leaderboard preference.'
                );
            }

            setLeaderboardVisible(
                visible
            );

            setLeaderboardSaved(true);
        } catch (error) {
            console.error(
                'LEADERBOARD: preference update failed',
                error
            );

            setError(
                error instanceof Error
                    ? error.message
                    : 'Failed to update leaderboard preference.'
            );
        } finally {
            setLeaderboardSaving(false);
        }
    }

    function handleRetry() {
        setQuiz(
            shuffleQuiz(questionhazards)
        );

        setAnswers(
            Array(questionhazards.length).fill(
                null
            )
        );

        setSubmitted(false);
        setError('');

        setLeaderboardVisible(false);
        setLeaderboardSaved(false);

        setAttempt((a) => a + 1);

        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });
    }

    function handleContinue() {
        if (!user) return;

        localStorage.setItem(
            storageKey(user.uid),
            JSON.stringify({
                passed: true,
                score: percentage,
                date: new Date().toISOString(),
            })
        );

        router.push('/certificate');
    }

    return (
        <main className="main">
            <div className="quiz-attempt">

                <div className="quiz-attempt-header">

                    <span className="quiz-badge">
                        ⚠️ Knowledge Check
                    </span>

                    <h1>{QUIZ_TITLE}</h1>

                    <p>
                        Answer all{' '}
                        {quiz.length} questions,
                        then submit to see your
                        results. You need{' '}
                        {PASS_THRESHOLD}% or
                        higher to pass.
                    </p>

                    {attempt > 1 && (
                        <p className="quiz-attempt-count">
                            Attempt #{attempt}
                        </p>
                    )}

                </div>

                {error && (
                    <p className="quiz-error">
                        {error}
                    </p>
                )}

                {submitted && (
                    <div
                        className={`quiz-result-banner ${
                            passed
                                ? 'quiz-result-pass'
                                : 'quiz-result-fail'
                        }`}
                    >

                        <div className="quiz-result-score">
                            {percentage}%
                        </div>

                        <div className="quiz-result-summary">

                            <p className="quiz-result-headline">
                                {passed
                                    ? 'You passed!'
                                    : 'Not quite there yet'}
                            </p>

                            <p className="quiz-result-text">
                                You got{' '}
                                {correctCount} out
                                of {quiz.length}{' '}
                                correct.

                                {!passed &&
                                    ` You need at least ${PASS_THRESHOLD}% to pass.`}
                            </p>

                        </div>

                        {/* -------------------------------------------------
                            LEADERBOARD PRIVACY
                        ------------------------------------------------- */}

                        <div className="quiz-leaderboard">

                            <p className="quiz-leaderboard-title">
                                🏆 Leaderboard
                            </p>

                            <p className="quiz-leaderboard-text">
                                Would you like your score
                                to appear on the student
                                leaderboard?
                            </p>

                            <div className="quiz-leaderboard-actions">

                                <button
                                    type="button"
                                    className="quiz-leaderboard-btn quiz-leaderboard-show"
                                    disabled={
                                        leaderboardSaving
                                    }
                                    onClick={() =>
                                        updateLeaderboardPreference(
                                            true
                                        )
                                    }
                                >
                                    {leaderboardSaving &&
                                    leaderboardVisible
                                        ? 'Saving...'
                                        : '🏆 Show My Score'}
                                </button>

                                <button
                                    type="button"
                                    className="quiz-leaderboard-btn quiz-leaderboard-private"
                                    disabled={
                                        leaderboardSaving
                                    }
                                    onClick={() =>
                                        updateLeaderboardPreference(
                                            false
                                        )
                                    }
                                >
                                    {leaderboardSaving &&
                                    !leaderboardVisible
                                        ? 'Saving...'
                                        : '🔒 Keep Private'}
                                </button>

                            </div>

                            {leaderboardSaved && (
                                <p className="quiz-leaderboard-saved">
                                    {leaderboardVisible
                                        ? '✓ Your score will appear on the leaderboard.'
                                        : '✓ Your score will remain private.'}
                                </p>
                            )}

                        </div>

                        <div className="quiz-result-action">

                            {passed ? (
                                <button
                                    className="btn-quiz"
                                    onClick={
                                        handleContinue
                                    }
                                >
                                    Get Your Certificate →
                                </button>
                            ) : (
                                <button
                                    className="btn-quiz"
                                    onClick={
                                        handleRetry
                                    }
                                >
                                    Retry Quiz
                                </button>
                            )}

                        </div>

                    </div>
                )}

                <div className="quiz-question-list">

                    {quiz.map(
                        (q, qIndex) => {
                            const userAnswer =
                                answers[
                                    qIndex
                                ];

                            const isCorrect =
                                userAnswer ===
                                q.correctIndex;

                            return (
                                <div
                                    key={q.id}
                                    className="quiz-question-card"
                                >

                                    <p className="quiz-question-text">
                                        {qIndex + 1}.{' '}
                                        {q.question}
                                    </p>

                                    <div className="quiz-options">

                                        {q.options.map(
                                            (
                                                option,
                                                optIndex
                                            ) => {

                                                const isSelected =
                                                    userAnswer ===
                                                    optIndex;

                                                const isCorrectOption =
                                                    optIndex ===
                                                    q.correctIndex;

                                                let optionClass =
                                                    'quiz-option';

                                                let tag:
                                                    | string
                                                    | null =
                                                    null;

                                                if (
                                                    submitted
                                                ) {
                                                    if (
                                                        isCorrectOption
                                                    ) {
                                                        optionClass +=
                                                            ' quiz-option-correct';

                                                        tag =
                                                            isSelected
                                                                ? '✓ Your answer — Correct'
                                                                : '✓ Correct answer';
                                                    } else if (
                                                        isSelected
                                                    ) {
                                                        optionClass +=
                                                            ' quiz-option-wrong';

                                                        tag =
                                                            '✗ Your answer';
                                                    } else {
                                                        optionClass +=
                                                            ' quiz-option-disabled';
                                                    }
                                                } else if (
                                                    isSelected
                                                ) {
                                                    optionClass +=
                                                        ' quiz-option-selected';
                                                }

                                                return (
                                                    <div
                                                        key={
                                                            optIndex
                                                        }
                                                        className={
                                                            optionClass
                                                        }
                                                        onClick={() =>
                                                            selectOption(
                                                                qIndex,
                                                                optIndex
                                                            )
                                                        }
                                                    >

                                                        <span className="quiz-radio">
                                                            {isSelected
                                                                ? '●'
                                                                : '○'}
                                                        </span>

                                                        <span className="quiz-option-text">
                                                            {
                                                                option
                                                            }
                                                        </span>

                                                        {tag && (
                                                            <span className="quiz-option-tag">
                                                                {
                                                                    tag
                                                                }
                                                            </span>
                                                        )}

                                                    </div>
                                                );
                                            }
                                        )}

                                    </div>

                                    {submitted &&
                                        !isCorrect && (
                                            <p className="quiz-explanation">
                                                💡{' '}
                                                {
                                                    q.explanation
                                                }
                                            </p>
                                        )}

                                </div>
                            );
                        }
                    )}

                </div>

                {!submitted && (
                    <div className="quiz-submit-row">

                        {error && (
                            <p className="quiz-error">
                                {error}
                            </p>
                        )}

                        <button
                            className="btn-quiz"
                            onClick={
                                handleSubmit
                            }
                            disabled={saving}
                        >
                            {saving
                                ? 'Saving Result...'
                                : 'Submit Answers'}
                        </button>

                    </div>
                )}

            </div>
        </main>
    );
}