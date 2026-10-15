import { useEffect, useRef } from 'preact/hooks';
import type { User } from 'firebase/auth';
import { useMembers } from '../data/session';
import { Header, PhoneBar } from './Header';
import { PHONE_QUERY, useMediaQuery, useRoute } from './hooks';
import { kidDayTitle, kidOf, memberForEmail } from './people';
import { tabLabel } from './routes';
import { TabBar } from './TabBar';
import { View } from './Views';
import './shell.css';

/** The app shell: header, the current view and the bottom tabs (plan §5). */
export function Shell({ hid, user }: { hid: string; user: User }) {
  const members = useMembers(hid) ?? [];
  const [route, go] = useRoute();
  const phone = useMediaQuery(PHONE_QUERY);
  const main = useRef<HTMLElement>(null);
  const kid = kidOf(members);

  useEffect(() => {
    main.current?.scrollTo(0, 0);
  }, [route]);

  const headerProps = { members, kid, onKid: () => go('kid') };

  return (
    <div class={phone ? 'app phone' : 'app'}>
      {phone ? (
        <PhoneBar
          {...headerProps}
          title={tabLabel(route) ?? kidDayTitle(kid)}
          who={memberForEmail(members, user.email)?.name ?? null}
        />
      ) : (
        <Header {...headerProps} />
      )}
      <main ref={main}>
        <div id="view" role="tabpanel" aria-label={tabLabel(route) ?? kidDayTitle(kid)}>
          <View route={route} kid={kid} onBack={() => go('today')} />
        </div>
      </main>
      <TabBar route={route} onTab={go} />
    </div>
  );
}
