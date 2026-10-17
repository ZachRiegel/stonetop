// The roll notification: a glass scoreboard that blooms out of the die button once a roll
// has settled, naming the thrower, their dice, and the totals as the dice's own marks. It
// lies half over the die button, which shows an X meanwhile (rollMenu/RollMenu.tsx) that
// closes it, the bloom playing backwards, and clears this screen's table. A roll while one
// is up blooms in over it, and the older card goes once the new one has bloomed. Chosen
// from the drafts in src/holding/rollNotification.html (the glass row, laid down).
import { css, keyframes } from "@emotion/react";
import styled from "@emotion/styled";
import AnimateInOut from "hoc/AnimateInOut.tsx";
import RollReadout, { type Readout } from "pages/dice/RollReadout.tsx";
import { useState } from "react";

// a roll to announce
export type Announced = Readout & {
  id: string;
  // seconds until the dice have settled, when the card blooms
  delaySeconds: number;
};

// the die button sits half over the card's right edge; the card is one width whatever the
// name (the readout cuts it), and its contents stop a side padding short of the button
const BUTTON = 48;
const WIDTH = 396;
const PADDING = 12;
const RADIUS = 16;
// the bloom's timing, and the circle it starts from: a little inside the button, since the
// card starts scaled up by LIFT and would otherwise show past the button's edge
const BLOOM_MS = 250;
const LIFT = 1.06;
const SEED = BUTTON / 2 - 3;

// Laid down: the card is revealed by a circle growing from the button while it settles
// onto the table from a little above it, and closes by the same bloom played backwards.
// --origin is the button's centre and --reach the distance from it to the far corner. Each
// way is its own keyframes: a change of direction alone would not restart the animation.
const seeded = css`
  clip-path: circle(${SEED}px at var(--origin));
  scale: ${LIFT};
  filter: drop-shadow(0 16px 20px rgb(0 0 0 / 0.45));
`;
const spread = css`
  clip-path: circle(var(--reach) at var(--origin));
  scale: 1;
  filter: drop-shadow(0 0 0 rgb(0 0 0 / 0));
`;
const bloom = keyframes`
  from {
    ${seeded}
  }
  to {
    ${spread}
  }
`;
const unbloom = keyframes`
  from {
    ${spread}
  }
  to {
    ${seeded}
  }
`;
// a cream ring riding the bloom's edge, drawn inside the clipped card so its inner half
// shows: the edge of the card coming in, crossing the card it covers, or going
const ringSeeded = css`
  width: ${2 * SEED}px;
  height: ${2 * SEED}px;
`;
const ringSpread = css`
  width: calc(2 * var(--reach));
  height: calc(2 * var(--reach));
`;
const ripple = keyframes`
  from {
    ${ringSeeded}
  }
  to {
    ${ringSpread}
  }
`;
const unripple = keyframes`
  from {
    ${ringSpread}
  }
  to {
    ${ringSeeded}
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

// the cards, over one another, the newest on top, under the die button
const Stack = styled.div`
  grid-area: 3 / 1;
  justify-self: end;
  align-self: end;
  /* the middle of a card's right edge on the die button's centre, 113px from the page's
     bottom and right edges (DiceRoller.tsx: an 89px margin on its 48px cell) */
  margin: 0 113px 113px 0;
  translate: 0 50%;
  display: grid;

  & > * {
    grid-area: 1 / 1;
  }
`;

// blooms when it mounts, once the dice have settled; unblooms when leaving; and once
// `covered` (the seconds until the next card blooms over it), has that bloom cut out of it.
// Under reduced motion the dice jump to rest, so it fades at once.
const Card = styled.div<{ leaving: boolean; delaySeconds: number; covered?: number }>`
  position: relative;
  width: ${WIDTH}px;
  --origin: 100% 50%;
  transform-origin: var(--origin);
  animation: ${({ leaving }) => (leaving ? unbloom : bloom)} ${BLOOM_MS}ms
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

const Ring = styled.div<{ leaving: boolean; delaySeconds: number }>`
  position: absolute;
  left: 100%;
  top: 50%;
  translate: -50% -50%;
  border: 4px solid var(--cream);
  border-radius: 999px;
  pointer-events: none;
  animation: ${({ leaving }) => (leaving ? unripple : ripple)} ${BLOOM_MS}ms
    ${({ leaving }) => (leaving ? "ease-in" : "ease-out")}
    ${({ leaving, delaySeconds }) => (leaving ? 0 : delaySeconds)}s both;

  @media (prefers-reduced-motion: reduce) {
    display: none;
  }
`;

// glass over the table, outlined in cream; the readout's time keeps to the corner, past the
// padding kept clear for the button, since it sits below the button
const Board = styled.div`
  --time-shift: ${-(BUTTON / 2 + PADDING - 14)}px;
  padding: 8px ${BUTTON / 2 + PADDING}px 8px ${PADDING}px;
  border-radius: ${RADIUS}px;
  border: 2px solid var(--cream);
  background: rgb(0 0 0 / 0.55);
  backdrop-filter: blur(6px);
  box-shadow: var(--shadow-medium);
`;

const RollNotification = ({
  className,
  isOpen,
  roll,
  dismissed,
  onArrive,
}: {
  className?: string;
  isOpen: boolean;
  roll?: Announced;
  // a roll whose card is to wilt on its own, a newer roll being on its way
  dismissed?: string;
  // a roll's card has begun to bloom, the dice having settled
  onArrive?: (id: string) => void;
}) => {
  // the cards up, oldest first: a new roll is laid over the last, which goes once the new
  // one has bloomed. State, so the cards outlive the roll while they wilt (AnimateInOut
  // keeps this mounted until then).
  const [cards, setCards] = useState<Announced[]>([]);
  if (roll && cards.at(-1)?.id !== roll.id) setCards([...cards.slice(-1), roll]);
  return (
    <Stack className={className} aria-live="polite">
      {cards.map((card, i) => (
        <Card
          key={card.id}
          leaving={!isOpen || card.id === dismissed}
          delaySeconds={card.delaySeconds}
          covered={i < cards.length - 1 ? cards[cards.length - 1]?.delaySeconds : undefined}
          // the bloom's reach: from the button's centre to the far top-left corner, and a
          // little past
          ref={(element) =>
            element?.style.setProperty(
              "--reach",
              `${Math.hypot(element.offsetWidth, element.offsetHeight / 2) + 8}px`,
            )
          }
          // the card's own bloom, by name: the ring's and the cover's bubble up too
          onAnimationStart={(event) => {
            if (event.animationName === bloom.name) onArrive?.(card.id);
          }}
          onAnimationEnd={(event) => {
            // the newest has bloomed: the cards under it go; a dismissed one has closed
            if (event.animationName === bloom.name && i === cards.length - 1) setCards([card]);
            if (event.animationName === unbloom.name && card.id === dismissed)
              setCards((shown) => shown.filter((other) => other !== card));
          }}
        >
          <Board>
            <RollReadout {...card} />
          </Board>
          <Lens>
            <Ring leaving={!isOpen || card.id === dismissed} delaySeconds={card.delaySeconds} />
          </Lens>
        </Card>
      ))}
    </Stack>
  );
};

export default AnimateInOut("isOpen", RollNotification);
