import { css } from "@emotion/react";
import styled, { type StyledComponent } from "@emotion/styled";

// an HTML tag name, not React.ElementType: react-three-fiber adds its own elements to
// JSX.IntrinsicElements and a tag typed as any element no longer accepts text children
type FontProps = {
  text: string;
  className?: string;
  element?: keyof HTMLElementTagNameMap;
};

const TextInternals = ({ text, className, element: Element = "span" }: FontProps) => (
  <Element className={className}>{text}</Element>
);

const BaseText = styled(TextInternals)`
  ${({ element }) =>
    !element &&
    css`
      display: contents;
    `}
  color: var(--neutral-700);
  white-space: pre-line;
`;

// the title face, sized where it is used. Campaign names (components/Poster.tsx,
// navigation/Strip.tsx) keep their own casing past a capital first letter (user, 2026-10-21);
// tabs and buttons take the caps variant below. ::first-letter needs a block container, which
// every title so far is
export const TITLE = css`
  font-family: "DM Sans", sans-serif;
  letter-spacing: -0.02em;
  font-weight: 700;
  font-style: normal;
  &::first-letter {
    text-transform: uppercase;
  }
`;

// the tabs' and buttons' type: the title face in caps (components/TabRow.tsx,
// pages/campaigns/Campaigns.tsx)
export const TITLE_CAPS = css`
  ${TITLE}
  text-transform: uppercase;
`;

// the eyebrow: small spaced caps over a title or a roster (navigation/Strip.tsx,
// components/Poster.tsx, pages/players/Players.tsx), sized, weighted and coloured where used
export const EYEBROW = css`
  font-family: "DM Sans", sans-serif;
  font-style: normal;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

export const FontCSS = {
  Normal14: css`
    font-family: "DM Sans", sans-serif;
    font-weight: 400;
    font-style: normal;
    font-size: 14px;
  `,
  Semibold14: css`
    font-family: "DM Sans", sans-serif;
    font-weight: 600;
    font-style: normal;
    font-size: 14px;
  `,
  Italic14: css`
    font-family: "DM Sans", sans-serif;
    font-weight: 400;
    font-style: italic;
    font-size: 14px;
  `,

  Normal16: css`
    font-family: "DM Sans", sans-serif;
    font-weight: 400;
    font-style: normal;
    font-size: 16px;
  `,
  Italic16: css`
    font-family: "DM Sans", sans-serif;
    font-weight: 400;
    font-style: italic;
    font-size: 16px;
  `,
  Semibold16: css`
    font-family: "DM Sans", sans-serif;
    font-weight: 600;
    font-style: normal;
    font-size: 16px;
  `,
  SemiboldItalic16: css`
    font-family: "DM Sans", sans-serif;
    font-weight: 600;
    font-style: italic;
    font-size: 16px;
  `,
  Bold16: css`
    font-family: "DM Sans", sans-serif;
    font-weight: 700;
    font-style: normal;
    font-size: 16px;
  `,
  BoldItalic16: css`
    font-family: "DM Sans", sans-serif;
    font-weight: 700;
    font-style: italic;
    font-size: 16px;
  `,

  Normal20: css`
    font-family: "DM Sans", sans-serif;
    font-weight: 400;
    font-style: normal;
    font-size: 20px;
  `,
  Semibold20: css`
    font-family: "DM Sans", sans-serif;
    font-weight: 600;
    font-style: normal;
    font-size: 20px;
  `,
  Bold20: css`
    font-family: "DM Sans", sans-serif;
    font-weight: 700;
    font-style: normal;
    font-size: 20px;
  `,

  Normal24: css`
    font-family: "DM Sans", sans-serif;
    font-weight: 400;
    font-style: normal;
    font-size: 24px;
  `,
  Bold24: css`
    font-family: "DM Sans", sans-serif;
    font-weight: 700;
    font-style: normal;
    font-size: 24px;
  `,
  Bold32: css`
    font-family: "DM Sans", sans-serif;
    font-weight: 700;
    font-style: normal;
    font-size: 32px;
  `,

  Title20: css`
    font-family: "DM Sans", sans-serif;
    letter-spacing: -0.02em;
    font-weight: 700;
    font-style: normal;
    font-size: 20px;
  `,
  Title24: css`
    font-family: "DM Sans", sans-serif;
    letter-spacing: -0.02em;
    font-weight: 700;
    font-style: normal;
    font-size: 24px;
  `,
  Title32: css`
    font-family: "DM Sans", sans-serif;
    letter-spacing: -0.02em;
    font-weight: 700;
    font-style: normal;
    font-size: 32px;
  `,
  Title40: css`
    font-family: "DM Sans", sans-serif;
    letter-spacing: -0.02em;
    font-weight: 700;
    font-style: normal;
    font-size: 40px;
  `,
  Title48: css`
    font-family: "DM Sans", sans-serif;
    letter-spacing: -0.02em;
    font-weight: 700;
    font-style: normal;
    font-size: 48px;
  `,
  Title64: css`
    font-family: "DM Sans", sans-serif;
    letter-spacing: -0.02em;
    font-weight: 700;
    font-style: normal;
    font-size: 64px;
  `,
  Title80: css`
    font-family: "DM Sans", sans-serif;
    letter-spacing: -0.02em;
    font-weight: 700;
    font-style: normal;
    font-size: 80px;
  `,
};

// one text component per FontCSS entry, e.g. <Font.Bold20 text="…" />
const Font = Object.fromEntries(
  Object.entries(FontCSS).map(([name, style]) => [name, styled(BaseText)(style)]),
) as Record<keyof typeof FontCSS, StyledComponent<FontProps>>;

export default Font;
