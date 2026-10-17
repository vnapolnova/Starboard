import type { Settings } from '../data/types';

// Header weather (plan §4, spec §2): Open-Meteo on the client, no API key.
// Always fetched in °C and converted here, so switching the unit in settings
// needs no refetch. The last good result is cached, so offline shows that.

export type Unit = Settings['weather']['unit'];

/** One reading, in °C. high and low are for today in the location's time zone. */
export interface Reading {
  tempC: number;
  highC: number;
  lowC: number;
  /** WMO weather code from Open-Meteo. */
  code: number;
  isDay: boolean;
}

export interface Cached {
  lat: number;
  lon: number;
  /** Epoch ms of the fetch. */
  fetchedAt: number;
  reading: Reading;
}

export const REFRESH_MS = 30 * 60_000;
/** After a failed fetch (offline, say), try again sooner than the full 30 minutes. */
export const RETRY_MS = 5 * 60_000;

export function forecastUrl(lat: number, lon: number) {
  const q = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: 'temperature_2m,weather_code,is_day',
    daily: 'temperature_2m_max,temperature_2m_min',
    timezone: 'auto',
    forecast_days: '1',
  });
  return `https://api.open-meteo.com/v1/forecast?${q}`;
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** The reading from an Open-Meteo forecast response, or null if it's not usable. */
export function parseForecast(json: unknown): Reading | null {
  const j = json as {
    current?: { temperature_2m?: unknown; weather_code?: unknown; is_day?: unknown };
    daily?: { temperature_2m_max?: unknown[]; temperature_2m_min?: unknown[] };
  } | null;
  const tempC = j?.current?.temperature_2m;
  const code = j?.current?.weather_code;
  const highC = j?.daily?.temperature_2m_max?.[0];
  const lowC = j?.daily?.temperature_2m_min?.[0];
  if (!isNum(tempC) || !isNum(highC) || !isNum(lowC)) return null;
  return {
    tempC,
    highC,
    lowC,
    code: isNum(code) ? code : 0,
    isDay: j?.current?.is_day !== 0,
  };
}

export function toUnit(c: number, unit: Unit) {
  return unit === 'F' ? (c * 9) / 5 + 32 : c;
}

/** "54°", rounded, as in design/tablet-mockup.html. */
export function formatTemp(c: number, unit: Unit) {
  // + 0 turns -0 into 0, so a reading just below zero shows "0°", not "-0°".
  return `${Math.round(toUnit(c, unit)) + 0}°`;
}

export function formatHighLow(r: Reading, unit: Unit) {
  return `High ${formatTemp(r.highC, unit)} · Low ${formatTemp(r.lowC, unit)}`;
}

/** "Rochester, MI" → "Rochester": the header has room for the town only. */
export function shortPlace(place: string) {
  return place.split(',')[0].trim();
}

export type Sky = 'clear' | 'partly' | 'cloudy' | 'fog' | 'rain' | 'snow' | 'storm';

/** Groups the WMO codes Open-Meteo returns into the header's icons. */
export function skyFor(code: number): Sky {
  if (code === 0) return 'clear';
  if (code <= 2) return 'partly';
  if (code === 3) return 'cloudy';
  if (code === 45 || code === 48) return 'fog';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if (code >= 95) return 'storm';
  if (code >= 51 && code <= 82) return 'rain';
  return 'cloudy';
}

const SKY_WORDS: Record<Sky, string> = {
  clear: 'Clear',
  partly: 'Partly cloudy',
  cloudy: 'Cloudy',
  fog: 'Fog',
  rain: 'Rain',
  snow: 'Snow',
  storm: 'Thunderstorm',
};

/** Spoken summary for screen readers, e.g. "Weather in Rochester: Clear, 54°, High 61° · Low 43°". */
export function weatherLabel(place: string, r: Reading, unit: Unit) {
  const where = shortPlace(place);
  return `Weather${where ? ` in ${where}` : ''}: ${SKY_WORDS[skyFor(r.code)]}, ${formatTemp(r.tempC, unit)}, ${formatHighLow(r, unit)}`;
}

/** The cache only counts for the same spot; a new location shouldn't show the old town's weather. */
export function cacheMatches(c: Cached | null, lat: number, lon: number): c is Cached {
  return !!c && Math.abs(c.lat - lat) < 0.01 && Math.abs(c.lon - lon) < 0.01;
}

/** Milliseconds until the next fetch is due: now if there's no matching cache. */
export function msUntilRefresh(c: Cached | null, lat: number, lon: number, now: number) {
  if (!cacheMatches(c, lat, lon)) return 0;
  return Math.max(0, c.fetchedAt + REFRESH_MS - now);
}

export function parseCached(raw: string | null): Cached | null {
  if (!raw) return null;
  try {
    const c = JSON.parse(raw) as Partial<Cached>;
    const reading = parseReading(c.reading);
    if (!isNum(c.lat) || !isNum(c.lon) || !isNum(c.fetchedAt) || !reading) return null;
    return { lat: c.lat, lon: c.lon, fetchedAt: c.fetchedAt, reading };
  } catch {
    return null;
  }
}

function parseReading(r: unknown): Reading | null {
  const x = r as Partial<Reading> | undefined;
  if (!x || !isNum(x.tempC) || !isNum(x.highC) || !isNum(x.lowC) || !isNum(x.code)) return null;
  return { tempC: x.tempC, highC: x.highC, lowC: x.lowC, code: x.code, isDay: x.isDay !== false };
}
