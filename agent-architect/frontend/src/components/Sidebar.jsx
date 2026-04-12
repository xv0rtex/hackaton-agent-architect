import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useProject } from '../context/ProjectContext';

const ROLE_ICON = {
  backend: "database", frontend: "brush", security: "policy",
  database: "storage", devops: "cloud_sync", qa: "bug_report", ux: "design_services"
};

/**
 * Left sidebar — displayed on all internal pages (configurator, chat, orchestration, workspace).
 * Shows project info, navigation, and history.
 */
export default function Sidebar() {
  const location = useLocation();
  const { currentProjectId } = useProject();
  
  const [projectData, setProjectData] = useState(null);
  const [agents, setAgents] = useState([]);

  useEffect(() => {
    if (currentProjectId) {
      fetch(`/api/projects/${currentProjectId}`)
        .then(res => res.json())
        .then(data => {
          setProjectData(data);
          if (data.agentsJson) {
            setAgents(JSON.parse(data.agentsJson));
          } else {
            setAgents([]);
          }
        })
        .catch(console.error);
    } else {
      setProjectData(null);
      setAgents([]);
    }
  }, [currentProjectId, location.pathname]); // re-fetch on navigation in case it was updated

  // Hide sidebar entirely on pure global views if we want, but it's fine to show it empty or just 'Projects' selected.
  // Actually, we're better off returning generic items if no project is active, but /projects has AppLayout padding disabled anyway.

  const navItems = currentProjectId ? [
    { path: `/project/${currentProjectId}/chat`, icon: 'dashboard', label: 'Chat' },
    { path: `/project/${currentProjectId}/orchestration`, icon: 'hub', label: 'Orchestration', filled: true },
    { path: `/project/${currentProjectId}/dry-run`, icon: 'science', label: 'Dry Run' },
    { path: `/project/${currentProjectId}/office`, icon: 'apartment', label: 'Office' },
    { path: `/project/${currentProjectId}/export`, icon: 'download', label: 'Export' },
  ] : [];

  const displayName = projectData?.projectName || projectData?.projectIdea || 'No Project Selected';
  const projectStatus = projectData?.status || 'none';

  const statusLabel =
    projectStatus === 'generated' ? 'Agents Ready' :
    projectStatus === 'configured' ? 'Configured' :
    projectStatus === 'draft' ? 'Draft' :
    '--';

  const statusColor =
    projectStatus === 'generated' ? 'text-tertiary-dim' :
    projectStatus === 'configured' ? 'text-primary' :
    'text-slate-500';

  return (
    <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 flex flex-col py-4 bg-[#060e20] bg-slate-900/50 font-body text-sm tracking-wide z-40">
      {/* Project Header */}
      <div className="px-6 mb-6 shrink-0">
        <div className="flex items-center gap-3 p-3 glass-panel rounded-xl">
          <div className="w-10 h-10 bg-secondary/20 rounded-lg flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>
              hub
            </span>
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-on-surface truncate">{displayName}</h3>
            <p className={`text-[10px] uppercase tracking-wider ${statusColor}`}>{statusLabel}</p>
          </div>
        </div>
      </div>

      {/* New Project Button */}
      <div className="px-4 mb-4">
        <Link
          to="/projects"
          className="w-full py-2.5 bg-secondary/10 hover:bg-secondary/20 border border-secondary/20 text-secondary rounded-lg font-medium flex items-center justify-center gap-2 transition-all duration-200 active:scale-95"
        >
          <span className="material-symbols-outlined text-sm">home</span>
          All Projects
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto custom-scrollbar shrink-0">
        {navItems.map((item) => {
          const isActive = location.pathname.includes(item.path);
          return (
            <div key={item.label}>
              <Link
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 transition-all ease-in-out duration-200 ${
                  isActive
                    ? 'bg-white/5 text-purple-400 border-l-2 border-purple-400'
                    : 'text-slate-500 hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                <span
                  className="material-symbols-outlined"
                  style={item.filled && isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
              
              {/* Agents List under Orchestration menu item */}
              {item.label === 'Orchestration' && isActive && agents.length > 0 && (
                <div className="pl-12 pr-4 py-2 space-y-2 bg-black/20">
                  <div className="text-[10px] font-medium tracking-widest text-secondary uppercase mb-2">
                    Agents ({agents.length})
                  </div>
                  {agents.map((a, i) => {
                    const role = (a.role || "backend").toLowerCase();
                    const icon = ROLE_ICON[role] || "smart_toy";
                    
                    let colorClass = 'text-primary border-primary';
                    if (role === 'frontend') colorClass = 'text-secondary border-secondary';
                    if (role === 'security') colorClass = 'text-red-400 border-red-400';
                    if (role === 'database') colorClass = 'text-tertiary border-tertiary';

                    return (
                      <div key={i} className={`flex items-center gap-2 p-2 rounded-lg bg-surface-container border-l-2 ${colorClass.split(' ')[1]} transition-colors hover:bg-white/5`}>
                        <span className={`material-symbols-outlined text-[16px] ${colorClass.split(' ')[0]}`}>{icon}</span>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs text-on-surface truncate font-bold">{a.name || role}</div>
                          <div className={`text-[9px] uppercase tracking-widest truncate ${colorClass.split(' ')[0]}`}>{role}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom Links */}
      <div className="mt-auto border-t border-white/5 pt-4 px-4 space-y-1">
        <a href="#" className="flex items-center gap-3 text-slate-500 px-2 py-2 hover:text-slate-200 transition-colors">
          <span className="material-symbols-outlined">help_outline</span>
          <span>Support</span>
        </a>
        <a href="#" className="flex items-center gap-3 text-slate-500 px-2 py-2 hover:text-slate-200 transition-colors">
          <span className="material-symbols-outlined">description</span>
          <span>Documentation</span>
        </a>
      </div>
    </aside>
  );
}
