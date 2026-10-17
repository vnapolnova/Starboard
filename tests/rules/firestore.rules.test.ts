import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

// Run with `npm run test:rules`, which starts the Firestore emulator.
const HID = 'home';
const PARENT = 'parent@example.com';
const TABLET = 'kitchen@example.com';
const STRANGER = 'stranger@example.com';

let env: RulesTestEnvironment;

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
    const db = ctx.firestore();
    await setDoc(doc(db, 'households', HID), { name: 'Home', allowedEmails: [PARENT, TABLET] });
    await setDoc(doc(db, 'households', 'other'), { name: 'Other', allowedEmails: [STRANGER] });
    await setDoc(doc(db, `households/${HID}/events/e1`), { title: 'Swim' });
    await setDoc(doc(db, `households/${HID}/chores/c1`), { name: 'Feed the fish' });
    await setDoc(doc(db, `households/${HID}/activity/a1`), { action: 'chore.done', undone: false });
  });
});

function as(email: string | null, opts: { verified?: boolean } = {}) {
  if (!email) return env.unauthenticatedContext().firestore();
  return env
    .authenticatedContext(email, { email, email_verified: opts.verified ?? true })
    .firestore();
}

describe('household doc', () => {
  it('lets an allow-listed account read it', async () => {
    await assertSucceeds(getDoc(doc(as(PARENT), 'households', HID)));
  });

  it('matches the allow-list case-insensitively', async () => {
    await assertSucceeds(getDoc(doc(as('Parent@Example.com'), 'households', HID)));
  });

  it('lets the client find its household by email', async () => {
    const db = as(TABLET);
    await assertSucceeds(
      getDocs(
        query(
          collection(db, 'households'),
          where('allowedEmails', 'array-contains', TABLET),
          limit(1),
        ),
      ),
    );
  });

  it('refuses a query that could return other households', async () => {
    await assertFails(getDocs(collection(as(PARENT), 'households')));
  });

  it('refuses strangers, signed-out users and unverified emails', async () => {
    await assertFails(getDoc(doc(as(STRANGER), 'households', HID)));
    await assertFails(getDoc(doc(as(null), 'households', HID)));
    await assertFails(getDoc(doc(as(PARENT, { verified: false }), 'households', HID)));
  });

  it('never lets a client change the allow-list', async () => {
    const db = as(PARENT);
    await assertFails(updateDoc(doc(db, 'households', HID), { allowedEmails: [PARENT, STRANGER] }));
    await assertFails(
      setDoc(doc(as(STRANGER), 'households', 'new'), { allowedEmails: [STRANGER] }),
    );
  });
});

describe('household data', () => {
  it('lets members read and write app collections', async () => {
    const db = as(TABLET);
    await assertSucceeds(getDoc(doc(db, `households/${HID}/chores/c1`)));
    await assertSucceeds(setDoc(doc(db, `households/${HID}/grocery/g1`), { name: 'Milk' }));
    await assertSucceeds(deleteDoc(doc(db, `households/${HID}/grocery/g1`)));
  });

  it("keeps other households' members out", async () => {
    const db = as(STRANGER);
    await assertFails(getDoc(doc(db, `households/${HID}/chores/c1`)));
    await assertFails(setDoc(doc(db, `households/${HID}/grocery/g1`), { name: 'Milk' }));
  });

  it('denies collections that are not in the data model', async () => {
    await assertFails(setDoc(doc(as(PARENT), `households/${HID}/secrets/s1`), { x: 1 }));
    await assertFails(setDoc(doc(as(PARENT), 'other/x'), { x: 1 }));
  });

  it('makes calendar events read-only for clients', async () => {
    const db = as(PARENT);
    await assertSucceeds(getDoc(doc(db, `households/${HID}/events/e1`)));
    await assertFails(updateDoc(doc(db, `households/${HID}/events/e1`), { title: 'Gym' }));
  });

  it('lets corrections go in eventOverrides', async () => {
    const db = as(PARENT);
    await assertSucceeds(
      setDoc(doc(db, `households/${HID}/eventOverrides/e1`), { ownerIds: ['m1'] }),
    );
  });

  it('keeps the activity log: add and mark undone, never delete', async () => {
    const db = as(TABLET);
    await assertSucceeds(
      setDoc(doc(db, `households/${HID}/activity/a2`), { action: 'grocery.add' }),
    );
    await assertSucceeds(updateDoc(doc(db, `households/${HID}/activity/a1`), { undone: true }));
    await assertFails(deleteDoc(doc(db, `households/${HID}/activity/a1`)));
  });
});

describe("Cleo's day docs", () => {
  it('let the household read the template and a missing day override', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `households/${HID}/routines/weekday`), { steps: [] });
    });
    const db = as(TABLET);
    await assertSucceeds(getDoc(doc(db, `households/${HID}/routines/weekday`)));
    await assertSucceeds(getDoc(doc(db, `households/${HID}/routineOverrides/2026-10-17`)));
  });

  it("don't let other accounts read them", async () => {
    await assertFails(getDoc(doc(as(STRANGER), `households/${HID}/routines/weekday`)));
    await assertFails(getDoc(doc(as(STRANGER), `households/${HID}/routineOverrides/2026-10-17`)));
  });
});
