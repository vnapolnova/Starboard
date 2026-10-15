import { kidDayTitle, type MemberWithId } from './people';
import type { Route } from './routes';

// Placeholder views until each screen's issue lands: Today (#6), Calendar (#7),
// Chores (#8), Grocery (#9), Cleo's day (#10). Meals comes in Phase 2.
// Headings and copy are the mockup's.

export function View({
  route,
  kid,
  onBack,
}: {
  route: Route;
  kid: MemberWithId | null;
  onBack: () => void;
}) {
  switch (route) {
    case 'today':
      return <Placeholder title="Today" />;
    case 'cal':
      return <Placeholder title="This week" sub="Google Calendar · Family" />;
    case 'meals':
      return <Placeholder title="Dinner plan" note="Meals and recipes are coming in Phase 2." />;
    case 'grocery':
      return <Placeholder title="Grocery list" />;
    case 'chores':
      return <Placeholder title="Chores" sub="Resets each morning" />;
    case 'kid':
      return (
        <div class="backbar">
          <button type="button" class="btn ghost" onClick={onBack}>
            Back
          </button>
          <h2>{kidDayTitle(kid)}</h2>
        </div>
      );
  }
}

function Placeholder({ title, sub, note }: { title: string; sub?: string; note?: string }) {
  return (
    <>
      <h2>
        {title}
        {sub && <span class="sub">{sub}</span>}
      </h2>
      {note && <p class="empty">{note}</p>}
    </>
  );
}
