import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'preact/hooks';
import { auth } from '../lib/firebase';
import { col, findHousehold } from './db';
import type { MemberWithId } from '../shell/people';

// Who is signed in, and which household they belong to (spec §1: only
// allow-listed Google accounts). Members are loaded live from Firestore.

export type Session =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'notAllowed'; user: User }
  | { status: 'error'; user: User; code: string }
  | { status: 'ready'; user: User; hid: string };

export function useSession(): Session {
  const [session, setSession] = useState<Session>({ status: 'loading' });
  useEffect(
    () =>
      onAuthStateChanged(auth, async (user) => {
        if (!user?.email) return setSession({ status: 'signedOut' });
        setSession({ status: 'loading' });
        try {
          const home = await findHousehold(user.email);
          setSession(
            home ? { status: 'ready', user, hid: home.id } : { status: 'notAllowed', user },
          );
        } catch (e) {
          // Accounts not on a list just find nothing, so this is a real failure:
          // offline, or the project's rules or data aren't set up.
          const code = (e as { code?: string }).code ?? 'unknown';
          console.error('Household lookup failed', e);
          setSession({ status: 'error', user, code });
        }
      }),
    [],
  );
  return session;
}

export function useMembers(hid: string) {
  const [members, setMembers] = useState<MemberWithId[] | null>(null);
  useEffect(
    () =>
      onSnapshot(col(hid, 'members'), (snap) =>
        setMembers(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      ),
    [hid],
  );
  return members;
}

export function signIn() {
  return signInWithPopup(auth, new GoogleAuthProvider());
}

export function signOutHere() {
  return signOut(auth);
}

/**
 * Emulator only: `/?as=bob@example.com` signs in as that Google account with
 * no popup, for local testing and headless screenshots. The Auth emulator
 * accepts an unsigned JSON token; the real Auth service never would.
 */
export async function devSignInFromUrl() {
  if (import.meta.env.VITE_USE_EMULATORS !== 'true') return;
  const email = new URLSearchParams(location.search).get('as');
  if (!email || auth.currentUser?.email === email) return;
  const token = JSON.stringify({ sub: email, email, email_verified: true });
  await signInWithCredential(auth, GoogleAuthProvider.credential(token));
}
