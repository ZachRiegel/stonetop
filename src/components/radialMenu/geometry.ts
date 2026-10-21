// The radial menu's geometry: rings of arcs round a centre button laid out from a
// description, the paths that draw their segments and the glass bubble, traced so they
// morph, and hit testing. No React or DOM in here; README.md describes the layout model.

// What a menu is made of: round the centre button (radius `centre`), rings that are bands
// from `start` to `end` px out, each placed by its own edges; on each, arcs centred on an
// `angle`, each a run of segments and spacers laid out clockwise. `corner` is the rounding,
// in px, at a run's ends and beside spacers.
export type ItemSpec = { kind: "segment" | "spacer"; span: number };
export type ArcSpec = { angle: number; items: ItemSpec[] };
export type RingSpec = { start: number; end: number; arcs: ArcSpec[] };
export type MenuSpec = { centre: number; corner: number; rings: RingSpec[] };

// Angles are degrees, 0 to the right and 90 up; screen y is flipped in `point`. A sector
// runs clockwise from `from` to `to`, its ends square with `startCap` and `endCap` corners.
export type Sector = { from: number; to: number; startCap: number; endCap: number };
// A segment as laid out: where it is in the description, its ring, its sector in the arc's
// home frame (the arc drawn with its run centred straight up) and the arc's `turn` from
// there to its place, anticlockwise. Arcs are drawn at home and turned by CSS, so a change
// of angle swings an arc round rather than redrawing it.
export type SegmentLayout = {
  ring: number;
  arc: number;
  index: number;
  radius: number;
  depth: number;
  home: Sector;
  turn: number;
  centre: readonly [number, number];
};
export type ArcLayout = { turn: number; segments: SegmentLayout[] };
export type RingLayout = { radius: number; depth: number; arcs: ArcLayout[] };
// `button` is the centre button's hit reach, halfway to the innermost ring, and `inner`
// that ring's inner edge: between them is a dead band, on nothing, though still inside the
// ring; `reach` the outermost ring's centreline, where a held pointer stops; `extent` how
// far the menu reaches from its centre; `bubble` the free bubble's radius, half the
// innermost ring's depth
export type Layout = {
  button: number;
  inner: number;
  reach: number;
  extent: number;
  bubble: number;
  rings: RingLayout[];
};

const HOME = 90;
const degrees = (radians: number) => (radians * 180) / Math.PI;
// screen px from the centre (y down) of a polar point
const point = (radius: number, angle: number) =>
  [
    radius * Math.cos((angle * Math.PI) / 180),
    -radius * Math.sin((angle * Math.PI) / 180),
  ] as const;
// degrees clockwise from `from` round to a point, in [0, 360)
const clockwiseFrom = (from: number, x: number, y: number) =>
  (((from - degrees(Math.atan2(-y, x))) % 360) + 360) % 360;
// a value kept by its key: shapes are traced once, since the menu redraws on every hover
const cached = <K, V>(store: Map<K, V>, key: K, make: () => V) => {
  const value = store.get(key) ?? make();
  store.set(key, value);
  return value;
};
const middleOf = ({ from, to }: Sector) => (from + to) / 2;
// a segment's sector turned into its place
export const placedOf = ({ home, turn }: SegmentLayout): Sector => ({
  ...home,
  from: home.from + turn,
  to: home.to + turn,
});
// a segment's centre in its arc's home frame, where its content is drawn
export const homeCentre = ({ radius, home }: SegmentLayout) => point(radius, middleOf(home));

// an arc's run laid out clockwise from `angle + total / 2`, in the home frame; a segment
// shares a square edge with a segment beside it and is rounded at a run's end or a spacer
const arcOf = (
  { angle, items }: ArcSpec,
  ring: number,
  arc: number,
  radius: number,
  depth: number,
  corner: number,
): ArcLayout => {
  const turn = angle - HOME;
  const capBeside = (item: ItemSpec | undefined) => (item?.kind === "segment" ? 0 : corner);
  return {
    turn,
    segments: items.reduce<{ at: number; segments: SegmentLayout[] }>(
      ({ at, segments }, { kind, span }, i) => ({
        at: at - span,
        segments:
          kind === "spacer"
            ? segments
            : [
                ...segments,
                {
                  ring,
                  arc,
                  index: segments.length,
                  radius,
                  depth,
                  turn,
                  home: {
                    from: at,
                    to: at - span,
                    startCap: capBeside(items[i - 1]),
                    endCap: capBeside(items[i + 1]),
                  },
                  centre: point(radius, at - span / 2 + turn),
                },
              ],
      }),
      { at: HOME + items.reduce((total, { span }) => total + span, 0) / 2, segments: [] },
    ).segments,
  };
};

// the rings are laid out, and drawn, in the order they are described; a segment's `ring`
// is its index there, which is how RadialMenu finds its description again
export const layoutOf = ({ centre, corner, rings }: MenuSpec): Layout => {
  const laid = rings.map(({ start, end, arcs }, ring) => {
    const [radius, depth] = [(start + end) / 2, end - start];
    return {
      radius,
      depth,
      arcs: arcs.map((arc, i) => arcOf(arc, ring, i, radius, depth, corner)),
    };
  });
  // the rings by their place, since they are described in any order; the first wins a tie
  const startOf = ({ radius, depth }: RingLayout) => radius - depth / 2;
  const endOf = ({ radius, depth }: RingLayout) => radius + depth / 2;
  const innermost = laid.reduce<RingLayout | undefined>(
    (best, ring) => (best && startOf(best) <= startOf(ring) ? best : ring),
    undefined,
  );
  const outermost = laid.reduce<RingLayout | undefined>(
    (best, ring) => (best && endOf(best) >= endOf(ring) ? best : ring),
    undefined,
  );
  const inner = innermost ? startOf(innermost) : centre;
  return {
    button: (centre + inner) / 2,
    inner,
    reach: outermost?.radius ?? centre,
    extent: outermost ? endOf(outermost) : centre,
    bubble: innermost ? innermost.depth / 2 : centre,
    rings: laid,
  };
};

// Every shape is traced the same way: `samples` points on its outline at equal angles round
// its centre, clockwise from straight up, joined by lines. A CSS `d` transition then morphs
// any shape into any other traced with the same count point for point along those rays, with
// no spin whichever way the shapes face. The outline is found by bisection along each ray
// out to `bound`, so a shape only needs an inside test; every shape here is star-shaped about
// its centre (spans stay under 180°). At 5° a step the lines are within 0.15px of the true
// arcs.
const SAMPLES = 72;
export const traced = (
  inside: (x: number, y: number) => boolean,
  [sx, sy]: readonly [number, number],
  bound: number,
  samples = SAMPLES,
) => {
  const points = Array.from({ length: samples }, (_, i) => {
    const [ux, uy] = point(1, 90 - (i * 360) / samples);
    const [r] = Array.from({ length: 16 }).reduce<[number, number]>(
      ([lo, hi]) => {
        const mid = (lo + hi) / 2;
        return inside(ux * mid, uy * mid) ? [mid, hi] : [lo, mid];
      },
      [0, bound],
    );
    return `${(sx + ux * r).toFixed(2)} ${(sy + uy * r).toFixed(2)}`;
  });
  return `M ${points.join(" L ")} Z`;
};

// Whether a point, from a segment's centre, is inside its ring sector, whose ring is centred
// at [ox, oy] and `half` its depth each side: within the ring's band and the sector's turn,
// and not cut off by a corner. A corner circle sits `cap` inside both the arc and the edge
// it rounds, and past its centre towards the corner only the circle itself is inside.
const inSector =
  (
    [ox, oy]: readonly [number, number],
    radius: number,
    half: number,
    { from, to, startCap, endCap }: Sector,
  ) =>
  (x: number, y: number) => {
    const [dx, dy] = [x - ox, y - oy];
    const r = Math.hypot(dx, dy);
    const turn = clockwiseFrom(from, dx, dy);
    if (r < radius - half || r > radius + half || turn > from - to) return false;
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
        [radius + half - cap, radius - half + cap].some((at) => cutBy(cap, end, towards, at)),
    );
  };
// a segment's outline in one of its sectors, about `origin`
const outlineOf = (
  { radius, depth }: SegmentLayout,
  sector: Sector,
  origin: readonly [number, number],
) =>
  traced(
    inSector(point(-radius, middleOf(sector)), radius, depth / 2, sector),
    origin,
    2 * radius + depth,
  );
// a segment's path in its arc's home frame, by its shape alone
const paths = new Map<string, string>();
export const segmentPath = (segment: SegmentLayout) => {
  const { from, to, startCap, endCap } = segment.home;
  return cached(
    paths,
    `${segment.radius} ${segment.depth} ${from} ${to} ${startCap} ${endCap}`,
    () => outlineOf(segment, segment.home, homeCentre(segment)),
  );
};
// the free bubble: a circle round its centre
const circles = new Map<number, string>();
const circleOf = (radius: number) =>
  cached(circles, radius, () => traced((x, y) => Math.hypot(x, y) <= radius, [0, 0], radius));

export type Hit = { kind: "centre" } | { kind: "segment"; segment: SegmentLayout };
// layouts are rebuilt every render, so segments are compared by their place in the
// description, not by identity; null, for no segment, is the same only as null
export const sameSegment = (a: SegmentLayout | null, b: SegmentLayout | null) =>
  a === b || (!!a && !!b && a.ring === b.ring && a.arc === b.arc && a.index === b.index);
// the segment a hit is on, or null for the centre button or nothing
export const segmentOf = (found: Hit | null) => (found?.kind === "segment" ? found.segment : null);

// whether a point is on a segment: within its ring's band, along its run; the rounded
// corners are counted square, so a run's end counts to its edge
const covers = (segment: SegmentLayout, x: number, y: number) => {
  const { from, to } = placedOf(segment);
  return (
    Math.abs(Math.hypot(x, y) - segment.radius) <= segment.depth / 2 &&
    clockwiseFrom(from, x, y) <= from - to
  );
};

// whether a point is inside the innermost ring: on the centre button, or in the gap round it
export const insideRing = (x: number, y: number, { inner }: Layout) => Math.hypot(x, y) < inner;

// what is under a point: the centre button, a segment, or nothing
export const hit = (x: number, y: number, { button, rings }: Layout): Hit | null => {
  if (Math.hypot(x, y) <= button) return { kind: "centre" };
  const segment = rings
    .flatMap(({ arcs }) => arcs.flatMap(({ segments }) => segments))
    .find((segment) => covers(segment, x, y));
  return segment ? { kind: "segment", segment } : null;
};

// A point held within the menu's reach: the pointer as the menu sees it, so a dragged
// bubble never leaves the drawing and, pulled past the outer ring, sits on the ring and
// means whatever it sits on.
export const held = (x: number, y: number, { reach }: Layout) => {
  const distance = Math.hypot(x, y);
  return distance > reach
    ? ([(x * reach) / distance, (y * reach) / distance] as const)
    : ([x, y] as const);
};

// What the bubble is: its shape, a segment's or a circle, drawn round where it is `placed`,
// a segment's centre, or null when free. CSS mixes the placed point with the pointer
// (README.md, "The glass bubble").
export type Bubble = { d: string; placed: readonly [number, number] | null };
export const bubbleOf = (found: Hit | null, layout: Layout): Bubble =>
  found?.kind === "segment"
    ? { d: outlineOf(found.segment, placedOf(found.segment), [0, 0]), placed: found.segment.centre }
    : { d: circleOf(layout.bubble), placed: found ? [0, 0] : null };
