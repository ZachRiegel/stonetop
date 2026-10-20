import { css } from "@emotion/react";
import type { FC } from "react";

// Either a white-on-black PNG painted through a luminance mask, or an inline SVG
// icon that keeps its own colours (the mask would paint it grey).
export type Glyph =
  { src: string; Icon?: never } | { Icon: FC<{ className?: string }>; src?: never };

// `size` is the box; a PNG is painted in the text's colour, an SVG icon draws itself at
// --icon-size, which the text around it may set
const NavigationIcon = ({
  src,
  Icon,
  size,
  className,
}: Glyph & { size: number; className?: string }) => (
  <div
    className={className}
    css={css`
      width: ${size}px;
      height: ${size}px;
      display: grid;
      place-items: center;
      flex: none;
    `}
  >
    {Icon ? (
      <Icon />
    ) : (
      <div
        css={css`
          width: ${size}px;
          height: ${size}px;
          background-color: currentColor;
          mask-image: url("${src}");
          mask-mode: luminance;
          mask-position: center;
          mask-repeat: no-repeat;
          mask-size: contain;
        `}
      />
    )}
  </div>
);

export default NavigationIcon;
