import type { ReactNode } from "react";

export type ArcProps = {
  // degrees, 0 to the right and 90 up, through the middle of the arc's run; when it
  // changes the arc swings round to the new angle
  angle: number;
  // while a drag sits on one of the arc's segments, the others dim
  dimOthersUnderDrag?: boolean;
  // the arc's Segments and Spacers, laid out clockwise from the run's start
  children?: ReactNode;
};

// A run of segments on a Ring, centred on an angle: a description only, read and drawn by
// RadialMenu.tsx (README.md)
const Arc = (_: ArcProps) => null;

export default Arc;
