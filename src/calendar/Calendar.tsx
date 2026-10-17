import { useState } from 'preact/hooks';
import { useCalendarSettings, useEvents } from '../data/live';
import type { EventView } from '../data/types';
import { showsOwners, useFilters } from '../shell/filters';
import { useNow } from '../shell/hooks';
import type { MemberWithId } from '../shell/people';
import { barBackground, joinNames, ownersOf, timeLabel } from '../today/agenda';
import { EventSheet } from './EventSheet';
import { CalendarNotice } from './Notice';
import { calendarNotice, weekDays } from './week';
import './calendar.css';

// The Calendar tab (spec §4 Calendar), as #v-cal in design/tablet-mockup.html:
// this week, Monday to Sunday, each event in its owner's color. The header
// chips filter it, and tapping an event opens the read-only event sheet.

export function Calendar({ hid, members }: { hid: string; members: MemberWithId[] }) {
  useFilters();
  const now = useNow();
  const events = useEvents(hid);
  const notice = calendarNotice(useCalendarSettings(hid), now);
  const [open, setOpen] = useState<EventView | null>(null);

  const heading = (
    <h2>
      This week <span class="sub">Google Calendar · Family</span>
    </h2>
  );
  if (notice?.blocking) {
    return (
      <>
        {heading}
        <CalendarNotice notice={notice} />
      </>
    );
  }
  if (!events) return heading;

  const shown = events.filter((e) => showsOwners(e.ownerIds));
  // An event still open in the sheet stays in step with live changes.
  const current = open && (events.find((e) => e.id === open.id) ?? open);

  return (
    <>
      {heading}
      {notice && <CalendarNotice notice={notice} />}
      <div class="week">
        {weekDays(shown, now).map(({ day, today, events: list }) => (
          <div key={day.getTime()} class={today ? 'day today' : 'day'}>
            <div class="dn">
              <b>{day.getDate()}</b>
              <span>{day.toLocaleDateString('en-US', { weekday: 'short' })}</span>
            </div>
            <div>
              {list.length ? (
                list.map((e) => {
                  const owners = ownersOf(e, members);
                  return (
                    <button
                      key={e.id}
                      type="button"
                      class="wchip"
                      aria-label={`${timeLabel(e, day)}, ${e.title}, ${joinNames(owners.map((o) => o.name))}`}
                      onClick={() => setOpen(e)}
                    >
                      <span
                        class="stripe"
                        style={{ background: barBackground(owners) }}
                        aria-hidden="true"
                      />
                      <span class="ct">{timeLabel(e, day)}</span>
                      <span class="cn">{e.title}</span>
                    </button>
                  );
                })
              ) : (
                <div class="empty">Free day</div>
              )}
            </div>
          </div>
        ))}
      </div>
      {current && <EventSheet event={current} onClose={() => setOpen(null)} />}
    </>
  );
}
