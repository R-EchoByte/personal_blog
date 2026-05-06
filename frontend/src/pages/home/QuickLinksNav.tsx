import { Link } from "react-router-dom";

import { preloadRoute } from "../../router/lazyRoutes";
import type { QuickLink } from "./homeConfig";

type QuickLinksNavProps = {
  quickLinks: QuickLink[];
};

export function QuickLinksNav({ quickLinks }: QuickLinksNavProps) {
  const bindPrefetch = (href: string, external?: boolean) => {
    if (external) return undefined;
    return () => preloadRoute(href);
  };

  return (
    <nav className="quick-links" aria-label="Quick links">
      {quickLinks.map((item) =>
        item.external ? (
          <a
            key={item.label}
            className="quick-link"
            href={item.href}
            target="_blank"
            rel="noreferrer"
            onMouseEnter={bindPrefetch(item.href, item.external)}
            onFocus={bindPrefetch(item.href, item.external)}
          >
            <span className="quick-link-key">{item.shortcut}</span>
            <span className="quick-link-title">{item.label}</span>
            <span className="quick-link-hint">{item.hint}</span>
          </a>
        ) : (
          <Link
            key={item.label}
            className="quick-link"
            to={item.href}
            onMouseEnter={bindPrefetch(item.href)}
            onFocus={bindPrefetch(item.href)}
          >
            <span className="quick-link-key">{item.shortcut}</span>
            <span className="quick-link-title">{item.label}</span>
            <span className="quick-link-hint">{item.hint}</span>
          </Link>
        ),
      )}
    </nav>
  );
}
