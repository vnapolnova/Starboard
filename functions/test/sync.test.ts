import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import type { CalendarListEntry, GoogleEvent } from '../src/calendar.js';
import { syncHousehold, type CalendarApi } from '../src/sync.js';

// The sync against the Firestore emulator, with fixture events in place of
// Google. Run with `npm run test:functions`.
const PROJECT = 'demo-starboard';
const HID = 'home';
const FAMILY_ID = 'fam123@group.calendar.google.com';
const NOW = new Date('2026-10-15T12:00:00Z');

let db: Firestore;

beforeAll(() => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Run under the Firestore emulator');
  db = getFirestore(initializeApp({ projectId: PROJECT }, 'sync-test'));
});

beforeEach(async () => {
  await fetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`,
    { method: 'DELETE' },
  );
  const home = db.collection('households').doc(HID);
  await home.set({ name: 'Home', allowedEmails: ['alice@example.com'] });
  const members = {
    alice: { name: 'Alice', emails: ['alice@example.com'], nicknames: ['Mom'] },
    bob: { name: 'Bob', emails: ['bob@example.com'], nicknames: ['Dad'] },
    cleo: { name: 'Cleo', emails: ['cleo@example.com'], nicknames: [] },
  };
  for (const [id, m] of Object.entries(members)) {
    await home
      .collection('members')
      .doc(id)
      .set({ ...m, color: 'p1', isKid: id === 'cleo' });
  }
  await home
    .collection('settings')
    .doc('main')
    .set({ weather: { place: 'Here' } });
});

const fixtures: GoogleEvent[] = [
  {
    id: 'swim',
    summary: 'Cleo – swim',
    start: { dateTime: '2026-10-15T16:00:00-04:00' },
    end: { dateTime: '2026-10-15T17:00:00-04:00' },
  },
  {
    id: 'zoo',
    summary: 'Zoo trip',
    start: { dateTime: '2026-10-17T10:00:00-04:00' },
    end: { dateTime: '2026-10-17T13:00:00-04:00' },
    attendees: [{ email: 'alice@example.com' }, { email: 'cleo@example.com' }],
  },
  {
    id: 'pickup',
    summary: 'Pick up Mom from the airport',
    start: { dateTime: '2026-10-18T18:00:00-04:00' },
    end: { dateTime: '2026-10-18T19:00:00-04:00' },
  },
  {
    id: 'fair',
    summary: 'Dad: fall fair',
    start: { date: '2026-10-19' },
    end: { date: '2026-10-20' },
  },
  { id: 'gone', status: 'cancelled' },
];

function fakeApi(calendars: CalendarListEntry[], items = fixtures) {
  const calls: { calendarId: string; timeMin: Date; timeMax: Date }[] = [];
  const api: CalendarApi = {
    listCalendars: async () => calendars,
    listEvents: async (calendarId, timeMin, timeMax) => {
      calls.push({ calendarId, timeMin, timeMax });
      return { timeZone: 'America/Detroit', items };
    },
  };
  return { api, calls };
}

const settings = async () =>
  (await db.doc(`households/${HID}/settings/main`).get()).data() as Record<string, unknown>;
const events = async () =>
  Object.fromEntries(
    (await db.collection(`households/${HID}/events`).get()).docs.map((d) => [d.id, d.data()]),
  );

describe('syncHousehold', () => {
  it('writes fixture events with the right owners', async () => {
    const { api } = fakeApi([{ id: FAMILY_ID, summary: 'Family' }]);
    const result = await syncHousehold(db, HID, api, NOW);
    expect(result).toEqual({ status: 'ok', calendarId: FAMILY_ID, written: 4, removed: 0 });

    const got = await events();
    expect(Object.keys(got).sort()).toEqual(['fair', 'pickup', 'swim', 'zoo']);
    expect(got.swim).toMatchObject({
      title: 'Cleo – swim',
      allDay: false,
      ownerIds: ['cleo'],
      ownerSource: 'title',
    });
    expect(got.swim.start.toDate()).toEqual(new Date('2026-10-15T20:00:00Z'));
    expect(got.zoo).toMatchObject({ ownerIds: ['alice', 'cleo'], ownerSource: 'guests' });
    expect(got.pickup).toMatchObject({ ownerIds: [], ownerSource: 'family' });
    expect(got.fair).toMatchObject({ allDay: true, ownerIds: ['bob'], ownerSource: 'title' });
    expect(got.fair.start.toDate()).toEqual(new Date('2026-10-19T04:00:00Z'));
  });

  it('finds the Family calendar and saves it to settings', async () => {
    const { api, calls } = fakeApi([
      { id: 'me@example.com', summary: 'me@example.com' },
      { id: FAMILY_ID, summary: 'family' },
    ]);
    await syncHousehold(db, HID, api, NOW);
    expect(await settings()).toEqual({
      weather: { place: 'Here' },
      calendar: { id: FAMILY_ID, name: 'family', status: 'ok' },
    });
    expect(calls[0].calendarId).toBe(FAMILY_ID);
  });

  it('uses a saved calendar ID without listing calendars', async () => {
    await db
      .doc(`households/${HID}/settings/main`)
      .set({ calendar: { id: 'picked', name: 'Ours', status: 'ok' } });
    const { api, calls } = fakeApi([]);
    api.listCalendars = async () => {
      throw new Error('should not list');
    };
    await syncHousehold(db, HID, api, NOW);
    expect(calls.map((c) => c.calendarId)).toEqual(['picked']);
  });

  it('saves only not_found when no calendar is named Family', async () => {
    const { api, calls } = fakeApi([{ id: 'w', summary: 'Work' }]);
    expect(await syncHousehold(db, HID, api, NOW)).toEqual({ status: 'not_found' });
    expect(await settings()).toEqual({
      weather: { place: 'Here' },
      calendar: { status: 'not_found' },
    });
    expect(calls).toEqual([]);
    expect(await events()).toEqual({});
  });

  it('saves only ambiguous when several calendars are named Family', async () => {
    const { api } = fakeApi([
      { id: 'a', summary: 'Family' },
      { id: 'b', summary: 'FAMILY' },
    ]);
    expect(await syncHousehold(db, HID, api, NOW)).toEqual({ status: 'ambiguous' });
    expect(await settings()).toEqual({
      weather: { place: 'Here' },
      calendar: { status: 'ambiguous' },
    });
  });

  it('removes events that are no longer on the calendar', async () => {
    const { api } = fakeApi([{ id: FAMILY_ID, summary: 'Family' }]);
    await syncHousehold(db, HID, api, NOW);
    const { api: later } = fakeApi([], fixtures.slice(0, 2));
    const result = await syncHousehold(db, HID, later, NOW);
    expect(result).toMatchObject({ written: 2, removed: 2 });
    expect(Object.keys(await events()).sort()).toEqual(['swim', 'zoo']);
  });

  it('asks for a week back and two weeks ahead', async () => {
    const { api, calls } = fakeApi([{ id: FAMILY_ID, summary: 'Family' }]);
    await syncHousehold(db, HID, api, NOW);
    expect(calls[0].timeMin).toEqual(new Date('2026-10-08T12:00:00Z'));
    expect(calls[0].timeMax).toEqual(new Date('2026-10-29T12:00:00Z'));
  });
});
