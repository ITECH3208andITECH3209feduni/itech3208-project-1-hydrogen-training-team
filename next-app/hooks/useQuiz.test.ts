// hooks/useQuiz.test.ts
// Unit & Integration tests for functions in useQuiz.ts & related API calls
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { mapQuestionRow, mapQuizRow, useQuiz, drawQuizPool, QuizData } from './useQuiz';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';

// A mock default used in place of the /lib/questionhazards.ts file.
const testQuizData: QuizData = {
    title: 'Test Quiz Title',
    description: 'A fixture quiz used only in these tests.',
    passThreshold: 50,
    poolSize: null,
    questions: [
        {
            id: 1,
            question: 'Fixture question one?',
            options: ['Fixture A', 'Fixture B'],
            correctIndex: 0,
            explanation: 'Fixture explanation one.',
            isCore: false,
        },
    ],
};

// ─── Unit Tests (test purely internal functions) ────────────────────────────────────────────────────

// 1. Test mapQuestionRow
describe('1. mapQuestionRow', () => {
    // Test if fully populated row mapped correctly
    it('1.1 maps a fully populated row', () => {
        const result = mapQuestionRow({
            id: 3,
            question: 'What is H2?',
            options: ['Hydrogen', 'Helium'],
            correct_index: 0,
            explanation: 'H2 is hydrogen gas.',
            is_core: true,
        });

        expect(result).toEqual({
            id: 3,
            question: 'What is H2?',
            options: ['Hydrogen', 'Helium'],
            correctIndex: 0,
            explanation: 'H2 is hydrogen gas.',
            isCore: true,
        });
    });
});

// 2. Test mapQuizRow
describe('2. mapQuizRow', () => {
    // Example data to use in tests (different from mock default)
    const row = {
        quiz_id: 'hazards',
        title: 'Row Quiz Title',
        description: 'Row quiz description.',
        pass_threshold: 65,
        pool_size: 3,
        quiz_questions: [
            {
                id: 1,
                question: 'Question A?',
                options: ['A1', 'A2'],
                correct_index: 1,
                explanation: 'Explanation A.',
                is_core: true,
            },
        ],
    };

    // Test if maps a fully populated quiz row, including nested questions
    it('2.1 maps a fully populated quiz row, including nested questions', () => {
        const result = mapQuizRow(row);

        expect(result.title).toBe('Row Quiz Title');
        expect(result.description).toBe('Row quiz description.');
        expect(result.passThreshold).toBe(65);
        expect(result.poolSize).toBe(3);
        expect(result.questions).toHaveLength(1);
        expect(result.questions[0]).toEqual({
            id: 1,
            question: 'Question A?',
            options: ['A1', 'A2'],
            correctIndex: 1,
            explanation: 'Explanation A.',
            isCore: true,
        });
    });

    // Test if an empty quiz_questions array maps to an empty questions array
    it('2.2 maps a quiz row with no questions to an empty questions array', () => {
        const emptyRow = { ...row, quiz_questions: [] };

        const result = mapQuizRow(emptyRow);
        expect(result.questions).toEqual([]);
    });
});

// 3. Test drawQuizPool
describe('3. drawQuizPool', () => {
    const bank: QuizData['questions'] = [
        { id: 1, question: 'Q1', options: ['A', 'B'], correctIndex: 0, explanation: '', isCore: true },
        { id: 2, question: 'Q2', options: ['A', 'B'], correctIndex: 0, explanation: '', isCore: false },
        { id: 3, question: 'Q3', options: ['A', 'B'], correctIndex: 0, explanation: '', isCore: false },
        { id: 4, question: 'Q4', options: ['A', 'B'], correctIndex: 0, explanation: '', isCore: false },
        { id: 5, question: 'Q5', options: ['A', 'B'], correctIndex: 0, explanation: '', isCore: true },
    ];

    it('3.1 returns every question when poolSize is null', () => {
        const pool = drawQuizPool({ title: '', description: '', passThreshold: 50, poolSize: null, questions: bank });
        expect(pool).toHaveLength(bank.length);
        expect(pool.map((q) => q.id).sort()).toEqual(bank.map((q) => q.id).sort());
    });

    it('3.2 returns every question when poolSize is greater than or equal to the bank size', () => {
        const pool = drawQuizPool({ title: '', description: '', passThreshold: 50, poolSize: 10, questions: bank });
        expect(pool).toHaveLength(bank.length);
    });

    it('3.3 always includes every core question', () => {
        const pool = drawQuizPool({ title: '', description: '', passThreshold: 50, poolSize: 3, questions: bank });
        const poolIds = pool.map((q) => q.id);
        expect(poolIds).toContain(1);
        expect(poolIds).toContain(5);
    });

    it('3.4 fills the remaining slots from non-core questions with no duplicates', () => {
        const pool = drawQuizPool({ title: '', description: '', passThreshold: 50, poolSize: 3, questions: bank });
        const poolIds = pool.map((q) => q.id);

        expect(pool).toHaveLength(3);
        expect(new Set(poolIds).size).toBe(3);
        poolIds.forEach((id) => expect(bank.map((q) => q.id)).toContain(id));
    });

    it('3.5 defensively clamps to core questions when poolSize is smaller than the core count', () => {
        // save-quiz's server-side validation should prevent this from ever being saved, but drawQuizPool should degrade safely rather than overflow the pool.
        const pool = drawQuizPool({ title: '', description: '', passThreshold: 50, poolSize: 1, questions: bank });
        expect(pool).toHaveLength(1);
        expect(pool[0].isCore).toBe(true);
    });
});

// ─── Integration Tests (test API calls with mock server) ────────────────────────────────────────────────────

// 4. Test load-quiz API call
describe('4. load-quiz', () => {
    // Test if loads successfully
    it('4.1 maps live response into quiz data', async () => {
        // Render hook
        const { result } = renderHook(() => useQuiz('hazards', testQuizData));

        // Wait for hook to load from API
        await waitFor(() => expect(result.current.loadStatus).toBe('ready'));

        // Check the data from the API call
        expect(result.current.quizData.title).toBe('Loaded Quiz Title');
        expect(result.current.quizData.description).toBe('Loaded quiz description.');
        expect(result.current.quizData.passThreshold).toBe(70);
        expect(result.current.quizData.poolSize).toBeNull();
        expect(result.current.quizData.questions).toHaveLength(2);
        expect(result.current.quizData.questions[0]).toEqual({
            id: 1,
            question: 'Loaded question one?',
            options: ['Opt A', 'Opt B', 'Opt C'],
            correctIndex: 1,
            explanation: 'Loaded explanation one.',
            isCore: false,
        });

        // Live content loaded successfully — should not be flagged as fallback
        expect(result.current.usingDefaults).toBe(false);
    });

    // Test if uses default info when the quiz row itself isn't found
    it('4.2 falls back to defaults when the quiz row is not found', async () => {
        server.use(
            http.get('/api/quizzes/load-quiz', () => HttpResponse.json({ ok: true, data: null }))
        );

        const { result } = renderHook(() => useQuiz('hazards', testQuizData));

        await waitFor(() => expect(result.current.loadStatus).toBe('ready'));
        expect(result.current.quizData).toEqual(testQuizData);
        expect(result.current.usingDefaults).toBe(true);
    });

    // Test if uses default info (title AND questions) when the quiz row exists but has no questions (proves live title/threshold are never paired with fallback questions)
    it('4.3 falls back to defaults entirely when the quiz row has no questions yet', async () => {
        server.use(
            http.get('/api/quizzes/load-quiz', () => HttpResponse.json({
                ok: true,
                data: {
                    quiz_id: 'hazards',
                    title: 'Half-seeded Quiz',
                    description: 'Title exists but no questions yet.',
                    pass_threshold: 80,
                    quiz_questions: [],
                },
            }))
        );

        const { result } = renderHook(() => useQuiz('hazards', testQuizData));

        await waitFor(() => expect(result.current.loadStatus).toBe('ready'));
        expect(result.current.quizData).toEqual(testQuizData);
        expect(result.current.usingDefaults).toBe(true);
    });

    // Test if uses default info when API responds with an error (bad query, policy rejection, data issue, etc.)
    it('4.4 falls back to defaults if API responds with an error', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        server.use(
            http.get('/api/quizzes/load-quiz', () => HttpResponse.json({ ok: false, error: 'Missing required "quiz_id" query param' }))
        );

        const { result } = renderHook(() => useQuiz('hazards', testQuizData));

        await waitFor(() => expect(result.current.loadStatus).toBe('error'));
        expect(result.current.quizData).toEqual(testQuizData);
        expect(consoleSpy).toHaveBeenCalledWith('load-quiz API error:', 'Missing required "quiz_id" query param');
        expect(result.current.usingDefaults).toBe(true);
        consoleSpy.mockRestore();
    });

    // Test if uses default info on a network failure
    it('4.5 falls back to defaults on a network failure', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        server.use(
            http.get('/api/quizzes/load-quiz', () => HttpResponse.error())
        );

        const { result } = renderHook(() => useQuiz('hazards', testQuizData));

        await waitFor(() => expect(result.current.loadStatus).toBe('error'));
        expect(result.current.quizData).toEqual(testQuizData);
        expect(consoleSpy).toHaveBeenCalledWith('Failed to load quiz "hazards" from Supabase — using defaults');
        expect(result.current.usingDefaults).toBe(true);
        consoleSpy.mockRestore();
    });

    // Test if uses default info when API responds with non-JSON (e.g. page crash, proxy timeout, etc.)
    it('4.6 falls back to defaults when the response body is not valid JSON', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        server.use(
            http.get('/api/quizzes/load-quiz', () => new HttpResponse('Internal Server Error', { status: 500 }))
        );

        const { result } = renderHook(() => useQuiz('hazards', testQuizData));

        await waitFor(() => expect(result.current.loadStatus).toBe('error'));
        expect(result.current.quizData).toEqual(testQuizData);
        expect(consoleSpy).toHaveBeenCalledWith('Failed to load quiz "hazards" from Supabase — using defaults');
        expect(result.current.usingDefaults).toBe(true);
        consoleSpy.mockRestore();
    });
});