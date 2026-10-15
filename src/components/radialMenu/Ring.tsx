import type { ReactNode } from "react";

export type RingProps = {
  // the ring's inner and outer edges, px from the menu's centre; its segments fill the band
  startDistance: number;
  endDistance: number;
  // the ring's Arcs
  children?: ReactNode;
};

// A band of a RadialMenu at a distance from its centre, placed by its own edges and not by
// its order among the children: a description only, read and drawn by RadialMenu.tsx
// (README.md)
const Ring = (_: RingProps) => null;

export default Ring;
