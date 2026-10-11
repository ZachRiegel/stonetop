// The roll menu's React side: the die button, the Popover that holds the open menu, the
// arcs drawn from geometry.ts, the glass bubble and the pointer handling. README.md has the
// interaction model and the design decisions.
import { css, keyframes } from "@emotion/react";
import styled from "@emotion/styled";
import { FontCSS } from "components/Font.tsx";
import Icon, { iconPath } from "components/Icon.tsx";
import Popover from "components/Popover.tsx";
import useModal from "hooks/useModal.ts";
import { CREAM, DICE, DIE_COLOURS, type DieColour, starPath } from "pages/dice/dice.ts";
import {
  type Arc,
  type ArcName,
  arcsOf,
  bubbleOf,
  buttonPath,
  centreOf,
  COUNT_ARC,
  countTurn,
  entriesOf,
  EXTENT,
  held,
  type Hit,
  hit,
  insideRing,
  RADIUS,
} from "pages/dice/rollMenu/geometry.ts";
import React, { useEffect, useRef, useState } from "react";

const INK = "#1A1A1A";
const WHITE = "#ffffff";
const BORDER = 2;
// the SVG defs are referenced by id, which is fine with one menu on a page
const ID = "roll-menu";
// the drawing's half size: the menu's reach plus the outer half of a border
const SIZE = EXTENT + BORDER / 2;
// how far the lens magnifies what is under it
const ZOOM = 1.03;
// a feColorMatrix keeping only one channel, and alpha, of its input
const only = (channel: number) =>
  Array.from({ length: 4 }, (_, row) =>
    Array.from({ length: 5 }, (_, col) => Number(col === row && (row === channel || row === 3))),
  )
    .map((row) => row.join(" "))
    .join("  ");
// how far the rim bends each colour channel, in px, red least and blue most
const CHANNELS = [
  { channel: "r", scale: -8, keep: only(0) },
  { channel: "g", scale: -10, keep: only(1) },
  { channel: "b", scale: -12, keep: only(2) },
];

const labelOf = (arc: ArcName, index: number, colour: DieColour | null) =>
  arc === "dice"
    ? `${DIE_COLOURS[index]} dice`
    : arc === "count"
      ? `roll ${index + 1} ${colour ?? ""} dice`
      : arc;

// the palette ramp (RootLayout.tsx) behind each die colour
const RAMPS: Record<DieColour, string> = { blue: "cyan", violet: "magenta", orange: "orange" };
// a button's fill, lifted a step while hovered
const paintOf = (arc: ArcName, index: number, hovered: boolean) => {
  const die = arc === "dice" ? DIE_COLOURS[index] : undefined;
  if (die) return `var(--${RAMPS[die]}-${hovered ? 600 : 500})`;
  if (arc === "count") return hovered ? WHITE : CREAM;
  return `var(--neutral-${hovered ? 300 : 200})`;
};

const sameHit = (a: Hit | null, b: Hit | null) =>
  a === b || (a !== null && b !== null && a.arc === b.arc && a.index === b.index);

const grow = keyframes`
  from {
    opacity: 0;
    scale: 0.6;
  }
  to {
    opacity: 1;
    scale: 1;
  }
`;

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

// the popover's section sits exactly over the button; the menu is centred on it and
// overflows. AnimateInOut only waits for animations on the section itself.
const Menu = styled(Popover)`
  & > .animateInOut > dialog > section {
    display: grid;
    grid-template: 100% / 100%;
    place-items: center;
    height: ${RADIUS * 2}px;
    animation: ${({ isOpen }) => (isOpen ? grow : shrink)} 150ms ease-out both;

    @media (prefers-reduced-motion: reduce) {
      animation-duration: 0ms;
    }
  }
`;

const DieButton = styled.button<{ isOpen: boolean }>`
  width: ${RADIUS * 2}px;
  height: ${RADIUS * 2}px;
  display: grid;
  place-items: center;
  padding: 0;
  border: none;
  border-radius: 999px;
  background: ${({ isOpen }) => (isOpen ? WHITE : CREAM)};
  color: ${INK};
  cursor: pointer;
  touch-action: none;
  --icon-size: 28px;

  &:where(:hover:not(:disabled)) {
    background: ${WHITE};
  }

  &:where(:disabled) {
    cursor: default;
    opacity: 0.4;
  }

  &:where(:focus-visible) {
    outline: 2px solid var(--neutral-700);
    outline-offset: 2px;
  }
`;

// the pointer area; the drawing inside takes no events of its own, so the cursor is set
// here from what the pointer is over
const Board = styled.div<{ pointing: boolean }>`
  width: ${SIZE * 2}px;
  height: ${SIZE * 2}px;
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

// a button, outlined so neighbours read apart; its fill lifts under the pointer, and it
// dims when another of its arc is chosen
const Segment = styled.path<{ paint: string }>`
  fill: ${({ paint }) => paint};
  stroke: var(--neutral-200);
  stroke-width: ${BORDER}px;
  outline: none;
  transition:
    fill 150ms ease-out,
    opacity 200ms ease-out;

  &:where(.dimmed) {
    opacity: 0.45;
  }

  &:where(:focus-visible) {
    stroke: ${WHITE};
    stroke-width: 3px;
  }
`;

const Star = styled.path`
  fill: ${CREAM};
  stroke: ${INK};
  stroke-width: 1.5px;
  stroke-linejoin: round;
  transition: opacity 200ms ease-out;

  &:where(.dimmed) {
    opacity: 0.45;
  }
`;

// turned back against the count arc's turn so it stays upright while sliding round, about
// its parent's origin, which the parent moves to the button's centre: iOS Safari misplaced
// a fill-box transform-origin on text
const Numeral = styled.text`
  ${FontCSS.Bold20}
  fill: ${INK};
  text-anchor: middle;
  dominant-baseline: central;
  transition:
    rotate 200ms ease-out,
    opacity 200ms ease-out;

  &:where(.dimmed) {
    opacity: 0.45;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: opacity 200ms ease-out;
  }
`;

// a material-symbols icon on a dark pill, drawn as a path so the lens's clone of the menu
// renders it the same way
const Glyph = styled.path`
  fill: ${CREAM};
`;
const ICON_SIZE = 28;
const glyph = (arc: Arc, name: "Chat" | "Cog") => {
  const [x, y] = centreOf(arc, 0);
  return (
    <Glyph
      d={iconPath(name)}
      transform={`translate(${x - ICON_SIZE / 2} ${y - ICON_SIZE / 2}) scale(${ICON_SIZE / 24})`}
    />
  );
};

// The count arc: drawn once centred on the middle die and turned to the chosen one, so a
// change of die swings it round rather than unfolding it afresh. Scaled and turned about
// the SVG's origin, which is the button's centre.
const Unfolding = styled.g`
  animation: ${unfold} 150ms ease-out both;
  transition: rotate 200ms ease-out;

  @media (prefers-reduced-motion: reduce) {
    animation-duration: 0ms;
    transition: none;
  }
`;

// The drawing, and the bubble's place in CSS: the button it is placed on, the pointer, and a
// slider mixing the two, registered in RootLayout.tsx so they interpolate. The slider
// transitions, as does the placed point when hopping between buttons; arriving from free the
// slider already carries the move, so the placed point jumps. The pointer never transitions.
const Drawing = styled.svg`
  --roll-menu-x: calc(
    var(--roll-menu-mouse-x) + (var(--roll-menu-placed-x) - var(--roll-menu-mouse-x)) *
      var(--roll-menu-slide)
  );
  --roll-menu-y: calc(
    var(--roll-menu-mouse-y) + (var(--roll-menu-placed-y) - var(--roll-menu-mouse-y)) *
      var(--roll-menu-slide)
  );
  transition:
    --roll-menu-slide 200ms ease-out,
    --roll-menu-placed-x 200ms ease-out,
    --roll-menu-placed-y 200ms ease-out;

  &:where(.arriving) {
    transition-duration: 200ms, 0ms, 0ms;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

// A pane of glass over whatever a drag is passing: a lens, a sheen and a rim sharing one
// shape, which morphs between a circle and the buttons' shapes. The lens is the live menu
// again, through a <use>, clipped to the shape, magnified about the glass's place and bent
// at the rim. Filters cannot see what lies beneath an element, so the menu has to be drawn
// into it.
const Glass = styled.g`
  filter: drop-shadow(0 3px 8px rgb(0 0 0 / 0.45));
  transition: opacity 200ms ease-out;
`;
const Lens = styled.g`
  filter: url(#${ID}-refract);
`;
const Magnified = styled.use`
  transform: translate(var(--roll-menu-x), var(--roll-menu-y)) scale(${ZOOM})
    translate(calc(-1 * var(--roll-menu-x)), calc(-1 * var(--roll-menu-y)));
`;
// the glass's layers share one place and one morphing shape
const placedAt = css`
  translate: var(--roll-menu-x) var(--roll-menu-y);
`;
const morphing = css`
  transition: d 200ms ease-out;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;
const Placed = styled.g`
  ${placedAt}
`;
const Clip = styled.path`
  ${placedAt}
  ${morphing}
`;
const Sheen = styled.path`
  fill: url(#${ID}-sheen);
  ${morphing}
`;
const Rim = styled.path`
  fill: none;
  stroke: url(#${ID}-rim);
  stroke-width: 1.5px;
  ${morphing}
`;

// The bubble as drawn: its shape, what it sits `on` (null when free), `placed` is the last
// button's centre, kept after leaving it, `mouse` the held pointer. A `hop` is straight from
// one button to another, which eases the placed point. It stays after the drag, `shown` off,
// so the glass fades out in its last shape.
type Drawn = {
  d: string;
  on: Hit | null;
  placed: readonly [number, number];
  mouse: readonly [number, number];
  hop: boolean;
  shown: boolean;
};

// A radial menu round one die button: dice colours up and to the left, log right, settings
// below; a chosen colour unfolds a count arc, and a count rolls. Click through it, or press
// the button and drag through a colour to a count. The open menu is a Popover, so Escape,
// clicking outside (the inert button under the dialog included) and focus return come free.
const RollMenu = ({
  className,
  disabled,
  onRoll,
  onLog,
  onSettings,
}: {
  className?: string;
  disabled?: boolean;
  onRoll: (dice: DieColour[]) => void;
  onLog: () => void;
  onSettings: () => void;
}) => {
  const menu = useModal();
  const button = useRef<HTMLButtonElement>(null);
  const [colour, setColour] = useState<DieColour | null>(null);
  const arcs = arcsOf(colour);
  // the button under the pointer between presses, and the bubble of the last drag
  const [hovered, setHovered] = useState<Hit | null>(null);
  const [bubble, setBubble] = useState<Drawn | null>(null);
  // the chosen colour and the press under way, as the window listeners see them
  const chosen = useRef<DieColour | null>(null);
  const pressed = useRef<(() => void) | null>(null);
  useEffect(() => () => pressed.current?.(), []);

  // the pointer's offset from the button's centre, held within the menu's reach
  const offsetOf = ({ clientX, clientY }: { clientX: number; clientY: number }) => {
    const rect = button.current?.getBoundingClientRect();
    return rect
      ? held(clientX - rect.left - rect.width / 2, clientY - rect.top - rect.height / 2)
      : null;
  };
  const choose = (die: DieColour | null) => {
    chosen.current = die;
    setColour(die);
  };
  const close = () => {
    menu.close();
    choose(null);
    setHovered(null);
    setBubble(null);
  };
  // what a release, or Enter on a focused button, does
  const activate = (target: Hit | null) => {
    const die = target?.arc === "dice" ? DIE_COLOURS[target.index] : undefined;
    if (target?.arc === "count" && chosen.current) {
      const colour = chosen.current;
      onRoll(Array.from({ length: target.index + 1 }, () => colour));
      close();
    } else if (die) choose(die);
    else if (target?.arc === "log") {
      onLog();
      close();
    } else if (target?.arc === "settings") {
      onSettings();
      close();
    } else close();
  };
  // A press, reported by the window until it ends, since the dialog that opens mid-press
  // makes the button inert (captured events still bubble). A `drag` starts on the die
  // button: the bubble follows, a colour is picked in passing and dropped by coming back
  // inside the ring or landing on a pill. A press on the open menu moves nothing until it
  // is released.
  const startPress = (event: React.PointerEvent, drag: boolean) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    let left = false;
    const onMove = (event: PointerEvent) => {
      const at = offsetOf(event);
      if (!at || !drag) return;
      const arcs = arcsOf(chosen.current);
      const found = hit(...at, arcs);
      const { d, placed } = bubbleOf(found, arcs);
      setBubble((previous) => ({
        d,
        on: found,
        placed: placed ?? previous?.placed ?? [0, 0],
        mouse: at,
        hop: !!previous?.shown && previous.on !== null && found !== null,
        shown: true,
      }));
      if (found?.arc !== "button") left = true;
      // coming back inside the ring, or landing on a pill, drops the chosen die
      if (insideRing(...at) || found?.arc === "log" || found?.arc === "settings") choose(null);
      const die = found?.arc === "dice" ? DIE_COLOURS[found.index] : undefined;
      if (die) choose(die);
    };
    const onUp = (event: PointerEvent) => {
      stop();
      const at = offsetOf(event);
      const target = at && hit(...at, arcsOf(chosen.current));
      // a press that never left the die button is a click, and leaves the menu it opened
      if (!(drag && !left && target?.arc === "button")) activate(target);
    };
    const stop = () => {
      pressed.current = null;
      setBubble((previous) => previous && { ...previous, shown: false });
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
  };

  // The arcs and their labels. The count arc is drawn in its home place and turned by CSS
  // (clockwise, unlike the angles here); `arcs` holds the turned one for hit testing.
  const turn = colour ? countTurn(colour) : 0;
  const art = () =>
    entriesOf(arcs).map(([name, arc]) => {
      const buttons = Array.from({ length: arc.segments }, (_, index) => index);
      const Group = name === "count" ? Unfolding : "g";
      const home = name === "count" ? COUNT_ARC : arc;
      // the other dice dim once one is chosen, and the other counts while a drag sits on one
      const under = bubble?.shown ? bubble.on : null;
      const dimmed = (index: number) =>
        (name === "dice" && colour && DIE_COLOURS[index] !== colour) ||
        (name === "count" && under?.arc === "count" && under.index !== index)
          ? "dimmed"
          : "";
      return (
        <Group key={name} style={name === "count" ? { rotate: `${-turn}deg` } : undefined}>
          {buttons.map((index) => (
            <Segment
              key={index}
              d={buttonPath(home, index)}
              paint={paintOf(name, index, hovered?.arc === name && hovered.index === index)}
              className={dimmed(index)}
              role="menuitem"
              tabIndex={0}
              aria-label={labelOf(name, index, colour)}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                activate({ arc: name, index });
              }}
            />
          ))}
          {name === "dice" &&
            DIE_COLOURS.map((die, index) => (
              <Star
                key={die}
                className={dimmed(index)}
                d={starPath(DICE[die].points, 14, ...centreOf(arc, index))}
              />
            ))}
          {name === "count" &&
            buttons.map((index) => {
              const [x, y] = centreOf(home, index);
              return (
                <g key={index} transform={`translate(${x} ${y})`}>
                  <Numeral className={dimmed(index)} style={{ rotate: `${turn}deg` }}>
                    {index + 1}
                  </Numeral>
                </g>
              );
            })}
          {name === "log" && glyph(arc, "Chat")}
          {name === "settings" && glyph(arc, "Cog")}
        </Group>
      );
    });

  // the bubble's shape, and its place for the Drawing's variables (custom properties are
  // not in React's style type, hence the cast below)
  const shape = { d: `path("${bubble?.d}")` };
  const place = bubble && {
    "--roll-menu-placed-x": `${bubble.placed[0]}px`,
    "--roll-menu-placed-y": `${bubble.placed[1]}px`,
    "--roll-menu-mouse-x": `${bubble.mouse[0]}px`,
    "--roll-menu-mouse-y": `${bubble.mouse[1]}px`,
    "--roll-menu-slide": bubble.on ? 1 : 0,
  };
  return (
    <Menu
      verticalAlignment="span-all"
      horizontalAlignment="span-all"
      isOpen={menu.isOpen}
      requestClose={close}
      content={
        <Board
          role="menu"
          pointing={hovered !== null}
          onPointerDown={(event) => startPress(event, false)}
          onPointerMove={(event) => {
            const at = offsetOf(event);
            if (pressed.current || !at) return;
            const found = hit(...at, arcs);
            // only a change re-renders: the pointer reports far more often than it moves on
            const next = found?.arc === "button" ? null : found;
            setHovered((previous) => (sameHit(previous, next) ? previous : next));
          }}
          onPointerLeave={() => {
            if (!pressed.current) setHovered(null);
          }}
        >
          <Drawing
            width={SIZE * 2}
            height={SIZE * 2}
            viewBox={`${-SIZE} ${-SIZE} ${SIZE * 2} ${SIZE * 2}`}
            className={bubble?.on && !bubble.hop ? "arriving" : undefined}
            style={place as React.CSSProperties}
          >
            <defs>
              <clipPath id={`${ID}-glass`}>
                <Clip style={shape} />
              </clipPath>
              {/* Refraction in a band at the rim: the glass's blurred silhouette is a
                  height map whose slope (Sobel kernels; feConvolveMatrix applies them
                  flipped) pulls the picture outward at the edge like a convex lens and
                  is flat inside. Each colour channel bends a little differently for a
                  chromatic fringe, the result is softened (displacement is not
                  supersampled) and cut back to the silhouette. */}
              <filter
                id={`${ID}-refract`}
                x="-25%"
                y="-25%"
                width="150%"
                height="150%"
                colorInterpolationFilters="sRGB"
              >
                <feGaussianBlur in="SourceAlpha" stdDeviation={3} result="height" />
                <feColorMatrix
                  in="height"
                  values="0 0 0 1 0  0 0 0 1 0  0 0 0 1 0  0 0 0 0 1"
                  result="grey"
                />
                <feConvolveMatrix
                  in="grey"
                  order={3}
                  kernelMatrix="-1 0 1 -2 0 2 -1 0 1"
                  divisor={2}
                  bias={0.5}
                  preserveAlpha
                  result="dx"
                />
                <feConvolveMatrix
                  in="grey"
                  order={3}
                  kernelMatrix="-1 -2 -1 0 0 0 1 2 1"
                  divisor={2}
                  bias={0.5}
                  preserveAlpha
                  result="dy"
                />
                <feColorMatrix
                  in="dx"
                  values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0 1"
                  result="red"
                />
                <feColorMatrix
                  in="dy"
                  values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 0 1"
                  result="green"
                />
                <feComposite
                  in="red"
                  in2="green"
                  operator="arithmetic"
                  k2={1}
                  k3={1}
                  result="map"
                />
                {CHANNELS.map(({ channel, scale, keep }) => (
                  <React.Fragment key={channel}>
                    <feDisplacementMap
                      in="SourceGraphic"
                      in2="map"
                      scale={scale}
                      xChannelSelector="R"
                      yChannelSelector="G"
                      result={`bent-${channel}`}
                    />
                    <feColorMatrix in={`bent-${channel}`} values={keep} result={channel} />
                  </React.Fragment>
                ))}
                <feComposite in="r" in2="g" operator="arithmetic" k2={1} k3={1} result="rg" />
                <feComposite in="rg" in2="b" operator="arithmetic" k2={1} k3={1} />
                <feGaussianBlur stdDeviation={0.4} />
                <feComposite in2="SourceAlpha" operator="in" />
              </filter>
              <radialGradient id={`${ID}-sheen`} cx={0.3} cy={0.25} r={0.7}>
                <stop offset={0} stopColor={WHITE} stopOpacity={0.4} />
                <stop offset={0.6} stopColor={WHITE} stopOpacity={0.1} />
                <stop offset={1} stopColor={WHITE} stopOpacity={0.2} />
              </radialGradient>
              <linearGradient id={`${ID}-rim`} x1={0} y1={0} x2={1} y2={1}>
                <stop offset={0} stopColor={WHITE} stopOpacity={0.85} />
                <stop offset={0.45} stopColor={WHITE} stopOpacity={0.15} />
                <stop offset={0.7} stopColor={WHITE} stopOpacity={0.2} />
                <stop offset={1} stopColor={WHITE} stopOpacity={0.6} />
              </linearGradient>
            </defs>
            <g id={`${ID}-arcs`}>{art()}</g>
            {bubble && (
              <Glass style={{ opacity: bubble.shown ? 1 : 0 }} aria-hidden>
                {/* clipped before the filter sees it, so the silhouette the rim is bent
                    from is the glass's own */}
                <Lens>
                  <g clipPath={`url(#${ID}-glass)`}>
                    <Magnified href={`#${ID}-arcs`} />
                  </g>
                </Lens>
                <Placed>
                  <Sheen style={shape} />
                  <Rim style={shape} />
                </Placed>
              </Glass>
            )}
          </Drawing>
        </Board>
      }
    >
      <DieButton
        ref={button}
        className={className}
        type="button"
        aria-label="Roll dice"
        aria-haspopup="menu"
        aria-expanded={menu.isOpen}
        isOpen={menu.isOpen}
        disabled={disabled}
        onPointerDown={(event) => {
          if (disabled || menu.isOpen) return;
          menu.open();
          startPress(event, true);
        }}
      >
        <Icon.Die />
      </DieButton>
    </Menu>
  );
};

export default RollMenu;
