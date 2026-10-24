import styled from "@emotion/styled";
import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import useResponsiveSize from "hooks/useResponsiveSize.ts";
import { type Navigation, NavigationContext } from "navigation/NavigationContext.tsx";
import Strip from "navigation/Strip.tsx";
import { useState } from "react";
import { Outlet } from "react-router";

// the strip across the top, then the page. The page's scroller names its scroll timeline
// `--page`; scoped here, the strip's foot (navigation/Strip.tsx) can follow it.
const Layout = styled.div`
  display: grid;
  timeline-scope: --page;
  grid-template-rows: max-content minmax(0, 1fr);
  height: 100vh;
  /* the viewport less a phone browser's own bars, as they come and go */
  height: 100dvh;
`;

const Main = styled.main`
  min-width: 0;
  min-height: 0;
  height: 100%;
  overflow: hidden;
`;

const AuthenticatedLayout = () => {
  const currentUser = useQuery(api.users.me);
  const [navigation, setNavigation] = useState<Navigation>();
  const compact = useResponsiveSize() !== "desktop";

  return (
    <NavigationContext value={setNavigation}>
      <Layout>
        <Strip navigation={navigation} user={currentUser ?? undefined} compact={compact} />
        <Main>
          <Outlet />
        </Main>
      </Layout>
    </NavigationContext>
  );
};

export default AuthenticatedLayout;
