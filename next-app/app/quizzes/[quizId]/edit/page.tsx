// app/quizzes/[quizId]/edit/page.tsx
// Admin-only quiz content editor — separate from the attempt page (app/quizzes/[quizId]/page.tsx).

'use client';

import './quizEditor.css';
import Link from 'next/link';
import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useQuiz, QuizData } from '@/hooks/useQuiz';
import { useQuizEditor } from '@/hooks/useQuizEditor';
import { QUIZ_SLUG, QUIZ_DEFAULTS } from '@/lib/questionhazards';
import SaveBar from '@/components/SaveBar';

// Quizzes with a lib/ fallback, keyed by quiz_id — add an entry here whenever a new quiz gets its own defaults file.
const QUIZ_DEFAULTS_BY_ID: Record<string, QuizData> = {
	[QUIZ_SLUG]: QUIZ_DEFAULTS,
};

// Stable placeholder for a quiz with no defaults yet — a module-scope constant so useQuiz's effect (keyed on this object's identity) doesn't refire on every render.
const EMPTY_QUIZ: QuizData = { title: '', description: '', passThreshold: 70, questions: [] };

export default function QuizEditorPage() {
	const params = useParams();
	const quizId = params.quizId as string;
	const router = useRouter();

	const { loading, profile, isAdmin } = useAuth();

	const fallback = QUIZ_DEFAULTS_BY_ID[quizId];
	const { quizData, loadStatus, usingDefaults } = useQuiz(quizId, fallback ?? EMPTY_QUIZ);
	const editor = useQuizEditor(quizId, quizData, fallback);

    // Redirect to dashboard if user is not logged in or not an admin
	useEffect(() => {
		if (!loading && (!profile || !isAdmin)) {
			router.replace('/dashboard');
		}
	}, [loading, profile, isAdmin, router]);

	if (loading) return <div>Loading…</div>;
	if (!profile || !isAdmin) return null;
	if (!editor.draft) return <div>Loading…</div>;

	const { draft, selectedQuestion } = editor;
	const activeQuestion = selectedQuestion !== null ? draft.questions[selectedQuestion] : null;

	return (
		<main className="main quiz-editor-page">
			<div className="page-header">
				<h1>Edit Quiz</h1>
				<p>Editing content for &ldquo;{draft.title || quizId}&rdquo;. Changes take effect immediately once saved.</p>
				{usingDefaults && loadStatus === 'ready' && (
					<p className="quiz-defaults-notice">This quiz has no live content in Supabase yet — showing default questions.</p>
				)}
                {loadStatus === 'error' && (
					<p className="quiz-editor-load-error">⚠️ Couldn&apos;t reach the database — the content shown may be stale. Saving now would overwrite whatever&apos;s actually stored in Supabase.</p>
				)}
			</div>

			<div className="quiz-editor-panel">
				<div className="quiz-editor-fields">
					<label>
						Title
						<input type="text" value={draft.title} onChange={(e) => editor.updateField('title', e.target.value)} />
					</label>

					<label>
						Description
						<textarea value={draft.description} onChange={(e) => editor.updateField('description', e.target.value)} />
					</label>

					<label>
						Pass Threshold (%)
						<input
							type="number"
							min={0}
							max={100}
							value={draft.passThreshold}
							onChange={(e) => editor.updateField('passThreshold', Number(e.target.value))}
						/>
					</label>
				</div>

				<div className="quiz-editor-questions">
					<div className="quiz-editor-question-list">
						<div className="quiz-editor-question-list-header">
							<span>Questions</span>
							<button onClick={editor.addQuestion} title="Add question">+</button>
						</div>

						{draft.questions.map((q, i) => (
							<div
								key={q.id}
								className={`quiz-editor-question-row${i === selectedQuestion ? ' selected' : ''}${
									q.options.length < 2 || q.correctIndex >= q.options.length ? ' invalid' : ''
								}`}
								onClick={() => editor.setSelectedQuestion(i)}
							>
								<span className="quiz-editor-question-row-text">{q.question || '(untitled question)'}</span>

								<span className="quiz-editor-question-row-actions">
									<button
										onClick={(e) => { e.stopPropagation(); editor.moveQuestion(i, 'up'); }}
										disabled={i === 0}
										title="Move up"
									>
										↑
									</button>
									<button
										onClick={(e) => { e.stopPropagation(); editor.moveQuestion(i, 'down'); }}
										disabled={i === draft.questions.length - 1}
										title="Move down"
									>
										↓
									</button>
									<button onClick={(e) => { e.stopPropagation(); editor.deleteQuestion(i); }} title="Delete">✕</button>
								</span>
							</div>
						))}

						{draft.questions.length === 0 && (
							<p className="quiz-editor-empty">No questions yet — click + to add one.</p>
						)}
					</div>

					<div className="quiz-editor-question-detail">
						{activeQuestion && selectedQuestion !== null ? (
							<>
								<label>
									Question
									<textarea
										value={activeQuestion.question}
										onChange={(e) => editor.updateQuestion(selectedQuestion, 'question', e.target.value)}
									/>
								</label>

								<div className="quiz-editor-options">
									<span className="quiz-editor-options-label">Options (select the correct answer)</span>

									{activeQuestion.options.map((opt, j) => (
										<div key={j} className="quiz-editor-option-row">
											<input
												type="radio"
												name={`correct-${activeQuestion.id}`}
												checked={activeQuestion.correctIndex === j}
												onChange={() => editor.updateQuestion(selectedQuestion, 'correctIndex', j)}
											/>
											<input
												type="text"
												value={opt}
												onChange={(e) => editor.updateOption(selectedQuestion, j, e.target.value)}
											/>
											<button
												onClick={() => editor.deleteOption(selectedQuestion, j)}
												disabled={activeQuestion.options.length <= 2}
												title="Delete option"
											>
												✕
											</button>
										</div>
									))}

									<button onClick={() => editor.addOption(selectedQuestion)} className="quiz-editor-add-option">+ Add option</button>
								</div>

								<label>
									Explanation (shown after an incorrect answer)
									<textarea
										className="quiz-editor-explanation"
										value={activeQuestion.explanation}
										onChange={(e) => editor.updateQuestion(selectedQuestion, 'explanation', e.target.value)}
									/>
								</label>
							</>
						) : (
							<p className="quiz-editor-empty">Select a question on the left to edit it.</p>
						)}
					</div>
				</div>
			</div>

			<SaveBar
				saveStatus={editor.saveStatus}
				onReset={editor.resetToDefaults}
				onSave={editor.saveToSupabase}
				resetDisabled={!editor.canReset}
				resetDisabledReason={!editor.canReset ? 'No defaults exist for this quiz.' : undefined}
				saveDisabled={editor.hasInvalidQuestion}
				saveDisabledReason={
					editor.hasInvalidQuestion
						? 'Every question needs at least 2 options and a selected correct answer.'
						: undefined
				}
			/>

			<Link href="/quizzes" className="quiz-editor-back">← Back to Quizzes</Link>
		</main>
	);
}