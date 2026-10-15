import { type ThreeElements, useThree } from "@react-three/fiber";
import {
  arrange,
  CREAM,
  DICE,
  DIE_COLOURS,
  type DieColour,
  type DieSymbol,
  type Face,
  FACE_NORMALS,
  type FaceIndex,
  FAIL_PATH,
  FRAME_STRIDE,
  GLYPH_BOX,
  reach,
  type RollResult,
  SPECIAL_PATH,
  SYMBOLS,
} from "pages/dice/dice.ts";
import Die from "pages/dice/Die.tsx";
import { configure, type Owner, release } from "pages/dice/rollCache.ts";
import { useEffect, useMemo, useRef } from "react";
import {
  BoxGeometry,
  CanvasTexture,
  MeshStandardMaterial,
  Quaternion,
  SRGBColorSpace,
  Vector3,
} from "three";

const FACE_PX = 512;

// The marks are laid out so that a hexagon is one size on every face of every die and the
// gap between neighbours is one and a half ring bands (10.5 glyph units), flat edge to flat
// edge: two on a diagonal, top left to bottom right like a die's two, pitched at 60° so a
// slanted edge of each faces the other; three on an equilateral triangle (which, hexagons
// tiling as they do, keeps every gap the same). A hexagon is 65.8 units wide and 76 tall,
// so neighbouring centres sit 65.8 + 10.5 apart at the glyph scale, the triangle's rows
// 0.866 of that, and the trio spans 142 × scale tall. Each slot is a centre and a clockwise
// turn for the glyph: the two on the diagonal turn 240°, which leaves the hexagon, the
// triangle and the circle as they are and sets the violet die's diamond corner to corner
// along the diagonal, so the two diamonds line up with each other.
const GLYPH_SCALE = 0.6;
const SLOTS: Record<number, readonly (readonly [number, number, number])[]> = {
  1: [[50, 50, 0]],
  2: [
    [38.6, 30.2, 240],
    [61.4, 69.8, 240],
  ],
  3: [
    [27.1, 30.2, 0],
    [72.9, 30.2, 0],
    [50, 69.8, 0],
  ],
};
// the hollow hex is drawn with its outer edge on the solid hexagon's outline (the sheet
// centres its wall on it, which would close the gap to a neighbour), and the wrench,
// always alone on its face, larger
const SYMBOL_SCALE: Record<DieSymbol, number> = { burst: 1, special: 38 / 43.2, skull: 1.3 };
// Every mark is outlined on every edge, as the menu's are: a stroke of twice this (glyph
// units) under the mark, so this much shows past the fill, inside the hollow hex included,
// about 0.75px at a die's size on screen. Stroking under the fill is what keeps the wrench
// clean, as its jaws overlap its bar and a stroke on top would cross them. Black stays black
// under the material's tint.
const OUTLINE = 2;

// the glyphs of one face on a transparent ground; the face colour is the cube underneath
const glyphTexture = (face: Face, colour: DieColour, anisotropy: number) => {
  const canvas = Object.assign(document.createElement("canvas"), {
    width: FACE_PX,
    height: FACE_PX,
  });
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas is unavailable");
  const items = SYMBOLS.flatMap((symbol) => Array.from({ length: face[symbol] }, () => symbol));
  // the marks are drawn white and tinted by the material, so a face can glow whiter than cream
  ctx.fillStyle = "#ffffff";
  ctx.scale(FACE_PX / GLYPH_BOX, FACE_PX / GLYPH_BOX);
  items.forEach((symbol, i) => {
    const [cx, cy, turn] = SLOTS[items.length]?.[i] ?? [50, 50, 0];
    const scale = GLYPH_SCALE * SYMBOL_SCALE[symbol];
    const glyph = new Path2D(
      symbol === "burst" ? DICE[colour].burst : symbol === "special" ? SPECIAL_PATH : FAIL_PATH,
    );
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((turn * Math.PI) / 180);
    ctx.scale(scale, scale);
    ctx.translate(-GLYPH_BOX / 2, -GLYPH_BOX / 2);
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2 * OUTLINE;
    ctx.lineJoin = "round";
    ctx.stroke(glyph);
    // the hollow hex cuts its hole by evenodd; the wrench's jaws overlap its bar and would
    // cancel there, so it is the one nonzero fill
    if (symbol === "skull") ctx.fill(glyph);
    else ctx.fill(glyph, "evenodd");
    ctx.restore();
  });
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = anisotropy;
  return texture;
};

const IDENTITY = new Quaternion();

const normal = (face: FaceIndex) => new Vector3(...FACE_NORMALS[face]);

// A box on the floor (z = 0) for dice to roll in: `width` by `height` in world units, centred
// on the group's origin, with the walls on its edges, and `size` the edge of a die. The throw
// enters past the right and bottom edges, in view if the box is not the whole canvas. One
// table at a time: the roll cache simulates for one arena. `result` is the roll on the table,
// `seed` the campaign's next roll, simulated ahead of time for every pool size.
const DiceTable = ({
  width,
  height,
  size,
  result,
  seed,
  ...group
}: ThreeElements["group"] & {
  width: number;
  height: number;
  size: number;
  result?: RollResult;
  seed?: number;
}) => {
  const anisotropy = useThree((state) => state.gl.capabilities.getMaxAnisotropy());
  // the box measured in dice: the arena the physics throws in
  const arena = useMemo(
    () => ({ width: width / size, height: height / size }),
    [width, height, size],
  );
  const owner = useRef<Owner>({});
  useEffect(() => {
    const timer = setTimeout(() => configure(owner.current, arena, seed), 150);
    return () => clearTimeout(timer);
  }, [arena, seed]);
  useEffect(() => () => release(owner.current), []);

  const geometry = useMemo(() => new BoxGeometry(1, 1, 1), []);
  // per colour: the plain cube, and six glyph overlays (the material index is the face
  // index) that each die copies so its own faces can fade and glow
  const materials = useMemo(
    () => ({
      base: Object.fromEntries(
        DIE_COLOURS.map((colour) => [
          colour,
          new MeshStandardMaterial({ color: DICE[colour].hex, roughness: 0.55, metalness: 0 }),
        ]),
      ) as Record<DieColour, MeshStandardMaterial>,
      glyphs: Object.fromEntries(
        DIE_COLOURS.map((colour) => [
          colour,
          DICE[colour].faces.map(
            (face) =>
              new MeshStandardMaterial({
                map: glyphTexture(face, colour, anisotropy),
                transparent: true,
                color: CREAM,
                emissive: "#ffffff",
                emissiveIntensity: 0,
                roughness: 0.55,
                metalness: 0,
                polygonOffset: true,
                polygonOffsetFactor: -1,
              }),
          ),
        ]),
      ) as Record<DieColour, MeshStandardMaterial[]>,
    }),
    [anisotropy],
  );
  // the turn that carries each recorded face onto the face that landed up
  const remaps = useMemo(
    () =>
      result?.dice.map(({ face }, i) =>
        new Quaternion().setFromUnitVectors(
          normal(face),
          normal(result.simulation.landed[i] ?? face),
        ),
      ) ?? [],
    [result],
  );

  // how far each die moves from where the roll left it, once the arena has changed under
  // the roll (a die pushed in by an edge makes room for itself)
  const shifts = useMemo(() => {
    if (!result) return [];
    const { frames, frameCount, count } = result.simulation;
    const last = (i: number, offset: number) =>
      frames[((frameCount - 1) * count + i) * FRAME_STRIDE + offset] ?? 0;
    return arrange(
      result.dice.map((_, i) => ({
        x: last(i, 0),
        y: last(i, 1),
        reach: reach(last(i, 3), last(i, 4), last(i, 5), last(i, 6)),
      })),
      result.simulation.arena,
      arena,
    );
  }, [result, arena]);

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(
    () => () =>
      [...Object.values(materials.base), ...Object.values(materials.glyphs).flat()].forEach(
        (material) => {
          material.map?.dispose();
          material.dispose();
        },
      ),
    [materials],
  );

  return (
    <group {...group}>
      {result?.dice.map((die, i) => (
        <Die
          key={`${result.id}-${i}`}
          geometry={geometry}
          base={materials.base[die.colour]}
          glyphs={materials.glyphs[die.colour]}
          // the remap turns the recorded face's art up, so that is the face to highlight
          face={die.face}
          frames={result.simulation.frames}
          frameCount={result.simulation.frameCount}
          count={result.simulation.count}
          index={i}
          size={size}
          remap={remaps[i] ?? IDENTITY}
          settled={result.settled}
          thrown={result.simulation.arena}
          shown={arena}
          shift={shifts[i] ?? [0, 0]}
        />
      ))}
    </group>
  );
};

export default DiceTable;
