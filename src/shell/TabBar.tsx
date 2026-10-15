import { TAB_ICONS } from './icons';
import { TABS, type Route, type TabId } from './routes';

/** Bottom tabs: Today · Calendar · Meals · Grocery · Chores (spec §4). */
export function TabBar({ route, onTab }: { route: Route; onTab: (t: TabId) => void }) {
  return (
    <nav class="tabbar" role="tablist" aria-label="Sections">
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          class="tab"
          role="tab"
          aria-selected={route === t.id}
          aria-controls="view"
          onClick={() => onTab(t.id)}
        >
          {TAB_ICONS[t.id]}
          {t.label}
        </button>
      ))}
    </nav>
  );
}
