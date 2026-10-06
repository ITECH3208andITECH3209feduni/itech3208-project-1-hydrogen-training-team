// hooks/lab/useHotspotProgress.test.ts
// Unit + integration tests for functions in useHotspotProgress.ts & related API calls
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { User } from 'firebase/auth';
import { useHotspotProgress } from './useHotspotProgress';
import { server } from '../../mocks/server';
import { http, HttpResponse } from 'msw';

const getIdToken = vi.fn();
const fakeUser = { getIdToken } as unknown as User;

beforeEach(() => {
	getIdToken.mockResolvedValue('fake-token');
});

// ─── Unit Tests (test purely internal behaviour) ────────────────────────────────────────────────────

// 1. Test recordHotspotProgress's identity and guard clause
describe('1. recordHotspotProgress (internal behaviour)', () => {
	it('1.1 keeps the same function while the user is unchanged', () => {
		const { result, rerender } = renderHook(() => useHotspotProgress({ user: fakeUser }));
		const first = result.current.recordHotspotProgress;
		rerender();
		expect(result.current.recordHotspotProgress).toBe(first);
	});

	// Note: sets up an API mock, but only to confirm the guard clause stops the request from ever being made.
	it('1.2 does nothing when there is no signed-in user', async () => {
		let called = false;
		server.use(
			http.post('/api/lab/progress', () => { called = true; return HttpResponse.json({ ok: true }); })
		);

		const { result } = renderHook(() => useHotspotProgress({ user: null }));
		await act(async () => { await result.current.recordHotspotProgress('gas'); });

		expect(called).toBe(false);
	});
});

// ─── Integration Tests (test API calls with mock server) ────────────────────────────────────────────

// 2. Test progress POST
describe('2. lab progress POST', () => {
	it('2.1 POSTs the clicked hotspot with the learner\'s token', async () => {
		let capturedBody: any = null;
		let capturedAuth: string | null = null;
		server.use(
			http.post('/api/lab/progress', async ({ request }) => {
				capturedBody = await request.json();
				capturedAuth = request.headers.get('Authorization');
				return HttpResponse.json({ ok: true });
			})
		);

		const { result } = renderHook(() => useHotspotProgress({ user: fakeUser }));
		await act(async () => { await result.current.recordHotspotProgress('gas'); });

		expect(capturedBody).toEqual({ hotspotId: 'gas' });
		expect(capturedAuth).toBe('Bearer fake-token');
	});

	it('2.2 logs the server\'s error, without throwing, on a failed response', async () => {
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		server.use(
			http.post('/api/lab/progress', () =>
				HttpResponse.json({ ok: false, error: 'Unknown hotspot' }, { status: 400 })
			)
		);

		const { result } = renderHook(() => useHotspotProgress({ user: fakeUser }));
		await act(async () => { await result.current.recordHotspotProgress('nope'); });

		expect(consoleSpy).toHaveBeenCalledWith('Failed to record hotspot progress:', 'Unknown hotspot');
		consoleSpy.mockRestore();
	});

	it('2.3 logs, without throwing, on a network failure', async () => {
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		server.use(http.post('/api/lab/progress', () => HttpResponse.error()));

		const { result } = renderHook(() => useHotspotProgress({ user: fakeUser }));
		await act(async () => { await result.current.recordHotspotProgress('gas'); });

		expect(consoleSpy).toHaveBeenCalledWith('Failed to record hotspot progress:', expect.anything());
		consoleSpy.mockRestore();
	});
});