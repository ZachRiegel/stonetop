import { useThree } from "@react-three/fiber";
import { type RollResult } from "pages/dice/dice.ts";
import DiceTable from "pages/dice/DiceTable.tsx";

// a die's edge as a share of the canvas height, whatever the width
const DIE_SHARE = 0.075;

// The dice page's scene: lit from above, with a table the size of the visible canvas, so the
// walls sit on its edges and the throw enters from off-screen.
const DiceScene = ({ result, seed }: { result?: RollResult; seed?: number }) => {
  const viewport = useThree((state) => state.viewport);
  return (
    <>
      <ambientLight intensity={0.6} />
      <hemisphereLight args={["#ffffff", "#202030", 0.6]} />
      <directionalLight position={[2, 3, 8]} intensity={1.8} />
      <directionalLight position={[-4, -2, 5]} intensity={0.5} />
      <DiceTable
        width={viewport.width}
        height={viewport.height}
        size={DIE_SHARE * viewport.height}
        result={result}
        seed={seed}
      />
    </>
  );
};

export default DiceScene;
