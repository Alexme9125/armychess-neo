import React, { useEffect, useRef } from 'react';
import { FluidEvent } from '@shared/types';
import { sound } from '../hooks/useAudio';

interface Point {
  x: number;
  y: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  decay: number;
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
}

interface FluidCanvasProps {
  fluidEvent: FluidEvent | null;
  getPointCoords: (boardIndex: number) => Point | null;
  onAnimationComplete?: () => void;
}

export const FluidCanvas: React.FC<FluidCanvasProps> = ({
  fluidEvent,
  getPointCoords,
  onAnimationComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameId = useRef<number | null>(null);

  useEffect(() => {
    if (!fluidEvent) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Scale for high DPI
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const fromCoord = getPointCoords(fluidEvent.fromPos);
    const toCoord = getPointCoords(fluidEvent.toPos);

    if (!toCoord) {
      onAnimationComplete?.();
      return;
    }

    const startCoord = fromCoord || { x: toCoord.x - 20, y: toCoord.y };

    if (fluidEvent.type === 'fusion') {
      sound.playLiquidFusion();
      runFusionAnimation(ctx, rect.width, rect.height, startCoord, toCoord, fluidEvent);
    } else if (fluidEvent.type === 'splash') {
      sound.playLiquidSplash();
      runSplashAnimation(ctx, rect.width, rect.height, startCoord, toCoord, fluidEvent);
    }

    return () => {
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
      }
    };
  }, [fluidEvent]);

  // -------------------------------------------------------------
  // METABALL VISCOUS SURFACE TENSION PATH
  // -------------------------------------------------------------
  const drawMetaball = (
    ctx: CanvasRenderingContext2D,
    x1: number, y1: number, r1: number,
    x2: number, y2: number, r2: number,
    pinch = 0.5
  ) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const d = Math.hypot(dx, dy);

    if (d <= Math.abs(r1 - r2) || d > r1 + r2 + 40) {
      ctx.beginPath();
      ctx.arc(x1, y1, Math.max(1, r1), 0, Math.PI * 2);
      ctx.arc(x2, y2, Math.max(1, r2), 0, Math.PI * 2);
      return;
    }

    const angle = Math.atan2(dy, dx);
    const u1 = Math.acos(Math.max(-1, Math.min(1, (r1 - r2) / d)));
    const u2 = Math.PI - u1;

    // Tangent points on circle 1
    const p1x = x1 + r1 * Math.cos(angle + u1);
    const p1y = y1 + r1 * Math.sin(angle + u1);
    const p2x = x1 + r1 * Math.cos(angle - u1);
    const p2y = y1 + r1 * Math.sin(angle - u1);

    // Tangent points on circle 2
    const p3x = x2 + r2 * Math.cos(angle + Math.PI - u2);
    const p3y = y2 + r2 * Math.sin(angle + Math.PI - u2);
    const p4x = x2 + r2 * Math.cos(angle - Math.PI + u2);
    const p4y = y2 + r2 * Math.sin(angle - Math.PI + u2);

    // Pinched control points for surface tension waist
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const handleLen = d * 0.35 * pinch;

    const normalX = -Math.sin(angle);
    const normalY = Math.cos(angle);

    const c1x = midX + normalX * handleLen;
    const c1y = midY + normalY * handleLen;
    const c2x = midX - normalX * handleLen;
    const c2y = midY - normalY * handleLen;

    ctx.beginPath();
    ctx.arc(x1, y1, r1, angle - u1, angle + u1);
    ctx.quadraticCurveTo(c1x, c1y, p3x, p3y);
    ctx.arc(x2, y2, r2, angle + Math.PI - u2, angle - Math.PI + u2);
    ctx.quadraticCurveTo(c2x, c2y, p2x, p2y);
    ctx.closePath();
  };

  // -------------------------------------------------------------
  // 1. LIQUID FUSION IMPACT ANIMATION (Capturing Piece Conquers Station)
  // -------------------------------------------------------------
  const runFusionAnimation = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    _fromPos: Point,
    target: Point,
    event: FluidEvent
  ) => {
    const startTime = performance.now();
    const duration = 500; // ms (crisp, snappy fluid impact)

    const winnerIsBlack = event.winnerColor === 'black';

    // 3 concentric fluid ripples bursting outward on impact
    const ripples: Ripple[] = [
      { x: target.x, y: target.y, radius: 14, maxRadius: 65, alpha: 0.9, color: winnerIsBlack ? 'rgba(168, 85, 247, ' : 'rgba(56, 189, 248, ' },
      { x: target.x, y: target.y, radius: 6, maxRadius: 48, alpha: 0.75, color: 'rgba(255, 255, 255, ' },
      { x: target.x, y: target.y, radius: 2, maxRadius: 32, alpha: 0.6, color: winnerIsBlack ? 'rgba(216, 180, 254, ' : 'rgba(253, 224, 71, ' },
    ];

    // Splashing satellite fluid beads of the absorbed/dissolved enemy piece
    const particles: Particle[] = [];
    for (let i = 0; i < 22; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3.6 + 1.4;
      particles.push({
        x: target.x,
        y: target.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.7, // Flatter horizontal perspective
        radius: Math.random() * 2.8 + 1.2,
        color: winnerIsBlack 
          ? (i % 2 === 0 ? 'rgba(168, 85, 247, 0.95)' : 'rgba(216, 180, 254, 0.9)')
          : (i % 2 === 0 ? 'rgba(56, 189, 248, 0.95)' : 'rgba(253, 224, 71, 0.9)'),
        alpha: 1.0,
        decay: 0.028,
      });
    }

    const frame = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1.0);

      ctx.clearRect(0, 0, width, height);

      // 1. Initial Impact Shockwave Flash Ring around station (0 -> 0.28)
      if (progress < 0.28) {
        const pFlash = progress / 0.28;
        const flashAlpha = (1 - pFlash) * 0.85;
        const flashRadius = 18 + pFlash * 32;

        ctx.save();
        ctx.beginPath();
        ctx.ellipse(target.x, target.y, flashRadius * 1.35, flashRadius * 0.8, 0, 0, Math.PI * 2);
        ctx.strokeStyle = winnerIsBlack ? `rgba(192, 132, 252, ${flashAlpha})` : `rgba(56, 189, 248, ${flashAlpha})`;
        ctx.lineWidth = 3.5 * (1 - pFlash);
        ctx.stroke();
        ctx.restore();
      }

      // 2. Expanding Concentric Water Ripples
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.radius += 1.9;
        r.alpha = Math.max(0, r.alpha - 0.036);

        ctx.save();
        ctx.beginPath();
        ctx.ellipse(r.x, r.y, r.radius * 1.35, r.radius * 0.75, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `${r.color}${r.alpha})`;
        ctx.lineWidth = 2.2;
        ctx.stroke();
        ctx.restore();

        if (r.alpha <= 0) ripples.splice(i, 1);
      }

      // 3. Splashing Fluid Droplet Beads dispersing into ambient space
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.vx *= 0.92;
        p.vy *= 0.92;
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;

        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.5, p.radius * Math.max(0, p.alpha)), 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.restore();

        if (p.alpha <= 0) particles.splice(i, 1);
      }

      if (progress < 1.0) {
        animFrameId.current = requestAnimationFrame(frame);
      } else {
        ctx.clearRect(0, 0, width, height);
        onAnimationComplete?.();
      }
    };

    animFrameId.current = requestAnimationFrame(frame);
  };

  const metaGradColor = (grad: CanvasGradient, isBlack: boolean) => {
    if (isBlack) {
      grad.addColorStop(0, '#581c87');
      grad.addColorStop(0.5, '#1e1b4b');
      grad.addColorStop(1, '#09090b');
    } else {
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.5, '#fef08a');
      grad.addColorStop(0.8, '#bae6fd');
      grad.addColorStop(1, '#64748b');
    }
  };

  // -------------------------------------------------------------
  // 2. LIQUID SPLASH ANIMATION (Mutual Destruction Collision)
  // -------------------------------------------------------------
  const runSplashAnimation = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    _from: Point,
    target: Point,
    _event: FluidEvent
  ) => {
    const startTime = performance.now();
    const duration = 750; // ms

    const midX = target.x;
    const midY = target.y;

    // 55 splashing mica beads
    const droplets: Particle[] = [];
    const colors = [
      'rgba(255, 255, 255, 0.95)',
      'rgba(168, 85, 247, 0.85)',
      'rgba(56, 189, 248, 0.9)',
      'rgba(253, 224, 71, 0.85)',
      'rgba(30, 41, 59, 0.9)',
    ];

    for (let i = 0; i < 55; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 6.5 + 2.0;
      droplets.push({
        x: midX,
        y: midY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.7, // Flatter horizontal dispersal
        radius: Math.random() * 4.0 + 1.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1.0,
        decay: Math.random() * 0.025 + 0.015,
      });
    }

    const ripples: Ripple[] = [
      { x: midX, y: midY, radius: 8, maxRadius: 75, alpha: 0.9, color: 'rgba(255, 255, 255, ' },
      { x: midX, y: midY, radius: 4, maxRadius: 55, alpha: 0.75, color: 'rgba(56, 189, 248, ' },
      { x: midX, y: midY, radius: 2, maxRadius: 40, alpha: 0.8, color: 'rgba(168, 85, 247, ' },
    ];

    const frame = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1.0);

      ctx.clearRect(0, 0, width, height);

      // 1. Initial Shockwave Flash
      if (progress < 0.18) {
        const flashAlpha = (1 - progress / 0.18) * 0.8;
        const flashGrad = ctx.createRadialGradient(midX, midY, 2, midX, midY, 50);
        flashGrad.addColorStop(0, `rgba(255, 255, 255, ${flashAlpha})`);
        flashGrad.addColorStop(0.5, `rgba(56, 189, 248, ${flashAlpha * 0.7})`);
        flashGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');

        ctx.save();
        ctx.beginPath();
        ctx.ellipse(midX, midY, 60, 36, 0, 0, Math.PI * 2);
        ctx.fillStyle = flashGrad;
        ctx.fill();
        ctx.restore();
      }

      // 2. Ripples
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.radius += 2.4;
        r.alpha = Math.max(0, r.alpha - 0.028);

        ctx.save();
        ctx.beginPath();
        ctx.ellipse(r.x, r.y, r.radius * 1.3, r.radius * 0.75, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `${r.color}${r.alpha})`;
        ctx.lineWidth = 2.0;
        ctx.stroke();
        ctx.restore();

        if (r.alpha <= 0) ripples.splice(i, 1);
      }

      // 3. Spray Droplets
      for (let i = droplets.length - 1; i >= 0; i--) {
        const d = droplets[i];
        d.vx *= 0.93;
        d.vy *= 0.93;
        d.x += d.vx;
        d.y += d.vy;
        d.alpha -= d.decay;

        ctx.save();
        ctx.beginPath();
        ctx.arc(d.x, d.y, Math.max(0.3, d.radius * d.alpha), 0, Math.PI * 2);
        ctx.fillStyle = d.color;
        ctx.shadowColor = d.color;
        ctx.shadowBlur = 5;
        ctx.globalAlpha = Math.max(0, d.alpha);
        ctx.fill();
        ctx.restore();

        if (d.alpha <= 0) droplets.splice(i, 1);
      }

      if (progress < 1.0 && droplets.length > 0) {
        animFrameId.current = requestAnimationFrame(frame);
      } else {
        ctx.clearRect(0, 0, width, height);
        onAnimationComplete?.();
      }
    };

    animFrameId.current = requestAnimationFrame(frame);
  };

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-30 h-full w-full"
    />
  );
};
