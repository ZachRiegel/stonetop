// The radial menu's React side: the centre item's cell, the Popover that holds the open
// menu, the arcs drawn from a Centre/Ring/Arc/Segment/Spacer description through
// geometry.ts, the glass bubble (Glass.tsx) and the pointer handling. README.md has the
// layout model, the interaction model and the design decisions.
import { css, keyframes } from "@emotion/react";
import styled from "@emotion/styled";
import Popover from "components/Popover.tsx";
import Arc, { type ArcProps } from "components/radialMenu/Arc.tsx";
import Centre, { type CentreProps } from "components/radialMenu/Centre.tsx";
import {
  bubbleOf,
  held,
  hit,
  homeCentre,
  insideRing,
  type ItemSpec,
  type Layout,
  layoutOf,
  type MenuSpec,
  sameSegment,
  type SegmentLayout,
  segmentOf,
  segmentPath,
} from "components/radialMenu/geometry.ts";
import Glass, { type Drawn } from "components/radialMenu/Glass.tsx";
import Ring, { type RingProps } from "components/radialMenu/Ring.tsx";
import Segment, { type SegmentProps } from "components/radialMenu/Segment.tsx";
import Spacer, { type SpacerProps } from "components/radialMenu/Spacer.tsx";
import React, {
  Children,
  cloneElement,
  isValidElement,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

const BORDER = 2;

// The description, read from the children: the elements among `children` of one of
// `types`, in order, with their keys. Anything else is a mistake in the description,
// a fragment included, since Children.toArray does not look inside one.
type Described<P> = { key: string; type: unknown; props: P };
const describedBy = <P,>(children: ReactNode, types: unknown[], expected: string) =>
  Children.toArray(children).map((child): Described<P> => {
    if (!isValidElement<P>(child) || !types.includes(child.type))
      throw new Error(`RadialMenu: expected only ${expected} here`);
    return { key: String(child.key), type: child.type, props: child.props };
  });
type Tree = {
  centre: CentreProps;
  rings: {
    props: RingProps;
    arcs: {
      key: string;
      props: ArcProps;
      items: ItemSpec[];
      segments: Described<SegmentProps>[];
    }[];
  }[];
};
const treeOf = (children: ReactNode): Tree => {
  const parts = describedBy<CentreProps | RingProps>(
    children,
    [Centre, Ring],
    "a Centre and Rings",
  );
  const [centre, extra] = parts.filter(
    (part): part is Described<CentreProps> => part.type === Centre,
  );
  if (!centre || extra) throw new Error("RadialMenu: expected exactly one Centre");
  return {
    centre: centre.props,
    rings: parts
      .filter((part): part is Described<RingProps> => part.type === Ring)
      .map(({ props }) => ({
        props,
        arcs: describedBy<ArcProps>(props.children, [Arc], "Arcs").map(({ key, props }) => {
          const items = describedBy<SegmentProps | SpacerProps>(
            props.children,
            [Segment, Spacer],
            "Segments and Spacers",
          );
          return {
            key,
            props,
            items: items.map(({ type, props }) => ({
              kind: type === Spacer ? "spacer" : "segment",
              span: props.span,
            })),
            segments: items.filter(
              (item): item is Described<SegmentProps> => item.type === Segment,
            ),
          };
        }),
      })),
  };
};
const specOf = ({ centre, rings }: Tree, corner: number): MenuSpec => ({
  centre: centre.diameter / 2,
  corner,
  rings: rings.map(({ props, arcs }) => ({
    start: props.startDistance,
    end: props.endDistance,
    arcs: arcs.map(({ props, items }) => ({ angle: props.angle, items })),
  })),
});
// a laid-out segment's description, by the segment's place in it
const describedAs = (
  { ring, arc, index }: Pick<SegmentLayout, "ring" | "arc" | "index">,
  tree: Tree,
) => tree.rings[ring]?.arcs[arc]?.segments[index]?.props;

// the pointer's offset from the centre item's centre, held within the menu's reach
const offsetOf = (
  anchor: HTMLElement | null,
  { clientX, clientY }: { clientX: number; clientY: number },
  layout: Layout,
) => {
  const rect = anchor?.getBoundingClientRect();
  return rect
    ? held(clientX - rect.left - rect.width / 2, clientY - rect.top - rect.height / 2, layout)
    : null;
};

const shrink = keyframes`
  from {
    opacity: 1;
    scale: 1;
  }
  to {
    opacity: 0;
    scale: 0.6;
  }
`;

const unfold = keyframes`
  from {
    opacity: 0;
    scale: 0.8;
  }
  to {
    opacity: 1;
    scale: 1;
  }
`;

// the popover's section sits exactly over the centre item; the menu is centred on it and
// overflows. Opening is the arcs' unfolding; closing shrinks the section, which AnimateInOut
// waits for.
const Menu = styled(Popover)<{ diameter: number }>`
  & > .animateInOut > dialog > section {
    display: grid;
    grid-template: 100% / 100%;
    place-items: center;
    height: ${({ diameter }) => diameter}px;
    animation: ${({ isOpen }) => (isOpen ? "none" : shrink)} 150ms ease-out both;

    @media (prefers-reduced-motion: reduce) {
      animation-duration: 0ms;
    }
  }
`;

// The centre item's cell, which the item fills: the popover anchors to it, the press that
// opens the menu starts on it (bubbling up from the item), and the pointer is measured from
// its centre.
const Anchor = styled.div<{ diameter: number }>`
  width: ${({ diameter }) => diameter}px;
  height: ${({ diameter }) => diameter}px;
  display: grid;
  touch-action: none;
`;

// the pointer area, the menu's reach plus the outer half of a border each way; the drawing
// inside takes no events of its own, so the cursor is set here from what the pointer is over
const Board = styled.div<{ pointing: boolean; extent: number }>`
  width: ${({ extent }) => extent * 2}px;
  height: ${({ extent }) => extent * 2}px;
  display: grid;
  place-items: center;
  touch-action: none;
  cursor: ${({ pointing }) => (pointing ? "pointer" : "default")};

  /* the glass's shadow may fall past the edge */
  & > * {
    overflow: visible;
    pointer-events: none;
  }
`;

// An arc: drawn with its run straight up and turned to its angle about the SVG's origin,
// the centre button's centre, so a change of angle swings it round; unfolds when it mounts.
const Swung = styled.g`
  animation: ${unfold} 150ms ease-out both;
  transition: rotate 200ms ease-out;

  @media (prefers-reduced-motion: reduce) {
    animation-duration: 0ms;
    transition: none;
  }
`;

// a segment's shape and its content dim together, by class; `hovered` is set on both too,
// so a segment's content can lift with its fill (the roll menu's pill glyphs do)
const dimmable = css`
  &:where(.dimmed) {
    opacity: 0.45;
  }
`;

// a segment, outlined in black so neighbours read apart (grey until 2026-10-19, when the
// dice page's cards had settled on hard dark edges), or in its own fill when not outlined;
// the fill lifts under the pointer, and an unoutlined border with it
const Shape = styled.path<{ paint: string; outlined: boolean }>`
  fill: ${({ paint }) => paint};
  stroke: ${({ paint, outlined }) => (outlined ? "var(--neutral-0)" : paint)};
  stroke-width: ${BORDER}px;
  outline: none;
  transition:
    fill 150ms ease-out,
    stroke 150ms ease-out,
    opacity 200ms ease-out;
  ${dimmable}

  &:where(:focus-visible) {
    stroke: var(--white);
    stroke-width: 3px;
  }
`;

// A segment's content, turned back against its arc's turn so it stays upright while
// swinging round, about its parent's origin, which the parent moves to the segment's
// centre: iOS Safari misplaced a fill-box transform-origin on text.
const Content = styled.g`
  transition:
    rotate 200ms ease-out,
    opacity 200ms ease-out;
  ${dimmable}

  @media (prefers-reduced-motion: reduce) {
    transition: opacity 200ms ease-out;
  }
`;

// A radial menu described by a Centre (a round button) and Ring, Arc, Segment and Spacer
// children. Click through it, or press the button and drag: a glass bubble follows and
// snaps onto segments, telling each one it arrives on. The open menu is a Popover, so
// Escape, clicking outside (the inert button under the dialog included) and focus return
// come free.
const RadialMenu = ({
  className,
  corner = 6,
  isOpen,
  requestOpen,
  requestClose,
  onDragCentre,
  children,
}: {
  // on the centre item's cell, which is what places the menu
  className?: string;
  // the rounding, in px, at a run's ends and beside Spacers
  corner?: number;
  isOpen: boolean;
  // the centre button was pressed; left out, the button is its own (a click of the
  // consumer's), and a press neither opens the menu nor starts a drag
  requestOpen?: () => void;
  // Escape, a click outside, a click on the inert centre button, or a press released on
  // nothing or on the centre button (a press that never left the button is the click that
  // opened the menu, and keeps it open)
  requestClose: () => void;
  // a drag came back inside the innermost ring: onto the button or into the gap round it
  onDragCentre?: () => void;
  children?: ReactNode;
}) => {
  // useId's punctuation is not valid inside a url(#…) reference
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const anchor = useRef<HTMLDivElement>(null);
  const tree = treeOf(children);
  const layout = layoutOf(specOf(tree, corner));
  // the description, its layout and the props as the handlers see them: the latest, so the
  // handlers keep one identity while reading what is current
  const latest = useRef({ tree, layout, isOpen, requestOpen, requestClose, onDragCentre });
  latest.current = { tree, layout, isOpen, requestOpen, requestClose, onDragCentre };
  // the segment under the pointer between presses, and the bubble of the last drag
  const [hovered, setHovered] = useState<SegmentLayout | null>(null);
  const [drawn, setDrawn] = useState<Drawn | null>(null);
  // the press under way
  const pressed = useRef<(() => void) | null>(null);
  useEffect(() => () => pressed.current?.(), []);
  // closing (Escape mid-drag included) ends the press, so its release activates nothing
  useEffect(() => {
    if (isOpen) return;
    pressed.current?.();
    setHovered(null);
    setDrawn(null);
  }, [isOpen]);

  // A press, reported by the window until it ends, since the dialog that opens mid-press
  // makes the button inert (captured events still bubble). A `drag` starts on the centre
  // button: the bubble follows, and each segment it arrives on is told, as is a return
  // inside the innermost ring. A press on the open menu moves nothing until it is released.
  const startPress = useCallback((event: React.PointerEvent, drag: boolean) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    // whether the press has left the button, the segment the bubble is on, and whether it
    // is inside the innermost ring
    let left = false;
    let on: SegmentLayout | null = null;
    let inside = true;
    const onMove = (event: PointerEvent) => {
      const { layout, tree, onDragCentre } = latest.current;
      const at = offsetOf(anchor.current, event, layout);
      if (!at || !drag) return;
      const found = hit(...at, layout);
      const { d, placed } = bubbleOf(found, layout);
      setDrawn((previous) => ({
        d,
        on: found,
        placed: placed ?? previous?.placed ?? [0, 0],
        mouse: at,
        hop: !!previous?.shown && previous.on !== null && found !== null,
        shown: true,
      }));
      if (found?.kind !== "centre") left = true;
      // arriving on a segment, or back inside the innermost ring
      const segment = segmentOf(found);
      const within = insideRing(...at, layout);
      if (segment && !sameSegment(on, segment)) describedAs(segment, tree)?.onDragEnter?.();
      if (within && !inside) onDragCentre?.();
      on = segment;
      inside = within;
    };
    const onUp = (event: PointerEvent) => {
      stop();
      const { layout, tree, requestClose } = latest.current;
      const at = offsetOf(anchor.current, event, layout);
      const target = at && hit(...at, layout);
      // a press that never left the button is a click, and leaves the menu it opened
      if (drag && !left && target?.kind === "centre") return;
      if (target?.kind === "segment") describedAs(target.segment, tree)?.onActivate();
      else requestClose();
    };
    const stop = () => {
      pressed.current = null;
      setDrawn((previous) => previous && { ...previous, shown: false });
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", stop);
    };
    pressed.current?.();
    pressed.current = stop;
    if (drag) setHovered(null);
    onMove(event.nativeEvent);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", stop);
  }, []);
  const onBoardPointerDown = useCallback(
    (event: React.PointerEvent) => startPress(event, false),
    [startPress],
  );
  const onBoardPointerMove = useCallback((event: React.PointerEvent) => {
    const { layout } = latest.current;
    const at = offsetOf(anchor.current, event, layout);
    if (pressed.current || !at) return;
    // only a change re-renders: the pointer reports far more often than it moves on
    const next = segmentOf(hit(...at, layout));
    setHovered((previous) => (sameSegment(previous, next) ? previous : next));
  }, []);
  const onBoardPointerLeave = useCallback(() => {
    if (!pressed.current) setHovered(null);
  }, []);
  const onCentrePointerDown = useCallback(
    (event: React.PointerEvent) => {
      const { tree, isOpen, requestOpen } = latest.current;
      if (!requestOpen || event.button !== 0 || tree.centre.children.props.disabled || isOpen)
        return;
      requestOpen();
      startPress(event, true);
    },
    [startPress],
  );
  // Enter or Space on a focused segment activates it; the segment is found by the place it
  // carries in its data attributes, so one handler serves every segment
  const onSegmentKeyDown = useCallback((event: React.KeyboardEvent<SVGPathElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    const { ring, arc, index } = event.currentTarget.dataset;
    describedAs(
      { ring: Number(ring), arc: Number(arc), index: Number(index) },
      latest.current.tree,
    )?.onActivate();
  }, []);

  // the arcs: each drawn at home and turned into place, its segments' shapes first and
  // their content over them
  const under = drawn?.shown ? segmentOf(drawn.on) : null;
  const art = layout.rings.map((ring, r) =>
    ring.arcs.map((arc, a) => {
      const described = tree.rings[r]?.arcs[a];
      if (!described) return null;
      const classes = (segment: SegmentLayout, { dimmed }: SegmentProps) =>
        [
          dimmed ||
          (described.props.dimOthersUnderDrag &&
            under?.ring === r &&
            under.arc === a &&
            under.index !== segment.index)
            ? "dimmed"
            : undefined,
          sameSegment(hovered, segment) ? "hovered" : undefined,
        ]
          .filter(Boolean)
          .join(" ") || undefined;
      // each laid-out segment with its description
      const segments = arc.segments.flatMap((segment) => {
        const props = described.segments[segment.index]?.props;
        return props ? [{ segment, props }] : [];
      });
      return (
        <Swung key={described.key} style={{ rotate: `${-arc.turn}deg` }}>
          {segments.map(({ segment, props }) => (
            <Shape
              key={segment.index}
              d={segmentPath(segment)}
              paint={sameSegment(hovered, segment) ? (props.hoverFill ?? props.fill) : props.fill}
              outlined={props.outlined ?? true}
              className={classes(segment, props)}
              role="menuitem"
              tabIndex={0}
              aria-label={props.label}
              data-ring={segment.ring}
              data-arc={segment.arc}
              data-index={segment.index}
              onKeyDown={onSegmentKeyDown}
            />
          ))}
          {segments.map(({ segment, props }) => {
            const [x, y] = homeCentre(segment);
            return (
              props.children && (
                <g key={segment.index} transform={`translate(${x} ${y})`}>
                  <Content className={classes(segment, props)} style={{ rotate: `${arc.turn}deg` }}>
                    {props.children}
                  </Content>
                </g>
              )
            );
          })}
        </Swung>
      );
    }),
  );

  const extent = layout.extent + BORDER / 2;
  return (
    <Menu
      verticalAlignment="span-all"
      horizontalAlignment="span-all"
      diameter={tree.centre.diameter}
      isOpen={isOpen}
      requestClose={requestClose}
      content={
        <Board
          role="menu"
          extent={extent}
          pointing={hovered !== null}
          onPointerDown={onBoardPointerDown}
          onPointerMove={onBoardPointerMove}
          onPointerLeave={onBoardPointerLeave}
        >
          <svg
            width={extent * 2}
            height={extent * 2}
            viewBox={`${-extent} ${-extent} ${extent * 2} ${extent * 2}`}
          >
            <g id={`${id}-arcs`}>{art}</g>
            {drawn && <Glass id={id} drawn={drawn} />}
          </svg>
        </Board>
      }
    >
      <Anchor
        ref={anchor}
        className={className}
        diameter={tree.centre.diameter}
        onPointerDown={onCentrePointerDown}
      >
        {cloneElement(tree.centre.children, {
          "aria-haspopup": requestOpen && "menu",
          "aria-expanded": requestOpen && isOpen,
        })}
      </Anchor>
    </Menu>
  );
};

export default RadialMenu;
