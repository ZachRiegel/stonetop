import { useRef } from "react";

const useNonNullable = <T>(input: T | (() => T)): NonNullable<T> | undefined => {
  const last = useRef<NonNullable<T> | undefined>(undefined);
  const value = typeof input === "function" ? (input as () => T)() : input;
  if (value != null) last.current = value;
  return last.current;
};

export default useNonNullable;
