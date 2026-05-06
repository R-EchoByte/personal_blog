import { useEffect } from "react";
import type { NavigateFunction } from "react-router-dom";

import type { QuickLink } from "./homeConfig";

type UseHomeShortcutsOptions = {
  quickLinks: QuickLink[];
  navigate: NavigateFunction;
  onShuffleBackground: () => void;
  onRefreshQuote: () => void;
};

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.isContentEditable
  );
}

export function useHomeShortcuts({
  quickLinks,
  navigate,
  onShuffleBackground,
  onRefreshQuote,
}: UseHomeShortcutsOptions) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(event.target)) {
        return;
      }

      if (event.code === "KeyB") {
        event.preventDefault();
        onShuffleBackground();
        return;
      }

      if (event.code === "KeyQ") {
        event.preventDefault();
        onRefreshQuote();
        return;
      }

      const quickLink = quickLinks.find((item) => item.shortcut === event.key);
      if (!quickLink) {
        return;
      }

      event.preventDefault();
      if (quickLink.external) {
        window.open(quickLink.href, "_blank", "noopener,noreferrer");
        return;
      }

      navigate(quickLink.href);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [navigate, onRefreshQuote, onShuffleBackground, quickLinks]);
}
