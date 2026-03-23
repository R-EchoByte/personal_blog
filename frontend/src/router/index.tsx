import { createBrowserRouter } from "react-router-dom";

import App from "../App";
import FeaturePendingPage from "../pages/FeaturePendingPage";
import HomePage from "../pages/HomePage";
import MoviesPage from "../pages/MoviesPage";
import NotFoundPage from "../pages/NotFoundPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "blog", element: <FeaturePendingPage title="Blog" /> },
      { path: "ai", element: <FeaturePendingPage title="AI 工具" /> },
      { path: "software", element: <FeaturePendingPage title="软件资源" /> },
      { path: "movies", element: <MoviesPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
