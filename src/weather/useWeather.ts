import { onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'preact/hooks';
import { docRef } from '../data/db';
import type { Settings } from '../data/types';
import {
  RETRY_MS,
  REFRESH_MS,
  cacheMatches,
  forecastUrl,
  msUntilRefresh,
  parseCached,
  parseForecast,
  type Cached,
} from './weather';

const KEY = 'starboard.weather';

// localStorage can throw (private mode, storage off); the header then just
// goes without a cache.
function readCache() {
  try {
    return parseCached(localStorage.getItem(KEY));
  } catch {
    return null;
  }
}

function writeCache(c: Cached) {
  try {
    localStorage.setItem(KEY, JSON.stringify(c));
  } catch {
    // No cache this time; the reading still shows.
  }
}

/** settings/main.weather, live. null until it loads, or if it can't. */
function useWeatherSettings(hid: string) {
  const [wx, setWx] = useState<Settings['weather'] | null>(null);
  useEffect(
    () =>
      onSnapshot(
        docRef(hid, 'settings', 'main'),
        (snap) => setWx(snap.data()?.weather ?? null),
        () => {}, // keep what we had; the header never shows an error
      ),
    [hid],
  );
  return wx;
}

/**
 * The header weather: the cached reading straight away, refreshed every 30
 * minutes. A failed fetch keeps the last reading and tries again in 5.
 */
export function useWeather(hid: string) {
  const settings = useWeatherSettings(hid);
  const [cached, setCached] = useState(readCache);
  const lat = settings?.lat;
  const lon = settings?.lon;

  useEffect(() => {
    if (lat === undefined || lon === undefined) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = (ms: number) => {
      clearTimeout(timer);
      if (!stopped) timer = setTimeout(() => void run(), ms);
    };
    const run = async () => {
      try {
        const res = await fetch(forecastUrl(lat, lon));
        const reading = res.ok ? parseForecast(await res.json()) : null;
        if (!reading) throw new Error(`Weather fetch failed (${res.status})`);
        const c: Cached = { lat, lon, fetchedAt: Date.now(), reading };
        writeCache(c);
        if (!stopped) setCached(c);
        schedule(REFRESH_MS);
      } catch {
        schedule(RETRY_MS);
      }
    };
    // Coming back online, or the screen waking, catches up if a refresh is due.
    const due = () => schedule(msUntilRefresh(readCache(), lat, lon, Date.now()));
    const onVisible = () => document.visibilityState === 'visible' && due();
    due();
    addEventListener('online', due);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      stopped = true;
      clearTimeout(timer);
      removeEventListener('online', due);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [lat, lon]);

  if (!settings || !cacheMatches(cached, settings.lat, settings.lon)) return null;
  return { reading: cached.reading, place: settings.place, unit: settings.unit };
}
