import { useEffect, useRef } from "react";

const BADGE_SPIN_DURATION_MS = 2000;
const BADGE_RESET_DURATION_MS = 320;

function readTransformAngle(
  transform: string,
  prefixLength: number,
): number | null {
  const values = transform
    .slice(prefixLength, -1)
    .split(",")
    .map((value) => Number(value.trim()));
  const a = values[0];
  const b = values[1];

  if (
    a === undefined ||
    b === undefined ||
    Number.isNaN(a) ||
    Number.isNaN(b)
  ) {
    return null;
  }

  return (Math.atan2(b, a) * 180) / Math.PI;
}

function readBadgeAngle(element: HTMLElement): number {
  const transform = window.getComputedStyle(element).transform;
  if (!transform || transform === "none") {
    return 0;
  }

  if (transform.startsWith("matrix3d(")) {
    return readTransformAngle(transform, 9) ?? 0;
  }

  if (transform.startsWith("matrix(")) {
    return readTransformAngle(transform, 7) ?? 0;
  }

  return 0;
}

export function useBadgeSpin() {
  const badgeRef = useRef<HTMLDivElement | null>(null);
  const animationRef = useRef<Animation | null>(null);

  useEffect(
    () => () => {
      animationRef.current?.cancel();
      animationRef.current = null;
    },
    [],
  );

  const startBadgeSpin = () => {
    const element = badgeRef.current;
    if (!element) {
      return;
    }

    const angle = readBadgeAngle(element);
    animationRef.current?.cancel();
    animationRef.current = element.animate(
      [
        { transform: `rotate(${angle}deg)` },
        { transform: `rotate(${angle + 180}deg)` },
        { transform: `rotate(${angle + 360}deg)` },
      ],
      {
        duration: BADGE_SPIN_DURATION_MS,
        easing: "linear",
        iterations: Infinity,
        fill: "forwards",
      },
    );
  };

  const resetBadgeTransform = () => {
    const element = badgeRef.current;
    if (!element) {
      return;
    }

    const angle = readBadgeAngle(element);
    animationRef.current?.cancel();
    const resetAnimation = element.animate(
      [{ transform: `rotate(${angle}deg)` }, { transform: "rotate(0deg)" }],
      {
        duration: BADGE_RESET_DURATION_MS,
        easing: "ease-out",
        iterations: 1,
        fill: "forwards",
      },
    );

    animationRef.current = resetAnimation;
    resetAnimation.onfinish = () => {
      if (animationRef.current !== resetAnimation) {
        return;
      }

      element.style.transform = "rotate(0deg)";
      animationRef.current = null;
    };
    resetAnimation.oncancel = () => {
      if (animationRef.current === resetAnimation) {
        animationRef.current = null;
      }
    };
  };

  return {
    badgeRef,
    startBadgeSpin,
    resetBadgeTransform,
  };
}
