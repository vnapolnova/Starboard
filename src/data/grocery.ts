import { Timestamp, type Firestore } from 'firebase/firestore';
import { logWrite, newDocPath, undo, type Actor } from './activity';
import type { GroceryItem, GrocerySource } from './types';

// The grocery list (spec §4 Grocery, design/tablet-mockup.html #v-grocery and
// the Today strip #gPreview): voice phrases, categories, grouping, and the
// writes, each through the activity log so Undo works.

export type GroceryWithId = GroceryItem & { id: string };

const byAdded = (a: GroceryItem, b: GroceryItem) => a.addedAt.toMillis() - b.addedAt.toMillis();

export function openItems<T extends GroceryItem>(items: T[]) {
  return items.filter((g) => !g.done).sort(byAdded);
}

/** "Bananas, Milk, Eggs and 4 more", or "Nothing on the list." */
export function groceryPreview(open: GroceryItem[], max = 5) {
  if (!open.length) return 'Nothing on the list.';
  const names = open.slice(0, max).map((g) => g.name);
  const rest = open.length - max;
  return names.join(', ') + (rest > 0 ? ` and ${rest} more` : '');
}

// ---- Voice phrases -------------------------------------------------------

/** Pairs joined by "and" that are one item, not two. */
const AND_ITEMS = ['mac and cheese', 'macaroni and cheese', 'half and half', 'salt and vinegar'];

const LEAD =
  /^(?:(?:ok(?:ay)?|hey|um+|uh+|so|and|also|please|can you|could you|would you|(?:i|we) need(?: to)?|let's)\b[\s,]*)+/;
const VERB = /^(?:add|put|get|buy|need)\b\s*/;
const LIST =
  /\s*\b(?:to|on(?:to)?|in)\s+(?:the\s+|my\s+|our\s+)?(?:grocery|groceries|shopping)(?:\s+list)?$|\s*\b(?:to|on)\s+(?:the\s+)?list$/;
const TRAIL = /(?:[\s,]*\b(?:please|thanks|thank you|too|as well)\b)+$/;
const ARTICLE = /^(?:(?:some|a|an|the|more|another|a few|a couple of|a bit of)\s+)+/;

/**
 * The item names in something said to the mic, such as "add milk",
 * "add eggs and bread" or "put some bananas on the shopping list, please".
 * A bare "milk" counts too, since the mic is only for adding. Names are
 * capitalized; nothing recognisable gives [].
 */
export function parseVoice(transcript: string): string[] {
  let s = transcript
    .toLowerCase()
    .replace(/[.!?]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  s = s.replace(LEAD, '').replace(VERB, '').replace(TRAIL, '').replace(LIST, '').replace(TRAIL, '');

  // Hide the "and" in known pairs while splitting.
  for (const pair of AND_ITEMS) s = s.replaceAll(pair, pair.replaceAll(' and ', '\u0000'));
  return s
    .split(/\s*,\s*(?:and\s+)?|\s+(?:and|plus|also)\s+/)
    .map((part) => part.replaceAll('\u0000', ' and ').replace(ARTICLE, '').trim())
    .filter((part) => /[a-z0-9]/.test(part))
    .map(capitalize);
}

export function capitalize(name: string) {
  const n = name.trim().replace(/\s+/g, ' ');
  return n.charAt(0).toUpperCase() + n.slice(1);
}

// ---- Categories ----------------------------------------------------------

/** Aisle order, so the list reads in the order of a walk round the store. */
export const CATEGORIES = [
  'Produce',
  'Bakery',
  'Dairy & eggs',
  'Meat & fish',
  'Pantry',
  'Frozen',
  'Snacks',
  'Drinks',
  'Baby',
  'Household',
  'Other',
] as const;

export const OTHER = 'Other';

// prettier-ignore
const KEYWORDS: Record<Exclude<(typeof CATEGORIES)[number], 'Other'>, string[]> = {
  Produce: [
    'apple', 'avocado', 'banana', 'basil', 'bell pepper', 'berry', 'berries', 'blueberry',
    'broccoli', 'cabbage', 'carrot', 'cauliflower', 'celery', 'cilantro', 'clementine',
    'corn', 'cucumber', 'garlic', 'ginger', 'grape', 'green bean', 'herb', 'kale', 'kiwi',
    'lemon', 'lettuce', 'lime', 'mango', 'melon', 'mushroom', 'onion', 'orange', 'parsley',
    'peach', 'pear', 'pepper', 'pineapple', 'plum', 'potato', 'raspberry', 'salad', 'scallion',
    'spinach', 'squash', 'strawberry', 'strawberries', 'sweet potato', 'tomato', 'watermelon',
    'zucchini', 'fruit', 'veggie', 'vegetable',
  ],
  Bakery: ['bagel', 'bread', 'bun', 'croissant', 'muffin', 'pita', 'roll', 'sourdough'],
  'Dairy & eggs': [
    'butter', 'cheddar', 'cheese', 'cottage cheese', 'cream', 'cream cheese', 'egg',
    'half and half', 'milk', 'mozzarella', 'parmesan', 'sour cream', 'yogurt', 'yoghurt',
  ],
  'Meat & fish': [
    'bacon', 'beef', 'chicken', 'cod', 'fish', 'ground beef', 'ham', 'hot dog', 'lamb',
    'meatball', 'pork', 'salmon', 'sausage', 'shrimp', 'steak', 'tuna', 'turkey',
  ],
  Pantry: [
    'beans', 'cereal', 'chickpea', 'coffee', 'coffee bean', 'cracker', 'flour', 'honey',
    'jam', 'jelly', 'ketchup', 'lentil', 'mac and cheese', 'maple syrup', 'mayo', 'mustard',
    'noodle', 'oat', 'oatmeal', 'oil', 'olive oil', 'pasta', 'peanut butter', 'rice', 'salsa',
    'salt', 'sauce', 'soup', 'spice', 'sugar', 'syrup', 'tea', 'vinegar', 'canned',
    'black pepper', 'tortilla',
  ],
  Frozen: ['frozen', 'ice cream', 'popsicle', 'ice pop', 'waffle'],
  Snacks: ['chip', 'chocolate', 'cookie', 'goldfish', 'granola bar', 'popcorn', 'pretzel', 'snack'],
  Drinks: ['beer', 'juice', 'kombucha', 'lemonade', 'oat milk', 'seltzer', 'soda', 'sparkling water', 'water', 'wine'],
  Baby: ['baby food', 'diaper', 'formula', 'pouch', 'pull-up', 'pull up', 'sippy', 'wipe'],
  Household: [
    'aluminum foil', 'battery', 'batteries', 'bin bag', 'bleach', 'dish soap', 'detergent',
    'dishwasher', 'foil', 'hand soap', 'laundry', 'light bulb', 'napkin', 'paper towel',
    'plastic wrap', 'shampoo', 'soap', 'sponge', 'tissue', 'toilet paper', 'toothpaste',
    'trash bag', 'zip bag', 'ziploc',
  ],
};

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Longest keyword first, so "peanut butter" beats "butter" and "oat milk" beats "milk".
const MATCHERS = Object.entries(KEYWORDS)
  .flatMap(([category, words]) =>
    words.map((w) => ({
      category,
      length: w.length,
      re: new RegExp(`\\b${escape(w).replace(/y$/, '(?:y|ies)')}(?:e?s)?\\b`),
    })),
  )
  .sort((a, b) => b.length - a.length);

/** A best guess at the aisle from the name, or "Other". */
export function categoryFor(name: string): string {
  const n = name.toLowerCase();
  return MATCHERS.find((m) => m.re.test(n))?.category ?? OTHER;
}

// ---- Grouping ------------------------------------------------------------

export interface GrocerySection<T> {
  title: string;
  items: T[];
}

/**
 * The list as the tab shows it: open items by category in aisle order (any
 * category not known here goes after them, by name), oldest first in each,
 * then everything checked under "In the cart".
 */
export function grocerySections<T extends GroceryItem>(items: T[]): GrocerySection<T>[] {
  const rank = (c: string) => {
    const i = (CATEGORIES as readonly string[]).indexOf(c);
    return i === -1 ? CATEGORIES.length - 1 : i; // unknown ones sort just before Other
  };
  const open = openItems(items);
  const titles = [...new Set(open.map((g) => g.category || OTHER))].sort(
    (a, b) => rank(a) - rank(b) || Number(a === OTHER) - Number(b === OTHER) || a.localeCompare(b),
  );
  const sections = titles.map((title) => ({
    title,
    items: open.filter((g) => (g.category || OTHER) === title),
  }));
  const cart = items.filter((g) => g.done).sort(byAdded);
  if (cart.length) sections.push({ title: 'In the cart', items: cart });
  return sections;
}

/** The source tag beside an open item, in the mockup's words, or null. */
export function sourceLabel(item: GroceryItem, memberName?: string) {
  if (item.source === 'voice') return 'Added by voice';
  if (item.source === 'recipe') return 'From recipe';
  return memberName ? `Added by ${memberName}` : null;
}

// ---- Writes --------------------------------------------------------------

/** Same item, ignoring case and spacing. */
export const sameName = (a: string, b: string) =>
  a.trim().toLowerCase().replace(/\s+/g, ' ') === b.trim().toLowerCase().replace(/\s+/g, ' ');

export type AddOutcome = 'added' | 'back' | 'already';

/**
 * Adds an item. One already on the list is left alone ('already'); one in the
 * cart goes back on the list ('back') rather than being added twice. Returns
 * the undo for whatever was written, or null when nothing was.
 */
export async function addGroceryItem(
  db: Firestore,
  hid: string,
  current: GroceryWithId[],
  opts: { actor: Actor; name: string; source: GrocerySource; addedBy?: string },
): Promise<{ outcome: AddOutcome; name: string; undo: (() => Promise<boolean>) | null }> {
  const name = capitalize(opts.name);
  const match = current.filter((g) => sameName(g.name, name));
  const open = match.find((g) => !g.done);
  if (open) return { outcome: 'already', name: open.name, undo: null };

  const inCart = match[0];
  if (inCart) {
    const { logId } = await logWrite(db, hid, {
      op: 'merge',
      action: 'grocery.undone',
      path: `grocery/${inCart.id}`,
      actor: opts.actor,
      data: { done: false },
    });
    return { outcome: 'back', name: inCart.name, undo: () => undo(db, hid, logId) };
  }

  const data: GroceryItem = {
    name,
    category: categoryFor(name),
    source: opts.source,
    done: false,
    addedAt: Timestamp.now(),
    ...(opts.addedBy ? { addedBy: opts.addedBy } : {}),
  };
  const { logId } = await logWrite(db, hid, {
    op: 'set',
    action: 'grocery.add',
    path: newDocPath(db, hid, 'grocery'),
    actor: opts.actor,
    data,
  });
  return { outcome: 'added', name, undo: () => undo(db, hid, logId) };
}

/** Moves an item into the cart, or back onto the list. Returns its undo. */
export async function setGroceryDone(
  db: Firestore,
  hid: string,
  opts: { actor: Actor; id: string; done: boolean },
) {
  const { logId } = await logWrite(db, hid, {
    op: 'merge',
    action: opts.done ? 'grocery.done' : 'grocery.undone',
    path: `grocery/${opts.id}`,
    actor: opts.actor,
    data: { done: opts.done },
  });
  return () => undo(db, hid, logId);
}
