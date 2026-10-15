import { useEffect } from 'preact/hooks';
import { devSignInFromUrl, useSession } from './data/session';
import { Shell } from './shell/Shell';
import { SignIn } from './shell/SignIn';
import { Toast } from './ui/Toast';
import { toastWithUndo } from './ui/toast-store';
import './app.css';

export function App() {
  const session = useSession();

  useEffect(() => {
    void devSignInFromUrl();
    // Dev only: /?toast shows the Undo toast, for screenshots before any screen writes.
    if (import.meta.env.DEV && new URLSearchParams(location.search).has('toast')) {
      toastWithUndo('Added milk', () => Promise.resolve());
    }
  }, []);

  return (
    <>
      {session.status === 'ready' ? (
        <Shell hid={session.hid} user={session.user} />
      ) : session.status === 'loading' ? null : (
        <SignIn
          user={session.status === 'signedOut' ? undefined : session.user}
          error={session.status === 'error'}
        />
      )}
      <Toast />
    </>
  );
}
