import type { CalendarListEntry, GoogleEvent } from './calendar.js';
import type { CalendarApi } from './sync.js';

// The real Calendar API, through plain fetch with a refresh-token grant
// (calendar.readonly). Credentials come from Secret Manager (see index.ts).

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const API = 'https://www.googleapis.com/calendar/v3';

export interface GoogleCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

export function googleCalendar(creds: GoogleCredentials): CalendarApi {
  let token: Promise<string> | undefined;

  async function accessToken() {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      body: new URLSearchParams({
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
        refresh_token: creds.refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    if (!res.ok) throw new Error(`Token refresh failed: ${res.status} ${await res.text()}`);
    return ((await res.json()) as { access_token: string }).access_token;
  }

  /** Every page of a list endpoint. */
  async function list<T>(path: string, params: Record<string, string>) {
    token ??= accessToken();
    const items: T[] = [];
    let first: Record<string, unknown> | undefined;
    let pageToken: string | undefined;
    do {
      const qs = new URLSearchParams({ ...params, ...(pageToken ? { pageToken } : {}) });
      const res = await fetch(`${API}${path}?${qs}`, {
        headers: { authorization: `Bearer ${await token}` },
      });
      if (!res.ok) throw new Error(`GET ${path} failed: ${res.status} ${await res.text()}`);
      const page = (await res.json()) as { items?: T[]; nextPageToken?: string };
      first ??= page;
      items.push(...(page.items ?? []));
      pageToken = page.nextPageToken;
    } while (pageToken);
    return { items, first: first ?? {} };
  }

  return {
    async listCalendars() {
      return (await list<CalendarListEntry>('/users/me/calendarList', { maxResults: '250' })).items;
    },
    async listEvents(calendarId, timeMin, timeMax) {
      const { items, first } = await list<GoogleEvent>(
        `/calendars/${encodeURIComponent(calendarId)}/events`,
        {
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
          singleEvents: 'true',
          orderBy: 'startTime',
          maxResults: '2500',
        },
      );
      return { timeZone: (first.timeZone as string) || 'UTC', items };
    },
  };
}
