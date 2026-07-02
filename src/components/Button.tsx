import styled from "@emotion/styled";
import { FontCSS } from "./Font.tsx";

const ButtonInternals = ({
  text,
  onClick,
  type = "button",
  className,
}: {
  text: string;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  className?: string;
}) => (
  <button className={className} type={type} onClick={onClick}>
    {text}
  </button>
);

const BaseButton = styled(ButtonInternals)`
  flex: 1;
  min-width: 200px;
  max-height: 54px;
  padding: 10px 14px;
  border: 2px solid transparent;
  border-radius: 16px;
  cursor: pointer;
  transition:
    background-color 120ms ease,
    border-color 120ms ease,
    color 120ms ease;
  &:focus-visible {
    outline: 2px solid var(--neutral-700);
    outline-offset: 2px;
  }
  ${FontCSS.Bold20}
`;

const Button = {
  Default: styled(BaseButton)`
    background: var(--neutral-0);
    color: var(--neutral-900);
    &:hover {
      background: var(--neutral-100);
    }
    &:active {
      background: var(--neutral-200);
    }
  `,
  Secondary: styled(BaseButton)`
    background: var(--neutral-100);
    border-color: var(--neutral-100);
    color: var(--neutral-700);
    &:hover {
      background: var(--neutral-200);
      border-color: var(--neutral-400);
      color: var(--neutral-800);
    }
    &:active {
      background: var(--neutral-300);
    }
  `,
  Primary: styled(BaseButton)`
    background: var(--neutral-300);
    border-color: var(--neutral-300);
    color: var(--neutral-900);
    &:hover {
      background: var(--neutral-700);
    }
    &:active {
      background: var(--neutral-800);
    }
  `,
};

export default Button;
