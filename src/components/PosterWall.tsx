// A wall of three posters, the first the main one, with a woodcut faded in behind them: the
// home page and a campaign's overview are both this (src/holding/pageMocks.html).
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

// the bento: the main poster tall at the left of two on a desktop, wide above two on a phone
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

// `children` are the three posters (components/Poster.tsx), the main one first
const PosterWall = ({ hero, children }: { hero: string; children: ReactNode }) => (
  <Wall>
    <Posters>{children}</Posters>
    <Hero src={hero} alt="" />
  </Wall>
);

export default PosterWall;
