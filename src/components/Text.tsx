import styled from "@emotion/styled";

const FONT_FAMILY = '"';

const TextInternals = ({ text, className }: { text: string; className?: string }) => (
  <span className={className}>{text}</span>
);

const BaseText = styled(TextInternals)`
  display: contents;
  font-family: "adobe-caslon-pro", serif;
`;

const Text = {
  Normal14: styled(BaseText)`
    font-weight: 400;
    font-style: normal;
    font-size: 14px;
  `,
  Semibold14: styled(BaseText)`
    font-weight: 600;
    font-style: normal;
    font-size: 14px;
  `,

  Normal16: styled(BaseText)`
    font-weight: 400;
    font-style: normal;
    font-size: 16px;
  `,
  Italic16: styled(BaseText)`
    font-weight: 400;
    font-style: italic;
    font-size: 16px;
  `,
  Semibold16: styled(BaseText)`
    font-weight: 600;
    font-style: normal;
    font-size: 16px;
  `,
  SemiboldItalic16: styled(BaseText)`
    font-weight: 600;
    font-style: italic;
    font-size: 16px;
  `,
  Bold16: styled(BaseText)`
    font-weight: 700;
    font-style: normal;
    font-size: 16px;
  `,
  BoldItalic16: styled(BaseText)`
    font-weight: 700;
    font-style: italic;
    font-size: 16px;
  `,

  Semibold20: styled(BaseText)`
    font-weight: 600;
    font-style: normal;
    font-size: 20px;
  `,
  Bold20: styled(BaseText)`
    font-weight: 700;
    font-style: normal;
    font-size: 20px;
  `,

  Bold24: styled(BaseText)`
    font-weight: 700;
    font-style: normal;
    font-size: 24px;
  `,
  Bold32: styled(BaseText)`
    font-weight: 700;
    font-style: normal;
    font-size: 32px;
  `,
};

export default Text;
