import { css } from "@emotion/react";
import styled from "@emotion/styled";
import Font from "components/Font.tsx";
import NavigationIcon from "components/NavigationIcon.tsx";
import AccountMenu from "navigation/AccountMenu.tsx";
import type { Navigation } from "navigation/NavigationContext.tsx";
import PanelTop from "navigation/PanelTop.tsx";
import { type ComponentProps, useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router";

export const ROW_HEIGHT = 48;
const PANEL_WIDTH = "min(320px, 85%)";

// a shade below the page, with the sidebar's 2px rule between them; the open panel and the
// scrim cover it
const Row = styled.header`
  height: ${ROW_HEIGHT}px;
  padding: 0 8px;
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  align-items: center;
  column-gap: 4px;
  background-color: var(--neutral-75);
  border-bottom: 2px solid var(--neutral-200);
`;

const MenuButton = styled.button`
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  padding: 0;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--neutral-600);
  cursor: pointer;

  &:hover {
    background: var(--neutral-150);
    color: var(--neutral-800);
  }
  &:focus-visible {
    outline: 2px solid var(--neutral-700);
    outline-offset: -2px;
  }
`;

const clip = css`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;
const Title = styled(Font.Bold20)(clip);

const Scrim = styled.div<{ open: boolean }>`
  position: absolute;
  inset: 0;
  z-index: 1;
  background: rgb(0 0 0 / 0.55);
  opacity: ${({ open }) => (open ? 1 : 0)};
  visibility: ${({ open }) => (open ? "visible" : "hidden")};
  transition:
    opacity ${({ open }) => (open ? 320 : 220)}ms ease-out,
    visibility 0s linear ${({ open }) => (open ? 0 : 220)}ms;
`;

// the panel's and its rows' way in: a long tail, so they arrive without a bump
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

// the screen's full height, over the row; slides in and out, kept in view until the close's
// slide is over so it has something to animate
const Panel = styled.nav<{ open: boolean }>`
  position: absolute;
  inset: 0 auto 0 0;
  z-index: 2;
  width: ${PANEL_WIDTH};
  display: grid;
  grid-template-rows: 1fr auto;
  background-color: var(--neutral-75);
  border-right: 2px solid var(--neutral-200);
  box-shadow: var(--shadow-large);
  translate: ${({ open }) => (open ? 0 : "-100%")} 0;
  visibility: ${({ open }) => (open ? "visible" : "hidden")};
  transition:
    translate ${({ open }) => (open ? `320ms ${EASE}` : "220ms ease-in")},
    visibility 0s linear ${({ open }) => (open ? 0 : 220)}ms;
`;

// the panel's rows come in one after another from the left, 70ms apart, as the panel's own
// slide tails off; on close they fade together as it leaves
const enter = (open: boolean, i: number) => css`
  translate: ${open ? 0 : -16}px 0;
  opacity: ${open ? 1 : 0};
  transition:
    translate ${open ? `360ms ${EASE} ${140 + i * 70}ms` : "220ms ease-in"},
    opacity ${open ? `280ms ease-out ${140 + i * 70}ms` : "160ms ease-in"};
`;

const PanelBody = styled.div`
  display: grid;
  align-content: start;
  gap: 8px;
  padding: 12px;
`;

// a little more air above and below the words than the sidebar gives them, since the panel
// starts at the screen's very top (user: cramped without it)
const Top = styled.div`
  display: grid;
  gap: 12px;
  padding-top: 12px;
`;

const Rule = styled.div`
  height: 2px;
  background-color: var(--neutral-200);
`;

const Sections = styled.div`
  display: grid;
  grid-auto-rows: min-content;
  align-content: start;
  gap: 4px;
`;

// the sidebar's rows in neutrals: flat, the open one a shade up, a shade further under the
// pointer
const Section = styled(Link)`
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 12px;
  align-items: center;
  padding: 8px 12px;
  border-radius: 12px;
  color: var(--neutral-700);
  text-decoration: none;

  &[aria-current="page"] {
    background-color: var(--neutral-100);
    color: var(--neutral-800);
  }
  &:hover {
    background-color: var(--neutral-150);
    color: var(--neutral-800);
  }
  &:focus-visible {
    outline: 2px solid var(--neutral-700);
    outline-offset: -2px;
  }
`;

// the account at the foot, as the sidebar has it
const Foot = styled.div`
  padding: 0 12px 12px;
`;

// The sidebar's stand-in on a phone or tablet: a row across the top with a menu button and
// the campaign's name, and a side panel the button slides in over it. Inside a campaign the
// panel's top says "Campaign" with the way home at the line's end and the campaign's name
// beneath; on the base pages it is the standing stone and the app's name. Then the sections,
// and the account at the foot as the sidebar has it. The panel has no close of its own: a
// tap off it, Escape or picking a section closes it (README.md here).
const MobileNavigation = ({
  navigation,
  user,
}: {
  navigation?: Navigation;
  user?: ComponentProps<typeof AccountMenu>["user"];
}) => {
  const [open, setOpen] = useState(false);
  const show = useCallback(() => setOpen(true), []);
  const hide = useCallback(() => setOpen(false), []);
  // a section picked, or any other move: the panel goes with the page it was over
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const campaign = navigation?.campaign;
  const title = campaign?.name ?? "Stonetop";
  return (
    <>
      <Row>
        <MenuButton aria-label="Menu" aria-expanded={open} title="Menu" onClick={show}>
          {/* a material "menu": three bars 18 wide and 2 thick at 7, 12 and 17 of 24 */}
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path d="M3 7h18" />
            <path d="M3 12h18" />
            <path d="M3 17h18" />
          </svg>
        </MenuButton>
        <Title element="div" text={title} />
      </Row>
      <Scrim open={open} onClick={hide} />
      <Panel open={open} aria-hidden={!open}>
        <PanelBody>
          <Top css={enter(open, 0)}>
            <PanelTop campaign={campaign} onPick={hide} />
            <Rule />
          </Top>
          <Sections>
            {navigation?.sections.map(({ to, text, glyph, active }, i) => (
              <Section
                key={to}
                to={to}
                aria-current={active ? "page" : undefined}
                onClick={hide}
                css={enter(open, i + 1)}
              >
                <NavigationIcon {...glyph} inverted={active} />
                <Font.Bold20 element="div" text={text} />
              </Section>
            ))}
          </Sections>
        </PanelBody>
        {/* in the stagger's sixth place, as though five sections came before it, so it
            lands a beat after the last of them */}
        {user && (
          <Foot css={enter(open, 6)}>
            <AccountMenu user={user} variant="panel" />
          </Foot>
        )}
      </Panel>
    </>
  );
};

export default MobileNavigation;
