import { css } from "@emotion/react";

const NavigationIcon = ({
  src,
  inverted,
  className,
}: {
  src: string;
  inverted?: boolean;
  className?: string;
}) => (
  <div
    className={className}
    css={css`
      width: 40px;
      height: 40px;
      display: grid;
      place-items: center;

      ${inverted &&
      css`
        opacity: 0.8;
        background-color: var(--neutral-900);
        border-radius: 999px;

        & > div {
          background-color: var(--neutral-0);
        }
      `}
    `}
  >
    <div
      css={css`
        width: 40px;
        height: 40px;
        background-color: var(--neutral-500);
        mask-image: url("${src}");
        mask-mode: luminance;
        mask-position: center;
        mask-repeat: no-repeat;
        mask-size: contain;
      `}
    />
  </div>
);

export default NavigationIcon;
