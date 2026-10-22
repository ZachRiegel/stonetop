// A wall of posters with a woodcut faded in behind them. Two arrangements: the home page's
// bento of three, the first the main one (src/holding/pageMocks.html), and a campaign
// overview's staggered four, so the two pages read apart (user, 2026-10-21: "H · Staggered"
// of eight drafts in src/holding/posterLayout.html).
import { css } from "@emotion/react";
import styled from "@emotion/styled";
import { MEDIA } from "hooks/useResponsiveSize.ts";
import type { ReactNode } from "react";

// The ground the hero blends onto (GROUND): a page that draws a Hero must paint this colour
// itself and isolate, so the screen blend meets an opaque ground inside its own group. Blended
// or masked against the page's backdrop instead, Chrome here drew the woodcut's black as a
// black rectangle fading in at the hero's edge (seen 2026-10-19; luminance masks and an SVG
// filter did the same).
export const GROUND = css`
  background-color: var(--neutral-50);
  isolation: isolate;
`;

const Wall = styled.div`
  ${GROUND}
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
`;

// a woodcut (white on black) screened onto the ground and faded into it: the right of the
// page on a desktop, behind the posters' top on a phone
const Hero = styled.img`
  position: absolute;
  z-index: 0;
  pointer-events: none;
  object-fit: cover;
  mix-blend-mode: screen;
  top: -40px;
  left: -80px;
  width: 640px;
  height: 300px;
  opacity: 0.25;
  mask-image: linear-gradient(#000, transparent);

  @media ${MEDIA.desktop} {
    inset: auto -30px 30px auto;
    width: 60%;
    height: 88%;
    opacity: 0.55;
    object-position: right center;
    mask-image:
      linear-gradient(90deg, transparent, #000 40%), linear-gradient(#000 75%, transparent);
    mask-composite: intersect;
  }
`;

// the home bento: the main poster tall at the left of two on a desktop, wide above two on a phone
const Posters = styled.div`
  position: relative;
  z-index: 1;
  display: grid;
  height: 100%;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: minmax(0, 1.7fr) minmax(0, 1fr);
  gap: 12px;
  /* the top keeps clear of the wall's clipping edge by the hover's 2px lift and the focus
     ring's 6px reach */
  padding: 6px 16px 14px;

  & > :first-of-type {
    grid-column: 1 / 3;
    --poster-title: 34px;
  }
  & > :not(:first-of-type) {
    --poster-padding: 12px;
    --poster-title: 15px;
  }

  /* the left half of the page, the main poster taking the wider column (user, 2026-10-19:
     the wall should read as about half the screen at any width) */
  @media ${MEDIA.desktop} {
    position: absolute;
    top: 6px;
    left: 36px;
    width: calc(50% - 36px);
    height: calc(100% - 74px);
    grid-template-columns: 1.3fr 1fr;
    grid-template-rows: 1fr 1fr;
    gap: 14px;
    padding: 0;

    /* titles 32px and 24px at 1280 wide, scaling with the posters */
    & > :first-of-type {
      grid-column: auto;
      grid-row: 1 / 3;
      --poster-title: clamp(24px, 2.5vw, 36px);
    }
    & > :not(:first-of-type) {
      --poster-padding: 16px;
      --poster-title: clamp(16px, 1.9vw, 26px);
    }
  }
`;

// the staggered four: two columns whose seams do not meet, a tall poster over a short one at
// the left and a short over a tall at the right, mirrored across the gap. The posters keep
// their boxes whatever the campaign needs; the lit rim says what wants doing. In the same
// half of a desktop as the bento, and down the whole phone.
const Staggered = styled.div`
  position: relative;
  z-index: 1;
  display: grid;
  height: 100%;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: repeat(5, minmax(0, 1fr));
  gap: 12px;
  padding: 6px 16px 14px;
  --poster-padding: 12px;
  --poster-title: 19px;

  & > :nth-of-type(1) {
    grid-column: 1;
    grid-row: 1 / 4;
    --poster-title: 26px;
  }
  & > :nth-of-type(2) {
    grid-column: 1;
    grid-row: 4 / 6;
  }
  & > :nth-of-type(3) {
    grid-column: 2;
    grid-row: 1 / 3;
  }
  & > :nth-of-type(4) {
    grid-column: 2;
    grid-row: 3 / 6;
    --poster-title: 26px;
  }

  /* titles 28px and 22px at 1280 wide, scaling with the posters */
  @media ${MEDIA.desktop} {
    position: absolute;
    top: 6px;
    left: 36px;
    width: calc(50% - 36px);
    height: calc(100% - 74px);
    gap: 14px;
    padding: 0;
    --poster-padding: 16px;
    --poster-title: clamp(16px, 1.7vw, 24px);

    & > :nth-of-type(1),
    & > :nth-of-type(4) {
      --poster-title: clamp(20px, 2.2vw, 32px);
    }
  }
`;

// `children` are the posters (components/Poster.tsx): three for the bento, the main one
// first, or four for the staggered wall in reading order, tall left, short left, short
// right, tall right
const PosterWall = ({
  hero,
  staggered = false,
  children,
}: {
  hero: string;
  staggered?: boolean;
  children: ReactNode;
}) => (
  <Wall>
    {staggered ? <Staggered>{children}</Staggered> : <Posters>{children}</Posters>}
    <Hero src={hero} alt="" />
  </Wall>
);

export default PosterWall;
