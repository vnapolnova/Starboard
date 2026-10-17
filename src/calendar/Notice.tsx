import type { CalendarNotice as Notice } from './week';
import './calendar.css';

// The short notice shown when the calendar can't be used (spec §7). Read-only:
// fixing it happens in Google Calendar or on the phone, not on the tablet.

export function CalendarNotice({ notice }: { notice: Notice }) {
  return (
    <div class="notice" role="status">
      <b>{notice.text}</b>
      <span>{notice.hint}</span>
    </div>
  );
}
