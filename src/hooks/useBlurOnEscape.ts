import { useEffect } from "react";

// Only fires when the keydown bubbles all the way to window — open dialogs
// stop propagation, so Escape inside them never triggers the blur.
const useBlurOnEscape = () =>
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

export default useBlurOnEscape;
