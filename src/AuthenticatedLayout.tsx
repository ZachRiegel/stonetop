import styled from "@emotion/styled";
import { getClient } from "amplify.ts";
import background from "assets/background.svg";
import { fetchUserAttributes, getCurrentUser } from "aws-amplify/auth";
import { use, useState } from "react";
import { Outlet } from "react-router";

import Font from "./components/Font.tsx";
import { NavigationItemPortalContext } from "./NavigationItemPortalContext.tsx";
import Button from "components/Button.tsx";
import Icon from "components/Icon.tsx";

const cachePromise = <T,>(fn: () => Promise<T>) => {
  let promise: Promise<T> | undefined;
  return () => (promise ??= fn());
};

const cachedFetchUserAttributes = cachePromise(fetchUserAttributes);

// Mirror the Cognito attributes into the shared UserProfile record (keyed by
// username) so other campaign members can see them; write only on change.
const cachedSyncProfile = cachePromise(async () => {
  const [attributes, { username }] = await Promise.all([
    cachedFetchUserAttributes(),
    getCurrentUser(),
  ]);
  const profile = {
    id: username,
    name: attributes.name ?? null,
    picture: attributes.picture ?? null,
  };
  const { models } = getClient();
  const { data: existing } = await models.UserProfile.get({ id: username });
  if (!existing) await models.UserProfile.create(profile);
  else if (existing.name !== profile.name || existing.picture !== profile.picture)
    await models.UserProfile.update(profile);
});

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
  overflow-y: auto;
`;

const Profile = styled.div`
  display: grid;
  padding: 8px 12px;
  min-width: calc(var(--expanded-width) - 2 * var(--navigation-horizontal-padding));
  width: calc(var(--expanded-width) - 2 * var(--navigation-horizontal-padding) + 16);
  grid-template-columns: max-content 1fr max-content;
  grid-template-rows: max-content;
  gap: 12px;
  align-items: center;
  cursor: pointer;
  border-radius: 12px;
  overflow: hidden;
  translate: -8px 0;

  transition:
    background-color 300ms linear,
    padding 300ms linear,
    translate 300ms linear;
  transition-delay: var(--custom-transition-delay);

  & > *:not(:first-child) {
    opacity: 0;
    transition: opacity 300ms linear;
  }

  &:hover {
    background-color: var(--neutral-75);
  }

  @container navigation style(--open: true) {
    translate: 0 0;
    background-color: var(--neutral-100);
    box-shadow: var(--shadow-small);

    & > *:not(:first-child) {
      opacity: 1;
    }
  }
`;

const Avatar = styled.img`
  width: 40px;
  height: 40px;
  aspect-ratio: 1 / 1;
  border-radius: 999px;
  object-fit: cover;
`;

const Placeholder = styled.div`
  width: 40px;
  height: 40px;
  aspect-ratio: 1 / 1;
  background-color: var(--neutral-100);
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
`;

const AuthenticatedLayout = () => {
  const user = use(cachedFetchUserAttributes());
  void cachedSyncProfile();
  const [navItems, setNavItems] = useState<HTMLElement | null>(null);

  return (
    <Layout>
      <NavContainer>
        <Nav>
          <NavItems ref={setNavItems} />
          <Profile>
            {user.picture ? (
              <Avatar src={user.picture} alt={user.name ?? ""} />
            ) : (
              <Placeholder>
                <Font.Bold20 element="div" text="?" />
              </Placeholder>
            )}
            <Font.Bold16 element="div" text={user.name ?? "Unknown"} />
            <Button.Transparent Icon={Icon.Cog} />
          </Profile>
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
