import { Amplify } from "aws-amplify";
import { getCurrentUser } from "aws-amplify/auth";
import CampaignNavigationLayout from "CampaignNavigationLayout.tsx";
import LoggedInUserNavigationLayout from "LoggedInUserNavigationLayout.tsx";
import CampaignSection from "pages/campaign/CampaignSection.tsx";
import Campaigns from "pages/campaigns/Campaigns.tsx";
import Login from "pages/landing/Login.tsx";
import Players from "pages/players/Players.tsx";
import { createBrowserRouter, redirect, RouterProvider } from "react-router";
import RootLayout from "RootLayout.tsx";

import outputs from "../amplify_outputs.json";
import AuthenticatedLayout from "./AuthenticatedLayout.tsx";

const configureAmplify = (() => {
  let configured = false;
  return () => {
    if (configured) return;
    Amplify.configure(outputs);
    configured = true;
  };
})();

const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    middleware: [configureAmplify],
    children: [
      {
        middleware: [
          async () => {
            try {
              await getCurrentUser();
            } catch {
              return redirect("/login");
            }
          },
        ],
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
                loader: ({ params }) => redirect(`/campaign/${params.campaignId}/scenario`),
              },
              { path: "scenario", element: <CampaignSection title="Scenario" /> },
              { path: "characters", element: <CampaignSection title="Characters" /> },
              { path: "quests", element: <CampaignSection title="Quests" /> },
              { path: "npcs", element: <CampaignSection title="NPCs" /> },
              { path: "locations", element: <CampaignSection title="Locations" /> },
              { path: "players", element: <Players /> },
            ],
          },
        ],
      },
      {
        path: "/login",
        element: <Login />,
        loader: async () => {
          try {
            await getCurrentUser();
            return redirect("/");
          } catch {
            // not signed in — stay on the login page
          }
        },
      },
      { path: "*", loader: () => redirect("/") },
    ],
  },
]);

export const App = () => <RouterProvider router={router} />;

export default App;
