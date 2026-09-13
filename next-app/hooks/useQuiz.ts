// hooks/useQuiz.ts
// Loads questions from Supabase for a given quiz, or falls back to the default files if Supabase is unavailable.

import { useState, useEffect } from 'react';
import { QuizQuestion } from '@/lib/questionhazards';

export type LoadStatus = 'loading' | 'ready' | 'error';

export interface SupabaseQuizQuestionRow {
	id:            number;
	question:      string;
	options:       string[];
	correct_index: number;
	explanation:   string;
	is_core:       boolean;
}

export interface SupabaseQuizRow {
	quiz_id:        string;
	title:          string;
	description:    string;
	pass_threshold: number;
	pool_size:      number | null;
	quiz_questions: SupabaseQuizQuestionRow[];
}

export interface QuizData {
	title:         string;
	description:   string;
	passThreshold: number;
	poolSize:      number | null;
	questions:     QuizQuestion[];
}

// Map individual question data to interface used by app.
export function mapQuestionRow(row: SupabaseQuizQuestionRow): QuizQuestion {
	return {
		id:           row.id,
		question:     row.question,
		options:      row.options,
		correctIndex: row.correct_index,
		explanation:  row.explanation,
		isCore:       row.is_core,
	};
}

// Map quiz data to interface used by app.
export function mapQuizRow(row: SupabaseQuizRow): QuizData {
	return {
		title:         row.title,
		description:   row.description,
		passThreshold: row.pass_threshold,
		poolSize:      row.pool_size,
		questions:     row.quiz_questions.map(mapQuestionRow),
	};
}

// ─── Pool drawing ───────────────────────────────────────────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
	const copy = [...arr];
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[copy[i], copy[j]] = [copy[j], copy[i]];
	}
	return copy;
}

// Draw a subset of questions to use in a quiz attempt
export function drawQuizPool(quizData: QuizData): QuizQuestion[] {
	const { questions, poolSize } = quizData;
	// If poolSize null or >= total questions, use all questions
	if (poolSize == null || poolSize >= questions.length) {
		return shuffle(questions);
	}

	// Core questions guaranteed to be included (rest filled with random set of other questions)
	const core = questions.filter((q) => q.isCore);
	const rest = questions.filter((q) => !q.isCore);

	// Defensive clamp — guard against poolSize smaller than total core questions (or stale/edited-elsewhere data)
	if (core.length >= poolSize) {
		return shuffle(core).slice(0, poolSize);
	}

	const fillCount = poolSize - core.length;
	const sampledRest = shuffle(rest).slice(0, fillCount);
	return shuffle([...core, ...sampledRest]);
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