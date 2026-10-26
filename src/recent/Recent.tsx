import { useState } from 'preact/hooks';
import { undo } from '../data/activity';
import { useChores, useRecentActivity, type ActivityWithId } from '../data/live';
import { db } from '../lib/firebase';
import { useNow } from '../shell/hooks';
import type { MemberWithId } from '../shell/people';
import { toast } from '../ui/toast-store';
import { describeWhat, describeWhen, describeWho } from './describe';
import './recent.css';

// The phone's Recent changes (spec §6): the newest changes from any device,
// each with Undo. Undo puts the doc back as it was before that change, and
// every screen updates live. Phone only; the tablet has its Undo toast.

export function Recent({ hid, members }: { hid: string; members: MemberWithId[] }) {
  const entries = useRecentActivity(hid);
  const chores = useChores(hid);
  const now = useNow();
  const [busy, setBusy] = useState<string | null>(null);
  const choreNames = new Map((chores ?? []).map((c) => [c.id, c.name]));

  const onUndo = async (entry: ActivityWithId) => {
    setBusy(entry.id);
    try {
      toast((await undo(db, hid, entry.id)) ? 'Undone' : 'That was already undone');
    } catch (e) {
      console.error('Undo failed', e);
      toast("Couldn't undo that. Try again.");
    } finally {
      setBusy(null);
    }
  };

  if (!entries) return null;
  return (
    <>
      <p class="hint recent-hint">
        Changes from the kitchen screen and phones, newest first. Undo puts it back the way it was.
      </p>
      {entries.length ? (
        <ul class="list card recent">
          {entries.map((e) => (
            <li key={e.id} class={e.undone ? 'item undone' : 'item'}>
              <span class="txt">
                <span class="nm">{describeWhat(e, choreNames)}</span>
                <span class="mt">
                  {describeWho(e, members)}
                  {e.ts && ` · ${describeWhen(e.ts.toDate(), now)}`}
                </span>
              </span>
              {e.undone ? (
                <span class="state">Undone</span>
              ) : (
                <button
                  type="button"
                  class="btn text"
                  disabled={busy === e.id}
                  onClick={() => void onUndo(e)}
                >
                  Undo
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p class="empty">No changes yet.</p>
      )}
    </>
  );
}
