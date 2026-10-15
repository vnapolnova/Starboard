import type { Member, PersonColor } from '../data/types';

// The header chips: one per member from Firestore, then Family (spec §2).
// No names live in code; "Family" is the shared bucket, not a person.

export type MemberWithId = Member & { id: string };

/** Filter key for events with no owner (spec §7: "Otherwise, Family"). */
export const FAMILY = 'family';

export interface Chip {
  /** Member ID, or FAMILY. */
  id: string;
  name: string;
  color: PersonColor;
}

const ORDER: PersonColor[] = ['p1', 'p2', 'kid', 'fam'];

/** Parents first, then the kid, in color-slot order; ties by name. */
export function sortMembers(members: MemberWithId[]) {
  return [...members].sort(
    (a, b) => ORDER.indexOf(a.color) - ORDER.indexOf(b.color) || a.name.localeCompare(b.name),
  );
}

export function chipsFor(members: MemberWithId[]): Chip[] {
  return [
    ...sortMembers(members).map(({ id, name, color }) => ({ id, name, color })),
    { id: FAMILY, name: 'Family', color: 'fam' },
  ];
}

export function initial(name: string) {
  return (name.trim()[0] ?? '?').toUpperCase();
}

/** The kid whose day the unicorn opens. */
export function kidOf(members: MemberWithId[]) {
  return sortMembers(members).find((m) => m.isKid) ?? null;
}

/** The member signed in on this device, matched by Google account email. */
export function memberForEmail(members: MemberWithId[], email: string | null | undefined) {
  const e = email?.toLowerCase();
  return (e && members.find((m) => m.emails.includes(e))) || null;
}

/** "Cleo's day", using the kid's real name. */
export function kidDayTitle(kid: { name: string } | null) {
  return kid ? `${kid.name}'s day` : 'My day';
}
