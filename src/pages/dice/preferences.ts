// The dice page's device preferences: whether its sounds play and how long a roll stays on
// its table are choices per screen, so they live in localStorage rather than on the user.
// Each store is shaped for useSyncExternalStore; storage that throws (a private window)
// makes a choice last the session.
export const preference = (key: string) => {
  const read = () => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  };
  let value = read();
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    // null removes the entry, so only a choice away from the default is stored
    set: (next: string | null) => {
      value = next;
      try {
        if (next === null) localStorage.removeItem(key);
        else localStorage.setItem(key, next);
      } catch {
        // the choice lasts the session
      }
      listeners.forEach((listener) => listener());
    },
  };
};

// How long a roll stays on this screen's table once its card is up before it is cleared as
// the X would (DiceRoller.tsx). The set and the default were chosen with the user: short
// enough to tidy the table between rolls, long enough to read a result.
export const CLEAR_AFTER: { label: string; seconds: number }[] = [
  { label: "10 seconds", seconds: 10 },
  { label: "30 seconds", seconds: 30 },
  { label: "1 minute", seconds: 60 },
  { label: "5 minutes", seconds: 300 },
  { label: "Never", seconds: Infinity },
];
const DEFAULT_CLEAR_AFTER = 60;
const clearAfterStore = preference("dice-clear-after");
export const clearAfter = {
  subscribe: clearAfterStore.subscribe,
  // in seconds; "Infinity" survives the round trip through Number, and anything that is not
  // one of the choices (an older build's value) is the default
  get: () => {
    const seconds = Number(clearAfterStore.get());
    return CLEAR_AFTER.some((choice) => choice.seconds === seconds) ? seconds : DEFAULT_CLEAR_AFTER;
  },
  set: (seconds: number) =>
    clearAfterStore.set(seconds === DEFAULT_CLEAR_AFTER ? null : String(seconds)),
};
