import { onSnapshot, query, where, type Query } from 'firebase/firestore';
import { useEffect, useState } from 'preact/hooks';
import { db } from '../lib/firebase';
import { completionsFrom, type ChoreWithId } from './chores';
import { col } from './db';
import { subscribeEvents } from './events';
import type { ChoreCompletion, DateKey, EventView, GroceryItem } from './types';

// Live Firestore data for the screens (plan §5: everything updates through
// onSnapshot). Each hook returns null until its first snapshot arrives.

function useQuery<T>(make: () => Query<T>, deps: unknown[]) {
  const [docs, setDocs] = useState<(T & { id: string })[] | null>(null);
  useEffect(() => {
    setDocs(null);
    return onSnapshot(make(), (snap) => setDocs(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, deps); // `make` is rebuilt each render; `deps` say when the query changes.
  return docs;
}

export function useEvents(hid: string) {
  const [events, setEvents] = useState<EventView[] | null>(null);
  useEffect(() => subscribeEvents(db, hid, setEvents), [hid]);
  return events;
}

export function useChores(hid: string): ChoreWithId[] | null {
  return useQuery(() => col(hid, 'chores'), [hid]);
}

/** Check-offs from `from` on. */
function useCompletionsFrom(hid: string, from: DateKey): ChoreCompletion[] | null {
  return useQuery(
    () => query(col(hid, 'choreCompletions'), where('date', '>=', from)),
    [hid, from],
  );
}

/** Every check-off of these chores, however old; for once chores. */
function useCompletionsOf(hid: string, choreIds: string[]): ChoreCompletion[] | null {
  const key = [...choreIds].sort().join('\n');
  const [docs, setDocs] = useState<ChoreCompletion[] | null>(null);
  useEffect(() => {
    const ids = key ? key.split('\n') : [];
    // An "in" filter takes up to 30 values.
    const chunks: string[][] = [];
    for (let i = 0; i < ids.length; i += 30) chunks.push(ids.slice(i, i + 30));
    const got: (ChoreCompletion[] | undefined)[] = chunks.map(() => undefined);
    const emit = () => {
      if (got.every(Boolean)) setDocs(got.flatMap((g) => g ?? []));
    };
    setDocs(chunks.length ? null : []);
    const stops = chunks.map((chunk, i) =>
      onSnapshot(query(col(hid, 'choreCompletions'), where('choreId', 'in', chunk)), (snap) => {
        got[i] = snap.docs.map((d) => d.data());
        emit();
      }),
    );
    return () => stops.forEach((stop) => stop());
  }, [hid, key]);
  return docs;
}

/**
 * The chores and the check-offs that decide what shows on `day` (this week's
 * and this month's, plus every check-off of a once chore). Null until loaded.
 */
export function useChoreDay(hid: string, day: Date) {
  const chores = useChores(hid);
  const recent = useCompletionsFrom(hid, completionsFrom(day));
  const onceIds = (chores ?? []).filter((c) => c.repeat === 'once').map((c) => c.id);
  const once = useCompletionsOf(hid, onceIds);
  if (!chores || !recent || !once) return null;
  return { chores, completions: [...recent, ...once] };
}

export function useGrocery(hid: string): GroceryItem[] | null {
  return useQuery(() => col(hid, 'grocery'), [hid]);
}
