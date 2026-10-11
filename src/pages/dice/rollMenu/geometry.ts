// The roll menu's geometry: rings of arc buttons round the die button, the paths that draw
// them and the glass bubble, traced so they morph, and hit testing. No React or DOM in here.
import { DIE_COLOURS, type DieColour, MAX_POOL } from "pages/dice/dice.ts";

// the die button's radius; the arcs are a little thinner, CAP deep each side of their ring
export const RADIUS = 24;
const CAP = 20;
const GAP = 12;
const RING = RADIUS + GAP + CAP;
const OUTER_RING = RING + CAP + GAP + CAP;
// how far the menu reaches from the button's centre
export const EXTENT = OUTER_RING + CAP;

const degrees = (radians: number) => (radians * 180) / Math.PI;
// screen px from the centre (y down) of a polar point; angles are in degrees, 0 to the
// right and 90 up
const point = (radius: number, angle: number) =>
  [radius * Math.cos(angle / degrees(1)), -radius * Math.sin(angle / degrees(1))] as const;

// An arc runs clockwise from `from` to `to`, ends included, cut into equal buttons, its
// ends square with `cap` corners so it reads as a piece of a ring. The layout (dice up and
// to the left with blue straight left and orange straight above, log right, settings below,
// the count arc one ring out on the chosen die's line) is described in README.md.
const CORNER = 6;
const DIE_SPAN = 45;
const DICE_SPAN = DIE_SPAN * DIE_COLOURS.length;
const PILL_SPAN = 70;
export type ArcName = "dice" | "count" | "log" | "settings";
export type Arc = { radius: number; from: number; to: number; segments: number; cap: number };
const RING_ARCS = {
  dice: {
    radius: RING,
    from: 135 + DICE_SPAN / 2,
    to: 135 - DICE_SPAN / 2,
    segments: DIE_COLOURS.length,
    cap: CORNER,
  },
  log: { radius: RING, from: PILL_SPAN / 2, to: -PILL_SPAN / 2, segments: 1, cap: CORNER },
  settings: {
    radius: RING,
    from: 270 + PILL_SPAN / 2,
    to: 270 - PILL_SPAN / 2,
    segments: 1,
    cap: CORNER,
  },
} satisfies Partial<Record<ArcName, Arc>>;
// the count arc as drawn, centred on the middle die; it is turned to the chosen die
const COUNT_SPAN = (DIE_SPAN / 2) * MAX_POOL;
export const COUNT_ARC: Arc = {
  radius: OUTER_RING,
  from: 135 + COUNT_SPAN / 2,
  to: 135 - COUNT_SPAN / 2,
  segments: MAX_POOL,
  cap: CORNER,
};
// how far the count arc turns, anticlockwise in degrees, to centre on the chosen die
export const countTurn = (colour: DieColour) =>
  middleOf(RING_ARCS.dice, DIE_COLOURS.indexOf(colour)) - 135;
const turned = (arc: Arc, by: number): Arc => ({ ...arc, from: arc.from + by, to: arc.to + by });
export type Arcs = typeof RING_ARCS & { count?: Arc };
// the menu's arcs, with the count arc in place once a die is chosen
export const arcsOf = (colour: DieColour | null): Arcs =>
  colour ? { ...RING_ARCS, count: turned(COUNT_ARC, countTurn(colour)) } : RING_ARCS;
export const entriesOf = (arcs: Arcs) => Object.entries(arcs) as [ArcName, Arc][];

const stepOf = ({ from, to, segments }: Arc) => (from - to) / segments;
// how far round an arc an angle is, in degrees from `from` (negative before it)
const along = ({ from }: Arc, angle: number) => ((((from - angle) % 360) + 540) % 360) - 180;
// the angle through the middle of a button, and the point there, where its label goes
const middleOf = (arc: Arc, index: number) => arc.from - (index + 0.5) * stepOf(arc);
export const centreOf = (arc: Arc, index: number) => point(arc.radius, middleOf(arc, index));

// a button's share of its arc; only the arc's two ends are rounded
type Sector = { from: number; to: number; startCap: number; endCap: number };
const sectorOf = (arc: Arc, index: number): Sector => ({
  from: arc.from - index * stepOf(arc),
  to: arc.from - (index + 1) * stepOf(arc),
  startCap: index === 0 ? arc.cap : 0,
  endCap: index === arc.segments - 1 ? arc.cap : 0,
});

// Every shape is traced the same way: SAMPLES points on its outline at equal angles round its
// centre, clockwise from straight up, joined by lines. A CSS `d` transition then morphs any
// shape into any other point for point along those rays, with no spin whichever way the
// shapes face (an eight-point arc path swung its points round the ring). The outline is found
// by bisection along each ray, so a shape only needs an inside test; every shape here is
// star-shaped about its centre and reaches less than EXTENT from it. At 5° a step the lines
// are within 0.15px of the true arcs.
const SAMPLES = 72;
const traced = (inside: (x: number, y: number) => boolean, [sx, sy]: readonly [number, number]) => {
  const points = Array.from({ length: SAMPLES }, (_, i) => {
    const [ux, uy] = point(1, 90 - (i * 360) / SAMPLES);
    const [r] = Array.from({ length: 16 }).reduce<[number, number]>(
      ([lo, hi]) => {
        const mid = (lo + hi) / 2;
        return inside(ux * mid, uy * mid) ? [mid, hi] : [lo, mid];
      },
      [0, EXTENT],
    );
    return `${(sx + ux * r).toFixed(2)} ${(sy + uy * r).toFixed(2)}`;
  });
  return `M ${points.join(" L ")} Z`;
};

// Whether a point, from a button's centre, is inside its ring sector, whose ring is centred
// at [ox, oy]: within the ring's band and the sector's turn, and not cut off by a corner. A
// corner circle sits `cap` inside both the arc and the edge it rounds, and past its centre
// towards the corner only the circle itself is inside.
const inSector =
  ([ox, oy]: readonly [number, number], radius: number, { from, to, startCap, endCap }: Sector) =>
  (x: number, y: number) => {
    const [dx, dy] = [x - ox, y - oy];
    const r = Math.hypot(dx, dy);
    // degrees clockwise from `from`
    const turn = (((from - degrees(Math.atan2(-dy, dx))) % 360) + 360) % 360;
    if (r < radius - CAP || r > radius + CAP || turn > from - to) return false;
    // whether the corner circle of `cap` at an `end` of the sector, on the arc at radius
    // `at`, cuts the point off; `towards` is the way into the sector from that end
    const cutBy = (cap: number, end: number, towards: 1 | -1, at: number) => {
      const o = degrees(Math.asin(cap / at));
      const [cx, cy] = point(at, end - towards * o);
      const past = at > radius ? r > at : r < at;
      const beside = towards === 1 ? turn < o : turn > from - to - o;
      return past && beside && Math.hypot(dx - cx, dy - cy) > cap;
    };
    return !(
      [
        [startCap, from, 1],
        [endCap, to, -1],
      ] as const
    ).some(
      ([cap, end, towards]) =>
        cap > 0 &&
        [radius + CAP - cap, radius - CAP + cap].some((at) => cutBy(cap, end, towards, at)),
    );
  };
// a button's outline, about `origin`
const sectorPath = (arc: Arc, index: number, origin: readonly [number, number]) =>
  traced(
    inSector(point(-arc.radius, middleOf(arc, index)), arc.radius, sectorOf(arc, index)),
    origin,
  );
// a button's path about the menu's centre; traced once per button, since the menu redraws
// on every hover change
const paths = new Map<string, string>();
export const buttonPath = (arc: Arc, index: number) => {
  const key = `${arc.radius} ${arc.from} ${arc.to} ${arc.segments} ${arc.cap} ${index}`;
  const path = paths.get(key) ?? sectorPath(arc, index, centreOf(arc, index));
  paths.set(key, path);
  return path;
};
// the free bubble: a cap-sized circle round its centre
const CIRCLE = traced((x, y) => Math.hypot(x, y) <= CAP, [0, 0]);

export type Hit = { arc: "button" | ArcName; index: number };

// whether a point is on a button: within the ring's band, along the button's run; the
// rounded corners are counted square, so an arc's end counts to its edge
const covers = (arc: Arc, index: number, x: number, y: number) => {
  const { from, to } = sectorOf(arc, index);
  const turn = along(arc, degrees(Math.atan2(-y, x)));
  return (
    Math.abs(Math.hypot(x, y) - arc.radius) <= CAP &&
    turn >= along(arc, from) &&
    turn <= along(arc, to)
  );
};

// whether a point is inside the first ring, among the die button and its gap
export const insideRing = (x: number, y: number) => Math.hypot(x, y) < RING - CAP;

// what is under a point: the die button, a button of one of the arcs, or nothing
export const hit = (x: number, y: number, arcs: Arcs): Hit | null => {
  if (Math.hypot(x, y) <= RADIUS + GAP / 2) return { arc: "button", index: 0 };
  const found = entriesOf(arcs)
    .flatMap(([name, arc]) =>
      Array.from({ length: arc.segments }, (_, index) => ({ name, arc, index })),
    )
    .find(({ arc, index }) => covers(arc, index, x, y));
  return found ? { arc: found.name, index: found.index } : null;
};

// A point held within the menu's reach: the pointer as the menu sees it, so a dragged
// bubble never leaves the drawing and, pulled past the outer ring, sits on the ring and
// means whatever it sits on.
export const held = (x: number, y: number) => {
  const reach = Math.hypot(x, y);
  const limit = EXTENT - CAP;
  return reach > limit ? ([(x * limit) / reach, (y * limit) / reach] as const) : ([x, y] as const);
};

// What the bubble is: its shape, a button's or a circle, drawn round where it is `placed`, a
// button's centre, or null when free. CSS mixes the placed point with the pointer (README.md,
// "The glass bubble").
export type Bubble = { d: string; placed: readonly [number, number] | null };
export const bubbleOf = (found: Hit | null, arcs: Arcs): Bubble => {
  const arc = found && found.arc !== "button" ? arcs[found.arc] : undefined;
  if (found && arc)
    return { d: sectorPath(arc, found.index, [0, 0]), placed: centreOf(arc, found.index) };
  return { d: CIRCLE, placed: found ? [0, 0] : null };
};
