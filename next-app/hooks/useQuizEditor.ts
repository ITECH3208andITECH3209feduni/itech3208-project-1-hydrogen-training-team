// hooks/useQuizEditor.ts
// Manages the editor for a single quiz's metadata + question bank, including draft state and save/reset.
// Used in a separate page to the quiz being edited.

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { QuizQuestion } from '@/lib/questionhazards';
import { QuizData } from './useQuiz';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// ─── Helpers ────────────────────────────────────────────────────────────────
// Finds the first question id not in use
export function nextQuestionId(questions: QuizQuestion[]): number {
	const used = new Set(questions.map((q) => q.id));
	let id = 1;
	while (used.has(id)) id++;
	return id;
}

export function buildBlankQuestion(questions: QuizQuestion[]): QuizQuestion {
	return {
		id: nextQuestionId(questions),
		question: 'New question',
		options: ['Option 1', 'Option 2'],
		correctIndex: 0,
		explanation: '',
	};
}

// ─── Hook ───────────────────────────────────────────────────────────────────
// quizId: the table row identifier this editor writes to (e.g. 'hazards') — fixed, not part of the draft itself.
// item: the live (Supabase-merged) quiz data, from useQuiz — seeds the draft.
// fallback: the default data for this quiz, if one exists — what "Reset to Defaults" reverts to.
//    Pass undefined for a quiz with no fallback (disables Reset)
export function useQuizEditor(quizId: string, item: QuizData | undefined, fallback: QuizData | undefined) {
	const { user } = useAuth();

	const [draft, setDraft] = useState<QuizData | undefined>(item);
	const [selectedQuestion, setSelectedQuestion] = useState<number | null>(null);
	const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

	// Tracks whether user has touched the draft (stops background refetches of live data overwriting in-progress edits)
	const hasEditedRef = useRef(false);

	useEffect(() => {
		if (!hasEditedRef.current) setDraft(item);
	}, [item]);

	// Switching quizId resets the draft and any edit-in-progress flag.
	useEffect(() => {
		hasEditedRef.current = false;
		setSelectedQuestion(null);
	}, [quizId]);

	const markEdited = () => {
		hasEditedRef.current = true;
	};

	// ── Top-level field editing ──────────────────────────────────────────────
	const updateField = useCallback(<K extends keyof QuizData>(field: K, value: QuizData[K]) => {
		markEdited();
		setDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
	}, []);

	// ── Question editing ──────────────────────────────────────────────────────
	const updateQuestion = useCallback(
		<K extends keyof QuizQuestion>(index: number, field: K, value: QuizQuestion[K]) => {
			markEdited();
			setDraft((prev) => {
				if (!prev) return prev;
				const questions = prev.questions.map((q, i) => (i === index ? { ...q, [field]: value } : q));
				return { ...prev, questions };
			});
		},
		[]
	);

	const addQuestion = useCallback(() => {
		markEdited();
		setDraft((prev) => {
			if (!prev) return prev;
			const questions = [...prev.questions, buildBlankQuestion(prev.questions)];
			setTimeout(() => setSelectedQuestion(questions.length - 1), 0);
			return { ...prev, questions };
		});
	}, []);

	const deleteQuestion = useCallback((index: number) => {
		markEdited();
		setDraft((prev) => {
			if (!prev) return prev;
			return { ...prev, questions: prev.questions.filter((_, i) => i !== index) };
		});
		setSelectedQuestion(null);
	}, []);

	const moveQuestion = useCallback((index: number, direction: 'up' | 'down') => {
		markEdited();
		setDraft((prev) => {
			if (!prev) return prev;
			const target = direction === 'up' ? index - 1 : index + 1;
			if (target < 0 || target >= prev.questions.length) return prev;
			const questions = [...prev.questions];
			[questions[index], questions[target]] = [questions[target], questions[index]];
			return { ...prev, questions };
		});
		setSelectedQuestion((sel) => {
			if (sel === null) return sel;
			const target = direction === 'up' ? index - 1 : index + 1;
			if (sel === index) return target;
			if (sel === target) return index;
			return sel;
		});
	}, []);

	// ── Options within a question ─────────────────────────────────────────────
	const updateOption = useCallback((questionIndex: number, optionIndex: number, value: string) => {
		markEdited();
		setDraft((prev) => {
			if (!prev) return prev;
			const questions = prev.questions.map((q, i) => {
				if (i !== questionIndex) return q;
				return { ...q, options: q.options.map((o, j) => (j === optionIndex ? value : o)) };
			});
			return { ...prev, questions };
		});
	}, []);

	const addOption = useCallback((questionIndex: number) => {
		markEdited();
		setDraft((prev) => {
			if (!prev) return prev;
			const questions = prev.questions.map((q, i) =>
				i === questionIndex ? { ...q, options: [...q.options, 'New option'] } : q
			);
			return { ...prev, questions };
		});
	}, []);

	// Deleting an option keeps correctIndex pointing at the same answer where possible.
	// (i.e. Moves with answer, or sets to 1st option if answer deleted.)
	const deleteOption = useCallback((questionIndex: number, optionIndex: number) => {
		markEdited();
		setDraft((prev) => {
			if (!prev) return prev;
			const questions = prev.questions.map((q, i) => {
				if (i !== questionIndex) return q;
				const options = q.options.filter((_, j) => j !== optionIndex);
				let correctIndex = q.correctIndex;
				if (optionIndex === q.correctIndex) correctIndex = 0;
				else if (optionIndex < q.correctIndex) correctIndex = q.correctIndex - 1;
				return { ...q, options, correctIndex };
			});
			return { ...prev, questions };
		});
	}, []);

	// ── Reset ─────────────────────────────────────────────────────────────────
	const resetToDefaults = useCallback(() => {
		if (!fallback) return;
		setDraft(fallback);
		setSelectedQuestion(null);
		hasEditedRef.current = true;
	}, [fallback]);

	// ── Validation ────────────────────────────────────────────────────────────
	// Minumum 2 options, 1 answer
	const invalidQuestionIndex = draft?.questions.findIndex(
		(q) => q.options.length < 2 || q.correctIndex < 0 || q.correctIndex >= q.options.length
	) ?? -1;
	const hasInvalidQuestion = invalidQuestionIndex !== -1;

	// ── Save ──────────────────────────────────────────────────────────────────
	const saveToSupabase = useCallback(async () => {
		if (!draft || !user || hasInvalidQuestion) return;
		setSaveStatus('saving');
		try {
			const token = await user.getIdToken();
			const res = await fetch('/api/quizzes/save-quiz', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					quizId,
					quiz: {
						title: draft.title,
						description: draft.description,
						passThreshold: draft.passThreshold,
					},
					questions: draft.questions,
				}),
			});
			const json = await res.json();
			if (!res.ok || !json.ok) throw new Error(json.error ?? 'API error');
			setSaveStatus('saved');
			hasEditedRef.current = false;
			setTimeout(() => setSaveStatus('idle'), 2500);
		} catch (err) {
			console.error('save-quiz error:', err);
			setSaveStatus('error');
			setTimeout(() => setSaveStatus('idle'), 3000);
		}
	}, [draft, quizId, user, hasInvalidQuestion]);

	return {
		draft,
		selectedQuestion,
		setSelectedQuestion,
		saveStatus,
		updateField,
		updateQuestion,
		addQuestion,
		deleteQuestion,
		moveQuestion,
		updateOption,
		addOption,
		deleteOption,
		saveToSupabase,
		resetToDefaults,
		canReset: !!fallback,
		hasInvalidQuestion,
		invalidQuestionIndex,
	};
}