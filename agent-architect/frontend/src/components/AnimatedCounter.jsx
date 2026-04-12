import { useEffect, useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';

/**
 * Animated number counter — counts from 0 to target value when visible.
 * Supports suffix (e.g., '%', 'ms', 'k+').
 */
export default function AnimatedCounter({ value, suffix = '', duration = 2, className = '' }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);

  // Extract numeric value
  const numericValue = parseFloat(value.toString().replace(/[^0-9.]/g, ''));
  const hasDecimal = value.toString().includes('.');
  const prefix = value.toString().match(/^[^0-9]*/)?.[0] || '';

  useEffect(() => {
    if (!isInView) return;

    const startTime = Date.now();
    const endTime = startTime + duration * 1000;

    const tick = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / (duration * 1000), 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = eased * numericValue;

      setCount(current);

      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    };

    requestAnimationFrame(tick);
  }, [isInView, numericValue, duration]);

  const displayValue = hasDecimal ? count.toFixed(1) : Math.round(count);

  return (
    <motion.span
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6 }}
    >
      {prefix}{displayValue}{suffix}
    </motion.span>
  );
}
