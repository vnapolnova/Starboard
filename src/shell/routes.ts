// Hash routes for the shell: #today, #cal, #meals, #grocery, #chores, #kid for
// Cleo's day (opened from the unicorn, not a tab), and #recent for the phone's
// Recent changes (opened from its top bar). Names match the mockup's
// data-tab values, so `scripts/shoot.mjs --hash #cal` works.

export const TABS = [
  { id: 'today', label: 'Today' },
  { id: 'cal', label: 'Calendar' },
  { id: 'meals', label: 'Meals' },
  { id: 'grocery', label: 'Grocery' },
  { id: 'chores', label: 'Chores' },
] as const;

export type TabId = (typeof TABS)[number]['id'];
export type Route = TabId | 'kid' | 'recent';

const ROUTES: readonly string[] = [...TABS.map((t) => t.id), 'kid', 'recent'];

/** The route for a location hash; anything unknown goes to Today. */
export function parseHash(hash: string): Route {
  const r = hash.replace(/^#\/?/, '');
  return ROUTES.includes(r) ? (r as Route) : 'today';
}

export function tabLabel(route: Route) {
  return TABS.find((t) => t.id === route)?.label;
}
