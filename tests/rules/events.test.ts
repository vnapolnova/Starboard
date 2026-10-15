import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { Timestamp, doc, setDoc, type Firestore } from 'firebase/firestore';
import { subscribeEvents } from '../../src/data/events';
import type { EventView } from '../../src/data/types';

// Reading events with overrides applied, signed in as the tablet.
const HID = 'home';
const TABLET = 'kitchen@example.com';

let env: RulesTestEnvironment;
let db: Firestore;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-starboard',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});

afterAll(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const admin = ctx.firestore() as unknown as Firestore;
    await setDoc(doc(admin, 'households', HID), { name: 'Home', allowedEmails: [TABLET] });
    const event = (title: string, hour: number, ownerIds: string[]) => ({
      title,
      start: Timestamp.fromDate(new Date(Date.UTC(2026, 9, 15, hour))),
      end: Timestamp.fromDate(new Date(Date.UTC(2026, 9, 15, hour + 1))),
      allDay: false,
      ownerIds,
      ownerSource: ownerIds.length ? 'title' : 'family',
    });
    await setDoc(doc(admin, `households/${HID}/events/swim`), event('Cleo – swim', 16, ['cleo']));
    await setDoc(doc(admin, `households/${HID}/events/market`), event('Market', 9, []));
  });
  db = env
    .authenticatedContext(TABLET, { email: TABLET, email_verified: true })
    .firestore() as unknown as Firestore;
});

function next(fn: (events: EventView[]) => boolean) {
  return new Promise<EventView[]>((resolve) => {
    const off = subscribeEvents(db, HID, (events) => {
      if (fn(events)) {
        off();
        resolve(events);
      }
    });
  });
}

describe('subscribeEvents', () => {
  it('returns events sorted by start', async () => {
    const events = await next((e) => e.length === 2);
    expect(events.map((e) => e.id)).toEqual(['market', 'swim']);
  });

  it('applies overrides over the detected owners', async () => {
    await setDoc(doc(db, `households/${HID}/eventOverrides/swim`), { ownerIds: ['alice', 'cleo'] });
    const events = await next((e) => e.some((x) => x.ownerSource === 'override'));
    expect(events.find((e) => e.id === 'swim')).toMatchObject({
      ownerIds: ['alice', 'cleo'],
      ownerSource: 'override',
    });
    expect(events.find((e) => e.id === 'market')).toMatchObject({
      ownerIds: [],
      ownerSource: 'family',
    });
  });
});
