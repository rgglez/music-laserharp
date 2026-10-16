import { test } from "node:test";
import assert from "node:assert/strict";
import { BEAM_KEYS, beamForKey, beamX, hitBeam } from "./notes";

test("number keys map left to right and ignore unassigned beams", () => {
  for (const count of [5, 6, 7, 8, 9, 10]) {
    [...BEAM_KEYS].forEach((key, index) => {
      assert.equal(beamForKey(key, count), index < count ? index : -1);
    });
    for (const key of ["", "12", "Enter", "a", "!", " "]) {
      assert.equal(beamForKey(key, count), -1);
    }
  }
});

test("all supported beam counts remain separated on mobile and desktop", () => {
  // Include the nine-note default and the full custom preset range of 5–10.
  for (const count of [5, 6, 7, 8, 9, 10]) {
    for (const width of [280, 360, 720, 1200]) {
      for (const y of [0.05, 0.25, 0.5, 0.9]) {
        for (let index = 0; index < count; index++) {
          assert.equal(hitBeam(beamX(index, y, count), y, width, count), index);
          if (index < count - 1) {
            const gap =
              (beamX(index, y, count) + beamX(index + 1, y, count)) / 2;
            assert.equal(hitBeam(gap, y, width, count), -1);
          }
        }
      }
    }
  }
});

test("captured pointers outside the playable area release their note", () => {
  for (const count of [5, 8, 9, 10]) {
    for (const [x, y] of [
      [-0.01, 0.5],
      [1.01, 0.5],
      [0.5, -0.1],
      [0.5, 0.95],
    ]) {
      assert.equal(hitBeam(x, y, 360, count), -1);
    }
  }
});
