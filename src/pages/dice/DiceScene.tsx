import { useThree } from "@react-three/fiber";
import {
  CREAM,
  DICE,
  DIE_COLOURS,
  type DieColour,
  type DieSymbol,
  type Face,
  FACE_NORMALS,
  type FaceIndex,
  FAIL_PATH,
  type RollResult,
  SPECIAL_PATH,
  STAR_PATHS,
  type StarPoints,
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

const INK = "#1A1A1A";
const FACE_PX = 512;

// slot positions in face units (−1..1 of the safe half-width, y down) by item count, laid out so
// the set's bounding box sits centred on the face
const SAFE_HALF_WIDTH = 0.37;
const SLOTS: Record<number, readonly (readonly [number, number])[]> = {
  1: [[0, 0]],
  2: [
    [-0.5, -0.5],
    [0.5, 0.5],
  ],
  3: [
    [0, -0.55],
    [-0.6, 0.45],
    [0.6, 0.45],
  ],
};
// glyph radius as a fraction of the face, the same whatever else shares the face
const SYMBOL_RADIUS: Record<DieSymbol, number> = { burst: 0.23, special: 0.19, skull: 0.24 };

const drawGlyph = (ctx: CanvasRenderingContext2D, symbol: DieSymbol, points: StarPoints) => {
  const glyph = new Path2D(
    symbol === "burst" ? STAR_PATHS[points] : symbol === "special" ? SPECIAL_PATH : FAIL_PATH,
  );
  // drawn white and tinted by the material, so a face can glow whiter than cream
  ctx.fillStyle = "#ffffff";
  ctx.fill(glyph, "evenodd");
  ctx.lineJoin = "round";
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.9;
  ctx.stroke(glyph);
};

// the glyphs of one face on a transparent ground; the face colour is the cube underneath
const glyphTexture = (face: Face, colour: DieColour, anisotropy: number) => {
  const canvas = Object.assign(document.createElement("canvas"), {
    width: FACE_PX,
    height: FACE_PX,
  });
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas is unavailable");
  const items = SYMBOLS.flatMap((symbol) => Array.from({ length: face[symbol] }, () => symbol));
  items.forEach((symbol, i) => {
    const [sx, sy] = SLOTS[items.length]?.[i] ?? [0, 0];
    ctx.save();
    ctx.translate(FACE_PX * (0.5 + sx * SAFE_HALF_WIDTH), FACE_PX * (0.5 + sy * SAFE_HALF_WIDTH));
    // a special mark alone on its face gets the room a burst would have had
    const radius = SYMBOL_RADIUS[symbol] * (symbol === "special" && items.length === 1 ? 1.25 : 1);
    ctx.scale((FACE_PX * radius) / 11, (FACE_PX * radius) / 11);
    ctx.translate(-12, -12);
    drawGlyph(ctx, symbol, DICE[colour].points);
    ctx.restore();
  });
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = anisotropy;
  return texture;
};

// a die's edge as a share of the screen height, whatever the width
const DIE_SHARE = 0.075;
const IDENTITY = new Quaternion();

const normal = (face: FaceIndex) => new Vector3(...FACE_NORMALS[face]);

// `seed` is the campaign's next roll, simulated ahead of time for every pool size
const DiceScene = ({ result, seed }: { result?: RollResult; seed?: number }) => {
  const viewport = useThree((state) => state.viewport);
  const anisotropy = useThree((state) => state.gl.capabilities.getMaxAnisotropy());
  const size = DIE_SHARE * viewport.height;
  // the walls sit exactly on the visible edges of the canvas, measured in dice
  const arenaWidth = viewport.width / size;
  const arenaHeight = viewport.height / size;
  const owner = useRef<Owner>({});
  useEffect(() => {
    const timer = setTimeout(
      () => configure(owner.current, { width: arenaWidth, height: arenaHeight }, seed),
      150,
    );
    return () => clearTimeout(timer);
  }, [arenaWidth, arenaHeight, seed]);
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
    <>
      <ambientLight intensity={0.6} />
      <hemisphereLight args={["#ffffff", "#202030", 0.6]} />
      <directionalLight position={[2, 3, 8]} intensity={1.8} />
      <directionalLight position={[-4, -2, 5]} intensity={0.5} />
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
        />
      ))}
    </>
  );
};

export default DiceScene;
