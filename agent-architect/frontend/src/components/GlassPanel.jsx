/**
 * Glassmorphism panel component — reusable container with
 * frosted glass effect as per the design system.
 */
export default function GlassPanel({ children, className = '', ...props }) {
  return (
    <div className={`glass-panel rounded-xl ${className}`} {...props}>
      {children}
    </div>
  );
}
