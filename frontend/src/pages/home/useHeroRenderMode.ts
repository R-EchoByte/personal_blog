import { useEffect, useState } from "react";

type NetworkInformation = {
  downlink?: number;
  effectiveType?: string;
  saveData?: boolean;
};

function readConnection(): NetworkInformation | null {
  if (typeof navigator === "undefined") return null;
  const connection = (
    navigator as Navigator & {
      connection?: NetworkInformation;
      mozConnection?: NetworkInformation;
      webkitConnection?: NetworkInformation;
    }
  ).connection;
  return connection ?? null;
}

function shouldUseStaticHero(): boolean {
  const connection = readConnection();
  if (!connection) return false;

  if (connection.saveData) return true;

  const effectiveType = connection.effectiveType?.toLowerCase() ?? "";
  if (effectiveType.includes("2g") || effectiveType.includes("3g")) return true;

  if (typeof connection.downlink === "number" && connection.downlink <= 5) {
    return true;
  }

  return false;
}

export function useHeroRenderMode() {
  const [enhanceHero, setEnhanceHero] = useState(false);

  useEffect(() => {
    if (shouldUseStaticHero()) return;

    const timer = window.setTimeout(() => {
      setEnhanceHero(true);
    }, 1200);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  return {
    enhanceHero,
    staticOnly: !enhanceHero,
  };
}
