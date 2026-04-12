import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import MagneticButton from './MagneticButton';

export default function Navbar({ transparent = false }) {
  const location = useLocation();

  const navLinks = [
    { name: 'Projects', path: '/projects' },
    { name: 'Agents', path: '/agents' },
  ];

  return (
    <nav className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 ease-in-out ${
      transparent 
        ? 'bg-transparent border-transparent' 
        : 'bg-surface-container-low/80 backdrop-blur-xl border-b border-white/5 shadow-sm'
    }`}>
      <div className="flex justify-between items-center px-6 lg:px-12 h-16">
        <div className="flex items-center gap-12">
          {/* Logo */}
          <Link to="/" className="font-headline font-black text-xl tracking-widest text-on-surface uppercase group flex items-center relative">
            <span className="bg-primary/20 w-8 h-8 absolute -left-2 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="relative z-10 group-hover:text-white transition-colors">Agent</span>
            <span className="relative z-10 text-primary ml-1 group-hover:text-primary-dim transition-colors drop-shadow-[0_0_5px_rgba(58,223,250,0.5)]">Architect</span>
          </Link>

          {/* Links */}
          <div className="hidden md:flex items-center gap-6 relative">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path || (link.path !== '/' && location.pathname.startsWith(link.path));
              return (
                <div key={link.path} className="relative py-5">
                  <Link
                    to={link.path}
                    className={`text-sm font-medium transition-colors ${
                      isActive ? 'text-on-surface drop-shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {link.name}
                  </Link>
                  {isActive && (
                    <motion.div
                      layoutId="navbar-indicator"
                      className="absolute bottom-0 left-0 w-full h-[3px] bg-gradient-to-r from-primary to-secondary rounded-t-sm"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center bg-black/20 border border-white/5 rounded-full px-4 py-1.5 focus-within:border-primary/50 focus-within:bg-black/40 transition-all group shadow-inner">
            <span className="material-symbols-outlined text-outline text-sm mr-2 group-focus-within:text-primary transition-colors">search</span>
            <input
              type="text"
              placeholder="Search agents..."
              className="bg-transparent border-none focus:ring-0 text-sm w-48 text-on-surface placeholder:text-outline/70"
            />
          </div>
          
          <button className="material-symbols-outlined text-outline-variant hover:text-primary transition-colors hover:drop-shadow-[0_0_5px_rgba(58,223,250,0.5)]">
            notifications
          </button>
          <button className="material-symbols-outlined text-outline-variant hover:text-primary transition-colors hover:drop-shadow-[0_0_5px_rgba(58,223,250,0.5)]">
            settings
          </button>
          
          <MagneticButton
            to="/projects"
            className="ml-2 bg-gradient-to-br from-primary to-primary-container text-on-primary-container px-5 py-2 rounded-md font-headline font-bold text-sm tracking-wide shadow-[0_0_15px_-5px_#3adffa] hover:shadow-[0_0_20px_-5px_#3adffa] active:scale-95 transition-all"
          >
            New Project
          </MagneticButton>
        </div>
      </div>
    </nav>
  );
}
