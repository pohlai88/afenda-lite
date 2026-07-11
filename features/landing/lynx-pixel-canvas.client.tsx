"use client";

import { useEffect, useRef } from "react";

/** Portal landing asset — snapshot from afenda-Xerp auth pixel. */
const LYNX_IMAGE_SRC = "/lynx/afenda-lynx-pixel.png";
const PARTICLE_SAMPLE_WIDTH = 180;
const PARTICLE_DURATION_MS = 2800;
const HOLD_DURATION_MS = 2400;
const TOTAL_DURATION_MS = PARTICLE_DURATION_MS + HOLD_DURATION_MS;
const GRID_STEP = 14;
/** Fraction of cover scale — full-bleed stage, slightly inset on black void. */
const DRAW_SCALE = 0.88;

type Particle = {
  readonly color: string;
  readonly delay: number;
  readonly drift: number;
  readonly radius: number;
  readonly startX: number;
  readonly startY: number;
  readonly targetX: number;
  readonly targetY: number;
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function easeOutCubic(value: number): number {
  return 1 - (1 - value) ** 3;
}

function brightenChannel(value: number): number {
  return Math.min(255, Math.round(value * 1.48 + 26));
}

function loadCanvasImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.src = src;
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error(`Failed to load landing pixel image: ${src}`));
  });
}

function coverDrawRect(
  image: HTMLImageElement,
  canvasWidth: number,
  canvasHeight: number,
): { drawHeight: number; drawLeft: number; drawTop: number; drawWidth: number } {
  const imageAspect = image.naturalWidth / image.naturalHeight;
  const canvasAspect = canvasWidth / canvasHeight;
  const coverScale =
    (canvasAspect > imageAspect
      ? canvasWidth / image.naturalWidth
      : canvasHeight / image.naturalHeight) * DRAW_SCALE;
  const drawWidth = image.naturalWidth * coverScale;
  const drawHeight = image.naturalHeight * coverScale;
  return {
    drawWidth,
    drawHeight,
    drawLeft: (canvasWidth - drawWidth) / 2,
    drawTop: (canvasHeight - drawHeight) / 2,
  };
}

function buildParticles({
  canvasHeight,
  canvasWidth,
  image,
}: {
  readonly canvasHeight: number;
  readonly canvasWidth: number;
  readonly image: HTMLImageElement;
}): Particle[] {
  const sampleHeight = Math.max(
    1,
    Math.round(
      PARTICLE_SAMPLE_WIDTH * (image.naturalHeight / image.naturalWidth),
    ),
  );

  const samplerCanvas = document.createElement("canvas");
  samplerCanvas.width = PARTICLE_SAMPLE_WIDTH;
  samplerCanvas.height = sampleHeight;

  const samplerContext = samplerCanvas.getContext("2d", {
    willReadFrequently: true,
  });

  if (samplerContext === null) {
    return [];
  }

  samplerContext.drawImage(image, 0, 0, PARTICLE_SAMPLE_WIDTH, sampleHeight);
  const pixels = samplerContext.getImageData(
    0,
    0,
    PARTICLE_SAMPLE_WIDTH,
    sampleHeight,
  ).data;

  const { drawHeight, drawLeft, drawTop, drawWidth } = coverDrawRect(
    image,
    canvasWidth,
    canvasHeight,
  );

  const particles: Particle[] = [];
  const stride = 2;

  for (let y = 0; y < sampleHeight; y += stride) {
    for (let x = 0; x < PARTICLE_SAMPLE_WIDTH; x += stride) {
      const index = (y * PARTICLE_SAMPLE_WIDTH + x) * 4;
      const red = pixels[index] ?? 0;
      const green = pixels[index + 1] ?? 0;
      const blue = pixels[index + 2] ?? 0;
      const alpha = pixels[index + 3] ?? 0;
      const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;

      if (alpha < 70 || luminance < 22 || Math.random() > 0.56) {
        continue;
      }

      const normalizedX = x / PARTICLE_SAMPLE_WIDTH;
      const normalizedY = y / sampleHeight;
      const targetX = drawLeft + normalizedX * drawWidth;
      const targetY = drawTop + normalizedY * drawHeight;
      const fromLeft = Math.random() > 0.4;

      particles.push({
        color: `rgb(${brightenChannel(red)} ${brightenChannel(green)} ${brightenChannel(blue)})`,
        delay: Math.random() * 0.32,
        drift: (Math.random() - 0.5) * canvasHeight * 0.12,
        radius: 0.7 + Math.random() * 1.5,
        startX: fromLeft
          ? -canvasWidth * (0.06 + Math.random() * 0.2)
          : canvasWidth * (1.02 + Math.random() * 0.14),
        startY: targetY + (Math.random() - 0.5) * canvasHeight * 0.52,
        targetX,
        targetY,
      });
    }
  }

  return particles;
}

function drawBackdrop(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  timeline: number,
): void {
  const glow = context.createRadialGradient(
    width * 0.5,
    height * 0.48,
    width * 0.04,
    width * 0.5,
    height * 0.48,
    width * 0.54,
  );
  glow.addColorStop(0, `rgba(148, 163, 184, ${0.02 + timeline * 0.04})`);
  glow.addColorStop(0.45, `rgba(96, 165, 250, ${0.02 + timeline * 0.03})`);
  glow.addColorStop(1, "rgba(2, 6, 23, 0)");

  context.fillStyle = glow;
  context.fillRect(0, 0, width, height);

  context.strokeStyle = "rgba(148, 163, 184, 0.07)";
  context.lineWidth = 1;

  for (let x = 0; x <= width; x += GRID_STEP) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
  }

  for (let y = 0; y <= height; y += GRID_STEP) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }
}

function drawResolvedImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number,
  alpha: number,
): void {
  if (alpha <= 0) {
    return;
  }

  const { drawHeight, drawLeft, drawTop, drawWidth } = coverDrawRect(
    image,
    width,
    height,
  );

  context.save();
  context.globalAlpha = alpha;
  context.filter = "drop-shadow(0 24px 72px rgba(2, 6, 23, 0.34))";
  context.drawImage(image, drawLeft, drawTop, drawWidth, drawHeight);
  context.restore();
}

function renderParticleScene(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  particles: readonly Particle[],
  width: number,
  height: number,
  elapsedMs: number,
  reducedMotion: boolean,
): void {
  context.clearRect(0, 0, width, height);

  if (reducedMotion) {
    drawBackdrop(context, width, height, 1);
    drawResolvedImage(context, image, width, height, 0.88);
    return;
  }

  const cycleMs = elapsedMs % TOTAL_DURATION_MS;
  const revealProgress = clamp01(cycleMs / PARTICLE_DURATION_MS);
  const holdProgress =
    cycleMs > PARTICLE_DURATION_MS
      ? clamp01((cycleMs - PARTICLE_DURATION_MS) / HOLD_DURATION_MS)
      : 0;

  drawBackdrop(context, width, height, revealProgress);
  context.globalCompositeOperation = "lighter";

  for (const particle of particles) {
    const local = clamp01(
      (revealProgress - particle.delay) / (1 - particle.delay),
    );

    if (local <= 0) {
      continue;
    }

    const eased = easeOutCubic(local);
    const settle = 1 - eased;
    const x = particle.startX + (particle.targetX - particle.startX) * eased;
    const y =
      particle.startY +
      (particle.targetY - particle.startY) * eased +
      Math.sin(local * Math.PI * 2 + particle.delay * 10) *
        particle.drift *
        settle;
    const tailX = x - (particle.targetX - particle.startX) * 0.06 * settle;

    context.globalAlpha = Math.min(
      1,
      (0.52 + local * 0.62) * (1 - holdProgress * 0.9),
    );
    context.strokeStyle = particle.color;
    context.lineWidth = Math.max(0.55, particle.radius * 0.7);
    context.beginPath();
    context.moveTo(tailX, y);
    context.lineTo(x, y);
    context.stroke();

    context.fillStyle = particle.color;
    context.beginPath();
    context.arc(x, y, particle.radius, 0, Math.PI * 2);
    context.fill();
  }

  context.globalCompositeOperation = "source-over";
  context.globalAlpha = 1;

  drawResolvedImage(
    context,
    image,
    width,
    height,
    0.18 + revealProgress * 0.66 + holdProgress * 0.18,
  );
}

/**
 * Full-bleed particle morph of the Lynx pixel mark for the guest landing.
 * Decorative only — pointer events stay on the hotspot layer above.
 */
export function LynxPixelCanvas(): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (canvas === null) {
      return;
    }

    const context = canvas.getContext("2d");

    if (context === null) {
      return;
    }

    let frameId = 0;
    let cancelled = false;
    let reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const resizeCanvas = (): { height: number; width: number } => {
      const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const { clientHeight, clientWidth } = canvas;
      canvas.width = Math.max(1, Math.round(clientWidth * devicePixelRatio));
      canvas.height = Math.max(1, Math.round(clientHeight * devicePixelRatio));
      context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      return { height: clientHeight, width: clientWidth };
    };

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleReducedMotionChange = (event: MediaQueryListEvent): void => {
      reducedMotion = event.matches;
    };

    mediaQuery.addEventListener("change", handleReducedMotionChange);

    loadCanvasImage(LYNX_IMAGE_SRC)
      .then((image) => {
        if (cancelled) {
          return;
        }

        const bounds = resizeCanvas();
        const particles = buildParticles({
          canvasHeight: bounds.height,
          canvasWidth: bounds.width,
          image,
        });
        const startTime = performance.now();

        const render = (now: number): void => {
          if (cancelled) {
            return;
          }

          const nextBounds = resizeCanvas();
          renderParticleScene(
            context,
            image,
            particles,
            nextBounds.width,
            nextBounds.height,
            now - startTime,
            reducedMotion,
          );

          frameId = window.requestAnimationFrame(render);
        };

        frameId = window.requestAnimationFrame(render);
      })
      .catch(() => {
        // Decorative only — landing hotspot remains usable without the canvas.
      });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frameId);
      mediaQuery.removeEventListener("change", handleReducedMotionChange);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="lynx-landing__canvas"
      aria-hidden="true"
    />
  );
}
