// Header clock and date, as in design/tablet-mockup.html: "7:42" + "am",
// "Wednesday, October 14". Uses the device's local time zone.

export function clockParts(d: Date) {
  const h = d.getHours();
  return {
    time: `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')}`,
    ampm: h >= 12 ? 'pm' : 'am',
  };
}

export function longDate(d: Date) {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

/** Milliseconds until the next minute starts, so the clock flips on time. */
export function msToNextMinute(d: Date) {
  return 60_000 - (d.getSeconds() * 1000 + d.getMilliseconds());
}
