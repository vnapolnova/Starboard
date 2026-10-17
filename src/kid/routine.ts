import type {
  ClockTime,
  EventView,
  RoutineKind,
  RoutineOverride,
  RoutineStep,
} from '../data/types';
import { addDays, eventsOn, startOfDay } from '../today/agenda';

// Cleo's day (spec §4 Cleo's day, design/tablet-mockup.html #v-kid), built in
// three layers for today:
//   1. the weekday or weekend template, each step lasting until its `end` or
//      the next step's start (the last one runs to midnight);
//   2. today's timed events of the kid's, placed by time; an event replaces any
//      template step it overlaps;
//   3. routineOverrides/{today}, matched by start time (replace, skip or add).
// The current step is the latest one whose start has passed. Times are minutes
// since local midnight.

/** A step as shown, with its times in minutes since midnight. */
export interface DayStep {
  name: string;
  pic: string;
  start: number;
  end?: number;
  /** "6:30", or "12:15–2:00" for a step with an end. */
  label: string;
  from: 'template' | 'event' | 'override';
}

const DAY = 24 * 60;

export function dayKind(d: Date): RoutineKind {
  return d.getDay() === 0 || d.getDay() === 6 ? 'weekend' : 'weekday';
}

/** "08:00" → 480. */
export function toMinutes(t: ClockTime) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/** 480 → "8:00", like the mockup's step times (no am/pm). */
export function clockLabel(min: number) {
  const h = Math.floor(min / 60);
  return `${h % 12 || 12}:${String(min % 60).padStart(2, '0')}`;
}

function label(start: number, end?: number) {
  return end === undefined ? clockLabel(start) : `${clockLabel(start)}–${clockLabel(end)}`;
}

function fromRoutineStep(s: RoutineStep, from: DayStep['from']): DayStep {
  const start = toMinutes(s.start);
  const end = s.end ? toMinutes(s.end) : undefined;
  return { name: s.name, pic: s.pic, start, end, label: label(start, end), from };
}

const byStart = (a: DayStep, b: DayStep) => a.start - b.start;

/** The template on its own, as the toggle shows the day type that isn't today. */
export function templateSteps(template: RoutineStep[]): DayStep[] {
  return template.map((s) => fromRoutineStep(s, 'template')).sort(byStart);
}

// Pictures for event steps, from words in the title (spec §4). An event's own
// `pic` (eventOverrides) wins.
const PICS: [RegExp, string][] = [
  [/\bswim/i, '🏊'],
  [/\b(doctor|checkup|check-up|pediatrician|shots?)\b/i, '🩺'],
  [/\bdentist/i, '🦷'],
  [/\bhaircut/i, '✂️'],
  [/\b(birthday|party)\b/i, '🎂'],
  [/\bpumpkin/i, '🎃'],
  [/\bzoo\b/i, '🦁'],
  [/\b(farm|cider mill|orchard|apple)/i, '🍎'],
  [/\b(library|story ?time|books?)\b/i, '📚'],
  [/\b(park|playground)\b/i, '🛝'],
  [/\b(music|song|sing)/i, '🎵'],
  [/\b(dance|ballet)/i, '💃'],
  [/\b(gym|tumbl|gymnastics)/i, '🤸'],
  [/\bplay ?date/i, '🧸'],
  [/\b(grandma|grandpa|nana|papa|granny)/i, '👵'],
  [/\b(trip|flight|airport)\b/i, '✈️'],
];

/** The picture for an event, or undefined if nothing in the title matches. */
function matchedPic(e: Pick<EventView, 'title' | 'pic'>) {
  return e.pic || PICS.find(([re]) => re.test(e.title))?.[1];
}

export function eventPic(e: Pick<EventView, 'title' | 'pic'>) {
  return matchedPic(e) ?? '📅';
}

/**
 * The title without a leading "Cleo –" or "Cleo:", since the whole screen is
 * hers: "Cleo – swim lesson" → "Swim lesson". Names joined with others stay.
 */
export function stepName(title: string, kidNames: string[]) {
  for (const n of kidNames) {
    const name = n.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (!name) continue;
    const m = new RegExp(`^\\s*${name}\\s*[-–—:]\\s*`, 'iu').exec(title);
    if (m && title.length > m[0].length) {
      const rest = title.slice(m[0].length);
      return rest[0].toUpperCase() + rest.slice(1);
    }
  }
  return title;
}

export interface Kid {
  id: string;
  name: string;
  nicknames?: string[];
}

/** Today's timed events of the kid's, as steps. All-day events aren't placed. */
export function eventSteps(events: EventView[], kid: Kid | null, day: Date): DayStep[] {
  if (!kid) return [];
  const midnight = startOfDay(day).getTime();
  const names = [kid.name, ...(kid.nicknames ?? [])];
  return eventsOn(events, day)
    .filter((e) => !e.allDay && e.ownerIds.includes(kid.id) && e.start.toMillis() >= midnight)
    .map((e) => {
      const start = Math.round((e.start.toMillis() - midnight) / 60_000);
      const end = Math.min(DAY, Math.round((e.end.toMillis() - midnight) / 60_000));
      return {
        name: stepName(e.title, names),
        pic: eventPic(e),
        start,
        end: end > start ? end : undefined,
        label: label(start, end > start && end < DAY ? end : undefined),
        from: 'event' as const,
      };
    });
}

/** Layer 2: events placed by time, replacing every template step they overlap. */
export function mergeEvents(template: DayStep[], events: DayStep[]): DayStep[] {
  const spans = template.map((s, i) => [s.start, s.end ?? template[i + 1]?.start ?? DAY]);
  const kept = template.filter((_, i) => {
    const [from, to] = spans[i];
    return !events.some((e) => e.start < to && Math.max(e.end ?? 0, e.start + 1) > from);
  });
  return [...kept, ...events].sort(byStart);
}

/** Layer 3: one-off changes for the day, matched by start time. */
export function applyChanges(steps: DayStep[], override: RoutineOverride | null): DayStep[] {
  let out = steps;
  for (const c of override?.steps ?? []) {
    const start = toMinutes(c.start);
    out = out.filter((s) => s.start !== start);
    if (!c.skip) out = [...out, fromRoutineStep(c, 'override')];
  }
  return out.sort(byStart);
}

/** The three layers for `day`. */
export function buildDay(
  template: RoutineStep[],
  events: EventView[],
  override: RoutineOverride | null,
  kid: Kid | null,
  day: Date,
): DayStep[] {
  return applyChanges(mergeEvents(templateSteps(template), eventSteps(events, kid, day)), override);
}

/** Index of the latest step whose start has passed, or -1 before the first. */
export function currentStep(steps: DayStep[], now: Date) {
  const n = now.getHours() * 60 + now.getMinutes();
  let cur = -1;
  steps.forEach((s, i) => {
    if (s.start <= n) cur = i;
  });
  return cur;
}

export interface Countdown {
  sleeps: number;
  title: string;
  pic?: string;
}

/**
 * "N sleeps until…": the next special event of the kid's or the Family's
 * (no owners) on a later day than `now`. Null if there isn't one.
 */
export function countdown(events: EventView[], kid: Kid | null, now: Date): Countdown | null {
  const tomorrow = addDays(now, 1).getTime();
  const next = events
    .filter(
      (e) =>
        e.special &&
        e.start.toMillis() >= tomorrow &&
        (e.ownerIds.length === 0 || (kid !== null && e.ownerIds.includes(kid.id))),
    )
    .sort((a, b) => a.start.toMillis() - b.start.toMillis())[0];
  if (!next) return null;
  const day = startOfDay(next.start.toDate());
  // Count calendar days, so a clock change doesn't make it 2.96 sleeps.
  const sleeps = Math.round((day.getTime() - startOfDay(now).getTime()) / 86_400_000);
  const names = kid ? [kid.name, ...(kid.nicknames ?? [])] : [];
  return { sleeps, title: stepName(next.title, names), pic: matchedPic(next) };
}
