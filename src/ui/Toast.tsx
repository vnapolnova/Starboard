import { useEffect, useState } from 'preact/hooks';
import { subscribeToast, undoFromToast, type ToastState } from './toast-store';
import './toast.css';

/** The tablet's toast, as #toast in design/tablet-mockup.html, plus an Undo button. */
export function Toast() {
  const [state, setState] = useState<ToastState | null>(null);
  useEffect(() => subscribeToast(setState), []);

  return (
    <div class={state ? 'toast on' : 'toast'} role="status" aria-live="polite">
      {state && (
        <>
          <span>{state.message}</span>
          {state.onUndo && (
            <button type="button" class="toast-undo" onClick={() => void undoFromToast()}>
              Undo
            </button>
          )}
        </>
      )}
    </div>
  );
}
