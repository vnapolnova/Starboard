import { Timestamp, type Firestore } from 'firebase/firestore';
import { logWrite, undo, type Actor } from './activity';
import type { Chore, DateKey } from './types';

// Chores due today and checking them off (spec §4 Chores). A check-off is one
// doc, choreCompletions/{date}_{choreId}, so a new day starts with nothing done.

export type ChoreWithId = Chore & { id: string };

/** choreCompletions IDs are "{date}_{choreId}", so one check-off per chore per day. */
export function choreCompletionId(date: string, choreId: string) {
  return `${date}_${choreId}`;
}

/** "YYYY-MM-DD" for the local day containing `d`. */
export function dateKey(d: Date): DateKey {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Whether the chore shows on this day. Daily and weekday chores are settled;
 * weekly and once show every day for now, until the Chores tab (#8) works out
 * their rules from completion dates.
 */
export function dueOn(chore: Chore, day: Date) {
  if (chore.repeat === 'weekdays') return day.getDay() !== 0 && day.getDay() !== 6;
  return true;
}

/**
 * The Today preview: the first few chores due today, not-done first, then in
 * the order of `memberOrder` (parents, then the kid), then by name.
 */
export function choresPreview(
  chores: ChoreWithId[],
  doneIds: Set<string>,
  day: Date,
  memberOrder: string[],
  max = 4,
) {
  const rank = (c: ChoreWithId) => {
    const i = memberOrder.indexOf(c.memberId);
    return i === -1 ? memberOrder.length : i;
  };
  return chores
    .filter((c) => dueOn(c, day))
    .sort(
      (a, b) =>
        Number(doneIds.has(a.id)) - Number(doneIds.has(b.id)) ||
        rank(a) - rank(b) ||
        a.name.localeCompare(b.name),
    )
    .slice(0, max);
}

/**
 * Checks a chore off for `date`, or un-checks it, through the activity log.
 * Returns a function that undoes it.
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
