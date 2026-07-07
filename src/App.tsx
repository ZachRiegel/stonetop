import { Amplify } from "aws-amplify";
import { getCurrentUser } from "aws-amplify/auth";
import Campaigns from "pages/campaigns/Campaigns.tsx";
import Login from "pages/landing/Login.tsx";
import { createBrowserRouter, redirect, RouterProvider } from "react-router";
import RootLayout from "RootLayout.tsx";

import outputs from "../amplify_outputs.json";
import AuthenticatedLayout from "./AuthenticatedLayout.tsx";
import loggedInUserNavigationLayout from "LoggedInUserNavigationLayout.tsx";
import LoggedInUserNavigationLayout from "LoggedInUserNavigationLayout.tsx";

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
