// Seeds a household from a local JSON file: the household doc and its
// allow-list, members, settings, chores and both routines (plan §2).
//
//   npm run seed                      → emulator, seed.local.json (falls back to seed.example.json)
//   npm run seed -- --file other.json → emulator, another file
//   npm run seed -- --prod            → the real project from .firebaserc
//
// --prod uses Application Default Credentials: run
// `gcloud auth application-default login` first. Docs in the file are
// overwritten; other docs (completions, grocery, activity) are left alone.
// The file holds family data, so keep it out of git (seed.local.json is ignored).
import { existsSync, readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const { values: args } = parseArgs({
  options: {
    file: { type: 'string' },
    prod: { type: 'boolean', default: false },
  },
});

const file = args.file ?? (existsSync('seed.local.json') ? 'seed.local.json' : 'seed.example.json');
const seed = JSON.parse(readFileSync(file, 'utf8'));

const COLORS = ['p1', 'p2', 'kid', 'fam'];
const REPEATS = ['daily', 'weekdays', 'weekly', 'once'];
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

function check(ok, message) {
  if (!ok) {
    console.error(`${file}: ${message}`);
    process.exit(1);
  }
}

const lower = (emails = []) => emails.map((e) => e.trim().toLowerCase());

check(typeof seed.householdId === 'string' && seed.householdId, 'householdId is required');
check(seed.household?.allowedEmails?.length, 'household.allowedEmails needs at least one email');
const memberIds = new Set((seed.members ?? []).map((m) => m.id));
for (const m of seed.members ?? []) {
  check(m.id && m.name, 'every member needs an id and a name');
  check(COLORS.includes(m.color), `member ${m.id}: color must be one of ${COLORS.join(', ')}`);
}
for (const c of seed.chores ?? []) {
  check(c.id && c.name, 'every chore needs an id and a name');
  check(memberIds.has(c.memberId), `chore ${c.id}: unknown memberId "${c.memberId}"`);
  check(REPEATS.includes(c.repeat), `chore ${c.id}: repeat must be one of ${REPEATS.join(', ')}`);
}
for (const [kind, steps] of Object.entries(seed.routines ?? {})) {
  check(['weekday', 'weekend'].includes(kind), `routines.${kind}: use weekday or weekend`);
  for (const s of steps) check(TIME.test(s.start), `routines.${kind}: "${s.start}" is not HH:MM`);
}

if (args.prod) {
  const rc = JSON.parse(readFileSync('.firebaserc', 'utf8'));
  initializeApp({ projectId: rc.projects.default });
  console.log(`Seeding the REAL project ${rc.projects.default} from ${file}`);
} else {
  process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
  initializeApp({ projectId: 'demo-starboard' });
  console.log(`Seeding the emulator (${process.env.FIRESTORE_EMULATOR_HOST}) from ${file}`);
}

const db = getFirestore();
const home = db.collection('households').doc(seed.householdId);
const batch = db.batch();

batch.set(home, {
  name: seed.household.name ?? 'Home',
  allowedEmails: lower(seed.household.allowedEmails),
});
for (const { id, ...m } of seed.members ?? []) {
  batch.set(home.collection('members').doc(id), {
    name: m.name,
    color: m.color,
    emails: lower(m.emails),
    nicknames: m.nicknames ?? [],
    isKid: Boolean(m.isKid),
  });
}
if (seed.settings) batch.set(home.collection('settings').doc('main'), seed.settings);
for (const { id, ...c } of seed.chores ?? []) {
  batch.set(home.collection('chores').doc(id), c);
}
for (const [kind, steps] of Object.entries(seed.routines ?? {})) {
  batch.set(home.collection('routines').doc(kind), { steps });
}

await batch.commit();
console.log(
  `Done: household "${seed.householdId}", ${memberIds.size} members, ` +
    `${seed.chores?.length ?? 0} chores, ${Object.keys(seed.routines ?? {}).length} routines.`,
);
