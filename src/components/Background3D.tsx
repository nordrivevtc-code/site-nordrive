import React, { useEffect, useRef } from 'react';

export const Background3D: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animationFrameId: number;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = window.innerWidth;
    let height = window.innerHeight;

    const setupCanvas = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };

    setupCanvas();
    window.addEventListener('resize', setupCanvas);

    // Mouse & Scroll Parallax State
    let targetMouseX = 0;
    let targetMouseY = 0;
    let currentMouseX = 0;
    let currentMouseY = 0;
    let targetScrollY = window.scrollY;
    let currentScrollY = window.scrollY;

    const handleMouseMove = (e: MouseEvent) => {
      targetMouseX = (e.clientX / width) * 2 - 1;
      targetMouseY = (e.clientY / height) * 2 - 1;
    };

    const handleScroll = () => {
      targetScrollY = window.scrollY;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('scroll', handleScroll, { passive: true });

    let phase = 0;

    const render = () => {
      currentMouseX += (targetMouseX - currentMouseX) * 0.04;
      currentMouseY += (targetMouseY - currentMouseY) * 0.04;
      currentScrollY += (targetScrollY - currentScrollY) * 0.08;
      phase += 0.008;

      // 1. BASE STUDIO BACKDROP (Rich Midnight Slate Studio Gradient)
      const baseGrad = ctx.createLinearGradient(0, 0, 0, height);
      baseGrad.addColorStop(0, '#0c131c');
      baseGrad.addColorStop(0.3, '#111a26');
      baseGrad.addColorStop(0.65, '#0e1622');
      baseGrad.addColorStop(1, '#080d14');
      ctx.fillStyle = baseGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. CENTRAL LUXURY STUDIO SOFTBOX / SPOTLIGHT (Follows Mouse with Depth)
      const spotX = width * 0.5 + currentMouseX * 40;
      const spotY = height * 0.3 + currentMouseY * 30 - (currentScrollY * 0.12) % height;
      const spotRadius = Math.max(width * 0.65, height * 0.55);

      const spotGrad = ctx.createRadialGradient(spotX, spotY, 0, spotX, spotY, spotRadius);
      spotGrad.addColorStop(0, 'rgba(56, 88, 124, 0.28)');
      spotGrad.addColorStop(0.4, 'rgba(38, 60, 86, 0.15)');
      spotGrad.addColorStop(0.8, 'rgba(18, 28, 42, 0.05)');
      spotGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = spotGrad;
      ctx.fillRect(0, 0, width, height);

      // 3. WARM CHAMPAGNE GOLD ACCENT LIGHT (Upper-right soft reflection)
      const goldSpotX = width * 0.75 + currentMouseX * 25;
      const goldSpotY = height * 0.15 + currentMouseY * 15;
      const goldRadius = width * 0.5;

      const goldGrad = ctx.createRadialGradient(goldSpotX, goldSpotY, 0, goldSpotX, goldSpotY, goldRadius);
      goldGrad.addColorStop(0, 'rgba(230, 200, 117, 0.09)');
      goldGrad.addColorStop(0.45, 'rgba(200, 160, 70, 0.03)');
      goldGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = goldGrad;
      ctx.fillRect(0, 0, width, height);

      // 4. SATIN STUDIO HORIZON & REFLECTIVE FLOOR GLOW (Bottom Studio Floor)
      const floorY = height * 0.74 - (currentScrollY * 0.2) % (height * 0.5);
      const floorHeight = height - floorY;

      if (floorHeight > 0) {
        ctx.save();
        // Soft Horizon Light Rim
        const rimGrad = ctx.createLinearGradient(0, floorY - 30, 0, floorY + 40);
        rimGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        rimGrad.addColorStop(0.45, 'rgba(120, 148, 175, 0.15)');
        rimGrad.addColorStop(0.55, 'rgba(255, 255, 255, 0.08)');
        rimGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = rimGrad;
        ctx.fillRect(0, floorY - 30, width, 70);

        // Polished Studio Floor Sheen
        const floorGrad = ctx.createLinearGradient(0, floorY, 0, height);
        floorGrad.addColorStop(0, 'rgba(16, 24, 32, 0.6)');
        floorGrad.addColorStop(0.5, 'rgba(12, 18, 25, 0.85)');
        floorGrad.addColorStop(1, 'rgba(8, 12, 18, 0.98)');
        ctx.fillStyle = floorGrad;
        ctx.fillRect(0, floorY, width, floorHeight);
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', setupCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden',
        background: '#0c131c'
      }}
    >
      <canvas 
        ref={canvasRef} 
        style={{
          position: 'absolute',
          inset: 0,
          display: 'block',
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }} 
      />
    </div>
  );
};
