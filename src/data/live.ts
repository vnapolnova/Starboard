import { onSnapshot, query, where, type Query } from 'firebase/firestore';
import { useEffect, useState } from 'preact/hooks';
import { db } from '../lib/firebase';
import type { ChoreWithId } from './chores';
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

/** Check-offs for one day. */
export function useCompletions(hid: string, date: DateKey): ChoreCompletion[] | null {
  return useQuery(
    () => query(col(hid, 'choreCompletions'), where('date', '==', date)),
    [hid, date],
  );
}

export function useGrocery(hid: string): GroceryItem[] | null {
  return useQuery(() => col(hid, 'grocery'), [hid]);
}
