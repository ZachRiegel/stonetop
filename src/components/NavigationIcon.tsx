import { css } from "@emotion/react";
import type { FC } from "react";

// Either a white-on-black PNG painted through a luminance mask, or an inline SVG
// icon that keeps its own colours (the mask would paint it grey).
export type Glyph =
  { src: string; Icon?: never } | { Icon: FC<{ className?: string }>; src?: never };

// `size` is the box (40 by default, the sidebar's); a PNG is painted `color`, the sidebar's
// grey unless the icon sits in text that should colour it ("currentColor")
const NavigationIcon = ({
  src,
  Icon,
  inverted,
  size = 40,
  color = "var(--neutral-500)",
  className,
}: Glyph & { inverted?: boolean; size?: number; color?: string; className?: string }) => (
  <div
    className={className}
    css={css`
      width: ${size}px;
      height: ${size}px;
      display: grid;
      place-items: center;
      --icon-size: ${size - 4}px;

      ${
        inverted &&
        css`
          background-color: rgb(255 255 255 / 0.8);
          border-radius: 999px;
        `
      }
    `}
  >
    {Icon ? (
      <Icon />
    ) : (
      <div
        css={css`
          width: ${size}px;
          height: ${size}px;
          background-color: ${inverted ? "var(--neutral-0)" : color};
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
