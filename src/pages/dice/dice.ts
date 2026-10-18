// The three custom dice: pure data and geometry-free helpers shared by the page,
// the 3D scene and the icons. No React or three.js in here.

// the glyph colour on every die
export const CREAM = "#F3E7D3";

export const DIE_COLOURS = ["blue", "violet", "orange"] as const;
export type DieColour = (typeof DIE_COLOURS)[number];

// burst = star pip (counts as a hit), special = the hex nut ("s"), skull = the wrench ("f")
export const SYMBOLS = ["burst", "special", "skull"] as const;
export type DieSymbol = (typeof SYMBOLS)[number];
// what a roll's totals are called on screen
export const LABELS: Record<DieSymbol, string> = {
  burst: "Bursts",
  special: "Specials",
  skull: "Fails",
};
// how many dice of each colour a roll threw, colours in the menu's order, absent ones left out
export const countsOf = (dice: readonly DieColour[]) =>
  DIE_COLOURS.filter((colour) => dice.includes(colour)).map(
    (colour) => [colour, dice.filter((die) => die === colour).length] as const,
  );

// how many of each symbol a face shows
export type Face = Record<DieSymbol, number>;
export type Faces = readonly [Face, Face, Face, Face, Face, Face];
// face index doubles as the BoxGeometry material index (+x, −x, +y, −y, +z, −z)
export type FaceIndex = 0 | 1 | 2 | 3 | 4 | 5;

// "1s" → { burst: 1, special: 1, skull: 0 }
const face = (spec: string): Face => ({
  burst: Number(spec[0]),
  special: Number(spec.includes("s")),
  skull: Number(spec.includes("f")),
});

// Glyphs are SVG path data in a 100-unit face box (the hexagon, hollow hex and wrench from
// the "Rounded Ends" sheet, verbatim), so one string feeds both `new Path2D(d)` on a face
// canvas and `<path d>` in an icon. The bursts and the hollow hex are evenodd fills (their
// holes are subpaths); the wrench is a nonzero fill, as its jaws overlap its bar. The burst
// is a pointy-top hexagon of circumradius 38 with a shape cut out of its middle, a circle,
// a square or a triangle, which is what tells the dice apart.
export const GLYPH_BOX = 100;
// the solid hexagon every burst is cut from, and the mark for a burst when no die is meant
export const HEX = "M50.0,12.0L82.9,31.0L82.9,69.0L50.0,88.0L17.1,69.0L17.1,31.0Z";
// a regular polygon of `sides` and circumradius `r` round the middle, a vertex straight up
const polygon = (sides: number, r: number) =>
  Array.from({ length: sides }, (_, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / sides;
    return `${i ? "L" : "M"}${(50 + r * Math.cos(angle)).toFixed(1)},${(50 + r * Math.sin(angle)).toFixed(1)}`;
  }).join("") + "Z";
// a circle of radius `r` round the middle
const circle = (r: number) =>
  `M${50 - r},50A${r},${r} 0 1,0 ${50 + r},50A${r},${r} 0 1,0 ${50 - r},50Z`;

// the cut-outs are sized so the three cover about the same area
export const DICE: Record<DieColour, { hex: string; burst: string; faces: Faces }> = {
  // old white
  blue: {
    hex: "#2CB9E1",
    burst: `${HEX}${circle(13)}`,
    faces: [face("0f"), face("0"), face("0s"), face("1"), face("1s"), face("2")],
  },
  // old blue
  violet: {
    hex: "#FC4EFA",
    burst: `${HEX}${polygon(4, 17)}`,
    faces: [face("0f"), face("0s"), face("1"), face("1s"), face("2"), face("2")],
  },
  // old red
  orange: {
    hex: "#FC6E47",
    burst: `${HEX}${polygon(3, 20)}`,
    faces: [face("0f"), face("0s"), face("1s"), face("2"), face("3"), face("3")],
  },
};

// the special mark: a hollow hexagon with a 9-unit wall; the fail mark: a double open-end
// wrench on the diagonal (the sheet's rotate(-45 50 50) baked into the coordinates): the
// bar, then each jaw as a disc less the notch, all wound the same way for a nonzero fill
export const SPECIAL_PATH =
  "M50.0,6.8L87.4,28.4L87.4,71.6L50.0,93.2L12.6,71.6L12.6,28.4ZM50.0,17.2L78.4,33.6L78.4,66.4L50.0,82.8L21.6,66.4L21.6,33.6Z";
export const FAIL_PATH =
  "M22.07,70.15L70.15,22.07L77.93,29.85L29.85,77.93ZM11.6,78.5A15,15 0 1,1 21.5,88.4L30.91,78.99L21.01,69.09ZM88.4,21.5A15,15 0 1,1 78.5,11.6L69.09,21.01L78.99,30.91Z";
// each mark's scale against the burst: the hollow hex is drawn with its outer edge on the
// solid hexagon's outline (the sheet centres its wall on it, which on a face would close the
// gap to a neighbour), and the wrench, always alone on its face, larger
export const SYMBOL_SCALE: Record<DieSymbol, number> = { burst: 1, special: 38 / 43.2, skull: 1.3 };

// the SVG transform that fits the glyph box into `size` pixels centred on (cx, cy)
export const glyphTransform = (size: number, cx = 0, cy = 0) =>
  `translate(${cx - size / 2} ${cy - size / 2}) scale(${size / GLYPH_BOX})`;

export type Rolled = { colour: DieColour; face: FaceIndex };

export const score = (rolled: Rolled[]): Face =>
  rolled
    .map(({ colour, face }) => DICE[colour].faces[face])
    .reduce(
      (total, { burst, special, skull }) => ({
        burst: total.burst + burst,
        special: total.special + special,
        skull: total.skull + skull,
      }),
      { burst: 0, special: 0, skull: 0 },
    );

// Tiny seeded PRNG: everything about a roll (faces, then the throw) follows from its seed.
export const mulberry32 = (seed: number) => {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    const mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    const folded = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((folded ^ (folded >>> 14)) >>> 0) / 4294967296;
  };
};

export const newSeed = () => crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;

// The result of a roll: the first draws from its seed's generator, one face per die. The
// server records these; the physics worker draws them the same way before the throw.
export const drawFaces = (random: () => number, count: number): FaceIndex[] =>
  Array.from({ length: count }, () => Math.floor(random() * 6) as FaceIndex);

// Physics: the roll is simulated in a worker (physics.worker.ts) and played back from
// recorded frames. Lengths are in die units (the die is a unit cube).

export const MAX_POOL = 5;
// how high (in dice) the arena's ceiling sits
export const CEILING = 4;
// a die's edge as a share of the canvas height, whatever the width
export const DIE_SHARE = 0.075;
// how high above the floor (in dice) the camera sits: the scene derives its field of view
// from it, and the worker leans the walls along the frustum it gives. A plain number, so
// the worker never needs Math.tan (its throw stays to arithmetic and square roots).
export const EYE = 40;
export const FRAME_RATE = 60;
// playback speed of a recorded roll; drop it to watch a roll in slow motion
export const PLAYBACK_RATE = 1;
export const MAX_SECONDS = 6;
// one die in one frame: x y z qx qy qz qw
export const FRAME_STRIDE = 7;
// An impact's closing speed along the contact's normal (die units per second) below which
// it is too soft to hear, cutting the patter of a die settling, and the speed that plays at
// full volume. Measured over 12 seeds: a five-die roll then sounds 20–30 impacts and a lone
// die 2–7, the throw's first hits at full volume and the last at a quarter.
export const CONTACT_FLOOR = 3;
export const CONTACT_LOUD = 25;
// once at rest, a die's other faces fade over the fade time, then its rolled face
// pulses for the pulse time; the readout fades in along with the pulse
export const FADE_SECONDS = 0.3;
export const PULSE_SECONDS = 0.9;

// outward normal of each face in the die's own frame, in material-group order
export const FACE_NORMALS: Record<FaceIndex, readonly [number, number, number]> = {
  0: [1, 0, 0],
  1: [-1, 0, 0],
  2: [0, 1, 0],
  3: [0, -1, 0],
  4: [0, 0, 1],
  5: [0, 0, -1],
};

// the floor the dice land on: the visible canvas, centred on the origin
export type Arena = { width: number; height: number };

export type SimulateRequest = {
  count: number;
  seed: number;
  arena: Arena;
  version: number;
  // experiments only: overrides for the worker's feel constants
  tuning?: Record<string, number>;
};

// an impact in the recorded roll, for the sounds: a die on the table (floor or wall) or on
// another die, its `strength` 0–1 from the closing speed
export type Contact = { frame: number; kind: "table" | "dice"; strength: number };

export type Simulation = {
  count: number;
  seed: number;
  // the arena generation this was simulated for; stale replies are dropped
  version: number;
  // how many throws it took: a cocked or off-screen throw is rerolled from the same seed's chain
  attempts: number;
  // the result: the face each die will show, decided by the seed before the throw
  faces: FaceIndex[];
  // the face the physics actually left on top; the art is remapped from `faces` onto it
  landed: FaceIndex[];
  frameCount: number;
  // frameCount × count × FRAME_STRIDE
  frames: Float32Array;
  // the impacts the sounds play, by frame
  contacts: Contact[];
  // the arena it was thrown in; played back in another, the dice are anchored to it
  arena: Arena;
};

// how far a die turned by this quaternion reaches from its centre along the screen's x
// and y: half a die face-on, √2/2 at a 45° yaw
export const reach = (qx: number, qy: number, qz: number, qw: number): [number, number] => [
  (Math.abs(1 - 2 * (qy * qy + qz * qz)) +
    Math.abs(2 * (qx * qy - qz * qw)) +
    Math.abs(2 * (qx * qz + qy * qw))) /
    2,
  (Math.abs(2 * (qx * qy + qz * qw)) +
    Math.abs(1 - 2 * (qx * qx + qz * qz)) +
    Math.abs(2 * (qy * qz - qx * qw))) /
    2,
];

// centre to centre between placed dice (over a die's diagonal, so they never overlap),
// and twice their margin from the edges
export const SPACING = 1.5;

// Where a die thrown in one arena sits in another: it keeps its distance from the
// bottom-right corner, and if the left or top edge would clip it, it is pushed back in by
// its reach. The right and bottom are never clamped, so the throw can enter from off-screen.
export const anchor = (
  x: number,
  y: number,
  [rx, ry]: readonly [number, number],
  thrown: Arena,
  shown: Arena,
): [number, number] => [
  Math.max(x + (shown.width - thrown.width) / 2, rx - shown.width / 2),
  Math.min(y - (shown.height - thrown.height) / 2, shown.height / 2 - ry),
];

// offsets to try around a crowded spot, nearest first
const RINGS = Array.from({ length: 24 }, (_, k) =>
  Array.from({ length: 16 }, (_, a): [number, number] => [
    ((k + 1) / 4) * Math.cos((a * Math.PI) / 8),
    ((k + 1) / 4) * Math.sin((a * Math.PI) / 8),
  ]),
).flat();

export type Rest = { x: number; y: number; reach: readonly [number, number] };

// v kept within ±half, or centred when there is no room
const within = (v: number, half: number) => Math.min(Math.max(v, -half), Math.max(half, 0));

// How far each die of a roll moves from its anchored spot once the arena has changed:
// a die the left or top edge pushed in takes the nearest spot (searched in rings, kept
// half a SPACING inside the arena) that is a SPACING clear of every die placed before it,
// unpushed dice first. The others do not move. With no such spot within six dice, it stays.
export const arrange = (
  rests: readonly Rest[],
  thrown: Arena,
  shown: Arena,
): [number, number][] => {
  const anchored = rests.map(({ x, y, reach }) => anchor(x, y, reach, thrown, shown));
  const pushed = rests.map(
    ({ x, y, reach: [rx, ry] }) =>
      x + (shown.width - thrown.width) / 2 < rx - shown.width / 2 ||
      y - (shown.height - thrown.height) / 2 > shown.height / 2 - ry,
  );
  const fit = ([x, y]: readonly [number, number]): [number, number] => [
    within(x, (shown.width - SPACING) / 2),
    within(y, (shown.height - SPACING) / 2),
  ];
  const placed = rests
    .map((_, i) => i)
    .filter((i) => pushed[i])
    .reduce(
      (taken, i) => {
        const home = fit(anchored[i] ?? [0, 0]);
        const free = (spot: readonly [number, number]) =>
          [...taken.values()].every(([x, y]) => Math.hypot(spot[0] - x, spot[1] - y) >= SPACING);
        return taken.set(
          i,
          [home, ...RINGS.map(([dx, dy]) => fit([home[0] + dx, home[1] + dy]))].find(free) ?? home,
        );
      },
      new Map(anchored.flatMap((spot, i) => (pushed[i] ? [] : [[i, spot] as const]))),
    );
  return anchored.map(([ax, ay], i) => {
    const [x, y] = placed.get(i) ?? [ax, ay];
    return [x - ax, y - ay];
  });
};

// a roll on the table: the campaign's roll record paired with its simulation
export type RollResult = {
  id: string;
  simulation: Simulation;
  dice: Rolled[];
  author: { displayName: string; picture: string };
  // when the roll was posted, in ms
  time: number;
};
