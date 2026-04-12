import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';

/**
 * Renders SVG connection lines between agent nodes.
 * Automatically calculates positions of elements with `[data-agent-id]`
 * and draws animated paths between them.
 */
export default function AgentConnectionMap({ active = false, connections = [] }) {
  const [lines, setLines] = useState([]);
  const containerRef = useRef(null);

  // Re-calculate lines when nodes render
  useEffect(() => {
    if (!active || typeof window === 'undefined') return;

    const calculateLines = () => {
      const newLines = [];
      const nodes = document.querySelectorAll('[data-agent-id]');
      const nodeMap = new Map();

      // Collect node center points relative to the container
      nodes.forEach(node => {
        const id = node.getAttribute('data-agent-id');
        const rect = node.getBoundingClientRect();
        
        // Find container offset, default to window offset if not in a relative container
        const containerRect = containerRef.current?.getBoundingClientRect() || { left: 0, top: 0 };
        
        nodeMap.set(id, {
          x: rect.left - containerRect.left + rect.width / 2,
          y: rect.top - containerRect.top + rect.height / 2,
        });
      });

      // We assume a 'Lead Architect' exists and is the hub, connect everyone to it
      const leadId = Array.from(nodeMap.keys()).find(k => k.includes('Architect')) || Array.from(nodeMap.keys())[0];
      
      if (leadId) {
        nodeMap.forEach((point, id) => {
          if (id !== leadId) {
            const leadPoint = nodeMap.get(leadId);
            
            // Draw a curved path
            const midX = (point.x + leadPoint.x) / 2;
            const midY = (point.y + leadPoint.y) / 2;
            
            // Random offset for the control point to make it organic
            const cx = midX + (Math.random() - 0.5) * 100;
            const cy = midY + (Math.random() - 0.5) * 100;
            
            const path = `M ${point.x} ${point.y} Q ${cx} ${cy} ${leadPoint.x} ${leadPoint.y}`;
            newLines.push({ id: `${id}-${leadId}`, path });
          }
        });
      }
      
      setLines(newLines);
    };

    // Calculate immediately, and on resize
    const timer = setTimeout(calculateLines, 500); // Wait for animations to settle
    window.addEventListener('resize', calculateLines);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', calculateLines);
    };
  }, [active, connections]);

  if (!active || lines.length === 0) return null;

  return (
    <div ref={containerRef} className="absolute inset-0 z-0 pointer-events-none">
      <svg className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id="flow-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3adffa" stopOpacity="0" />
            <stop offset="50%" stopColor="#3adffa" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#c180ff" stopOpacity="0" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        
        {lines.map((line, i) => (
          <motion.g key={line.id}>
            {/* Base line */}
            <path
              d={line.path}
              fill="none"
              stroke="rgba(109, 117, 140, 0.1)"
              strokeWidth="1"
            />
            {/* Animated flow line */}
            <motion.path
              d={line.path}
              fill="none"
              stroke="url(#flow-gradient)"
              strokeWidth="2"
              filter="url(#glow)"
              className="flow-path"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ 
                pathLength: { duration: 1.5, delay: i * 0.2 + 0.5, ease: "easeOut" },
                opacity: { duration: 0.5, delay: i * 0.2 + 0.5 }
              }}
            />
          </motion.g>
        ))}
      </svg>
    </div>
  );
}
