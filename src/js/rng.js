// Seeded PRNG (mulberry32). The sim keeps its 32-bit state in S.rng so saves and Node runs replay exactly.
export function next(o) {
  let t = (o.rng = (o.rng + 0x6D2B79F5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export const rint = (o, a, b) => a + Math.floor(next(o) * (b - a + 1));
export const rrange = (o, a, b) => a + next(o) * (b - a);
export const pick = (o, arr) => arr[Math.floor(next(o) * arr.length)];
// Normal-ish (sum of three uniforms), mean 0, sd ~1.
export const gauss = (o) => (next(o) + next(o) + next(o) - 1.5) * 2;
export const makeRng = (seed) => { const o = { rng: seed | 0 }; return () => next(o); };
// Stateless hash for cosmetic per-tile variation (never used by rules).
export function hash2(x, y, s = 0) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
