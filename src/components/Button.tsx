import styled from "@emotion/styled";

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
  width: 100%;
  padding: 12px 16px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  background: var(--neutral-0);
  color: var(--neutral-900);
  font-family: "adobe-caslon-pro", serif;
  font-weight: 600;
  font-style: normal;
  font-size: 16px;
`;

export default Button;
