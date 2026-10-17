import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, setDoc, type Firestore } from 'firebase/firestore';
import {
  addGroceryItem,
  clearCart,
  setGroceryDone,
  type GroceryWithId,
} from '../../src/data/grocery';
import type { GroceryItem } from '../../src/data/types';

// Adding and checking off grocery items from the Grocery tab or the Today mic,
// against the Firestore emulator, signed in as the tablet so the security rules
// apply. Run with `npm run test:rules`.
const HID = 'home';
const TABLET = 'kitchen@example.com';
const actor = { email: TABLET, device: 'tablet' as const };

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

const list = async (): Promise<GroceryWithId[]> =>
  (await getDocs(collection(db, 'households', HID, 'grocery'))).docs.map((d) => ({
    id: d.id,
    ...(d.data() as GroceryItem),
  }));

const log = async () =>
  (await getDocs(collection(db, 'households', HID, 'activity'))).docs.map((d) => d.data());

describe('addGroceryItem', () => {
  it('adds an item with its category and source, and logs it', async () => {
    const r = await addGroceryItem(db, HID, [], { actor, name: 'milk', source: 'voice' });
    expect(r.outcome).toBe('added');
    const items = await list();
    expect(items).toMatchObject([
      { name: 'Milk', category: 'Dairy & eggs', source: 'voice', done: false },
    ]);
    expect(items[0]).not.toHaveProperty('addedBy');
    expect(await log()).toMatchObject([
      { action: 'grocery.add', path: `grocery/${items[0].id}`, before: null },
    ]);
  });

  it('records who added it', async () => {
    await addGroceryItem(db, HID, [], { actor, name: 'Diapers', source: 'typed', addedBy: 'bob' });
    expect(await list()).toMatchObject([{ name: 'Diapers', addedBy: 'bob', category: 'Baby' }]);
  });

  it('undoes an add', async () => {
    const r = await addGroceryItem(db, HID, [], { actor, name: 'Milk', source: 'typed' });
    expect(await r.undo!()).toBe(true);
    expect(await list()).toEqual([]);
  });

  it('skips an item already on the list', async () => {
    await addGroceryItem(db, HID, [], { actor, name: 'Milk', source: 'typed' });
    const r = await addGroceryItem(db, HID, await list(), {
      actor,
      name: ' MILK ',
      source: 'voice',
    });
    expect(r).toMatchObject({ outcome: 'already', name: 'Milk', undo: null });
    expect(await list()).toHaveLength(1);
    expect(await log()).toHaveLength(1);
  });

  it('puts an item in the cart back on the list instead of adding it twice', async () => {
    await addGroceryItem(db, HID, [], { actor, name: 'Milk', source: 'typed' });
    const [milk] = await list();
    await setGroceryDone(db, HID, { actor, id: milk.id, done: true });

    const r = await addGroceryItem(db, HID, await list(), { actor, name: 'milk', source: 'voice' });
    expect(r.outcome).toBe('back');
    expect(await list()).toMatchObject([{ id: milk.id, done: false }]);

    await r.undo!();
    expect(await list()).toMatchObject([{ id: milk.id, done: true }]);
  });
});

describe('setGroceryDone', () => {
  it('moves an item into the cart and back, each undoable', async () => {
    await addGroceryItem(db, HID, [], { actor, name: 'Eggs', source: 'typed' });
    const [eggs] = await list();
    const ref = doc(db, 'households', HID, 'grocery', eggs.id);

    const undoDone = await setGroceryDone(db, HID, { actor, id: eggs.id, done: true });
    expect((await getDoc(ref)).data()).toMatchObject({ name: 'Eggs', done: true });

    await undoDone();
    expect((await getDoc(ref)).data()).toMatchObject({ name: 'Eggs', done: false });

    await setGroceryDone(db, HID, { actor, id: eggs.id, done: true });
    await setGroceryDone(db, HID, { actor, id: eggs.id, done: false });
    expect((await getDoc(ref)).data()).toMatchObject({ done: false });

    const actions = (await log()).map((e) => e.action).sort();
    expect(actions).toEqual(['grocery.add', 'grocery.done', 'grocery.done', 'grocery.undone']);
  });
});

describe('clearCart', () => {
  it('deletes only what is in the cart, logs each, and one undo puts them all back', async () => {
    for (const name of ['Milk', 'Eggs', 'Bread']) {
      await addGroceryItem(db, HID, [], { actor, name, source: 'typed' });
    }
    const [a, b] = (await list()).filter((g) => g.name !== 'Bread');
    await setGroceryDone(db, HID, { actor, id: a.id, done: true });
    await setGroceryDone(db, HID, { actor, id: b.id, done: true });

    const undoClear = await clearCart(db, HID, { actor, items: await list() });
    expect((await list()).map((g) => g.name)).toEqual(['Bread']);
    const clears = (await log()).filter((e) => e.action === 'grocery.clear');
    expect(clears).toHaveLength(2);
    expect(clears.every((e) => e.after === null && e.before?.done === true)).toBe(true);

    await undoClear!();
    const back = await list();
    expect(back.map((g) => g.name).sort()).toEqual(['Bread', 'Eggs', 'Milk']);
    expect(
      back
        .filter((g) => g.done)
        .map((g) => g.id)
        .sort(),
    ).toEqual([a.id, b.id].sort());
  });

  it('does nothing when the cart is empty', async () => {
    await addGroceryItem(db, HID, [], { actor, name: 'Milk', source: 'typed' });
    expect(await clearCart(db, HID, { actor, items: await list() })).toBeNull();
    expect(await list()).toHaveLength(1);
  });
});
