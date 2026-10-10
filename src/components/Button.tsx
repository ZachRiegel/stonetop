import { keyframes } from "@emotion/react";
import styled from "@emotion/styled";
import { FontCSS } from "components/Font.tsx";
import { type IconProps } from "components/Icon.tsx";
import { useTransition } from "react";

const wiggle = keyframes`
  0%, 60%, 100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-5px);
  }
`;

const Dot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: currentColor;
  animation: ${wiggle} 0.9s ease-in-out infinite;
`;

const Dots = styled.span`
  position: absolute;
  inset: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 5px;
`;

const Content = styled.span<{ isLoading: boolean }>`
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  gap: 8px;
  visibility: ${({ isLoading }) => (isLoading ? "hidden" : "visible")};
`;

const ButtonInternals = ({
  text,
  onClick,
  type = "button",
  className,
  Icon,
  disabled,
}: {
  text?: string;
  onClick?: () => void | Promise<unknown>;
  type?: "button" | "submit" | "reset";
  className?: string;
  Icon?: React.FC<IconProps>;
  disabled?: boolean;
}) => {
  const [isLoading, startTransition] = useTransition();

  const handleClick = () => {
    const result = onClick?.();
    if (result instanceof Promise) {
      startTransition(async () => {
        const [settled] = await Promise.allSettled([
          result,
          new Promise((resolve) => setTimeout(resolve, 500)),
        ]);
        if (settled.status === "rejected") {
          throw settled.reason;
        }
      });
    }
  };

  return (
    <button
      className={className}
      type={type}
      onClick={handleClick}
      disabled={disabled || isLoading}
    >
      <Content isLoading={isLoading}>
        {Icon && <Icon size={24} />}
        {text && <div>{text}</div>}
      </Content>
      {isLoading && (
        <Dots>
          {[0, 1, 2].map((i) => (
            <Dot key={i} style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </Dots>
      )}
    </button>
  );
};

const BaseButton = styled(ButtonInternals)`
  position: relative;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  gap: 8px;
  flex: 1;
  max-height: 54px;
  padding: 6px ${(props) => (props.text ? 10 : 6)}px;
  border: 2px solid transparent;
  border-radius: ${(props) => (props.text ? 12 : 999)}px;
  cursor: pointer;
  ${FontCSS.Bold20}

  &:where(:disabled) {
    cursor: default;
  }

  &:where(:focus-visible) {
    outline: 2px solid var(--neutral-700);
    outline-offset: 2px;
  }
`;

const Transparent = styled(BaseButton)`
  background-color: transparent;
  color: var(--neutral-500);
  &:where(:hover:not(:disabled)) {
    background: var(--neutral-200);
  }
  &:where(:active:not(:disabled)) {
    background: var(--neutral-300);
  }
`;

const Button = {
  Default: styled(BaseButton)`
    background: var(--neutral-0);
    color: var(--neutral-900);
    &:where(:hover:not(:disabled)) {
      background: var(--neutral-100);
    }
    &:where(:active:not(:disabled)) {
      background: var(--neutral-200);
    }
  `,
  Secondary: styled(BaseButton)`
    background: var(--neutral-200);
    color: var(--neutral-700);
    &:where(:hover:not(:disabled)) {
      background: var(--neutral-300);
      color: var(--neutral-800);
    }
    &:where(:active:not(:disabled)) {
      background: var(--neutral-300);
    }
  `,
  Primary: styled(BaseButton)`
    background: var(--neutral-400);
    color: var(--neutral-900);
    &:where(:hover:not(:disabled)) {
      background: var(--neutral-500);
    }
    &:where(:active:not(:disabled)) {
      background: var(--neutral-600);
    }
  `,
  Transparent,
  MenuItem: styled(Transparent)`
    justify-content: flex-start;

    ${Content} {
      justify-content: flex-start;
    }
  `,
};

export default Button;
