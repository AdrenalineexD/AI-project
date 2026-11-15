import React, { useEffect, useRef } from 'react';
import type { BEDetection } from '../types/backend';

interface DetectionOverlayProps {
  detections: BEDetection[];
  width?: number | string;
  height?: number | string;
  className?: string;
  showLabels?: boolean;
  sourceWidth?: number;
  sourceHeight?: number;
}

/**
 * Tactical HUD bounding-box overlay.
 * Draws animated, glowing boxes with corner brackets for every detection.
 */
export const DetectionOverlay: React.FC<DetectionOverlayProps> = ({
  detections,
  width = '100%',
  height = '100%',
  className = '',
  showLabels = true,
  sourceWidth,
  sourceHeight,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let time = 0;

    const render = () => {
      time += 0.03;
      const rect = container.getBoundingClientRect();
      const cw = rect.width || 640;
      const ch = rect.height || 360;

      const dpr = window.devicePixelRatio || 1;
      const wantW = Math.round(cw * dpr);
      const wantH = Math.round(ch * dpr);
      if (canvas.width !== wantW || canvas.height !== wantH) {
        canvas.width = wantW;
        canvas.height = wantH;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cw, ch);

      const srcW = sourceWidth && sourceWidth > 0 ? sourceWidth : 640;
      const srcH = sourceHeight && sourceHeight > 0 ? sourceHeight : 480;

      for (let idx = 0; idx < detections.length; idx++) {
        const det = detections[idx];
        let x = 0, y = 0, w = 0, h = 0;
        let valid = false;

        if (det.bbox && det.bbox.length === 4) {
          const [bx1, by1, bx2, by2] = det.bbox;
          if (bx1 <= 1 && by1 <= 1 && bx2 <= 1 && by2 <= 1) {
            x = bx1 * cw; y = by1 * ch;
            w = (bx2 - bx1) * cw; h = (by2 - by1) * ch;
          } else {
            x = (bx1 / srcW) * cw; y = (by1 / srcH) * ch;
            w = ((bx2 - bx1) / srcW) * cw; h = ((by2 - by1) / srcH) * ch;
          }
          valid = true;
        }

        if (!valid || w < 4 || h < 4) continue;
        const rx = Math.max(2, x), ry = Math.max(2, y);
        const rw = Math.min(cw - rx - 2, w), rh = Math.min(ch - ry - 2, h);
        if (rw < 4 || rh < 4) continue;

        const clsLower = (det.class || 'object').toLowerCase();
        const isFire = clsLower.includes('fire') || clsLower.includes('flame');
        const isSmoke = clsLower.includes('smoke');
        const isPerson = clsLower === 'person';

        const mainColor = isFire ? '#ff3300' : isSmoke ? '#ffaa00' : isPerson ? '#00f0ff' : '#6ab0ff';
        const glowColor = isFire ? 'rgba(255,51,0,0.18)' : isSmoke ? 'rgba(255,170,0,0.16)' : 'rgba(106,176,255,0.14)';
        const emphasized = isFire || isSmoke;
        const confPercent = Math.round((det.confidence || 0) * 100);

        ctx.fillStyle = glowColor;
        ctx.fillRect(rx, ry, rw, rh);

        ctx.shadowColor = mainColor;
        ctx.shadowBlur = emphasized ? 14 + Math.sin(time * 4) * 4 : 8;
        ctx.strokeStyle = mainColor;
        ctx.lineWidth = emphasized ? 2.2 : 1.6;
        ctx.strokeRect(rx, ry, rw, rh);

        const cornerLen = Math.min(rw, rh, emphasized ? 22 : 14);
        ctx.lineWidth = emphasized ? 3.5 : 2.5;
        ctx.strokeStyle = '#ffffff';
        ctx.shadowBlur = 10;

        [[rx, ry, rx + cornerLen, ry, rx, ry + cornerLen],
         [rx + rw - cornerLen, ry, rx + rw, ry, rx + rw, ry + cornerLen],
         [rx, ry + rh - cornerLen, rx, ry + rh, rx + cornerLen, ry + rh],
         [rx + rw - cornerLen, ry + rh, rx + rw, ry + rh, rx + rw, ry + rh - cornerLen]
        ].forEach(([ax, ay, bx, by, cx, cy]) => {
          ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(cx, cy); ctx.stroke();
        });

        if (emphasized) {
          const cx = rx + rw / 2, cy = ry + rh / 2;
          ctx.lineWidth = 1; ctx.strokeStyle = mainColor; ctx.shadowBlur = 8;
          ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2);
          ctx.moveTo(cx - 10, cy); ctx.lineTo(cx + 10, cy);
          ctx.moveTo(cx, cy - 10); ctx.lineTo(cx, cy + 10);
          ctx.stroke();
        }

        if (showLabels) {
          const labelText = `${(det.class || 'object').toUpperCase()}  ${confPercent}%`;
          ctx.font = emphasized ? '700 12px Inter, system-ui, sans-serif' : '500 11px Inter, system-ui, sans-serif';
          const textWidth = ctx.measureText(labelText).width;
          const padX = 8, badgeW = textWidth + padX * 2;
          const badgeH = emphasized ? 22 : 20;
          const badgeX = rx, badgeY = Math.max(2, ry - badgeH - 3);

          ctx.shadowBlur = 0;
          ctx.fillStyle = emphasized ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.7)';
          ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
          ctx.fillStyle = mainColor;
          ctx.fillRect(badgeX, badgeY, 3, badgeH);
          ctx.fillStyle = emphasized ? mainColor : '#e6ecf5';
          ctx.fillText(labelText, badgeX + padX + 2, badgeY + badgeH - 7);
        }
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => { cancelAnimationFrame(animId); };
  }, [detections, showLabels, sourceWidth, sourceHeight]);

  return (
    <div
      ref={containerRef}
      className={'wf-overlay-root ' + className}
      style={{ position: 'relative', width, height }}
    >
      <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />
    </div>
  );
};

export default DetectionOverlay;
