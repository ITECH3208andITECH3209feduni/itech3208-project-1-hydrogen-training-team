// hooks/quizzes/useQuizProgress.test.ts
// Unit + integration tests for functions in useQuizProgress.ts & related API calls
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { User } from 'firebase/auth';
import { useQuizProgress } from './useQuizProgress';
import { server } from '../../mocks/server';
import { http, HttpResponse } from 'msw';

const getIdToken = vi.fn();
const fakeUser = { getIdToken } as unknown as User;

beforeEach(() => {
	getIdToken.mockResolvedValue('fake-token');
});

type Props = { user: User | null; loading: boolean };
const renderProgress = (overrides: Partial<Props> = {}) =>
	renderHook((props: Props) => useQuizProgress(props), {
		initialProps: { user: fakeUser, loading: false, ...overrides } as Props,
	});

// Lets any request that (wrongly) fired have time to land, for "nothing happened" assertions
const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 50)); });

const serveSavedPreference = (visible: boolean | null) =>
	server.use(
		http.get('/api/quizzes/progress', () =>
			HttpResponse.json({ ok: true, progress: visible === null ? null : { leaderboard_visible: visible } })
		)
	);

// ─── Unit Tests (test purely internal behaviour) ────────────────────────────────────────────────────
// Note: several of these set up API mocks, but only to test state and guard logic, not the API calls themselves.

// 1. Test the leaderboard preference held after a submission
describe('1. leaderboard preference after a submission', () => {
	// Regression: BUG_REPORT "Leaderboard opt-in banner shows the wrong state right after submitting or retrying"
	it('1.1 keeps a previously chosen preference instead of resetting it to private', async () => {
		serveSavedPreference(true);
		server.use(
			http.post('/api/quizzes/progress', () =>
				HttpResponse.json({ ok: true, progress: { leaderboard_visible: true } })
			)
		);

		const { result } = renderProgress();
		await waitFor(() => expect(result.current.leaderboardVisible).toBe(true));

		await act(async () => { await result.current.submitQuizResult(90, true); });

		expect(result.current.leaderboardVisible).toBe(true);
	});

	it('1.2 defaults to private for a first-time submission', async () => {
		serveSavedPreference(null);
		const { result } = renderProgress();
		await settle();
		expect(result.current.leaderboardVisible).toBeNull();

		await act(async () => { await result.current.submitQuizResult(60, false); });

		expect(result.current.leaderboardVisible).toBe(false);   // default POST handler stores private
	});

	it('1.3 hides a previous "saved" note after a new submission', async () => {
		const { result } = renderProgress();
		await settle();

		await act(async () => { await result.current.updateLeaderboardPreference(true); });
		expect(result.current.leaderboardSaved).toBe(true);

		await act(async () => { await result.current.submitQuizResult(90, true); });
		expect(result.current.leaderboardSaved).toBe(false);
	});
});

// 2. Test guard clauses (signed out / auth still loading)
describe('2. signed-out and auth-loading guards', () => {
	it('2.1 makes no request on mount while auth is loading or when signed out', async () => {
		let called = false;
		server.use(
			http.get('/api/quizzes/progress', () => { called = true; return HttpResponse.json({ ok: true, progress: null }); })
		);

		renderProgress({ loading: true });
		renderProgress({ user: null });
		await settle();

		expect(called).toBe(false);
	});

	it('2.2 clears the preference when the user signs out', async () => {
		serveSavedPreference(true);
		const { result, rerender } = renderProgress();
		await waitFor(() => expect(result.current.leaderboardVisible).toBe(true));

		rerender({ user: null, loading: false });

		await waitFor(() => expect(result.current.leaderboardVisible).toBeNull());
	});

	it('2.3 submitQuizResult does nothing and resolves false when there is no signed-in user', async () => {
		let called = false;
		server.use(
			http.post('/api/quizzes/progress', () => { called = true; return HttpResponse.json({ ok: true }); })
		);

		const { result } = renderProgress({ user: null });
		let saved!: boolean;
		await act(async () => { saved = await result.current.submitQuizResult(80, true); });

		expect(saved).toBe(false);
		expect(called).toBe(false);
	});

	it('2.4 updateLeaderboardPreference does nothing when there is no signed-in user', async () => {
		let called = false;
		server.use(
			http.patch('/api/quizzes/progress', () => { called = true; return HttpResponse.json({ ok: true }); })
		);

		const { result } = renderProgress({ user: null });
		await act(async () => { await result.current.updateLeaderboardPreference(true); });

		expect(called).toBe(false);
	});
});

// 3. Test in-flight (busy) state
describe('3. in-flight state', () => {
	it('3.1 reports saving while a submission is in flight', async () => {
		let release!: () => void;
		const gate = new Promise<void>((resolve) => { release = resolve; });
		server.use(
			http.post('/api/quizzes/progress', async () => {
				await gate;
				return HttpResponse.json({ ok: true, progress: { leaderboard_visible: false } });
			})
		);

		const { result } = renderProgress();
		let promise!: Promise<boolean>;
		act(() => { promise = result.current.submitQuizResult(80, true); });
		await waitFor(() => expect(result.current.saving).toBe(true));

		await act(async () => { release(); await promise; });
		expect(result.current.saving).toBe(false);
	});

	it('3.2 reports leaderboardSaving while a preference update is in flight', async () => {
		let release!: () => void;
		const gate = new Promise<void>((resolve) => { release = resolve; });
		server.use(
			http.patch('/api/quizzes/progress', async () => {
				await gate;
				return HttpResponse.json({ ok: true, progress: {} });
			})
		);

		const { result } = renderProgress();
		let promise!: Promise<void>;
		act(() => { promise = result.current.updateLeaderboardPreference(true); });
		await waitFor(() => expect(result.current.leaderboardSaving).toBe(true));

		await act(async () => { release(); await promise; });
		expect(result.current.leaderboardSaving).toBe(false);
	});

	it('3.3 ignores a second choice while one is still saving', async () => {
		let patchCount = 0;
		let release!: () => void;
		const gate = new Promise<void>((resolve) => { release = resolve; });
		server.use(
			http.patch('/api/quizzes/progress', async () => {
				patchCount++;
				await gate;
				return HttpResponse.json({ ok: true, progress: {} });
			})
		);

		const { result } = renderProgress();
		let first!: Promise<void>;
		act(() => { first = result.current.updateLeaderboardPreference(true); });
		await waitFor(() => expect(result.current.leaderboardSaving).toBe(true));

		await act(async () => { await result.current.updateLeaderboardPreference(false); });   // ignored
		await act(async () => { release(); await first; });

		expect(patchCount).toBe(1);
		expect(result.current.leaderboardVisible).toBe(true);
	});
});

// 4. Test the notice / error helpers
describe('4. resetLeaderboardNotice / clearError', () => {
	// Regression: retrying used to reset the preference to private as well as hiding the note
	it('4.1 hides the "saved" note without touching the chosen preference', async () => {
		const { result } = renderProgress();
		await act(async () => { await result.current.updateLeaderboardPreference(true); });
		expect(result.current.leaderboardSaved).toBe(true);

		act(() => result.current.resetLeaderboardNotice());

		expect(result.current.leaderboardSaved).toBe(false);
		expect(result.current.leaderboardVisible).toBe(true);
	});

	it('4.2 clearError empties the error message', async () => {
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		server.use(
			http.post('/api/quizzes/progress', () => HttpResponse.json({ ok: false, error: 'Boom' }, { status: 500 }))
		);

		const { result } = renderProgress();
		await act(async () => { await result.current.submitQuizResult(80, true); });
		expect(result.current.error).toBe('Boom');

		act(() => result.current.clearError());
		expect(result.current.error).toBe('');
		consoleSpy.mockRestore();
	});
});

// ─── Integration Tests (test API calls with mock server) ────────────────────────────────────────────

// 5. Test the saved-preference GET
describe('5. load saved leaderboard preference', () => {
	it('5.1 loads the saved preference on mount, sending the learner\'s token', async () => {
		let capturedAuth: string | null = null;
		server.use(
			http.get('/api/quizzes/progress', ({ request }) => {
				capturedAuth = request.headers.get('Authorization');
				return HttpResponse.json({ ok: true, progress: { leaderboard_visible: true } });
			})
		);

		const { result } = renderProgress();

		await waitFor(() => expect(result.current.leaderboardVisible).toBe(true));
		expect(capturedAuth).toBe('Bearer fake-token');
	});

	it('5.2 stays null when the learner has no quiz record yet', async () => {
		serveSavedPreference(null);
		const { result } = renderProgress();

		await settle();
		expect(result.current.leaderboardVisible).toBeNull();
	});

	it('5.3 stays null on a failed response', async () => {
		server.use(
			http.get('/api/quizzes/progress', () => HttpResponse.json({ ok: false, error: 'Nope' }, { status: 401 }))
		);
		const { result } = renderProgress();

		await settle();
		expect(result.current.leaderboardVisible).toBeNull();
	});

	it('5.4 stays null and logs on a network failure', async () => {
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		server.use(http.get('/api/quizzes/progress', () => HttpResponse.error()));

		const { result } = renderProgress();

		await waitFor(() =>
			expect(consoleSpy).toHaveBeenCalledWith('LEADERBOARD: failed to load saved preference', expect.anything())
		);
		expect(result.current.leaderboardVisible).toBeNull();
		consoleSpy.mockRestore();
	});
});

// 6. Test the quiz result POST
describe('6. submitQuizResult (POST)', () => {
	it('6.1 POSTs the score and pass flag, and resolves true', async () => {
		let capturedBody: any = null;
		server.use(
			http.post('/api/quizzes/progress', async ({ request }) => {
				capturedBody = await request.json();
				return HttpResponse.json({ ok: true, progress: { leaderboard_visible: false } });
			})
		);

		const { result } = renderProgress();
		let saved!: boolean;
		await act(async () => { saved = await result.current.submitQuizResult(85, true); });

		expect(saved).toBe(true);
		expect(capturedBody).toEqual({ score: 85, passed: true });
		expect(result.current.error).toBe('');
	});

	it('6.2 resolves false and exposes the server\'s message on a failed save', async () => {
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		server.use(
			http.post('/api/quizzes/progress', () =>
				HttpResponse.json({ ok: false, error: 'score must be between 0 and 100' }, { status: 400 })
			)
		);

		const { result } = renderProgress();
		let saved!: boolean;
		await act(async () => { saved = await result.current.submitQuizResult(150, true); });

		expect(saved).toBe(false);
		expect(result.current.error).toBe('score must be between 0 and 100');
		expect(result.current.saving).toBe(false);
		consoleSpy.mockRestore();
	});

	it('6.3 resolves false with an error on a network failure', async () => {
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		server.use(http.post('/api/quizzes/progress', () => HttpResponse.error()));

		const { result } = renderProgress();
		let saved!: boolean;
		await act(async () => { saved = await result.current.submitQuizResult(80, true); });

		expect(saved).toBe(false);
		expect(result.current.error).not.toBe('');
		consoleSpy.mockRestore();
	});

	it('6.4 clears an earlier error when the next submission starts', async () => {
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		server.use(
			http.post('/api/quizzes/progress', () => HttpResponse.json({ ok: false, error: 'Boom' }, { status: 500 }), { once: true })
		);

		const { result } = renderProgress();
		await act(async () => { await result.current.submitQuizResult(80, true); });
		expect(result.current.error).toBe('Boom');

		await act(async () => { await result.current.submitQuizResult(80, true); });   // falls through to the default (successful) handler
		expect(result.current.error).toBe('');
		consoleSpy.mockRestore();
	});
});

// 7. Test the leaderboard preference PATCH
describe('7. updateLeaderboardPreference (PATCH)', () => {
	it('7.1 PATCHes the choice and records it as saved', async () => {
		let capturedBody: any = null;
		server.use(
			http.patch('/api/quizzes/progress', async ({ request }) => {
				capturedBody = await request.json();
				return HttpResponse.json({ ok: true, progress: {} });
			})
		);

		const { result } = renderProgress();
		await act(async () => { await result.current.updateLeaderboardPreference(true); });

		expect(capturedBody).toEqual({ leaderboard_visible: true });
		expect(result.current.leaderboardVisible).toBe(true);
		expect(result.current.leaderboardSaved).toBe(true);
	});

	it('7.2 keeps the old preference and exposes the error on a failed update', async () => {
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		serveSavedPreference(false);
		server.use(
			http.patch('/api/quizzes/progress', () =>
				HttpResponse.json({ ok: false, error: 'No completed quiz record found. Submit the quiz first.' }, { status: 404 })
			)
		);

		const { result } = renderProgress();
		await waitFor(() => expect(result.current.leaderboardVisible).toBe(false));

		await act(async () => { await result.current.updateLeaderboardPreference(true); });

		expect(result.current.leaderboardVisible).toBe(false);
		expect(result.current.leaderboardSaved).toBe(false);
		expect(result.current.error).toBe('No completed quiz record found. Submit the quiz first.');
		consoleSpy.mockRestore();
	});

		// A slow initial load resolving after an explicit update must not overwrite it
	it('7.3 does not let a slow initial GET overwrite a preference set in the meantime', async () => {
		let releaseGet!: () => void;
		const gate = new Promise<void>((resolve) => { releaseGet = resolve; });
		server.use(
			http.get('/api/quizzes/progress', async () => {
				await gate;
				return HttpResponse.json({ ok: true, progress: { leaderboard_visible: false } });
			}),
			http.patch('/api/quizzes/progress', () =>
				HttpResponse.json({ ok: true, progress: {} })
			)
		);

		const { result } = renderProgress();   // GET now stuck behind `gate`
		await act(async () => { await result.current.updateLeaderboardPreference(true); });
		expect(result.current.leaderboardVisible).toBe(true);

		await act(async () => { releaseGet(); await settle(); });   // let the stale GET land
		expect(result.current.leaderboardVisible).toBe(true);       // must not be clobbered back to false
	});
});