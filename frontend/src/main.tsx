import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";

import avatarUrl from "./assets/avatar.webp";
import { router } from "./router";
import "./styles.css";

function appendImagePreload(href: string) {
  const existing = document.querySelector(`link[rel="preload"][href="${href}"]`);
  if (existing) return;

  const link = document.createElement("link");
  link.rel = "preload";
  link.as = "image";
  link.href = href;
  link.setAttribute("fetchpriority", "high");
  document.head.appendChild(link);
}

appendImagePreload(avatarUrl);
appendImagePreload("/bj3.webp?v=20260506b");

createRoot(document.getElementById("root")!).render(
  <RouterProvider router={router} />,
);
