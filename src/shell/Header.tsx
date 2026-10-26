import { useRef } from 'preact/hooks';
import { isShown, toggleFilter, useFilters } from './filters';
import { clockParts, longDate } from './format';
import { useNow } from './hooks';
import { UnicornSvg } from './icons';
import { Weather } from '../weather/Weather';
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
export function Header({ hid, members, kid, onKid }: Props & { hid: string }) {
  const now = useNow();
  const { time, ampm } = clockParts(now);
  return (
    <header class="top">
      <div class="clock">
        {time}
        <small>{ampm}</small>
      </div>
      <Weather hid={hid} />
      <div class="date">{longDate(now)}</div>
      <PersonChips members={members} />
      {kid && <Unicorn kid={kid} onKid={onKid} bubble />}
    </header>
  );
}

/**
 * Phone header: the compact bar from design/phone-mockup.html, plus the chips.
 * Recent opens Recent changes; there, Back returns and the chips are hidden.
 */
export function PhoneBar({
  title,
  who,
  members,
  kid,
  onKid,
  onRecent,
  onBack,
}: Props & { title: string; who: string | null; onRecent?: () => void; onBack?: () => void }) {
  return (
    <header class="bar">
      <div class="bar-row">
        {onBack && (
          <button type="button" class="back" onClick={onBack}>
            Back
          </button>
        )}
        <h1>{title}</h1>
        {who && <span class="who">{who}</span>}
        {onRecent && (
          <button type="button" class="back" onClick={onRecent}>
            Recent
          </button>
        )}
        {kid && !onBack && <Unicorn kid={kid} onKid={onKid} bubble={false} />}
      </div>
      {!onBack && <PersonChips members={members} />}
    </header>
  );
}
