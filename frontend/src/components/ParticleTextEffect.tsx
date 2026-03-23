import { useEffect, useMemo, useRef } from "react";

type Vector2D = {
  x: number;
  y: number;
};

type RGB = {
  r: number;
  g: number;
  b: number;
};

interface ParticleTextEffectProps {
  words?: string[];
  intervalMs?: number;
}

const DEFAULT_WORDS = ["I'm 小镇子", "Build AI, Ship Value."];
const PIXEL_STEP = 3;
const MAX_PARTICLES = 2500;
const DEFAULT_INTERVAL_MS = 2000;
const SPLIT_DURATION_MS = 460;
const MIN_DISPLAY_MS = 80;
const CJK_PATTERN = /[\u3400-\u9fff]/;
const PARTICLE_POINT_SIZE_MIN = 1.8;
const PARTICLE_POINT_SIZE_RANGE = 0.45;
const PARTICLE_OUTLINE_ALPHA = 0.36;
const PARTICLE_FILL_ALPHA = 0.96;
const SPAWN_RADIUS_FACTOR = 0.32;
const SPLIT_RADIUS_FACTOR = 0.6;
const LATIN_FONT_STACK =
  '"Avenir Next", "Segoe UI", "Helvetica Neue", sans-serif';
const CJK_FONT_STACK =
  '"PingFang SC", "Microsoft YaHei", "Noto Sans SC", "Segoe UI", sans-serif';
const WORD_COLOR_PALETTES: RGB[][] = [
  [
    { r: 236, g: 248, b: 255 },
    { r: 186, g: 228, b: 255 },
    { r: 128, g: 204, b: 255 },
  ],
  [
    { r: 226, g: 243, b: 255 },
    { r: 176, g: 216, b: 255 },
    { r: 122, g: 191, b: 248 },
  ],
  [
    { r: 236, g: 249, b: 255 },
    { r: 196, g: 232, b: 255 },
    { r: 140, g: 210, b: 255 },
  ],
  [
    { r: 228, g: 245, b: 255 },
    { r: 180, g: 223, b: 255 },
    { r: 122, g: 194, b: 252 },
  ],
];

function randomAround(
  centerX: number,
  centerY: number,
  radius: number,
): Vector2D {
  const angle = Math.random() * Math.PI * 2;
  const distance = radius * (0.75 + Math.random() * 0.5);
  return {
    x: centerX + Math.cos(angle) * distance,
    y: centerY + Math.sin(angle) * distance,
  };
}

function clampColor(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function blendPaletteColor(start: RGB, end: RGB, ratio: number): RGB {
  return {
    r: clampColor(start.r + (end.r - start.r) * ratio),
    g: clampColor(start.g + (end.g - start.g) * ratio),
    b: clampColor(start.b + (end.b - start.b) * ratio),
  };
}

function pickWordColor(
  wordIndex: number,
  x: number,
  y: number,
  width: number,
  height: number,
): RGB {
  const palette = WORD_COLOR_PALETTES[wordIndex % WORD_COLOR_PALETTES.length];
  const gradientProgress = x / Math.max(width, 1);
  const verticalMix = y / Math.max(height, 1);
  const firstMix = blendPaletteColor(palette[0], palette[1], gradientProgress);
  const mixed = blendPaletteColor(firstMix, palette[2], verticalMix * 0.65);
  const jitterR = (Math.random() - 0.5) * 2;
  const jitterG = (Math.random() - 0.5) * 2;
  const jitterB = (Math.random() - 0.5) * 2;
  return {
    r: clampColor(mixed.r + jitterR),
    g: clampColor(mixed.g + jitterG),
    b: clampColor(mixed.b + jitterB),
  };
}

function sampleCoordsEvenly(coords: Vector2D[], maxCount: number): Vector2D[] {
  if (coords.length <= maxCount) return coords;
  const sampled = new Array<Vector2D>(maxCount);
  const step = coords.length / maxCount;
  for (let i = 0; i < maxCount; i += 1) {
    sampled[i] = coords[Math.floor(i * step)];
  }
  return sampled;
}

function getDisplayDuration(intervalMs: number): number {
  return Math.max(intervalMs - SPLIT_DURATION_MS, MIN_DISPLAY_MS);
}

class Particle {
  pos: Vector2D;
  vel: Vector2D = { x: 0, y: 0 };
  acc: Vector2D = { x: 0, y: 0 };
  target: Vector2D = { x: 0, y: 0 };

  closeEnoughTarget = 52;
  maxSpeed = 8.4 + Math.random() * 3.2;
  maxForce = this.maxSpeed * 0.14;
  pointSize =
    PARTICLE_POINT_SIZE_MIN + Math.random() * PARTICLE_POINT_SIZE_RANGE;

  startColor: RGB = { r: 0, g: 0, b: 0 };
  targetColor: RGB = { r: 0, g: 0, b: 0 };
  colorWeight = 0;
  colorBlendRate = 0.07 + Math.random() * 0.04;
  renderSize = Math.max(2, Math.round(this.pointSize));
  outlineSize = Math.max(this.renderSize + 1, 3);
  currentR = 0;
  currentG = 0;
  currentB = 0;

  constructor(spawn: Vector2D) {
    this.pos = { x: spawn.x, y: spawn.y };
  }

  private syncCurrentColor() {
    this.currentR = Math.round(
      this.startColor.r +
        (this.targetColor.r - this.startColor.r) * this.colorWeight,
    );
    this.currentG = Math.round(
      this.startColor.g +
        (this.targetColor.g - this.startColor.g) * this.colorWeight,
    );
    this.currentB = Math.round(
      this.startColor.b +
        (this.targetColor.b - this.startColor.b) * this.colorWeight,
    );
  }

  private snapshotCurrentToStartColor() {
    this.syncCurrentColor();
    this.startColor.r = this.currentR;
    this.startColor.g = this.currentG;
    this.startColor.b = this.currentB;
  }

  setTarget(target: Vector2D, nextColor: RGB) {
    this.snapshotCurrentToStartColor();
    this.targetColor = nextColor;
    this.colorWeight = 0;
    this.target.x = target.x;
    this.target.y = target.y;

    const dx = this.target.x - this.pos.x;
    const dy = this.target.y - this.pos.y;
    const distance = Math.hypot(dx, dy);
    if (distance > 0.01 && distance > this.closeEnoughTarget * 0.95) {
      const impulse = Math.min(distance * 0.12, this.maxSpeed * 1.85);
      this.vel.x = (dx / distance) * impulse;
      this.vel.y = (dy / distance) * impulse;
    }
  }

  scatter(width: number, height: number) {
    const randomPos = randomAround(
      width / 2,
      height / 2,
      (width + height) * SPLIT_RADIUS_FACTOR,
    );
    this.snapshotCurrentToStartColor();
    this.targetColor = { r: 132, g: 214, b: 255 };
    this.colorWeight = 0;
    this.target.x = randomPos.x;
    this.target.y = randomPos.y;

    const dx = this.target.x - this.pos.x;
    const dy = this.target.y - this.pos.y;
    const distance = Math.hypot(dx, dy);
    if (distance > 0.01) {
      const burst = Math.min(distance * 0.16, this.maxSpeed * 2.2);
      this.vel.x = (dx / distance) * burst;
      this.vel.y = (dy / distance) * burst;
    }
  }

  move() {
    const dx = this.target.x - this.pos.x;
    const dy = this.target.y - this.pos.y;
    const distance = Math.hypot(dx, dy);

    let proximityMult = 1;
    if (distance < this.closeEnoughTarget) {
      proximityMult = distance / this.closeEnoughTarget;
    }

    const desiredX =
      distance > 0 ? (dx / distance) * this.maxSpeed * proximityMult : 0;
    const desiredY =
      distance > 0 ? (dy / distance) * this.maxSpeed * proximityMult : 0;

    let steerX = desiredX - this.vel.x;
    let steerY = desiredY - this.vel.y;
    const steerMag = Math.hypot(steerX, steerY);
    if (steerMag > 0) {
      steerX = (steerX / steerMag) * this.maxForce;
      steerY = (steerY / steerMag) * this.maxForce;
    }

    this.acc.x += steerX;
    this.acc.y += steerY;

    this.vel.x += this.acc.x;
    this.vel.y += this.acc.y;
    this.vel.x *= 0.84;
    this.vel.y *= 0.84;
    this.pos.x += this.vel.x;
    this.pos.y += this.vel.y;
    this.acc.x = 0;
    this.acc.y = 0;

    if (
      Math.abs(this.target.x - this.pos.x) < 0.78 &&
      Math.abs(this.target.y - this.pos.y) < 0.78 &&
      Math.abs(this.vel.x) < 0.18 &&
      Math.abs(this.vel.y) < 0.18
    ) {
      this.pos.x = this.target.x;
      this.pos.y = this.target.y;
      this.vel.x = 0;
      this.vel.y = 0;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.colorWeight < 1) {
      this.colorWeight = Math.min(this.colorWeight + this.colorBlendRate, 1);
      this.syncCurrentColor();
    } else if (
      this.currentR !== this.targetColor.r ||
      this.currentG !== this.targetColor.g ||
      this.currentB !== this.targetColor.b
    ) {
      this.currentR = this.targetColor.r;
      this.currentG = this.targetColor.g;
      this.currentB = this.targetColor.b;
    }

    const drawX = Math.round(this.pos.x);
    const drawY = Math.round(this.pos.y);

    ctx.fillStyle = `rgba(8, 22, 46, ${PARTICLE_OUTLINE_ALPHA})`;
    ctx.fillRect(drawX - 1, drawY - 1, this.outlineSize, this.outlineSize);
    ctx.fillStyle = `rgba(${this.currentR}, ${this.currentG}, ${this.currentB}, ${PARTICLE_FILL_ALPHA})`;
    ctx.fillRect(drawX, drawY, this.renderSize, this.renderSize);
  }
}

export function ParticleTextEffect({
  words = DEFAULT_WORDS,
  intervalMs = DEFAULT_INTERVAL_MS,
}: ParticleTextEffectProps) {
  const normalizedWords = useMemo(() => {
    const cleaned = words.map((word) => word.trim()).filter(Boolean);
    return cleaned.length > 0 ? cleaned : DEFAULT_WORDS;
  }, [words]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const wordIndexRef = useRef(0);
  const pendingWordIndexRef = useRef<number | null>(null);
  const phaseRef = useRef<"display" | "split">("display");
  const splitUntilRef = useRef(0);
  const nextSwitchAtRef = useRef(0);
  const sceneSizeRef = useRef({ width: 0, height: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const getContext = () => canvas.getContext("2d");
    if (!getContext()) return;

    const ensureOffscreenCanvas = () => {
      if (!offscreenCanvasRef.current) {
        offscreenCanvasRef.current = document.createElement("canvas");
      }
      return offscreenCanvasRef.current;
    };

    const syncCanvasSize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;

      const width = Math.max(320, Math.min(parent.clientWidth, 720));
      const heightByWidth = Math.round(width * 0.2);
      const heightByViewport = Math.round(window.innerHeight * 0.2);
      const height = Math.max(
        92,
        Math.min(150, heightByWidth, heightByViewport),
      );
      sceneSizeRef.current = { width, height };

      const dpr = Math.max(window.devicePixelRatio || 1, 1);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const ctx = getContext();
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;

      const offscreenCanvas = ensureOffscreenCanvas();
      offscreenCanvas.width = width;
      offscreenCanvas.height = height;
    };

    const drawWordToParticles = (word: string, wordIndex: number) => {
      const offscreenCanvas = ensureOffscreenCanvas();
      const offscreenCtx = offscreenCanvas.getContext("2d");
      if (!offscreenCtx) return;

      const { width, height } = sceneSizeRef.current;
      offscreenCtx.clearRect(0, 0, width, height);
      offscreenCtx.fillStyle = "white";
      offscreenCtx.textAlign = "center";
      offscreenCtx.textBaseline = "middle";

      const maxTextWidth = width * 0.88;
      let fontSize = Math.round(height * 0.84);
      const hasCJK = CJK_PATTERN.test(word);
      const fontFamily = hasCJK ? CJK_FONT_STACK : LATIN_FONT_STACK;
      while (fontSize > 24) {
        offscreenCtx.font = `900 ${fontSize}px ${fontFamily}`;
        if (offscreenCtx.measureText(word).width <= maxTextWidth) break;
        fontSize -= 2;
      }
      offscreenCtx.fillText(word, width / 2, height / 2);

      const imageData = offscreenCtx.getImageData(0, 0, width, height);
      const pixels = imageData.data;
      const coords: Vector2D[] = [];

      for (let y = 0; y < height; y += PIXEL_STEP) {
        for (let x = 0; x < width; x += PIXEL_STEP) {
          const alphaIndex = (y * width + x) * 4 + 3;
          if (pixels[alphaIndex] > 110) {
            coords.push({ x, y });
          }
        }
      }

      if (coords.length > 0) {
        let minX = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        let minY = Number.POSITIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;

        for (let i = 0; i < coords.length; i += 1) {
          const { x, y } = coords[i];
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }

        const textWidth = maxX - minX;
        const textHeight = maxY - minY;
        const offsetX = (width - textWidth) / 2 - minX;
        const offsetY = (height - textHeight) / 2 - minY;

        for (let i = 0; i < coords.length; i += 1) {
          coords[i].x += offsetX;
          coords[i].y += offsetY;
        }
      }

      const targetCoords = sampleCoordsEvenly(coords, MAX_PARTICLES);
      const particles = particlesRef.current;
      const targetCount = targetCoords.length;

      let particleIndex = 0;
      for (; particleIndex < targetCount; particleIndex += 1) {
        const coord = targetCoords[particleIndex];
        let particle = particles[particleIndex];
        if (!particle) {
          const spawn = randomAround(
            width / 2,
            height / 2,
            (width + height) * SPAWN_RADIUS_FACTOR,
          );
          particle = new Particle(spawn);
          particles.push(particle);
        }
        const nextColor = pickWordColor(
          wordIndex,
          coord.x,
          coord.y,
          width,
          height,
        );
        particle.setTarget(coord, nextColor);
      }

      if (particles.length > particleIndex) {
        particles.length = particleIndex;
      }
    };

    const startSplitTransition = (nextWordIndex: number, timestamp: number) => {
      const { width, height } = sceneSizeRef.current;
      const particles = particlesRef.current;
      for (let i = 0; i < particles.length; i += 1) {
        particles[i].scatter(width, height);
      }
      pendingWordIndexRef.current = nextWordIndex;
      splitUntilRef.current = timestamp + SPLIT_DURATION_MS;
      phaseRef.current = "split";
    };

    const animate = (timestamp: number) => {
      const ctx = getContext();
      if (!ctx) return;

      const { width, height } = sceneSizeRef.current;
      ctx.clearRect(0, 0, width, height);

      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i -= 1) {
        const particle = particles[i];
        particle.move();
        particle.draw(ctx);
      }

      if (
        phaseRef.current === "display" &&
        timestamp >= nextSwitchAtRef.current
      ) {
        const nextWordIndex =
          (wordIndexRef.current + 1) % normalizedWords.length;
        startSplitTransition(nextWordIndex, timestamp);
      }

      if (phaseRef.current === "split" && timestamp >= splitUntilRef.current) {
        const nextWordIndex = pendingWordIndexRef.current;
        if (nextWordIndex !== null) {
          wordIndexRef.current = nextWordIndex;
          drawWordToParticles(normalizedWords[nextWordIndex], nextWordIndex);
        }
        pendingWordIndexRef.current = null;
        phaseRef.current = "display";
        nextSwitchAtRef.current = timestamp + getDisplayDuration(intervalMs);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    const handleResize = () => {
      syncCanvasSize();
      drawWordToParticles(
        normalizedWords[wordIndexRef.current],
        wordIndexRef.current,
      );
      phaseRef.current = "display";
      pendingWordIndexRef.current = null;
      nextSwitchAtRef.current =
        performance.now() + getDisplayDuration(intervalMs);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (animationRef.current !== null) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }
        return;
      }

      nextSwitchAtRef.current =
        performance.now() + getDisplayDuration(intervalMs);
      if (animationRef.current === null) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    syncCanvasSize();
    particlesRef.current = [];
    wordIndexRef.current = 0;
    phaseRef.current = "display";
    pendingWordIndexRef.current = null;
    drawWordToParticles(normalizedWords[0], 0);
    nextSwitchAtRef.current =
      performance.now() + getDisplayDuration(intervalMs);
    animationRef.current = requestAnimationFrame(animate);

    const observer = new ResizeObserver(handleResize);
    if (canvas.parentElement) {
      observer.observe(canvas.parentElement);
    }

    window.addEventListener("resize", handleResize);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      observer.disconnect();
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [intervalMs, normalizedWords]);

  return (
    <div className="particle-text-stage">
      <canvas ref={canvasRef} className="particle-text-canvas" />
    </div>
  );
}
