// A row of pages across the top of the screen, as tabs, the open one marked by a rounded
// pill in its paper. The strip (navigation/Strip.tsx) draws its sections with it.
import styled from "@emotion/styled";
import { TITLE_CAPS } from "components/Font.tsx";
import NavigationIcon, { type Glyph } from "components/NavigationIcon.tsx";
import { type Paper, PAPERS } from "components/Poster.tsx";
import { NavLink } from "react-router";

export type Tab = {
  // absolute: the strip is rendered above the layout that describes it
  to: string;
  text: string;
  glyph: Glyph;
  // the paper of the page's card on the wall it is reached from; the open tab's pill takes
  // it, cream without one
  paper?: Paper;
};

const Row = styled.nav<{ compact: boolean }>`
  display: grid;
  grid-auto-flow: column;
  justify-content: start;
  align-items: center;
  gap: ${({ compact }) => (compact ? 6 : 10)}px;
`;

// grey caps, the open one a rounded pill in its paper with cream type (black on the cream
// pill of a tab with no paper; orange took black ink until the user asked for cream,
// 2026-10-21). A tilted stamp came before; the user asked for the pill, 2026-10-19. Compact,
// each is a glyph cell and only the open one spreads into its pill with its name, so the row
// fits a phone. The router marks the open one with aria-current (NavLink, matched exactly:
// Home and Overview are prefixes of their siblings).
const Pill = styled(NavLink, {
  shouldForwardProp: (prop) => prop !== "paper" && prop !== "compact",
})<{ paper?: Paper; compact: boolean }>`
  ${({ paper }) => paper && PAPERS[paper]}
  ${TITLE_CAPS}
  display: grid;
  grid-auto-flow: column;
  align-items: center;
  gap: 8px;
  letter-spacing: 0.06em;
  white-space: nowrap;
  border-radius: 999px;
  color: var(--neutral-500);
  text-decoration: none;
  transition: color 120ms linear;
  ${({ compact }) =>
    compact
      ? `font-size: 13px; height: 38px; padding: 0 9px; --icon-size: 22px;`
      : `font-size: 15px; padding: 5px 14px;`}

  &:hover {
    color: var(--neutral-800);
  }
  &:focus-visible {
    outline: 2px solid var(--neutral-700);
    outline-offset: 2px;
  }
  &[aria-current="page"] {
    background: var(--paper, var(--cream));
    color: ${({ paper }) => (paper ? "var(--cream)" : "var(--neutral-0)")};
    box-shadow: var(--shadow-small);
    ${({ compact }) => compact && "padding: 0 16px 0 12px;"}
  }
  ${({ compact }) =>
    compact &&
    `
    &:not([aria-current="page"]) > span {
      display: none;
    }
  `}
`;

// Full size the tabs are their names; `compact` they are glyph cells with only the open one
// labelled (navigation/README.md).
const TabRow = ({
  tabs,
  compact = false,
  className,
}: {
  tabs: Tab[];
  compact?: boolean;
  className?: string;
}) => (
  <Row compact={compact} className={className}>
    {tabs.map(({ to, text, glyph, paper }) => (
      <Pill key={to} to={to} end paper={paper} compact={compact} aria-label={text}>
        {compact && <NavigationIcon {...glyph} size={22} />}
        <span>{text}</span>
      </Pill>
    ))}
  </Row>
);

export default TabRow;
