import styled from "@emotion/styled";
import Font from "components/Font.tsx";
import NavigationIcon from "components/NavigationIcon.tsx";
import NavigationItem from "components/NavigationItem.tsx";
import AccountMenu from "navigation/AccountMenu.tsx";
import type { Navigation } from "navigation/NavigationContext.tsx";
import PanelTop from "navigation/PanelTop.tsx";
import type { ComponentProps } from "react";
import { ALLOW_CHILD_SELECTORS } from "utils/emotion.ts";

const NavContainer = styled.div`
  width: 100%;
  overflow: visible;
  isolation: isolate;
  z-index: 2;
  height: 100%;
`;

// the phone panel's shades: a shade below the page, with its 2px rule as the edge
const Nav = styled.nav`
  position: relative;
  overflow: clip;
  height: 100%;
  width: 66px;
  transition: width 300ms linear;
  background-color: var(--neutral-75);
  container-type: normal;
  container-name: navigation;
  --expanded-width: 320px;
  --open: false;

  &:focus-within {
    width: var(--expanded-width);
    --open: true;
  }

  &:hover {
    --custom-transition-delay: 750ms;
    transition-delay: var(--custom-transition-delay);
    width: var(--expanded-width);
    --open: true;
  }

  /* modal dialogs make the rest of the page inert, dropping :hover/:focus-within */
  &:has(dialog[open]) {
    width: var(--expanded-width);
    --open: true;
  }

  display: grid;
  grid-template-rows: max-content 1fr auto;
  gap: 8px;
  --navigation-horizontal-padding: 12px;
  /* no padding above: the top sets its own, so that folded it is a 66px square */
  padding: 0 var(--navigation-horizontal-padding) 12px;
  border-right: 2px solid var(--neutral-200);
`;

// The top of the sidebar: the panel's top (PanelTop.tsx) laid out as the rows are, so its
// mark sits over the rows' icons and stays as the rail folds while its words fade, and
// under it the panel's rule, which spans the whole rail when folded and the rows' width
// when open. The top is a square: 13px, the 40px mark, 13px, then the rule, 66px in all,
// the rail's width, and the words beside the mark are set to the same 40px (PanelTop.tsx),
// so the rail folds and opens in one direction only.
const Top = styled.div`
  display: grid;
  gap: 13px;
  padding-top: 13px;
  min-width: calc(var(--expanded-width) - 2 * var(--navigation-horizontal-padding));
  translate: calc(-1 * var(--navigation-horizontal-padding)) 0;
  transition: translate 300ms linear;
  transition-delay: var(--custom-transition-delay);

  ${ALLOW_CHILD_SELECTORS} & > :first-child > :not(:first-child) {
    opacity: 0;
    transition: opacity 300ms linear;
    transition-delay: var(--custom-transition-delay);
  }

  @container navigation style(--open: true) {
    translate: 0 0;

    ${ALLOW_CHILD_SELECTORS} & > :first-child > :not(:first-child) {
      opacity: 1;
    }
  }
`;

const Rule = styled.div`
  height: 2px;
  background-color: var(--neutral-200);
  /* out to the rail's edges, over the padding the top is pulled into */
  margin: 0 calc(-1 * var(--navigation-horizontal-padding)) 0 0;
  transition: margin 300ms linear;
  transition-delay: var(--custom-transition-delay);

  @container navigation style(--open: true) {
    margin: 0;
  }
`;

const NavItems = styled.div`
  display: grid;
  grid-auto-rows: min-content;
  align-content: start;
  gap: 4px;
`;

// The desktop's sidebar: the phone panel's layout and shades (navigation/README.md) folded
// to a 66px rail of icons that opens to 320px under the pointer or focus. Its top is the
// panel's, then the sections, then the account at the foot.
const Sidebar = ({
  navigation,
  user,
}: {
  navigation?: Navigation;
  user?: ComponentProps<typeof AccountMenu>["user"];
}) => (
  <NavContainer>
    <Nav>
      <Top>
        <PanelTop campaign={navigation?.campaign} />
        <Rule />
      </Top>
      <NavItems>
        {navigation?.sections.map(({ to, text, glyph, active }) => (
          <NavigationItem.TransparentLink
            key={to}
            to={to}
            aria-current={active ? "page" : undefined}
          >
            <NavigationIcon {...glyph} inverted={active} />
            <Font.Bold20 element="div" text={text} />
          </NavigationItem.TransparentLink>
        ))}
      </NavItems>
      {user && <AccountMenu user={user} />}
    </Nav>
  </NavContainer>
);

export default Sidebar;
