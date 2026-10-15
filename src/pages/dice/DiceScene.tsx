import { useThree } from "@react-three/fiber";
import { CEILING, DIE_SHARE, type RollResult } from "pages/dice/dice.ts";
import DiceTable from "pages/dice/DiceTable.tsx";
import RollSounds from "pages/dice/RollSounds.tsx";
import { useLayoutEffect, useRef } from "react";
import { type DirectionalLight } from "three";

// where the key light sits: at the bottom left of the screen, 45° above the floor so a die's
// shadow is about a die long and runs up and to the right
const KEY_ELEVATION = Math.PI / 4;
const KEY_AZIMUTH = Math.PI / 4;
// how dark a shadow is on the page's grey
const SHADOW = 0.35;

// The dice page's scene: a table the size of the visible canvas (the floor is the page's own
// grey showing through a shadow-only plane), so the walls sit on its edges and the throw
// enters from off-screen. A low light from the lower left throws each die's shadow up
// the screen; ambient, sky and a soft top light fill the faces in.
const DiceScene = ({ result, seed }: { result?: RollResult; seed?: number }) => {
  const viewport = useThree((state) => state.viewport);
  const size = DIE_SHARE * viewport.height;
  const key = useRef<DirectionalLight>(null);
  // the shadow camera is boxed to the arena (and the air above it) in world units; the
  // props would set the bounds but not refresh the projection, so it is done by hand
  useLayoutEffect(() => {
    const light = key.current;
    if (!light) return;
    const camera = light.shadow.camera;
    camera.left = -(viewport.width / 2 + size);
    camera.right = viewport.width / 2 + size;
    camera.top = viewport.height / 2 + CEILING * size;
    camera.bottom = -(viewport.height / 2 + CEILING * size);
    camera.near = 0.1;
    camera.far = 4 * viewport.height;
    camera.updateProjectionMatrix();
    light.shadow.normalBias = 0.02 * size;
    light.shadow.needsUpdate = true;
  }, [viewport, size]);
  return (
    <>
      <ambientLight intensity={0.5} />
      <hemisphereLight args={["#ffffff", "#606060", 0.4]} />
      <directionalLight
        ref={key}
        castShadow
        intensity={1.5}
        position={[
          -2 * viewport.height * Math.cos(KEY_ELEVATION) * Math.sin(KEY_AZIMUTH),
          -2 * viewport.height * Math.cos(KEY_ELEVATION) * Math.cos(KEY_AZIMUTH),
          2 * viewport.height * Math.sin(KEY_ELEVATION),
        ]}
        shadow-mapSize={[2048, 2048]}
      />
      <directionalLight position={[1, 2, 6]} intensity={0.6} />
      <mesh receiveShadow>
        <planeGeometry args={[2 * viewport.width, 2 * viewport.height]} />
        <shadowMaterial transparent opacity={SHADOW} />
      </mesh>
      <DiceTable
        width={viewport.width}
        height={viewport.height}
        size={size}
        result={result}
        seed={seed}
      />
      <RollSounds result={result} />
    </>
  );
};

export default DiceScene;
