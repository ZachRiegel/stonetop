import type { ReactNode } from "react";

export type SegmentProps = {
  // the segment's angular width in degrees
  span: number;
  // its accessible name
  label: string;
  fill: string;
  // the fill while the pointer is over it; `fill` when not given
  hoverFill?: string;
  dimmed?: boolean;
  // a click, a drag released on it, or Enter or Space while it is focused
  onActivate: () => void;
  // the drag's bubble arrived on it
  onDragEnter?: () => void;
  // SVG content drawn at the segment's centre, kept upright as its arc turns
  children?: ReactNode;
};

// A button on an Arc: a description only, read and drawn by RadialMenu.tsx (README.md)
const Segment = (_: SegmentProps) => null;

export default Segment;
