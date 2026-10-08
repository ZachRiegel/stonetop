import { css } from "@emotion/react";
import type { FC } from "react";

// Either a white-on-black PNG painted through a luminance mask, or an inline SVG
// icon that keeps its own colours (the mask would paint it grey).
type Glyph = { src: string; Icon?: never } | { Icon: FC<{ className?: string }>; src?: never };

const NavigationIcon = ({
  src,
  Icon,
  inverted,
  className,
}: Glyph & { inverted?: boolean; className?: string }) => (
  <div
    className={className}
    css={css`
      width: 40px;
      height: 40px;
      display: grid;
      place-items: center;
      --icon-size: 36px;

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
          width: 40px;
          height: 40px;
          background-color: ${inverted ? "var(--neutral-0)" : "var(--neutral-500)"};
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
