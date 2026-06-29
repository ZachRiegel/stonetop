import { css } from "@emotion/react";
import styled from "@emotion/styled";

const TextInternals = ({ text, className }: { text: string; className?: string }) => (
  <span className={className}>{text}</span>
);

const BaseText = styled(TextInternals)`
  display: contents;
  font-family: "adobe-caslon-pro", serif;
  color: var(--neutral-700);
`;

export const TextCSS = {
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

const Text = {
  Normal14: styled(BaseText)(TextCSS.Normal14),
  Semibold14: styled(BaseText)(TextCSS.Semibold14),

  Normal16: styled(BaseText)(TextCSS.Normal16),
  Italic16: styled(BaseText)(TextCSS.Italic16),
  Semibold16: styled(BaseText)(TextCSS.Semibold16),
  SemiboldItalic16: styled(BaseText)(TextCSS.SemiboldItalic16),
  Bold16: styled(BaseText)(TextCSS.Bold16),
  BoldItalic16: styled(BaseText)(TextCSS.BoldItalic16),

  Semibold20: styled(BaseText)(TextCSS.Semibold20),
  Bold20: styled(BaseText)(TextCSS.Bold20),

  Bold24: styled(BaseText)(TextCSS.Bold24),
  Bold32: styled(BaseText)(TextCSS.Bold32),

  Title20: styled(BaseText)(TextCSS.Title20),
  Title24: styled(BaseText)(TextCSS.Title24),
  Title32: styled(BaseText)(TextCSS.Title32),
  Title40: styled(BaseText)(TextCSS.Title40),
  Title48: styled(BaseText)(TextCSS.Title48),
  Title64: styled(BaseText)(TextCSS.Title64),
  Title80: styled(BaseText)(TextCSS.Title80),
};

export default Text;
