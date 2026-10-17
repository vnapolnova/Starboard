import { useWeather } from './useWeather';
import { formatHighLow, formatTemp, shortPlace, skyFor, weatherLabel, type Sky } from './weather';
import './weather.css';

// Header weather icons in the style of design/tablet-mockup.html's sun-and-cloud.
const SUN = '#FFD166';
const CLOUD = '#EFE7FF';
const cloud = <path d="M22 52h28a10 10 0 0 0 0-20 13 13 0 0 0-25 4 8 8 0 0 0-3 16z" fill={CLOUD} />;
const sun = (
  <>
    <circle cx="24" cy="24" r="11" fill={SUN} />
    <g stroke={SUN} stroke-width="3" stroke-linecap="round">
      <path d="M24 4v5M24 39v5M4 24h5M39 24h5M10 10l3.5 3.5M34.5 34.5L38 38M10 38l3.5-3.5M34.5 13.5L38 10" />
    </g>
  </>
);
const moon = <path d="M30 8a17 17 0 1 0 18 22A14 14 0 0 1 30 8z" fill={SUN} />;
const bigCloud = (
  <path d="M14 46h34a11 11 0 0 0 0-22 15 15 0 0 0-29 4 9 9 0 0 0-5 18z" fill={CLOUD} />
);
const fall = (d: string, color: string) => (
  <g stroke={color} stroke-width="3" stroke-linecap="round">
    <path d={d} />
  </g>
);

function SkyIcon({ sky, isDay }: { sky: Sky; isDay: boolean }) {
  const body = {
    clear: isDay ? sun : moon,
    partly: (
      <>
        {isDay ? sun : moon}
        {cloud}
      </>
    ),
    cloudy: bigCloud,
    fog: (
      <>
        {bigCloud}
        {fall('M12 54h40M18 60h28', CLOUD)}
      </>
    ),
    rain: (
      <>
        {bigCloud}
        {fall('M22 52l-3 7M33 52l-3 7M44 52l-3 7', '#7CC8FF')}
      </>
    ),
    snow: (
      <>
        {bigCloud}
        <g fill="#fff">
          <circle cx="21" cy="55" r="2.5" />
          <circle cx="32" cy="59" r="2.5" />
          <circle cx="43" cy="55" r="2.5" />
        </g>
      </>
    ),
    storm: (
      <>
        {bigCloud}
        <path d="M34 44l-8 11h7l-4 9 11-13h-7l4-7z" fill={SUN} />
      </>
    ),
  }[sky];
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      {body}
    </svg>
  );
}

/** The header's weather slot: icon, temperature, high and low, and the town (spec §2). */
export function Weather({ hid }: { hid: string }) {
  const wx = useWeather(hid);
  // No reading yet (first load, or offline with nothing cached): an empty slot, never an error.
  if (!wx) return <div class="wx" />;
  const { reading: r, place, unit } = wx;
  return (
    <div class="wx" role="group" aria-label={weatherLabel(place, r, unit)}>
      <SkyIcon sky={skyFor(r.code)} isDay={r.isDay} />
      <div class="t" aria-hidden="true">
        {formatTemp(r.tempC, unit)}
      </div>
      <div class="d" aria-hidden="true">
        {formatHighLow(r, unit)}
      </div>
      <div class="loc" aria-hidden="true">
        {shortPlace(place)}
      </div>
    </div>
  );
}
