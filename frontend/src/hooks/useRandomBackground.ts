import { useCallback, useEffect, useMemo, useState } from "react";

type BgManifest = {
  images?: string[];
};

const FALLBACK_BG = "/landing-bg.jpg";

export function useRandomBackground() {
  const [images, setImages] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [ready, setReady] = useState(false);

  const pickRandomIndex = useCallback((length: number, exclude: number) => {
    if (length <= 1) return 0;

    let next = Math.floor(Math.random() * length);
    if (next === exclude) {
      next = (next + 1) % length;
    }
    return next;
  }, []);

  const shuffleBackground = useCallback(() => {
    setCurrentIndex((prev) => pickRandomIndex(images.length, prev));
  }, [images.length, pickRandomIndex]);

  useEffect(() => {
    let mounted = true;

    async function loadManifest() {
      try {
        const response = await fetch("/bj-manifest.json", {
          cache: "force-cache",
        });
        if (!response.ok) return;

        const manifest = (await response.json()) as BgManifest;
        const normalized = (manifest.images ?? []).filter((path) =>
          /^\/bj/i.test(path),
        );
        if (!mounted || normalized.length === 0) return;

        const randomIndex = pickRandomIndex(normalized.length, -1);
        setImages(normalized);
        setCurrentIndex(randomIndex);
      } catch {
        // Keep fallback background when manifest is missing or invalid.
      } finally {
        if (mounted) {
          setReady(true);
        }
      }
    }

    loadManifest();
    return () => {
      mounted = false;
    };
  }, [pickRandomIndex]);

  const backgroundUrl = useMemo(() => {
    if (images.length === 0) return FALLBACK_BG;
    return images[currentIndex] ?? images[0];
  }, [currentIndex, images]);

  return {
    backgroundUrl,
    current: images.length === 0 ? 1 : currentIndex + 1,
    total: images.length === 0 ? 1 : images.length,
    ready,
    shuffleBackground,
  };
}
