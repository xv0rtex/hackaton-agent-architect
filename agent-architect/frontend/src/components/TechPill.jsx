import { motion } from 'framer-motion';

/**
 * Selectable technology pill for the configurator.
 * Shows icon + name + subtitle. When selected, styled with secondary accent.
 * Uses Framer Motion for tap/hover animations and shake effect on warning.
 */
export default function TechPill({
  icon,
  name,
  subtitle,
  selected = false,
  warning = false,
  onClick,
}) {
  const baseClasses = 'flex flex-col items-start p-4 rounded-xl transition-all duration-300 cursor-pointer relative';
  const selectedClasses = 'glass-panel-strong border-l-2 border-secondary bg-surface-container-highest shadow-[0_0_15px_-5px_#c180ff66]';
  const warningClasses = 'glass-panel border-l-2 border-orange-400 bg-surface-container-highest shadow-[0_0_15px_-5px_#fb923c66]';
  const unselectedClasses = 'bg-surface-container-low hover:bg-surface-container-high border-l-2 border-transparent hover:border-outline-variant/30 group';

  return (
    <motion.button
      onClick={onClick}
      className={`${baseClasses} ${
        warning ? warningClasses : selected ? selectedClasses : unselectedClasses
      } ${selected ? 'glow-ring' : ''}`}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.95 }}
      animate={warning ? { x: [-2, 2, -2, 2, 0] } : { x: 0 }}
      transition={{ 
        x: { duration: 0.3, ease: 'easeInOut' },
        scale: { type: 'spring', stiffness: 400, damping: 25 },
        y: { type: 'spring', stiffness: 400, damping: 25 }
      }}
    >
      <span
        className={`material-symbols-outlined text-2xl mb-3 transition-colors ${
          warning
            ? 'text-orange-400'
            : selected
              ? 'text-secondary drop-shadow-[0_0_8px_#c180ff88]'
              : 'text-outline group-hover:text-primary'
        }`}
        style={selected ? { fontVariationSettings: "'FILL' 1" } : undefined}
      >
        {icon}
      </span>
      <span
        className={`text-sm font-bold transition-colors ${
          selected ? 'text-on-surface' : 'text-on-surface-variant group-hover:text-on-surface'
        }`}
      >
        {name}
      </span>
      <span className={`text-[10px] transition-colors mt-0.5 ${selected ? 'text-secondary/80' : 'text-outline/60 group-hover:text-outline'}`}>
        {subtitle}
      </span>
      
      {/* Background glow when selected */}
      {selected && (
        <div className="absolute inset-0 bg-secondary/5 rounded-xl blur-md -z-10 pointer-events-none" />
      )}
    </motion.button>
  );
}
