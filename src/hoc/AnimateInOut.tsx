import styled from "@emotion/styled";
import type { FC, SyntheticEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

const Wrapper = styled.div`
  display: contents;
`;

// whether an animation still runs on the wrapped element or one of its children
const isAnimating = (wrapper: HTMLElement) =>
  wrapper.getAnimations({ subtree: true }).some((animation) => {
    if (animation.playState !== "running") return false;
    const target = animation.effect instanceof KeyframeEffect ? animation.effect.target : null;
    const parent = target?.parentElement ?? null;
    return parent === wrapper || parent?.parentElement === wrapper;
  });

const AnimateInOut = <K extends keyof P, P extends object>(
  key: K,
  Component: FC<P>,
): FC<P & { afterUnmount?: () => void }> => {
  return (props) => {
    const isOpen = !!props[key];
    const [mounted, setMounted] = useState<boolean>(isOpen);
    if (isOpen && !mounted) setMounted(true);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const wasMounted = useRef(mounted);
    const afterUnmount = props.afterUnmount;
    useEffect(() => {
      if (wasMounted.current && !mounted) afterUnmount?.();
      wasMounted.current = mounted;
    }, [mounted, afterUnmount]);

    useEffect(() => {
      if (isOpen) return;
      const frame = requestAnimationFrame(() => {
        const wrapper = wrapperRef.current;
        if (wrapper && !isAnimating(wrapper)) setMounted(false);
      });
      return () => cancelAnimationFrame(frame);
    }, [isOpen]);

    const onEnd = useCallback(
      (event: SyntheticEvent<HTMLElement>) => {
        if (!isOpen && !isAnimating(event.currentTarget)) setMounted(false);
      },
      [isOpen],
    );

    return mounted ? (
      <Wrapper
        ref={wrapperRef}
        className="animateInOut"
        onAnimationEnd={onEnd}
        onTransitionEnd={onEnd}
      >
        <Component {...(props as any)} />
      </Wrapper>
    ) : null;
  };
};

export default AnimateInOut;
