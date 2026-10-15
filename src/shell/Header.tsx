import { useRef } from 'preact/hooks';
import { isShown, toggleFilter, useFilters } from './filters';
import { clockParts, longDate } from './format';
import { useNow } from './hooks';
import { UnicornSvg } from './icons';
import { chipsFor, initial, kidDayTitle, type MemberWithId } from './people';

interface Props {
  members: MemberWithId[];
  kid: MemberWithId | null;
  onKid: () => void;
}

/** Person chips: toggle each person's events on Today and Calendar (spec §2). */
export function PersonChips({ members }: { members: MemberWithId[] }) {
  useFilters();
  return (
    <div class="people" role="group" aria-label="Show events for">
      {chipsFor(members).map((c) => (
        <button
          key={c.id}
          type="button"
          class="person"
          aria-pressed={isShown(c.id)}
          onClick={() => toggleFilter(c.id)}
        >
          <span class="av" style={{ background: `var(--${c.color})` }} aria-hidden="true">
            {initial(c.name)}
          </span>
          {c.name}
        </button>
      ))}
    </div>
  );
}

/** The unicorn: opens the kid's day, with a little bob (off for reduced motion). */
export function Unicorn({
  kid,
  onKid,
  bubble,
}: {
  kid: MemberWithId;
  onKid: () => void;
  bubble: boolean;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const tap = () => {
    const el = ref.current;
    if (el) {
      el.classList.remove('bob');
      void el.offsetWidth; // restart the animation
      el.classList.add('bob');
    }
    onKid();
  };
  return (
    <button
      ref={ref}
      type="button"
      class="uni"
      aria-label={`Open ${kidDayTitle(kid)}`}
      onClick={tap}
    >
      {bubble && <span class="bubble">My day!</span>}
      <UnicornSvg />
    </button>
  );
}

/** Tablet header: the starry sky from design/tablet-mockup.html. */
export function Header({ members, kid, onKid }: Props) {
  const now = useNow();
  const { time, ampm } = clockParts(now);
  return (
    <header class="top">
      <div class="clock">
        {time}
        <small>{ampm}</small>
      </div>
      {/* Weather (#5) fills this slot. */}
      <div class="wx" />
      <div class="date">{longDate(now)}</div>
      <PersonChips members={members} />
      {kid && <Unicorn kid={kid} onKid={onKid} bubble />}
    </header>
  );
}

/** Phone header: the compact bar from design/phone-mockup.html, plus the chips. */
export function PhoneBar({
  title,
  who,
  members,
  kid,
  onKid,
}: Props & { title: string; who: string | null }) {
  return (
    <header class="bar">
      <div class="bar-row">
        <h1>{title}</h1>
        {who && <span class="who">{who}</span>}
        {kid && <Unicorn kid={kid} onKid={onKid} bubble={false} />}
      </div>
      <PersonChips members={members} />
    </header>
  );
}
