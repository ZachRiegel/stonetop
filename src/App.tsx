import { createBrowserRouter, RouterProvider } from "react-router";

import RootLayout from "RootLayout.tsx";
import Landing from "pages/landing/Landing";

const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [{ index: true, element: <Landing /> }],
  },
]);

export const App = () => <RouterProvider router={router} />;

export default App;
