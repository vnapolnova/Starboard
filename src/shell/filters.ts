import { useEffect, useState } from 'preact/hooks';
import { FAMILY } from './people';

// Person filters from the header chips (spec §2). One store for the whole app,
// so a chip turned off on Today stays off on Calendar. It's view state on this
// device only: nothing is written to Firestore, so there's nothing to undo.

type Listener = () => void;

const hidden = new Set<string>();
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l();
}

/** Whether this chip (member ID or FAMILY) is on. Chips start on. */
export function isShown(id: string) {
  return !hidden.has(id);
}

export function toggleFilter(id: string) {
  if (hidden.has(id)) hidden.delete(id);
  else hidden.add(id);
  emit();
}

export function resetFilters() {
  hidden.clear();
  emit();
}

/**
 * Whether an event with these owners passes the filters: shown if any of its
 * owners is on. No owners means Family.
 */
export function showsOwners(ownerIds: string[]) {
  return ownerIds.length ? ownerIds.some(isShown) : isShown(FAMILY);
}

export function subscribeFilters(l: Listener) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/** Re-renders the component when any chip changes. Returns a change counter. */
export function useFilters() {
  const [version, setVersion] = useState(0);
  useEffect(() => subscribeFilters(() => setVersion((v) => v + 1)), []);
  return version;
}
