import type { User } from 'firebase/auth';
import { useState } from 'preact/hooks';
import { EventSheet } from '../calendar/EventSheet';
import { CalendarNotice } from '../calendar/Notice';
import { calendarNotice } from '../calendar/week';
import { ChoreRow, type ChoreContext } from '../chores/ChoreRow';
import { choresOn, choresPreview } from '../data/chores';
import { groceryPreview, openItems } from '../data/grocery';
import { MicButton } from '../grocery/Grocery';
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
      <GroceryStrip
        hid={hid}
        user={user}
        members={members}
        phone={phone}
        onOpen={() => go('grocery')}
      />
    </>
  );
}

function Agenda({ hid, members, now }: { hid: string; members: MemberWithId[]; now: Date }) {
  useFilters();
  const events = useEvents(hid);
  const notice = calendarNotice(useCalendarSettings(hid), now);
  const [open, setOpen] = useState<EventView | null>(null);
  // When no calendar is found, say so instead of an empty agenda (spec §7).
  if (notice?.blocking) return <CalendarNotice notice={notice} />;
  if (!events) return <ul class="agenda" />;

  const shown = events.filter((e) => showsOwners(e.ownerIds));
  const today = eventsOn(shown, now);
  const end = agendaEnd(today, eventsOn(shown, addDays(now, 1)), now);
  // An event still open in the sheet stays in step with live changes.
  const current = open && (events.find((e) => e.id === open.id) ?? open);

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
              onOpen={() => setOpen(row.event)}
            />
          ),
        )}
        {end && <AgendaEnd text={end} />}
      </ul>
      {current && <EventSheet event={current} onClose={() => setOpen(null)} />}
    </>
  );
}

function EventRow({
  event,
  past,
  members,
  day,
  onOpen,
}: {
  event: EventView;
  past: boolean;
  members: MemberWithId[];
  day: Date;
  onOpen: () => void;
}) {
  const owners = ownersOf(event, members);
  return (
    <li class={past ? 'ev past' : 'ev'}>
      {/* Tapping opens the read-only event sheet, as on the Calendar tab. */}
      <button type="button" class="evbtn" onClick={onOpen}>
        <span class="time">{timeLabel(event, day)}</span>
        <span class="bar" style={{ background: barBackground(owners) }} aria-hidden="true" />
        <span>
          <span class="what">{event.title}</span>
          <span class="who">{joinNames(owners.map((o) => o.name))}</span>
        </span>
      </button>
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

function GroceryStrip({
  hid,
  user,
  members,
  phone,
  onOpen,
}: {
  hid: string;
  user: User;
  members: MemberWithId[];
  phone: boolean;
  onOpen: () => void;
}) {
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
        <MicButton
          ctx={items && { hid, user, members, phone, items }}
          label="Add grocery item by voice"
        />
      </div>
    </section>
  );
}
