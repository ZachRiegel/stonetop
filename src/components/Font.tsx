import { css } from "@emotion/react";
import styled from "@emotion/styled";
import type { ElementType } from "react";

const TextInternals = ({
  text,
  className,
  element: Element = "span",
}: {
  text: string;
  className?: string;
  element?: ElementType;
}) => <Element className={className}>{text}</Element>;

const BaseText = styled(TextInternals)`
  ${({ element }) =>
    !element &&
    css`
      display: contents;
    `}
  font-family: "adobe-caslon-pro", serif;
  color: var(--neutral-700);
`;

export const FontCSS = {
  Normal14: css`
    font-weight: 400;
    font-style: normal;
    font-size: 14px;
  `,
  Semibold14: css`
    font-weight: 600;
    font-style: normal;
    font-size: 14px;
  `,

  Normal16: css`
    font-weight: 400;
    font-style: normal;
    font-size: 16px;
  `,
  Italic16: css`
    font-weight: 400;
    font-style: italic;
    font-size: 16px;
  `,
  Semibold16: css`
    font-weight: 600;
    font-style: normal;
    font-size: 16px;
  `,
  SemiboldItalic16: css`
    font-weight: 600;
    font-style: italic;
    font-size: 16px;
  `,
  Bold16: css`
    font-weight: 700;
    font-style: normal;
    font-size: 16px;
  `,
  BoldItalic16: css`
    font-weight: 700;
    font-style: italic;
    font-size: 16px;
  `,

  Semibold20: css`
    font-weight: 600;
    font-style: normal;
    font-size: 20px;
  `,
  Bold20: css`
    font-weight: 700;
    font-style: normal;
    font-size: 20px;
  `,

  Bold24: css`
    font-weight: 700;
    font-style: normal;
    font-size: 24px;
  `,
  Bold32: css`
    font-weight: 700;
    font-style: normal;
    font-size: 32px;
  `,

  Title20: css`
    font-family: "shrub", sans-serif;
    font-weight: 700;
    font-style: normal;
    font-size: 20px;
  `,
  Title24: css`
    font-family: "shrub", sans-serif;
    font-weight: 700;
    font-style: normal;
    font-size: 24px;
  `,
  Title32: css`
    font-family: "shrub", sans-serif;
    font-weight: 700;
    font-style: normal;
    font-size: 32px;
  `,
  Title40: css`
    font-family: "shrub", sans-serif;
    font-weight: 700;
    font-style: normal;
    font-size: 40px;
  `,
  Title48: css`
    font-family: "shrub", sans-serif;
    font-weight: 700;
    font-style: normal;
    font-size: 48px;
  `,
  Title64: css`
    font-family: "shrub", sans-serif;
    font-weight: 700;
    font-style: normal;
    font-size: 64px;
  `,
  Title80: css`
    font-family: "shrub", sans-serif;
    font-weight: 700;
    font-style: normal;
    font-size: 80px;
  `,
};

const Font = {
  Normal14: styled(BaseText)(FontCSS.Normal14),
  Semibold14: styled(BaseText)(FontCSS.Semibold14),

  Normal16: styled(BaseText)(FontCSS.Normal16),
  Italic16: styled(BaseText)(FontCSS.Italic16),
  Semibold16: styled(BaseText)(FontCSS.Semibold16),
  SemiboldItalic16: styled(BaseText)(FontCSS.SemiboldItalic16),
  Bold16: styled(BaseText)(FontCSS.Bold16),
  BoldItalic16: styled(BaseText)(FontCSS.BoldItalic16),

  Semibold20: styled(BaseText)(FontCSS.Semibold20),
  Bold20: styled(BaseText)(FontCSS.Bold20),

  Bold24: styled(BaseText)(FontCSS.Bold24),
  Bold32: styled(BaseText)(FontCSS.Bold32),

  Title20: styled(BaseText)(FontCSS.Title20),
  Title24: styled(BaseText)(FontCSS.Title24),
  Title32: styled(BaseText)(FontCSS.Title32),
  Title40: styled(BaseText)(FontCSS.Title40),
  Title48: styled(BaseText)(FontCSS.Title48),
  Title64: styled(BaseText)(FontCSS.Title64),
  Title80: styled(BaseText)(FontCSS.Title80),
};

export default Font;
