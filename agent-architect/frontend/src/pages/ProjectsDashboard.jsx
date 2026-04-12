import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import AppLayout from '../components/AppLayout';
import TiltCard from '../components/TiltCard';
import ParticleNetwork from '../components/ParticleNetwork';
import { useProject } from '../context/ProjectContext';

export default function ProjectsDashboard() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  
  const navigate = useNavigate();
  const { updateState } = useProject();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (err) {
      console.error("Failed to fetch projects", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    
    setIsCreating(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectName: newProjectName })
      });
      
      if (res.ok) {
        const newProject = await res.json();
        updateState({ currentProjectId: newProject.id });
        navigate(`/project/${newProject.id}/chat`);
      }
    } catch (err) {
      console.error("Failed to create project", err);
    } finally {
      setIsCreating(false);
      setShowCreateModal(false);
      setNewProjectName('');
    }
  };

  const confirmDelete = async () => {
    if (!projectToDelete) return;
    
    const id = projectToDelete.id;
    setProjectToDelete(null); // immediately close modal
    
    // Optimizacion UI instantánea (Optimistic update)
    setProjects(prev => prev.filter(p => p.id !== id));
    
    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        // Revertimos recargando si el server falló
        fetchProjects();
        console.error("Server refused to delete project.");
      }
    } catch (err) {
      console.error("Failed to delete", err);
      // Revertimos fallo de conexión
      fetchProjects();
    }
  };

  const navigateToProject = (project) => {
    updateState({ currentProjectId: project.id });
    
    if (project.status === 'draft') {
      navigate(`/project/${project.id}/chat`);
    } else {
      navigate(`/project/${project.id}/orchestration`);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'generated': return 'text-tertiary-dim bg-tertiary-dim/10 border-tertiary-dim/30';
      case 'configured': return 'text-primary bg-primary/10 border-primary/30';
      default: return 'text-secondary bg-secondary/10 border-secondary/30';
    }
  };

  return (
    <AppLayout noPadding>
      <div className="flex flex-col h-[calc(100vh-4rem)] relative overflow-y-auto px-8 py-10 custom-scrollbar">
        <ParticleNetwork particleCount={40} className="opacity-10 fixed pointer-events-none" />

        <div className="max-w-7xl mx-auto w-full relative z-10">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h1 className="font-headline text-4xl font-bold tracking-tight text-on-surface mb-2">
                Your <span className="gradient-text-animated">Projects</span>
              </h1>
              <p className="text-on-surface-variant text-sm">Manage your synthetic agent teams and architectures</p>
            </div>
            
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-primary hover:bg-primary-dim text-on-primary font-bold px-6 py-3 rounded-xl shadow-[0_0_15px_-5px_#3adffa] transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              New Project
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <span className="material-symbols-outlined animate-spin text-primary text-4xl">autorenew</span>
            </div>
          ) : projects.length === 0 ? (
            <div className="glass-panel-strong rounded-2xl p-16 text-center border border-white/5 flex flex-col items-center justify-center">
              <span className="material-symbols-outlined text-6xl text-outline-variant mb-4">folder_open</span>
              <h3 className="font-headline text-xl font-bold text-on-surface mb-2">No projects yet</h3>
              <p className="text-on-surface-variant mb-6">Create your first project to start building your agent team.</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-surface-container-highest border border-outline-variant/30 hover:border-primary/50 text-on-surface px-6 py-3 rounded-xl transition-colors"
              >
                Create Project
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {projects.map((proj, i) => (
                  <motion.div
                    key={proj.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <TiltCard tiltIntensity={2} className="h-full">
                      <div 
                        onClick={() => navigateToProject(proj)}
                        className="glass-panel-strong rounded-2xl p-6 h-full flex flex-col group cursor-pointer border-t border-l border-white/5 hover:border-primary/30 transition-colors relative overflow-hidden"
                      >
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/20 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                        
                        <div className="flex justify-between items-start mb-4 relative z-10">
                          <h3 className="font-headline font-bold text-xl text-on-surface group-hover:text-primary transition-colors truncate">
                            {proj.projectName || proj.projectIdea || `Project #${proj.id}`}
                          </h3>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setProjectToDelete(proj); }}
                            className="text-outline hover:text-error transition-colors p-1"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-2 mb-6 relative z-10">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border ${getStatusColor(proj.status)}`}>
                            {proj.status === 'generated' ? 'Agents Ready' : proj.status === 'configured' ? 'Configured' : 'Draft'}
                          </span>
                          <span className="text-xs text-on-surface-variant/70 font-mono">
                            {proj.updatedAt ? new Date(proj.updatedAt).toLocaleDateString() : 'New'}
                          </span>
                        </div>

                        <div className="mt-auto space-y-3 relative z-10">
                          {proj.backend || proj.frontend || proj.database ? (
                            <div className="flex flex-wrap gap-1.5">
                              {[proj.backend, proj.frontend, proj.database].filter(Boolean).map(tech => (
                                <span key={tech} className="text-[10px] uppercase font-bold text-slate-300 bg-black/30 px-2 py-1 rounded border border-white/5">
                                  {tech}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <div className="text-xs text-on-surface-variant italic">No stack configured yet</div>
                          )}
                          
                          <div className="flex items-center gap-2 pt-3 border-t border-white/5 text-xs text-on-surface-variant">
                            <span className="material-symbols-outlined text-sm">groups</span>
                            <span>
                              {proj.agentsJson ? JSON.parse(proj.agentsJson).length : 0} Agents
                            </span>
                          </div>
                        </div>
                      </div>
                    </TiltCard>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowCreateModal(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md glass-panel-strong rounded-2xl border border-white/10 shadow-2xl p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-headline font-bold text-2xl text-on-surface">New Project</h2>
                <button onClick={() => setShowCreateModal(false)} className="text-outline hover:text-white">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              
              <form onSubmit={handleCreateProject}>
                <div className="mb-6">
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">
                    Project Name
                  </label>
                  <input
                    autoFocus
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="e.g. E-Commerce Platform"
                    className="w-full bg-surface-container-highest border border-outline-variant/30 focus:border-primary/50 text-on-surface px-4 py-3 rounded-xl outline-none"
                    required
                  />
                </div>
                
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-lg text-on-surface-variant hover:text-white transition-colors text-sm font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating || !newProjectName.trim()}
                    className="bg-primary hover:bg-primary-dim text-on-primary px-6 py-2 rounded-lg font-bold text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isCreating ? <span className="material-symbols-outlined animate-spin text-sm">autorenew</span> : null}
                    Create & Start
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Modal */}
      <AnimatePresence>
        {projectToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setProjectToDelete(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm glass-panel-strong rounded-2xl border border-error/20 shadow-2xl p-8 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-4 border border-error/20">
                <span className="material-symbols-outlined text-error text-3xl">warning</span>
              </div>
              <h2 className="font-headline font-bold text-xl text-on-surface mb-2">Delete Project?</h2>
              <p className="text-on-surface-variant text-sm mb-8">
                Are you sure you want to delete <strong className="text-white">{projectToDelete.projectName || projectToDelete.projectIdea || 'this project'}</strong>? This action cannot be undone.
              </p>
              
              <div className="flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setProjectToDelete(null)}
                  className="px-6 py-2 rounded-lg text-on-surface-variant hover:text-white transition-colors text-sm font-bold bg-surface-container-highest border border-white/5"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="bg-error/90 hover:bg-error text-white px-6 py-2 rounded-lg font-bold text-sm transition-colors shadow-lg shadow-error/20"
                >
                  Delete Permanently
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
