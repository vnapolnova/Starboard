import { useEffect, useRef } from 'preact/hooks';
import type { EventView } from '../data/types';
import { eventWhen } from './week';

// The event detail sheet (spec §4), as #evSheet in design/tablet-mockup.html.
// Phase 1 shows only what the calendar has: the date and time, and the place.
// It's read-only, so there's nothing to log or undo. Escape, Close or a tap on
// the backdrop closes it, and focus goes back to the event that opened it.

export function EventSheet({ event, onClose }: { event: EventView; onClose: () => void }) {
  const close = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    close.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    addEventListener('keydown', onKey);
    return () => {
      removeEventListener('keydown', onKey);
      opener?.focus?.();
    };
  }, []);

  return (
    <div
      class="sheet"
      role="dialog"
      aria-modal="true"
      aria-labelledby="evTitle"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div class="card">
        <h2 id="evTitle">{event.title || '(No title)'}</h2>
        <p class="evwhen">{eventWhen(event)}</p>
        {event.location && <p class="evwhere">{event.location}</p>}
        <div class="acts">
          <button type="button" class="btn ghost" ref={close} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
