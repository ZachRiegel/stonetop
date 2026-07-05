import styled from "@emotion/styled";
import type { ReactNode, SyntheticEvent } from "react";
import { useState } from "react";

const Wrapper = styled.div`
  display: contents;
`;

const AnimateInOut = <K extends string, P extends Record<K, boolean>>(
  key: K,
  Component: (props: P) => ReactNode,
) => {
  return (props: P) => {
    const isOpen: boolean = props[key];
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [mounted, setMounted] = useState<boolean>(isOpen);
    if (isOpen && !mounted) setMounted(true);

    const onEnd = (event: SyntheticEvent<HTMLElement>) => {
      const wrapper = event.currentTarget;
      const stillRunning = wrapper.getAnimations({ subtree: true }).filter((animation) => {
        if (animation.playState !== "running") return false;
        const target = animation.effect instanceof KeyframeEffect ? animation.effect.target : null;
        const parent = target?.parentElement ?? null;
        return parent === wrapper || parent?.parentElement === wrapper;
      });
      if (!isOpen && stillRunning.length === 0) setMounted(false);
    };

    return mounted ? (
      <Wrapper className="animateInOut" onAnimationEnd={onEnd} onTransitionEnd={onEnd}>
        {Component(props)}
      </Wrapper>
    ) : null;
  };
};

export default AnimateInOut;
