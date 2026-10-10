// @vitest-environment node
import {
  anchor,
  type Arena,
  arrange,
  DICE,
  DIE_COLOURS,
  drawFaces,
  FAIL_PATH,
  mulberry32,
  newSeed,
  reach,
  score,
  SPACING,
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

describe("reach", () => {
  test("is half a die face-on, the half diagonal at a 45° yaw, and per axis for a tilt", () => {
    expect(reach(0, 0, 0, 1)).toEqual([0.5, 0.5]);
    const [x, y] = reach(0, 0, Math.sin(Math.PI / 8), Math.cos(Math.PI / 8));
    expect(x).toBeCloseTo(Math.SQRT1_2);
    expect(y).toBeCloseTo(Math.SQRT1_2);
    // a 45° turn about the screen's x axis widens the die along y only
    const [tx, ty] = reach(Math.sin(Math.PI / 8), 0, 0, Math.cos(Math.PI / 8));
    expect(tx).toBeCloseTo(0.5);
    expect(ty).toBeCloseTo(Math.SQRT1_2);
  });
});

describe("anchor", () => {
  const thrown = { width: 20, height: 10 };
  const flat = [0.5, 0.5] as const;

  test("is the identity in the arena the die was thrown in", () => {
    expect(anchor(3, -2, flat, thrown, thrown)).toEqual([3, -2]);
    expect(anchor(-9.5, 4.5, flat, thrown, thrown)).toEqual([-9.5, 4.5]);
  });

  test("keeps the distance to the right and bottom edges as the arena grows or shrinks", () => {
    expect(anchor(3, -2, flat, thrown, { width: 40, height: 10 })).toEqual([13, -2]);
    expect(anchor(3, -2, flat, thrown, { width: 20, height: 6 })).toEqual([3, 0]);
    expect(anchor(3, -2, flat, thrown, { width: 14, height: 10 })).toEqual([0, -2]);
  });

  test("pushes a die the left or top edge would clip back into frame, as far as it reaches", () => {
    expect(anchor(-8, -2, flat, thrown, { width: 8, height: 10 })).toEqual([-3.5, -2]);
    expect(anchor(-8, -2, [0.7, 0.6], thrown, { width: 8, height: 10 })).toEqual([-3.3, -2]);
    expect(anchor(3, 4, [0.7, 0.6], thrown, { width: 20, height: 4 })).toEqual([3, 1.4]);
  });

  test("never clamps at the right or bottom, where the throw comes in", () => {
    expect(anchor(14, -7, flat, thrown, thrown)).toEqual([14, -7]);
  });
});

describe("arrange", () => {
  const thrown = { width: 20, height: 10 };
  const flat = [0.5, 0.5] as const;
  const rest = (x: number, y: number) => ({ x, y, reach: flat });
  // where the dice end up: their anchored spots plus their shifts
  const placed = (rests: { x: number; y: number; reach: typeof flat }[], shown: Arena) =>
    arrange(rests, thrown, shown).map(([dx, dy], i): [number, number] => {
      const [x, y] = anchor(rests[i]?.x ?? 0, rests[i]?.y ?? 0, flat, thrown, shown);
      return [x + dx, y + dy];
    });
  const apart = ([ax, ay]: readonly [number, number], [bx, by]: readonly [number, number]) =>
    Math.hypot(ax - bx, ay - by);
  const clear = (spots: readonly (readonly [number, number])[]) =>
    spots.forEach((a, i) =>
      spots.slice(i + 1).forEach((b) => expect(apart(a, b)).toBeGreaterThanOrEqual(SPACING)),
    );
  const inside = (spots: readonly (readonly [number, number])[], { width, height }: Arena) =>
    spots.forEach(([x, y]) => {
      expect(Math.abs(x)).toBeLessThanOrEqual((width - SPACING) / 2);
      expect(Math.abs(y)).toBeLessThanOrEqual((height - SPACING) / 2);
    });

  test("does not move dice the edges did not push", () => {
    expect(arrange([rest(3, -2), rest(-6, 1)], thrown, { width: 40, height: 10 })).toEqual([
      [0, 0],
      [0, 0],
    ]);
  });

  test("keeps a pushed die half a spacing in from the edge, and the next one clear of it", () => {
    const shown = { width: 8, height: 10 };
    const [first, second] = placed([rest(-9.5, -2), rest(-9.6, -2)], shown);
    expect(first).toEqual([-4 + SPACING / 2, -2]);
    expect(second).toBeDefined();
    if (!first || !second) return;
    expect(apart(first, second)).toBeGreaterThanOrEqual(SPACING);
    expect(apart(first, second)).toBeLessThan(SPACING + 0.25);
    inside([second], shown);
  });

  test("spreads several pushed dice down a narrow arena, each clear of all the others", () => {
    const shown = { width: 2.5, height: 10 };
    const rests = [rest(-9, 0), rest(-9, 0.1), rest(-9, -0.1), rest(-8, 0), rest(-7, 0.2)];
    const spots = placed(rests, shown);
    clear(spots);
    inside(spots, shown);
    expect(placed(rests, shown)).toEqual(spots);
  });

  test("stacks dice down the middle of a screen too narrow for a die and its margin", () => {
    const spots = placed([rest(-9, 0), rest(-9, 0.1), rest(-9, -0.1)], { width: 1.4, height: 10 });
    spots.forEach(([x]) => expect(x).toBe(0));
    clear(spots);
  });

  test("piles the dice in the middle when there is no room at all", () => {
    expect(placed([rest(-9, 4), rest(-9, 4)], { width: 0.8, height: 0.8 })).toEqual([
      [0, 0],
      [0, 0],
    ]);
  });
});
