// The die button's icon: a die that morphs into an X and back as the button's press comes
// to mean "clear the dice" rather than "roll" (data-closing on the button). Both are one
// path of the same points, an outline and five pips traced from the centre as the radial
// menu's bubble shapes are (geometry.ts), so a CSS `d` transition carries one onto the
// other: the square's outline draws in to the cross and the pips close to nothing.
import styled from "@emotion/styled";
import { traced } from "components/radialMenu/geometry.ts";

// drawn in the material icons' 24-unit box, about its middle
const BOX = 24;
const MIDDLE = BOX / 2;
// the die: a square `half` each way from the middle, its corners rounded by `radius`
const square =
  (half: number, radius: number) =>
  (x: number, y: number): boolean => {
    const [ax, ay] = [Math.abs(x), Math.abs(y)];
    const edge = half - radius;
    return ax <= edge || ay <= edge
      ? ax <= half && ay <= half
      : Math.hypot(ax - edge, ay - edge) <= radius;
  };
// the X: two bars `width` each side of the diagonals, cut square `length` from the middle
const cross =
  (width: number, length: number) =>
  (x: number, y: number): boolean => {
    const [u, v] = [(x + y) / Math.SQRT2, (x - y) / Math.SQRT2];
    return (
      (Math.abs(u) <= width && Math.abs(v) <= length) ||
      (Math.abs(v) <= width && Math.abs(u) <= length)
    );
  };
// the five pips, on the diagonals the cross follows
const PIPS: readonly (readonly [number, number])[] = [
  [0, 0],
  [-4.5, -4.5],
  [4.5, -4.5],
  [-4.5, 4.5],
  [4.5, 4.5],
];
// an outline with pips of `radius` cut from it (evenodd); a radius of 0 traces each pip to
// a point, so the pip closes rather than vanishing
const shape = (outline: (x: number, y: number) => boolean, radius: number) =>
  [
    traced(outline, [MIDDLE, MIDDLE], MIDDLE, 120),
    ...PIPS.map(([dx, dy]) =>
      traced((x, y) => Math.hypot(x, y) <= radius, [MIDDLE + dx, MIDDLE + dy], 3, 12),
    ),
  ].join(" ");
const DIE = shape(square(9, 2.5), 1.6);
const CLOSE = shape(cross(1.4, 7 * Math.SQRT2), 0);

const Svg = styled.svg`
  width: var(--icon-size, 24px);
  height: var(--icon-size, 24px);
`;

const Mark = styled.path`
  fill: currentColor;
  fill-rule: evenodd;
  d: path("${DIE}");
  transition: d 200ms ease-out;

  [data-closing="true"] & {
    d: path("${CLOSE}");
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const DieOrClose = ({ className }: { className?: string }) => (
  <Svg className={className} viewBox={`0 0 ${BOX} ${BOX}`} aria-hidden="true">
    <Mark d={DIE} />
  </Svg>
);

export default DieOrClose;
