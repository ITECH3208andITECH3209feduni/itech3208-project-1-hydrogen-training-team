// hooks/useQuiz.test.ts
// Unit & Integration tests for functions in useQuiz.ts & related API calls
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { mapQuestionRow, mapQuizRow, useQuiz, QuizData } from './useQuiz';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';

// A mock default used in place of the /lib/questionhazards.ts file.
const testQuizData: QuizData = {
    title: 'Test Quiz Title',
    description: 'A fixture quiz used only in these tests.',
    passThreshold: 50,
    questions: [
        {
            id: 1,
            question: 'Fixture question one?',
            options: ['Fixture A', 'Fixture B'],
            correctIndex: 0,
            explanation: 'Fixture explanation one.',
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
        });

        expect(result).toEqual({
            id: 3,
            question: 'What is H2?',
            options: ['Hydrogen', 'Helium'],
            correctIndex: 0,
            explanation: 'H2 is hydrogen gas.',
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
        quiz_questions: [
            {
                id: 1,
                question: 'Question A?',
                options: ['A1', 'A2'],
                correct_index: 1,
                explanation: 'Explanation A.',
            },
        ],
    };

    // Test if maps a fully populated quiz row, including nested questions
    it('2.1 maps a fully populated quiz row, including nested questions', () => {
        const result = mapQuizRow(row);

        expect(result.title).toBe('Row Quiz Title');
        expect(result.description).toBe('Row quiz description.');
        expect(result.passThreshold).toBe(65);
        expect(result.questions).toHaveLength(1);
        expect(result.questions[0]).toEqual({
            id: 1,
            question: 'Question A?',
            options: ['A1', 'A2'],
            correctIndex: 1,
            explanation: 'Explanation A.',
        });
    });

    // Test if an empty quiz_questions array maps to an empty questions array
    it('2.2 maps a quiz row with no questions to an empty questions array', () => {
        const emptyRow = { ...row, quiz_questions: [] };

        const result = mapQuizRow(emptyRow);
        expect(result.questions).toEqual([]);
    });
});

// ─── Integration Tests (test API calls with mock server) ────────────────────────────────────────────────────

// 3. Test load-quiz API call
describe('3. load-quiz', () => {
    // Test if loads successfully
    it('3.1 maps live response into quiz data', async () => {
        // Render hook
        const { result } = renderHook(() => useQuiz('hazards', testQuizData));

        // Wait for hook to load from API
        await waitFor(() => expect(result.current.loadStatus).toBe('ready'));

        // Check the data from the API call
        expect(result.current.quizData.title).toBe('Loaded Quiz Title');
        expect(result.current.quizData.description).toBe('Loaded quiz description.');
        expect(result.current.quizData.passThreshold).toBe(70);
        expect(result.current.quizData.questions).toHaveLength(2);
        expect(result.current.quizData.questions[0]).toEqual({
            id: 1,
            question: 'Loaded question one?',
            options: ['Opt A', 'Opt B', 'Opt C'],
            correctIndex: 1,
            explanation: 'Loaded explanation one.',
        });

        // Live content loaded successfully — should not be flagged as fallback
        expect(result.current.usingDefaults).toBe(false);
    });

    // Test if uses default info when the quiz row itself isn't found
    it('3.2 falls back to defaults when the quiz row is not found', async () => {
        server.use(
            http.get('/api/quizzes/load-quiz', () => HttpResponse.json({ ok: true, data: null }))
        );

        const { result } = renderHook(() => useQuiz('hazards', testQuizData));

        await waitFor(() => expect(result.current.loadStatus).toBe('ready'));
        expect(result.current.quizData).toEqual(testQuizData);
        expect(result.current.usingDefaults).toBe(true);
    });

    // Test if uses default info (title AND questions) when the quiz row exists but has no questions (proves live title/threshold are never paired with fallback questions)
    it('3.3 falls back to defaults entirely when the quiz row has no questions yet', async () => {
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
    it('3.4 falls back to defaults if API responds with an error', async () => {
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
    it('3.5 falls back to defaults on a network failure', async () => {
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
    it('3.6 falls back to defaults when the response body is not valid JSON', async () => {
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