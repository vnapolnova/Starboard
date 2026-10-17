import type { User } from 'firebase/auth';
import { useState } from 'preact/hooks';
import {
  CART,
  grocerySections,
  parseVoice,
  sourceLabel,
  type GroceryWithId,
} from '../data/grocery';
import { useGrocery } from '../data/live';
import type { MemberWithId } from '../shell/people';
import { toast } from '../ui/toast-store';
import { addItems, clearItems, toggleItem, type GroceryContext } from './actions';
import { NOT_CAUGHT, useVoice } from './voice';
import './grocery.css';

// The Grocery tab (spec §4 Grocery), as #v-grocery in design/tablet-mockup.html:
// add by typing or by voice, open items by category, then "In the cart" with
// Clear, the one delete the tablet has (owner's call on #40, spec §6).

interface Props {
  hid: string;
  user: User;
  members: MemberWithId[];
  phone: boolean;
}

export function Grocery({ hid, user, members, phone }: Props) {
  const items = useGrocery(hid);
  const [text, setText] = useState('');
  const ctx: GroceryContext = { hid, user, members, phone, items: items ?? [] };

  function submit(e: Event) {
    e.preventDefault();
    if (!items || !text.trim()) return;
    void addItems(ctx, [text], 'typed');
    setText('');
  }

  return (
    <>
      <h2>Grocery list</h2>
      <form class="add" onSubmit={submit}>
        <input
          value={text}
          onInput={(e) => setText(e.currentTarget.value)}
          placeholder="Add an item"
          aria-label="Add an item"
          enterKeyHint="done"
          autoComplete="off"
        />
        <button type="submit" class="btn">
          Add
        </button>
        <MicButton ctx={items ? ctx : null} label="Add by voice" />
      </form>
      {items && <GroceryList ctx={ctx} />}
    </>
  );
}

function GroceryList({ ctx }: { ctx: GroceryContext }) {
  if (!ctx.items.length) {
    return <p class="empty">The list is empty. Add an item above or tap the mic.</p>;
  }
  return (
    <div class="glist">
      {grocerySections(ctx.items).map((s) => (
        <div key={s.title} role="group" aria-label={s.title}>
          {s.title === CART ? (
            <h3 class="cat cart">
              {s.title}
              <ClearButton ctx={ctx} />
            </h3>
          ) : (
            <h3 class="cat">{s.title}</h3>
          )}
          {s.items.map((g) => (
            <GroceryRow key={g.id} ctx={ctx} item={g} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Clears the cart. Off while it runs, so a second tap can't log a second delete. */
function ClearButton({ ctx }: { ctx: GroceryContext }) {
  const [busy, setBusy] = useState(false);
  async function clear() {
    setBusy(true);
    await clearItems(ctx);
    setBusy(false);
  }
  return (
    <button type="button" class="clear" disabled={busy} onClick={() => void clear()}>
      Clear
    </button>
  );
}

function GroceryRow({ ctx, item }: { ctx: GroceryContext; item: GroceryWithId }) {
  const by = ctx.members.find((m) => m.id === item.addedBy)?.name;
  const label = !item.done && sourceLabel(item, by);
  return (
    <button
      type="button"
      class="chk"
      role="checkbox"
      aria-checked={item.done}
      onClick={() => void toggleItem(ctx, item)}
    >
      <span class="box" aria-hidden="true" />
      <span class="lbl">{item.name}</span>
      {label && <span class="src">{label}</span>}
    </button>
  );
}

/** The mic, here and on the Today strip. Null `ctx` means the list hasn't loaded. */
export function MicButton({ ctx, label }: { ctx: GroceryContext | null; label: string }) {
  const { listening, listen } = useVoice((said) => {
    const names = parseVoice(said);
    if (!ctx || !names.length) return toast(NOT_CAUGHT);
    void addItems(ctx, names, 'voice');
  });
  return (
    <button
      type="button"
      class={listening ? 'btn mic listening' : 'btn mic'}
      aria-label={label}
      aria-pressed={listening}
      onClick={listen}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        aria-hidden="true"
      >
        <rect x="9" y="3" width="6" height="11" rx="3" />
        <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
      </svg>
    </button>
  );
}
