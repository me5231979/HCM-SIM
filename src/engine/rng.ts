/** Seeded RNG (mulberry32). All randomness in the game goes through here so a cohort can share a run. */
export type Rng = () => number;

export function hashSeed(seed: string): number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

export function createRng(seed: string): Rng {
  let a = hashSeed(seed);
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const pick = <T,>(rng: Rng, items: readonly T[]): T => items[Math.floor(rng() * items.length)];
export const between = (rng: Rng, min: number, max: number): number => min + Math.floor(rng() * (max - min + 1));

const WORDS = ['oak', 'gold', 'cedar', 'magnolia', 'commodore', 'alumni', 'peabody', 'kirkland', 'branscomb', 'garland', 'wyatt', 'furman'];
export function newSeed(): string {
  const r = createRng(String(Date.now()) + String(Math.random()));
  return `${pick(r, WORDS)}-${between(r, 100, 999)}`;
}
