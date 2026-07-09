import { useEffect, useMemo, useState } from "react";

const useFocusWithin = () => {
  const focusGroupId = useMemo(() => crypto.randomUUID(), []);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    const isInGroup = (node: EventTarget | null) =>
      node instanceof Element && node.closest(`[data-focus-group-id="${focusGroupId}"]`) !== null;

    // focus/blur don't bubble, so listen in the capture phase at the document/clear
    const onFocus = (event: FocusEvent) => setIsFocused(isInGroup(event.target));
    // relatedTarget is where focus is going; stays true when moving within the group
    const onBlur = (event: FocusEvent) => setIsFocused(isInGroup(event.relatedTarget));

    document.addEventListener("focus", onFocus, true);
    document.addEventListener("blur", onBlur, true);
    return () => {
      document.removeEventListener("focus", onFocus, true);
      document.removeEventListener("blur", onBlur, true);
    };
  }, [focusGroupId]);

  return useMemo(
    () => ({ focusProps: { "data-focus-group-id": focusGroupId }, isFocused }),
    [focusGroupId, isFocused],
  );
};

export default useFocusWithin;
