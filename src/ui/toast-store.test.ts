import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MESSAGE_MS,
  UNDO_MS,
  hideToast,
  subscribeToast,
  toast,
  toastWithUndo,
  undoFromToast,
  type ToastState,
} from './toast-store';

let seen: ToastState | null;
let unsubscribe: () => void;

beforeEach(() => {
  vi.useFakeTimers();
  unsubscribe = subscribeToast((t) => (seen = t));
});

afterEach(() => {
  hideToast();
  unsubscribe();
  vi.useRealTimers();
});

describe('toast', () => {
  it('shows an Undo toast for 10 seconds', () => {
    toastWithUndo('Added milk', async () => {});
    expect(seen?.message).toBe('Added milk');
    expect(seen?.onUndo).toBeTypeOf('function');

    vi.advanceTimersByTime(UNDO_MS - 1);
    expect(seen).not.toBeNull();
    vi.advanceTimersByTime(1);
    expect(seen).toBeNull();
  });

  it('shows a plain message for the mockup duration, with no Undo', () => {
    toast('Listening…');
    expect(seen?.onUndo).toBeUndefined();
    vi.advanceTimersByTime(MESSAGE_MS);
    expect(seen).toBeNull();
  });

  it('replaces the previous toast and restarts the timer', () => {
    toastWithUndo('Added milk', async () => {});
    vi.advanceTimersByTime(8_000);
    toastWithUndo('Added eggs', async () => {});
    vi.advanceTimersByTime(8_000);
    expect(seen?.message).toBe('Added eggs');
    vi.advanceTimersByTime(2_000);
    expect(seen).toBeNull();
  });

  it('runs Undo once and confirms with "Undone"', async () => {
    const undo = vi.fn(async () => {});
    toastWithUndo('Added milk', undo);
    const first = undoFromToast();
    const second = undoFromToast();
    await Promise.all([first, second]);
    expect(undo).toHaveBeenCalledTimes(1);
    expect(seen?.message).toBe('Undone');
    expect(seen?.onUndo).toBeUndefined();
  });

  it('says so when Undo fails', async () => {
    toastWithUndo('Added milk', () => Promise.reject(new Error('offline')));
    await undoFromToast();
    expect(seen?.message).toMatch(/Couldn't undo/);
  });
});
