import { type RefObject, useCallback, useRef } from "react";

type KeyedRef = (element: Element | null) => void;

// One callback ref per key, created once, each keeping its element in `elements` under the
// key: a fresh function each render would make React detach (null) and reattach the element on
// every commit. `onChange` runs after each attach and detach.
const useKeyedRefs = <K>(elements: RefObject<Map<K, Element>>, onChange: () => void) => {
  const refs = useRef(new Map<K, KeyedRef>());
  return useCallback(
    (key: K): KeyedRef => {
      const existing = refs.current.get(key);
      if (existing) return existing;
      const ref: KeyedRef = (element) => {
        if (element === null) elements.current.delete(key);
        else elements.current.set(key, element);
        onChange();
      };
      refs.current.set(key, ref);
      return ref;
    },
    [elements, onChange],
  );
};

export default useKeyedRefs;
