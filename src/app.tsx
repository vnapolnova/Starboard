import { useEffect } from 'preact/hooks';
import { Toast } from './ui/Toast';
import { toastWithUndo } from './ui/toast-store';
import './app.css';

// Placeholder until the App shell issue lands.
export function App() {
  useEffect(() => {
    // Dev only: /?toast shows the Undo toast, for screenshots before any screen writes.
    if (import.meta.env.DEV && new URLSearchParams(location.search).has('toast')) {
      toastWithUndo('Added milk', () => Promise.resolve());
    }
  }, []);

  return (
    <>
      <main class="placeholder">
        <h1>Starboard</h1>
        <p>The family dashboard is on its way.</p>
      </main>
      <Toast />
    </>
  );
}
