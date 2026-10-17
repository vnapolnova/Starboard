import { Timestamp, type Firestore } from 'firebase/firestore';
import { logWrite, undo, type Actor } from './activity';
import type { Chore, ChoreCompletion, DateKey } from './types';

// Chores due on a day and checking them off (spec §4 Chores). A check-off is one
// doc, choreCompletions/{date}_{choreId}, and whether a chore shows and is done
// is worked out from those dates in local time:
//   daily     every day; a new day starts with nothing done
//   weekdays  Monday to Friday, the same way
//   weekly    every day of the week (Monday to Sunday) until it's done; then it
//             stays ticked for the rest of that week
//   once      every day until it's done; ticked that day, gone from the next

export type ChoreWithId = Chore & { id: string };

/** A chore as shown on a day, with the check-off that counts for it. */
export interface ChoreDay {
  chore: ChoreWithId;
  done: ChoreCompletion | null;
}

/** choreCompletions IDs are "{date}_{choreId}", so one check-off per chore per day. */
export function choreCompletionId(date: string, choreId: string) {
  return `${date}_${choreId}`;
}

/** "YYYY-MM-DD" for the local day containing `d`. */
export function dateKey(d: Date): DateKey {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${String(d.getDate()).padStart(2, '0')}`;
}

/** The Monday starting the week that contains `day`. */
export function weekStartKey(day: Date): DateKey {
  const back = (day.getDay() + 6) % 7; // Monday 0 … Sunday 6
  return dateKey(new Date(day.getFullYear(), day.getMonth(), day.getDate() - back));
}

export function monthStartKey(day: Date): DateKey {
  return dateKey(new Date(day.getFullYear(), day.getMonth(), 1));
}

/** The earliest date whose check-offs matter on `day`: this week's and this month's. */
export function completionsFrom(day: Date): DateKey {
  const week = weekStartKey(day);
  const month = monthStartKey(day);
  return week < month ? week : month;
}

/** The latest check-off of this chore from `from` to `to`, inclusive. DateKeys sort as text. */
function latest(completions: ChoreCompletion[], choreId: string, from: DateKey, to: DateKey) {
  let best: ChoreCompletion | null = null;
  for (const c of completions) {
    if (c.choreId !== choreId || c.date < from || c.date > to) continue;
    if (!best || c.date > best.date) best = c;
  }
  return best;
}

/**
 * Whether the chore shows on `day`, and the check-off that marks it done.
 * `completions` must cover this week, and all past check-offs of once chores.
 */
export function choreOn(chore: ChoreWithId, completions: ChoreCompletion[], day: Date) {
  const today = dateKey(day);
  switch (chore.repeat) {
    case 'weekdays':
      if (day.getDay() === 0 || day.getDay() === 6) return { due: false, done: null };
      return { due: true, done: latest(completions, chore.id, today, today) };
    case 'weekly':
      return { due: true, done: latest(completions, chore.id, weekStartKey(day), today) };
    case 'once': {
      const done = latest(completions, chore.id, '', today);
      return { due: !done || done.date === today, done };
    }
    default:
      return { due: true, done: latest(completions, chore.id, today, today) };
  }
}

/** The chores that show on `day`, each with its check-off. */
export function choresOn(
  chores: ChoreWithId[],
  completions: ChoreCompletion[],
  day: Date,
): ChoreDay[] {
  return chores.flatMap((chore) => {
    const { due, done } = choreOn(chore, completions, day);
    return due ? [{ chore, done }] : [];
  });
}

/**
 * The Today preview: the first few chores due today, not-done first, then in
 * the order of `memberOrder` (parents, then the kid), then by name.
 */
export function choresPreview(list: ChoreDay[], memberOrder: string[], max = 4) {
  const rank = ({ chore }: ChoreDay) => {
    const i = memberOrder.indexOf(chore.memberId);
    return i === -1 ? memberOrder.length : i;
  };
  return [...list]
    .sort(
      (a, b) =>
        Number(!!a.done) - Number(!!b.done) ||
        rank(a) - rank(b) ||
        a.chore.name.localeCompare(b.chore.name),
    )
    .slice(0, max);
}

/** One person's column on the Chores tab, in a steady order so rows don't jump when ticked. */
export function choresFor(list: ChoreDay[], memberId: string) {
  return list
    .filter((d) => d.chore.memberId === memberId)
    .sort((a, b) => a.chore.name.localeCompare(b.chore.name));
}

/**
 * Stars (adults) or stickers (the kid) earned this month: one per check-off of
 * the person's chores. Counted from the check-offs, so Undo keeps it right.
 */
export function monthCount(
  chores: ChoreWithId[],
  completions: ChoreCompletion[],
  memberId: string,
  day: Date,
) {
  const mine = new Set(chores.filter((c) => c.memberId === memberId).map((c) => c.id));
  const from = monthStartKey(day);
  const to = dateKey(day);
  const seen = new Set<string>();
  for (const c of completions) {
    if (mine.has(c.choreId) && c.date >= from && c.date <= to) {
      seen.add(choreCompletionId(c.date, c.choreId));
    }
  }
  return seen.size;
}

/** Whether ticking `choreId` finishes everything on this list. */
export function finishesList(list: ChoreDay[], choreId: string) {
  return list.length > 0 && list.every((d) => d.chore.id === choreId || d.done);
}

/**
 * Checks a chore off for `date`, or un-checks it, through the activity log.
 * To un-check, pass the date of the check-off being removed. Returns a function
 * that undoes it.
 */
export async function setChoreDone(
  db: Firestore,
  hid: string,
  opts: { actor: Actor; doneBy: string; choreId: string; date: DateKey; done: boolean },
) {
  const path = `choreCompletions/${choreCompletionId(opts.date, opts.choreId)}`;
  const { logId } = opts.done
    ? await logWrite(db, hid, {
        op: 'set',
        action: 'chore.done',
        path,
        actor: opts.actor,
        data: {
          date: opts.date,
          choreId: opts.choreId,
          doneAt: Timestamp.now(),
          doneBy: opts.doneBy,
        },
      })
    : await logWrite(db, hid, { op: 'delete', action: 'chore.undone', path, actor: opts.actor });
  return () => undo(db, hid, logId);
}
