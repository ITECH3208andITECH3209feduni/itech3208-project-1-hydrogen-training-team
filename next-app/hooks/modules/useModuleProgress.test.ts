// hooks/modules/useModuleProgress.test.ts
// Unit + integration tests for functions in useModuleProgress.ts & related API calls
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { User } from 'firebase/auth';
import { useModuleProgress } from './useModuleProgress';
import { server } from '../../mocks/server';
import { http, HttpResponse } from 'msw';

const getIdToken = vi.fn();
const fakeUser = { getIdToken } as unknown as User;

// jsdom has no IntersectionObserver — capture the callback so tests can report sections as visible
let observerCallback: IntersectionObserverCallback;
class MockIntersectionObserver {
	constructor(cb: IntersectionObserverCallback) { observerCallback = cb; }
	observe = vi.fn();
	unobserve = vi.fn();
	disconnect = vi.fn();
	takeRecords = vi.fn(() => []);
}

beforeEach(() => {
	getIdToken.mockResolvedValue('fake-token');
	vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
	vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	document.body.innerHTML = '';
	Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
	Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
});

// ─── Helpers ───────────────────────────────────────────────────────────────────────────────────────────
type Props = { moduleId: string; topic: string; sectionCount: number; user: User | null; loading: boolean };

const renderProgress = (overrides: Partial<Props> = {}) =>
	renderHook((props: Props) => useModuleProgress(props), {
		initialProps: { moduleId: '1', topic: 'hazards', sectionCount: 4, user: fakeUser, loading: false, ...overrides } as Props,
	});

// Adds the [data-module-section] elements ModuleReaderPage would render (must exist before the hook's tracking effect runs)
function addSections(count: number): HTMLElement[] {
	return Array.from({ length: count }, (_, i) => {
		const el = document.createElement('div');
		el.setAttribute('data-module-section', '');
		el.setAttribute('data-section-number', String(i + 1));
		el.scrollIntoView = vi.fn();
		document.body.appendChild(el);
		return el;
	});
}

function reportVisible(sections: HTMLElement[], sectionNumber: number) {
	act(() => {
		observerCallback(
			[{ isIntersecting: true, target: sections[sectionNumber - 1] } as unknown as IntersectionObserverEntry],
			{} as IntersectionObserver
		);
	});
}

// Replaces the default GET handler with these saved records
const serveProgress = (...records: object[]) =>
	server.use(http.get('/api/modules/progress', () => HttpResponse.json({ ok: true, progress: records })));

// Records every PATCH body
function capturePatches() {
	const bodies: any[] = [];
	server.use(
		http.patch('/api/modules/progress', async ({ request }) => {
			bodies.push(await request.json());
			return HttpResponse.json({ ok: true, progress: {} });
		})
	);
	return bodies;
}

// Lets any request that (wrongly) fired have time to land, for "nothing happened" assertions
const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 50)); });

const loaded = async (result: { current: ReturnType<typeof useModuleProgress> }) =>
	waitFor(() => expect(result.current.progressLoaded).toBe(true));

// The default GET handler returns module '1' at 100%, so a fresh render starts out complete
const renderComplete = async () => {
	const hook = renderProgress();
	await waitFor(() => expect(hook.result.current.currentProgress).toBe(100));
	return hook;
};
const restartBodies = (patches: any[]) => patches.filter((b) => b.action === 'restart');

// ─── Unit Tests (test purely internal behaviour) ────────────────────────────────────────────────────
// Note: several of these set up API mocks, but only to test guard clauses and derived state, not the API calls themselves.

// 1. Test saved-progress parsing
describe('1. saved-progress parsing', () => {
	it('1.1 clamps out-of-range saved values to 0–100', async () => {
		serveProgress({ module_id: '1', progress: 150 });
		const first = renderProgress();
		await loaded(first.result);
		expect(first.result.current.currentProgress).toBe(100);

		serveProgress({ module_id: '1', progress: -20 });
		const second = renderProgress();
		await loaded(second.result);
		expect(second.result.current.currentProgress).toBe(0);
	});
});

// 2. Test skip guards
describe('2. skip guards', () => {
	it('2.1 makes no requests while auth is loading, when signed out, or with no sections', async () => {
		let called = false;
		server.use(
			http.post('/api/modules/progress', () => { called = true; return HttpResponse.json({ ok: true }); }),
			http.get('/api/modules/progress', () => { called = true; return HttpResponse.json({ ok: true, progress: [] }); })
		);

		const a = renderProgress({ loading: true });
		const b = renderProgress({ user: null });
		const c = renderProgress({ sectionCount: 0 });
		await settle();

		expect(called).toBe(false);
		[a, b, c].forEach(({ result }) => expect(result.current.progressLoaded).toBe(false));
	});
});

// 3. Test switching module
describe('3. switching module', () => {
	it('3.1 resets and reloads progress for the new module id', async () => {
		serveProgress(
			{ module_id: '1', progress: 100, status: 'done' },
			{ module_id: '2', progress: 40, status: 'progress' },
		);

		const { result, rerender } = renderProgress({ moduleId: '1' });
		await waitFor(() => expect(result.current.currentProgress).toBe(100));

		rerender({ moduleId: '2', topic: 'hazards', sectionCount: 4, user: fakeUser, loading: false });

		await waitFor(() => expect(result.current.currentProgress).toBe(40));
	});
});

// 4. Test section-tracking guard rules
describe('4. section-tracking guard rules', () => {
	it('4.1 ignores a section that is not the next one', async () => {
		serveProgress({ module_id: '1', progress: 0, status: 'progress', time_spent: 0 });
		const patches = capturePatches();
		const sections = addSections(4);

		const { result } = renderProgress();
		await loaded(result);
		reportVisible(sections, 3);   // skipping ahead (e.g. initial layout)
		await settle();

		expect(patches).toHaveLength(0);
		expect(result.current.currentProgress).toBe(0);
	});

	it('4.2 ignores sections already reached in an earlier session', async () => {
		serveProgress({ module_id: '1', progress: 50, status: 'progress', time_spent: 0 });   // sections 1–2 already reached
		const patches = capturePatches();
		const sections = addSections(4);

		const { result } = renderProgress();
		await loaded(result);
		reportVisible(sections, 2);
		await settle();

		expect(patches).toHaveLength(0);
	});

	it('4.3 saves nothing if the initial load failed', async () => {
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		server.use(
			http.post('/api/modules/progress', () => HttpResponse.json({ ok: false, error: 'DB down' }, { status: 500 }))
		);
		const patches = capturePatches();
		const sections = addSections(4);

		const { result } = renderProgress();
		await loaded(result);
		reportVisible(sections, 1);
		await settle();

		expect(patches).toHaveLength(0);
		consoleSpy.mockRestore();
	});

	it('4.4 saves nothing on unmount if the initial load failed', async () => {
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		server.use(
			http.post('/api/modules/progress', () => HttpResponse.json({ ok: false, error: 'DB down' }, { status: 500 }))
		);
		const patches = capturePatches();

		const { result, unmount } = renderProgress();
		await loaded(result);
		unmount();
		await settle();

		expect(patches).toHaveLength(0);
		consoleSpy.mockRestore();
	});
});

// 5. Test continueFromSavedProgress
describe('5. continueFromSavedProgress', () => {
	it('5.1 scrolls to the section the saved progress reaches', async () => {
		serveProgress({ module_id: '1', progress: 50, status: 'progress', time_spent: 0 });
		const sections = addSections(4);

		const { result } = renderProgress();
		await waitFor(() => expect(result.current.currentProgress).toBe(50));

		act(() => result.current.continueFromSavedProgress());

		expect(sections[1].scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' });   // ceil(50% of 4) = section 2
		expect(sections[0].scrollIntoView).not.toHaveBeenCalled();
	});

	it('5.2 rounds a partial section up', async () => {
		serveProgress({ module_id: '1', progress: 60, status: 'progress', time_spent: 0 });
		const sections = addSections(4);

		const { result } = renderProgress();
		await waitFor(() => expect(result.current.currentProgress).toBe(60));

		act(() => result.current.continueFromSavedProgress());

		expect(sections[2].scrollIntoView).toHaveBeenCalled();   // ceil(2.4) = section 3
	});

	it('5.3 does nothing when nothing is saved yet, or when the module is already complete', async () => {
		const sections = addSections(4);

		serveProgress({ module_id: '1', progress: 100 });
		const done = renderProgress();
		await waitFor(() => expect(done.result.current.currentProgress).toBe(100));
		act(() => done.result.current.continueFromSavedProgress());

		serveProgress({ module_id: '1', progress: 0 });
		const fresh = renderProgress();
		await loaded(fresh.result);
		act(() => fresh.result.current.continueFromSavedProgress());

		sections.forEach((s) => expect(s.scrollIntoView).not.toHaveBeenCalled());
	});

	it('5.4 does not throw when the sections are not on the page', async () => {
		serveProgress({ module_id: '1', progress: 50, status: 'progress', time_spent: 0 });

		const { result } = renderProgress();   // no addSections()
		await waitFor(() => expect(result.current.currentProgress).toBe(50));

		expect(() => act(() => result.current.continueFromSavedProgress())).not.toThrow();
	});
});

// 6. Test restartModule guards and state
describe('6. restartModule guards and state', () => {
	it('6.1 does nothing while the module is not complete', async () => {
		const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
		const patches = capturePatches();
		serveProgress({ module_id: '1', progress: 40, status: 'progress', time_spent: 0 });

		const { result } = renderProgress();
		await waitFor(() => expect(result.current.currentProgress).toBe(40));
		await act(async () => { await result.current.restartModule(); });

		expect(confirmSpy).not.toHaveBeenCalled();
		expect(restartBodies(patches)).toHaveLength(0);
	});

	it('6.2 does nothing if the confirmation is declined', async () => {
		vi.spyOn(window, 'confirm').mockReturnValue(false);
		const patches = capturePatches();

		const { result } = await renderComplete();
		await act(async () => { await result.current.restartModule(); });

		expect(restartBodies(patches)).toHaveLength(0);
		expect(result.current.currentProgress).toBe(100);
	});

	it('6.3 reports restarting while the request is in flight', async () => {
		vi.spyOn(window, 'confirm').mockReturnValue(true);
		let release!: () => void;
		const gate = new Promise<void>((resolve) => { release = resolve; });
		server.use(
			http.patch('/api/modules/progress', async () => {
				await gate;
				return HttpResponse.json({ ok: true, progress: {} });
			})
		);

		const { result } = await renderComplete();
		let promise!: Promise<void>;
		act(() => { promise = result.current.restartModule(); });
		await waitFor(() => expect(result.current.restarting).toBe(true));

		await act(async () => { release(); await promise; });
		expect(result.current.restarting).toBe(false);
	});

	// A restart scrolls to the top, which puts section 1 in view — that must not instantly count as reading it
	it('6.4 does not count section 1 as read until the learner scrolls away from the top', async () => {
		vi.spyOn(window, 'confirm').mockReturnValue(true);
		const patches = capturePatches();
		const sections = addSections(4);

		const { result } = await renderComplete();
		await act(async () => { await result.current.restartModule(); });

		Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
		reportVisible(sections, 1);
		await settle();
		expect(patches.filter((b) => b.progress === 25)).toHaveLength(0);

		Object.defineProperty(window, 'scrollY', { configurable: true, value: 100 });
		reportVisible(sections, 1);
		await waitFor(() => expect(patches.filter((b) => b.progress === 25)).toHaveLength(1));
	});
});

// ─── Integration Tests (test API calls with mock server) ────────────────────────────────────────────

// 7. Test loading progress
describe('7. loading progress', () => {
	it('7.1 creates the record (POST) and then loads it (GET), scoped to the topic', async () => {
		const calls: string[] = [];
		let postBody: any = null;
		let postAuth: string | null = null;
		let getUrl = '';
		server.use(
			http.post('/api/modules/progress', async ({ request }) => {
				calls.push('POST');
				postBody = await request.json();
				postAuth = request.headers.get('Authorization');
				return HttpResponse.json({ ok: true });
			}),
			http.get('/api/modules/progress', ({ request }) => {
				calls.push('GET');
				getUrl = request.url;
				return HttpResponse.json({ ok: true, progress: [] });
			})
		);

		const { result } = renderProgress();
		await loaded(result);

		expect(calls).toEqual(['POST', 'GET']);
		expect(postBody).toEqual({ module_id: '1', topic: 'hazards' });
		expect(postAuth).toBe('Bearer fake-token');
		expect(new URL(getUrl).searchParams.get('topic')).toBe('hazards');
	});

	it('7.2 sets currentProgress from the saved record for this module', async () => {
		serveProgress(
			{ module_id: '2', progress: 10, status: 'progress', time_spent: 0 },
			{ module_id: '1', progress: 40, status: 'progress', time_spent: 3 },
		);

		const { result } = renderProgress();
		await loaded(result);

		expect(result.current.currentProgress).toBe(40);
	});

	it('7.3 starts at 0 when there is no record for this module', async () => {
		serveProgress({ module_id: '99', progress: 80, status: 'progress' });

		const { result } = renderProgress();
		await loaded(result);

		expect(result.current.currentProgress).toBe(0);
	});

	it('7.4 still becomes loaded, at 0, when creating the record fails', async () => {
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		server.use(
			http.post('/api/modules/progress', () => HttpResponse.json({ ok: false, error: 'DB down' }, { status: 500 }))
		);

		const { result } = renderProgress();
		await loaded(result);

		expect(result.current.currentProgress).toBe(0);
		expect(consoleSpy).toHaveBeenCalledWith('Failed to load module progress:', expect.any(Error));
		consoleSpy.mockRestore();
	});

	it('7.5 still becomes loaded, at 0, when reading the records fails', async () => {
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		server.use(
			http.get('/api/modules/progress', () => HttpResponse.json({ ok: false, error: 'DB down' }, { status: 500 }))
		);

		const { result } = renderProgress();
		await loaded(result);

		expect(result.current.currentProgress).toBe(0);
		consoleSpy.mockRestore();
	});
});

// 8. Test section progress saves
describe('8. section progress saves', () => {
	it('8.1 saves progress when the next section becomes visible', async () => {
		serveProgress({ module_id: '1', progress: 0, status: 'progress', time_spent: 0 });
		const patches = capturePatches();
		const sections = addSections(4);

		const { result } = renderProgress();
		await loaded(result);
		reportVisible(sections, 1);

		await waitFor(() => expect(patches).toHaveLength(1));
		expect(patches[0]).toMatchObject({ module_id: '1', topic: 'hazards', progress: 25 });
		await waitFor(() => expect(result.current.currentProgress).toBe(25));
	});

	it('8.2 saves 100 when the last section is reached', async () => {
		serveProgress({ module_id: '1', progress: 75, status: 'progress', time_spent: 0 });
		const patches = capturePatches();
		const sections = addSections(4);

		const { result } = renderProgress();
		await loaded(result);
		reportVisible(sections, 4);

		await waitFor(() => expect(patches).toHaveLength(1));
		expect(patches[0].progress).toBe(100);
	});

	it('8.3 keeps the old progress and logs when a save fails', async () => {
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		serveProgress({ module_id: '1', progress: 0, status: 'progress', time_spent: 0 });
		server.use(
			http.patch('/api/modules/progress', () => HttpResponse.json({ ok: false, error: 'Boom' }, { status: 500 }))
		);
		const sections = addSections(4);

		const { result } = renderProgress();
		await loaded(result);
		reportVisible(sections, 1);

		await waitFor(() => expect(consoleSpy).toHaveBeenCalledWith('Failed to save module progress:', 'Boom'));
		expect(result.current.currentProgress).toBe(0);
		consoleSpy.mockRestore();
	});

	it('8.4 queues a save requested while another is in flight, rather than dropping it', async () => {
		serveProgress({ module_id: '1', progress: 0, status: 'progress', time_spent: 0 });
		const bodies: any[] = [];
		let release!: () => void;
		const gate = new Promise<void>((resolve) => { release = resolve; });
		server.use(
			http.patch('/api/modules/progress', async ({ request }) => {
				bodies.push(await request.json());
				if (bodies.length === 1) await gate;   // hold the first save open
				return HttpResponse.json({ ok: true, progress: {} });
			})
		);
		const sections = addSections(4);

		const { result } = renderProgress();
		await loaded(result);
		reportVisible(sections, 1);                          // save #1 (25%) goes in flight
		await waitFor(() => expect(bodies).toHaveLength(1));
		reportVisible(sections, 2);                          // 50% requested while #1 is still open
		act(() => release());

		await waitFor(() => expect(bodies).toHaveLength(2));
		expect(bodies.map((b) => b.progress)).toEqual([25, 50]);
	});
});

// 9. Test saving when the learner leaves
describe('9. saving when the learner leaves', () => {
	it('9.1 flushes progress and rounded-up time on unmount', async () => {
		const now = vi.spyOn(Date, 'now').mockReturnValue(1_000_000);
		serveProgress({ module_id: '1', progress: 20, status: 'progress', time_spent: 10 });
		const patches = capturePatches();

		const { result, unmount } = renderProgress();
		await loaded(result);

		now.mockReturnValue(1_000_000 + 181_000);   // 181s later → rounds up to 4 minutes on a forced save
		unmount();

		await waitFor(() => expect(patches).toHaveLength(1));
		expect(patches[0]).toMatchObject({ module_id: '1', topic: 'hazards', progress: 20, time_spent: 14 });
	});

	it('9.2 flushes on pagehide', async () => {
		const patches = capturePatches();
		const { result } = renderProgress();
		await loaded(result);

		act(() => { window.dispatchEvent(new Event('pagehide')); });

		await waitFor(() => expect(patches).toHaveLength(1));
	});

	it('9.3 flushes when the tab becomes hidden', async () => {
		const patches = capturePatches();
		const { result } = renderProgress();
		await loaded(result);

		Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
		act(() => { document.dispatchEvent(new Event('visibilitychange')); });

		await waitFor(() => expect(patches).toHaveLength(1));
	});
});

// 10. Test restart requests
describe('10. restart requests', () => {
	it('10.1 sends the restart action, resets progress to 0 and scrolls to the top', async () => {
		vi.spyOn(window, 'confirm').mockReturnValue(true);
		const patches = capturePatches();

		const { result } = await renderComplete();
		await act(async () => { await result.current.restartModule(); });

		expect(restartBodies(patches)).toEqual([{ module_id: '1', topic: 'hazards', action: 'restart' }]);
		expect(result.current.currentProgress).toBe(0);
		expect(result.current.restarting).toBe(false);
		expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'auto' });
	});

	it('10.2 keeps the completed progress and logs when the restart fails', async () => {
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.spyOn(window, 'confirm').mockReturnValue(true);
		server.use(
			http.patch('/api/modules/progress', () =>
				HttpResponse.json({ ok: false, error: 'Module progress record does not exist.' }, { status: 404 })
			)
		);

		const { result } = await renderComplete();
		await act(async () => { await result.current.restartModule(); });

		expect(result.current.currentProgress).toBe(100);
		expect(result.current.restarting).toBe(false);
		expect(consoleSpy).toHaveBeenCalledWith('Failed to restart module:', expect.any(Error));
		consoleSpy.mockRestore();
	});
});