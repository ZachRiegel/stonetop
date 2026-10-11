// The roll menu's React side: the die button, the Popover that holds the open menu, the
// arcs drawn from geometry.ts, the glass bubble and the pointer handling. README.md has the
// interaction model and the design decisions.
import { keyframes } from "@emotion/react";
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
  type Bubble,
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
// the drawing's half size: the menu's reach plus the outer half of a border
const SIZE = EXTENT + BORDER / 2;
// how far the lens magnifies what is under it
const ZOOM = 1.03;
// how far the rim bends each colour channel, in px, red least and blue most, with the
// feColorMatrix that keeps only that channel (and alpha) of a bent copy
const only = (channel: number) =>
  Array.from({ length: 4 }, (_, row) =>
    Array.from({ length: 5 }, (_, col) => Number(col === row && (row === channel || row === 3))),
  )
    .map((row) => row.join(" "))
    .join("  ");
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
// dims when another die is chosen
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

// turned back against the count arc's turn, so it stays upright while sliding round
const Numeral = styled.text`
  ${FontCSS.Bold20}
  fill: ${INK};
  text-anchor: middle;
  dominant-baseline: central;
  transform-box: fill-box;
  transform-origin: center;
  transition: rotate 200ms ease-out;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

// a material-symbols icon on a dark pill, drawn as a path so the lens's copy of the menu
// has it too
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

// A pane of glass over whatever a drag is passing: three layers sharing one shape, which
// eases while snapping onto a button. The lens shows the menu magnified about the glass's
// centre and bent at the rim, under a sheen and a bright edge.
const Glass = styled.g`
  filter: drop-shadow(0 3px 8px rgb(0 0 0 / 0.45));
  transition: opacity 200ms ease-out;

  & > * {
    transition-property: d;
    transition-timing-function: ease-out;
  }
`;
const Lens = styled.path`
  fill: url(#lens);
  filter: url(#refract);
`;
const Sheen = styled.path`
  fill: url(#sheen);
`;
const Rim = styled.path`
  fill: none;
  stroke: url(#rim);
  stroke-width: 1.5px;
`;

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
  // the button under the pointer between presses, and the bubble during a drag, which
  // keeps its last shape while fading out
  const [hovered, setHovered] = useState<Hit | null>(null);
  const [bubble, setBubble] = useState<Bubble | null>(null);
  const last = useRef<Bubble>(null);
  last.current = bubble ?? last.current;
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
  // what a release does; a plain `click` of the die button leaves the menu it just opened
  const activate = (target: Hit | null, click: boolean) => {
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
    } else if (!(target?.arc === "button" && click)) close();
  };
  // A press, reported by the window until it ends, since the dialog that opens mid-press
  // makes the button inert (captured events still bubble). A `drag` starts on the die
  // button: the bubble follows, a colour is picked in passing and dropped by coming back
  // inside the ring. A press on the open menu moves nothing until it is released.
  const startPress = (event: React.PointerEvent, drag: boolean) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    let left = false;
    const onMove = (event: PointerEvent) => {
      const at = offsetOf(event);
      if (!at || !drag) return;
      const arcs = arcsOf(chosen.current);
      const found = hit(...at, arcs);
      setBubble(bubbleOf(found, ...at, arcs));
      if (found?.arc !== "button") left = true;
      if (insideRing(...at)) choose(null);
      const die = found?.arc === "dice" ? DIE_COLOURS[found.index] : undefined;
      if (die) choose(die);
    };
    const onUp = (event: PointerEvent) => {
      stop();
      const at = offsetOf(event);
      activate(at && hit(...at, arcsOf(chosen.current)), drag && !left);
    };
    const stop = () => {
      pressed.current = null;
      setBubble(null);
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

  // The arcs and their labels. The menu proper is `live`; the lens's copy is not, so it
  // stays out of the tab order and the accessibility tree. The count arc is drawn in its
  // home place and turned by CSS (clockwise, unlike the angles here); `arcs` holds the
  // turned one for hit testing.
  const turn = colour ? countTurn(colour) : 0;
  const art = (live: boolean) =>
    entriesOf(arcs).map(([name, arc]) => {
      const buttons = Array.from({ length: arc.segments }, (_, index) => index);
      const Group = name === "count" ? Unfolding : "g";
      const drawn = name === "count" ? COUNT_ARC : arc;
      const dimmed = (index: number) =>
        name === "dice" && colour && DIE_COLOURS[index] !== colour ? "dimmed" : "";
      return (
        <Group
          key={name}
          style={name === "count" ? { rotate: `${-turn}deg` } : undefined}
          aria-hidden={live ? undefined : true}
        >
          {buttons.map((index) => (
            <Segment
              key={index}
              d={buttonPath(drawn, index)}
              paint={paintOf(name, index, hovered?.arc === name && hovered.index === index)}
              className={dimmed(index)}
              role={live ? "menuitem" : undefined}
              tabIndex={live ? 0 : undefined}
              aria-label={live ? labelOf(name, index, colour) : undefined}
              onKeyDown={(event) => {
                if (!live || (event.key !== "Enter" && event.key !== " ")) return;
                event.preventDefault();
                activate({ arc: name, index }, false);
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
              const [x, y] = centreOf(drawn, index);
              return (
                <Numeral key={index} x={x} y={y} style={{ rotate: `${turn}deg` }}>
                  {index + 1}
                </Numeral>
              );
            })}
          {name === "log" && glyph(arc, "Chat")}
          {name === "settings" && glyph(arc, "Cog")}
        </Group>
      );
    });

  const [fx, fy] = last.current?.focus ?? [0, 0];
  const easing = { transitionDuration: last.current?.snap ? "200ms" : "0ms" };
  const shape = { d: `path("${last.current?.d}")`, ...easing };
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
          <svg
            width={SIZE * 2}
            height={SIZE * 2}
            viewBox={`${-SIZE} ${-SIZE} ${SIZE * 2} ${SIZE * 2}`}
          >
            <defs>
              {/* the menu again, magnified a little about the glass's centre, on a tile
                  twice the drawing so the lens never shows a repeat */}
              <pattern
                id="lens"
                patternUnits="userSpaceOnUse"
                x={-SIZE * 2}
                y={-SIZE * 2}
                width={SIZE * 4}
                height={SIZE * 4}
                viewBox={`${-SIZE * 2} ${-SIZE * 2} ${SIZE * 4} ${SIZE * 4}`}
              >
                <g
                  style={{
                    transform: `translate(${fx}px, ${fy}px) scale(${ZOOM}) translate(${-fx}px, ${-fy}px)`,
                    transitionProperty: "transform",
                    ...easing,
                  }}
                >
                  {art(false)}
                </g>
              </pattern>
              {/* Refraction in a band at the rim: the glass's blurred silhouette is a
                  height map whose slope (Sobel kernels; feConvolveMatrix applies them
                  flipped) pulls the picture outward at the edge like a convex lens and
                  is flat inside. Each colour channel bends a little differently for a
                  chromatic fringe, the result is softened (displacement is not
                  supersampled) and cut back to the silhouette. */}
              <filter
                id="refract"
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
              <radialGradient id="sheen" cx={0.3} cy={0.25} r={0.7}>
                <stop offset={0} stopColor={WHITE} stopOpacity={0.4} />
                <stop offset={0.6} stopColor={WHITE} stopOpacity={0.1} />
                <stop offset={1} stopColor={WHITE} stopOpacity={0.2} />
              </radialGradient>
              <linearGradient id="rim" x1={0} y1={0} x2={1} y2={1}>
                <stop offset={0} stopColor={WHITE} stopOpacity={0.85} />
                <stop offset={0.45} stopColor={WHITE} stopOpacity={0.15} />
                <stop offset={0.7} stopColor={WHITE} stopOpacity={0.2} />
                <stop offset={1} stopColor={WHITE} stopOpacity={0.6} />
              </linearGradient>
            </defs>
            {art(true)}
            {last.current && (
              <Glass style={{ opacity: bubble ? 1 : 0 }}>
                <Lens style={shape} />
                <Sheen style={shape} />
                <Rim style={shape} />
              </Glass>
            )}
          </svg>
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
