import { collection, onSnapshot, type Firestore } from 'firebase/firestore';
import type { CalendarEvent, EventOverride, EventView } from './types';

// Events are mirrored from Google Calendar by the sync function; corrections
// made in the app live in eventOverrides/{eventId} and win on read (spec §7).

export function applyOverride(
  id: string,
  event: CalendarEvent,
  override?: EventOverride,
): EventView {
  const view: EventView = { id, ...event, special: override?.special ?? false };
  if (override?.ownerIds) {
    view.ownerIds = override.ownerIds;
    view.ownerSource = 'override';
  }
  if (override?.pic) view.pic = override.pic;
  return view;
}

/** Live events with overrides applied, sorted by start. Returns the unsubscribe. */
export function subscribeEvents(
  db: Firestore,
  hid: string,
  onChange: (events: EventView[]) => void,
) {
  let events: Map<string, CalendarEvent> | undefined;
  let overrides: Map<string, EventOverride> | undefined;

  const emit = () => {
    if (!events || !overrides) return; // Wait for both first snapshots.
    const list = [...events].map(([id, e]) => applyOverride(id, e, overrides!.get(id)));
    onChange(list.sort((a, b) => a.start.toMillis() - b.start.toMillis()));
  };

  const offEvents = onSnapshot(collection(db, 'households', hid, 'events'), (snap) => {
    events = new Map(snap.docs.map((d) => [d.id, d.data() as CalendarEvent]));
    emit();
  });
  const offOverrides = onSnapshot(collection(db, 'households', hid, 'eventOverrides'), (snap) => {
    overrides = new Map(snap.docs.map((d) => [d.id, d.data() as EventOverride]));
    emit();
  });
  return () => {
    offEvents();
    offOverrides();
  };
}
