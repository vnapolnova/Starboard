import type { User } from 'firebase/auth';
import { CalendarNotice } from '../calendar/Notice';
import { calendarNotice } from '../calendar/week';
import { ChoreRow, type ChoreContext } from '../chores/ChoreRow';
import { choresOn, choresPreview } from '../data/chores';
import { groceryPreview, openItems } from '../data/grocery';
import { useCalendarSettings, useChoreDay, useEvents, useGrocery } from '../data/live';
import type { EventView } from '../data/types';
import { showsOwners, useFilters } from '../shell/filters';
import { useNow } from '../shell/hooks';
import { sortMembers, type MemberWithId } from '../shell/people';
import type { Route } from '../shell/routes';
import {
  addDays,
  agendaEnd,
  agendaRows,
  barBackground,
  eventsOn,
  joinNames,
  ownersOf,
  timeLabel,
} from './agenda';
import './today.css';

// The Today screen (spec §4 Today), as #v-today in design/tablet-mockup.html.
// The header and its weather are the shell's. "Nearby this week" waits for
// Phase 3, and the dinner card is a placeholder until meals land in Phase 2.

interface Props {
  hid: string;
  user: User;
  members: MemberWithId[];
  phone: boolean;
  go: (r: Route) => void;
}

export function Today({ hid, user, members, phone, go }: Props) {
  const now = useNow();
  return (
    <>
      <section>
        <h2>Today</h2>
        <Agenda hid={hid} members={members} now={now} />
      </section>
      <section class="two">
        <div class="panel">
          <h3>
            Dinner tonight
            <button type="button" onClick={() => go('meals')}>
              Week
            </button>
          </h3>
          <p class="empty">Meals and recipes are coming in Phase 2.</p>
        </div>
        <div class="panel">
          <h3>
            Chores today
            <button type="button" onClick={() => go('chores')}>
              All
            </button>
          </h3>
          <ChoresPreview hid={hid} user={user} members={members} phone={phone} now={now} />
        </div>
      </section>
      <GroceryStrip hid={hid} onOpen={() => go('grocery')} />
    </>
  );
}

function Agenda({ hid, members, now }: { hid: string; members: MemberWithId[]; now: Date }) {
  useFilters();
  const events = useEvents(hid);
  const notice = calendarNotice(useCalendarSettings(hid), now);
  // When no calendar is found, say so instead of an empty agenda (spec §7).
  if (notice?.blocking) return <CalendarNotice notice={notice} />;
  if (!events) return <ul class="agenda" />;

  const shown = events.filter((e) => showsOwners(e.ownerIds));
  const today = eventsOn(shown, now);
  const end = agendaEnd(today, eventsOn(shown, addDays(now, 1)), now);

  return (
    <>
      {notice && <CalendarNotice notice={notice} />}
      <ul class="agenda">
        {agendaRows(today, now).map((row) =>
          row.kind === 'now' ? (
            <li key="now" class="now">
              Now
            </li>
          ) : (
            <EventRow
              key={row.event.id}
              event={row.event}
              past={row.past}
              members={members}
              day={now}
            />
          ),
        )}
        {end && <AgendaEnd text={end} />}
      </ul>
    </>
  );
}

function EventRow({
  event,
  past,
  members,
  day,
}: {
  event: EventView;
  past: boolean;
  members: MemberWithId[];
  day: Date;
}) {
  const owners = ownersOf(event, members);
  return (
    <li class={past ? 'ev past' : 'ev'}>
      <span class="time">{timeLabel(event, day)}</span>
      <span class="bar" style={{ background: barBackground(owners) }} aria-hidden="true" />
      <span>
        <div class="what">{event.title}</div>
        <div class="who">{joinNames(owners.map((o) => o.name))}</div>
      </span>
    </li>
  );
}

/** The agenda's last line once nothing is left to come. */
function AgendaEnd({ text }: { text: string }) {
  return <li class="empty agenda-end">{text}</li>;
}

function ChoresPreview({
  hid,
  user,
  members,
  phone,
  now,
}: {
  hid: string;
  user: User;
  members: MemberWithId[];
  phone: boolean;
  now: Date;
}) {
  const data = useChoreDay(hid, now);
  if (!data) return null;

  const today = choresOn(data.chores, data.completions, now);
  const order = sortMembers(members).map((m) => m.id);
  const list = choresPreview(today, order);
  if (!list.length) return <p class="empty">No chores today.</p>;

  const ctx: ChoreContext = { hid, user, members, phone, today };
  return (
    <div>
      {list.map((d) => (
        <ChoreRow key={d.chore.id} ctx={ctx} item={d} showTag />
      ))}
    </div>
  );
}

function GroceryStrip({ hid, onOpen }: { hid: string; onOpen: () => void }) {
  const items = useGrocery(hid);
  const open = items ? openItems(items) : [];
  return (
    <section class="panel">
      <h3>
        Grocery list
        <button type="button" onClick={onOpen}>
          Open
        </button>
      </h3>
      <div class="grocery-strip">
        <div class="count">{items ? open.length : ''}</div>
        <div class="items">{items ? groceryPreview(open) : ''}</div>
        {/* Voice add comes with the Grocery tab (#9); until then the mic opens the list. */}
        <button type="button" class="btn mic" aria-label="Add a grocery item" onClick={onOpen}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <rect x="9" y="3" width="6" height="11" rx="3" />
            <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
          </svg>
        </button>
      </div>
    </section>
  );
}
