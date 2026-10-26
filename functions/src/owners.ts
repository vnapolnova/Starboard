// Works out whose event it is (spec §7): guest emails first, then a name or
// nickname at the start of the title, otherwise Family (no owners).

export type OwnerSource = 'guests' | 'title' | 'family';

export interface OwnerMember {
  id: string;
  name: string;
  emails?: string[];
  nicknames?: string[];
}

export interface Owners {
  /** Member IDs. Empty means Family. */
  ownerIds: string[];
  ownerSource: OwnerSource;
}

// Joins two or more names at the start: "Alice & Bob: dinner", "Mom and Cleo – zoo".
const JOINER = /^\s*(?:&|\+|,|and\b)\s*/iu;
const LETTER = /[\p{L}\p{N}]/u;
// The "special" markers (spec §4 Cleo's day): ⭐ anywhere, or * at the start.
// The app reads them; owner detection looks past them ("⭐ Cleo – zoo").
const MARKERS = /⭐\uFE0F?|^\s*\*/gu;

export function detectOwners(
  event: { title?: string; guestEmails?: string[] },
  members: OwnerMember[],
): Owners {
  const byGuests = ownersFromGuests(event.guestEmails ?? [], members);
  if (byGuests.length) return { ownerIds: byGuests, ownerSource: 'guests' };

  const byTitle = ownersFromTitle((event.title ?? '').replace(MARKERS, ''), members);
  if (byTitle.length) return { ownerIds: byTitle, ownerSource: 'title' };

  return { ownerIds: [], ownerSource: 'family' };
}

function ownersFromGuests(guestEmails: string[], members: OwnerMember[]) {
  const guests = new Set(guestEmails.map((e) => e.trim().toLowerCase()));
  // Member order, so the colors come out the same way every sync.
  return members
    .filter((m) => (m.emails ?? []).some((e) => guests.has(e.trim().toLowerCase())))
    .map((m) => m.id);
}

/** Names (and nicknames) at the very start of the title, as whole words. */
function ownersFromTitle(title: string, members: OwnerMember[]) {
  // Longest first, so "Ali" never wins over "Alice".
  const names = members
    .flatMap((m) => [m.name, ...(m.nicknames ?? [])].map((n) => ({ id: m.id, n: n.trim() })))
    .filter(({ n }) => n)
    .sort((a, b) => b.n.length - a.n.length);

  const found: string[] = [];
  let rest = title.trimStart();
  for (;;) {
    const hit = names.find(({ n }) => startsWithWord(rest, n));
    if (!hit) break;
    if (!found.includes(hit.id)) found.push(hit.id);
    rest = rest.slice(hit.n.length);
    const joiner = JOINER.exec(rest);
    if (!joiner) break;
    rest = rest.slice(joiner[0].length);
  }
  return found;
}

function startsWithWord(text: string, word: string) {
  if (text.slice(0, word.length).toLowerCase() !== word.toLowerCase()) return false;
  const next = text.charAt(word.length);
  return !next || !LETTER.test(next);
}
