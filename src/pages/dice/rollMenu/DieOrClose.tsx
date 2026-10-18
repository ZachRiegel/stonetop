// The die button's icon: a die that crossfades into an X and back as the button's press
// comes to mean "clear the dice" rather than "roll" (data-closing on the button). The two
// material icons are drawn as paths over each other in one svg, so the swap is one opacity
// transition each way and the button's own icon box is unchanged.
import styled from "@emotion/styled";
import { iconPath } from "components/Icon.tsx";

const Svg = styled.svg`
  width: var(--icon-size, 24px);
  height: var(--icon-size, 24px);
  fill: currentColor;
`;

// shown while the button closes and hidden otherwise, or the reverse
const Glyph = styled.path<{ whileClosing: boolean }>`
  opacity: ${({ whileClosing }) => (whileClosing ? 0 : 1)};
  transition: opacity 200ms ease-out;

  [data-closing="true"] & {
    opacity: ${({ whileClosing }) => (whileClosing ? 1 : 0)};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const DieOrClose = ({ className }: { className?: string }) => (
  <Svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <Glyph d={iconPath("Die")} whileClosing={false} />
    <Glyph d={iconPath("Close")} whileClosing />
  </Svg>
);

export default DieOrClose;
