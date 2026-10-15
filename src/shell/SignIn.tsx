import type { User } from 'firebase/auth';
import { signIn, signOutHere } from '../data/session';

/** Shown before sign-in, and to Google accounts that aren't on the household list. */
export function SignIn({ user, error }: { user?: User; error?: boolean }) {
  return (
    <main class="gate">
      <h1>Starboard</h1>
      {!user && (
        <>
          <p>Sign in with a household Google account.</p>
          <button type="button" class="btn" onClick={() => void signIn().catch(() => {})}>
            Sign in with Google
          </button>
        </>
      )}
      {user && (
        <>
          <p>
            {error
              ? "Couldn't load your household. Check the connection and try again."
              : `${user.email} isn't on this household's list. Ask a parent to add it.`}
          </p>
          <button type="button" class="btn ghost" onClick={() => void signOutHere()}>
            Use another account
          </button>
        </>
      )}
    </main>
  );
}
