export type SpacerProps = {
  // the gap's angular width in degrees
  span: number;
};

// A gap in an Arc's run; the segments either side get rounded corners. A description only,
// read by RadialMenu.tsx (README.md)
const Spacer = (_: SpacerProps) => null;

export default Spacer;
