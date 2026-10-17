import type { User } from 'firebase/auth';
import { Calendar } from '../calendar/Calendar';
import { Chores } from '../chores/Chores';
import { Grocery } from '../grocery/Grocery';
import { Today } from '../today/Today';
import { kidDayTitle, type MemberWithId } from './people';
import type { Route } from './routes';

// Placeholder views until each screen's issue lands: Cleo's day (#10).
// Meals comes in Phase 2.
// Headings and copy are the mockup's.

export function View({
  route,
  hid,
  user,
  members,
  kid,
  phone,
  go,
}: {
  route: Route;
  hid: string;
  user: User;
  members: MemberWithId[];
  kid: MemberWithId | null;
  phone: boolean;
  go: (r: Route) => void;
}) {
  switch (route) {
    case 'today':
      return <Today hid={hid} user={user} members={members} phone={phone} go={go} />;
    case 'cal':
      return <Calendar hid={hid} members={members} />;
    case 'meals':
      return <Placeholder title="Dinner plan" note="Meals and recipes are coming in Phase 2." />;
    case 'grocery':
      return <Grocery hid={hid} user={user} members={members} phone={phone} />;
    case 'chores':
      return <Chores hid={hid} user={user} members={members} phone={phone} />;
    case 'kid':
      return (
        <div class="backbar">
          <button type="button" class="btn ghost" onClick={() => go('today')}>
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
