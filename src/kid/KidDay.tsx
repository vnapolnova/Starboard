import { useState } from 'preact/hooks';
import { dateKey } from '../data/chores';
import { useEvents, useRoutine, useRoutineOverride } from '../data/live';
import type { RoutineKind } from '../data/types';
import { useNow } from '../shell/hooks';
import { kidDayTitle, type MemberWithId } from '../shell/people';
import type { Route } from '../shell/routes';
import { buildDay, countdown, currentStep, dayKind, templateSteps } from './routine';
import './kid.css';

// Cleo's day (spec §4), as #v-kid in design/tablet-mockup.html: the sleeps
// countdown, the Weekday/Weekend toggle and the picture routine. Today's day
// type gets the kid's events, the day's one-off changes and the current step;
// the other one shows the plain template. Read-only: nothing here writes.

const KINDS: { kind: RoutineKind; label: string }[] = [
  { kind: 'weekday', label: 'Weekday' },
  { kind: 'weekend', label: 'Weekend' },
];

const MAX_MOONS = 10;

interface Props {
  hid: string;
  kid: MemberWithId | null;
  go: (r: Route) => void;
}

export function KidDay({ hid, kid, go }: Props) {
  const now = useNow();
  const todayKind = dayKind(now);
  const [mode, setMode] = useState<RoutineKind>(todayKind);
  const events = useEvents(hid);
  const routine = useRoutine(hid, mode);
  const override = useRoutineOverride(hid, dateKey(now));

  const isToday = mode === todayKind;
  const loaded = routine !== undefined && events !== null && override !== undefined;
  const template = routine?.steps ?? [];
  const steps = !loaded
    ? []
    : isToday
      ? buildDay(template, events, override, kid, now)
      : templateSteps(template);
  const cur = isToday ? currentStep(steps, now) : -1;
  const next = events ? countdown(events, kid, now) : null;

  return (
    <>
      <div class="backbar">
        <button type="button" class="btn ghost" onClick={() => go('today')}>
          Back
        </button>
        <h2>{kidDayTitle(kid)}</h2>
      </div>
      {next && (
        <div class="countdown">
          <div class="big">{next.sleeps}</div>
          <div>
            <div class="txt">
              {next.sleeps === 1 ? 'sleep' : 'sleeps'} until {next.title}
              {next.pic && ` ${next.pic}`}
            </div>
            <div class="moons" aria-hidden="true">
              {'🌙'.repeat(Math.min(next.sleeps, MAX_MOONS))}
            </div>
          </div>
        </div>
      )}
      <div class="resline">
        <span>Her usual day</span>
        <div class="seg" role="group" aria-label="Routine">
          {KINDS.map(({ kind, label }) => (
            <button
              key={kind}
              type="button"
              aria-pressed={mode === kind}
              onClick={() => setMode(kind)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {loaded && !steps.length ? (
        <p class="empty">No {mode} routine yet.</p>
      ) : (
        <ol class="routine">
          {steps.map((s, i) => (
            <li
              key={`${s.start}-${s.name}`}
              class={`step${i < cur ? ' done' : i === cur ? ' cur' : ''}`}
              aria-current={i === cur ? 'step' : undefined}
            >
              <span class="pic" aria-hidden="true">
                {s.pic}
              </span>
              <span>
                <div class="nm">{s.name}</div>
                <div class="tm">{i === cur ? 'Right now' : s.label}</div>
              </span>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
