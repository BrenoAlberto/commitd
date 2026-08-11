/* Colour. Groups own a hue; branches inside a group are lightness steps of
   it, so the palette scales past eight branches without inventing hues that
   were never validated. A branch colour never appears without its name. */

const SLOTS = [
  { n: 'blue',    C: .152, H: 258, L: .616 },
  { n: 'orange',  C: .168, H: 42,  L: .604 },
  { n: 'aqua',    C: .119, H: 163, L: .597 },
  { n: 'yellow',  C: .137, H: 76,  L: .655 },
  { n: 'magenta', C: .152, H: 6,   L: .625 },
  { n: 'green',   C: .175, H: 143, L: .525 },
  { n: 'violet',  C: .142, H: 285, L: .655 },
  { n: 'red',     C: .148, H: 22,  L: .676 },
];
/* Adjacent-pair CVD ΔE 8.4 (protan, dark surface) / 9.1 (light); every slot
   clears 3:1 on the dark surface. Verified with the palette validator. */
const RAMP = {
  dark:  { L: [.30, .42, .545, .665], C: [.35, .62, .85, 1] },
  light: { L: [.90, .80, .69,  .58 ], C: [.32, .58, .82, 1] },
};

export const DEFAULT_GROUPS = [
  { id: 'study', label: 'Study',    slot: 0 },
  { id: 'body',  label: 'Body',     slot: 1 },
  { id: 'mind',  label: 'Mind',     slot: 4 },
  { id: 'home',  label: 'Home',     slot: 3 },
  { id: 'rest',  label: 'Rest',     slot: 6 },
  { id: 'quit',  label: 'Quitting', slot: 5 },
];

const ok = (L, C, H) => `oklch(${L.toFixed(3)} ${C.toFixed(3)} ${H})`;
export const slotOf  = (groups, id) => (groups.find(g => g.id === id) || groups[0] || { slot: 0 }).slot;
export const shade   = (slot, L) => ok(L, SLOTS[slot % 8].C * (.55 + L * .5), SLOTS[slot % 8].H);
export const swatch  = (slot) => ok(SLOTS[slot % 8].L, SLOTS[slot % 8].C, SLOTS[slot % 8].H);
export const BRANCH_STEPS = [.50, .575, .65, .715];
export const TOPIC_STEPS  = [.45, .55, .65, .72];

/* One sequential ramp per hue. Level 0 is "nothing here", not "zero". */
export function step(slot, lvl, mode) {
  if (lvl <= 0) return 'var(--empty)';
  const m = RAMP[mode] || RAMP.dark, s = SLOTS[slot % 8], i = Math.min(lvl, 4) - 1;
  return ok(m.L[i], s.C * m.C[i], s.H);
}
