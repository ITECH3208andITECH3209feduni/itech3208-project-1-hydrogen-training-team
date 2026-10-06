// hooks/unsavedChanges/useLeaveWarning.test.ts
// Unit tests for useLeaveWarning.ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useLeaveWarning } from './useLeaveWarning';

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

function addLink(href: string, attrs: Record<string, string> = {}) {
  const a = document.createElement('a');
  a.href = href;
  Object.entries(attrs).forEach(([k, v]) => a.setAttribute(k, v));
  document.body.appendChild(a);
  return a;
}

// Bubble-phase listener on document.
// If the hook stops a click in the capture phase, this is never reached, so it tells us whether the click was allowed through.
function trackClicksReaching() {
  const reached = vi.fn();
  document.addEventListener('click', (e) => { reached(); e.preventDefault(); });
  return reached;
}

function click(el: Element, init: MouseEventInit = {}) {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...init }));
}

describe('1. beforeunload', () => {
  it('1.1 is prevented while there are unsaved changes', () => {
    renderHook(() => useLeaveWarning(true));
    const e = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(e);
    expect(e.defaultPrevented).toBe(true);
  });

  it('1.2 is left alone when there are no unsaved changes', () => {
    renderHook(() => useLeaveWarning(false));
    const e = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(e);
    expect(e.defaultPrevented).toBe(false);
  });
});

describe('2. in-app link clicks', () => {
  it('2.1 prompts, and blocks the click if the user declines', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderHook(() => useLeaveWarning(true));
    const reached = trackClicksReaching();

    click(addLink('/dashboard'));
    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(reached).not.toHaveBeenCalled();
  });

  it('2.2 prompts, and lets the click through if the user confirms', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderHook(() => useLeaveWarning(true));
    const reached = trackClicksReaching();

    click(addLink('/dashboard'));
    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(reached).toHaveBeenCalledTimes(1);
  });

  it('2.3 does not prompt when there are no unsaved changes', () => {
    const confirmSpy = vi.spyOn(window, 'confirm');
    renderHook(() => useLeaveWarning(false));
    const reached = trackClicksReaching();

    click(addLink('/dashboard'));
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(reached).toHaveBeenCalledTimes(1);
  });

  it('2.4 ignores clicks that do not navigate this tab away', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderHook(() => useLeaveWarning(true));
    trackClicksReaching();

    click(addLink(window.location.pathname));             // same page
    click(addLink('https://example.com/elsewhere'));      // external
    click(addLink('/dashboard'), { ctrlKey: true });      // modified click
    click(addLink('/dashboard', { target: '_blank' }));   // new tab
    click(addLink('/file.pdf', { download: '' }));        // download
    click(document.body);                                 // not a link at all
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it('2.5 stops guarding once the changes are saved', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { rerender } = renderHook(({ dirty }) => useLeaveWarning(dirty), { initialProps: { dirty: true } });
    trackClicksReaching();

    rerender({ dirty: false });
    click(addLink('/dashboard'));
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it('2.6 removes its listeners on unmount', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { unmount } = renderHook(() => useLeaveWarning(true));
    trackClicksReaching();
    unmount();

    click(addLink('/dashboard'));
    const e = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(e);
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(e.defaultPrevented).toBe(false);
  });
});