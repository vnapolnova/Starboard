import type { User } from 'firebase/auth';
import {
  addGroceryItem,
  clearCart,
  sameName,
  setGroceryDone,
  type GroceryWithId,
} from '../data/grocery';
import type { GrocerySource } from '../data/types';
import { db } from '../lib/firebase';
import { memberForEmail, type MemberWithId } from '../shell/people';
import { toast, toastWithUndo } from '../ui/toast-store';

// What adding, checking off and clearing do, for the Grocery tab and the Today
// strip, all through the activity log (spec §4 Grocery, §6). Adding and
// clearing show the 10-second Undo toast. A check-off shows a short message
// with no Undo, like a chore: the item stays on screen, so tapping it again is
// the undo, and the phone's Recent changes can still undo it.

export interface GroceryContext {
  hid: string;
  user: User;
  members: MemberWithId[];
  phone: boolean;
  /** The list as it stands, to skip items already on it. */
  items: GroceryWithId[];
}

/** "Milk", "Eggs and Bread", "Eggs, Bread and Butter". */
function joinNames(names: string[]) {
  if (names.length < 2) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

const actor = (ctx: GroceryContext) => ({
  email: ctx.user.email ?? '',
  device: ctx.phone ? ('phone' as const) : ('tablet' as const),
});

/** Adds each name, then one toast whose Undo takes them all back off. */
export async function addItems(ctx: GroceryContext, names: string[], source: GrocerySource) {
  const unique = names.filter((n, i) => n.trim() && names.findIndex((m) => sameName(m, n)) === i);
  if (!unique.length) return;
  const addedBy = memberForEmail(ctx.members, ctx.user.email)?.id;

  const added: string[] = [];
  const already: string[] = [];
  const undos: (() => Promise<boolean>)[] = [];
  try {
    for (const name of unique) {
      const r = await addGroceryItem(db, ctx.hid, ctx.items, {
        actor: actor(ctx),
        name,
        source,
        addedBy,
      });
      if (r.undo) undos.push(r.undo);
      (r.outcome === 'already' ? already : added).push(r.name);
    }
  } catch (e) {
    console.error('Grocery add failed', e);
    if (!undos.length) return toast("Couldn't save that. Try again.");
  }

  if (!added.length) {
    return toast(`${joinNames(already)} ${already.length > 1 ? 'are' : 'is'} already on the list`);
  }
  toastWithUndo(`Added ${joinNames(added)}`, async () => {
    for (const u of [...undos].reverse()) await u();
  });
}

/** Into the cart, or back onto the list. */
export async function toggleItem(ctx: GroceryContext, item: GroceryWithId) {
  try {
    await setGroceryDone(db, ctx.hid, { actor: actor(ctx), id: item.id, done: !item.done });
    toast(item.done ? `${item.name} is back on the list` : `${item.name} is in the cart`);
  } catch (e) {
    console.error('Grocery check-off failed', e);
    toast("Couldn't save that. Try again.");
  }
}

/** Deletes everything in the cart; one Undo puts it all back. */
export async function clearItems(ctx: GroceryContext) {
  const count = ctx.items.filter((g) => g.done).length;
  try {
    const undo = await clearCart(db, ctx.hid, { actor: actor(ctx), items: ctx.items });
    if (undo) toastWithUndo(`Cleared ${count} item${count === 1 ? '' : 's'} from the cart`, undo);
  } catch (e) {
    console.error('Clearing the cart failed', e);
    toast("Couldn't clear the cart. Try again.");
  }
}
