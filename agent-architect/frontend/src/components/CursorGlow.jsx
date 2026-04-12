import { useEffect, useRef, useState } from 'react';

/**
 * Cursor glow — a subtle radial gradient that follows the mouse.
 * Adds ambient lighting effect across the entire app.
 */
export default function CursorGlow() {
  const glowRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (glowRef.current) {
        glowRef.current.style.left = `${e.clientX}px`;
        glowRef.current.style.top = `${e.clientY}px`;
        if (!visible) setVisible(true);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [visible]);

  return (
    <div
      ref={glowRef}
      className="cursor-glow"
      style={{ opacity: visible ? 1 : 0 }}
    />
  );
}
