import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Layout wrapper for internal pages (configurator, chat, orchestration, workspace).
 * Renders the top navbar + left sidebar + main content area.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children — main content
 * @param {React.ReactNode} [props.rightPanel] — optional right panel (e.g. context panel in chat)
 * @param {boolean} [props.noPadding] — disable default padding on main area
 */
export default function AppLayout({ children, rightPanel = null, noPadding = false }) {
  return (
    <div className="min-h-screen bg-background dot-grid-bg">
      <Navbar />
      <Sidebar />

      <div className="flex h-screen pt-16">
        {/* Main Content */}
        <main className={`ml-64 flex-1 ${rightPanel ? '' : ''} ${noPadding ? '' : 'p-8'} overflow-auto`}>
          <AnimatePresence mode="wait">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Optional Right Panel */}
        {rightPanel && (
          <aside className="w-80 bg-surface-container-low border-l border-white/5 flex flex-col glass-panel hidden lg:flex shrink-0">
            {rightPanel}
          </aside>
        )}
      </div>
    </div>
  );
}
