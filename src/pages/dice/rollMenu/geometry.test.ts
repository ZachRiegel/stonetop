// @vitest-environment node
// Pins the geometry README.md describes: morph-safe paths, alignment, hit-testing, the bubble.
import { DIE_COLOURS } from "pages/dice/dice.ts";
import {
  arcsOf,
  bubbleOf,
  buttonPath,
  centreOf,
  COUNT_ARC,
  countTurn,
  EXTENT,
  held,
  hit,
  insideRing,
} from "pages/dice/rollMenu/geometry.ts";
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

const BARE = arcsOf(null);
const BLUE = arcsOf("blue");
const count = (colour: (typeof DIE_COLOURS)[number]) => {
  const arc = arcsOf(colour).count;
  if (!arc) throw new Error("no count arc");
  return arc;
};

describe("roll menu geometry", () => {
  test("draws every button and every bubble with the same commands, so they morph", () => {
    const paths = [
      ...Object.values(BLUE).flatMap((arc) =>
        Array.from({ length: arc.segments }, (_, index) => buttonPath(arc, index)),
      ),
      bubbleOf(null, 90, -40, BARE).d,
      bubbleOf({ arc: "button", index: 0 }, 0, 0, BARE).d,
      bubbleOf({ arc: "count", index: 4 }, 0, 0, BLUE).d,
    ];
    paths.forEach((d) => expect(commandsOf(d)).toBe("MAALAAALAZ"));
  });

  test("centres blue straight left, orange straight above, log right and settings below", () => {
    expect(rounded(centreOf(BARE.dice, 0))).toEqual([-BARE.dice.radius, 0]);
    expect(rounded(centreOf(BARE.dice, 2))).toEqual([0, -BARE.dice.radius]);
    expect(rounded(centreOf(BARE.log, 0))).toEqual([BARE.log.radius, 0]);
    expect(rounded(centreOf(BARE.settings, 0))).toEqual([0, BARE.settings.radius]);
  });

  test("swings the count arc so 3 sits on the line through the chosen die", () => {
    DIE_COLOURS.forEach((colour, index) => {
      const [dx, dy] = centreOf(BARE.dice, index);
      const [cx, cy] = centreOf(count(colour), 2);
      expect(Math.atan2(cy, cx)).toBeCloseTo(Math.atan2(dy, dx), 5);
    });
    expect(rounded(centreOf(count("blue"), 2))).toEqual([-count("blue").radius, 0]);
    expect(arcsOf(null).count).toBeUndefined();
    // drawn centred on the middle die and turned, so the arc only ever rotates
    expect(countTurn("violet")).toBe(0);
    expect(count("violet")).toEqual(COUNT_ARC);
    expect(countTurn("blue")).toBe(45);
    expect(countTurn("orange")).toBe(-45);
  });

  test("finds what is under a point", () => {
    expect(hit(0, 0, BARE)).toEqual({ arc: "button", index: 0 });
    expect(hit(...centreOf(BARE.dice, 1), BARE)).toEqual({ arc: "dice", index: 1 });
    expect(hit(...centreOf(BARE.log, 0), BARE)).toEqual({ arc: "log", index: 0 });
    expect(hit(...centreOf(BARE.settings, 0), BARE)).toEqual({ arc: "settings", index: 0 });
    // the count arc is only there once a colour is chosen
    expect(hit(...centreOf(count("blue"), 2), BARE)).toBeNull();
    expect(hit(...centreOf(count("blue"), 2), BLUE)).toEqual({ arc: "count", index: 2 });
    // the gap between the button and the ring, and past the outer ring
    expect(hit(-33, 0, BLUE)).toBeNull();
    expect(hit(-EXTENT - 10, 0, BLUE)).toBeNull();
    expect(insideRing(-33, 0)).toBe(true);
    expect(insideRing(...centreOf(BARE.dice, 0))).toBe(false);
  });

  test("includes a button's round cap but not the gap beside it", () => {
    // on the ring just past blue's straight run, inside its cap; then in the gap to settings
    expect(hit(...at(BARE.dice.radius, 195), BARE)).toEqual({ arc: "dice", index: 0 });
    expect(hit(...at(BARE.dice.radius, 210), BARE)).toBeNull();
  });

  test("puts the free bubble on the pointer, held within the menu, and snaps onto buttons", () => {
    // a free bubble is a circle of the cap's radius round the pointer
    const circle = (d: string, cx: number, cy: number) =>
      pointsOf(d).forEach(([x = 0, y = 0]) =>
        expect(Math.hypot(x - cx, y - cy)).toBeCloseTo(20, 1),
      );
    circle(bubbleOf(null, 60, -30, BARE).d, 60, -30);
    circle(bubbleOf({ arc: "button", index: 0 }, 0, 0, BARE).d, 0, 0);
    expect(bubbleOf(null, 60, -30, BARE).snap).toBe(false);
    // the pointer is held within the menu's reach before anything reads it: a far pointer
    // lands on the outer ring, which with blue chosen is the count arc, and the button
    // there is the one the drag means
    expect(held(-30, 10)).toEqual([-30, 10]);
    expect(Math.hypot(...held(-400, 300))).toBeLessThanOrEqual(EXTENT);
    expect(hit(...held(-400, 300), BLUE)).toEqual({ arc: "count", index: 0 });
    expect(hit(...held(-400, 300), BARE)).toBeNull();
    expect(bubbleOf({ arc: "button", index: 0 }, 0, 0, BARE).snap).toBe(true);
    expect(bubbleOf({ arc: "dice", index: 1 }, 0, 0, BARE)).toEqual({
      d: buttonPath(BARE.dice, 1),
      focus: centreOf(BARE.dice, 1),
      snap: true,
    });
  });
});
