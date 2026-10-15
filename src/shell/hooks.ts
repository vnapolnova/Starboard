import { useEffect, useState } from 'preact/hooks';
import { msToNextMinute } from './format';
import { parseHash, type Route } from './routes';

/** The current route; follows the location hash. */
export function useRoute(): [Route, (r: Route) => void] {
  const [route, setRoute] = useState(() => parseHash(location.hash));
  useEffect(() => {
    const on = () => setRoute(parseHash(location.hash));
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  return [route, (r) => (location.hash = r)];
}

/** The current time, updated as each minute starts. */
export function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setTimeout(() => setNow(new Date()), msToNextMinute(now));
    return () => clearTimeout(t);
  }, [now]);
  return now;
}

export function useMediaQuery(q: string) {
  const [match, setMatch] = useState(() => matchMedia(q).matches);
  useEffect(() => {
    const mql = matchMedia(q);
    const on = () => setMatch(mql.matches);
    on();
    mql.addEventListener('change', on);
    return () => mql.removeEventListener('change', on);
  }, [q]);
  return match;
}

/** Phone layout below the mockup's 520px breakpoint; the tablet is 600 wide. */
export const PHONE_QUERY = '(max-width: 520px)';
