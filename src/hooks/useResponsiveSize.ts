import { useSyncExternalStore } from "react";

export type ResponsiveSize = "mobile" | "tablet" | "desktop";

// the viewport widths (CSS px) at which a tablet and a desktop begin; anything narrower
// than a tablet is a phone. Width alone, so a phone turned sideways reads as a tablet: the
// two share a layout (the row header in place of the sidebar), and it is the width that
// decides whether the sidebar has room.
const BREAKPOINTS = { tablet: 600, desktop: 1024 } as const;

// the same thresholds as media queries, for `@media ${MEDIA.mobile}` in styles, so a rule
// and the hook never disagree on where a size begins
export const MEDIA = {
  mobile: `(width < ${BREAKPOINTS.tablet}px)`,
  tablet: `(${BREAKPOINTS.tablet}px <= width < ${BREAKPOINTS.desktop}px)`,
  desktop: `(width >= ${BREAKPOINTS.desktop}px)`,
} as const;

// one list per size, made on first use rather than at import (a test imports modules
// without a window); each reports a change as the viewport crosses its edge
let lists: Record<ResponsiveSize, MediaQueryList> | undefined;
const listsOf = () =>
  (lists ??= Object.fromEntries(
    Object.entries(MEDIA).map(([size, query]) => [size, window.matchMedia(query)]),
  ) as Record<ResponsiveSize, MediaQueryList>);

const sizeOf = (): ResponsiveSize =>
  (Object.entries(listsOf()) as [ResponsiveSize, MediaQueryList][]).find(
    ([, list]) => list.matches,
  )?.[0] ?? "desktop";

const subscribe = (onChange: () => void) => {
  Object.values(listsOf()).forEach((list) => list.addEventListener("change", onChange));
  return () =>
    Object.values(listsOf()).forEach((list) => list.removeEventListener("change", onChange));
};

// the viewport's size class; the component re-renders when the width crosses a breakpoint
// and not otherwise (no per-pixel resize events)
const useResponsiveSize = () => useSyncExternalStore(subscribe, sizeOf);

export default useResponsiveSize;
