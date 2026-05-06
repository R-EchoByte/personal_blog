import { lazy, Suspense, type ReactElement } from "react";

const HomePage = lazy(() => import("../pages/HomePage"));
const FeaturePendingPage = lazy(() => import("../pages/FeaturePendingPage"));
const MoviesPage = lazy(() => import("../pages/MoviesPage"));
const NotFoundPage = lazy(() => import("../pages/NotFoundPage"));

const routeImporters = {
  "/": () => import("../pages/HomePage"),
  "/blog": () => import("../pages/FeaturePendingPage"),
  "/ai": () => import("../pages/FeaturePendingPage"),
  "/software": () => import("../pages/FeaturePendingPage"),
  "/movies": () => import("../pages/MoviesPage"),
  "*": () => import("../pages/NotFoundPage"),
} as const;

const prefetchedRoutes = new Set<string>();

function RouteFallback() {
  return <div className="route-loading-shell">页面加载中...</div>;
}

function withSuspense(element: ReactElement) {
  return <Suspense fallback={<RouteFallback />}>{element}</Suspense>;
}

export function preloadRoute(path: string) {
  if (prefetchedRoutes.has(path)) return;
  const importer = routeImporters[path as keyof typeof routeImporters];
  if (!importer) return;
  prefetchedRoutes.add(path);
  void importer();
}

export const lazyRouteElements = {
  home: withSuspense(<HomePage />),
  blog: withSuspense(<FeaturePendingPage title="Blog" />),
  ai: withSuspense(<FeaturePendingPage title="AI 工具" />),
  software: withSuspense(<FeaturePendingPage title="软件资源" />),
  movies: withSuspense(<MoviesPage />),
  notFound: withSuspense(<NotFoundPage />),
} as const;
