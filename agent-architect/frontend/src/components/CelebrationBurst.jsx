import { useEffect, useState } from 'react';

/**
 * Celebration burst — particles explode outward from center.
 * Used when agent generation completes.
 */
export default function CelebrationBurst({ active = false, particleCount = 40 }) {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (!active) return;

    const colors = ['#3adffa', '#c180ff', '#a4ef3f', '#00cbe6', '#e7ffc4', '#dbb4ff'];
    const newParticles = Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      x: 50 + (Math.random() - 0.5) * 10,
      y: 50 + (Math.random() - 0.5) * 10,
      angle: (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5,
      velocity: 2 + Math.random() * 4,
      size: 3 + Math.random() * 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      duration: 1 + Math.random() * 1.5,
      delay: Math.random() * 0.3,
      shape: Math.random() > 0.5 ? 'circle' : 'rect',
    }));

    setParticles(newParticles);

    // Clear after animation
    const timer = setTimeout(() => setParticles([]), 3000);
    return () => clearTimeout(timer);
  }, [active, particleCount]);

  if (particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[200] overflow-hidden">
      {particles.map((p) => {
        const endX = p.x + Math.cos(p.angle) * p.velocity * 15;
        const endY = p.y + Math.sin(p.angle) * p.velocity * 15 + 20;

        return (
          <div
            key={p.id}
            className={p.shape === 'circle' ? 'rounded-full' : 'rounded-sm'}
            style={{
              position: 'absolute',
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              animation: `confettiFall ${p.duration}s cubic-bezier(0.15, 0.8, 0.3, 1) ${p.delay}s forwards`,
              transform: `rotate(${p.rotation}deg)`,
              '--end-x': `${endX - p.x}vw`,
              '--end-y': `${endY - p.y}vh`,
            }}
          />
        );
      })}
    </div>
  );
}
