// The roll menu's geometry: rings of arc buttons round the die button, the eight-point
// paths that draw them and the glass bubble, and hit testing. No React or DOM in here.
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

// An arc runs clockwise from `from` to `to`, ends included, cut into equal buttons. Its
// ends are cut square with rounded corners (`cap`), so every arc reads as a piece of one
// ring rather than a pill; only the free bubble is a full half-round. The inner ring: three
// dice up and to the left, blue centred straight left of the button and orange straight
// above it; log centred straight right and settings straight below, shorter than the dice
// arc, so the gaps either side of the dice are wider than the one between the pills. The
// count arc sits one ring further out, its middle button on the line from the centre
// through the chosen die, its buttons half as far apart as the dice.
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

// A ring segment with rounded corners as one path of eight points: outer arc, corner, end
// edge, corner, inner arc, corner, start edge, corner. A corner radius is 0 on an edge
// shared with the next button, the arc's `cap` at its ends, or CAP for the bubble's full
// half-round, which with no straight run is a circle. The bubble morphs between all of
// these because the commands never change and every shape is traced the same way round
// from its outer anticlockwise end.
const sectorPath = (
  [ox, oy]: readonly [number, number],
  radius: number,
  { from, to, startCap, endCap }: Sector,
) => {
  const outer = radius + CAP;
  const inner = radius - CAP;
  // a corner circle sits this many degrees inside the end it rounds
  const turnOf = (cap: number, at: number) => (cap ? degrees(Math.asin(cap / at)) : 0);
  const [o0, i0, o1, i1] = [
    turnOf(startCap, outer - startCap),
    turnOf(startCap, inner + startCap),
    turnOf(endCap, outer - endCap),
    turnOf(endCap, inner + endCap),
  ];
  const at = (r: number, angle: number) => {
    const [x, y] = point(r, angle);
    return `${(ox + x).toFixed(2)} ${(oy + y).toFixed(2)}`;
  };
  // where a corner circle touches the radial edge
  const edge = (cap: number, turn: number) => Math.cos(turn / degrees(1)) * cap;
  return [
    `M ${at(outer, from - o0)}`,
    `A ${outer} ${outer} 0 0 1 ${at(outer, to + o1)}`,
    `A ${endCap} ${endCap} 0 0 1 ${at(edge(outer - endCap, o1), to)}`,
    `L ${at(edge(inner + endCap, i1), to)}`,
    `A ${endCap} ${endCap} 0 0 1 ${at(inner, to + i1)}`,
    `A ${inner} ${inner} 0 0 0 ${at(inner, from - i0)}`,
    `A ${startCap} ${startCap} 0 0 1 ${at(edge(inner + startCap, i0), from)}`,
    `L ${at(edge(outer - startCap, o0), from)}`,
    `A ${startCap} ${startCap} 0 0 1 ${at(outer, from - o0)}`,
    "Z",
  ].join(" ");
};
export const buttonPath = (arc: Arc, index: number) =>
  sectorPath([0, 0], arc.radius, sectorOf(arc, index));
// A cap-sized circle at a point: a capped segment with no straight run on the ring through
// the point, so its points face the same way as a button's and the morph between them
// stretches along the ring instead of spinning. Too close to the centre for such a ring,
// it is drawn on a small ring beside the point instead, facing the dice.
const circlePath = (x: number, y: number) => {
  const reach = Math.hypot(x, y);
  const radius = Math.max(CAP + 1, reach);
  const angle = reach ? degrees(Math.atan2(-y, x)) : 135;
  const [ux, uy] = point(1, angle);
  const origin =
    reach >= radius ? ([0, 0] as const) : ([x - ux * radius, y - uy * radius] as const);
  const cap = degrees(Math.asin(CAP / radius));
  return sectorPath(origin, radius, {
    from: angle + cap,
    to: angle - cap,
    startCap: CAP,
    endCap: CAP,
  });
};

export type Hit = { arc: "button" | ArcName; index: number };

// whether a point is on a button: within the ring's band along the button's run, or inside
// a full round cap. An end that is only rounded at the corners counts to its edge.
const covers = (arc: Arc, index: number, x: number, y: number) => {
  const { from, to, startCap, endCap } = sectorOf(arc, index);
  const round = (cap: number) => (cap === CAP ? degrees(Math.asin(CAP / arc.radius)) : 0);
  const turn = along(arc, degrees(Math.atan2(-y, x)));
  const onRun =
    Math.abs(Math.hypot(x, y) - arc.radius) <= CAP &&
    turn >= along(arc, from) + round(startCap) &&
    turn <= along(arc, to) - round(endCap);
  const inCap = [
    [startCap, from - round(startCap)],
    [endCap, to + round(endCap)],
  ].some(([cap = 0, angle = 0]) => {
    const [cx, cy] = point(arc.radius, angle);
    return cap === CAP && Math.hypot(x - cx, y - cy) <= CAP;
  });
  return onRun || inCap;
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

// a point held within the menu's reach, so a dragged bubble never leaves the drawing
const held = (x: number, y: number) => {
  const reach = Math.hypot(x, y);
  const limit = EXTENT - CAP;
  return reach > limit ? ([(x * limit) / reach, (y * limit) / reach] as const) : ([x, y] as const);
};

// Where the bubble is: a button's shape, or a circle round the pointer. The lens magnifies
// about `focus`, and a `snap` onto a button is eased while following the pointer is not.
export type Bubble = { d: string; focus: readonly [number, number]; snap: boolean };
export const bubbleOf = (found: Hit | null, x: number, y: number, arcs: Arcs): Bubble => {
  const arc = found && found.arc !== "button" ? arcs[found.arc] : undefined;
  if (found && arc)
    return { d: buttonPath(arc, found.index), focus: centreOf(arc, found.index), snap: true };
  const focus = found ? ([0, 0] as const) : held(x, y);
  return { d: circlePath(...focus), focus, snap: found !== null };
};
