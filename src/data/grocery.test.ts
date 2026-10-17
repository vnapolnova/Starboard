import { describe, expect, it } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import { groceryPreview, openItems } from './grocery';
import type { GroceryItem } from './types';

const item = (name: string, at: number, done = false): GroceryItem => ({
  name,
  category: 'Produce',
  source: 'typed',
  done,
  addedAt: Timestamp.fromMillis(at),
});

describe('openItems', () => {
  it('drops items in the cart and sorts the rest oldest first', () => {
    const list = openItems([item('Milk', 3), item('Eggs', 1, true), item('Bananas', 2)]);
    expect(list.map((g) => g.name)).toEqual(['Bananas', 'Milk']);
  });
});

describe('groceryPreview', () => {
  it('lists up to five names, then the rest as a count', () => {
    const names = ['Bananas', 'Bell peppers', 'Limes', 'Milk', 'Yogurt tubes', 'Eggs', 'Tortillas'];
    expect(groceryPreview(names.map((n, i) => item(n, i)))).toBe(
      'Bananas, Bell peppers, Limes, Milk, Yogurt tubes and 2 more',
    );
  });

  it('lists everything when it fits', () => {
    expect(groceryPreview([item('Milk', 1), item('Eggs', 2)])).toBe('Milk, Eggs');
  });

  it('says when the list is empty, in the mockup’s words', () => {
    expect(groceryPreview([])).toBe('Nothing on the list.');
  });
});
