import { useRef, useState } from 'react';
import { motion } from 'framer-motion';

/**
 * Card with 3D tilt effect on mouse hover.
 * The card subtly rotates towards the cursor and shows
 * a radial spotlight gradient following the mouse position.
 */
export default function TiltCard({ children, className = '', tiltIntensity = 8, spotlightOpacity = 0.08 }) {
  const cardRef = useRef(null);
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 });
  const [spotlight, setSpotlight] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    setTilt({
      rotateX: (0.5 - y) * tiltIntensity,
      rotateY: (x - 0.5) * tiltIntensity,
    });
    setSpotlight({ x: x * 100, y: y * 100 });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ rotateX: 0, rotateY: 0 });
  };

  return (
    <motion.div
      ref={cardRef}
      className={`relative ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      animate={{
        rotateX: tilt.rotateX,
        rotateY: tilt.rotateY,
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{ perspective: 1000, transformStyle: 'preserve-3d' }}
    >
      {/* Spotlight overlay */}
      <div
        className="absolute inset-0 rounded-xl pointer-events-none transition-opacity duration-300 z-10"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(circle at ${spotlight.x}% ${spotlight.y}%, rgba(58, 223, 250, ${spotlightOpacity}), transparent 60%)`,
        }}
      />
      {children}
    </motion.div>
  );
}
