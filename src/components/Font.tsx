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

// the poster titles' and tabs' type: the title face in caps, sized where it is used
// (components/Poster.tsx, components/TabRow.tsx)
export const TITLE_CAPS = css`
  font-family: "clarendon-wide-sketch", serif;
  font-weight: 700;
  font-style: normal;
  text-transform: uppercase;
`;

export const FontCSS = {
  Normal14: css`
    font-family: "faustina", serif;
    font-weight: 400;
    font-style: normal;
    font-size: 14px;
  `,
  Semibold14: css`
    font-family: "faustina", serif;
    font-weight: 600;
    font-style: normal;
    font-size: 14px;
  `,
  Italic14: css`
    font-family: "faustina", serif;
    font-weight: 400;
    font-style: italic;
    font-size: 14px;
  `,

  Normal16: css`
    font-family: "faustina", serif;
    font-weight: 400;
    font-style: normal;
    font-size: 16px;
  `,
  Italic16: css`
    font-family: "faustina", serif;
    font-weight: 400;
    font-style: italic;
    font-size: 16px;
  `,
  Semibold16: css`
    font-family: "faustina", serif;
    font-weight: 600;
    font-style: normal;
    font-size: 16px;
  `,
  SemiboldItalic16: css`
    font-family: "faustina", serif;
    font-weight: 600;
    font-style: italic;
    font-size: 16px;
  `,
  Bold16: css`
    font-family: "faustina", serif;
    font-weight: 700;
    font-style: normal;
    font-size: 16px;
  `,
  BoldItalic16: css`
    font-family: "faustina", serif;
    font-weight: 700;
    font-style: italic;
    font-size: 16px;
  `,

  Normal20: css`
    font-family: "faustina", serif;
    font-weight: 400;
    font-style: normal;
    font-size: 20px;
  `,
  Semibold20: css`
    font-family: "faustina", serif;
    font-weight: 600;
    font-style: normal;
    font-size: 20px;
  `,
  Bold20: css`
    font-family: "faustina", serif;
    font-weight: 700;
    font-style: normal;
    font-size: 20px;
  `,

  Normal24: css`
    font-family: "faustina", serif;
    font-weight: 400;
    font-style: normal;
    font-size: 24px;
  `,
  Bold24: css`
    font-family: "faustina", serif;
    font-weight: 700;
    font-style: normal;
    font-size: 24px;
  `,
  Bold32: css`
    font-family: "faustina", serif;
    font-weight: 700;
    font-style: normal;
    font-size: 32px;
  `,

  Title20: css`
    font-family: "clarendon-wide-sketch", serif;
    font-weight: 700;
    font-style: normal;
    font-size: 20px;
  `,
  Title24: css`
    font-family: "clarendon-wide-sketch", serif;
    font-weight: 700;
    font-style: normal;
    font-size: 24px;
  `,
  Title32: css`
    font-family: "clarendon-wide-sketch", serif;
    font-weight: 700;
    font-style: normal;
    font-size: 32px;
  `,
  Title40: css`
    font-family: "clarendon-wide-sketch", serif;
    font-weight: 700;
    font-style: normal;
    font-size: 40px;
  `,
  Title48: css`
    font-family: "clarendon-wide-sketch", serif;
    font-weight: 700;
    font-style: normal;
    font-size: 48px;
  `,
  Title64: css`
    font-family: "clarendon-wide-sketch", serif;
    font-weight: 700;
    font-style: normal;
    font-size: 64px;
  `,
  Title80: css`
    font-family: "clarendon-wide-sketch", serif;
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
