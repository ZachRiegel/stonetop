import styled from "@emotion/styled";
import { TextCSS } from "./Font.tsx";

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

const Button = styled(ButtonInternals)`
  flex: 1;
  min-width: 200px;
  padding: 16px 20px;
  border: none;
  border-radius: 16px;
  cursor: pointer;
  background: var(--neutral-0);
  color: var(--neutral-900);
  ${TextCSS.Normal16}
`;

export default Button;
