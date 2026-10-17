// The sparkle burst from design/tablet-mockup.html (spec §3): little stars fly
// out from a ticked chore of the kid's. `big` is for the last one of the day.
// Nothing happens under prefers-reduced-motion.

const GLYPHS = ['✦', '★', '✧', '♥', '✦', '★', '✧', '✦'];
const COLORS = ['#FF7AB6', '#FFB86B', '#FFE066', '#7EE0A1', '#7CC8FF', '#B18CFF'];

export function sparkle(el: Element, big = false) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const r = el.getBoundingClientRect();
  const cx = r.left + 28;
  const cy = r.top + r.height / 2;
  const glyphs = big ? [...GLYPHS, ...GLYPHS] : GLYPHS;
  const reach = big ? 120 : 60;
  glyphs.forEach((ch, i) => {
    const s = document.createElement('span');
    s.className = big ? 'spark big' : 'spark';
    s.textContent = ch;
    s.setAttribute('aria-hidden', 'true');
    s.style.left = `${cx}px`;
    s.style.top = `${cy}px`;
    s.style.color = COLORS[i % COLORS.length];
    const a = (i / glyphs.length) * Math.PI * 2;
    s.style.setProperty('--dx', `${Math.cos(a) * reach}px`);
    s.style.setProperty('--dy', `${Math.sin(a) * reach}px`);
    document.body.appendChild(s);
    setTimeout(() => s.remove(), big ? 1250 : 950);
  });
}
