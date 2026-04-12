import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

/**
 * Scroll-triggered reveal animation wrapper.
 * Elements animate in when they enter the viewport.
 *
 * @param {'fadeUp'|'fadeIn'|'scaleIn'|'slideLeft'|'slideRight'} variant
 * @param {number} delay — additional delay in seconds
 * @param {boolean} once — only animate once (default true)
 */

const variants = {
  fadeUp: {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0 },
  },
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
  scaleIn: {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1 },
  },
  slideLeft: {
    hidden: { opacity: 0, x: 60 },
    visible: { opacity: 1, x: 0 },
  },
  slideRight: {
    hidden: { opacity: 0, x: -60 },
    visible: { opacity: 1, x: 0 },
  },
};

export default function ScrollReveal({
  children,
  variant = 'fadeUp',
  delay = 0,
  duration = 0.6,
  once = true,
  className = '',
  stagger = false,
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once, margin: '-80px' });

  const containerVariants = stagger ? {
    hidden: {},
    visible: {
      transition: { staggerChildren: 0.08, delayChildren: delay },
    },
  } : undefined;

  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={containerVariants || variants[variant]}
      transition={!stagger ? {
        duration,
        delay,
        ease: [0.16, 1, 0.3, 1],
      } : undefined}
    >
      {stagger
        ? children
        : children
      }
    </motion.div>
  );
}

/**
 * Child item for staggered scroll reveal
 */
export function ScrollRevealItem({ children, className = '' }) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0 },
      }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
