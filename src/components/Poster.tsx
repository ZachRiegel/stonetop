// A screenprinted poster card: a link on a flat paper with a woodcut masked into it in a
// darker ink. The home wall, a campaign's overview and the campaign cards are all posters.
import { css, keyframes, type SerializedStyles } from "@emotion/react";
import styled from "@emotion/styled";
import { EYEBROW, FontCSS, TITLE } from "components/Font.tsx";
import { Link } from "react-router";

// The poster papers: each a palette hue (RootLayout.tsx) brought down to paper with relative
// colour syntax, so the hue stays the palette's own, and its ink the same hue darker still.
// --stamp-ink is the type colour a tab's pill takes on that paper (components/TabRow.tsx).
// Purple is the magenta's hue; the campaign cards take these papers too, each by its id
// (navigation/README.md has the papers drafted and dropped).
export type Paper = "blue" | "orange" | "purple" | "green";
export const PAPERS: Record<Paper, SerializedStyles> = {
  blue: css`
    --paper: oklch(from var(--cyan-500) 0.46 0.08 h);
    --ink: oklch(from var(--cyan-500) 0.24 0.05 h);
    --stamp-ink: var(--cream);
  `,
  orange: css`
    --paper: oklch(from var(--orange-500) 0.6 0.15 h);
    --ink: oklch(from var(--orange-500) 0.32 0.1 h);
    --stamp-ink: var(--neutral-0);
  `,
  purple: css`
    --paper: oklch(from var(--magenta-500) 0.46 0.11 h);
    --ink: oklch(from var(--magenta-500) 0.25 0.08 h);
    --stamp-ink: var(--cream);
  `,
  green: css`
    --paper: oklch(from var(--green-500) 0.46 0.1 h);
    --ink: oklch(from var(--green-500) 0.25 0.07 h);
    --stamp-ink: var(--cream);
  `,
};

// the suggested poster's light: its rim goes to cream and a soft cream light bleeds in from
// the edge, on a slow beat (user, 2026-10-21: "cream rim lit inward", the clearest of the
// drafts in src/holding/posterAttention.html and posterRims.html). Still under reduced
// motion: the rim in cream with the light at half.
const rim = keyframes`
  from,
  to {
    border-color: var(--paper);
  }
  50% {
    border-color: rgb(from var(--cream) r g b / 0.9);
  }
`;
const bleed = keyframes`
  from,
  to {
    box-shadow: inset 0 0 0 0 transparent;
  }
  50% {
    box-shadow: inset 0 0 14px 0 rgb(from var(--cream) r g b / 0.4);
  }
`;

// a flat paper with a hard black offset shadow, lifting a touch under the pointer, rimmed by
// 2px of its own paper: the art and the shade stop at the padding edge, so the rim reads as
// a light line strongest along the shaded foot (the user's favourite part of the cards,
// 2026-10-20; do not take it for an idle border). A wall may set its posters' shadow (--lift,
// --lift-hover) and sizes them through --poster-padding, --poster-radius, --poster-title and
// --poster-caption.
const Sheet = styled(Link, {
  shouldForwardProp: (prop) => prop !== "paper" && prop !== "suggested",
})<{ paper: Paper; suggested: boolean }>`
  ${({ paper }) => PAPERS[paper]}
  position: relative;
  display: grid;
  align-content: end;
  overflow: hidden;
  padding: var(--poster-padding, 16px);
  border: 2px solid var(--paper);
  border-radius: var(--poster-radius, 12px);
  background: var(--paper);
  color: var(--cream);
  text-decoration: none;
  isolation: isolate;
  box-shadow: var(--lift, 4px 4px 0 var(--neutral-0));
  cursor: pointer;
  transition:
    translate 160ms ease-out,
    box-shadow 160ms ease-out;

  &:hover {
    translate: -2px -2px;
    box-shadow: var(--lift-hover, 6px 6px 0 var(--neutral-0));
  }
  &:focus-visible {
    outline: 3px solid var(--cream);
    outline-offset: 3px;
  }
  /* the light bleeding in from the rim is a layer of its own, over the art and the shade and
     under the words: on the sheet itself the inset shadow would animate the lift's shadow
     away with it */
  ${({ suggested }) =>
    suggested &&
    css`
      animation: ${rim} 2.8s ease-in-out infinite;

      &::after {
        content: "";
        position: absolute;
        inset: 0;
        z-index: -1;
        pointer-events: none;
        animation: ${bleed} 2.8s ease-in-out infinite;
      }

      @media (prefers-reduced-motion: reduce) {
        animation: none;
        border-color: rgb(from var(--cream) r g b / 0.7);

        &::after {
          animation: none;
          box-shadow: inset 0 0 14px 0 rgb(from var(--cream) r g b / 0.25);
        }
      }
    `}
`;

// the woodcut (a white-on-black PNG) screenprinted into the paper in its ink: the whole
// sheet for a picture, a mark set at the top right for an icon
const Art = styled.div<{ fit: "cover" | "icon"; art: string }>`
  position: absolute;
  inset: 0;
  z-index: -1;
  background-color: var(--ink);
  opacity: 0.9;
  mask-image: url("${({ art }) => art}");
  mask-mode: luminance;
  mask-repeat: no-repeat;
  mask-size: ${({ fit }) => (fit === "icon" ? "62%" : "cover")};
  mask-position: ${({ fit }) => (fit === "icon" ? "90% 28%" : "center")};
`;

// darkens the foot of the sheet so the words read over the art
const Shade = styled.div`
  position: absolute;
  inset: auto 0 0 0;
  height: 70%;
  z-index: -1;
  background: linear-gradient(transparent, rgb(0 0 0 / 0.6));
`;

const Words = styled.div`
  display: grid;
  gap: 3px;
`;

const Eyebrow = styled.div`
  ${EYEBROW}
  font-size: 11px;
  opacity: 0.85;
`;

const Title = styled.h3`
  ${TITLE}
  font-size: var(--poster-title, 24px);
  line-height: 0.95;
  text-shadow: 2px 2px 0 rgb(0 0 0 / 0.45);
  text-wrap: balance;
`;

// a caption may open with a name as its owner typed it (the table's "… rolled"), which
// reads with a capital first letter (user, 2026-10-21)
const Caption = styled.p`
  ${FontCSS.Italic14}
  font-size: var(--poster-caption, 13px);
  color: rgb(from var(--cream) r g b / 0.8);

  &::first-letter {
    text-transform: uppercase;
  }
`;

// the people on it in a row, each a whole circle ringed in black so it reads off the art (an
// overlap cut every face but the last to a crescent; the user wants them round, 2026-10-20)
const Stack = styled.div`
  display: grid;
  grid-auto-flow: column;
  justify-content: start;
  column-gap: 4px;
  margin-top: 6px;
`;

const Face = styled.img`
  width: 26px;
  height: 26px;
  border: 2px solid rgb(0 0 0 / 0.6);
  border-radius: 999px;
  object-fit: cover;
`;

// A poster on one of the papers: its title in caps along the foot over a caption, an eyebrow
// above when given, and the people on it, if any, as a stack of faces. `suggested` marks a
// poster a wall promotes beyond its default order as the next thing to do (user, 2026-10-21:
// a wall's usual lead is not lit): its rim lights up in cream.
const Poster = ({
  to,
  paper,
  suggested = false,
  art,
  fit = "cover",
  eyebrow,
  title,
  caption,
  people,
  className,
}: {
  to: string;
  paper: Paper;
  suggested?: boolean;
  // a white-on-black PNG
  art: string;
  fit?: "cover" | "icon";
  eyebrow?: string;
  title: string;
  caption: string;
  people?: { key: string; src: string; alt: string }[];
  className?: string;
}) => (
  <Sheet to={to} paper={paper} suggested={suggested} className={className}>
    <Art fit={fit} art={art} />
    <Shade />
    <Words>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <Title>{title}</Title>
      <Caption>{caption}</Caption>
      {people?.length ? (
        <Stack>
          {people.map(({ key, src, alt }) => (
            <Face key={key} src={src} alt={alt} />
          ))}
        </Stack>
      ) : null}
    </Words>
  </Sheet>
);

export default Poster;
