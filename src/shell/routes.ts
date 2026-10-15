// Hash routes for the shell: #today, #cal, #meals, #grocery, #chores, and #kid
// for Cleo's day (opened from the unicorn, not a tab). Names match the mockup's
// data-tab values, so `scripts/shoot.mjs --hash #cal` works.

export const TABS = [
  { id: 'today', label: 'Today' },
  { id: 'cal', label: 'Calendar' },
  { id: 'meals', label: 'Meals' },
  { id: 'grocery', label: 'Grocery' },
  { id: 'chores', label: 'Chores' },
] as const;

export type TabId = (typeof TABS)[number]['id'];
export type Route = TabId | 'kid';

const ROUTES: readonly string[] = [...TABS.map((t) => t.id), 'kid'];

/** The route for a location hash; anything unknown goes to Today. */
export function parseHash(hash: string): Route {
  const r = hash.replace(/^#\/?/, '');
  return ROUTES.includes(r) ? (r as Route) : 'today';
}

export function tabLabel(route: Route) {
  return TABS.find((t) => t.id === route)?.label;
}
