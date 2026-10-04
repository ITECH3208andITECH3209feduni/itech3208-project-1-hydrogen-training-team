// hooks/useQuizEditor.test.ts
// Unit + integration tests for functions in useQuizEditor.ts & related API calls
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { buildBlankQuestion, nextQuestionId, useQuizEditor, snapshotQuiz } from './useQuizEditor';
import { QuizData } from './useQuiz';
import { server } from '../../mocks/server';
import { http, HttpResponse } from 'msw';

// Shape of quiz questions (defined here rather than importing from fallback)
interface TestQuizQuestion {
	id: number;
	question: string;
	options: string[];
	correctIndex: number;
	explanation: string;
	isCore: boolean;
}

// Create mock user (defaults as logged-in, since editing requires an authenticated admin)
const { mockUseAuth } = vi.hoisted(() => ({ mockUseAuth: vi.fn() }));

vi.mock('@/context/AuthContext', () => ({
	useAuth: mockUseAuth,
}));

const fakeUser = { getIdToken: vi.fn().mockResolvedValue('fake-token') };

beforeEach(() => {
	mockUseAuth.mockReturnValue({ user: fakeUser, loading: false });
});

// Minimal-but-complete question builder, for unit tests that only care about `id`.
const q = (id: number): TestQuizQuestion => ({
	id,
	question: `Question ${id}?`,
	options: ['A', 'B'],
	correctIndex: 0,
	explanation: '',
	isCore: false,
});

// A mock "live" quiz, standing in for what useQuiz would have resolved.
const liveItem: QuizData = {
	title: 'Live Quiz Title',
	description: 'Live quiz description.',
	passThreshold: 70,
	poolSize: null,
	questions: [
		{ id: 1, question: 'Question 1?', options: ['A', 'B', 'C'], correctIndex: 1, explanation: 'Explanation 1.', isCore: false },
		{ id: 2, question: 'Question 2?', options: ['X', 'Y'], correctIndex: 0, explanation: 'Explanation 2.', isCore: false },
	],
};

// A mock default, used in place of the lib/questionhazards.ts file.
// Deliberately different from liveItem so tests can tell which one a draft came from.
const defaultItem: QuizData = {
	title: 'Default Quiz Title',
	description: 'Default quiz description.',
	passThreshold: 50,
	poolSize: null,
	questions: [{ id: 1, question: 'Default question?', options: ['Yes', 'No'], correctIndex: 0, explanation: 'Default explanation.', isCore: false }],
};

// ─── Unit Tests (test purely internal functions) ────────────────────────────────────────────────────

// 1. Test nextQuestionId
describe('1. nextQuestionId', () => {
	it('1.1 returns 1 for an empty question list', () => {
		expect(nextQuestionId([])).toBe(1);
	});

	it('1.2 returns one past the highest id when there are no gaps', () => {
		expect(nextQuestionId([q(1), q(2)])).toBe(3);
	});

	it('1.3 reuses the first gap in used ids rather than continuing past the end', () => {
		// ids 1 and 3 used, 2 is free.
		expect(nextQuestionId([q(1), q(3)])).toBe(2);
	});
});

// 2. Test buildBlankQuestion
describe('2. buildBlankQuestion', () => {
	it('2.1 numbers the new question via nextQuestionId', () => {
		expect(buildBlankQuestion([q(1)]).id).toBe(2);
	});

	it('2.2 seeds a valid placeholder question', () => {
		const question = buildBlankQuestion([]);
		expect(question.question).toBeTruthy();                      // Check that question text not empty
		expect(question.options.length).toBeGreaterThanOrEqual(2);   // Check that question starts with at least 2 options
		expect(question.correctIndex).toBe(0);                       // Check that correctIndex points at a real option
		expect(question.isCore).toBe(false);                         // Check that question defaults to not being a core question
	});
});

// 3. Test draft state
describe('3. useQuizEditor draft state', () => {
	it('3.1 seeds the draft from the live item', () => {
		const { result } = renderHook(() => useQuizEditor('hazards', liveItem, defaultItem));
		expect(result.current.draft?.title).toBe('Live Quiz Title');
	});

	it('3.2 editing the draft marks it as touched, so a later background refresh does not overwrite it', () => {
		const { result, rerender } = renderHook(
			({ item }) => useQuizEditor('hazards', item, defaultItem),
			{ initialProps: { item: liveItem } }
		);

		act(() => result.current.updateField('title', 'Edited Title'));   // Edit title

		// Simulate a background refetch resolving with different content
		const refreshedItem = { ...liveItem, title: 'Refreshed From Server' };
		rerender({ item: refreshedItem });

		expect(result.current.draft?.title).toBe('Edited Title');   // Check that the edit was not clobbered
		expect(result.current.hasUnsavedChanges).toBe(true);        // Check it still counts as unsaved against the refreshed data
	});

	it('3.3 resetToDefaults reverts the draft to the bundled fallback, not the live item', () => {
		const { result } = renderHook(() => useQuizEditor('hazards', liveItem, defaultItem));

		act(() => result.current.updateField('title', 'Edited Title'));   // Edit title
		act(() => result.current.resetToDefaults());                      // Reset to defaults

		expect(result.current.draft?.title).toBe('Default Quiz Title');   // Check that draft now has the default value
		expect(result.current.draft?.questions).toHaveLength(1);          // Check that questions reset to default (no longer the live item)
		expect(result.current.hasUnsavedChanges).toBe(true);              // Check the reset counts as unsaved (defaults differ from the live item)
	});

	it('3.4 canReset is false when no fallback is provided', () => {
		const { result } = renderHook(() => useQuizEditor('hazards', liveItem, undefined));
		expect(result.current.canReset).toBe(false);
	});

	it('3.5 switching quizId clears the touched flag, so the next item resyncs the draft', () => {
		const { result, rerender } = renderHook(
			({ quizId, item }: { quizId: string; item: QuizData }) => useQuizEditor(quizId, item, defaultItem),
			{ initialProps: { quizId: 'hazards', item: liveItem } }
		);

		act(() => result.current.setSelectedQuestion(0));
		act(() => result.current.updateField('title', 'Edited Title'));   // Edit title (marks touched)
		expect(result.current.draft?.title).toBe('Edited Title');

		// Switch to a different quiz — selectedQuestion resets, and the touched flag clears too
		const newQuizItem = { ...liveItem, title: 'New Quiz Item' };
		rerender({ quizId: 'other-quiz', item: newQuizItem });

		expect(result.current.selectedQuestion).toBeNull();          // Check selection cleared
		expect(result.current.draft?.title).toBe('New Quiz Item');   // Check draft resynced despite the earlier edit
		expect(result.current.hasUnsavedChanges).toBe(false);        // Check the switch cleared the unsaved flag
	});

	it('3.6 a refresh while nothing has been edited still resyncs the draft', () => {
		const { result, rerender } = renderHook(
			({ item }) => useQuizEditor('hazards', item, defaultItem),
			{ initialProps: { item: liveItem } }
		);

		const refreshedItem = { ...liveItem, title: 'Refreshed Title' };
		rerender({ item: refreshedItem });

		expect(result.current.draft?.title).toBe('Refreshed Title');
		expect(result.current.hasUnsavedChanges).toBe(false);
	});
});

// 4. Test question CRUD
describe('4. question add/delete/move', () => {
	it('4.1 addQuestion appends a new question and selects it', async () => {
		const { result } = renderHook(() => useQuizEditor('hazards', liveItem, defaultItem));

		act(() => result.current.addQuestion());                                 // Add new question
		expect(result.current.draft?.questions).toHaveLength(3);                 // Check that questions length accounts for new question
		expect(result.current.draft?.questions[2].id).toBe(3);                   // Check that new question got the next free id

		await waitFor(() => expect(result.current.selectedQuestion).toBe(2));    // Check that new question is selected
	});

	it('4.2 deleteQuestion removes a question and clears the selection', () => {
		const { result } = renderHook(() => useQuizEditor('hazards', liveItem, defaultItem));

		act(() => result.current.deleteQuestion(0));                             // Delete 1st question

		expect(result.current.draft?.questions).toHaveLength(1);                 // Check that questions length accounts for deleted question
		expect(result.current.draft?.questions[0].question).toBe('Question 2?'); // Check that remaining question is the correct one
		expect(result.current.selectedQuestion).toBeNull();                      // Check that no question is selected after deletion
	});

	it('4.3 moveQuestion swaps two questions', () => {
		const { result } = renderHook(() => useQuizEditor('hazards', liveItem, defaultItem));

		act(() => result.current.moveQuestion(1, 'up'));   // Move 2nd question up

		expect(result.current.draft?.questions.map((q) => q.question)).toEqual(['Question 2?', 'Question 1?']);   // Check that questions swapped
	});

	it('4.4 moveQuestion is a no-op past the array bounds', () => {
		const { result } = renderHook(() => useQuizEditor('hazards', liveItem, defaultItem));

		act(() => result.current.moveQuestion(0, 'up'));     // Attempt to move first question up (no-op)
		act(() => result.current.moveQuestion(1, 'down'));   // Attempt to move last question down (no-op)

		expect(result.current.draft?.questions.map((q) => q.question)).toEqual(['Question 1?', 'Question 2?']);   // Check that question order unchanged
	});
});

// 5. Test option editing within a question
describe('5. question options', () => {
	it('5.1 addOption appends a placeholder option', () => {
		const { result } = renderHook(() => useQuizEditor('hazards', liveItem, defaultItem));

		act(() => result.current.addOption(1));   // Add new option to 2nd question (starts with 2 options)

		expect(result.current.draft?.questions[1].options).toEqual(['X', 'Y', 'New option']);
	});

	it('5.2 updateOption edits the option at the given index only', () => {
		const { result } = renderHook(() => useQuizEditor('hazards', liveItem, defaultItem));

		act(() => result.current.updateOption(1, 0, 'Edited X'));                        // Edit 1st option of 2nd question

		expect(result.current.draft?.questions[1].options).toEqual(['Edited X', 'Y']);   // Check that only targeted option changed
	});

	it('5.3 deleteOption shifts correctIndex down when a preceding option is removed', () => {
		const { result } = renderHook(() => useQuizEditor('hazards', liveItem, defaultItem));

		// 1st question: options [A, B, C], correctIndex 1 (B). Delete A (index 0, before the correct one).
		act(() => result.current.deleteOption(0, 0));

		expect(result.current.draft?.questions[0].options).toEqual(['B', 'C']);
		expect(result.current.draft?.questions[0].correctIndex).toBe(0);   // B is now at index 0
	});

	it('5.4 deleteOption resets correctIndex to 0 when the correct option itself is removed', () => {
		const { result } = renderHook(() => useQuizEditor('hazards', liveItem, defaultItem));

		// 1st question: options [A, B, C], correctIndex 1 (B). Delete B itself.
		act(() => result.current.deleteOption(0, 1));

		expect(result.current.draft?.questions[0].options).toEqual(['A', 'C']);
		expect(result.current.draft?.questions[0].correctIndex).toBe(0);   // Falls back to 0 rather than pointing at the wrong answer
	});
});

// 6. Test hasInvalidQuestion
describe('6. hasInvalidQuestion', () => {
	it('6.1 hasInvalidQuestion is false for an untouched, valid draft', () => {
		const { result } = renderHook(() => useQuizEditor('hazards', liveItem, defaultItem));

		expect(result.current.hasInvalidQuestion).toBe(false);
		expect(result.current.invalidQuestionIndex).toBe(-1);
	});

	it('6.2 hasInvalidQuestion is true when a question has fewer than 2 options', () => {
		const { result } = renderHook(() => useQuizEditor('hazards', liveItem, defaultItem));

		// 2nd question starts with exactly 2 options [X, Y] — delete one, and correctIndex (0, X) is unaffected.
		act(() => result.current.deleteOption(1, 1));

		expect(result.current.hasInvalidQuestion).toBe(true);
		expect(result.current.invalidQuestionIndex).toBe(1);
	});

	it('6.3 hasInvalidQuestion is true when correctIndex points past the end of options', () => {
		const { result } = renderHook(() => useQuizEditor('hazards', liveItem, defaultItem));

		act(() => result.current.updateQuestion(0, 'correctIndex', 5));   // Point at a non-existent option

		expect(result.current.hasInvalidQuestion).toBe(true);
		expect(result.current.invalidQuestionIndex).toBe(0);
	});
});

// 7. Test hasInvalidPoolSize
describe('7. hasInvalidPoolSize', () => {
	it('7.1 coreCount reflects the number of questions marked core', () => {
		const item: QuizData = {
			...liveItem,
			questions: [
				{ ...liveItem.questions[0], isCore: true },
				{ ...liveItem.questions[1], isCore: false },
			],
		};
		const { result } = renderHook(() => useQuizEditor('hazards', item, defaultItem));
		expect(result.current.coreCount).toBe(1);
	});

	it('7.2 hasInvalidPoolSize is false when poolSize is null', () => {
		const { result } = renderHook(() => useQuizEditor('hazards', liveItem, defaultItem));
		expect(result.current.hasInvalidPoolSize).toBe(false);
		expect(result.current.poolSizeError).toBeNull();
	});

	it('7.3 hasInvalidPoolSize is true when poolSize is below 1', () => {
		const item: QuizData = { ...liveItem, poolSize: 0 };
		const { result } = renderHook(() => useQuizEditor('hazards', item, defaultItem));

		expect(result.current.hasInvalidPoolSize).toBe(true);
		expect(result.current.poolSizeError).toMatch(/at least 1/);
	});

	it('7.4 hasInvalidPoolSize is true when poolSize is below the number of core questions', () => {
		const item: QuizData = {
			...liveItem,
			poolSize: 1,
			questions: liveItem.questions.map((q) => ({ ...q, isCore: true })), // both core — poolSize of 1 can't fit them
		};
		const { result } = renderHook(() => useQuizEditor('hazards', item, defaultItem));

		expect(result.current.hasInvalidPoolSize).toBe(true);
		expect(result.current.poolSizeError).toMatch(/core question/);
	});

	it('7.5 hasInvalidPoolSize is true when poolSize exceeds the total question count', () => {
		const item: QuizData = { ...liveItem, poolSize: 5 }; // liveItem only has 2 questions
		const { result } = renderHook(() => useQuizEditor('hazards', item, defaultItem));

		expect(result.current.hasInvalidPoolSize).toBe(true);
		expect(result.current.poolSizeError).toMatch(/greater than/);
	});

	it('7.6 hasInvalidPoolSize is false for a valid pool size', () => {
		const item: QuizData = { ...liveItem, poolSize: 2 };
		const { result } = renderHook(() => useQuizEditor('hazards', item, defaultItem));
		expect(result.current.hasInvalidPoolSize).toBe(false);
	});
});

// 8. Test hasInvalidPassThreshold
describe('8. hasInvalidPassThreshold', () => {
	const withThreshold = (passThreshold: number): QuizData => ({ ...liveItem, passThreshold });

	it('8.1 is false for the default valid threshold', () => {
		const { result } = renderHook(() => useQuizEditor('hazards', liveItem, defaultItem));
		expect(result.current.hasInvalidPassThreshold).toBe(false);
		expect(result.current.passThresholdError).toBeNull();
	});

	it.each([0, 1, 70, 100])('8.2 is false for the valid value %i (boundaries included)', (value) => {
		const { result } = renderHook(() => useQuizEditor('hazards', withThreshold(value), defaultItem));
		expect(result.current.hasInvalidPassThreshold).toBe(false);
		expect(result.current.passThresholdError).toBeNull();
	});

	it.each([-1, 101, 500])('8.3 is true for the out-of-range value %i', (value) => {
		const { result } = renderHook(() => useQuizEditor('hazards', withThreshold(value), defaultItem));
		expect(result.current.hasInvalidPassThreshold).toBe(true);
		expect(result.current.passThresholdError).toMatch(/between 0 and 100/);
	});

	it('8.4 is true for a non-integer value', () => {
		const { result } = renderHook(() => useQuizEditor('hazards', withThreshold(70.5), defaultItem));
		expect(result.current.hasInvalidPassThreshold).toBe(true);
	});

	it('8.5 is true for NaN', () => {
		const { result } = renderHook(() => useQuizEditor('hazards', withThreshold(NaN), defaultItem));
		expect(result.current.hasInvalidPassThreshold).toBe(true);
	});

	it('8.6 updates as the field is edited, and clears once corrected', () => {
		const { result } = renderHook(() => useQuizEditor('hazards', liveItem, defaultItem));

		act(() => result.current.updateField('passThreshold', 150));
		expect(result.current.hasInvalidPassThreshold).toBe(true);

		act(() => result.current.updateField('passThreshold', 100));
		expect(result.current.hasInvalidPassThreshold).toBe(false);
	});
});

// 9. Test snapshotQuiz (the helper behind hasUnsavedChanges)
describe('9. snapshotQuiz', () => {
	// Bundled defaults may omit poolSize; Supabase rows return null
	it('9.1 treats a missing poolSize the same as null', () => {
		const missingPoolSize = { ...liveItem, poolSize: undefined } as unknown as QuizData;
		expect(snapshotQuiz(missingPoolSize)).toBe(snapshotQuiz(liveItem));
	});

	it('9.2 differs when any persisted field differs', () => {
		const base = snapshotQuiz(liveItem);
		expect(snapshotQuiz({ ...liveItem, title: 'Other' })).not.toBe(base);
		expect(snapshotQuiz({ ...liveItem, passThreshold: 99 })).not.toBe(base);
		expect(snapshotQuiz({ ...liveItem, poolSize: 1 })).not.toBe(base);

		const tweak = (patch: Partial<TestQuizQuestion>): QuizData => ({
			...liveItem,
			questions: [{ ...liveItem.questions[0], ...patch }, liveItem.questions[1]],
		});
		expect(snapshotQuiz(tweak({ question: 'Changed?' }))).not.toBe(base);
		expect(snapshotQuiz(tweak({ options: ['C', 'B', 'A'] }))).not.toBe(base);
		expect(snapshotQuiz(tweak({ correctIndex: 0 }))).not.toBe(base);
		expect(snapshotQuiz(tweak({ explanation: 'Changed.' }))).not.toBe(base);
		expect(snapshotQuiz(tweak({ isCore: true }))).not.toBe(base);
	});
});

// 10. Test hasUnsavedChanges
// Note: some of these wait on the save API, but they're testing hasUnsavedChanges, not the API call itself.
describe('10. hasUnsavedChanges', () => {
	const renderEditor = () =>
		renderHook(
			({ quizId, item }: { quizId: string; item: QuizData }) => useQuizEditor(quizId, item, defaultItem),
			{ initialProps: { quizId: 'hazards', item: liveItem } }
		);

	it('10.1 is false before anything is edited, becomes true after an edit, and false again if the edit is reverted', () => {
		const { result } = renderEditor();
		expect(result.current.hasUnsavedChanges).toBe(false);
		act(() => result.current.updateField('title', 'Edited Title'));
		expect(result.current.hasUnsavedChanges).toBe(true);
		act(() => result.current.updateField('title', 'Live Quiz Title'));
		expect(result.current.hasUnsavedChanges).toBe(false);
	});

	it('10.2 is true after a question edit or add, and false again once they are undone', () => {
		const { result } = renderEditor();

		act(() => result.current.updateQuestion(0, 'question', 'Changed?'));
		expect(result.current.hasUnsavedChanges).toBe(true);
		act(() => result.current.updateQuestion(0, 'question', 'Question 1?'));
		expect(result.current.hasUnsavedChanges).toBe(false);

		act(() => result.current.addQuestion());
		expect(result.current.hasUnsavedChanges).toBe(true);
		act(() => result.current.deleteQuestion(result.current.draft!.questions.length - 1));
		expect(result.current.hasUnsavedChanges).toBe(false);
	});

	it('10.3 Reset to Defaults is not unsaved when the live quiz already matches the defaults', () => {
		const { result } = renderHook(() => useQuizEditor('hazards', defaultItem, defaultItem));
		act(() => result.current.updateField('title', 'Edited Title'));
		expect(result.current.hasUnsavedChanges).toBe(true);
		act(() => result.current.resetToDefaults());
		expect(result.current.hasUnsavedChanges).toBe(false);
	});

	it('10.4 becomes false after a successful save, and a later refresh can overwrite the draft again', async () => {
		const { result, rerender } = renderEditor();
		act(() => result.current.updateField('title', 'Edited Title'));

		await act(async () => { await result.current.saveToSupabase(); });
		expect(result.current.saveStatus).toBe('saved');
		expect(result.current.hasUnsavedChanges).toBe(false);

		rerender({ quizId: 'hazards', item: { ...liveItem, title: 'Refreshed After Save' } });
		expect(result.current.draft?.title).toBe('Refreshed After Save');
	});

	it('10.5 stays true after a failed save', async () => {
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		server.use(
			http.post('/api/quizzes/save-quiz', () =>
				HttpResponse.json({ ok: false, error: 'Access denied' }, { status: 403 })
			)
		);

		const { result } = renderEditor();
		act(() => result.current.updateField('title', 'Edited Title'));
		await act(async () => { await result.current.saveToSupabase(); });

		expect(result.current.saveStatus).toBe('error');
		expect(result.current.hasUnsavedChanges).toBe(true);
		consoleSpy.mockRestore();
	});

	it('10.6 keeps edits made while a save is in flight marked as unsaved, and protected from a refresh', async () => {
		let release!: () => void;
		const gate = new Promise<void>((resolve) => { release = resolve; });
		server.use(
			http.post('/api/quizzes/save-quiz', async () => {
				await gate;
				return HttpResponse.json({ ok: true });
			})
		);

		const { result, rerender } = renderEditor();
		act(() => result.current.updateField('title', 'First edit'));

		let savePromise!: Promise<void>;
		act(() => { savePromise = result.current.saveToSupabase(); });
		act(() => result.current.updateField('title', 'Second edit'));   // edited while the request is in flight

		await act(async () => { release(); await savePromise; });
		expect(result.current.hasUnsavedChanges).toBe(true);

		// The draft must still be protected from a background refresh
		rerender({ quizId: 'hazards', item: { ...liveItem, title: 'Refreshed From Server' } });
		expect(result.current.draft?.title).toBe('Second edit');
	});

	// Reverting an edit leaves nothing to protect, so a later refresh is followed (the old "touched" flag used to block it)
	it('10.7 a refresh after an edit has been reverted follows the refreshed item', () => {
		const { result, rerender } = renderEditor();
		act(() => result.current.updateField('title', 'Edited Title'));
		act(() => result.current.updateField('title', 'Live Quiz Title'));   // Revert

		rerender({ quizId: 'hazards', item: { ...liveItem, title: 'Refreshed Title' } });

		expect(result.current.draft?.title).toBe('Refreshed Title');
		expect(result.current.hasUnsavedChanges).toBe(false);
	});
});

// ─── Integration Tests (test API calls with mock server) ────────────────────────────────────────────────────

// 11. Test save-quiz API call
describe('11. save-quiz', () => {
	it('11.1 sets saveStatus to saved on a successful save', async () => {
		const { result } = renderHook(() => useQuizEditor('hazards', liveItem, defaultItem));

		// Mock a successful save to Supabase
		await act(async () => {
			await result.current.saveToSupabase();
		});

		expect(result.current.saveStatus).toBe('saved');   // Check that saveStatus correctly set
	});

	it('11.2 sets saveStatus to error when the server reports a failure', async () => {
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		// Mock an error response to saving the quiz
		server.use(
			http.post('/api/quizzes/save-quiz', () =>
				HttpResponse.json({ ok: false, error: 'Access denied' }, { status: 403 })
			)
		);

		const { result } = renderHook(() => useQuizEditor('hazards', liveItem, defaultItem));

		await act(async () => {
			await result.current.saveToSupabase();
		});

		expect(result.current.saveStatus).toBe('error');
		expect(consoleSpy).toHaveBeenCalled();
		consoleSpy.mockRestore();
	});

	it('11.3 sets saveStatus to error on a network failure', async () => {
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		server.use(http.post('/api/quizzes/save-quiz', () => HttpResponse.error()));

		const { result } = renderHook(() => useQuizEditor('hazards', liveItem, defaultItem));

		await act(async () => {
			await result.current.saveToSupabase();
		});

		expect(result.current.saveStatus).toBe('error');
		consoleSpy.mockRestore();
	});

	it('11.4 does nothing when there is no signed-in user', async () => {
		mockUseAuth.mockReturnValue({ user: null, loading: false });   // Simulate user being signed out

		const { result } = renderHook(() => useQuizEditor('hazards', liveItem, defaultItem));

		await act(async () => {
			await result.current.saveToSupabase();
		});

		// Status stays idle — the guard clause returns before any fetch/status change.
		expect(result.current.saveStatus).toBe('idle');
	});

	it('11.5 does nothing when the draft has an invalid question', async () => {
		const { result } = renderHook(() => useQuizEditor('hazards', liveItem, defaultItem));

		act(() => result.current.updateQuestion(0, 'correctIndex', 5));   // Make the draft invalid

		await act(async () => {
			await result.current.saveToSupabase();
		});

		// Status stays idle — the guard clause returns before any fetch/status change.
		expect(result.current.saveStatus).toBe('idle');
	});

	it('11.6 does nothing when the draft has an invalid pool size', async () => {
		const item: QuizData = { ...liveItem, poolSize: 5 }; // exceeds liveItem's 2 questions
		const { result } = renderHook(() => useQuizEditor('hazards', item, defaultItem));

		await act(async () => {
			await result.current.saveToSupabase();
		});

		expect(result.current.saveStatus).toBe('idle');
	});

	it('11.7 sends the full quiz + questions payload', async () => {
		let capturedBody: any = null;
		// Mock a successful save to Supabase that captures the sent data
		server.use(
			http.post('/api/quizzes/save-quiz', async ({ request }) => {
				capturedBody = await request.json();
				return HttpResponse.json({ ok: true });
			})
		);

		const { result } = renderHook(() => useQuizEditor('hazards', liveItem, defaultItem));

		act(() => result.current.updateField('title', 'Saved Title'));   // Edit the title before saving

		await act(async () => {
			await result.current.saveToSupabase();
		});

		expect(result.current.saveStatus).toBe('saved');   // Check that saveStatus correctly set
		// Check that sent data matches what was edited
		expect(capturedBody.quizId).toBe('hazards');
		expect(capturedBody.quiz.title).toBe('Saved Title');
		expect(capturedBody.quiz.passThreshold).toBe(70);
		expect(capturedBody.quiz.poolSize).toBeNull();
		expect(capturedBody.questions).toHaveLength(2);
		expect(capturedBody.questions[0].isCore).toBe(false);
	});
});