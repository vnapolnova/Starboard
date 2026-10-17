import type { User } from 'firebase/auth';
import {
  choresFor,
  dateKey,
  finishesList,
  setChoreDone,
  type ChoreDay,
  type ChoreWithId,
} from '../data/chores';
import { db } from '../lib/firebase';
import { memberForEmail, type MemberWithId } from '../shell/people';
import { sparkle } from '../ui/sparkle';
import { toast } from '../ui/toast-store';

// A chore's check-off row (.chk in the mockup), shared by Today and Chores, and
// what a tap does: tick it for today or untick it, through the activity log.
// The toast is a short message with no Undo: a chore stays on the list, so
// tapping it again is the undo (owner's call on #37). Ticking one of the kid's chores sparkles, and the last
// one of the day gets the big burst.

export interface ChoreContext {
  hid: string;
  user: User;
  members: MemberWithId[];
  phone: boolean;
  /** Every chore showing today, to tell when the kid's list is finished. */
  today: ChoreDay[];
}

async function toggle(ctx: ChoreContext, item: ChoreDay, el: Element) {
  const { chore, done } = item;
  const owner = ctx.members.find((m) => m.id === chore.memberId);
  const device = ctx.phone ? 'phone' : 'tablet';
  if (!done && owner?.isKid) {
    sparkle(el, finishesList(choresFor(ctx.today, owner.id), chore.id));
  }
  try {
    await setChoreDone(db, ctx.hid, {
      actor: { email: ctx.user.email ?? '', device },
      doneBy: memberForEmail(ctx.members, ctx.user.email)?.id ?? device,
      choreId: chore.id,
      // Untick the check-off that counts, which for a weekly chore may be an earlier day.
      date: done ? done.date : dateKey(new Date()),
      done: !done,
    });
    toast(message(chore, owner, !done));
  } catch (e) {
    console.error('Chore check-off failed', e);
    toast("Couldn't save that. Try again.");
  }
}

function message(chore: ChoreWithId, owner: MemberWithId | undefined, ticked: boolean) {
  if (!ticked) return `Unchecked ${chore.name}`;
  if (owner?.isKid) return 'Yay! You got a sticker ⭐';
  if (owner) return `Nice, ${owner.name}! +1 star`;
  return `Done: ${chore.name}`;
}

/** A picture for one of the kid's chores: an emoji, or an image URL. */
function Pic({ pic }: { pic: string }) {
  if (/^(https?:)?\/\//.test(pic) || pic.startsWith('/')) {
    return <img class="emo" src={pic} alt="" />;
  }
  return (
    <span class="emo" aria-hidden="true">
      {pic}
    </span>
  );
}

export function ChoreRow({
  ctx,
  item,
  showTag,
}: {
  ctx: ChoreContext;
  item: ChoreDay;
  /** The owner's color dot, for lists that mix people (Today). */
  showTag?: boolean;
}) {
  const { chore, done } = item;
  const owner = ctx.members.find((m) => m.id === chore.memberId);
  return (
    <button
      type="button"
      class={owner?.isKid ? 'chk kid' : 'chk'}
      role="checkbox"
      aria-checked={!!done}
      onClick={(e) => void toggle(ctx, item, e.currentTarget)}
    >
      <span class="box" aria-hidden="true" />
      {chore.pic && <Pic pic={chore.pic} />}
      <span class="lbl">{chore.name}</span>
      {showTag && (
        <span
          class="tag"
          style={{ background: `var(--${owner?.color ?? 'fam'})` }}
          aria-hidden="true"
        />
      )}
    </button>
  );
}
