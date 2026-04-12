import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import AppLayout from '../components/AppLayout';
import { useProject } from '../context/ProjectContext';
import CelebrationBurst from '../components/CelebrationBurst';
import TiltCard from '../components/TiltCard';
import MagneticButton from '../components/MagneticButton';

const FRAMEWORK_NAMES = {
  crewai: 'CrewAI',
  autogen: 'AutoGen',
  langchain: 'LangChain',
  assistants: 'Assistants API',
};

function generateAgentData(framework, techs, idea) {
  const hasFrontend = techs.some(t => ['react', 'angular', 'nextjs'].includes(t));
  const hasBackend = techs.some(t => ['nodejs', 'python', 'fastapi'].includes(t));
  const hasDB = techs.some(t => ['postgresql', 'mongodb', 'firebase', 'redis'].includes(t));
  const hasDevOps = techs.some(t => ['docker', 'kubernetes', 'terraform'].includes(t));

  const agents = [
    {
      name: 'Lead Architect',
      role: 'Master Orchestrator',
      icon: 'architecture',
      color: 'secondary',
      status: 'PROCESSING',
      statusType: 'active',
      description: `Coordinates all agents. Decomposes "${(idea || 'the project').substring(0, 60)}..." into executable tasks.`,
      tags: ['Strategy Engine', 'Cross-Context'],
      progress: 75,
    },
  ];

  if (hasBackend) {
    agents.push({
      name: 'Backend Dev',
      role: 'Logic & Data',
      icon: 'database',
      color: 'primary',
      status: 'GENERATING SCHEMA',
      statusType: 'active',
      description: `Expert in backend systems. Handles API design, business logic, and data modeling.`,
      tags: techs.filter(t => ['nodejs', 'python', 'fastapi', 'graphql'].includes(t)),
      progress: 88,
    });
  }

  if (hasFrontend) {
    agents.push({
      name: 'Frontend Specialist',
      role: 'UI & Interaction',
      icon: 'web',
      color: 'tertiary',
      status: 'BUILDING COMPONENTS',
      statusType: 'active',
      description: `Specializes in frontend framework. Creates responsive, accessible UI components.`,
      tags: techs.filter(t => ['react', 'angular', 'nextjs'].includes(t)),
      progress: 62,
    });
  }

  agents.push({
    name: 'Security Guard',
    role: 'Audit & Verification',
    icon: 'admin_panel_settings',
    color: 'error',
    status: 'IDLE',
    statusType: 'idle',
    description: 'Continuous vulnerability scanning and automated security patch orchestration.',
    tags: ['ZERO TRUST', 'OWASP'],
    progress: 100,
  });

  if (hasDB) {
    agents.push({
      name: 'Data Architect',
      role: 'Storage & Query',
      icon: 'storage',
      color: 'secondary',
      status: 'OPTIMIZING SCHEMA',
      statusType: 'active',
      description: `Manages database layer. Handles migrations, indexing, and query optimization.`,
      tags: techs.filter(t => ['postgresql', 'mongodb', 'firebase', 'redis'].includes(t)),
      progress: 70,
    });
  }

  if (hasDevOps) {
    agents.push({
      name: 'DevOps Engineer',
      role: 'Infrastructure',
      icon: 'cloud',
      color: 'tertiary',
      status: 'CONFIGURING PIPELINE',
      statusType: 'active',
      description: `Manages CI/CD, containerization with DevOps tools. Ensures reliable deployments.`,
      tags: techs.filter(t => ['docker', 'kubernetes', 'terraform', 'aws'].includes(t)),
      progress: 45,
    });
  }

  return agents;
}

function ensureAgentNodeShape(agent, idx, _, ideaFallback = '') {
  const colors = ['secondary', 'primary', 'tertiary', 'error'];
  const name = (agent?.name || agent?.agent_name || `Agent ${idx + 1}`).toString().trim();
  const role = (agent?.role || agent?.role_description || 'Specialist').toString().trim();
  const description = (agent?.description || agent?.goal || '').toString().trim() || `Contributes to "${(ideaFallback || 'the project').substring(0, 40)}..." as ${role}.`;

  // Use agent's specific stack rather than global project techs
  let tags = [];
  if (agent?.stack) {
    tags = agent.stack.split(/[+,]+/).map(t => t.trim()).filter(Boolean);
  } else if (agent?.tags || agent?.techs || agent?.tools) {
    const tagsRaw = agent.tags || agent.techs || agent.tools;
    tags = Array.isArray(tagsRaw) ? tagsRaw : typeof tagsRaw === 'string' ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];
  }

  // Hard fallback for role specifics if totally empty
  if (tags.length === 0) {
    if (role.toLowerCase() === 'backend') tags = ['API', 'LOGIC', 'SERVER'];
    else if (role.toLowerCase() === 'frontend') tags = ['UI', 'UX', 'CLIENT'];
    else if (role.toLowerCase() === 'security') tags = ['ZERO TRUST', 'OWASP'];
    else if (role.toLowerCase() === 'database') tags = ['SCHEMA', 'QUERY'];
    else if (role.toLowerCase() === 'devops') tags = ['CI/CD', 'CLOUD'];
    else if (role.toLowerCase() === 'qa') tags = ['TESTING', 'QA'];
    else tags = ['NODE'];
  }

  const mergedTags = [...new Set(tags)].slice(0, 8);

  return {
    name,
    role,
    icon: agent?.icon || 'smart_toy',
    color: agent?.color || colors[idx % colors.length],
    status: agent?.status || 'READY',
    statusType: agent?.statusType || 'idle',
    description,
    tags: mergedTags,
    progress: typeof agent?.progress === 'number' ? agent.progress : 100,
  };
}

// ============================================================
// AGENT NODE COMPONENT
// ============================================================

function AgentNode({ agent, onClick }) {
  const colorMap = {
    primary: { bg: 'bg-primary/10', text: 'text-primary', textHalo: 'text-primary drop-shadow-[0_0_5px_#3adffaaa]', border: 'border-primary/40', boxHalo: 'shadow-[0_0_20px_#3adffa33]' },
    secondary: { bg: 'bg-secondary/10', text: 'text-secondary', textHalo: 'text-secondary drop-shadow-[0_0_5px_#c180ffaa]', border: 'border-secondary/40', boxHalo: 'shadow-[0_0_20px_#c180ff33]' },
    tertiary: { bg: 'bg-tertiary-dim/10', text: 'text-tertiary-dim', textHalo: 'text-tertiary-dim drop-shadow-[0_0_5px_#a4ef3faa]', border: 'border-tertiary-dim/40', boxHalo: 'shadow-[0_0_20px_#a4ef3f33]' },
    error: { bg: 'bg-error/10', text: 'text-error', textHalo: 'text-error', border: 'border-error/20', boxHalo: 'shadow-none' },
  };

  const colors = colorMap[agent.color] || colorMap.primary;
  const isActive = agent.statusType === 'active';

  return (
    <div onClick={onClick} className="h-full cursor-pointer transition-transform hover:scale-[1.02]">
      <TiltCard tiltIntensity={3} className="h-full">
        <motion.div
          data-agent-id={agent.name}
          className={`h-full glass-panel-strong p-6 rounded-2xl border-t border-l ${colors.border} relative overflow-hidden group ${isActive ? 'animate-breathe' : ''} ${colors.boxHalo}`}
        >
          {/* Glow background */}
          <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-[50px] opacity-20 -z-10 ${colors.bg.replace('/10', '')}`} />

          <div className="flex justify-between items-start mb-5">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl glass-panel flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform ${colors.boxHalo}`}>
                <span className={`material-symbols-outlined ${colors.textHalo}`} style={{ fontVariationSettings: "'FILL' 1" }}>{agent.icon}</span>
              </div>
              <div>
                <h4 className={`font-headline font-bold text-base ${colors.textHalo}`}>{agent.name}</h4>
                <p className="text-[10px] text-on-surface-variant uppercase tracking-widest">{agent.role}</p>
              </div>
            </div>

            <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${isActive ? `border-${agent.color}/30 bg-${agent.color}/5` : 'border-white/5 bg-black/20'}`}>
              {isActive ? (
                <span className={`w-1.5 h-1.5 rounded-full bg-current ${colors.text} animate-ping`} />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
              )}
              <span className={`text-[9px] font-bold tracking-[0.1em] uppercase ${isActive ? colors.text : 'text-slate-400'}`}>
                {agent.status}
              </span>
            </div>
          </div>

          <p className="text-sm text-on-surface-variant leading-relaxed mb-5 min-h-[40px] italic">
            "{agent.description}"
          </p>

          {agent.progress > 0 && (
            <div className="mb-4">
              <div className="flex justify-between text-[9px] uppercase tracking-widest text-outline mb-1.5">
                <span>Initialization</span>
                <span className={colors.text}>{agent.progress}%</span>
              </div>
              <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${agent.progress}%` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className={`h-full bg-current ${colors.text} shadow-[0_0_10px_currentColor]`}
                />
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-1.5 mt-auto">
            {agent.tags.map((tag) => (
              <span key={tag} className="text-[9px] px-2.5 py-1 bg-surface-container-highest/50 border border-white/5 text-slate-300 rounded uppercase tracking-wider font-mono">
                {tag}
              </span>
            ))}
          </div>
        </motion.div>
      </TiltCard>
    </div>
  );
}

// ============================================================
// ORCHESTRATION PAGE
// ============================================================

export default function OrchestrationPage() {
  const { projectId } = useParams();
  const { selectedFramework, updateState } = useProject();
  const [agents, setAgents] = useState([]);
  const [projectIdea, setProjectIdea] = useState('');
  const [selectedTechs, setSelectedTechs] = useState([]);

  const [showProgress, setShowProgress] = useState(true);
  const [progressPercent, setProgressPercent] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [agentMarkdown, setAgentMarkdown] = useState('');
  const [loadingMarkdown, setLoadingMarkdown] = useState(false);

  const sanitizeAgentMarkdown = (text) => {
    if (!text) return '';
    // Strip YAML header
    let cleaned = text.replace(/^---[\s\S]*?---/g, '').trim();
    // Strip "Agent Content Start" comment if present
    cleaned = cleaned.replace(/<!-- Agent Content Start -->/g, '').trim();
    // Strip redundant leading headers that match agent name/role
    const lines = cleaned.split('\n');
    if (lines.length > 0 && lines[0].startsWith('# ')) cleaned = lines.slice(1).join('\n').trim();
    return cleaned;
  };

  const handleAgentClick = async (agent) => {
    setSelectedAgent(agent);
    setLoadingMarkdown(true);
    setAgentMarkdown('');
    try {
      const res = await fetch(`/api/agents/${projectId}/detail?name=${encodeURIComponent(agent.name)}`);
      const data = await res.json();
      if (data.content) {
        setAgentMarkdown(sanitizeAgentMarkdown(data.content));
      } else {
        setAgentMarkdown('Error loading content.');
      }
    } catch (err) {
      setAgentMarkdown('Error fetching agent data.');
    }
    setLoadingMarkdown(false);
  };

  const closeAgentModal = () => {
    setSelectedAgent(null);
    setAgentMarkdown('');
  };

  const frameworkName = FRAMEWORK_NAMES[selectedFramework] || 'Multi-Agent';

  useEffect(() => {
    if (projectId) {
      updateState({ currentProjectId: projectId });
      fetchProjectData();
    }
  }, [projectId]);

  const fetchProjectData = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setProjectIdea(data.projectIdea || '');
        setSelectedTechs([data.backend, data.frontend, data.database].filter(Boolean));

        let initialAgents = [];
        if (data.agentsJson) {
          const parsed = JSON.parse(data.agentsJson);
          initialAgents = parsed;
        }

        // Ensure Agent Node shape
        const resolvedAgents = (initialAgents.length > 0)
          ? initialAgents
          : generateAgentData(selectedFramework, [data.backend, data.frontend, data.database].filter(Boolean), data.projectIdea);

        const finalAgents = resolvedAgents.map((a, idx) => {
          let n = ensureAgentNodeShape(a, idx, [data.backend, data.frontend, data.database].filter(Boolean), data.projectIdea);
          if (data.status === 'generated') {
            n.status = 'READY';
            n.statusType = 'active';
            n.progress = 100;
          }
          return n;
        });

        setAgents(finalAgents);

        // If not generated yet, let's trigger generation automatically for UX
        if (data.status === 'configured') {
          fetch(`/api/agents/${projectId}/generate`, { method: 'POST' }).catch(console.error);
        } else {
          // Skip progress if already generated
          setShowProgress(false);
          setIsComplete(true);
        }
      }
    } catch (_) { }
  };



  // Simulate generation progress if showProgress is true
  useEffect(() => {
    if (!showProgress) return;
    const interval = setInterval(() => {
      setProgressPercent(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setShowProgress(false);
            setAgents(prevAgents => prevAgents.map(a => ({ ...a, status: 'READY', progress: 100 })));
            setTimeout(() => setIsComplete(true), 1500); // Trigger celebration after nodes appear
          }, 600);
          return 100;
        }
        // Non-linear progress simulation
        return prev + (Math.random() * 5 + 1);
      });
    }, 150);

    return () => clearInterval(interval);
  }, [showProgress]);

  const rightPanel = !showProgress && (
    <motion.div
      initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
      className="flex flex-col h-full bg-surface-container-low/80 backdrop-blur-3xl border-l border-white/5"
    >
      <div className="p-6 border-b border-white/5 relative">
        <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-transparent to-tertiary-dim opacity-50" />
        <h3 className="font-headline font-bold text-xl mb-1 text-on-surface">Global Events</h3>
        <p className="text-xs text-on-surface-variant font-mono uppercase tracking-widest">Real-time agent activity log</p>
      </div>
      <div className="flex-1 overflow-auto p-6 space-y-5 custom-scrollbar">
        {agents.map((agent, i) => (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 + 0.8 }}
            key={i} className="space-y-1.5"
          >
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${agent.statusType === 'active' ? 'bg-tertiary-dim shadow-[0_0_5px_#a4ef3f]' : 'bg-slate-500'}`} />
              <span className="text-[10px] text-primary/60 font-mono tracking-wider">
                {new Date().toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
            <p className="text-xs leading-relaxed text-on-surface-variant font-mono">
              <span className={`font-bold ${agent.color === 'secondary' ? 'text-secondary drop-shadow-[0_0_2px_#c180ff]' : agent.color === 'primary' ? 'text-primary drop-shadow-[0_0_2px_#3adffa]' : 'text-tertiary-dim'}`}>
                [{agent.name.toUpperCase()}]
              </span>
              {' > '} {agent.status.toLowerCase()}... {agent.description.substring(0, 40)}
            </p>
          </motion.div>
        ))}
      </div>
      <div className="p-6 border-t border-white/5 bg-surface-container-low">
        <div className="relative border-beam rounded-xl">
          <MagneticButton
            to={projectId ? `/project/${projectId}/office` : '/projects'}
            className="w-full relative z-10 py-5 bg-gradient-to-br from-primary to-primary-container text-on-primary-container rounded-xl flex items-center justify-center gap-3 font-headline font-bold text-lg active:scale-95 transition-all shadow-[0_0_30px_-5px_rgba(58,223,250,0.4)] hover:shadow-[0_0_50px_-5px_rgba(58,223,250,0.6)]"
          >
            <span className="material-symbols-outlined">apartment</span>
            Open Office
          </MagneticButton>
        </div>
      </div>
    </motion.div>
  );

  return (
    <AppLayout>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="max-w-[1400px] mx-auto min-h-[calc(100vh-8rem)] relative"
      >
        <CelebrationBurst active={isComplete} particleCount={80} />

        {/* Header */}
        <div className="mb-12 relative z-10 pt-4 flex flex-col sm:flex-row sm:items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 bg-tertiary-container/10 border border-tertiary/20 text-tertiary-dim text-[10px] uppercase tracking-widest rounded-full font-bold">
                Step 03: Compilation
              </span>
            </div>
            <h2 className="text-5xl font-headline font-bold text-on-surface mb-3 tracking-tight drop-shadow-md">
              Agent Swarm — <span className="gradient-text-animated">{frameworkName}</span>
            </h2>
            <p className="text-on-surface-variant text-lg max-w-2xl font-light">
              {showProgress
                ? 'Synthesizing agent architecture from your project context...'
                : `Visualizing collaborative data pathways between ${agents.length} specialized autonomous entities.`
              }
            </p>
          </div>

          <AnimatePresence>
            {!showProgress && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                className="relative border-beam rounded-xl whitespace-nowrap"
              >
                <MagneticButton
                  to={projectId ? `/project/${projectId}/workspace` : '/projects'}
                  className="relative z-10 py-3 px-8 bg-gradient-to-br from-primary to-primary-container text-on-primary-container rounded-xl flex items-center justify-center gap-3 font-headline font-bold text-lg active:scale-95 transition-all shadow-[0_0_30px_-5px_rgba(58,223,250,0.4)] hover:shadow-[0_0_50px_-5px_rgba(58,223,250,0.6)]"
                >
                  <span className="material-symbols-outlined">terminal</span>
                  Open Workspace
                </MagneticButton>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Progress Animation */}
        <AnimatePresence mode="wait">
          {showProgress ? (
            <motion.div
              key="progress"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }}
              className="max-w-xl mx-auto mt-40 glass-panel-strong p-12 rounded-3xl border border-primary/20 shadow-[0_0_50px_-15px_rgba(58,223,250,0.3)] relative overflow-hidden text-center"
            >
              <div className="absolute inset-0 bg-primary/5 animate-pulse" />
              <div className="relative z-10">
                <span className="material-symbols-outlined text-6xl text-primary mb-6 animate-float inline-block drop-shadow-[0_0_15px_#3adffa]">
                  hub
                </span>
                <h3 className="font-headline text-2xl font-bold mb-3 text-on-surface">Synthesizing Neural Graph</h3>
                <p className="text-sm text-on-surface-variant mb-8 font-light">Allocating cognitive resources and establishing connection protocols...</p>

                <div className="h-2 w-full bg-black/50 rounded-full overflow-hidden border border-white/5 relative">
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-secondary to-tertiary-dim rounded-full transition-all duration-300 shadow-[0_0_15px_#3adffa]"
                    style={{ width: `${Math.min(progressPercent, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between items-center mt-3 text-xs font-mono">
                  <span className="text-primary animate-pulse">{progressPercent < 100 ? 'COMPILING...' : 'READY'}</span>
                  <span className="text-on-surface-variant">{Math.min(Math.round(progressPercent), 100)}%</span>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="nodes"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="relative min-h-[500px]"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 relative z-10">
                {agents.map((agent, i) => (
                  <motion.div
                    key={agent.name}
                    initial={{ opacity: 0, scale: 0.5, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 200,
                      damping: 20,
                      delay: i * 0.15
                    }}
                  >
                    <AgentNode agent={agent} onClick={() => handleAgentClick(agent)} />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Agent Modal */}
      <AnimatePresence>
        {selectedAgent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
              onClick={closeAgentModal}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl max-h-[85vh] glass-panel-strong rounded-3xl border border-white/10 shadow-2xl flex flex-col overflow-hidden"
            >
              <div className={`flex items-center justify-between p-6 border-b border-white/10 relative overflow-hidden`}>
                {/* Dynamic Header Glow */}
                <div className={`absolute inset-0 opacity-20 bg-gradient-to-r from-${selectedAgent.color} to-transparent`} />
                
                <div className="flex items-center gap-4 relative z-10">
                  <div className={`w-14 h-14 rounded-2xl bg-${selectedAgent.color}/20 flex items-center justify-center border border-${selectedAgent.color}/30 shadow-[0_0_20px_rgba(var(--${selectedAgent.color}-rgb),0.2)]`}>
                    <span className={`material-symbols-outlined text-${selectedAgent.color} text-3xl`}>{selectedAgent.icon}</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-headline font-bold text-on-surface tracking-tight">{selectedAgent.name}</h3>
                    <div className="flex items-center gap-2">
                       <span className={`w-1.5 h-1.5 rounded-full bg-${selectedAgent.color} animate-pulse`} />
                       <p className="text-xs text-on-surface-variant uppercase tracking-[0.2em] font-bold">{selectedAgent.role}</p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={closeAgentModal}
                  className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all hover:rotate-90 relative z-10"
                >
                  <span className="material-symbols-outlined text-on-surface">close</span>
                </button>
              </div>
              <div className="p-0 overflow-y-auto custom-scrollbar flex-1 bg-[#0d1117]">
                {loadingMarkdown ? (
                  <div className="flex flex-col items-center justify-center h-80 gap-4 text-primary">
                    <span className="material-symbols-outlined animate-spin text-5xl">autorenew</span>
                    <span className="font-mono text-sm tracking-widest uppercase animate-pulse">Initializing Agent Instance...</span>
                  </div>
                ) : (
                  <div className="p-8">
                    <div className="prose prose-invert prose-primary max-w-none 
                      prose-headings:font-headline prose-headings:font-bold prose-headings:tracking-tight
                      prose-h1:text-3xl prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
                      prose-p:text-on-surface-variant prose-p:leading-relaxed
                      prose-strong:text-primary prose-strong:font-bold
                      prose-blockquote:border-l-primary prose-blockquote:bg-white/5 prose-blockquote:py-2 prose-blockquote:px-6 prose-blockquote:rounded-r-lg
                    ">
                      <ReactMarkdown
                        rehypePlugins={[rehypeRaw]}
                        components={{
                          // Handle custom XML tags
                          example: ({ children }) => {
                            // Helper to extract text from nested children
                            const getText = (nodes) => {
                              return Array.isArray(nodes) 
                                ? nodes.map(n => typeof n === 'string' ? n : getText(n.props?.children)).join('')
                                : typeof nodes === 'string' ? nodes : '';
                            };

                            const fullText = getText(children);
                            
                            // Parse Context, User and Assistant
                            const contextMatch = fullText.match(/(?:Context|Contexto):\s*([\s\S]*?)(?=user:|$)/i);
                            const userMatch = fullText.match(/user:\s*"([\s\S]*?)"/i);
                            const assistantMatch = fullText.match(/assistant:\s*"([\s\S]*?)"/i);

                            const context = contextMatch ? contextMatch[1].trim() : '';
                            const userMsg = userMatch ? userMatch[1].trim() : '';
                            const assistantMsg = assistantMatch ? assistantMatch[1].trim() : '';

                            // Identify the commentary node to render it separately
                            const commentaryNode = Array.isArray(children) 
                              ? children.find(c => c?.type === 'commentary' || (typeof c === 'object' && c?.props?.node?.tagName === 'commentary'))
                              : (children?.type === 'commentary' ? children : null);

                            return (
                              <div className="my-10 rounded-3xl border border-white/10 bg-black/40 overflow-hidden shadow-2xl backdrop-blur-md">
                                {/* Header */}
                                <div className="bg-white/5 px-6 py-3 flex items-center justify-between border-b border-white/5">
                                  <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm text-tertiary">prompt_suggestion</span>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Protocol Simulation</span>
                                  </div>
                                  {context && (
                                    <span className="text-[9px] text-white/40 font-mono italic">Context: {context.substring(0, 40)}...</span>
                                  )}
                                </div>

                                <div className="p-6 space-y-6 bg-gradient-to-b from-transparent to-white/[0.02]">
                                  {/* Context Label */}
                                  {context && (
                                    <div className="text-[11px] text-on-surface-variant/70 italic mb-4 flex gap-2">
                                      <span className="text-tertiary">#</span>
                                      {context}
                                    </div>
                                  )}

                                  {/* User Bubble */}
                                  {userMsg && (
                                    <div className="flex flex-col items-end gap-2 group">
                                      <div className="flex items-center gap-2 pr-2">
                                        <span className="text-[9px] font-bold text-white/30 uppercase tracking-tighter">Human User</span>
                                        <span className="material-symbols-outlined text-sm text-white/30">person</span>
                                      </div>
                                      <div className="max-w-[85%] bg-white/10 border border-white/10 p-4 rounded-2xl rounded-tr-none text-sm text-on-surface shadow-lg group-hover:bg-white/15 transition-colors leading-relaxed">
                                        {userMsg}
                                      </div>
                                    </div>
                                  )}

                                  {/* Assistant Bubble */}
                                  {assistantMsg && (
                                    <div className="flex flex-col items-start gap-2 group">
                                      <div className="flex items-center gap-2 pl-2">
                                        <div className={`w-5 h-5 rounded-full bg-${selectedAgent.color}/20 flex items-center justify-center border border-${selectedAgent.color}/40`}>
                                          <span className={`material-symbols-outlined text-[10px] text-${selectedAgent.color}`}>{selectedAgent.icon}</span>
                                        </div>
                                        <span className={`text-[9px] font-bold text-${selectedAgent.color} uppercase tracking-tighter`}>{selectedAgent.name} (Agent)</span>
                                      </div>
                                      <div className={`max-w-[85%] bg-${selectedAgent.color}/10 border border-${selectedAgent.color}/20 p-4 rounded-2xl rounded-tl-none text-sm text-on-surface shadow-lg group-hover:bg-${selectedAgent.color}/15 transition-colors leading-relaxed`}>
                                        {assistantMsg}
                                      </div>
                                    </div>
                                  )}

                                  {/* Inner Commentary if any */}
                                  {commentaryNode}
                                </div>
                              </div>
                            );
                          },
                          commentary: ({ children }) => (
                            <div className="mt-4 p-5 rounded-2xl bg-tertiary/5 border-l-2 border-tertiary/30 italic text-xs text-on-surface-variant/80 flex gap-4 transition-all hover:bg-tertiary/10">
                              <span className="material-symbols-outlined text-tertiary text-xl flex-shrink-0 drop-shadow-[0_0_8px_rgba(var(--tertiary-rgb),0.5)]">psychology</span>
                              <div className="leading-relaxed">
                                <span className="block text-[9px] font-bold text-tertiary uppercase mb-1 not-italic tracking-widest">Architectural Commentary</span>
                                {children}
                              </div>
                            </div>
                          )
                        }}
                      >
                        {sanitizeAgentMarkdown(agentMarkdown)}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
