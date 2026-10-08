import styled from "@emotion/styled";
import CampaignNavigationLayout from "CampaignNavigationLayout.tsx";
import Loading from "components/Loading.tsx";
import { useConvexAuth } from "convex/react";
import { ConvexError } from "convex/values";
import { authClient } from "lib/auth-client.ts";
import LoggedInUserNavigationLayout from "LoggedInUserNavigationLayout.tsx";
import Campaigns from "pages/campaigns/Campaigns.tsx";
import Login from "pages/landing/Login.tsx";
import Players from "pages/players/Players.tsx";
import { useEffect } from "react";
import {
  createBrowserRouter,
  Navigate,
  Outlet,
  redirect,
  RouterProvider,
  useNavigate,
  useRouteError,
  useSearchParams,
} from "react-router";
import RootLayout from "RootLayout.tsx";

import AuthenticatedLayout from "./AuthenticatedLayout.tsx";

const FullPageLoading = styled.div`
  display: grid;
  place-items: center;
  min-height: 100vh;
`;

// Queries throw UNAUTHENTICATED when the session has no account behind it,
// e.g. a profile row deleted while the browser kept a valid token. The only
// way forward is a fresh sign-in; any other error keeps bubbling to the
// router's default error page.
const SessionBoundary = () => {
  const error = useRouteError();
  const navigate = useNavigate();
  const isStaleSession = error instanceof ConvexError && error.data.code === "UNAUTHENTICATED";

  useEffect(() => {
    if (isStaleSession) authClient.signOut().then(() => navigate("/login", { replace: true }));
  }, [isStaleSession, navigate]);

  if (!isStaleSession) throw error;
  return (
    <FullPageLoading>
      <Loading.Medium />
    </FullPageLoading>
  );
};

const RequireAuth = () => {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  // The OAuth return lands on "/?…&ott=…" and the provider exchanges that
  // one-time token in an effect, during which the session still reads as
  // signed out. The router never sees the provider's history.replaceState,
  // so `ott` in the params marks the landing until the exchange finishes.
  const isExchangingToken = searchParams.has("ott") && !isAuthenticated;
  const inviteLinkId = searchParams.get("inviteLinkId");

  // stash the invite so it survives the login round-trip
  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isExchangingToken && inviteLinkId)
      sessionStorage.setItem("inviteLinkId", inviteLinkId);
  }, [isLoading, isAuthenticated, isExchangingToken, inviteLinkId]);

  // the provider never reports a failed exchange (the token lives three
  // minutes); after a grace period drop `ott` so the guard falls through to
  // the normal signed-out path
  useEffect(() => {
    if (!isExchangingToken) return;
    const timer = setTimeout(
      () =>
        setSearchParams(
          (previous) => {
            previous.delete("ott");
            return previous;
          },
          { replace: true },
        ),
      10_000,
    );
    return () => clearTimeout(timer);
  }, [isExchangingToken, setSearchParams]);

  if (isLoading || isExchangingToken)
    return (
      <FullPageLoading>
        <Loading.Medium />
      </FullPageLoading>
    );
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
};

const LoginGate = () => {
  const { isLoading, isAuthenticated } = useConvexAuth();
  if (isLoading)
    return (
      <FullPageLoading>
        <Loading.Medium />
      </FullPageLoading>
    );
  return isAuthenticated ? <Navigate to="/" replace /> : <Login />;
};

const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      {
        element: <RequireAuth />,
        errorElement: <SessionBoundary />,
        // a direct load of the lazy dice route renders nothing until its chunk arrives;
        // sitting below RootLayout keeps its global styles around the spinner
        hydrateFallbackElement: (
          <FullPageLoading>
            <Loading.Medium />
          </FullPageLoading>
        ),
        children: [
          {
            element: <AuthenticatedLayout />,
            children: [
              {
                element: <LoggedInUserNavigationLayout />,
                children: [
                  { index: true, element: <Campaigns /> },
                  { path: "characters", element: null },
                  { path: "about", element: null },
                ],
              },
              {
                element: <CampaignNavigationLayout />,
                path: "campaign/:campaignId",
                children: [
                  {
                    index: true,
                    loader: ({ params }) => redirect(`/campaign/${params.campaignId}/dice`),
                  },
                  {
                    // three.js and react-three-fiber only load with this route
                    path: "dice",
                    lazy: {
                      Component: () =>
                        import("pages/dice/DiceRoller.tsx").then((module) => module.default),
                    },
                  },
                  { path: "players", element: <Players /> },
                ],
              },
            ],
          },
        ],
      },
      { path: "/login", element: <LoginGate /> },
      { path: "*", loader: () => redirect("/") },
    ],
  },
]);

export const App = () => <RouterProvider router={router} />;

export default App;
