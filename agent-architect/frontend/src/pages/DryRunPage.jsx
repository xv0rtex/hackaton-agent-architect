import { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import AppLayout from '../components/AppLayout';
import { useProject } from '../context/ProjectContext';

const MarkdownComponents = {
  p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
  strong: ({ children }) => <strong className="font-bold text-primary shadow-sm">{children}</strong>,
  ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>,
  li: ({ children }) => <li className="ml-2">{children}</li>,
};

const AGENT_THEMES = {
  backend: { color: 'primary', icon: 'database', label: 'CORE SYSTEM' },
  frontend: { color: 'secondary', icon: 'brush', label: 'INTERFACE' },
  security: { color: 'error', icon: 'policy', label: 'SECURITY' },
  database: { color: 'tertiary', icon: 'storage', label: 'DATA HUB' },
  devops: { color: 'primary', icon: 'cloud_sync', label: 'OPERATIONS' },
  qa: { color: 'tertiary-dim', icon: 'bug_report', label: 'QUALITY' },
  ux: { color: 'secondary', icon: 'design_services', label: 'UX DESIGN' },
};

function normalizeAgent(raw, idx) {
  const role = (raw.role || 'backend').toLowerCase();
  const theme = AGENT_THEMES[role] || AGENT_THEMES.backend;
  return {
    role,
    name: (raw.name || `Agent ${idx + 1}`).trim(),
    stack: raw.stack || '',
    description: raw.description || '',
    personality: raw.personality || '',
    instructions: raw.instructions || '',
    themeColor: theme.color,
    icon: theme.icon,
    roleLabel: theme.label
  };
}

function newChatId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Agent message with fast typing and staggered start (looks like real chat). */
function TypingAgentMessage({ agent, text, delayMs, agents, onLayoutTick }) {
  const agentData = agents.find(a => a.name === agent) || agents[0] || {};
  const theme = AGENT_THEMES[agentData.role] || AGENT_THEMES.backend;
  const [phase, setPhase] = useState('wait');
  const [shown, setShown] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setPhase('typing'), delayMs);
    return () => clearTimeout(t);
  }, [delayMs]);

  useEffect(() => {
    if (phase !== 'typing' || !text) return;
    if (shown.length >= text.length) {
      setPhase('done');
      return;
    }
    const chunk = Math.min(5, text.length - shown.length);
    const tick = setTimeout(() => {
      setShown(text.slice(0, shown.length + chunk));
    }, 9);
    return () => clearTimeout(tick);
  }, [phase, text, shown]);

  useLayoutEffect(() => {
    if (phase !== 'wait') onLayoutTick?.();
  }, [shown, phase, onLayoutTick]);

  const typing = phase === 'typing' && shown.length < (text || '').length;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: delayMs / 1000 }}
      className="flex gap-4 group"
    >
      {/* Avatar column */}
      <div className="flex flex-col items-center">
        <div className={`w-10 h-10 rounded-full bg-${theme.color}/10 border border-${theme.color}/30 flex items-center justify-center relative shadow-lg shadow-${theme.color}/5`}>
           <span className={`material-symbols-outlined text-xl text-${theme.color}`}>{theme.icon}</span>
           {typing && (
             <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-background border border-${theme.color}/40 flex items-center justify-center overflow-hidden`}>
               <span className={`w-1 h-1 rounded-full bg-${theme.color} animate-ping`} />
             </span>
           )}
        </div>
        <div className="flex-1 w-[1px] bg-gradient-to-b from-white/10 to-transparent mt-2 opacity-50" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1.5">
          <span className={`text-xs font-bold font-headline tracking-wide text-on-surface`}>{agent}</span>
          <span className={`px-2 py-0.5 rounded-full bg-${theme.color}/5 border border-${theme.color}/20 text-[9px] font-black uppercase tracking-widest text-${theme.color}/80`}>
            {theme.label}
          </span>
        </div>

        <div className="relative">
          <div className="bg-white/5 border border-white/5 backdrop-blur-sm rounded-2xl rounded-tl-none p-4 shadow-xl">
            {phase === 'wait' ? (
              <div className="flex gap-1 py-1">
                <span className={`w-1.5 h-1.5 rounded-full bg-${theme.color}/40 animate-bounce [animation-delay:0ms]`} />
                <span className={`w-1.5 h-1.5 rounded-full bg-${theme.color}/40 animate-bounce [animation-delay:150ms]`} />
                <span className={`w-1.5 h-1.5 rounded-full bg-${theme.color}/40 animate-bounce [animation-delay:300ms]`} />
              </div>
            ) : (
              <div className="text-sm text-on-surface-variant leading-relaxed">
                <ReactMarkdown rehypePlugins={[rehypeRaw]} components={MarkdownComponents}>
                  {shown}
                </ReactMarkdown>
                {typing && <span className={`inline-block w-2 h-4 ml-1 bg-${theme.color}/60 animate-pulse align-middle rounded-sm`} />}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function DryRunPage() {
  const { projectId } = useParams();
  const { updateState } = useProject();
  const [projectName, setProjectName] = useState('');
  const [projectIdea, setProjectIdea] = useState('');
  const [agents, setAgents] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [chatItems, setChatItems] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const endRef = useRef(null);

  const selected = agents[selectedIdx] || null;

  const [isPinned, setIsPinned] = useState(true);
  const scrollableRef = useRef(null);

  const handleScroll = () => {
    if (!scrollableRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollableRef.current;
    // Pinned if we are within 60px of the bottom
    const atBottom = scrollHeight - scrollTop - clientHeight < 60;
    setIsPinned(atBottom);
  };

  const scrollChatToEnd = useCallback((force = false) => {
    if ((force || isPinned) && scrollableRef.current) {
      scrollableRef.current.scrollTop = scrollableRef.current.scrollHeight;
    }
  }, [isPinned]);

  useEffect(() => {
    if (isPinned && scrollableRef.current) {
      scrollableRef.current.scrollTop = scrollableRef.current.scrollHeight;
    }
  }, [chatItems, loading, isPinned]);

  useEffect(() => {
    if (projectId) {
      updateState({ currentProjectId: projectId });
      loadProject();
    }
  }, [projectId]);

  const loadProject = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (!res.ok) return;
      const data = await res.json();
      setProjectName(data.projectName || '');
      setProjectIdea(data.projectIdea || '');
      let list = [];
      if (data.agentsJson) {
        try {
          const parsed = JSON.parse(data.agentsJson);
          if (Array.isArray(parsed)) {
            list = parsed.map((a, i) => normalizeAgent(a, i));
          }
        } catch (_) {
          list = [];
        }
      }
      setAgents(list);
      setSelectedIdx(0);
    } catch (_) {}
  };

  const updateSelectedField = (field, value) => {
    setAgents((prev) => {
      const next = [...prev];
      if (!next[selectedIdx]) return prev;
      next[selectedIdx] = { ...next[selectedIdx], [field]: value };
      return next;
    });
  };

  const handleSaveAgents = async () => {
    setSaveStatus(null);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentsJson: JSON.stringify(agents) }),
      });
      if (res.ok) {
        // Keep Agent table/markdown in sync so Export and Orchestration detail popups update.
        const regen = await fetch(`/api/agents/${projectId}/generate`, { method: 'POST' });
        if (regen.ok) {
          setSaveStatus({ kind: 'ok', text: 'Changes saved and agent files regenerated.' });
        } else {
          setSaveStatus({ kind: 'err', text: 'Changes saved, but failed to regenerate agent files.' });
        }
        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        setSaveStatus({ kind: 'err', text: 'Error saving changes.' });
      }
    } catch (e) {
      setSaveStatus({ kind: 'err', text: e.message || 'Network error' });
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setChatItems((prev) => [...prev, { kind: 'user', id: newChatId(), text }]);
    setLoading(true);
    setIsPinned(true); // Re-pin on message send

    try {
      const res = await fetch(`/api/projects/${projectId}/dry-run/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      const rawTurns = Array.isArray(data.messages) ? data.messages : [];

      let cumulativeDelay = 0;
      const turns = rawTurns.map((t) => {
        const currentDelay = cumulativeDelay;
        const estimatedTypingTime = (t.text.length / 5) * 9;
        const thinkingPause = Math.floor(Math.random() * 800) + 600;
        cumulativeDelay += estimatedTypingTime + thinkingPause;
        return { ...t, calculatedDelay: currentDelay };
      });

      setChatItems((prev) => [...prev, { kind: 'agents', id: newChatId(), turns, error: data.error }]);
    } catch (e) {
      setChatItems((prev) => [...prev, { kind: 'agents', id: newChatId(), turns: [], error: e.message }]);
    }
    setLoading(false);
  };

  const handleReset = async () => {
    try {
      await fetch(`/api/projects/${projectId}/dry-run/reset`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (_) {}
    setChatItems([]);
  };

  const rightPanel = (
    <div className="flex flex-col h-full bg-surface-container-low/60 backdrop-blur-3xl overflow-hidden">
      <div className="p-6 border-b border-white/5 relative">
        <div className="flex items-center gap-2 mb-1">
          <span className="material-symbols-outlined text-primary text-xl">tune</span>
          <h2 className="font-headline font-bold text-lg text-on-surface">Agent Forge</h2>
        </div>
        <p className="text-[10px] text-on-surface-variant font-mono uppercase tracking-widest opacity-60">Identity & Personality tuning</p>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar p-0">
        {/* Agent Cards Selection */}
        <div className="p-4 space-y-2 border-b border-white/5 bg-black/20">
          <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-3 px-2">Select Agent to Fine-tune</label>
          <div className="grid grid-cols-1 gap-2">
            {agents.map((a, i) => {
              const active = selectedIdx === i;
              return (
                <motion.button
                  key={i}
                  onClick={() => setSelectedIdx(i)}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 ${
                    active 
                      ? `bg-${a.themeColor}/10 border-${a.themeColor}/40 shadow-lg shadow-${a.themeColor}/5` 
                      : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-${a.themeColor}/${active ? '30' : '10'} border border-${a.themeColor}/20`}>
                    <span className={`material-symbols-outlined text-sm text-${a.themeColor}`}>{a.icon}</span>
                  </div>
                  <div className="text-left min-w-0">
                    <p className={`text-xs font-bold truncate ${active ? 'text-on-surface' : 'text-on-surface/60'}`}>{a.name}</p>
                    <p className={`text-[9px] uppercase tracking-widest opacity-50`}>{a.role}</p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Editor Form */}
        {selected ? (
          <div className="p-6 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className={`text-[10px] font-bold uppercase tracking-[0.2em] text-${selected.themeColor}/70 flex items-center gap-2`}>
                   <span className="material-symbols-outlined text-sm">psychology</span>
                   Personality Profile
                </label>
                <textarea
                  value={selected.personality}
                  onChange={(e) => updateSelectedField('personality', e.target.value)}
                  rows={4}
                  className={`w-full rounded-2xl bg-black/40 border border-white/10 p-4 text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-${selected.themeColor}/50 focus:border-${selected.themeColor}/50 transition-all resize-none shadow-inner`}
                  placeholder="Describe how the agent behaves..."
                />
              </div>

              <div className="space-y-2">
                <label className={`text-[10px] font-bold uppercase tracking-[0.2em] text-${selected.themeColor}/70 flex items-center gap-2`}>
                   <span className="material-symbols-outlined text-sm">settings_input_component</span>
                   Simulation Instructions
                </label>
                <textarea
                  value={selected.instructions}
                  onChange={(e) => updateSelectedField('instructions', e.target.value)}
                  rows={4}
                  className={`w-full rounded-2xl bg-black/40 border border-white/10 p-4 text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-${selected.themeColor}/50 focus:border-${selected.themeColor}/50 transition-all resize-none shadow-inner`}
                  placeholder="Rules for the dry run..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 flex items-center gap-2">
                   <span className="material-symbols-outlined text-sm">verified</span>
                   Core Responsibility
                </label>
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 text-[11px] text-on-surface-variant font-light leading-relaxed">
                  {selected.description}
                </div>
              </div>
            </div>

            <motion.button
              onClick={handleSaveAgents}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full py-4 rounded-2xl bg-${selected.themeColor}/20 border border-${selected.themeColor}/40 text-${selected.themeColor} font-headline font-bold text-sm hover:bg-${selected.themeColor}/30 transition-all relative overflow-hidden group`}
            >
              <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000`} />
              Update Identity
            </motion.button>

            {saveStatus && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-mono shadow-xl ${
                  saveStatus.kind === 'ok' ? 'bg-tertiary-dim/20 text-tertiary-dim border border-tertiary-dim/30' : 'bg-error/20 text-error border border-error/30'
                }`}
              >
                <span className="material-symbols-outlined text-sm">{saveStatus.kind === 'ok' ? 'check_circle' : 'error'}</span>
                {saveStatus.text}
              </motion.div>
            )}
          </div>
        ) : (
          <div className="p-12 text-center">
            <span className="material-symbols-outlined text-4xl text-white/10 mb-4 animate-pulse">forum</span>
            <p className="text-xs text-white/30">Connect characters to ignite the forge</p>
          </div>
        )}
      </div>

      <div className="p-6 border-t border-white/5 bg-black/20">
        <div className="flex items-center gap-4 text-xs">
          <Link to={`/project/${projectId}/orchestration`} className="flex-1 py-2 text-center text-white/40 hover:text-primary transition-colors border border-white/5 rounded-lg">
             ← Back
          </Link>
          <Link to={`/project/${projectId}/workspace`} className="flex-1 py-2 text-center bg-primary/10 text-primary hover:bg-primary/20 transition-all border border-primary/20 rounded-lg font-bold">
             Workspace →
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <AppLayout rightPanel={rightPanel} noPadding>
      <div className="h-full flex flex-col relative bg-background overflow-hidden">
        {/* Ambient Glows */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
             <motion.div 
               animate={{ 
                 x: [100, 300, 100], 
                 y: [50, 150, 50],
                 opacity: [0.1, 0.2, 0.1]
               }}
               transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
               className={`absolute w-96 h-96 rounded-full blur-[120px] bg-${selected?.themeColor || 'primary'}/20`} 
             />
             <motion.div 
               animate={{ 
                 x: [400, 200, 400], 
                 y: [300, 100, 300],
                 opacity: [0.05, 0.15, 0.05]
               }}
               transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
               className="absolute w-[500px] h-[500px] rounded-full blur-[150px] bg-secondary/10" 
             />
        </div>

        {/* Chat Main Area */}
        <div className="flex-1 flex flex-col relative z-10 max-w-4xl mx-auto w-full pt-8 pb-4">
          <div className="px-6 mb-8">
             <div className="flex items-center gap-3 mb-2">
                <span className="px-2 py-0.5 bg-primary/10 border border-primary/20 text-primary text-[9px] uppercase tracking-widest rounded-md font-bold">Simulation Deck</span>
                <span className="w-1 h-1 rounded-full bg-white/20" />
                <span className="text-[10px] text-white/40 font-mono tracking-tight">{projectName || 'Project Simulation'}</span>
             </div>
             <h1 className="text-3xl font-headline font-bold text-on-surface tracking-tight">Dry Run Feedback</h1>
          </div>

          {/* Chat Container */}
          <div className="flex-1 flex flex-col min-h-0 bg-white/[0.03] border border-white/5 rounded-3xl backdrop-blur-md shadow-2xl overflow-hidden mb-6 mx-4">
            <div 
              ref={scrollableRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8"
            >
              {chatItems.length === 0 && !loading && (
                <div className="h-full flex flex-col items-center justify-center text-center p-12 space-y-4">
                   <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-2">
                      <span className="material-symbols-outlined text-3xl text-primary/40">forum</span>
                   </div>
                   <div className="space-y-1">
                     <p className="text-on-surface font-headline font-bold">Start the Dialogue</p>
                     <p className="text-xs text-on-surface-variant/60 max-w-xs mx-auto">
                        Your agents are ready. Test the MVP roadmap or ask about specific technical trade-offs.
                     </p>
                   </div>
                </div>
              )}

              <AnimatePresence initial={false}>
                {chatItems.map((item, i) =>
                  item.kind === 'user' ? (
                    <motion.div key={item.id ?? `u-${i}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end pr-2">
                      <div className="max-w-[80%] relative group">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
                        <div className="relative px-5 py-3.5 bg-surface-container-highest border border-white/10 text-on-surface text-sm rounded-2xl rounded-tr-none shadow-xl">
                          {item.text}
                        </div>
                        <div className="mt-1.5 flex justify-end gap-2 items-center text-[10px] text-white/20 font-mono">
                           <span>Human Master</span>
                           <span className="material-symbols-outlined text-[10px]">verified</span>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <div key={item.id ?? `a-${i}`} className="space-y-8">
                       {item.error && (
                         <div className="mx-auto w-fit px-4 py-1.5 rounded-full bg-error/10 border border-error/20 text-[10px] text-error font-mono flex items-center gap-2">
                            <span className="material-symbols-outlined text-[12px]">warning</span>
                            {item.error}
                         </div>
                       )}
                       {(item.turns || []).map((t, j) => (
                           <TypingAgentMessage
                               key={`${item.id}-${j}`}
                               agent={t.agent}
                               text={t.text}
                               delayMs={t.calculatedDelay}
                               agents={agents}
                               onLayoutTick={scrollChatToEnd}
                           />
                       ))}
                    </div>
                  )
                )}
              </AnimatePresence>

              {loading && (
                <div className="flex items-center gap-3 text-primary text-[10px] font-mono tracking-widest uppercase py-4 pl-4 opacity-70">
                   <div className="flex gap-1">
                      <span className="w-1 h-3 bg-primary animate-[bounce_1s_infinite_0ms]" />
                      <span className="w-1 h-3 bg-primary animate-[bounce_1s_infinite_200ms]" />
                      <span className="w-1 h-3 bg-primary animate-[bounce_1s_infinite_400ms]" />
                   </div>
                   Processing simulation...
                </div>
              )}
              <div ref={endRef} />
            </div>

            {/* Input Bar */}
            <div className="p-6 bg-white/[0.02] border-t border-white/5">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-2xl blur opacity-30 group-focus-within:opacity-60 transition duration-500" />
                <div className="relative flex gap-3">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                    placeholder="Brief the team or ask a strategic question..."
                    className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-sm text-on-surface placeholder:text-white/20 focus:outline-none focus:border-primary/40 transition-all"
                  />
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={loading || !input.trim()}
                    className={`px-8 rounded-2xl font-headline font-bold text-sm flex items-center gap-2 transition-all shadow-lg ${
                      loading || !input.trim() 
                        ? 'bg-white/5 text-white/20' 
                        : 'bg-primary text-on-primary hover:shadow-[0_0_20px_rgba(58,223,250,0.4)] active:scale-95'
                    }`}
                  >
                    {loading ? '...' : 'Send'}
                  </button>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between px-2">
                 <button onClick={handleReset} className="text-[10px] text-white/20 hover:text-error transition-colors uppercase tracking-widest font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">restart_alt</span>
                    Reset Conversation
                 </button>
                 <div className="text-[10px] text-white/10 font-mono">
                    COMMAND L + ENTER TO SEND
                 </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
