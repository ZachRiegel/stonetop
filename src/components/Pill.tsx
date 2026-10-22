// A pill in the title face's caps, for the action or two a page keeps at its bottom right:
// cream, the one light thing on the page, for the main one (Campaigns' New campaign, the
// Players' invite link), and grey, like a tab that is not open, for a lesser one beside it.
// Sized in ems so it scales with its type, 13px at 1280 wide and gently up with the screen
// on a desktop (user, 2026-10-19: 24px on a wide screen was too large). The page places it.
import styled from "@emotion/styled";
import { TITLE_CAPS } from "components/Font.tsx";
import { MEDIA } from "hooks/useResponsiveSize.ts";

const Base = styled.button`
  ${TITLE_CAPS}
  display: grid;
  grid-auto-flow: column;
  align-items: center;
  column-gap: 0.4em;
  padding: 0.7em 1.5em;
  border: none;
  border-radius: 999px;
  background: transparent;
  font-size: 13px;
  line-height: 1.2;
  letter-spacing: 0.06em;
  white-space: nowrap;
  cursor: pointer;
  --icon-size: 1.7em;
  transition:
    background 120ms linear,
    color 120ms linear;

  &:disabled {
    cursor: default;
    opacity: 0.6;
  }
  &:focus-visible {
    outline: 2px solid var(--neutral-700);
    outline-offset: 2px;
  }

  @media ${MEDIA.desktop} {
    font-size: clamp(13px, 0.75vw, 18px);
  }
`;

const Pill = {
  Cream: styled(Base)`
    background: var(--cream);
    color: var(--neutral-0);
    box-shadow: var(--shadow-medium);

    &:hover:not(:disabled) {
      background: var(--white);
    }
  `,
  Grey: styled(Base)`
    color: var(--neutral-500);

    &:hover:not(:disabled) {
      color: var(--neutral-800);
    }
  `,
};

export default Pill;
