import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
  type DocumentData,
  type Firestore,
} from 'firebase/firestore';
import type { ActivityEntry } from './types';

// The one way the app writes family data (spec §6, plan §6). Each write runs in
// a transaction with its activity/{logId} entry, so the log always holds the
// exact before and after values and undo(logId) can put `before` back.
//
// Data passed here is copied into the log as-is, so use concrete values
// (Timestamp.now(), not serverTimestamp()) inside `data`.

export type Actor = ActivityEntry['actor'];

export type WriteOp =
  /** Create or fully replace the doc. */
  | { op: 'set'; data: DocumentData }
  /** Change only these fields, creating the doc if it's missing. */
  | { op: 'merge'; data: DocumentData }
  | { op: 'delete' };

export type WriteRequest = WriteOp & {
  actor: Actor;
  /** Short verb such as "chore.done" or "grocery.add". */
  action: string;
  /** Path of the doc relative to the household, e.g. "grocery/abc". */
  path: string;
};

export interface WriteResult {
  logId: string;
  before: DocumentData | null;
  after: DocumentData | null;
}

function householdDoc(db: Firestore, hid: string, path: string) {
  const parts = path.split('/');
  if (parts.length !== 2 || parts.some((p) => !p)) {
    throw new Error(`Expected a "collection/docId" path, got "${path}"`);
  }
  if (parts[0] === 'activity') throw new Error('The activity log is not written directly');
  return doc(db, 'households', hid, path);
}

/** A fresh doc path in a household collection, for creates: "grocery/<autoId>". */
export function newDocPath(db: Firestore, hid: string, coll: string) {
  return `${coll}/${doc(collection(db, 'households', hid, coll)).id}`;
}

/** Writes one doc and logs it to activity/{logId}. Returns the log ID for Undo. */
export async function logWrite(db: Firestore, hid: string, req: WriteRequest) {
  const target = householdDoc(db, hid, req.path);
  const logRef = doc(collection(db, 'households', hid, 'activity'));

  return runTransaction(db, async (tx): Promise<WriteResult> => {
    const snap = await tx.get(target);
    const before = snap.exists() ? snap.data() : null;

    let after: DocumentData | null;
    if (req.op === 'delete') {
      after = null;
      tx.delete(target);
    } else if (req.op === 'merge') {
      after = { ...before, ...req.data };
      tx.set(target, req.data, { merge: true });
    } else {
      after = req.data;
      tx.set(target, req.data);
    }

    tx.set(logRef, {
      ts: serverTimestamp(),
      actor: req.actor,
      action: req.action,
      path: req.path,
      before,
      after,
      undone: false,
    });
    return { logId: logRef.id, before, after };
  });
}

/**
 * Puts the doc back to its `before` value and marks the entry undone.
 * Returns false, changing nothing, if the entry is missing or already undone.
 */
export async function undo(db: Firestore, hid: string, logId: string) {
  const logRef = doc(db, 'households', hid, 'activity', logId);

  return runTransaction(db, async (tx) => {
    const snap = await tx.get(logRef);
    if (!snap.exists()) return false;
    const entry = snap.data() as ActivityEntry;
    if (entry.undone) return false;

    const target = householdDoc(db, hid, entry.path);
    if (entry.before === null) tx.delete(target);
    else tx.set(target, entry.before);

    tx.update(logRef, { undone: true });
    return true;
  });
}
