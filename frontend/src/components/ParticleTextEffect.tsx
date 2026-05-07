import { useEffect, useMemo, useRef } from "react";

interface Vector2D {
  x: number;
  y: number;
}

interface RgbColor {
  r: number;
  g: number;
  b: number;
}

class Particle {
  pos: Vector2D = { x: 0, y: 0 };
  vel: Vector2D = { x: 0, y: 0 };
  acc: Vector2D = { x: 0, y: 0 };
  target: Vector2D = { x: 0, y: 0 };

  closeEnoughTarget = 100;
  maxSpeed = 1;
  maxForce = 0.1;
  particleSize = 10;
  isKilled = false;

  startColor: RgbColor = { r: 0, g: 0, b: 0 };
  targetColor: RgbColor = { r: 0, g: 0, b: 0 };
  colorWeight = 0;
  colorBlendRate = 0.01;

  move() {
    let proximityMult = 1;
    const distance = Math.hypot(
      this.pos.x - this.target.x,
      this.pos.y - this.target.y,
    );

    if (distance < this.closeEnoughTarget) {
      proximityMult = distance / this.closeEnoughTarget;
    }

    const towardsTarget = {
      x: this.target.x - this.pos.x,
      y: this.target.y - this.pos.y,
    };
    const magnitude = Math.hypot(towardsTarget.x, towardsTarget.y);
    if (magnitude > 0) {
      towardsTarget.x =
        (towardsTarget.x / magnitude) * this.maxSpeed * proximityMult;
      towardsTarget.y =
        (towardsTarget.y / magnitude) * this.maxSpeed * proximityMult;
    }

    const steer = {
      x: towardsTarget.x - this.vel.x,
      y: towardsTarget.y - this.vel.y,
    };
    const steerMagnitude = Math.hypot(steer.x, steer.y);
    if (steerMagnitude > 0) {
      steer.x = (steer.x / steerMagnitude) * this.maxForce;
      steer.y = (steer.y / steerMagnitude) * this.maxForce;
    }

    this.acc.x += steer.x;
    this.acc.y += steer.y;

    this.vel.x += this.acc.x;
    this.vel.y += this.acc.y;
    this.pos.x += this.vel.x;
    this.pos.y += this.vel.y;
    this.acc.x = 0;
    this.acc.y = 0;
  }

  draw(ctx: CanvasRenderingContext2D, drawAsPoints: boolean) {
    if (this.colorWeight < 1) {
      this.colorWeight = Math.min(this.colorWeight + this.colorBlendRate, 1);
    }

    const currentColor = {
      r: Math.round(
        this.startColor.r +
          (this.targetColor.r - this.startColor.r) * this.colorWeight,
      ),
      g: Math.round(
        this.startColor.g +
          (this.targetColor.g - this.startColor.g) * this.colorWeight,
      ),
      b: Math.round(
        this.startColor.b +
          (this.targetColor.b - this.startColor.b) * this.colorWeight,
      ),
    };

    ctx.fillStyle = `rgb(${currentColor.r}, ${currentColor.g}, ${currentColor.b})`;
    if (drawAsPoints) {
      ctx.fillRect(this.pos.x, this.pos.y, 2, 2);
      return;
    }

    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, this.particleSize / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  kill(width: number, height: number) {
    if (this.isKilled) return;

    const randomPos = this.generateRandomPos(
      width / 2,
      height / 2,
      (width + height) / 2,
    );
    this.target.x = randomPos.x;
    this.target.y = randomPos.y;

    this.startColor = {
      r:
        this.startColor.r +
        (this.targetColor.r - this.startColor.r) * this.colorWeight,
      g:
        this.startColor.g +
        (this.targetColor.g - this.startColor.g) * this.colorWeight,
      b:
        this.startColor.b +
        (this.targetColor.b - this.startColor.b) * this.colorWeight,
    };
    this.targetColor = { r: 12, g: 16, b: 24 };
    this.colorWeight = 0;
    this.isKilled = true;
  }

  private generateRandomPos(x: number, y: number, mag: number): Vector2D {
    const randomX = Math.random() * 1000;
    const randomY = Math.random() * 500;
    const direction = {
      x: randomX - x,
      y: randomY - y,
    };
    const magnitude = Math.hypot(direction.x, direction.y);
    if (magnitude > 0) {
      direction.x = (direction.x / magnitude) * mag;
      direction.y = (direction.y / magnitude) * mag;
    }
    return {
      x: x + direction.x,
      y: y + direction.y,
    };
  }
}

interface ParticleTextEffectProps {
  words?: string[];
}

const DEFAULT_WORDS = [
  "I'm 小镇子",
  "我是黑狙dog",
  "resohub.top",
];

const PIXEL_STEPS = 4;
const DRAW_AS_POINTS = true;
const SCENE_WIDTH = 1000;
const SCENE_HEIGHT = 220;
const WORD_INTERVAL_FRAMES = 240;
const MAX_CSS_WIDTH = 720;
const MIN_CSS_WIDTH = 320;
const MIN_CSS_HEIGHT = 88;
const MAX_CSS_HEIGHT = 170;
const WORD_COLORS: RgbColor[] = [
  { r: 228, g: 240, b: 255 },
  { r: 198, g: 228, b: 255 },
  { r: 173, g: 214, b: 255 },
  { r: 237, g: 226, b: 255 },
];

function pickWordColor(wordIndex: number): RgbColor {
  const base = WORD_COLORS[wordIndex % WORD_COLORS.length];
  return {
    r: Math.min(255, Math.round(base.r + Math.random() * 20)),
    g: Math.min(255, Math.round(base.g + Math.random() * 14)),
    b: Math.min(255, Math.round(base.b + Math.random() * 20)),
  };
}

export function ParticleTextEffect({
  words = DEFAULT_WORDS,
}: ParticleTextEffectProps) {
  const normalizedWords = useMemo(() => {
    const cleaned = words.map((word) => word.trim()).filter(Boolean);
    return cleaned.length > 0 ? cleaned : DEFAULT_WORDS;
  }, [words]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const frameCountRef = useRef(0);
  const wordIndexRef = useRef(0);
  const mouseRef = useRef({
    x: 0,
    y: 0,
    isPressed: false,
    isRightClick: false,
  });
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const generateRandomPos = (x: number, y: number, mag: number): Vector2D => {
    const randomX = Math.random() * 1000;
    const randomY = Math.random() * 500;
    const direction = {
      x: randomX - x,
      y: randomY - y,
    };
    const magnitude = Math.hypot(direction.x, direction.y);
    if (magnitude > 0) {
      direction.x = (direction.x / magnitude) * mag;
      direction.y = (direction.y / magnitude) * mag;
    }
    return {
      x: x + direction.x,
      y: y + direction.y,
    };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      const parentWidth = canvas.parentElement?.clientWidth ?? MAX_CSS_WIDTH;
      const cssWidth = Math.max(
        MIN_CSS_WIDTH,
        Math.min(parentWidth, MAX_CSS_WIDTH),
      );
      const cssHeight = Math.max(
        MIN_CSS_HEIGHT,
        Math.min(Math.round(cssWidth * 0.21), MAX_CSS_HEIGHT),
      );
      const dpr = Math.max(window.devicePixelRatio || 1, 1);

      canvas.width = Math.round(SCENE_WIDTH * dpr);
      canvas.height = Math.round(SCENE_HEIGHT * dpr);
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const nextWord = (word: string) => {
      const offscreenCanvas = document.createElement("canvas");
      offscreenCanvas.width = SCENE_WIDTH;
      offscreenCanvas.height = SCENE_HEIGHT;
      const offscreenCtx = offscreenCanvas.getContext("2d");
      if (!offscreenCtx) return;

      offscreenCtx.clearRect(0, 0, SCENE_WIDTH, SCENE_HEIGHT);
      offscreenCtx.fillStyle = "white";
      offscreenCtx.font = "bold 100px Arial";
      offscreenCtx.textAlign = "center";
      offscreenCtx.textBaseline = "middle";
      offscreenCtx.fillText(word, SCENE_WIDTH / 2, SCENE_HEIGHT / 2);

      const imageData = offscreenCtx.getImageData(
        0,
        0,
        SCENE_WIDTH,
        SCENE_HEIGHT,
      );
      const pixels = imageData.data;
      const newColor = pickWordColor(wordIndexRef.current);
      const particles = particlesRef.current;
      let particleIndex = 0;
      const coordIndexes: number[] = [];

      for (let i = 0; i < pixels.length; i += PIXEL_STEPS * 4) {
        coordIndexes.push(i);
      }

      for (let i = coordIndexes.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [coordIndexes[i], coordIndexes[j]] = [coordIndexes[j], coordIndexes[i]];
      }

      for (const coordIndex of coordIndexes) {
        const alpha = pixels[coordIndex + 3];
        if (alpha <= 0) continue;

        const x = (coordIndex / 4) % SCENE_WIDTH;
        const y = Math.floor(coordIndex / 4 / SCENE_WIDTH);

        let particle: Particle;
        if (particleIndex < particles.length) {
          particle = particles[particleIndex];
          particle.isKilled = false;
          particleIndex += 1;
        } else {
          particle = new Particle();
          const randomPos = generateRandomPos(
            SCENE_WIDTH / 2,
            SCENE_HEIGHT / 2,
            (SCENE_WIDTH + SCENE_HEIGHT) / 2,
          );
          particle.pos.x = randomPos.x;
          particle.pos.y = randomPos.y;
          particle.maxSpeed = Math.random() * 4 + 3.2;
          particle.maxForce = particle.maxSpeed * 0.05;
          particle.particleSize = Math.random() * 2 + 3;
          particle.colorBlendRate = Math.random() * 0.02 + 0.01;
          particles.push(particle);
        }

        particle.startColor = {
          r:
            particle.startColor.r +
            (particle.targetColor.r - particle.startColor.r) *
              particle.colorWeight,
          g:
            particle.startColor.g +
            (particle.targetColor.g - particle.startColor.g) *
              particle.colorWeight,
          b:
            particle.startColor.b +
            (particle.targetColor.b - particle.startColor.b) *
              particle.colorWeight,
        };
        particle.targetColor = newColor;
        particle.colorWeight = 0;
        particle.target.x = x;
        particle.target.y = y;
      }

      for (let i = particleIndex; i < particles.length; i += 1) {
        particles[i].kill(SCENE_WIDTH, SCENE_HEIGHT);
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, SCENE_WIDTH, SCENE_HEIGHT);

      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i -= 1) {
        const particle = particles[i];
        particle.move();
        particle.draw(ctx, DRAW_AS_POINTS);

        if (
          particle.isKilled &&
          (particle.pos.x < 0 ||
            particle.pos.x > SCENE_WIDTH ||
            particle.pos.y < 0 ||
            particle.pos.y > SCENE_HEIGHT)
        ) {
          particles.splice(i, 1);
        }
      }

      if (mouseRef.current.isPressed && mouseRef.current.isRightClick) {
        particles.forEach((particle) => {
          const distance = Math.hypot(
            particle.pos.x - mouseRef.current.x,
            particle.pos.y - mouseRef.current.y,
          );
          if (distance < 50) {
            particle.kill(SCENE_WIDTH, SCENE_HEIGHT);
          }
        });
      }

      frameCountRef.current += 1;
      if (frameCountRef.current % WORD_INTERVAL_FRAMES === 0) {
        wordIndexRef.current =
          (wordIndexRef.current + 1) % normalizedWords.length;
        nextWord(normalizedWords[wordIndexRef.current]);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    const updateMousePosition = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = SCENE_WIDTH / rect.width;
      const scaleY = SCENE_HEIGHT / rect.height;
      mouseRef.current.x = (event.clientX - rect.left) * scaleX;
      mouseRef.current.y = (event.clientY - rect.top) * scaleY;
    };

    const handleMouseDown = (event: MouseEvent) => {
      mouseRef.current.isPressed = true;
      mouseRef.current.isRightClick = event.button === 2;
      updateMousePosition(event);
    };

    const handleMouseUp = () => {
      mouseRef.current.isPressed = false;
      mouseRef.current.isRightClick = false;
    };

    const handleMouseMove = (event: MouseEvent) => {
      updateMousePosition(event);
    };

    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    resizeCanvas();
    frameCountRef.current = 0;
    wordIndexRef.current = 0;
    particlesRef.current = [];
    nextWord(normalizedWords[0] ?? DEFAULT_WORDS[0]);
    animate();

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("resize", resizeCanvas);

    if ("ResizeObserver" in window && canvas.parentElement) {
      resizeObserverRef.current = new ResizeObserver(resizeCanvas);
      resizeObserverRef.current.observe(canvas.parentElement);
    }

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [normalizedWords]);

  return (
    <div className="particle-text-stage particle-text-stage-kainxu">
      <canvas ref={canvasRef} className="particle-text-canvas" />
    </div>
  );
}
