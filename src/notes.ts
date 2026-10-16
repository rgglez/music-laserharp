/** Number-row order: 0 addresses the tenth beam, rather than the first. */
export const BEAM_KEYS = "1234567890";

/** Unassigned keys stay silent when the selected preset has fewer beams. */
export function beamForKey(key: string, count: number) {
  const index = BEAM_KEYS.indexOf(key);
  return key.length === 1 && index >= 0 && index < count ? index : -1;
}

/** Normalized canvas coordinates use x=0 at the left and y=0 at the top. */
export function beamX(index: number, y: number, count: number) {
  const spread = 0.15 + 0.75 * (1 - y);
  return 0.5 + (index / (count - 1) - 0.5) * spread;
}

/** Hit-test the same fan geometry the renderer uses for this preset. */
export function hitBeam(x: number, y: number, width: number, count: number) {
  if (x < 0 || x > 1 || y < 0.05 || y > 0.9) return -1;
  let closest = -1;
  let distance = Infinity;
  for (let index = 0; index < count; index++) {
    const delta = Math.abs(x - beamX(index, y, count));
    if (delta < distance) {
      distance = delta;
      closest = index;
    }
  }
  // Limit finger tolerance near the emitter, where beams converge. The gap
  // between hit areas lets a captured pointer release a note between rays.
  const spacing = (0.15 + 0.75 * (1 - y)) / (count - 1);
  return distance <= Math.min(18 / width, spacing * 0.42) ? closest : -1;
}
