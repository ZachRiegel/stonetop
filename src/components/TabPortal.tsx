// A Portal (PortalTargetContext.tsx) whose content keeps its place in the Tab order: Tab off
// the element before it lands inside the content, Tab off the content lands on the element
// after it in the DOM, and Shift+Tab runs the same path backwards, as if the content had never
// left. Three focusable, invisible sentinels do it, each handing focus on the moment it
// arrives: `entry` stays where the content was, and `lead` and `trail` bracket the content at
// the portal's end. They ride the browser's own sequential focus navigation, so no key event
// is read and Shift+Tab from the element after the entry reaches the content as well.
// `active` makes them tabbable; off, they stay mounted (so the DOM order is stable) but Tab
// passes the entry by.
import styled from "@emotion/styled";
import Portal from "PortalTargetContext.tsx";
import { type FocusEvent, type ReactNode, useCallback, useRef } from "react";

const TABBABLE = "a[href], button, input, select, textarea, [tabindex], [contenteditable]";

// focusable but unseen: a positioned span is blockified and so gets a box to focus, and a box
// of no height draws nothing. Not aria-hidden (a focusable one is a violation); empty, it
// announces nothing.
const Sentinel = styled.span`
  position: fixed;
  top: 1px;
  left: 1px;
  width: 1px;
  height: 0;
  padding: 0;
  overflow: hidden;
  outline: none;
`;

const Content = styled.div`
  display: contents;
`;

const follows = (a: Node, b: Node) =>
  (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;

// the elements Tab would visit within `scope`, in order, less `excluded` ones
const tabbablesIn = (scope: Element, excluded: (element: Element) => boolean) =>
  [...scope.querySelectorAll<HTMLElement>(TABBABLE)].filter(
    (element) =>
      element.tabIndex >= 0 &&
      !(element as HTMLButtonElement).disabled &&
      element.closest("[inert]") === null &&
      element.getClientRects().length > 0 &&
      !excluded(element),
  );

// the portal's elements, as the handlers below read them; every lookup takes them as
// arguments and lives outside the component, so no handler is ever remade
type Parts = { entry: Element; lead: Element; trail: Element; content: Element };

// the Tab order outside the content: within the nearest dialog, or the page, less the
// sentinels and the content itself
const outside = ({ entry, lead, trail, content }: Parts) =>
  tabbablesIn(
    entry.closest("dialog") ?? document.body,
    (element) =>
      element === entry || element === lead || element === trail || content.contains(element),
  );
const inside = ({ lead, trail, content }: Parts) =>
  tabbablesIn(content, (element) => element === lead || element === trail);
// the outside element Tab would reach after `node`, or before it, wrapping round the scope
const after = (parts: Parts, node: Node) => {
  const order = outside(parts);
  return order.find((element) => follows(node, element)) ?? order[0];
};
const before = (parts: Parts, node: Node) => {
  const order = outside(parts);
  return order.findLast((element) => !follows(node, element)) ?? order.at(-1);
};
// nothing to hand on to (a page with no other tabbable) leaves focus nowhere
const handOn = (target: HTMLElement | undefined) => {
  if (target) target.focus();
  else (document.activeElement as HTMLElement | null)?.blur();
};
const fromInside = ({ content }: Parts, event: FocusEvent) =>
  event.relatedTarget instanceof Node && content.contains(event.relatedTarget);

const TabPortal = ({
  active,
  portalRef,
  children,
}: {
  active: boolean;
  // the portaled content's wrapper, for whoever tracks focus within it (a callback ref, as
  // hooks/useFocusWithin.ts hands out)
  portalRef?: (element: HTMLDivElement | null) => void;
  children: ReactNode;
}) => {
  const entry = useRef<HTMLSpanElement>(null);
  const lead = useRef<HTMLSpanElement>(null);
  const trail = useRef<HTMLSpanElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const contentRef = useCallback(
    (element: HTMLDivElement | null) => {
      content.current = element;
      portalRef?.(element);
    },
    [portalRef],
  );
  // all four are mounted before any sentinel can take focus; this reads only the ref objects,
  // which never change, so the copy the handlers below capture on the first render stays right
  const parts = (): Parts => ({
    entry: entry.current!,
    lead: lead.current!,
    trail: trail.current!,
    content: content.current!,
  });

  // entry: forwards into the content's first tabbable, or backwards (focus came from after
  // it) into its last; with nothing tabbable inside, on past the entry the same way
  const onEntry = useCallback((event: FocusEvent) => {
    const now = parts();
    const backwards =
      event.relatedTarget instanceof Node && follows(now.entry, event.relatedTarget);
    const within = inside(now);
    handOn(
      backwards ? (within.at(-1) ?? before(now, now.entry)) : (within[0] ?? after(now, now.entry)),
    );
  }, []);
  // lead: Shift+Tab off the content's first tabbable goes to the element before the entry;
  // reached from outside (the browser's pass arriving at the portal's end) it skips the
  // content, on past the trail
  const onLead = useCallback((event: FocusEvent) => {
    const now = parts();
    handOn(fromInside(now, event) ? before(now, now.entry) : after(now, now.trail));
  }, []);
  // trail: Tab off the content's last tabbable goes to the element after the entry; reached
  // from outside (a backwards pass) it skips the content, back past the lead
  const onTrail = useCallback((event: FocusEvent) => {
    const now = parts();
    handOn(fromInside(now, event) ? after(now, now.entry) : before(now, now.lead));
  }, []);

  const tabIndex = active ? 0 : -1;
  return (
    <>
      <Sentinel ref={entry} tabIndex={tabIndex} onFocus={onEntry} />
      <Portal>
        <Content ref={contentRef}>
          <Sentinel ref={lead} tabIndex={tabIndex} onFocus={onLead} />
          {children}
          <Sentinel ref={trail} tabIndex={tabIndex} onFocus={onTrail} />
        </Content>
      </Portal>
    </>
  );
};

export default TabPortal;
