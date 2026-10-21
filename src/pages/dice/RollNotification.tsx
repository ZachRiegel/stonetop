// The roll notification: a glass scoreboard that blooms out of the die button once a roll
// has settled, naming the thrower, their dice, and the totals as the dice's own marks. It
// lies half over the die button and is itself the button that clears this screen's table
// (the page's clear timer and the roll menu opening do the same); a line under the readout
// shows how long the timer has left. A roll while one is up blooms in over it, and the older
// card goes once the new one has bloomed. The die stayed a die and the card became the button
// (2026-10-18) because a die that turned into an X made rolling again four clicks.
import { css, keyframes } from "@emotion/react";
import styled from "@emotion/styled";
import { FontCSS } from "components/Font.tsx";
import AnimateInOut from "hoc/AnimateInOut.tsx";
import { CELL, MARGIN } from "pages/dice/rollMenu/RollMenu.tsx";
import RollReadout, { type Readout } from "pages/dice/RollReadout.tsx";
import { type AnimationEvent, useCallback, useState } from "react";

// a roll to announce
export type Announced = Omit<Readout, "time"> & {
  id: string;
  // seconds until the dice have settled, when the card blooms
  delaySeconds: number;
  // seconds the card then stays before the page clears the roll, if it does
  clearSeconds?: number;
};

// the die button (CELL) sits half over the card's right edge; the card is one width whatever
// the name (the readout cuts it), and its contents stop a side padding short of the button
const WIDTH = 396;
const PADDING = 12;
const RADIUS = 16;
// the bloom's timing, and the circle it starts from: a little inside the button, since the
// card starts scaled up by LIFT and would otherwise show past the button's edge; and how
// long a card takes to fade when closed
const BLOOM_MS = 250;
const FADE_MS = 200;
const LIFT = 1.06;
const SEED = CELL / 2 - 3;

// Laid down: the card is revealed by a circle growing from the button while it settles
// onto the table from a little above it. --origin is the button's centre and --reach the
// distance from it to the far corner. Closing just fades the card: the bloom played
// backwards was jarring in practice.
const bloom = keyframes`
  from {
    clip-path: circle(${SEED}px at var(--origin));
    scale: ${LIFT};
    filter: drop-shadow(0 16px 20px rgb(0 0 0 / 0.45));
  }
  to {
    clip-path: circle(var(--reach) at var(--origin));
    scale: 1;
    filter: drop-shadow(0 0 0 rgb(0 0 0 / 0));
  }
`;
// a cream ring riding the bloom's edge, drawn inside the clipped card so its inner half
// shows: the edge of the card coming in, or crossing the card it covers
const ripple = keyframes`
  from {
    width: ${2 * SEED}px;
    height: ${2 * SEED}px;
  }
  to {
    width: calc(2 * var(--reach));
    height: calc(2 * var(--reach));
  }
`;
// The card beneath a blooming one is glass, so the old would show through the new: the same
// circle is cut out of the old card as the new one blooms over it, and what is left of it
// fades meanwhile. Two mask layers, a disc sized and placed on the button's centre taken
// (exclude) from a full one.
const cover = keyframes`
  from {
    mask-size:
      ${2 * SEED}px ${2 * SEED}px,
      100% 100%;
    mask-position:
      calc(100% + ${SEED}px) 50%,
      0 0;
    opacity: 1;
  }
  to {
    mask-size:
      calc(2 * var(--reach)) calc(2 * var(--reach)),
      100% 100%;
    mask-position:
      calc(100% + var(--reach)) 50%,
      0 0;
    opacity: 0;
  }
`;
const fadeIn = keyframes`
  from {
    opacity: 0;
  }
`;
const fadeOut = keyframes`
  to {
    opacity: 0;
  }
`;
// a card's arrival is its bloom, or under reduced motion its fade in
const arriving = (animationName: string) =>
  animationName === bloom.name || animationName === fadeIn.name;
// the bloom's reach, set as each card mounts: from the button's centre to the far top-left
// corner, and a little past
const measureReach = (element: HTMLElement | null) =>
  element?.style.setProperty(
    "--reach",
    `${Math.hypot(element.offsetWidth, element.offsetHeight / 2) + 8}px`,
  );

// the cards, over one another, the newest on top, under the die button; hidden, not
// unmounted, while the roll log lies over this corner, so a card still blooms (the page
// hears it arrive, arms its timer, and dismisses it unseen) and a card that was already up
// shows again if the log closes before it goes
const Stack = styled.div<{ concealed: boolean }>`
  visibility: ${({ concealed }) => (concealed ? "hidden" : "visible")};
  grid-area: 2 / 1;
  justify-self: end;
  align-self: end;
  /* the middle of a card's right edge on the die button's centre */
  margin: 0 ${MARGIN + CELL / 2}px ${MARGIN + CELL / 2}px 0;
  translate: 0 50%;
  display: grid;

  & > * {
    grid-area: 1 / 1;
  }
`;

// blooms when it mounts, once the dice have settled; fades when leaving; and once
// `covered` (the seconds until the next card blooms over it), has that bloom cut out of it.
// Under reduced motion the dice jump to rest, so it fades at once.
const Card = styled.div<{ leaving: boolean; delaySeconds: number; covered?: number }>`
  position: relative;
  width: ${WIDTH}px;
  --origin: 100% 50%;
  transform-origin: var(--origin);
  animation: ${({ leaving }) => (leaving ? fadeOut : bloom)}
    ${({ leaving }) => (leaving ? FADE_MS : BLOOM_MS)}ms
    ${({ leaving }) => (leaving ? "ease-in" : "ease-out")}
    ${({ leaving, delaySeconds }) => (leaving ? 0 : delaySeconds)}s both;
  ${({ leaving, covered }) =>
    !leaving &&
    covered !== undefined &&
    css`
      mask-image:
        radial-gradient(circle closest-side, #000 99.5%, transparent 100%),
        linear-gradient(#000, #000);
      mask-repeat: no-repeat;
      mask-composite: exclude;
      animation: ${cover} ${BLOOM_MS}ms ease-out ${covered}s both;
    `}

  @media (prefers-reduced-motion: reduce) {
    animation-name: ${({ leaving, covered }) =>
      leaving || covered !== undefined ? fadeOut : fadeIn};
    animation-delay: 0s;
  }
`;

// the ring's box: the card's own outline, since the bloom's clip reaches past the card
const Lens = styled.div`
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: ${RADIUS}px;
  pointer-events: none;
`;

const Ring = styled.div<{ delaySeconds: number }>`
  position: absolute;
  left: 100%;
  top: 50%;
  translate: -50% -50%;
  border: 4px solid var(--cream);
  border-radius: 999px;
  pointer-events: none;
  /* rides the bloom only: a leaving card fades as a whole, and at full spread the ring
     lies past the lens */
  animation: ${ripple} ${BLOOM_MS}ms ease-out ${({ delaySeconds }) => delaySeconds}s both;

  @media (prefers-reduced-motion: reduce) {
    display: none;
  }
`;

// glass over the table, outlined in cream
const Board = styled.div`
  position: relative;
  padding: 8px ${CELL / 2 + PADDING}px 8px ${PADDING}px;
  border-radius: ${RADIUS}px;
  border: 2px solid var(--cream);
  background: rgb(0 0 0 / 0.55);
  backdrop-filter: blur(6px);
  box-shadow: var(--shadow-medium);
`;

const drain = keyframes`
  to {
    scale: 0 1;
  }
`;

// how long the card has left: a line under the readout draining over the clear time from
// the bloom, the same window as the page's timer (DiceRoller.tsx arms it at the bloom's
// start). It keeps to the content's width and stands off the border, so it reads as its own
// mark and not as a thicker edge (flush against the border it went unseen; half the card was
// tried and the full width kept). Kept under reduced motion: a slow, informational drain
// rather than a flourish.
const Fuse = styled.div<{ seconds: number; delaySeconds: number }>`
  position: absolute;
  left: ${PADDING}px;
  right: ${CELL / 2 + PADDING}px;
  bottom: 4px;
  height: 2px;
  border-radius: 999px;
  background: var(--cream);
  opacity: 0.6;
  transform-origin: left;
  animation: ${drain} ${({ seconds }) => seconds}s linear ${({ delaySeconds }) => delaySeconds}s
    both;
`;

// the card's button: a transparent layer over the readout and the fuse, so a press anywhere
// lands on it, named in the bottom-right corner (clear of the die button) only while pointed
// at or focused, so the readout stays the card's face
const Dismiss = styled.button`
  ${FontCSS.Semibold14}
  position: absolute;
  inset: 0;
  display: grid;
  align-content: end;
  justify-content: end;
  padding: 0 14px 8px 0;
  border: none;
  border-radius: ${RADIUS}px;
  background: none;
  color: var(--cream);
  cursor: pointer;
  opacity: 0;
  transition: opacity 150ms ease-out;

  &:hover,
  &:focus-visible {
    opacity: 1;
  }
`;

const RollNotification = ({
  isOpen,
  concealed = false,
  roll,
  dismissed,
  onArrive,
  onDismiss,
}: {
  isOpen: boolean;
  // the roll log is over the cards' corner
  concealed?: boolean;
  roll?: Announced;
  // a roll whose card is to wilt on its own: a newer roll is on its way, or it landed under
  // the roll log
  dismissed?: string;
  // a roll's card has begun to bloom, the dice having settled
  onArrive?: (id: string) => void;
  // the card has been pressed: the roll is to come off this table
  onDismiss?: () => void;
}) => {
  // the cards up, oldest first: a new roll is laid over the last, which goes once the new
  // one has bloomed. State, so the cards outlive the roll while they wilt (AnimateInOut
  // keeps this mounted until then).
  const [cards, setCards] = useState<Announced[]>([]);
  // a dismissed roll's card is not laid again once it has wilted: the roll may still be up
  if (roll && roll.id !== dismissed && cards.at(-1)?.id !== roll.id)
    setCards([...cards.slice(-1), roll]);
  // the card's own arrival, by name: the ring's and the cover's bubble up too; a card is
  // known by the id it carries
  const onAnimationStart = useCallback(
    (event: AnimationEvent<HTMLElement>) => {
      const { id } = event.currentTarget.dataset;
      if (id && arriving(event.animationName)) onArrive?.(id);
    },
    [onArrive],
  );
  // the newest has arrived: the cards under it go; a dismissed one has faded
  const onAnimationEnd = useCallback(
    (event: AnimationEvent<HTMLElement>) => {
      const { id } = event.currentTarget.dataset;
      if (arriving(event.animationName) && id === cards.at(-1)?.id)
        setCards((shown) => shown.filter((card) => card.id === id));
      if (event.animationName === fadeOut.name && id === dismissed)
        setCards((shown) => shown.filter((card) => card.id !== id));
    },
    [cards, dismissed],
  );
  return (
    <Stack concealed={concealed} aria-live="polite">
      {cards.map((card, i) => (
        <Card
          key={card.id}
          leaving={!isOpen || card.id === dismissed}
          delaySeconds={card.delaySeconds}
          covered={i < cards.length - 1 ? cards[cards.length - 1]?.delaySeconds : undefined}
          data-id={card.id}
          ref={measureReach}
          onAnimationStart={onAnimationStart}
          onAnimationEnd={onAnimationEnd}
        >
          <Board>
            <RollReadout {...card} />
            {card.clearSeconds !== undefined && (
              <Fuse seconds={card.clearSeconds} delaySeconds={card.delaySeconds} />
            )}
            <Dismiss type="button" onClick={onDismiss}>
              Dismiss
            </Dismiss>
          </Board>
          <Lens>
            <Ring delaySeconds={card.delaySeconds} />
          </Lens>
        </Card>
      ))}
    </Stack>
  );
};

export default AnimateInOut("isOpen", RollNotification);
