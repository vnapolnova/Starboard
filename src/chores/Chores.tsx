import type { User } from 'firebase/auth';
import { choresFor, choresOn, monthCount } from '../data/chores';
import { useChoreDay } from '../data/live';
import { useNow } from '../shell/hooks';
import { sortMembers, type MemberWithId } from '../shell/people';
import { ChoreRow, type ChoreContext } from './ChoreRow';
import './chores.css';

// The Chores tab (spec §4 Chores), as #v-chores in design/tablet-mockup.html:
// a column per person, parents then the kid. Adults earn stars and the kid
// earns stickers, one per check-off this month. Setting chores up is phone
// Manage (Phase 2), so there's nothing here but ticking.

interface Props {
  hid: string;
  user: User;
  members: MemberWithId[];
  phone: boolean;
}

export function Chores({ hid, user, members, phone }: Props) {
  const now = useNow();
  const data = useChoreDay(hid, now);
  const people = sortMembers(members);

  const heading = (
    <h2>
      Chores<span class="sub">Resets each morning</span>
    </h2>
  );
  if (!data) return heading;

  const today = choresOn(data.chores, data.completions, now);
  const ctx: ChoreContext = { hid, user, members, phone, today };

  return (
    <>
      {heading}
      <div class="chorecols" style={{ '--cols': people.length || 1 }}>
        {people.map((m) => {
          const list = choresFor(today, m.id);
          const done = list.filter((d) => d.done).length;
          const earned = monthCount(data.chores, data.completions, m.id, now);
          return (
            <section
              key={m.id}
              class={m.isKid ? 'chorecol kidcol' : 'chorecol'}
              style={{ borderTopColor: `var(--${m.color})` }}
              aria-label={m.name}
            >
              <h3>
                {m.name}
                {m.isKid && ' 🦄'}
              </h3>
              <div class="stars">
                {`${m.isKid ? `⭐ ${earned} stickers` : `★ ${earned} this month`} · ${done}/${list.length} today`}
              </div>
              {list.length ? (
                list.map((d) => <ChoreRow key={d.chore.id} ctx={ctx} item={d} />)
              ) : (
                <p class="empty">Nothing today.</p>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
