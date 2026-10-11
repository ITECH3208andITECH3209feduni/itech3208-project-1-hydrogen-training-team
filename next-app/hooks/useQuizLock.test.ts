// hooks/useQuizLock.test.ts
// Unit & Integration tests for the quiz lock (quiz unlocks once every module in its topic is done)
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { User } from 'firebase/auth';
import { isProgressDone, useQuizLock } from './useQuizLock';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';

// A minimal fake logged-in user — only getIdToken is used by useQuizLock.
const fakeUser = { getIdToken: vi.fn().mockResolvedValue('fake-token') } as unknown as User;

// Two mock defaults, standing in for lib/modules/hazards.ts
const makeModule = (id: string) => ({
	id,
	slug: `test-module-${id}`,
	badgeNum: Number(id),
	icon: '🧪',
	iconBg: 'rgba(0,0,0,0.1)',
	title: `Test Module ${id}`,
	description: 'A fixture module used only in these tests.',
	sections: [],
	keyTakeaway: 'Fixture key takeaway.',
	status: 'todo' as const,
	progress: 0,
});
const testModules = [makeModule('1'), makeModule('2')];

// Overrides the live module list with the given ids
function mockLiveModules(ids: string[]) {
	server.use(
		http.get('/api/modules/load-modules', () =>
			HttpResponse.json({ ok: true, data: ids.map((id) => ({ id })) })
		)
	);
}

// Overrides the user's progress rows
function mockProgress(progress: object[]) {
	server.use(
		http.get('/api/modules/progress', () => HttpResponse.json({ ok: true, progress }))
	);
}

// ─── Unit Tests ────────────────────────────────────────────────────────────────────────────────────

// 1. Test isProgressDone
describe('1. isProgressDone', () => {
	it('1.1 treats status "done" as done', () => {
		expect(isProgressDone({ module_id: '1', status: 'done', progress: 40 })).toBe(true);
	});

	it('1.2 treats 100% progress as done even without the status', () => {
		expect(isProgressDone({ module_id: '1', status: 'progress', progress: 100 })).toBe(true);
	});

	it('1.3 treats an opened-but-unfinished module as not done', () => {
		expect(isProgressDone({ module_id: '1', status: 'progress', progress: 60 })).toBe(false);
	});
});

// ─── Integration Tests (hook + mocked API) ─────────────────────────────────────────────────────────

// 2. Test useQuizLock
describe('2. useQuizLock', () => {
	it('2.1 stays not-ready and unlocked while logged out', () => {
		const { result } = renderHook(() => useQuizLock('hazards', testModules, null, false));
		expect(result.current.ready).toBe(false);
		expect(result.current.locked).toBe(false);
	});

	it('2.2 locks when only some modules are done', async () => {
		mockLiveModules(['1', '2']);
		mockProgress([
			{ module_id: '1', status: 'done', progress: 100 },
			{ module_id: '2', status: 'progress', progress: 50 },
		]);
		const { result } = renderHook(() => useQuizLock('hazards', testModules, fakeUser, false));

		await waitFor(() => expect(result.current.ready).toBe(true));
		expect(result.current.locked).toBe(true);
		expect(result.current.doneCount).toBe(1);
		expect(result.current.totalCount).toBe(2);
	});

	it('2.3 unlocks once every module is done', async () => {
		mockLiveModules(['1', '2']);
		mockProgress([
			{ module_id: '1', status: 'done', progress: 100 },
			{ module_id: '2', status: 'done', progress: 100 },
		]);
		const { result } = renderHook(() => useQuizLock('hazards', testModules, fakeUser, false));

		await waitFor(() => expect(result.current.ready).toBe(true));
		expect(result.current.locked).toBe(false);
	});

	it('2.4 counts modules added in Supabase, not just the defaults', async () => {
		mockLiveModules(['1', '2', '3']);
		mockProgress([
			{ module_id: '1', status: 'done', progress: 100 },
			{ module_id: '2', status: 'done', progress: 100 },
		]);
		const { result } = renderHook(() => useQuizLock('hazards', testModules, fakeUser, false));

		await waitFor(() => expect(result.current.ready).toBe(true));
		expect(result.current.totalCount).toBe(3);
		expect(result.current.locked).toBe(true);
	});

	it('2.5 falls back to the defaults when the live module list is empty', async () => {
		mockLiveModules([]);
		mockProgress([
			{ module_id: '1', status: 'done', progress: 100 },
			{ module_id: '2', status: 'done', progress: 100 },
		]);
		const { result } = renderHook(() => useQuizLock('hazards', testModules, fakeUser, false));

		await waitFor(() => expect(result.current.ready).toBe(true));
		expect(result.current.totalCount).toBe(2);
		expect(result.current.locked).toBe(false);
	});

	it('2.6 fails closed when progress cannot be loaded', async () => {
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		mockLiveModules(['1', '2']);
		server.use(
			http.get('/api/modules/progress', () =>
				HttpResponse.json({ ok: false, error: 'boom' }, { status: 500 })
			)
		);
		const { result } = renderHook(() => useQuizLock('hazards', testModules, fakeUser, false));

		await waitFor(() => expect(result.current.ready).toBe(true));
		expect(result.current.locked).toBe(true);
		consoleSpy.mockRestore();
	});
});
