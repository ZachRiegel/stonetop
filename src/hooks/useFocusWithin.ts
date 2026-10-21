import useFocusEvents from "hooks/useFocusEvents.ts";
import useKeyedRefs from "hooks/useKeyedRefs.ts";
import { useCallback, useRef, useState } from "react";

// Tracks whether focus sits inside any of a set of named elements. Areas subscribe with
// `focusRef(key)` as their ref; they can live anywhere in the DOM (portals included).
const useFocusWithin = () => {
  const elements = useRef(new Map<string, Element>());
  const [isFocusWithin, setIsFocusWithin] = useState(false);

  const contains = useCallback(
    (node: EventTarget | null) =>
      node instanceof Node &&
      [...elements.current.values()].some((element) => element.contains(node)),
    [],
  );
  // an area mounting around the active element, or the focused area going away, changes the
  // answer without any focus event
  const focusRef = useKeyedRefs(
    elements,
    useCallback(() => setIsFocusWithin(contains(document.activeElement)), [contains]),
  );
  useFocusEvents(
    useCallback((target) => setIsFocusWithin(contains(target)), [contains]),
    useCallback(() => setIsFocusWithin(false), []),
  );

  return [focusRef, isFocusWithin] as const;
};

export default useFocusWithin;
