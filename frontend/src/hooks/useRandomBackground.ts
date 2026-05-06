import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type BgManifest = {
  images?: string[];
  initialImage?: string | null;
  generatedAt?: string;
};

const FALLBACK_BG = "/bj3.webp";
const FALLBACK_VERSION = "20260506b";

function withAssetVersion(src: string, version: string): string {
  const separator = src.includes("?") ? "&" : "?";
  return `${src}${separator}v=${encodeURIComponent(version)}`;
}

function buildShuffleQueue(length: number, currentIndex: number): number[] {
  const queue = Array.from({ length }, (_, index) => index).filter(
    (index) => index !== currentIndex,
  );

  for (let i = queue.length - 1; i > 0; i -= 1) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [queue[i], queue[randomIndex]] = [queue[randomIndex], queue[i]];
  }

  return queue;
}

function preloadImage(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
    image.src = src;
  });
}

export function useRandomBackground() {
  const [images, setImages] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [shuffleQueue, setShuffleQueue] = useState<number[]>([]);
  const [ready, setReady] = useState(false);
  const [switching, setSwitching] = useState(false);
  const imagesRef = useRef<string[]>([]);
  const currentIndexRef = useRef(0);
  const shuffleQueueRef = useRef<number[]>([]);
  const switchRequestIdRef = useRef(0);
  const failedImagesRef = useRef<Set<string>>(new Set());

  const shuffleBackground = useCallback(() => {
    const nextImages = imagesRef.current;
    if (switching || nextImages.length <= 1) return;

    const queue =
      shuffleQueueRef.current.length > 0
        ? [...shuffleQueueRef.current]
        : buildShuffleQueue(nextImages.length, currentIndexRef.current);
    setSwitching(true);
    const requestId = switchRequestIdRef.current + 1;
    switchRequestIdRef.current = requestId;

    void (async () => {
      let remainingQueue = queue;

      while (remainingQueue.length > 0) {
        const nextIndex = remainingQueue.shift();
        if (nextIndex === undefined) break;

        const nextImage = nextImages[nextIndex];
        if (!nextImage || failedImagesRef.current.has(nextImage)) {
          continue;
        }

        const loaded = await preloadImage(nextImage);
        if (switchRequestIdRef.current !== requestId) return;
        if (!loaded) {
          failedImagesRef.current.add(nextImage);
          continue;
        }

        currentIndexRef.current = nextIndex;
        const recycledQueue = [...remainingQueue];
        if (recycledQueue.length === 0) {
          const refillQueue = buildShuffleQueue(nextImages.length, nextIndex).filter(
            (index) => !failedImagesRef.current.has(nextImages[index] ?? ""),
          );
          shuffleQueueRef.current = refillQueue;
          setShuffleQueue(refillQueue);
        } else {
          shuffleQueueRef.current = recycledQueue;
          setShuffleQueue(recycledQueue);
        }
        setCurrentIndex(nextIndex);
        setSwitching(false);
        return;
      }

      if (switchRequestIdRef.current !== requestId) return;
      const resetQueue = buildShuffleQueue(
        nextImages.length,
        currentIndexRef.current,
      ).filter((index) => !failedImagesRef.current.has(nextImages[index] ?? ""));
      shuffleQueueRef.current = resetQueue;
      setShuffleQueue(resetQueue);
      setSwitching(false);
    })();
  }, [switching]);

  useEffect(() => {
    let mounted = true;

    async function loadManifest() {
      try {
        const response = await fetch("/bj-manifest.json", {
          cache: "no-store",
        });
        if (!response.ok) return;

        const manifest = (await response.json()) as BgManifest;
        const manifestVersion = manifest.generatedAt ?? FALLBACK_VERSION;
        const normalized = (manifest.images ?? [])
          .filter((path) => /^\/bj/i.test(path))
          .map((path) => withAssetVersion(path, manifestVersion));
        if (!mounted || normalized.length === 0) return;

        const initialPath = manifest.initialImage ?? manifest.images?.[0] ?? null;
        const preferredInitialImage = initialPath
          ? withAssetVersion(initialPath, manifestVersion)
          : normalized[0];
        let initialIndex = Math.max(normalized.indexOf(preferredInitialImage), 0);
        let initialImage = normalized[initialIndex] ?? normalized[0];
        let initialLoaded = await preloadImage(initialImage);
        if (!initialLoaded) {
          failedImagesRef.current.add(initialImage);
          for (let index = 0; index < normalized.length; index += 1) {
            const candidate = normalized[index];
            if (failedImagesRef.current.has(candidate)) continue;
            const loaded = await preloadImage(candidate);
            if (!loaded) {
              failedImagesRef.current.add(candidate);
              continue;
            }
            initialImage = candidate;
            initialIndex = index;
            initialLoaded = true;
            break;
          }
        }
        if (!mounted) return;
        if (!initialLoaded) {
          initialImage = withAssetVersion(FALLBACK_BG, FALLBACK_VERSION);
          initialIndex = 0;
        }

        imagesRef.current = normalized;
        currentIndexRef.current = initialIndex;
        const nextQueue = buildShuffleQueue(normalized.length, initialIndex).filter(
          (index) => !failedImagesRef.current.has(normalized[index] ?? ""),
        );
        shuffleQueueRef.current = nextQueue;
        setImages(normalized);
        setCurrentIndex(initialIndex);
        setShuffleQueue(nextQueue);
        void Promise.all(
          normalized
            .filter((path) => path !== initialImage)
            .map(async (path) => {
              const loaded = await preloadImage(path);
              if (!loaded) {
                failedImagesRef.current.add(path);
              }
            }),
        );
      } catch {
        // Keep fallback background when manifest is missing or invalid.
        await preloadImage(withAssetVersion(FALLBACK_BG, FALLBACK_VERSION));
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
  }, []);

  const backgroundUrl = useMemo(() => {
    if (images.length === 0) {
      return withAssetVersion(FALLBACK_BG, FALLBACK_VERSION);
    }
    return images[currentIndex] ?? images[0];
  }, [currentIndex, images]);

  return {
    backgroundUrl,
    current: images.length === 0 ? 1 : currentIndex + 1,
    total: images.length === 0 ? 1 : images.length,
    ready,
    switching,
    shuffleBackground,
  };
}
