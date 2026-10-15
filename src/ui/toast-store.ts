// Toast state for the tablet (spec §6). After each change the tablet shows what
// changed with an Undo button for 10 seconds; a newer change replaces it.
// Plain messages (no Undo) stay up as long as in the mockup.

export const UNDO_MS = 10_000;
export const MESSAGE_MS = 2_200;

export interface ToastState {
  id: number;
  message: string;
  /** Present while the change can still be undone from the toast. */
  onUndo?: () => Promise<unknown>;
}

type Listener = (t: ToastState | null) => void;

let current: ToastState | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
let nextId = 1;
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l(current);
}

function show(message: string, ms: number, onUndo?: ToastState['onUndo']) {
  clearTimeout(timer);
  const id = nextId++;
  current = { id, message, onUndo };
  emit();
  timer = setTimeout(() => {
    if (current?.id === id) hideToast();
  }, ms);
}

/** A short message with no action, e.g. "Listening…". */
export function toast(message: string) {
  show(message, MESSAGE_MS);
}

/** Message plus an Undo button for 10 seconds. `undo` reverts the change. */
export function toastWithUndo(message: string, undo: () => Promise<unknown>) {
  show(message, UNDO_MS, undo);
}

/** Runs the toast's Undo once, then confirms with "Undone". */
export async function undoFromToast() {
  const t = current;
  if (!t?.onUndo) return;
  current = { ...t, onUndo: undefined }; // no second tap while it runs
  emit();
  try {
    await t.onUndo();
    toast('Undone');
  } catch {
    toast("Couldn't undo that. Try again from a phone.");
  }
}

export function hideToast() {
  clearTimeout(timer);
  current = null;
  emit();
}

export function subscribeToast(l: Listener) {
  listeners.add(l);
  l(current);
  return () => {
    listeners.delete(l);
  };
}
