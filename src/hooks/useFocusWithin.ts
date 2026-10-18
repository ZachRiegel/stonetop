import { useCallback, useEffect, useRef, useState } from "react";

type FocusRef = (element: Element | null) => void;

// Tracks whether focus sits inside any of a set of named elements. Areas subscribe with
// `focusRef(key)` as their ref; they can live anywhere in the DOM (portals included).
const useFocusWithin = () => {
  const elements = useRef(new Map<string, Element>());
  // one callback ref per key, created once: a fresh function each render would make React
  // detach (null) and reattach the element on every commit
  const refs = useRef(new Map<string, FocusRef>());
  const [isFocusWithin, setIsFocusWithin] = useState(false);

  const contains = useCallback(
    (node: EventTarget | null) =>
      node instanceof Node &&
      [...elements.current.values()].some((element) => element.contains(node)),
    [],
  );

  const focusRef = useCallback(
    (key: string): FocusRef => {
      const existing = refs.current.get(key);
      if (existing) return existing;
      const ref: FocusRef = (element) => {
        if (element === null) elements.current.delete(key);
        else elements.current.set(key, element);
        // an area mounting around the active element, or the focused area going away,
        // changes the answer without any focus event
        setIsFocusWithin(contains(document.activeElement));
      };
      refs.current.set(key, ref);
      return ref;
    },
    [contains],
  );

  useEffect(() => {
    // focus/blur don't bubble, so listen in the capture phase at the window
    const onFocus = (event: FocusEvent) => setIsFocusWithin(contains(event.target));
    // relatedTarget is where focus is going; when it is somewhere, that element's own
    // focus event decides. null means it left the document (dead click, tab switch).
    const onBlur = (event: FocusEvent) => {
      if (event.relatedTarget === null) setIsFocusWithin(false);
    };
    window.addEventListener("focus", onFocus, true);
    window.addEventListener("blur", onBlur, true);
    return () => {
      window.removeEventListener("focus", onFocus, true);
      window.removeEventListener("blur", onBlur, true);
    };
  }, [contains]);

  return [focusRef, isFocusWithin] as const;
};

export default useFocusWithin;
