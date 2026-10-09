// The three custom dice: pure data and geometry-free helpers shared by the page,
// the 3D scene and the icons. No React or three.js in here.

// the glyph colour on every die
export const CREAM = "#F3E7D3";

export const DIE_COLOURS = ["blue", "violet", "orange"] as const;
export type DieColour = (typeof DIE_COLOURS)[number];

// burst = star pip (counts as a hit), special = the hex nut ("s"), skull = the wrench ("f")
export const SYMBOLS = ["burst", "special", "skull"] as const;
export type DieSymbol = (typeof SYMBOLS)[number];

// how many of each symbol a face shows
export type Face = Record<DieSymbol, number>;
export type Faces = readonly [Face, Face, Face, Face, Face, Face];
// face index doubles as the BoxGeometry material index (+x, −x, +y, −y, +z, −z)
export type FaceIndex = 0 | 1 | 2 | 3 | 4 | 5;

export type StarPoints = 4 | 5 | 6;

// "1s" → { burst: 1, special: 1, skull: 0 }
const face = (spec: string): Face => ({
  burst: Number(spec[0]),
  special: Number(spec.includes("s")),
  skull: Number(spec.includes("f")),
});

export const DICE: Record<DieColour, { hex: string; points: StarPoints; faces: Faces }> = {
  // old white
  blue: {
    hex: "#14CFFD",
    points: 4,
    faces: [face("0f"), face("0"), face("0s"), face("1"), face("1s"), face("2")],
  },
  // old blue
  violet: {
    hex: "#FF44FD",
    points: 5,
    faces: [face("0f"), face("0s"), face("1"), face("1s"), face("2"), face("2")],
  },
  // old red
  orange: {
    hex: "#FF6A3C",
    points: 6,
    faces: [face("0f"), face("0s"), face("1s"), face("2"), face("3"), face("3")],
  },
};

// Glyphs are SVG path data in a 24×24 box centred on (12, 12), so one string feeds
// both `new Path2D(d)` on a face canvas and `<path d>` in an icon.

// inner radius as a fraction of the outer one: a sparkle, a five-point star, a hexagram
const STAR_INNER_RATIO: Record<StarPoints, number> = { 4: 0.38, 5: 0.45, 6: 0.58 };

export const starPath = (points: StarPoints, outer = 11, cx = 12, cy = 12) => {
  const vertices = Array.from({ length: points * 2 }, (_, i) => {
    const radius = i % 2 ? outer * STAR_INNER_RATIO[points] : outer;
    const angle = -Math.PI / 2 + (i * Math.PI) / points;
    return [radius * Math.cos(angle), radius * Math.sin(angle)] as const;
  });
  // centre the bounding box, not the circumcentre: an odd-pointed star otherwise sits high
  const ys = vertices.map(([, y]) => y);
  const lift = (Math.max(...ys) + Math.min(...ys)) / 2;
  return (
    vertices
      .map(([x, y], i) => `${i ? "L" : "M"}${(cx + x).toFixed(2)} ${(cy + y - lift).toFixed(2)}`)
      .join("") + "Z"
  );
};

export const STAR_PATHS: Record<StarPoints, string> = {
  4: starPath(4),
  5: starPath(5),
  6: starPath(6),
};

// the special mark: a hex nut (a hexagon with a round hole, evenodd); the fail mark: an
// open-end wrench lying head up-left (both picked from src/holding/glyphPreview.html)
export const SPECIAL_PATH =
  "M12.00 1.00L21.53 6.50L21.53 17.50L12.00 23.00L2.47 17.50L2.47 6.50ZM12.00 7.40A4.6 4.6 0 1 0 12.00 16.60A4.6 4.6 0 1 0 12.00 7.40Z";
export const FAIL_PATH =
  "M15.96 18.93L10.13 13.10A5.2 5.2 0 0 1 3.58 5.98L7.69 10.09L10.09 7.69L5.98 3.58A5.2 5.2 0 0 1 13.10 10.13L18.93 15.96A2.1 2.1 0 0 1 15.96 18.93Z";

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
export const FRAME_RATE = 60;
// playback speed of a recorded roll; drop it to watch a roll in slow motion
export const PLAYBACK_RATE = 1;
export const MAX_SECONDS = 6;
// one die in one frame: x y z qx qy qz qw
export const FRAME_STRIDE = 7;
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
};

// a roll on the table: the campaign's roll record paired with its simulation; one shown
// as `settled` was already over when the page opened and is drawn at rest
export type RollResult = {
  id: string;
  simulation: Simulation;
  dice: Rolled[];
  roller: { displayName: string; picture: string };
  settled: boolean;
};
