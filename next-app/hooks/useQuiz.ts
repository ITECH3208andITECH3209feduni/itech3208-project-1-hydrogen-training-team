// hooks/useQuiz.ts
// Loads questions from Supabase for a given quiz, or falls back to the default files if Supabase is unavailable.

import { useState, useEffect } from 'react';
import { QuizQuestion } from '@/lib/questionhazards';

export type LoadStatus = 'loading' | 'ready' | 'error';

export interface SupabaseQuizQuestionRow {
	id: number;
	question: string;
	options: string[];
	correct_index: number;
	explanation: string;
}

export interface SupabaseQuizRow {
	quiz_id: string;
	title: string;
	description: string;
	pass_threshold: number;
	quiz_questions: SupabaseQuizQuestionRow[];
}

export interface QuizData {
	title: string;
	description: string;
	passThreshold: number;
	questions: QuizQuestion[];
}

// Map individual question data to interface used by app.
export function mapQuestionRow(row: SupabaseQuizQuestionRow): QuizQuestion {
	return {
		id: row.id,
		question: row.question,
		options: row.options,
		correctIndex: row.correct_index,
		explanation: row.explanation,
	};
}

// Map quiz data to interface used by app.
export function mapQuizRow(row: SupabaseQuizRow): QuizData {
	return {
		title: row.title,
		description: row.description,
		passThreshold: row.pass_threshold,
		questions: row.quiz_questions.map(mapQuestionRow),
	};
}

// ─── Hook ────────────────────────────────────────────────────────────────────────────────────────────────────
// quizId: identifies the set of questions to load.
// defaults: identifies the set of questions to use as a fallback.
export function useQuiz(quizId: string, defaults: QuizData) {
	const [quizData, setQuizData] = useState<QuizData>(defaults);
	const [loadStatus, setLoadStatus] = useState<LoadStatus>('loading');
	const [usingDefaults, setUsingDefaults] = useState(false);

	useEffect(() => {
		let cancelled = false;

		async function loadQuiz() {
			try {
				const res = await fetch(`/api/quizzes/load-quiz?quiz_id=${encodeURIComponent(quizId)}`, {
					cache: 'no-store',
				});
				const json = await res.json();
				if (cancelled) return;

				const row: SupabaseQuizRow | null = json.ok ? json.data : null;

				if (!json.ok) {
					console.error('load-quiz API error:', json.error);
				}

				// If you didn't retrieve the data, or the data is empty, use the fallback.
				if (!row || !row.quiz_questions?.length) {
					setQuizData(defaults);
					setUsingDefaults(true);
					setLoadStatus(json.ok ? 'ready' : 'error');
					return;
				}

				setQuizData(mapQuizRow(row));
				setUsingDefaults(false);
				setLoadStatus('ready');
			} catch {
				if (!cancelled) {
					console.error(`Failed to load quiz "${quizId}" from Supabase — using defaults`);
					setQuizData(defaults);
					setUsingDefaults(true);
					setLoadStatus('error');
				}
			}
		}

		loadQuiz();
		return () => {
			cancelled = true;
		};
	}, [quizId, defaults]);

	return { quizData, loadStatus, usingDefaults };
}