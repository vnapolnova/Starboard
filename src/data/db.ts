import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  where,
  type CollectionReference,
  type DocumentReference,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Collections, Household } from './types';

// Typed references for the collections in src/data/types.ts. App writes should
// go through the activity-log helper (plan §6), not straight through these refs.

export type CollectionName = keyof Collections;

export function householdRef(hid: string) {
  return doc(db, 'households', hid) as DocumentReference<Household>;
}

export function col<K extends CollectionName>(hid: string, name: K) {
  return collection(db, 'households', hid, name) as CollectionReference<Collections[K]>;
}

export function docRef<K extends CollectionName>(hid: string, name: K, id: string) {
  return doc(db, 'households', hid, name, id) as DocumentReference<Collections[K]>;
}

/** The household whose allow-list has this account, or null if it isn't on one. */
export async function findHousehold(email: string) {
  const snap = await getDocs(
    query(
      collection(db, 'households') as CollectionReference<Household>,
      where('allowedEmails', 'array-contains', email.toLowerCase()),
      limit(1),
    ),
  );
  const found = snap.docs[0];
  return found ? { id: found.id, ...found.data() } : null;
}
