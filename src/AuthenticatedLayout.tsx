import styled from "@emotion/styled";
import background from "assets/background.svg";
import Button from "components/Button.tsx";
import Font from "components/Font.tsx";
import Icon from "components/Icon.tsx";
import NavigationItem from "components/NavigationItem.tsx";
import Popover from "components/Popover.tsx";
import { useQuery } from "convex/react";
import useModal from "hooks/useModal.ts";
import { authClient } from "lib/auth-client.ts";
import { useState } from "react";
import { Outlet, useNavigate } from "react-router";

import { api } from "../convex/_generated/api";
import { NavigationItemPortalContext } from "./NavigationItemPortalContext.tsx";

const Layout = styled.div`
  display: grid;
  grid-template-columns: 66px 1fr;
  height: 100vh;

  background-image: url("${background}");
  background-size: 100% 100%;
  background-repeat: no-repeat;
`;

const NavContainer = styled.div`
  width: 100%;
  overflow: visible;
  isolation: isolate;
  z-index: 2;
  height: 100vh;
`;

const Nav = styled.nav`
  position: relative;
  overflow: clip;
  height: 100%;
  width: 66px;
  transition: width 300ms linear;
  background-image: url("${background}");
  background-size: 100vw 100vh;
  background-repeat: no-repeat;
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
  grid-template-rows: 1fr auto;
  gap: 8px;
  --navigation-horizontal-padding: 12px;
  padding: 12px var(--navigation-horizontal-padding);
  border-right: 2px solid var(--neutral-200);
`;

const Main = styled.main`
  min-width: 0;
  height: 100vh;
  overflow: hidden;
`;

const NavItems = styled.div`
  display: grid;
  grid-auto-rows: min-content;
  align-content: start;
  gap: 4px;
`;

const Avatar = styled.img`
  width: 40px;
  height: 40px;
  aspect-ratio: 1 / 1;
  border-radius: 999px;
  object-fit: cover;
`;

const MenuCard = styled.div`
  display: grid;
  padding: 8px;
  border-radius: 12px;
  background-color: var(--neutral-100);
  box-shadow: var(--shadow-medium);
`;

const AuthenticatedLayout = () => {
  const navigate = useNavigate();
  const currentUser = useQuery(api.users.me);
  const [navItems, setNavItems] = useState<HTMLElement | null>(null);
  const settingsMenu = useModal();

  return (
    <Layout>
      <NavContainer>
        <Nav>
          <NavItems ref={setNavItems} />
          {currentUser && (
            <Popover
              verticalAlignment="top"
              horizontalAlignment="span-left"
              isOpen={settingsMenu.isOpen}
              requestClose={settingsMenu.close}
              content={
                <MenuCard>
                  <Button.MenuItem
                    text="Sign out"
                    onClick={() =>
                      authClient.signOut().then(() => navigate("/login", { replace: true }))
                    }
                  />
                </MenuCard>
              }
            >
              <NavigationItem.Solid>
                <Avatar src={currentUser.picture} alt={currentUser.displayName} />
                <Font.Bold16 element="div" text={currentUser.displayName} />
                <Button.Transparent Icon={Icon.Cog} onClick={settingsMenu.open} />
              </NavigationItem.Solid>
            </Popover>
          )}
        </Nav>
      </NavContainer>
      <NavigationItemPortalContext value={navItems}>
        <Main>
          <Outlet />
        </Main>
      </NavigationItemPortalContext>
    </Layout>
  );
};

export default AuthenticatedLayout;
