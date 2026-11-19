import React, { useEffect, useState } from 'react';
import { Compass, Sparkles } from 'lucide-react';

export const CustomCursor: React.FC = () => {
  const [position, setPosition] = useState({ x: -100, y: -100 });
  const [trailingPosition, setTrailingPosition] = useState({ x: -100, y: -100 });
  const [isHovered, setIsHovered] = useState(false);
  const [isPointer, setIsPointer] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) return;

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
      if (!isVisible) setIsVisible(true);

      const target = e.target as HTMLElement | null;
      if (target) {
        const interactive = target.closest('a, button, input, select, textarea, .dd-card, .dd-radio-chip, [role="button"]');
        setIsPointer(!!interactive);
      }
    };

    const handleMouseDown = () => setIsHovered(true);
    const handleMouseUp = () => setIsHovered(false);
    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseEnter = () => setIsVisible(true);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, [isVisible]);

  useEffect(() => {
    let animationFrameId: number;

    const followCursor = () => {
      setTrailingPosition((prev) => {
        const dx = position.x - prev.x;
        const dy = position.y - prev.y;
        return {
          x: prev.x + dx * 0.2,
          y: prev.y + dy * 0.2,
        };
      });

      animationFrameId = requestAnimationFrame(followCursor);
    };

    animationFrameId = requestAnimationFrame(followCursor);
    return () => cancelAnimationFrame(animationFrameId);
  }, [position]);

  if (!isVisible) return null;

  const followerSize = isPointer ? 52 : isHovered ? 28 : 42;

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: isHovered ? '6px' : '8px',
          height: isHovered ? '6px' : '8px',
          backgroundColor: isPointer ? '#10B981' : '#38BDF8',
          borderRadius: '50%',
          pointerEvents: 'none',
          zIndex: 9999,
          transform: `translate3d(${position.x - (isHovered ? 3 : 4)}px, ${position.y - (isHovered ? 3 : 4)}px, 0)`,
          transition: 'width 0.15s, height 0.15s, background-color 0.2s',
          boxShadow: isPointer ? '0 0 12px #10B981' : '0 0 12px #38BDF8'
        }}
      />

      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: `${followerSize}px`,
          height: `${followerSize}px`,
          pointerEvents: 'none',
          zIndex: 9998,
          transform: `translate3d(${trailingPosition.x - followerSize / 2}px, ${trailingPosition.y - followerSize / 2}px, 0)`,
          transition: 'width 0.25s ease-out, height 0.25s ease-out',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: isPointer ? '50%' : '10px',
            border: isPointer 
              ? '1.5px solid rgba(16, 185, 129, 0.7)' 
              : '1.5px solid rgba(56, 189, 248, 0.55)',
            backgroundColor: isPointer 
              ? 'rgba(16, 185, 129, 0.1)' 
              : 'rgba(56, 189, 248, 0.06)',
            boxShadow: isPointer
              ? '0 0 20px rgba(16, 185, 129, 0.35), inset 0 0 10px rgba(16, 185, 129, 0.15)'
              : '0 0 18px rgba(56, 189, 248, 0.3)',
            transform: isPointer ? 'rotate(0deg)' : 'rotate(45deg)',
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            backdropFilter: isPointer ? 'blur(3px)' : 'none',
          }}
        />

        <div 
          style={{
            position: 'relative',
            zIndex: 1,
            color: isPointer ? '#34D399' : '#7DD3FC',
            opacity: isPointer ? 0.9 : 0.65,
            transform: isPointer ? 'scale(1.1) rotate(45deg)' : 'scale(0.85) rotate(0deg)',
            transition: 'transform 0.3s ease, opacity 0.3s ease, color 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {isPointer ? <Sparkles size={16} /> : <Compass size={14} />}
        </div>
      </div>
    </>
  );
};
