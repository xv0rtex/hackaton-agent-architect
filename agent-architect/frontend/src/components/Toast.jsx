import { useState, useEffect } from 'react';

/**
 * Toast notification component — appears at the top-right.
 * Auto-dismisses after a configured duration.
 */
export default function Toast({ message, type = 'warning', duration = 4000, onClose }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const bgColor =
    type === 'error' ? 'bg-error-container border-error/30' :
    type === 'success' ? 'bg-tertiary-container/20 border-tertiary/30' :
    'bg-orange-900/40 border-orange-400/30';

  const textColor =
    type === 'error' ? 'text-on-error-container' :
    type === 'success' ? 'text-tertiary' :
    'text-orange-200';

  const iconName =
    type === 'error' ? 'error' :
    type === 'success' ? 'check_circle' :
    'warning';

  const iconColor =
    type === 'error' ? 'text-error' :
    type === 'success' ? 'text-tertiary' :
    'text-orange-400';

  return (
    <div
      className={`fixed top-20 right-6 z-[100] flex items-center gap-3 px-5 py-3 rounded-lg border backdrop-blur-xl transition-all duration-300 ${bgColor} ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
      }`}
    >
      <span className={`material-symbols-outlined ${iconColor}`}>{iconName}</span>
      <span className={`text-sm ${textColor}`}>{message}</span>
      <button
        onClick={() => { setVisible(false); setTimeout(onClose, 300); }}
        className="material-symbols-outlined text-slate-400 hover:text-white text-sm ml-2"
      >
        close
      </button>
    </div>
  );
}
