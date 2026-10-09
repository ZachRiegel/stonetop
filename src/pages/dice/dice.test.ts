// @vitest-environment node
import {
  DICE,
  DIE_COLOURS,
  drawFaces,
  FAIL_PATH,
  mulberry32,
  newSeed,
  score,
  SPECIAL_PATH,
  STAR_PATHS,
  starPath,
} from "pages/dice/dice.ts";
import { describe, expect, test } from "vitest";

describe("drawFaces", () => {
  test("draws one face per die, the same every time for the same seed", () => {
    const faces = drawFaces(mulberry32(1234), 5);
    expect(faces).toHaveLength(5);
    faces.forEach((face) => expect([0, 1, 2, 3, 4, 5]).toContain(face));
    expect(drawFaces(mulberry32(1234), 5)).toEqual(faces);
    // a shorter roll of the same seed shows the same first faces
    expect(drawFaces(mulberry32(1234), 2)).toEqual(faces.slice(0, 2));
  });

  test("differs between seeds", () => {
    const seeds = Array.from({ length: 20 }, (_, i) => i + 1);
    const rolls = seeds.map((seed) => drawFaces(mulberry32(seed), 5).join(""));
    expect(new Set(rolls).size).toBeGreaterThan(15);
  });
});

describe("score", () => {
  test("totals the symbols of each die's face", () => {
    expect(DICE.blue.faces[5]).toEqual({ burst: 2, special: 0, skull: 0 });
    expect(DICE.orange.faces[2]).toEqual({ burst: 1, special: 1, skull: 0 });
    expect(DICE.violet.faces[0]).toEqual({ burst: 0, special: 0, skull: 1 });
    expect(
      score([
        { colour: "blue", face: 5 },
        { colour: "orange", face: 2 },
        { colour: "violet", face: 0 },
      ]),
    ).toEqual({ burst: 3, special: 1, skull: 1 });
    expect(score([])).toEqual({ burst: 0, special: 0, skull: 0 });
  });
});

describe("newSeed", () => {
  test("is a 32-bit unsigned integer", () => {
    const seed = newSeed();
    expect(Number.isInteger(seed)).toBe(true);
    expect(seed).toBeGreaterThanOrEqual(0);
    expect(seed).toBeLessThan(2 ** 32);
  });
});

describe("glyph paths", () => {
  // every coordinate in a path's commands
  const coordinates = (d: string) =>
    [...d.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map(([, x, y]) => [Number(x), Number(y)]);

  test("every die has a star path, closed and centred in the 24-unit box", () => {
    DIE_COLOURS.forEach((colour) => {
      const d = STAR_PATHS[DICE[colour].points];
      expect(d.endsWith("Z")).toBe(true);
      const points = coordinates(d);
      expect(points).toHaveLength(DICE[colour].points * 2);
      const xs = points.map(([x]) => x ?? 0);
      const ys = points.map(([, y]) => y ?? 0);
      expect((Math.max(...xs) + Math.min(...xs)) / 2).toBeCloseTo(12, 1);
      expect((Math.max(...ys) + Math.min(...ys)) / 2).toBeCloseTo(12, 1);
      expect(Math.min(...xs, ...ys)).toBeGreaterThanOrEqual(1);
      expect(Math.max(...xs, ...ys)).toBeLessThanOrEqual(23);
    });
  });

  test("starPath takes a size and centre for the icons", () => {
    const points = coordinates(starPath(5, 9, 16, 16));
    const ys = points.map(([, y]) => y ?? 0);
    // the top point is on the centre line; the bounding box is centred vertically
    expect(points[0]).toEqual([
      16,
      expect.closeTo(16 - 9 + (9 - 9 * Math.cos(Math.PI / 5)) / 2, 1),
    ]);
    expect((Math.max(...ys) + Math.min(...ys)) / 2).toBeCloseTo(16, 1);
  });

  test("the nut and wrench stay inside the box", () => {
    [SPECIAL_PATH, FAIL_PATH].forEach((d) => {
      const all = coordinates(d).flat();
      expect(Math.min(...all)).toBeGreaterThanOrEqual(1);
      expect(Math.max(...all)).toBeLessThanOrEqual(23);
    });
  });
});
