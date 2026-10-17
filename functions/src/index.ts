import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { setGlobalOptions } from 'firebase-functions/v2';
import { defineSecret } from 'firebase-functions/params';
import { logger } from 'firebase-functions';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { googleCalendar } from './google.js';
import { syncHousehold } from './sync.js';

// Keeps a runaway function from scaling up costs.
setGlobalOptions({ region: 'us-central1', maxInstances: 2 });

initializeApp();

// Secret Manager names for the Family calendar's OAuth consent (plan §3).
// Change them here if the secrets are renamed.
const SECRET_NAMES = {
  clientId: 'GCAL_CLIENT_ID',
  clientSecret: 'GCAL_CLIENT_SECRET',
  refreshToken: 'GCAL_REFRESH_TOKEN',
} as const;

const clientId = defineSecret(SECRET_NAMES.clientId);
const clientSecret = defineSecret(SECRET_NAMES.clientSecret);
const refreshToken = defineSecret(SECRET_NAMES.refreshToken);

/** Mirrors the Family calendar into every household's events, every 5 minutes. */
export const syncCalendar = onSchedule(
  { schedule: 'every 5 minutes', secrets: [clientId, clientSecret, refreshToken] },
  async () => {
    const db = getFirestore();
    const api = googleCalendar({
      clientId: clientId.value(),
      clientSecret: clientSecret.value(),
      refreshToken: refreshToken.value(),
    });
    const households = await db.collection('households').listDocuments();
    for (const home of households) {
      try {
        const result = await syncHousehold(db, home.id, api);
        logger.info('Calendar sync', { hid: home.id, ...result });
      } catch (err) {
        // syncHousehold already saved a short copy to settings/main.calendar.error.
        // A nested Error serializes to {}, so log its full message instead.
        logger.error('Calendar sync failed', {
          hid: home.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  },
);
