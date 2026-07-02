import { useState } from "react";
import type { ComponentType, CSSProperties, SyntheticEvent } from "react";

const wrapperStyle: CSSProperties = { display: "contents" };

const AnimateInOut =
  <K extends string, P extends Record<K, boolean>>(key: K, Component: ComponentType<P>) =>
  (props: P) => {
    const isOpen: boolean = props[key];
    const [mounted, setMounted] = useState<boolean>(isOpen);
    if (isOpen && !mounted) setMounted(true);

    const onEnd = (event: SyntheticEvent<HTMLElement>) => {
      const wrapper = event.currentTarget;
      // Listeners live on a display:contents wrapper so the wrapped component
      // doesn't need to forward them. Relative to the wrapper the component's
      // root element(s) are its direct children, so wait on the modal's own
      // transition only: those roots (e.g. the <dialog>), their pseudo-elements
      // (e.g. ::backdrop, whose effect target is the root), and the roots' own
      // direct children (e.g. an animating <section>). Deeper content is ignored
      // so an infinite animation nested inside (e.g. a spinner) can never keep
      // the element mounted forever.
      const stillRunning = wrapper.getAnimations({ subtree: true }).filter((animation) => {
        if (animation.playState !== "running") return false;
        const target = animation.effect instanceof KeyframeEffect ? animation.effect.target : null;
        const parent = target?.parentElement ?? null;
        return parent === wrapper || parent?.parentElement === wrapper;
      });
      if (!isOpen && stillRunning.length === 0) setMounted(false);
    };

    // TS cannot relate spreads of the generic P through JSX.LibraryManagedAttributes
    const Renderable = Component as ComponentType<Record<string, unknown>>;

    return mounted ? (
      <div style={wrapperStyle} onAnimationEnd={onEnd} onTransitionEnd={onEnd}>
        <Renderable {...props} />
      </div>
    ) : null;
  };

export default AnimateInOut;
