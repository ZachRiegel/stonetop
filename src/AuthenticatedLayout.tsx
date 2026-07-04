import { fetchUserAttributes, getCurrentUser } from "aws-amplify/auth";
import styled from "@emotion/styled";
import { use, useState } from "react";
import Font from "./components/Font.tsx";
import { Outlet } from "react-router";

import { client } from "amplify.ts";
import { NavigationItemPortalContext } from "./NavigationItemPortalContext.tsx";

import background from "assets/background.svg";

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
  const { data: existing } = await client.models.UserProfile.get({ id: username });
  if (!existing) await client.models.UserProfile.create(profile);
  else if (existing.name !== profile.name || existing.picture !== profile.picture)
    await client.models.UserProfile.update(profile);
});

const Layout = styled.div`
  display: grid;
  grid-template-columns: 66px 1fr;
  height: 100vh;

  background-image: url("${background}");
  background-size: 100% 100%;
  background-repeat: no-repeat;
`;

const Nav = styled.nav`
  isolation: isolate;
  height: 100vh;
  display: grid;
  grid-template-rows: 1fr auto;
  gap: 8px;
  padding: 12px;
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
  display: flex;
  align-items: center;
  cursor: pointer;
  border-radius: 8px;
  overflow: hidden;

  &:hover {
    background-color: var(--neutral-100);
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
        </Profile>
      </Nav>
      <NavigationItemPortalContext value={navItems}>
        <Main>
          <Outlet />
        </Main>
      </NavigationItemPortalContext>
    </Layout>
  );
};

export default AuthenticatedLayout;
