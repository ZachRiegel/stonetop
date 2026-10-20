import styled from "@emotion/styled";
import background from "assets/background.svg";
import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import useResponsiveSize from "hooks/useResponsiveSize.ts";
import MobileNavigation, { ROW_HEIGHT } from "navigation/MobileNavigation.tsx";
import { type Navigation, NavigationContext } from "navigation/NavigationContext.tsx";
import Sidebar from "navigation/Sidebar.tsx";
import { useState } from "react";
import { Outlet } from "react-router";

// the sidebar beside the page on a desktop, the row above it on a phone or tablet (the
// panel the row opens lies over both, so the layout is its containing block)
const Layout = styled.div<{ mobile: boolean }>`
  position: relative;
  display: grid;
  ${({ mobile }) =>
    mobile
      ? `grid-template-rows: ${ROW_HEIGHT}px minmax(0, 1fr);`
      : "grid-template-columns: 66px minmax(0, 1fr);"}
  height: 100vh;
  /* the viewport less a phone browser's own bars, as they come and go */
  height: 100dvh;

  background-image: url("${background}");
  background-size: 100% 100%;
  background-repeat: no-repeat;
`;

const Main = styled.main`
  min-width: 0;
  min-height: 0;
  height: 100%;
  overflow: hidden;
  /* its pages' own layers stay under the navigation's */
  isolation: isolate;
`;

const AuthenticatedLayout = () => {
  const currentUser = useQuery(api.users.me);
  const [navigation, setNavigation] = useState<Navigation>();
  const mobile = useResponsiveSize() !== "desktop";

  return (
    <NavigationContext value={setNavigation}>
      <Layout mobile={mobile}>
        {mobile ? (
          <MobileNavigation navigation={navigation} user={currentUser ?? undefined} />
        ) : (
          <Sidebar navigation={navigation} user={currentUser ?? undefined} />
        )}
        <Main>
          <Outlet />
        </Main>
      </Layout>
    </NavigationContext>
  );
};

export default AuthenticatedLayout;
