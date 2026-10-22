// The roll log: the campaign's last 20 rolls as a stack of cards above the die button, the
// newest at the foot, each the condensed readout with its time. Scrolling the stack brings
// older rolls down; as they pass the top they stick and sink into a pile, and at the foot
// they slip under a rule that reads as the stem of an X over the die button, which closes
// the log. As many whole cards show as fit between the page's margins, the leftover widening
// the pile's room. A roll made while the log is open joins it at the foot once its dice have
// settled. It is a modal dialog, as the roll menu is, so a click outside closes it. Drafted
// in src/holding/rollStack.html (2026-10-18), where the alternatives were tried: a solid
// bar, a ledge and a frosted bar under the stack, pill-cornered cards, and six other
// open/close animations.
import { css, keyframes } from "@emotion/react";
import styled from "@emotion/styled";
import Button from "components/Button.tsx";
import DialogInternals from "components/DialogInternals.tsx";
import Font from "components/Font.tsx";
import Icon from "components/Icon.tsx";
import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import prefersReducedMotion from "lib/prefersReducedMotion.ts";
import { CELL, MARGIN } from "pages/dice/rollMenu/RollMenu.tsx";
import RollReadout from "pages/dice/RollReadout.tsx";
import { type UIEvent, useCallback, useLayoutEffect, useRef, useState } from "react";

// closed; open, or opening; or closing, the cards sweeping out
export type LogPhase = "closed" | "open" | "closing";

const WIDTH = 320;
// The least gap between cards and the least room above them for the pile; fit() sets
// --shown, --gap, --h (the pitch) and --room on the log so whole cards fill the height
// between equal margins in whole pixels: the slack widens the gaps, the remainder the room.
const GAP = 8;
const LEAST_ROOM = 24;
// a card's height, whole so the resting places are whole pixels, and its corners (pill ends
// like the button's were tried and undone)
const CARD = 78;
const CORNER = 16;
// the pile: a sunk card has risen RISE, DEPTH cards bury one (three edges being as many as
// read well), and shows STRIP of its top
const RISE = 20;
const DEPTH = 3;
const STRIP = 28;
// the rule under the stack, rim included
const RULE = 20;
// The scroller's bottom clip lies on the X's midline, the rule's own, so the cut on a card
// slipping under the rule lies well inside it (on the rim, and 4px in, it showed a seam of
// background); the padding shrinks by the same, so the newest card rests a gap above the
// button. REACH widens the box past the cards' right edge, as padding under the X, since a
// scroller clips both axes at its padding edge and the sweep's cards travel 64px to the
// right, shadow included.
const FOOT = CELL / 2;
const REACH = 80;
// how far past its resting place a card travels before it is fully under the rule
const DROP_OVER = (CELL - RULE) / 2 + CARD;

const rim = "2px solid color-mix(in srgb, var(--cream) 35%, transparent)";

// The dialog spans the viewport, so a click anywhere off the log closes it (a click on the
// inert die button under the X included); its section is the die button's cell, which the
// X fills and the stack and rule hang off.
const Dialog = styled(DialogInternals)`
  position: fixed;
  inset: 0;

  &::backdrop {
    background: none;
  }

  & > section {
    position: fixed;
    right: ${MARGIN}px;
    bottom: ${MARGIN}px;
    width: ${CELL}px;
    height: ${CELL}px;
    display: grid;
  }
`;

// The scroller runs upward from its foot (column-reverse): its origin is the newest card,
// so opening lands there with no scroll, a short list packs down by itself and older cards
// lie up the negative range. It holds nothing but the cards: the rule is a sibling over it,
// since a sticky child (cards, then a bar) left Chrome ignoring the wheel for seconds (see
// the wheel handler). Snapping to whole cards, so a wheel tick moves one card.
const Log = styled.div<{ count: number }>`
  --n: ${({ count }) => count};
  /* the scroll range: the cards past the shown ones, a pitch each */
  --max: max(0px, calc((var(--n) - var(--shown)) * var(--h)));
  position: absolute;
  z-index: 1;
  right: ${-REACH}px;
  bottom: ${FOOT}px;
  width: ${WIDTH + REACH}px;
  padding-right: ${REACH}px;
  height: calc(var(--shown) * var(--h) + var(--room) + ${CELL - FOOT}px);
  padding-bottom: calc(${CELL - FOOT}px + var(--gap));
  overflow-y: auto;
  overscroll-behavior: contain;
  /* fit() sizes the box after a first layout at the content's height; anchoring would then
     hold the top card in view, where that layout had it, instead of the foot */
  overflow-anchor: none;
  scroll-snap-type: y mandatory;
  display: flex;
  flex-direction: column-reverse;
`;

// the cards, the oldest at the top with the pile's room above it; nothing shrinks, the
// column overflows the scroller by design
const Cards = styled.div`
  position: relative;
  flex: none;
  display: grid;
  row-gap: var(--gap);
  padding-top: var(--room);
`;

// The snap points are stops at each card's resting place, not the cards (a card pinned at
// the top snaps where it is pinned); mandatory, so a tick lands. --i counts from the oldest.
const Stop = styled.div<{ index: number }>`
  position: absolute;
  left: 0;
  right: 0;
  top: calc(${({ index }) => index} * var(--h));
  height: 1px;
  scroll-snap-align: start;
  pointer-events: none;
`;

const Empty = styled(Font.Italic16)`
  padding: 12px 4px;
  color: var(--neutral-500);
`;

// The pile: every card is held at the top of the scrollport once scrolled past, so the
// cards after it slide over it, by five scroll-driven animations on the card and its edge,
// all on the compositor. In this upward scroller the scroll() timeline runs from the foot
// (0) to the top, and --stick is the timeline offset at which card i reaches the top (the
// top is n - shown pitches from the foot and card i is i pitches below it). Pin: from the
// foot up to --stick the card is carried down by the distance it has overshot and rides in
// place; the shown cards, whose --stick is negative, get an empty range at 0. Sink, cover
// and bury are laid out from --stick too, with their keyframes in reverse, since the
// timeline runs the other way from the sinking. Sink: over the DEPTH pitches past sticking
// the card rises and shrinks a step a card (on transform, since translate is the pin), so
// the pile shows as a fan of edges in the room above. Cover: as the next card slides over
// it, the card fades out and its edge fades in, keeping pace with that card's top edge, so
// under the next card only the edge shows. Bury: a card a pitch past its full sink lies
// exactly under the one sunk after it, so both go to nothing (cover's fade over its own
// range). Drop is the foot's, forward since the card goes down as the offset grows: from its
// resting place (--rest) over DROP_OVER, held whole for the first half, then fading and
// receding on scale.
const pin = keyframes`
  from {
    translate: 0 max(0px, var(--stick));
  }
  to {
    translate: 0 0;
  }
`;
const sink = keyframes`
  to {
    transform: translateY(${-RISE}px) scale(0.9);
    opacity: 0.55;
  }
`;
// cover (which buries too), and uncover, each from the value the sink leaves, so the fan's
// edges keep its fade
const cover = keyframes`
  to {
    opacity: 0;
  }
`;
const uncover = keyframes`
  from {
    opacity: 0;
  }
`;
const drop = keyframes`
  50% {
    opacity: 1;
    scale: 1;
  }
  to {
    opacity: 0;
    scale: 0.85;
  }
`;

// An entry is a slot in the column that the scroll never moves or restyles; the pile
// animates its two children, the card and its edge, on translate, transform, scale and
// opacity only (nothing that lays out or paints mid-scroll). Each entry stacks above the
// ones buried before it.
const Entry = styled.div<{ index: number }>`
  --i: ${({ index }) => index};
  --stick: calc((var(--n) - var(--shown) - var(--i)) * var(--h));
  --rest: calc((var(--n) - 1 - var(--i)) * var(--h));
  position: relative;
  z-index: calc(var(--i) + 1);
  height: ${CARD}px;

  & > * {
    transform-origin: 50% 0;
  }

  /* Without scroll timelines (iOS before Safari 26) the animations would run on time, over
     no time, and leave every card at the end of its drop, faded out: the cards then just
     scroll, with no pile. */
  @supports (animation-timeline: scroll()) {
    & > * {
      animation:
        ${pin} linear both,
        ${sink} linear both reverse,
        ${cover} linear both reverse,
        ${cover} linear both reverse,
        ${drop} linear both;
      animation-timeline: scroll(), scroll(), scroll(), scroll(), scroll();
      animation-range:
        0px max(0px, var(--stick)),
        calc(var(--stick) - ${DEPTH} * var(--h)) var(--stick),
        calc(var(--stick) - var(--gap) - ${CARD - STRIP}px) calc(var(--stick) - var(--gap)),
        calc(var(--stick) - ${DEPTH + 1} * var(--h) - 1px)
          calc(var(--stick) - ${DEPTH + 1} * var(--h)),
        var(--rest) calc(var(--rest) + var(--gap) + ${DROP_OVER}px);
    }

    /* WebKit runs this scroller's timeline from its top rather than from its foot, the
       scroll origin (Chrome), so there every range is mirrored about the scroll range and
       every animation runs the other way (fit() marks the log) */
    [data-timeline="top"] & > * {
      animation-direction: reverse, normal, normal, normal, reverse;
      animation-range:
        calc(var(--max) - max(0px, var(--stick))) var(--max),
        calc(var(--max) - var(--stick)) calc(var(--max) - var(--stick) + ${DEPTH} * var(--h)),
        calc(var(--max) - var(--stick) + var(--gap))
          calc(var(--max) - var(--stick) + var(--gap) + ${CARD - STRIP}px),
        calc(var(--max) - var(--stick) + ${DEPTH + 1} * var(--h))
          calc(var(--max) - var(--stick) + ${DEPTH + 1} * var(--h) + 1px),
        calc(var(--max) - var(--rest) - var(--gap) - ${DROP_OVER}px) calc(var(--max) - var(--rest));
    }
  }
`;

// solid black, not the roll notification's glass: chosen knowing they differ
const surface = css`
  position: absolute;
  inset: 0;
  padding: 6px 12px 8px;
  border-radius: ${CORNER}px;
  background: var(--neutral-0);
  border: ${rim};
`;

const rise = keyframes`
  from {
    opacity: 0;
    translate: 0 12px;
  }
`;

// a fresh card's readout rises in: on the readout, not the card, whose animations are the pile's
const Card = styled.div<{ fresh: boolean }>`
  ${surface}
  box-shadow: var(--shadow-medium);
  ${({ fresh }) =>
    fresh &&
    css`
      & > * {
        animation: ${rise} 250ms ease-out both;

        @media (prefers-reduced-motion: reduce) {
          animation: none;
        }
      }
    `}
`;

// the card's top STRIP over again, for the card to trade places with as the next one covers it
const Edge = styled.div`
  ${surface}
  bottom: auto;
  height: ${STRIP}px;
  border-bottom: 0;
  border-radius: ${CORNER}px ${CORNER}px 0 0;
  overflow: hidden;

  /* doubled, to outweigh the entry's child rule whatever order emotion inserted them in */
  && {
    animation-name: ${pin}, ${sink}, ${uncover}, ${cover}, ${drop};
  }
`;

// The rule under the stack: a black band in the cards' rim, rounded at its free end, from
// the stack's left edge to the X's centre on the X's midline, so it reads as the X's stem
// and the cards slip under it. Its box runs to the X's centre but it is cut to an arc a hair
// inside the X's edge: run under the X, it showed on the die as the X faded out over the
// closing sweep. At rest the newest card sits (CELL - RULE) / 2 + the gap above it, more
// than a card gap: the foot's air, as the pile's room is the top's.
const Rule = styled.div`
  position: absolute;
  z-index: 2;
  right: ${CELL / 2}px;
  bottom: ${(CELL - RULE) / 2}px;
  width: ${WIDTH - CELL / 2}px;
  height: ${RULE}px;
  background: var(--neutral-0);
  border: ${rim};
  border-radius: 999px 0 0 999px;
  box-shadow: var(--shadow-small);
  mask-image: radial-gradient(
    circle at 100% 50%,
    transparent ${CELL / 2 - 1}px,
    #000 ${CELL / 2 - 0.5}px
  );
`;

// the X, the die button over again with the close icon at the menu's icon size (a black rim
// to stand it off the cards was tried and dropped, 2026-10-18); it fades in over the inert
// die first as the log opens and out last as it closes, so the die reads as crossfading
const Close = styled(Button.Cream)`
  --icon-size: 28px;
  z-index: 3;
`;

// Whether this engine runs a column-reverse scroller's scroll() timeline from the scroller's
// top, as WebKit does, rather than from its foot, the scroll origin, as Chrome does: a fresh
// probe at its origin reads 100% in WebKit and 0% (or, before a frame, null) in Chrome.
// Probed once; engines without scroll timelines never use the answer.
let fromTop: boolean | undefined;
const timelineFromTop = () => {
  if (fromTop !== undefined || typeof ScrollTimeline === "undefined") return fromTop ?? false;
  const probe = document.createElement("div");
  probe.style.cssText =
    "position: fixed; width: 10px; height: 10px; opacity: 0; pointer-events: none; overflow: auto; display: flex; flex-direction: column-reverse";
  probe.innerHTML = '<div style="flex: none; height: 20px"></div>';
  document.body.append(probe);
  const progress = new ScrollTimeline({ source: probe }).currentTime;
  probe.remove();
  return (fromTop = progress instanceof CSSUnitValue && progress.value > 50);
};

// a wheel listener's whole job (see the log's onWheel): to ask for a frame
const askForFrame = () => requestAnimationFrame(() => undefined);

// The stack fills the viewport's height less the button's margin at both ends, with the
// room above and the button below: as many whole cards as fit at the least gap, the gaps
// then widened (to a whole pixel) to take up the slack, and the last few pixels added to
// the room. The stops move with the pitch, so snapping is lifted while it is set and the
// box laid out, then restored to snap at the scroll as it is: kept on, Chrome scrolls to
// keep the stop it last snapped to in place, which on opening (laid out once before any
// fit, every stop at the top) put the oldest card in view instead of the newest.
const fit = (log: HTMLElement) => {
  log.style.scrollSnapType = "none";
  if (timelineFromTop()) log.dataset.timeline = "top";
  const span = innerHeight - 2 * MARGIN - CELL - LEAST_ROOM;
  const shown = Math.max(1, Math.floor(span / (CARD + GAP)));
  const gap = Math.floor(span / shown - CARD);
  log.style.setProperty("--shown", String(shown));
  log.style.setProperty("--gap", `${gap}px`);
  log.style.setProperty("--h", `${CARD + gap}px`);
  log.style.setProperty("--room", `${LEAST_ROOM + span - shown * (CARD + gap)}px`);
  void log.offsetHeight;
  log.style.scrollSnapType = "";
};

// The sweep (chosen over a rise, a deal from the foot, a pop from the X, a surfacing from
// under the rule, a telescope and a hinge): one set of Web Animations on the X, the rule and
// the entries, played forward to open and backward to close, so either direction
// interrupting the other carries on from where the cards are. The X fades in and the rule
// runs out of it; the cards deal in from the right, newest first, 15ms apart after 40ms,
// each easing into place over its whole slide with the fade lagging it (half faint at
// mid-travel) and an 8px blur clearing as it lands; backward, the same ease accelerates them
// away. Every animation is padded with endDelay to one shared length, so backward from rest
// they run in reverse order, the top card first, then the rule, then the X (each reversing
// from its own end had them all leave at once). Only the cards in view are animated: all
// twenty janked the close.
const sweepIn = (log: HTMLElement, rule: HTMLElement, close: HTMLElement) => {
  // a cubic ease-out; a sharper curve spent most of a card's slide in its first fifth and
  // read as a snap into place
  const ease = "cubic-bezier(0.33, 1, 0.68, 1)";
  // in view: the shown cards and the pile's fan, DEPTH edges and the one sunk under them
  // that bury has not yet taken (by index: right after a render the pin has not yet placed
  // the fan), or, on a close from wherever the user has scrolled, whatever card lies in the
  // port and is not buried
  const port = log.getBoundingClientRect();
  const inView = parseFloat(log.style.getPropertyValue("--shown")) + DEPTH + 1;
  const entries = [...log.querySelectorAll<HTMLElement>("[data-entry]")]
    .reverse()
    .filter((entry, j) => {
      const card = entry.lastElementChild as HTMLElement;
      const rect = card.getBoundingClientRect();
      return (
        j < inView ||
        (rect.bottom > port.top && rect.top < port.bottom && getComputedStyle(card).opacity !== "0")
      );
    });
  const delayOf = (j: number) => Math.min(40 + j * 15, 500);
  const total = 300 + delayOf(entries.length - 1);
  // padded with endDelay to the shared length
  const timing = (duration: number, easing: string, delay = 0): KeyframeAnimationOptions => ({
    duration,
    delay,
    endDelay: total - delay - duration,
    easing,
    fill: "both",
  });
  return [
    close.animate([{ opacity: 0 }, { opacity: 1 }], timing(200, "ease-out")),
    rule.animate(
      [{ clipPath: "inset(-4px -4px -4px 100%)" }, { clipPath: "inset(-4px)" }],
      timing(220, ease),
    ),
    ...entries.map((entry, j) =>
      entry.animate(
        [
          { translate: "64px 0", opacity: 0, filter: "blur(8px)" },
          { opacity: 0.35, offset: 0.5 },
          { translate: "0 0", opacity: 1, filter: "blur(0px)" },
        ],
        timing(300, ease, delayOf(j)),
      ),
    ),
  ];
};

// Rendered only while open or closing; the page holds the phase and `onPhase` asks it to
// move: the X, Escape and a click outside ask to close (the X mid-close turns the close
// round), and a landed close reports itself closed. `pending` is the roll in the air, kept
// out of the log until its dice have settled, when it joins at the foot: the stack keeps
// its place a pitch up and slides to it.
const RollLog = ({
  phase,
  onPhase,
  campaignId,
  pending,
}: {
  phase: LogPhase;
  onPhase: (phase: LogPhase) => void;
  campaignId: string;
  pending?: string;
}) => {
  const rolls = useQuery(api.messages.recent, { campaignId });
  // oldest first, as the column lays them out
  const listed = (rolls ?? []).filter((roll) => roll._id !== pending).reverse();
  const newest = listed.at(-1)?._id;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const ruleRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  // the sweep's animations, while one is open or in flight
  const sweep = useRef<Animation[]>([]);
  const latest = useRef({ phase, onPhase });
  latest.current = { phase, onPhase };
  // what had focus before the dialog took it, for when the log has gone
  const opener = useRef<HTMLElement>(null);
  // the roll that joined while the log was open, whose readout rises in
  const [fresh, setFresh] = useState<string>();
  const previous = useRef(newest);
  // the scroll as last seen, from before a new card grew the column: Chrome's snapping has
  // then already moved the scroll to keep the snapped stop in place, so it is not read back
  const resting = useRef(0);

  useLayoutEffect(() => {
    const log = logRef.current;
    if (!log) return;
    fit(log);
    // a fresh scroller: the last open's scroll and fresh card are not this one's
    resting.current = 0;
    setFresh(undefined);
    const refit = () => fit(log);
    addEventListener("resize", refit);
    return () => removeEventListener("resize", refit);
  }, [phase]);

  // a new roll keeps the stack where it was (a pitch further from the new foot) and slides
  // to the foot from there
  useLayoutEffect(() => {
    const log = logRef.current;
    if (log && previous.current !== undefined && newest !== previous.current) {
      setFresh(newest);
      log.scrollTop = resting.current - parseFloat(log.style.getPropertyValue("--h"));
      log.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "instant" : "smooth" });
    }
    previous.current = newest;
  }, [newest]);

  // The dialog, shown as the log opens, and the sweep, forward on open and backward on
  // closing; mid-flight the same animations are turned round. A landed open's animations
  // are cancelled, so the entries are not left composited; a landed close's are left
  // filling, hidden, since cancelling them showed the cards at rest for the frame before
  // the page unmounts the log.
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    const log = logRef.current;
    const rule = ruleRef.current;
    const close = closeRef.current;
    if (phase === "closed" || !dialog || !log || !rule || !close) {
      opener.current?.focus();
      opener.current = null;
      return;
    }
    if (!dialog.open) {
      opener.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
    }
    const open = phase === "open";
    if (prefersReducedMotion()) {
      if (!open) latest.current.onPhase("closed");
      return;
    }
    if (!sweep.current.length) sweep.current = sweepIn(log, rule, close);
    sweep.current.forEach((animation) => {
      animation.playbackRate = open ? 1 : -1.25;
      animation.play();
    });
    const these = sweep.current;
    Promise.all(these.map((animation) => animation.finished)).then(
      () => {
        // superseded meanwhile: the other direction's play() also resolved this
        if ((latest.current.phase === "open") !== open || these !== sweep.current) return;
        sweep.current = [];
        if (open) these.forEach((animation) => animation.cancel());
        else latest.current.onPhase("closed");
      },
      // cancelled
      () => undefined,
    );
  }, [phase]);

  // Escape and a click outside close; the X closes, or turns a close round mid-flight
  const requestClose = useCallback(() => onPhase("closing"), [onPhase]);
  const toggle = useCallback(
    () => onPhase(phase === "open" ? "closing" : "open"),
    [onPhase, phase],
  );
  const onScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => (resting.current = event.currentTarget.scrollTop),
    [],
  );

  if (phase === "closed") return null;
  return (
    <Dialog isOpen={phase === "open"} requestClose={requestClose} dialogRef={dialogRef}>
      <Log
        ref={logRef}
        role="log"
        aria-label="Roll log"
        count={listed.length}
        // With a scroll-driven animation in the log and no wheel listener, Chrome's wheel
        // went dead for seconds after a quick reversal at the top, the scrollbar still
        // working and the main thread idle: the compositor, which handles the wheel alone
        // when nothing listens, waits on a main-thread frame nothing has asked for. A
        // passive listener that only asks for one frees it (an empty one does not).
        onWheel={askForFrame}
        onScroll={onScroll}
      >
        <Cards>
          {rolls?.length === 0 && <Empty element="div" text="No rolls yet" />}
          {listed.map((roll, i) => {
            const readout = (
              <RollReadout
                condensed
                author={roll.author}
                time={roll._creationTime}
                dice={roll.dice}
                totals={roll.totals}
              />
            );
            return (
              <Entry key={roll._id} index={i} data-entry>
                <Edge aria-hidden="true">{readout}</Edge>
                <Card fresh={roll._id === fresh}>{readout}</Card>
              </Entry>
            );
          })}
          {listed.map((roll, i) => (
            <Stop key={roll._id} index={i} />
          ))}
        </Cards>
      </Log>
      <Rule ref={ruleRef} />
      <Close ref={closeRef} Icon={Icon.Close} aria-label="Close the log" onClick={toggle} />
    </Dialog>
  );
};

export default RollLog;
