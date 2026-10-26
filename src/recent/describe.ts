import type { ActivityEntry } from '../data/types';
import { clockParts } from '../shell/format';
import { memberForEmail, type MemberWithId } from '../shell/people';

// How a Recent changes row reads (spec §6): what changed on the first line,
// then who and when, like the .item rows of design/phone-mockup.html.

/** A changed doc's name: grocery items carry it, chores are looked up by ID. */
function nameOf(entry: ActivityEntry, choreNames: Map<string, string>) {
  const doc = entry.after ?? entry.before ?? {};
  if (typeof doc.name === 'string') return doc.name;
  if (typeof doc.choreId === 'string') return choreNames.get(doc.choreId) ?? 'a chore';
  return 'an item';
}

/** "Checked off Water plants", "Added Milk", "Milk is in the cart". */
export function describeWhat(entry: ActivityEntry, choreNames: Map<string, string>) {
  const name = nameOf(entry, choreNames);
  switch (entry.action) {
    case 'chore.done':
      return `Checked off ${name}`;
    case 'chore.undone':
      return `Unchecked ${name}`;
    case 'grocery.add':
      return `Added ${name}`;
    case 'grocery.done':
      return `${name} is in the cart`;
    case 'grocery.undone':
      return `${name} is back on the list`;
    case 'grocery.clear':
      return `Cleared ${name} from the cart`;
    default:
      return `Changed ${name}`;
  }
}

/** The member on that account, or "Kitchen screen" for the tablet's household account. */
export function describeWho(entry: ActivityEntry, members: MemberWithId[]) {
  const member = memberForEmail(members, entry.actor.email);
  if (member) return member.name;
  return entry.actor.device === 'tablet' ? 'Kitchen screen' : entry.actor.email || 'Someone';
}

function sameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

/** "10:42 am" today, "Yesterday 6:05 pm", otherwise "Mon, Oct 12 · 6:05 pm". */
export function describeWhen(at: Date, now: Date) {
  const { time, ampm } = clockParts(at);
  const clock = `${time} ${ampm}`;
  if (sameDay(at, now)) return clock;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(at, yesterday)) return `Yesterday ${clock}`;
  const day = at.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  return `${day} · ${clock}`;
}
