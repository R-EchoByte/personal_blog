import { createBrowserRouter } from "react-router-dom";

import App from "../App";
import { lazyRouteElements } from "./lazyRoutes";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: lazyRouteElements.home },
      { path: "blog", element: lazyRouteElements.blog },
      { path: "ai", element: lazyRouteElements.ai },
      { path: "software", element: lazyRouteElements.software },
      { path: "software/admin", element: lazyRouteElements.softwareAdmin },
      { path: "movies", element: lazyRouteElements.movies },
      { path: "*", element: lazyRouteElements.notFound },
    ],
  },
]);
