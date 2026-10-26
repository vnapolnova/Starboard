import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import {
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  type Firestore,
} from 'firebase/firestore';
import { logWrite, newDocPath, undo, type Actor } from '../../src/data/activity';

// The activity-log helper against the Firestore emulator, signed in as the
// tablet so the security rules apply. Run with `npm run test:rules`.
const HID = 'home';
const TABLET = 'kitchen@example.com';
const PHONE = 'bob@example.com';
const actor: Actor = { email: TABLET, device: 'tablet' };

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
    await setDoc(doc(admin, 'households', HID), { name: 'Home', allowedEmails: [TABLET, PHONE] });
    await setDoc(doc(admin, `households/${HID}/grocery/milk`), {
      name: 'Milk',
      category: 'Dairy',
      done: false,
    });
  });
  db = env
    .authenticatedContext(TABLET, { email: TABLET, email_verified: true })
    .firestore() as unknown as Firestore;
});

async function read(path: string) {
  const snap = await getDoc(doc(db, 'households', HID, path));
  return snap.exists() ? snap.data() : null;
}

describe('logWrite', () => {
  it('writes the doc and logs before and after', async () => {
    const { logId } = await logWrite(db, HID, {
      actor,
      action: 'grocery.done',
      path: 'grocery/milk',
      op: 'merge',
      data: { done: true },
    });

    expect(await read('grocery/milk')).toEqual({ name: 'Milk', category: 'Dairy', done: true });
    const entry = await read(`activity/${logId}`);
    expect(entry).toMatchObject({
      actor,
      action: 'grocery.done',
      path: 'grocery/milk',
      before: { name: 'Milk', category: 'Dairy', done: false },
      after: { name: 'Milk', category: 'Dairy', done: true },
      undone: false,
    });
    expect(entry?.ts).toBeInstanceOf(Timestamp);
  });

  it('logs a create with before = null', async () => {
    const path = newDocPath(db, HID, 'grocery');
    const data = { name: 'Eggs', category: 'Dairy', done: false, addedAt: Timestamp.now() };
    const { logId } = await logWrite(db, HID, {
      actor,
      action: 'grocery.add',
      path,
      op: 'set',
      data,
    });

    expect(await read(path)).toEqual(data);
    expect(await read(`activity/${logId}`)).toMatchObject({ before: null, after: data });
  });

  it('rejects writes to the activity log and paths that are not collection/doc', async () => {
    await expect(
      logWrite(db, HID, { actor, action: 'x', path: 'activity/a1', op: 'delete' }),
    ).rejects.toThrow();
    await expect(
      logWrite(db, HID, { actor, action: 'x', path: 'grocery', op: 'delete' }),
    ).rejects.toThrow();
  });
});

describe('undo', () => {
  it('restores the previous state and marks the entry undone', async () => {
    const { logId } = await logWrite(db, HID, {
      actor,
      action: 'grocery.done',
      path: 'grocery/milk',
      op: 'merge',
      data: { done: true },
    });

    expect(await undo(db, HID, logId)).toBe(true);
    expect(await read('grocery/milk')).toEqual({ name: 'Milk', category: 'Dairy', done: false });
    expect(await read(`activity/${logId}`)).toMatchObject({ undone: true });
  });

  it('removes a created doc', async () => {
    const path = newDocPath(db, HID, 'grocery');
    const { logId } = await logWrite(db, HID, {
      actor,
      action: 'grocery.add',
      path,
      op: 'set',
      data: { name: 'Eggs', done: false },
    });
    await undo(db, HID, logId);
    expect(await read(path)).toBeNull();
  });

  it('brings back a deleted doc', async () => {
    const { logId } = await logWrite(db, HID, {
      actor,
      action: 'grocery.delete',
      path: 'grocery/milk',
      op: 'delete',
    });
    expect(await read('grocery/milk')).toBeNull();
    await undo(db, HID, logId);
    expect(await read('grocery/milk')).toEqual({ name: 'Milk', category: 'Dairy', done: false });
  });

  it('is a no-op the second time', async () => {
    const { logId } = await logWrite(db, HID, {
      actor,
      action: 'grocery.done',
      path: 'grocery/milk',
      op: 'merge',
      data: { done: true },
    });
    await undo(db, HID, logId);
    // Someone checks it off again; a second undo of the old entry mustn't revert that.
    await logWrite(db, HID, {
      actor,
      action: 'grocery.done',
      path: 'grocery/milk',
      op: 'merge',
      data: { done: true },
    });

    expect(await undo(db, HID, logId)).toBe(false);
    expect(await read('grocery/milk')).toMatchObject({ done: true });
  });

  it('returns false for an unknown entry', async () => {
    expect(await undo(db, HID, 'nope')).toBe(false);
  });
});

describe('Recent changes on a phone', () => {
  it('lists the log newest first and undoes a tablet change', async () => {
    await logWrite(db, HID, {
      actor,
      action: 'grocery.done',
      path: 'grocery/milk',
      op: 'merge',
      data: { done: true },
    });
    const { logId } = await logWrite(db, HID, {
      actor,
      action: 'grocery.clear',
      path: 'grocery/milk',
      op: 'delete',
    });

    const phone = env
      .authenticatedContext(PHONE, { email: PHONE, email_verified: true })
      .firestore() as unknown as Firestore;
    const recent = await getDocs(
      query(collection(phone, 'households', HID, 'activity'), orderBy('ts', 'desc'), limit(50)),
    );
    expect(recent.docs.map((d) => d.data().action)).toEqual(['grocery.clear', 'grocery.done']);
    expect(recent.docs[0].id).toBe(logId);

    expect(await undo(phone, HID, logId)).toBe(true);
    expect(await read('grocery/milk')).toEqual({ name: 'Milk', category: 'Dairy', done: true });
    expect((await read(`activity/${logId}`))?.undone).toBe(true);
  });
});
