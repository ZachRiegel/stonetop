import { keyframes } from "@emotion/react";
import styled from "@emotion/styled";
import { useTransition } from "react";
import { FontCSS } from "./Font.tsx";
import { type IconProps } from "./Icon.tsx";

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
}: {
  text: string;
  onClick?: () => void | Promise<unknown>;
  type?: "button" | "submit" | "reset";
  className?: string;
  Icon?: React.FC<IconProps>;
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
    <button className={className} type={type} onClick={handleClick} disabled={isLoading}>
      <Content isLoading={isLoading}>
        {Icon && <Icon size={24} />}
        {text}
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
  padding: 10px 14px;
  border: 2px solid transparent;
  border-radius: 16px;
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
};

export default Button;
