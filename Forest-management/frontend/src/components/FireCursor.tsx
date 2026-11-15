import { useEffect, useRef } from "react";

/**
 * Full-screen fixed canvas that renders a fire + spark particle field
 * trailing the user's cursor.
 *
 * - Fire blobs are soft, additive, orange-yellow gradient circles.
 * - Sparks are bright, thin streaks that fly upward.
 * - Capped particle count so it never stalls.
 */
export const FireCursor: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const onMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    const onTouch = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) {
        mouse.x = t.clientX;
        mouse.y = t.clientY;
      }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onTouch, { passive: true });

    interface P {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      maxLife: number;
      size: number;
      hue: number;
      kind: "fire" | "spark";
    }
    const particles: P[] = [];
    const MAX = 280;

    const emit = () => {
      for (let i = 0; i < 4; i++) {
        const spread = 26;
        const kind: P["kind"] = Math.random() < 0.82 ? "fire" : "spark";
        const life = kind === "fire" ? 420 + Math.random() * 260 : 260 + Math.random() * 220;
        particles.push({
          x: mouse.x + (Math.random() - 0.5) * spread,
          y: mouse.y + (Math.random() - 0.5) * spread,
          vx: (Math.random() - 0.5) * 0.6,
          vy: -0.35 - Math.random() * 0.9,
          life,
          maxLife: life,
          size: kind === "fire" ? 2.4 + Math.random() * 3.2 : 1.2 + Math.random() * 1.6,
          hue: 12 + Math.random() * 38,
          kind,
        });
      }
      if (particles.length > MAX) particles.splice(0, particles.length - MAX);
    };

    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(32, now - last) / 16.67;
      last = now;

      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      emit();

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy -= 0.008 * dt;
        p.vx *= 0.985;
        p.life -= 16.67 * dt;

        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }

        const t = p.life / p.maxLife;
        const alpha = t * t;
        const size = p.size * (0.4 + t * 0.9);

        if (p.kind === "fire") {
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size * 3);
          grad.addColorStop(0, `hsla(${p.hue}, 100%, 62%, ${alpha * 0.9})`);
          grad.addColorStop(0.35, `hsla(${p.hue - 6}, 100%, 50%, ${alpha * 0.5})`);
          grad.addColorStop(1, `hsla(${p.hue - 12}, 100%, 35%, 0)`);
          ctx.globalCompositeOperation = "lighter";
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, size * 3, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.globalCompositeOperation = "lighter";
          ctx.fillStyle = `hsla(${p.hue + 10}, 100%, 78%, ${alpha})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, size * 0.9, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = `hsla(${p.hue + 5}, 100%, 60%, ${alpha * 0.5})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 6, p.y - p.vy * 6);
          ctx.stroke();
        }
      }

      ctx.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onTouch);
    };
  }, []);

  return <canvas ref={canvasRef} className="wf-fire-cursor" aria-hidden="true" />;
};