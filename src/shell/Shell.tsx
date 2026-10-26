import { useEffect, useRef } from 'preact/hooks';
import type { User } from 'firebase/auth';
import { useMembers } from '../data/session';
import { Header, PhoneBar } from './Header';
import { PHONE_QUERY, useMediaQuery, useRoute } from './hooks';
import { kidDayTitle, kidOf, memberForEmail } from './people';
import { tabLabel, type Route } from './routes';
import { TabBar } from './TabBar';
import { View } from './Views';
import './shell.css';

/** The app shell: header, the current view and the bottom tabs (plan §5). */
export function Shell({ hid, user }: { hid: string; user: User }) {
  const members = useMembers(hid) ?? [];
  const [hashRoute, go] = useRoute();
  const phone = useMediaQuery(PHONE_QUERY);
  const main = useRef<HTMLElement>(null);
  const kid = kidOf(members);
  // Recent changes is phone only; the tablet has its Undo toast instead.
  const route = hashRoute === 'recent' && !phone ? 'today' : hashRoute;
  const recent = route === 'recent';
  // Where Back on Recent changes returns to.
  const lastRoute = useRef<Route>('today');
  if (!recent) lastRoute.current = route;
  const title = recent ? 'Recent changes' : (tabLabel(route) ?? kidDayTitle(kid));

  useEffect(() => {
    main.current?.scrollTo(0, 0);
  }, [route]);

  const headerProps = { members, kid, onKid: () => go('kid') };

  return (
    <div class={phone ? 'app phone' : 'app'}>
      {phone ? (
        <PhoneBar
          {...headerProps}
          title={title}
          who={memberForEmail(members, user.email)?.name ?? null}
          onRecent={recent ? undefined : () => go('recent')}
          onBack={recent ? () => go(lastRoute.current) : undefined}
        />
      ) : (
        <Header {...headerProps} hid={hid} />
      )}
      <main ref={main}>
        <div id="view" role="tabpanel" aria-label={title}>
          <View
            route={route}
            hid={hid}
            user={user}
            members={members}
            kid={kid}
            phone={phone}
            go={go}
          />
        </div>
      </main>
      {!recent && <TabBar route={route} onTab={go} />}
    </div>
  );
}
