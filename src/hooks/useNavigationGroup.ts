import useFocusEvents from "hooks/useFocusEvents.ts";
import useKeyedRefs from "hooks/useKeyedRefs.ts";
import { useCallback, useEffect, useRef, useState } from "react";

export type Subscription = (element: Element | null) => void;

// which axis an arrow moves along, and which way
const DIRECTIONS: Record<string, { axis: "x" | "y"; sign: 1 | -1 }> = {
  ArrowLeft: { axis: "x", sign: -1 },
  ArrowRight: { axis: "x", sign: 1 },
  ArrowUp: { axis: "y", sign: -1 },
  ArrowDown: { axis: "y", sign: 1 },
};

const centre = (rect: DOMRect) => ({
  x: rect.left + rect.width / 2,
  y: rect.top + rect.height / 2,
});

// an item is in line with an arrow when its box overlaps the current one's across the arrow's
// axis: the same row for left/right, the same column for up/down
const inLine = (a: DOMRect, b: DOMRect, axis: "x" | "y") =>
  axis === "x" ? a.top < b.bottom && b.top < a.bottom : a.left < b.right && b.left < a.right;

// Roving tab index over a list: items subscribe their element with `subscription` as the ref
// and carry the returned `tabIndex`. Exactly one item is tabbable: the focused one while focus
// is inside the group, otherwise the selected one (or the first). Arrow keys move focus to the
// nearest item in line in that screen direction; with `loop`, an arrow with nothing ahead
// wraps to the furthest item behind.
// A second ref, `controller`, subscribes an element outside the group (a combobox input) that
// drives it without taking part: arrows pressed there move a `highlighted` flag across the
// items instead of focus, and the highlighted item carries the 0 so Tab lands on it.
const useNavigationGroup = <T>(
  items: T[],
  isSelected: (item: T) => boolean,
  { loop = false }: { loop?: boolean } = {},
) => {
  const elements = useRef(new Map<number, Element>());
  const controllerElement = useRef<Element | null>(null);
  // the item arrows go from next: the focused one while focus is in the group, the highlighted
  // one while focus is on the controller, none otherwise
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const indexOf = useCallback(
    (node: EventTarget | null) =>
      node instanceof Node
        ? ([...elements.current].find(([, element]) => element.contains(node))?.[0] ?? null)
        : null,
    [],
  );
  const inController = useCallback(
    (node: EventTarget | null) =>
      node instanceof Node && (controllerElement.current?.contains(node) ?? false),
    [],
  );
  // the active index for where focus is: the item holding it, or, on the controller, the
  // highlight kept from before while that item still exists. Keeping it means Shift+Tab from an
  // item back to the controller leaves the highlight where the user was.
  const resolve = useCallback(
    (previous: number | null, node: EventTarget | null = document.activeElement) =>
      indexOf(node) ??
      (inController(node) && previous !== null && elements.current.has(previous) ? previous : null),
    [indexOf, inController],
  );

  // the focused item leaving the DOM fires no blur, so the answer is rechecked as items come
  // and go
  const subscription: (index: number) => Subscription = useKeyedRefs(
    elements,
    useCallback(() => setActiveIndex((previous) => resolve(previous)), [resolve]),
  );
  useFocusEvents(
    useCallback((target) => setActiveIndex((previous) => resolve(previous, target)), [resolve]),
    useCallback(() => setActiveIndex(null), []),
  );
  const controller = useCallback((element: Element | null) => {
    controllerElement.current = element;
  }, []);

  useEffect(() => {
    // rects are read per keypress since the layout may have changed since the last one
    const neighbour = (
      origin: DOMRect,
      from: number | null,
      { axis, sign }: (typeof DIRECTIONS)[string],
    ) => {
      const { x, y } = centre(origin);
      const candidates = [...elements.current].flatMap(([index, element]) => {
        const rect = element.getBoundingClientRect();
        if (index === from || !inLine(origin, rect, axis)) return [];
        const [dx, dy] = [centre(rect).x - x, centre(rect).y - y];
        return [{ index, forward: (axis === "x" ? dx : dy) * sign, distance: Math.hypot(dx, dy) }];
      });
      const ahead = candidates.filter(({ forward }) => forward > 0);
      // looping from the end of a line goes to the start of it: the furthest item behind
      const [pool, order] =
        ahead.length > 0 || !loop
          ? [ahead, 1]
          : [candidates.filter(({ forward }) => forward < 0), -1];
      // equal distances (a wide item under two narrow ones) resolve by subscription order
      return pool.sort((a, b) => (a.distance - b.distance) * order)[0]?.index;
    };

    // typing in the controller is about to change the list the highlight pointed into. Bubble
    // phase, after React's own change handlers: a state flush before them re-renders a
    // controlled input with its old value and the typed character is lost.
    const onInput = (event: Event) => {
      if (inController(event.target)) setActiveIndex(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const direction = DIRECTIONS[event.key];
      if (direction === undefined || event.defaultPrevented) return;
      const focused = indexOf(document.activeElement);
      if (focused === null && !inController(document.activeElement)) return;
      // from the controller with no highlight yet, the controller's own position is the origin:
      // an input above a list finds the first row on ArrowDown, and left/right find nothing in
      // line, so the caret keeps moving in the text
      const from = focused ?? activeIndex;
      const origin = from === null ? controllerElement.current! : elements.current.get(from)!;
      const to = neighbour(origin.getBoundingClientRect(), from, direction);
      if (to === undefined) return;
      event.preventDefault();
      if (focused === null) setActiveIndex(to);
      // subscribed elements are focusable by construction (they carry the tabIndex), svg included
      else (elements.current.get(to) as Element & HTMLOrSVGElement).focus();
    };
    window.addEventListener("input", onInput);
    // capture phase: a dialog stops keydown at its own handler (components/DialogInternals.tsx),
    // so a bubble listener at the window never hears a key pressed inside one
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("input", onInput);
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [activeIndex, inController, indexOf, loop]);

  const selectedIndex = items.findIndex(isSelected);
  // focus or a highlight inside the group wins, so Tab leaves from the focused item (or lands on
  // the highlighted one) instead of the selected one; with neither the 0 falls back to the
  // selection
  const rovingIndex = activeIndex ?? (selectedIndex === -1 ? 0 : selectedIndex);

  return [
    items.map((item, index) => ({
      item,
      subscription: subscription(index),
      selected: isSelected(item),
      tabIndex: index === rovingIndex ? 0 : -1,
      highlighted: index === activeIndex,
    })),
    controller,
  ] as const;
};

export default useNavigationGroup;
