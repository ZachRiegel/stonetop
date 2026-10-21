// A roll's readout: the thrower and their dice on one line, the totals beneath as the dice's
// own marks, and, given a time, that at the end of the row on their baseline. The roll
// notification draws one on its glass card (no time: the card is the roll just made) and the
// roll log one per entry, `condensed`, with the time; each sets the padding and surface. The
// sizes are custom properties set once on the root (the text in the 20px faces at --text),
// so the two versions differ only there.
import { css } from "@emotion/react";
import styled from "@emotion/styled";
import Font, { FontCSS } from "components/Font.tsx";
import { DIE_ICONS } from "components/Icon.tsx";
import {
  countsOf,
  type DieColour,
  type DieSymbol,
  type Face,
  FILL_RULE,
  GLYPH_BOX,
  glyphTransform,
  LABELS,
  pathOf,
  SYMBOL_SCALE,
  SYMBOLS,
} from "pages/dice/dice.ts";
import { Fragment } from "react";

// what a readout says of a roll
export type Readout = {
  author: { displayName: string; picture: string };
  // when the roll was posted, in ms, if it is to be shown
  time?: number;
  dice: readonly DieColour[];
  totals: Face;
};

// the name is cut to this, so a readout is one size whatever its owner typed: about 15
// characters of the bold 20px face, which still leaves the log's narrower line room for the
// counts of two dice colours
const NAME_WIDTH = 160;

// the totals' marks (a plain burst, since no one die is meant): each mark's half extent
// about the glyph box's middle once scaled, so its svg clips to it and the row's gaps are
// true: both hexagons are circumradius 38 (dice.ts), the wrench reaches 38.4 from the middle
const HEXAGON: readonly [number, number] = [38 * Math.cos(Math.PI / 6), 38];
const HALF: Record<DieSymbol, readonly [number, number]> = {
  burst: HEXAGON,
  special: HEXAGON,
  skull: [38.4 * SYMBOL_SCALE.skull, 38.4 * SYMBOL_SCALE.skull],
};
const boxOf = ([halfWidth, halfHeight]: readonly [number, number]) =>
  `${GLYPH_BOX / 2 - halfWidth} ${GLYPH_BOX / 2 - halfHeight} ${2 * halfWidth} ${2 * halfHeight}`;

const Rows = styled.div<{ condensed: boolean }>`
  --text: 20px;
  --line: 32px;
  --avatar: 30px;
  --die: 16px;
  --numeral: 40px;
  --mark: 30px;
  --between: 16px;
  --rows: 6px;
  ${({ condensed }) =>
    condensed &&
    css`
      --text: 19px;
      --line: 28px;
      --avatar: 28px;
      --die: 15px;
      --numeral: 29px;
      --mark: 22px;
      --between: 14px;
      --rows: 2px;
    `}
  display: grid;
  row-gap: var(--rows);
`;

// the picture, then one line of running text
const Head = styled.div`
  display: grid;
  grid-template-columns: max-content 1fr;
  column-gap: 8px;
  align-items: center;
`;

const Avatar = styled.img`
  width: var(--avatar);
  height: var(--avatar);
  border-radius: 999px;
  object-fit: cover;
`;

// the words and counts as inline text
const Line = styled.div`
  line-height: var(--line);
  white-space: nowrap;
`;

// a box of the line's height, so its text sits where the words beside it do; an
// overflow-hidden inline block has no baseline of its own to align by
const Name = styled.span`
  ${FontCSS.Bold20}
  font-size: var(--text);
  display: inline-block;
  vertical-align: top;
  color: var(--cream);
  max-width: ${NAME_WIDTH}px;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Word = styled.span`
  ${FontCSS.Normal20}
  font-size: var(--text);
  color: var(--cream);
`;

// a count with its die (an Icon's div) beside it, the die the height of the digit and its
// bottom a hair below the baseline, so the two read as one mark
const Pip = styled.span`
  --icon-size: var(--die);

  & > div {
    vertical-align: -1px;
    margin-left: 2px;
  }
`;

const Count = styled.span`
  ${FontCSS.Bold20}
  font-size: var(--text);
  color: var(--cream);
`;

// when the roll was made, in a cream dulled towards the page's grey, at the end of the
// totals row on the numerals' baseline
const Time = styled(Font.Normal14)`
  justify-self: end;
  color: color-mix(in srgb, var(--cream) 55%, var(--neutral-500));
`;

// the three totals and the time, aligned by baseline: each total's baseline is its
// numeral's, its mark opting out to sit centred beside it
const Scores = styled.div`
  display: grid;
  grid-template-columns: repeat(${SYMBOLS.length}, max-content) 1fr;
  column-gap: var(--between);
  align-items: baseline;
`;

const Score = styled.div<{ none: boolean }>`
  display: grid;
  grid-auto-flow: column;
  align-items: baseline;
  column-gap: 4px;
  opacity: ${({ none }) => (none ? 0.4 : 1)};
`;

const Numeral = styled.div`
  ${FontCSS.Title40}
  font-size: var(--numeral);
  color: var(--cream);
  line-height: 1;
`;

const Mark = styled.svg`
  align-self: center;
  height: var(--mark);
  width: auto;
  fill: var(--cream);
`;

// a name reads as the start of a sentence whatever its owner typed
const capitalised = (name: string) => name.charAt(0).toUpperCase() + name.slice(1);
const timeOf = new Intl.DateTimeFormat(undefined, { timeStyle: "short" });

const RollReadout = ({
  condensed = false,
  author,
  time,
  dice,
  totals,
}: Readout & { condensed?: boolean }) => (
  <Rows condensed={condensed}>
    <Head>
      <Avatar src={author.picture} alt="" />
      <Line>
        <Name>{capitalised(author.displayName)}</Name> <Word>rolled</Word>
        {countsOf(dice).map(([colour, count]) => {
          const Die = DIE_ICONS[colour];
          return (
            <Fragment key={colour}>
              {" "}
              <Pip role="img" aria-label={`${count} ${colour}`}>
                <Count>{count}</Count>
                <Die />
              </Pip>
            </Fragment>
          );
        })}
      </Line>
    </Head>
    <Scores>
      {SYMBOLS.map((symbol) => (
        <Score key={symbol} none={totals[symbol] === 0}>
          <Numeral>{totals[symbol]}</Numeral>
          <Mark viewBox={boxOf(HALF[symbol])} role="img" aria-label={LABELS[symbol]}>
            <path
              d={pathOf(symbol)}
              fillRule={FILL_RULE[symbol]}
              transform={glyphTransform(
                GLYPH_BOX * SYMBOL_SCALE[symbol],
                GLYPH_BOX / 2,
                GLYPH_BOX / 2,
              )}
            />
          </Mark>
        </Score>
      ))}
      {time !== undefined && <Time element="div" text={timeOf.format(time)} />}
    </Scores>
  </Rows>
);

export default RollReadout;
