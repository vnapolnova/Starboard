import type { GroceryItem } from './types';

// The Today grocery strip (design/tablet-mockup.html #gPreview): the count of
// items still to buy and the first few names, oldest first.

export function openItems(items: GroceryItem[]) {
  return items.filter((g) => !g.done).sort((a, b) => a.addedAt.toMillis() - b.addedAt.toMillis());
}

/** "Bananas, Milk, Eggs and 4 more", or "Nothing on the list." */
export function groceryPreview(open: GroceryItem[], max = 5) {
  if (!open.length) return 'Nothing on the list.';
  const names = open.slice(0, max).map((g) => g.name);
  const rest = open.length - max;
  return names.join(', ') + (rest > 0 ? ` and ${rest} more` : '');
}
