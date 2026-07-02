import { createBrowserRouter, Outlet, redirect, RouterProvider } from "react-router";
import { getCurrentUser } from "aws-amplify/auth";

import RootLayout from "RootLayout.tsx";
import Login from "pages/landing/Login.tsx";
import Campaigns from "pages/campaigns/Campaigns.tsx";
import { Amplify } from "aws-amplify";
import outputs from "./amplify_outputs.json";
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
          async ({ context }) => {
            try {
              await getCurrentUser();
            } catch {
              throw redirect("/login");
            }
          },
        ],
        element: <AuthenticatedLayout />,
        children: [{ index: true, element: <Campaigns /> }],
      },
      {
        path: "/login",
        element: <Login />,
        loader: async () => {
          try {
            await getCurrentUser();
            redirect("/");
          } catch {}
        },
      },
      { path: "*", loader: () => redirect("/") },
    ],
  },
]);

export const App = () => <RouterProvider router={router} />;

export default App;
