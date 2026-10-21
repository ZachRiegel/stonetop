import { useEffect } from "react";

// Hears focus landing anywhere in the document, and focus leaving it. focus/blur don't bubble,
// so it listens in the capture phase at the window. A blur's relatedTarget is where focus is
// going; when it is somewhere, that element's own focus event decides, and null means it left
// the document (dead click, tab switch).
const useFocusEvents = (onFocus: (target: EventTarget | null) => void, onLeave: () => void) =>
  useEffect(() => {
    const focus = (event: FocusEvent) => onFocus(event.target);
    const blur = (event: FocusEvent) => {
      if (event.relatedTarget === null) onLeave();
    };
    window.addEventListener("focus", focus, true);
    window.addEventListener("blur", blur, true);
    return () => {
      window.removeEventListener("focus", focus, true);
      window.removeEventListener("blur", blur, true);
    };
  }, [onFocus, onLeave]);

export default useFocusEvents;
