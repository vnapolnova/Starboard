import { describe, expect, it } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import {
  categoryFor,
  groceryPreview,
  grocerySections,
  openItems,
  parseVoice,
  sameName,
  sourceLabel,
} from './grocery';
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

describe('parseVoice', () => {
  it.each([
    ['add milk', ['Milk']],
    ['Add milk.', ['Milk']],
    ['add eggs and bread', ['Eggs', 'Bread']],
    ['add eggs, bread and butter', ['Eggs', 'Bread', 'Butter']],
    ['add eggs, bread, and butter', ['Eggs', 'Bread', 'Butter']],
    ['put bananas on the shopping list', ['Bananas']],
    ['add milk to the grocery list please', ['Milk']],
    ['add yogurt to the list', ['Yogurt']],
    ['okay um add some milk please', ['Milk']],
    ['can you add a loaf of bread', ['Loaf of bread']],
    ['we need diapers', ['Diapers']],
    ['I need to add coffee beans too', ['Coffee beans']],
    ['milk', ['Milk']],
    ['add mac and cheese and apples', ['Mac and cheese', 'Apples']],
    ['add half and half', ['Half and half']],
    ['add two avocados', ['Two avocados']],
  ])('"%s" → %j', (said, names) => {
    expect(parseVoice(said)).toEqual(names);
  });

  it.each(['', 'add', 'um', 'add to the list', '  .  '])('finds nothing in "%s"', (said) => {
    expect(parseVoice(said)).toEqual([]);
  });

  it('keeps words that only start like noise', () => {
    expect(parseVoice('add soap and umbrellas')).toEqual(['Soap', 'Umbrellas']);
    expect(parseVoice('add oranges')).toEqual(['Oranges']);
  });
});

describe('categoryFor', () => {
  it.each([
    ['Bananas', 'Produce'],
    ['Bell peppers', 'Produce'],
    ['Limes', 'Produce'],
    ['Strawberries', 'Produce'],
    ['Milk', 'Dairy & eggs'],
    ['Yogurt tubes', 'Dairy & eggs'],
    ['Eggs', 'Dairy & eggs'],
    ['Tortillas', 'Pantry'],
    ['Coffee beans', 'Pantry'],
    ['Peanut butter', 'Pantry'],
    ['Oat milk', 'Drinks'],
    ['Ice cream', 'Frozen'],
    ['Diapers', 'Baby'],
    ['Paper towels', 'Household'],
    ['Chicken thighs', 'Meat & fish'],
    ['Sourdough loaf', 'Bakery'],
    ['Eggplant', 'Other'],
    ['Birthday candles', 'Other'],
  ])('%s → %s', (name, category) => {
    expect(categoryFor(name)).toBe(category);
  });
});

describe('grocerySections', () => {
  const at = (name: string, category: string, ms: number, done = false): GroceryItem => ({
    ...item(name, ms, done),
    category,
  });

  it('groups open items in aisle order, oldest first, then In the cart', () => {
    const sections = grocerySections([
      at('Diapers', 'Household', 1),
      at('Milk', 'Dairy & eggs', 5),
      at('Bananas', 'Produce', 4),
      at('Eggs', 'Dairy & eggs', 2),
      at('Limes', 'Produce', 3, true),
      at('Candles', 'Other', 6),
    ]);
    expect(sections.map((s) => [s.title, s.items.map((g) => g.name)])).toEqual([
      ['Produce', ['Bananas']],
      ['Dairy & eggs', ['Eggs', 'Milk']],
      ['Household', ['Diapers']],
      ['Other', ['Candles']],
      ['In the cart', ['Limes']],
    ]);
  });

  it('puts categories it doesn’t know just before Other', () => {
    const sections = grocerySections([
      at('Candles', 'Other', 1),
      at('Cake', 'Party', 2),
      at('Soap', 'Household', 3),
    ]);
    expect(sections.map((s) => s.title)).toEqual(['Household', 'Party', 'Other']);
  });

  it('has no In the cart section until something is checked', () => {
    expect(grocerySections([at('Milk', 'Dairy & eggs', 1)]).map((s) => s.title)).toEqual([
      'Dairy & eggs',
    ]);
    expect(grocerySections([])).toEqual([]);
  });
});

describe('sourceLabel', () => {
  it('uses the mockup’s words', () => {
    expect(sourceLabel({ ...item('Milk', 1), source: 'voice' })).toBe('Added by voice');
    expect(sourceLabel({ ...item('Limes', 1), source: 'recipe' })).toBe('From recipe');
    expect(sourceLabel(item('Diapers', 1), 'Bob')).toBe('Added by Bob');
    expect(sourceLabel(item('Eggs', 1))).toBeNull();
  });
});

describe('sameName', () => {
  it('ignores case and spacing', () => {
    expect(sameName(' milk ', 'Milk')).toBe(true);
    expect(sameName('coffee  beans', 'Coffee beans')).toBe(true);
    expect(sameName('Milk', 'Oat milk')).toBe(false);
  });
});
