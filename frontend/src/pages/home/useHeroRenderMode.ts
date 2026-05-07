import { useEffect, useState } from "react";

export function useHeroRenderMode() {
  const [enhanceHero, setEnhanceHero] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setEnhanceHero(true);
    }, 180);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  return {
    enhanceHero,
    staticOnly: !enhanceHero,
  };
}
