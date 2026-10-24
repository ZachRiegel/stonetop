import { css } from "@emotion/react";
import type { FC } from "react";

// Either a white-on-transparent PNG, or an inline SVG icon that keeps its own colours (the
// mask would paint it grey).
export type Glyph =
  { src: string; Icon?: never } | { Icon: FC<{ className?: string }>; src?: never };

// `size` is the box; a PNG is the box itself, painted in the text's colour through its alpha
// (WebKit ignores mask-mode: luminance on a raster image, bug 282530: a white-on-black glyph
// was a solid square on an iPhone, 2026-10-22); an SVG icon draws itself at --icon-size
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
      ${
        src &&
        `
        background-color: currentColor;
        mask-image: url("${src}");
        mask-position: center;
        mask-repeat: no-repeat;
        mask-size: contain;
      `
      }
    `}
  >
    {Icon && <Icon />}
  </div>
);

export default NavigationIcon;
