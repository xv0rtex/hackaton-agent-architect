import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import TiltCard from '../components/TiltCard';
import ParticleNetwork from '../components/ParticleNetwork';

const CATEGORIES = [
  { id: 'all', label: 'All Agents' },
  { id: 'backend', label: 'Backend' },
  { id: 'frontend', label: 'Frontend' },
  { id: 'database', label: 'Database' },
  { id: 'security', label: 'Security' },
  { id: 'devops', label: 'DevOps' },
  { id: 'qa', label: 'QA' },
  { id: 'ux', label: 'UX/UI' },
];

export default function AgentsPage() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/agents/all')
      .then(res => res.json())
      .then(data => {
        const formatted = data.map(a => {
          let color = 'text-slate-400';
          let icon = 'smart_toy';
          
          switch(a.role) {
            case 'backend': color = 'text-primary'; icon = 'database'; break;
            case 'frontend': color = 'text-secondary'; icon = 'brush'; break;
            case 'security': color = 'text-error'; icon = 'policy'; break;
            case 'database': color = 'text-tertiary-dim'; icon = 'storage'; break;
            case 'devops': color = 'text-slate-300'; icon = 'cloud_sync'; break;
            case 'qa': color = 'text-orange-400'; icon = 'bug_report'; break;
            case 'ux': color = 'text-pink-400'; icon = 'design_services'; break;
          }

          return {
            id: `${a.projectId}-${a.name}`,
            projectId: a.projectId,
            projectName: a.projectName,
            name: a.name || 'Unknown Agent',
            desc: a.description || 'No description assigned.',
            role: a.role || 'general',
            techs: (a.stack || '').split(',').map(s => s.trim()).filter(Boolean),
            icon: icon,
            iconColor: color,
            tagColor: color.replace('text-', 'bg-').replace('-400', '-900/40').replace('-dim', '-dim/20') + ' ' + color,
          };
        });
        setAgents(formatted);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filteredAgents = agents.filter(agent => {
    const matchesCategory = activeCategory === 'all' || agent.role === activeCategory;
    const matchesSearch = (agent.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (agent.desc || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          agent.techs.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <AppLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.5 }}
        className="max-w-7xl mx-auto pb-20 relative"
      >
        <ParticleNetwork particleCount={40} className="opacity-20 fixed pointer-events-none" />

        {/* Header */}
        <header className="mb-12 relative z-10 pt-8">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
             <h1 className="font-headline text-5xl font-bold tracking-tight text-on-surface mb-4 drop-shadow-md">
              Agent <span className="gradient-text-animated">Library</span>
            </h1>
            <p className="text-on-surface-variant text-lg max-w-2xl leading-relaxed font-light">
              Explore the registry of highly specialized neural entities. Deploy pre-configured agents or integrate them into your custom orchestration pipelines.
            </p>
          </motion.div>
        </header>

        {/* Search & Filters */}
        <section className="mb-10 relative z-10 flex flex-col md:flex-row gap-6 justify-between items-center bg-surface-container-low/60 p-6 rounded-2xl glass-panel border border-white/5 shadow-lg">
          
          <div className="flex w-full md:w-auto relative group">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant group-focus-within:text-primary transition-colors">
              search
            </span>
            <input 
              type="text" 
              placeholder="Search by name, capability, or tech..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full md:w-96 bg-surface-container-highest border border-outline-variant/30 focus:border-primary/50 focus:ring-0 text-sm py-3 pl-12 pr-4 rounded-xl text-on-surface placeholder:text-outline-variant/70 transition-all shadow-inner"
            />
          </div>

          <div className="flex flex-wrap gap-2 w-full md:w-auto overflow-x-auto custom-scrollbar pb-2 md:pb-0">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-lg text-xs font-bold tracking-widest uppercase transition-all whitespace-nowrap ${
                  activeCategory === cat.id
                    ? 'bg-primary/20 text-primary border border-primary/40 shadow-[0_0_10px_-2px_#3adffa88]'
                    : 'bg-black/20 text-slate-400 border border-transparent hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </section>

        {/* Results Grid */}
        <section className="relative z-10 min-h-[500px]">
          <AnimatePresence mode="wait">
            <motion.div 
              key={activeCategory + searchQuery}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              {filteredAgents.length > 0 ? (
                filteredAgents.map((agent, i) => (
                  <motion.div
                    key={agent.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="h-full"
                  >
                    <TiltCard tiltIntensity={4} className="bg-surface-container-low/40 p-[1px] rounded-2xl group h-full hover:bg-gradient-to-br from-primary/30 to-secondary/30 transition-all duration-500">
                      <div className="bg-surface-container-highest/95 backdrop-blur-md p-6 rounded-2xl h-full flex flex-col items-start relative overflow-hidden transition-all duration-300 group-hover:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.8)] border border-transparent group-hover:border-white/5">
                        
                        {/* Background subtle glow */}
                        <div className={`absolute -top-10 -right-10 w-32 h-32 blur-[40px] opacity-10 group-hover:opacity-30 transition-opacity bg-current ${agent.iconColor.replace('text-', 'bg-')}`} />

                        <div className="flex justify-between items-start w-full mb-6 relative z-10">
                          <span className={`material-symbols-outlined text-4xl ${agent.iconColor} drop-shadow-[0_0_8px_currentColor] opacity-90 group-hover:opacity-100 group-hover:scale-110 transition-transform`} style={{ fontVariationSettings: "'FILL' 1" }}>
                            {agent.icon}
                          </span>
                          <span className={`px-2.5 py-1 rounded text-[9px] uppercase tracking-[0.15em] font-bold shadow-sm ${agent.iconColor.replace('text-', 'text-').replace('-400', '').replace('-dim', '')} border border-white/10 bg-black/40`}>
                            {agent.projectName || `Project #${agent.projectId}`}
                          </span>
                        </div>
                        
                        <h4 className="text-xl font-headline font-bold mb-1 text-on-surface tracking-wide">{agent.name}</h4>
                        <p className={`text-[10px] uppercase font-bold tracking-widest mb-3 ${agent.iconColor}`}>{agent.role}</p>
                        <p className="text-on-surface-variant text-xs leading-relaxed mb-6 flex-1">{agent.desc}</p>
                        
                        <div className="flex flex-wrap gap-1.5 mt-auto w-full">
                          {agent.techs.map((t) => (
                            <span key={t} className="text-[9px] bg-black/40 px-2.5 py-1 rounded-md text-slate-400 font-mono tracking-wider border border-white/5 group-hover:border-white/10 transition-colors uppercase">
                              {t}
                            </span>
                          ))}
                        </div>
                        
                        <button 
                          onClick={() => navigate(`/project/${agent.projectId}/orchestration`)}
                          className="mt-4 w-full text-center py-2 text-xs font-bold uppercase tracking-widest text-outline hover:text-white border border-white/10 rounded-lg hover:bg-white/5 transition-all"
                        >
                          View in Project
                        </button>
                      </div>
                    </TiltCard>
                  </motion.div>
                ))
              ) : (
                <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-500">
                  <span className="material-symbols-outlined text-6xl mb-4 opacity-20">search_off</span>
                  <p className="text-lg font-headline">No agents match your criteria</p>
                  <p className="text-sm font-light mt-1">Try adjusting your search or filters</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </section>
      </motion.div>
    </AppLayout>
  );
}
