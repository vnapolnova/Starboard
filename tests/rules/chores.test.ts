import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, setDoc, type Firestore } from 'firebase/firestore';
import { setChoreDone } from '../../src/data/chores';

// Checking a chore off from Today, against the Firestore emulator, signed in
// as the tablet so the security rules apply. Run with `npm run test:rules`.
const HID = 'home';
const TABLET = 'kitchen@example.com';
const base = {
  actor: { email: TABLET, device: 'tablet' as const },
  doneBy: 'tablet',
  choreId: 'toys',
  date: '2026-10-14',
};

let env: RulesTestEnvironment;
let db: Firestore;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-starboard',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});

afterAll(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const admin = ctx.firestore() as unknown as Firestore;
    await setDoc(doc(admin, 'households', HID), { name: 'Home', allowedEmails: [TABLET] });
  });
  db = env
    .authenticatedContext(TABLET, { email: TABLET, email_verified: true })
    .firestore() as unknown as Firestore;
});

const completion = async () =>
  (await getDoc(doc(db, 'households', HID, 'choreCompletions', '2026-10-14_toys'))).data() ?? null;

describe('setChoreDone', () => {
  it('checks a chore off for the day and logs it', async () => {
    await setChoreDone(db, HID, { ...base, done: true });
    expect(await completion()).toMatchObject({
      date: '2026-10-14',
      choreId: 'toys',
      doneBy: 'tablet',
    });

    const log = await getDocs(collection(db, 'households', HID, 'activity'));
    expect(log.docs.map((d) => d.data())).toMatchObject([
      { action: 'chore.done', path: 'choreCompletions/2026-10-14_toys', before: null },
    ]);
  });

  it('undoes a check-off', async () => {
    const undo = await setChoreDone(db, HID, { ...base, done: true });
    expect(await undo()).toBe(true);
    expect(await completion()).toBeNull();
  });

  it('un-checks, and undoing that puts the check-off back', async () => {
    await setChoreDone(db, HID, { ...base, done: true });
    const undo = await setChoreDone(db, HID, { ...base, done: false });
    expect(await completion()).toBeNull();
    await undo();
    expect(await completion()).toMatchObject({ choreId: 'toys' });
  });
});
