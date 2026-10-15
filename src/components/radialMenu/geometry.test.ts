// @vitest-environment node
// Pins the geometry README.md describes: ring placement, run layout, morphing paths,
// hit-testing, the bubble.
import {
  type ArcSpec,
  bubbleOf,
  held,
  hit,
  homeCentre,
  insideRing,
  layoutOf,
  type MenuSpec,
  placedOf,
  segmentPath,
} from "components/radialMenu/geometry.ts";
import { describe, expect, test } from "vitest";

// the command letters of a path, which a CSS `d` transition needs to match to morph
const commandsOf = (d: string) => d.replace(/[^A-Z]/g, "");
// the points a path is drawn through
const pointsOf = (d: string) =>
  (d.match(/-?[\d.]+ -?[\d.]+(?= [A-Z]|$)/g) ?? []).map((pair) => pair.split(" ").map(Number));
// screen px of a polar point, as the menu lays them out
const at = (radius: number, angle: number) =>
  [
    radius * Math.cos((angle * Math.PI) / 180),
    -radius * Math.sin((angle * Math.PI) / 180),
  ] as const;
// rounding a small negative gives -0, which toEqual tells apart from 0
const rounded = (point: readonly [number, number]) => point.map((n) => Math.round(n) || 0);

const segment = (span: number) => ({ kind: "segment", span }) as const;
const spacer = (span: number) => ({ kind: "spacer", span }) as const;
// a menu like the dice page's: three 45° segments up and to the left, a 70° pill right and
// another below, and on a second ring a run of five 22.5° segments swung straight left
const RING_1: ArcSpec[] = [
  { angle: 135, items: [segment(45), segment(45), segment(45)] },
  { angle: 0, items: [segment(70)] },
  { angle: 270, items: [segment(70)] },
];
const menuOf = (outer: ArcSpec[]): MenuSpec => ({
  centre: 24,
  corner: 6,
  rings: [
    { start: 36, end: 76, arcs: RING_1 },
    { start: 88, end: 128, arcs: outer },
  ],
});
const COUNT: ArcSpec = { angle: 180, items: Array.from({ length: 5 }, () => segment(22.5)) };
const BARE = layoutOf(menuOf([]));
const FULL = layoutOf(menuOf([COUNT]));
const segmentsOf = (layout = FULL) =>
  layout.rings.flatMap(({ arcs }) => arcs.flatMap(({ segments }) => segments));
const segmentAt = (layout: typeof FULL, ring: number, arc: number, index: number) => {
  const found = layout.rings[ring]?.arcs[arc]?.segments[index];
  if (!found) throw new Error(`no segment ${ring} ${arc} ${index}`);
  return found;
};

describe("radial menu geometry", () => {
  test("places each ring by its own edges, whatever order they are described in", () => {
    expect(FULL.rings.map(({ radius, depth }) => [radius, depth])).toEqual([
      [56, 40],
      [108, 40],
    ]);
    // the button reaches halfway to the innermost ring; the pointer is held to the
    // outermost ring's centreline
    expect(FULL.button).toBe(30);
    expect(FULL.inner).toBe(36);
    expect(FULL.reach).toBe(108);
    expect(FULL.extent).toBe(128);
    expect(FULL.bubble).toBe(20);
    // a ring with nothing on it still takes its place
    expect(BARE.extent).toBe(128);
    expect(
      layoutOf({ ...menuOf([COUNT]), rings: [...menuOf([COUNT]).rings].reverse() }),
    ).toMatchObject({ button: 30, inner: 36, reach: 108, extent: 128, bubble: 20 });
    expect(layoutOf({ centre: 24, corner: 6, rings: [] })).toMatchObject({
      button: 24,
      inner: 24,
      reach: 24,
      extent: 24,
    });
  });

  test("centres a run on its angle: first segment left, last up, pills right and below", () => {
    expect(rounded(segmentAt(FULL, 0, 0, 0).centre)).toEqual([-56, 0]);
    expect(rounded(segmentAt(FULL, 0, 0, 2).centre)).toEqual([0, -56]);
    expect(rounded(segmentAt(FULL, 0, 1, 0).centre)).toEqual([56, 0]);
    expect(rounded(segmentAt(FULL, 0, 2, 0).centre)).toEqual([0, 56]);
    // the run's end corners are rounded; the edges between segments are square
    expect(segmentAt(FULL, 0, 0, 0).home).toMatchObject({ startCap: 6, endCap: 0 });
    expect(segmentAt(FULL, 0, 0, 1).home).toMatchObject({ startCap: 0, endCap: 0 });
    expect(segmentAt(FULL, 0, 0, 2).home).toMatchObject({ startCap: 0, endCap: 6 });
  });

  test("lays an arc out straight up and turns it into place", () => {
    // the middle of the swung run sits on the line through its angle
    expect(rounded(segmentAt(FULL, 1, 0, 2).centre)).toEqual([-108, 0]);
    expect(segmentAt(FULL, 1, 0, 2).turn).toBe(90);
    expect(segmentAt(FULL, 1, 0, 2).home).toMatchObject({ from: 90 + 11.25, to: 90 - 11.25 });
    expect(placedOf(segmentAt(FULL, 1, 0, 2))).toMatchObject({
      from: 180 + 11.25,
      to: 180 - 11.25,
    });
    expect(rounded(homeCentre(segmentAt(FULL, 1, 0, 2)))).toEqual([0, -108]);
    // an arc straight up is drawn in place, and only its angle moves it: same paths
    const up = layoutOf(menuOf([{ ...COUNT, angle: 90 }]));
    expect(segmentAt(up, 1, 0, 2).turn).toBe(0);
    expect(segmentPath(segmentAt(up, 1, 0, 0))).toBe(segmentPath(segmentAt(FULL, 1, 0, 0)));
    expect(rounded(segmentAt(up, 1, 0, 2).centre)).toEqual([0, -108]);
  });

  test("leaves a gap at a spacer and rounds the corners beside it", () => {
    const spaced = layoutOf(menuOf([{ angle: 90, items: [segment(45), spacer(30), segment(45)] }]));
    const [first, second] = spaced.rings[1]?.arcs[0]?.segments ?? [];
    expect(first?.home).toMatchObject({ from: 150, to: 105, startCap: 6, endCap: 6 });
    expect(second?.home).toMatchObject({ from: 75, to: 30, startCap: 6, endCap: 6 });
    expect(hit(...at(108, 120), spaced)).toMatchObject({ kind: "segment", segment: first });
    expect(hit(...at(108, 90), spaced)).toBeNull();
    expect(hit(...at(108, 50), spaced)).toMatchObject({ kind: "segment", segment: second });
  });

  test("draws every segment and every bubble with the same commands, so they morph", () => {
    const paths = [
      ...segmentsOf().map(segmentPath),
      bubbleOf(null, FULL).d,
      bubbleOf({ kind: "centre" }, FULL).d,
      bubbleOf({ kind: "segment", segment: segmentAt(FULL, 1, 0, 4) }, FULL).d,
    ];
    // traced clockwise from straight up round their centres
    const [first = [], second = []] = pointsOf(bubbleOf(null, FULL).d);
    expect(first).toEqual([0, -20]);
    expect(second[0]).toBeGreaterThan(0);
    paths.forEach((d) => expect(commandsOf(d)).toBe(commandsOf(bubbleOf(null, FULL).d)));
    expect(commandsOf(bubbleOf(null, FULL).d)).toMatch(/^ML+Z$/);
  });

  test("finds what is under a point", () => {
    expect(hit(0, 0, FULL)).toEqual({ kind: "centre" });
    // the button reaches halfway across its gap; the rest of the gap is on nothing, though
    // still inside the ring
    expect(hit(-29, 0, FULL)).toEqual({ kind: "centre" });
    expect(hit(-33, 0, FULL)).toBeNull();
    expect(insideRing(-33, 0, FULL)).toBe(true);
    expect(insideRing(...segmentAt(FULL, 0, 0, 0).centre, FULL)).toBe(false);
    expect(hit(...segmentAt(FULL, 0, 0, 1).centre, FULL)).toMatchObject({
      kind: "segment",
      segment: { ring: 0, arc: 0, index: 1 },
    });
    expect(hit(...segmentAt(FULL, 0, 1, 0).centre, FULL)?.kind).toBe("segment");
    expect(hit(...segmentAt(FULL, 0, 2, 0).centre, FULL)).toMatchObject({
      segment: { ring: 0, arc: 2, index: 0 },
    });
    // the outer run is only there once it is described
    expect(hit(-108, 0, BARE)).toBeNull();
    expect(hit(-108, 0, FULL)).toMatchObject({ segment: { ring: 1, arc: 0, index: 2 } });
    // the gap between the rings, and past the outer ring
    expect(hit(-82, 0, FULL)).toBeNull();
    expect(hit(-FULL.extent - 10, 0, FULL)).toBeNull();
  });

  test("counts a segment to its square-cut end but not the gap beside it", () => {
    // on the ring near the first segment's end, inside it; then in the gap to the pill
    expect(hit(...at(56, 195), FULL)).toMatchObject({ segment: { ring: 0, arc: 0, index: 0 } });
    expect(hit(...at(56, 210), FULL)).toBeNull();
  });

  test("puts the free bubble on the pointer, held within the menu, and snaps onto segments", () => {
    // a free bubble is a circle of the first ring's half depth, drawn round its centre
    const circle = (d: string) =>
      pointsOf(d).forEach(([x = 0, y = 0]) => expect(Math.hypot(x, y)).toBeCloseTo(20, 1));
    circle(bubbleOf(null, FULL).d);
    expect(bubbleOf(null, FULL).placed).toBeNull();
    circle(bubbleOf({ kind: "centre" }, FULL).d);
    expect(bubbleOf({ kind: "centre" }, FULL).placed).toEqual([0, 0]);
    // the pointer is held within the menu's reach before anything reads it: a far pointer
    // lands on the outer ring, and the segment there is the one the drag means
    expect(held(-30, 10, FULL)).toEqual([-30, 10]);
    expect(Math.hypot(...held(-400, 300, FULL))).toBeLessThanOrEqual(FULL.reach);
    expect(hit(...held(-400, 300, FULL), FULL)).toMatchObject({
      segment: { ring: 1, arc: 0, index: 0 },
    });
    expect(hit(...held(-400, 300, BARE), BARE)).toBeNull();
    // on a segment the bubble is that segment's shape, drawn round the segment's centre
    const violet = segmentAt(FULL, 0, 0, 1);
    const onViolet = bubbleOf({ kind: "segment", segment: violet }, FULL);
    const [vx, vy] = violet.centre;
    expect(onViolet.placed).toEqual([vx, vy]);
    // the same shape as the drawn segment, which is traced at home and turned into place
    // (a turn of 45° maps the 5° sample rays onto one another)
    const turned = pointsOf(segmentPath(violet)).map(([x = 0, y = 0]) => {
      const [hx, hy] = homeCentre(violet);
      const [dx, dy] = [x - hx, y - hy];
      const theta = (violet.turn * Math.PI) / 180;
      return [
        dx * Math.cos(theta) + dy * Math.sin(theta),
        -dx * Math.sin(theta) + dy * Math.cos(theta),
      ];
    });
    pointsOf(onViolet.d).forEach(([x = 0, y = 0]) =>
      expect(
        Math.min(...turned.map(([tx = 0, ty = 0]) => Math.hypot(x - tx, y - ty))),
      ).toBeLessThan(0.1),
    );
  });
});
