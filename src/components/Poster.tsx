// A screenprinted poster card: a link on a flat paper with a woodcut masked into it in a
// darker ink. The home wall, a campaign's overview and the campaign cards are all posters.
import { css, type SerializedStyles } from "@emotion/react";
import styled from "@emotion/styled";
import { TITLE_CAPS } from "components/Font.tsx";
import { Link } from "react-router";

// The poster papers: each a palette hue (RootLayout.tsx) brought down to paper with relative
// colour syntax, so the hue stays the palette's own, and its ink the same hue darker still.
// --stamp-ink is the type colour a tab's pill takes on that paper (components/TabRow.tsx).
// The third paper is the magenta's hue as a purple (a gold from the cream's hue and a green
// were drafted too, src/holding/pageMocks.html). Slate is the campaign cards' paper, colour
// being kept for the home wall: a cut, darker than the ground inside a cream rim and a halo
// of the ground that clears the landscape round it, with no shade over its foot (user,
// 2026-10-19, sample F of eight in src/holding/campaignCards.html; lighter papers and rims
// did not break off the art).
export type Paper = "blue" | "orange" | "purple" | "slate";
export const PAPERS: Record<Paper, SerializedStyles> = {
  blue: css`
    --paper: oklch(from var(--cyan-500) 0.46 0.08 h);
    --ink: oklch(from var(--cyan-500) 0.24 0.05 h);
    --ink-opacity: 0.9;
    --stamp-ink: var(--cream);
  `,
  orange: css`
    --paper: oklch(from var(--orange-500) 0.6 0.15 h);
    --ink: oklch(from var(--orange-500) 0.32 0.1 h);
    --ink-opacity: 0.9;
    --stamp-ink: var(--neutral-0);
  `,
  purple: css`
    --paper: oklch(from var(--magenta-500) 0.46 0.11 h);
    --ink: oklch(from var(--magenta-500) 0.25 0.08 h);
    --ink-opacity: 0.9;
    --stamp-ink: var(--cream);
  `,
  slate: css`
    --paper: var(--neutral-25);
    --ink: var(--neutral-200);
    --ink-opacity: 1;
    --stamp-ink: var(--neutral-0);
    --rim: rgb(243 231 211 / 0.35);
    --rim-width: 2.5px;
    --lift: 0 0 0 10px var(--neutral-50);
    --lift-hover: var(--lift);
    --shade: transparent;
  `,
};

// a flat paper with a hard black offset shadow, lifting a touch under the pointer; a paper
// may rim it (--rim, --rim-width), set its own shadow (--lift, --lift-hover) and its shade
// (--shade). A wall sizes its posters' padding, corners and titles through --poster-padding,
// --poster-radius and --poster-title.
const Sheet = styled(Link, { shouldForwardProp: (prop) => prop !== "paper" })<{ paper: Paper }>`
  ${({ paper }) => PAPERS[paper]}
  position: relative;
  display: grid;
  align-content: end;
  overflow: hidden;
  padding: var(--poster-padding, 16px);
  border: var(--rim-width, 2px) solid var(--rim, transparent);
  border-radius: var(--poster-radius, 6px);
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
`;

// the woodcut (a white-on-black PNG) screenprinted into the paper in its ink: the whole
// sheet for a picture, a mark set at the top right for an icon
const Art = styled.div<{ fit: "cover" | "icon"; art: string }>`
  position: absolute;
  inset: 0;
  z-index: -1;
  background-color: var(--ink);
  opacity: var(--ink-opacity);
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
  background: linear-gradient(transparent, var(--shade, rgb(0 0 0 / 0.6)));
`;

const Words = styled.div`
  display: grid;
  gap: 3px;
`;

const Eyebrow = styled.div`
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.85;
`;

const Title = styled.h3`
  ${TITLE_CAPS}
  font-size: var(--poster-title, 24px);
  line-height: 0.95;
  text-shadow: 2px 2px 0 rgb(0 0 0 / 0.45);
  text-wrap: balance;
`;

const Caption = styled.p`
  font-size: 13px;
  font-style: italic;
  color: rgb(243 231 211 / 0.8);
`;

// the people on it, overlapping, each ringed in black so they read apart
const Stack = styled.div`
  display: grid;
  grid-auto-flow: column;
  justify-content: start;
  margin-top: 6px;
`;

const Face = styled.img`
  width: 26px;
  height: 26px;
  margin-right: -8px;
  border: 2px solid rgb(0 0 0 / 0.6);
  border-radius: 999px;
  object-fit: cover;
`;

// A poster on one of the papers: its title in caps along the foot over a caption, an eyebrow
// above when given, and the people on it, if any, as a stack of faces.
const Poster = ({
  to,
  paper,
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
  // a white-on-black PNG
  art: string;
  fit?: "cover" | "icon";
  eyebrow?: string;
  title: string;
  caption: string;
  people?: { key: string; src: string; alt: string }[];
  className?: string;
}) => (
  <Sheet to={to} paper={paper} className={className}>
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
