import React, { useEffect, useRef } from "react";

interface PixelCanvasProps {
  theme: "light" | "dark";
}

const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

interface Cloud {
  x: number;
  y: number;
  w: number;
  speed: number;
  layer: number;
}

interface Mote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  twinkle: number;
}

interface Meteor {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

/**
 * High-performance 60fps cinematic pixel horizon:
 * - Pre-renders static Bayer-dithered sky, orb, mountains, and water onto an offscreen buffer
 * - Blits the static buffer in 1 GPU call per frame, then animates clouds, stars, meteors, and water shimmer
 */
export const PixelCanvas: React.FC<PixelCanvasProps> = ({ theme }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const bgCanvas = document.createElement("canvas");
    const bgCtx = bgCanvas.getContext("2d", { alpha: false });
    if (!bgCtx) return;

    const PIXEL = 6;
    let cols = 0;
    let rows = 0;
    let horizonRow = 0;
    let orbX = 0;
    let orbY = 0;
    let orbRadius = 10;
    let clouds: Cloud[] = [];
    let motes: Mote[] = [];
    let meteors: Meteor[] = [];
    let animId = 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const generateRidge = (
      width: number,
      baseRow: number,
      amp1: number,
      amp2: number,
      seed: number
    ) => {
      const arr: number[] = [];
      for (let x = 0; x < width + 20; x++) {
        const h =
          Math.sin((x + seed) * 0.028) * amp1 +
          Math.sin((x + seed * 1.9) * 0.075) * amp2 +
          Math.cos((x + seed * 0.4) * 0.16) * (amp2 * 0.45);
        arr.push(Math.round(baseRow - h));
      }
      return arr;
    };

    const rebuildStaticScene = () => {
      cols = Math.ceil(window.innerWidth / PIXEL) + 2;
      rows = Math.ceil(window.innerHeight / PIXEL) + 2;
      canvas.width = cols;
      canvas.height = rows;
      bgCanvas.width = cols;
      bgCanvas.height = rows;
      ctx.imageSmoothingEnabled = false;
      bgCtx.imageSmoothingEnabled = false;

      horizonRow = Math.floor(rows * 0.76);
      orbX = Math.floor(cols * 0.72);
      orbY = Math.floor(rows * 0.25);
      orbRadius = theme === "light" ? 10 : 9;

      const skyPalette =
        theme === "light"
          ? ["#f5d3be", "#f7d4b0", "#fad89e", "#fce09c", "#ffeab5"]
          : ["#02040a", "#040814", "#071024", "#0a1a3a", "#0d2b5c"];

      // 1. Pre-render Bayer-dithered sky + subtle diagonal shafts onto bgCanvas
      for (let r = 0; r < horizonRow; r++) {
        const t = (r / Math.max(1, horizonRow)) * (skyPalette.length - 1);
        const baseIdx = Math.min(skyPalette.length - 2, Math.floor(t));
        const frac = t - baseIdx;

        for (let c = 0; c < cols; c++) {
          const bayer = BAYER_4X4[r & 3][c & 3] / 16;
          const idx = Math.min(skyPalette.length - 1, baseIdx + (frac > bayer ? 1 : 0));
          bgCtx.fillStyle = skyPalette[idx];
          bgCtx.fillRect(c, r, 1, 1);

          const beam = Math.sin(c * 0.04 + r * 0.025);
          if (beam > 0.74 + bayer * 0.2) {
            bgCtx.fillStyle =
              theme === "light" ? "rgba(255, 248, 224, 0.14)" : "rgba(0, 212, 255, 0.08)";
            bgCtx.fillRect(c, r, 1, 1);
          }
        }
      }

      // 2. Celestial Orb
      for (let dy = -orbRadius - 5; dy <= orbRadius + 5; dy++) {
        for (let dx = -orbRadius - 5; dx <= orbRadius + 5; dx++) {
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d <= orbRadius) {
            if (theme === "dark" && dy > 2 && dy % 3 === 0) continue;
            bgCtx.fillStyle = theme === "light" ? "#fff4d6" : "#dff9ff";
            bgCtx.fillRect(orbX + dx, orbY + dy, 1, 1);
          } else if (d <= orbRadius + 5) {
            const bayer = BAYER_4X4[(orbY + dy) & 3][(orbX + dx) & 3] / 16;
            const haloFade = 1 - (d - orbRadius) / 5;
            if (haloFade > bayer) {
              bgCtx.fillStyle =
                theme === "light" ? "rgba(255, 240, 198, 0.42)" : "rgba(0, 225, 255, 0.24)";
              bgCtx.fillRect(orbX + dx, orbY + dy, 1, 1);
            }
          }
        }
      }

      // 3. Static Mountain Silhouettes
      const ridgeFar = generateRidge(cols, Math.floor(rows * 0.56), rows * 0.13, rows * 0.045, 22);
      const ridgeMid = generateRidge(cols, Math.floor(rows * 0.65), rows * 0.09, rows * 0.035, 108);
      const ridgeNear = generateRidge(cols, Math.floor(rows * 0.74), rows * 0.055, rows * 0.025, 240);

      const drawRidge = (arr: number[], fill: string, rimFill: string) => {
        for (let c = 0; c < cols; c++) {
          const topR = Math.min(horizonRow, arr[c]);
          if (topR < horizonRow) {
            bgCtx.fillStyle = rimFill;
            bgCtx.fillRect(c, topR, 1, 1);
            bgCtx.fillStyle = fill;
            bgCtx.fillRect(c, topR + 1, 1, horizonRow - topR - 1);
          }
        }
      };

      if (theme === "light") {
        drawRidge(ridgeFar, "#deb79c", "#ecc7ad");
        drawRidge(ridgeMid, "#c79374", "#d9a586");
        drawRidge(ridgeNear, "#a46a50", "#bd7e62");
      } else {
        drawRidge(ridgeFar, "#091224", "#184682");
        drawRidge(ridgeMid, "#060c18", "#0c5fa8");
        drawRidge(ridgeNear, "#030710", "#00c8ff");
      }

      // 4. Water Lake Base
      const waterBase = theme === "light" ? "#d9ae8f" : "#030712";
      const waterDeep = theme === "light" ? "#c28f70" : "#02040a";
      for (let r = horizonRow; r < rows; r++) {
        const depth = (r - horizonRow) / Math.max(1, rows - horizonRow);
        for (let c = 0; c < cols; c++) {
          const bayer = BAYER_4X4[r & 3][c & 3] / 16;
          bgCtx.fillStyle = depth > bayer ? waterDeep : waterBase;
          bgCtx.fillRect(c, r, 1, 1);
        }
      }

      bgCtx.fillStyle = theme === "light" ? "rgba(255, 240, 198, 0.72)" : "rgba(0, 225, 255, 0.5)";
      bgCtx.fillRect(0, horizonRow, cols, 1);

      clouds = Array.from({ length: 7 }, (_, i) => ({
        x: (cols / 7) * i + Math.random() * 20,
        y: Math.floor(rows * (0.08 + Math.random() * 0.26)),
        w: 16 + Math.floor(Math.random() * 18),
        speed: 0.02 + Math.random() * 0.022,
        layer: i % 2,
      }));

      motes = Array.from({ length: 50 }, () => ({
        x: Math.random() * cols,
        y: Math.random() * horizonRow,
        vx: (Math.random() - 0.5) * 0.035,
        vy: -0.012 - Math.random() * 0.025,
        phase: Math.random() * Math.PI * 2,
        twinkle: 0.035 + Math.random() * 0.04,
      }));
    };

    const drawAnimatedFrame = (tick: number) => {
      // Single ultra-fast blit of pre-rendered static background
      ctx.drawImage(bgCanvas, 0, 0);

      // Animated Stars / Sunlit Motes
      for (const m of motes) {
        if (theme === "light" && !reduced) {
          m.x += m.vx;
          m.y += m.vy;
          if (m.y < 0) m.y = horizonRow;
          if (m.x < 0) m.x = cols;
          if (m.x > cols) m.x = 0;
        }
        const alpha = 0.22 + 0.65 * (0.5 + 0.5 * Math.sin(tick * m.twinkle + m.phase));
        ctx.fillStyle =
          theme === "light"
            ? `rgba(255, 252, 236, ${(alpha * 0.7).toFixed(2)})`
            : `rgba(145, 232, 255, ${alpha.toFixed(2)})`;
        ctx.fillRect(Math.floor(m.x), Math.floor(m.y), 1, 1);
      }

      // Shooting Meteors (Dark Mode)
      if (theme === "dark" && !reduced) {
        if (Math.random() < 0.014 && meteors.length < 2) {
          meteors.push({
            x: Math.random() * cols * 0.7,
            y: Math.random() * horizonRow * 0.35,
            vx: 1.5 + Math.random() * 0.9,
            vy: 0.6 + Math.random() * 0.4,
            life: 0,
            maxLife: 22 + Math.floor(Math.random() * 12),
          });
        }
        meteors = meteors.filter((met) => met.life < met.maxLife);
        for (const met of meteors) {
          met.x += met.vx;
          met.y += met.vy;
          met.life++;
          const fade = 1 - met.life / met.maxLife;
          for (let t = 0; t < 6; t++) {
            const tx = Math.floor(met.x - met.vx * t * 0.65);
            const ty = Math.floor(met.y - met.vy * t * 0.65);
            const ta = fade * (1 - t / 6);
            ctx.fillStyle = t === 0 ? `rgba(255,255,255,${ta})` : `rgba(0,225,255,${ta * 0.85})`;
            ctx.fillRect(tx, ty, 1, 1);
          }
        }
      }

      // Drifting Pixel Clouds
      for (const cl of clouds) {
        if (!reduced) {
          cl.x += cl.speed * (cl.layer === 0 ? 0.65 : 1.1);
          if (cl.x > cols + 20) cl.x = -cl.w - 10;
        }
        const cx = Math.floor(cl.x);
        const cy = cl.y;
        ctx.fillStyle =
          theme === "light"
            ? cl.layer === 0
              ? "rgba(255, 251, 240, 0.5)"
              : "rgba(255, 253, 248, 0.74)"
            : cl.layer === 0
            ? "rgba(14, 34, 68, 0.48)"
            : "rgba(22, 54, 102, 0.42)";

        ctx.fillRect(cx + 4, cy, cl.w - 8, 1);
        ctx.fillRect(cx + 2, cy + 1, cl.w - 4, 1);
        ctx.fillRect(cx, cy + 2, cl.w, 2);
        ctx.fillRect(cx + 3, cy + 4, cl.w - 6, 1);
      }

      // Water Orb Shimmer Ripples
      for (let r = horizonRow + 2; r < rows; r += 2) {
        const depth = (r - horizonRow) / Math.max(1, rows - horizonRow);
        const rippleShift = reduced
          ? 0
          : Math.round(Math.sin(r * 0.65 + tick * 0.14) * (1 + depth * 2));
        const width = Math.max(2, Math.floor(orbRadius * (1.1 - depth * 0.55)));
        const sx = orbX - rippleShift - Math.floor(width / 2);
        const alpha = (1 - depth * 0.65) * 0.45;
        ctx.fillStyle =
          theme === "light"
            ? `rgba(255, 245, 210, ${alpha.toFixed(2)})`
            : `rgba(0, 225, 255, ${alpha.toFixed(2)})`;
        ctx.fillRect(sx, r, width, 1);
      }
    };

    rebuildStaticScene();
    window.addEventListener("resize", rebuildStaticScene);

    let tick = 0;
    let last = 0;
    const loop = (now: number) => {
      if (now - last >= 45) {
        last = now;
        tick++;
        drawAnimatedFrame(tick);
      }
      animId = requestAnimationFrame(loop);
    };

    if (reduced) {
      drawAnimatedFrame(0);
    } else {
      animId = requestAnimationFrame(loop);
    }

    return () => {
      window.removeEventListener("resize", rebuildStaticScene);
      cancelAnimationFrame(animId);
    };
  }, [theme]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="pixelated"
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          width: "100vw",
          height: "100vh",
          zIndex: 0,
          pointerEvents: "none",
        }}
      />
      <div className="cinematic-vignette" aria-hidden="true" />
      <div className="film-grain" aria-hidden="true" />
    </>
  );
};
