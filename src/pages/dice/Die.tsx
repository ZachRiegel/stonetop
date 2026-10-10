import { useFrame } from "@react-three/fiber";
import {
  anchor,
  type Arena,
  CREAM,
  type FaceIndex,
  FADE_SECONDS,
  FRAME_RATE,
  FRAME_STRIDE,
  PLAYBACK_RATE,
  PULSE_SECONDS,
  reach,
} from "pages/dice/dice.ts";
import { useEffect, useMemo, useRef } from "react";
import {
  type BufferGeometry,
  Color,
  type Group,
  type Material,
  MathUtils,
  type MeshStandardMaterial,
  Quaternion,
} from "three";

// once at rest: the other faces' glyphs fade to this, then the rolled face's glyphs
// pulse from cream to white and back
const DIM_OPACITY = 0.35;
const PULSE_GLOW = 0.45;
const CREAM_COLOUR = new Color(CREAM);
const WHITE = new Color("#ffffff");

// Plays one die's slice of a recorded simulation: frames are in die units, interpolated
// between steps, and `remap` is the fixed turn that puts the rolled face's art on the
// face the physics left on top (the die was turned before the throw, in effect). A
// `settled` die skips the throw and sits on its last frame from the start. When the
// `shown` arena is not the `thrown` one, every frame is anchored to it, and `shift` (from
// `arrange`) moves the whole flight to where the die found room to rest.
const Die = ({
  geometry,
  base,
  glyphs,
  face,
  frames,
  frameCount,
  count,
  index,
  size,
  remap,
  settled,
  thrown,
  shown,
  shift,
}: {
  geometry: BufferGeometry;
  base: Material;
  glyphs: MeshStandardMaterial[];
  face: FaceIndex;
  frames: Float32Array;
  frameCount: number;
  count: number;
  index: number;
  size: number;
  remap: Quaternion;
  settled: boolean;
  thrown: Arena;
  shown: Arena;
  shift: readonly [number, number];
}) => {
  const group = useRef<Group>(null);
  const elapsed = useRef(0);
  const scratch = useRef({ from: new Quaternion(), to: new Quaternion() });
  const reduced = useMemo(
    () => settled || matchMedia("(prefers-reduced-motion: reduce)").matches,
    [settled],
  );
  // this die's own copies of the glyph overlays, so its faces fade and glow on their own
  const overlays = useRef<MeshStandardMaterial[]>(null);
  overlays.current ??= glyphs.map((material) => material.clone());
  useEffect(() => () => overlays.current?.forEach((material) => material.dispose()), []);

  useFrame((_, delta) => {
    if (!group.current || !overlays.current) return;
    // clamp so a backgrounded tab does not skip the whole roll on return
    elapsed.current += Math.min(delta, 0.1);
    const last = frameCount - 1;
    const at = reduced ? last : Math.min(elapsed.current * FRAME_RATE * PLAYBACK_RATE, last);
    const a = Math.floor(at);
    const b = Math.min(a + 1, last);
    const t = at - a;
    const read = (frame: number, offset: number) =>
      frames[(frame * count + index) * FRAME_STRIDE + offset] ?? 0;
    const { from, to } = scratch.current;
    from.set(read(a, 3), read(a, 4), read(a, 5), read(a, 6));
    to.set(read(b, 3), read(b, 4), read(b, 5), read(b, 6));
    const turn = group.current.quaternion.copy(from).slerp(to, t);
    const [x, y] = anchor(
      MathUtils.lerp(read(a, 0), read(b, 0), t),
      MathUtils.lerp(read(a, 1), read(b, 1), t),
      reach(turn.x, turn.y, turn.z, turn.w),
      thrown,
      shown,
    );
    group.current.position
      .set(x + shift[0], y + shift[1], MathUtils.lerp(read(a, 2), read(b, 2), t))
      .multiplyScalar(size);
    turn.multiply(remap);
    group.current.visible = true;

    // seconds at rest; a settled die (or reduced motion) has faded and skips the pulse
    const rest = reduced
      ? Infinity
      : Math.max(0, elapsed.current - last / FRAME_RATE / PLAYBACK_RATE);
    const fade = Math.min(1, rest / FADE_SECONDS);
    const pulse = Math.sin(Math.PI * MathUtils.clamp((rest - FADE_SECONDS) / PULSE_SECONDS, 0, 1));
    overlays.current.forEach((material, f) => {
      if (f === face) {
        material.color.lerpColors(CREAM_COLOUR, WHITE, pulse);
        material.emissiveIntensity = PULSE_GLOW * pulse;
      } else {
        material.opacity = 1 - (1 - DIM_OPACITY) * fade;
      }
    });
  });

  return (
    <group ref={group} scale={size} visible={false}>
      <mesh geometry={geometry} material={base} />
      <mesh geometry={geometry} material={overlays.current} scale={1.004} />
    </group>
  );
};

export default Die;
