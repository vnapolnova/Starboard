import { describe, expect, it } from 'vitest';
import { detectOwners, type OwnerMember } from './owners.js';

const members: OwnerMember[] = [
  { id: 'alice', name: 'Alice', emails: ['alice@example.com'], nicknames: ['Mom'] },
  { id: 'bob', name: 'Bob', emails: ['Bob@Example.com'], nicknames: ['Dad'] },
  { id: 'cleo', name: 'Cleo', emails: ['cleo@example.com'], nicknames: ['Bug'] },
];

const title = (t: string) => detectOwners({ title: t }, members);

describe('detectOwners', () => {
  it('maps a guest email to its member', () => {
    expect(detectOwners({ title: 'Dentist', guestEmails: ['cleo@example.com'] }, members)).toEqual({
      ownerIds: ['cleo'],
      ownerSource: 'guests',
    });
  });

  it('gives several guests several owners, in member order, ignoring case', () => {
    const owners = detectOwners(
      { title: 'Zoo', guestEmails: ['cleo@example.com', 'BOB@example.com', 'friend@example.com'] },
      members,
    );
    expect(owners).toEqual({ ownerIds: ['bob', 'cleo'], ownerSource: 'guests' });
  });

  it('prefers guests over a name in the title', () => {
    const owners = detectOwners(
      { title: 'Alice: lunch', guestEmails: ['bob@example.com'] },
      members,
    );
    expect(owners).toEqual({ ownerIds: ['bob'], ownerSource: 'guests' });
  });

  it('falls back to the title when no guest is a member', () => {
    const owners = detectOwners(
      { title: 'Cleo – swim', guestEmails: ['coach@example.com'] },
      members,
    );
    expect(owners).toEqual({ ownerIds: ['cleo'], ownerSource: 'title' });
  });

  it.each(['Cleo – swim class', 'Cleo: swim', 'cleo swim', "Cleo's swim", 'Cleo', '  Cleo - swim'])(
    'matches a name at the start: %s',
    (t) => {
      expect(title(t)).toEqual({ ownerIds: ['cleo'], ownerSource: 'title' });
    },
  );

  it('matches a nickname at the start', () => {
    expect(title('Mom: haircut')).toEqual({ ownerIds: ['alice'], ownerSource: 'title' });
    expect(title('dad – dentist')).toEqual({ ownerIds: ['bob'], ownerSource: 'title' });
  });

  it('matches several names joined at the start', () => {
    expect(title('Alice & Bob: date night').ownerIds).toEqual(['alice', 'bob']);
    expect(title('Dad and Cleo – park').ownerIds).toEqual(['bob', 'cleo']);
  });

  it('does not match a name in the middle of the title', () => {
    expect(title('Swim class with Cleo')).toEqual({ ownerIds: [], ownerSource: 'family' });
    expect(title('Pick up Mom: airport')).toEqual({ ownerIds: [], ownerSource: 'family' });
  });

  it('does not match a name that is only the start of a longer word', () => {
    expect(title('Cleopatra exhibit').ownerSource).toBe('family');
    expect(title('Bobsled race').ownerSource).toBe('family');
  });

  it('falls back to Family when nothing matches', () => {
    expect(detectOwners({ title: 'Farmers market' }, members)).toEqual({
      ownerIds: [],
      ownerSource: 'family',
    });
    expect(detectOwners({}, members)).toEqual({ ownerIds: [], ownerSource: 'family' });
  });
});
