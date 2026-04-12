import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import AppLayout from '../components/AppLayout';
import { useProject } from '../context/ProjectContext';
import TypewriterText from '../components/TypewriterText';
import ParticleNetwork from '../components/ParticleNetwork';

// ============================================================
// SIMULATED AI CONVERSATION ENGINE
// ============================================================

const FRAMEWORK_NAMES = {
  crewai: 'CrewAI',
  autogen: 'AutoGen',
  langchain: 'LangChain',
  assistants: 'Assistants API',
};

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function extractJsonFromText(text) {
  if (!text) return null;

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) {
    const parsed = safeJsonParse(fenced[1]);
    if (parsed) return parsed;
  }

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    const parsed = safeJsonParse(text.slice(start, end + 1));
    if (parsed) return parsed;
  }

  return null;
}

function normalizeTechs(value) {
  const raw = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',').map(v => v.trim()).filter(Boolean)
      : [];

  const normalized = raw
    .map(v => String(v).trim().toLowerCase())
    .filter(Boolean)
    .map(v => v.replace(/\s+/g, ''));

  return [...new Set(normalized)];
}

function pickIconForAgent(name, role) {
  const t = `${name || ''} ${role || ''}`.toLowerCase();
  if (t.includes('architect') || t.includes('arquitect')) return 'architecture';
  if (t.includes('frontend') || t.includes('ui') || t.includes('ux')) return 'web';
  if (t.includes('backend') || t.includes('api')) return 'database';
  if (t.includes('data') || t.includes('db') || t.includes('database')) return 'storage';
  if (t.includes('devops') || t.includes('infra') || t.includes('deploy')) return 'cloud';
  if (t.includes('security') || t.includes('seguridad')) return 'admin_panel_settings';
  if (t.includes('qa') || t.includes('test') || t.includes('testing')) return 'bug_report';
  if (t.includes('product') || t.includes('pm')) return 'assignment';
  return 'smart_toy';
}

function normalizeAgents(value, techsFallback = []) {
  const colors = ['secondary', 'primary', 'tertiary', 'error'];
  const agents = Array.isArray(value) ? value : [];

  return agents
    .map((a, idx) => {
      const name = (a?.name || a?.agent_name || a?.title || `Agent ${idx + 1}`).toString().trim();
      const role = (a?.role || a?.role_description || a?.specialty || 'Specialist').toString().trim();
      const description = (a?.description || a?.goal || a?.system_prompt || '').toString().trim() || `Especialista en ${role}.`;
      const tagsRaw = a?.tags || a?.tools || a?.tooling || a?.techs || [];
      const tags = Array.isArray(tagsRaw)
        ? tagsRaw.map(t => String(t).trim()).filter(Boolean)
        : typeof tagsRaw === 'string'
          ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean)
          : [];
      const mergedTags = [...new Set([...tags, ...techsFallback])].slice(0, 8);

      const color = colors[idx % colors.length];
      const icon = pickIconForAgent(name, role);

      return {
        name,
        role,
        icon,
        color,
        status: 'READY',
        statusType: 'idle',
        description,
        tags: mergedTags,
        progress: 100,
      };
    })
    .filter(a => a.name);
}

function parseAgentsAndTechsFromUserText(text) {
  const json = extractJsonFromText(text);
  if (json) {
    const techs = normalizeTechs(json.techs || json.stack || json.technologies);
    const agents = normalizeAgents(json.agents, techs);
    return { techs, agents };
  }

  const techLine = text.match(/(?:techs?|stack|tecnolog(?:i|í)as?)\s*:\s*(.+)/i);
  const techs = normalizeTechs(techLine?.[1] || []);

  const lines = text.split('\n');
  const agentLines = lines
    .map(l => l.trim())
    .filter(l => /^[-*]\s+/.test(l))
    .map(l => l.replace(/^[-*]\s+/, ''))
    .map(l => {
      const [left, ...rest] = l.split(/[:\-–—]/);
      const name = (left || '').trim();
      const role = rest.join('-').trim();
      return name ? { name, role: role || 'Specialist' } : null;
    })
    .filter(Boolean);

  const agents = normalizeAgents(agentLines, techs);
  return { techs, agents };
}

function generateConversationFlow(projectIdea, selectedFramework, selectedTechs) {
  const frameworkName = FRAMEWORK_NAMES[selectedFramework] || 'a framework';
  const techList = selectedTechs.join(', ') || 'no specific technologies';

  return [
    {
      aiMessage: `Perfect. I already have your project idea:\n\n> "${projectIdea.substring(0, 120)}${projectIdea.length > 120 ? '...' : ''}"\n\nSelected framework: **${frameworkName}**.\nCurrent stack: **${techList}**.\n\nNow I need you to define 2 things:\n1) **Technologies** (final stack)\n2) **Agents** you want to create (any you want) with their definition.\n\nPaste your response in **JSON** (recommended) with this template:\n\n\`\`\`json\n{\n  \"techs\": [\"react\", \"nodejs\", \"postgresql\"],\n  \"agents\": [\n    {\n      \"name\": \"Frontend\",\n      \"role\": \"UI & UX\",\n      \"description\": \"Builds the interface, components, and styles.\",\n      \"tools\": [\"react\", \"tailwind\"]\n    },\n    {\n      \"name\": \"Backend\",\n      \"role\": \"API & logic\",\n      \"description\": \"Designs endpoints, validations, and services.\",\n      \"tools\": [\"nodejs\", \"express\", \"postgresql\"]\n    }\n  ]\n}\n\`\`\`\n\nIf you prefer plain text, use bullets (minimum name):\n- Frontend: UI & UX\n- Backend: API & logic`,
      quickReplies: null,
      contextUpdates: {
        framework: frameworkName,
        stack: selectedTechs,
        status: 'gathering',
      },
    },
    {
      aiMessage: `Done. With this I can compile your agent team.\n\nWhen you see the **Compile Agents** button on the right panel, click it to generate and visualize the swarm.`,
      quickReplies: null,
      contextUpdates: {
        status: 'ready',
        projectSummary: `${frameworkName} + ${techList}`,
      },
    },
  ];
}

// ============================================================
// CHAT BUBBLE COMPONENT
// ============================================================

function ChatBubble({ role, content, animate = false, onTypingComplete }) {
  const isAI = role === 'ai';

  // Render markdown-like formatting for pre-existing messages
  const formatContent = (text) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('> ')) {
        return (
          <blockquote key={i} className="border-l-2 border-primary/40 pl-3 text-on-surface-variant italic my-2">
            {renderInline(line.substring(2))}
          </blockquote>
        );
      }
      if (!line.trim()) return <br key={i} />;
      return <p key={i} className="mb-1">{renderInline(line)}</p>;
    });
  };

  const renderInline = (text) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="text-on-surface font-bold text-primary/90">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={`flex gap-3 ${isAI ? 'justify-start' : 'justify-end'}`}
    >
      {isAI && (
        <div className="w-10 h-10 rounded-xl bg-secondary/10 border border-secondary/30 flex items-center justify-center shrink-0 mt-1 shadow-[0_0_15px_rgba(193,128,255,0.2)]">
          <span className="material-symbols-outlined text-secondary text-lg drop-shadow-[0_0_5px_#c180ff]" style={{ fontVariationSettings: "'FILL' 1" }}>
            smart_toy
          </span>
        </div>
      )}
      <div
        className={`max-w-[75%] rounded-2xl px-6 py-4 text-sm leading-relaxed ${
          isAI
            ? 'glass-panel-strong border-l-2 border-secondary/60 text-on-surface-variant shadow-[0_4px_20px_-10px_rgba(0,0,0,0.5)]'
            : 'bg-gradient-to-br from-primary/20 to-primary-container/10 border border-primary/30 text-on-surface shadow-[0_0_20px_-5px_rgba(58,223,250,0.2)] rounded-tr-sm'
        }`}
      >
        {isAI && animate ? (
          <TypewriterText text={content} speed={15} onComplete={onTypingComplete} className="text-on-surface-variant" />
        ) : (
          formatContent(content)
        )}
      </div>
      {!isAI && (
        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0 mt-1 shadow-[0_0_15px_rgba(58,223,250,0.2)]">
          <span className="material-symbols-outlined text-primary text-lg drop-shadow-[0_0_5px_#3adffa]">person</span>
        </div>
      )}
    </motion.div>
  );
}

// ============================================================
// TYPING INDICATOR
// ============================================================

function TypingIndicator() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="flex gap-3 justify-start"
    >
      <div className="w-10 h-10 rounded-xl bg-secondary/10 border border-secondary/30 flex items-center justify-center shrink-0 mt-1 shadow-[0_0_15px_rgba(193,128,255,0.2)]">
        <span className="material-symbols-outlined text-secondary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
      </div>
      <div className="glass-panel border-l-2 border-secondary/40 rounded-2xl px-5 py-4 flex items-center gap-2">
        <div className="typing-dot" />
        <div className="typing-dot" />
        <div className="typing-dot" />
      </div>
    </motion.div>
  );
}

// ============================================================
// CONTEXT PANEL (Right Side)
// ============================================================

function ContextPanel({ contextPanel, onGenerate }) {
  const isReady = contextPanel.status === 'ready';

  return (
    <div className="flex flex-col h-full bg-surface-container-low/80 backdrop-blur-3xl border-l border-white/5 relative z-10 w-full">
      <ParticleNetwork particleCount={20} className="opacity-20 absolute inset-0 pointer-events-none" />
      
      {/* Header */}
      <div className="p-6 border-b border-white/5 relative z-10">
        <h3 className="font-headline font-bold text-xl mb-1 flex items-center gap-2 drop-shadow-md">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_#3adffa]" />
          Agent Intelligence
        </h3>
        <p className="text-xs text-on-surface-variant/70">Accumulated context log</p>
      </div>

      {/* Context Items */}
      <div className="flex-1 overflow-auto p-6 space-y-6 custom-scrollbar relative z-10">
        <AnimatePresence>
          <motion.div layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
            <h4 className="text-[10px] text-on-surface-variant uppercase tracking-[0.2em] mb-3 flex items-center gap-2 font-bold">
              <span className="material-symbols-outlined text-sm text-primary drop-shadow-[0_0_5px_#3adffa]">hub</span>
              Framework
            </h4>
            {contextPanel.framework ? (
              <motion.span initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="inline-block px-4 py-2 bg-primary/10 border border-primary/30 text-primary text-sm rounded-lg font-bold shadow-[0_0_15px_-5px_#3adffa]">
                {contextPanel.framework}
              </motion.span>
            ) : (
              <span className="text-sm text-slate-600 font-mono italic flex items-center gap-2"><span className="w-1.5 h-1.5 bg-slate-600 rounded-full animate-pulse" /> pending</span>
            )}
          </motion.div>

          <motion.div layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
            <h4 className="text-[10px] text-on-surface-variant uppercase tracking-[0.2em] mb-3 flex items-center gap-2 font-bold mt-8">
              <span className="material-symbols-outlined text-sm text-secondary drop-shadow-[0_0_5px_#c180ff]">build</span>
              Confirmed Stack
            </h4>
            {contextPanel.stack.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {contextPanel.stack.map((tech) => (
                  <motion.span key={tech} initial={{ scale: 0 }} animate={{ scale: 1 }} className="px-3 py-1.5 bg-secondary/15 border border-secondary/20 text-secondary text-[11px] rounded font-bold uppercase tracking-widest drop-shadow-sm">
                    {tech}
                  </motion.span>
                ))}
              </div>
            ) : (
              <span className="text-sm text-slate-600 font-mono italic flex items-center gap-2"><span className="w-1.5 h-1.5 bg-slate-600 rounded-full animate-pulse" /> pending</span>
            )}
          </motion.div>

          <motion.div layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
            <h4 className="text-[10px] text-on-surface-variant uppercase tracking-[0.2em] mb-3 flex items-center gap-2 font-bold mt-8">
              <span className="material-symbols-outlined text-sm text-tertiary-dim drop-shadow-[0_0_5px_#a4ef3f]">person</span>
              User Context
            </h4>
            <span className="text-sm text-on-surface font-medium bg-white/5 px-3 py-1.5 rounded-md border border-white/10">
              {contextPanel.userLevel || <span className="text-slate-600 font-mono italic flex items-center gap-2"><span className="w-1.5 h-1.5 bg-slate-600 rounded-full animate-pulse" /> analyzing</span>}
            </span>
          </motion.div>

          <motion.div layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.3 }}>
            <h4 className="text-[10px] text-on-surface-variant uppercase tracking-[0.2em] mb-3 flex items-center gap-2 font-bold mt-8">
              <span className="material-symbols-outlined text-sm text-primary drop-shadow-[0_0_5px_#3adffa]">description</span>
              Directive Summary
            </h4>
            <p className="text-sm text-on-surface-variant leading-relaxed p-4 bg-black/20 rounded-xl border border-white/5 italic">
              {contextPanel.projectSummary || <span className="text-slate-600 font-mono">Synthesizing directive...</span>}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Generate Button Wrapper */}
      <div className="p-6 border-t border-white/5 relative z-20 min-h-[120px] flex items-center justify-center bg-surface-container-low/50">
        <AnimatePresence>
          {isReady ? (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="w-full relative border-beam rounded-xl"
            >
              <button
                onClick={onGenerate}
                className="w-full py-4 bg-gradient-to-r from-primary/90 to-primary-container/90 text-on-primary-container font-headline font-bold text-lg rounded-xl animate-pulse-glow active:scale-95 transition-all flex items-center justify-center gap-3 relative z-10 overflow-hidden group"
              >
                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/20 transition-colors" />
                <span className="material-symbols-outlined animate-bounce">rocket_launch</span>
                Compile Agents
              </button>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="flex items-center gap-3 font-mono text-xs text-slate-500 uppercase tracking-widest"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-pulse" />
              Awaiting Architecture Specs
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ============================================================
// CHAT PAGE — Main Component
// ============================================================

export default function ChatPage() {
  const navigate = useNavigate();
  const {
    projectIdea, selectedFramework, selectedTechs,
    chatHistory, contextPanel,
    updateContextPanel, updateState,
  } = useProject();

  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isAITypingText, setIsAITypingText] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [currentQuickReplies, setCurrentQuickReplies] = useState(null);
  const messagesEndRef = useRef(null);
  const conversationFlow = useRef(null);
  const initialized = useRef(false);

  useEffect(() => {
    conversationFlow.current = generateConversationFlow(
      projectIdea || 'an AI-powered application',
      selectedFramework,
      selectedTechs
    );
  }, [projectIdea, selectedFramework, selectedTechs]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, currentQuickReplies, isAITypingText, scrollToBottom]);

  const sendAIMessage = useCallback((step) => {
    if (!conversationFlow.current || step >= conversationFlow.current.length) return;

    const flowStep = conversationFlow.current[step];
    setIsTyping(true);
    setCurrentQuickReplies(null);

    setTimeout(() => {
      setIsTyping(false);
      setIsAITypingText(true);
      setMessages(prev => [...prev, { role: 'ai', content: flowStep.aiMessage, animate: true }]);
      
      // We don't show quick replies or update context until the text finishes typing
      // That logic is handled in handleTypingComplete
    }, 1500 + Math.random() * 800);
  }, []);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      sendAIMessage(0);
    }
  }, [sendAIMessage]);

  const handleTypingComplete = () => {
    setIsAITypingText(false);
    const flowStep = conversationFlow.current[currentStep];
    
    // Once typing completes, mark message as not animating anymore
    setMessages(prev => {
      const copy = [...prev];
      copy[copy.length - 1].animate = false;
      return copy;
    });

    if (flowStep.quickReplies) {
      setCurrentQuickReplies(flowStep.quickReplies);
    }
    if (flowStep.contextUpdates) {
      updateContextPanel(flowStep.contextUpdates);
    }
  };

  const handleSendMessage = (content) => {
    if (!content.trim() || isAITypingText || isTyping) return;

    setMessages(prev => [...prev, { role: 'user', content, animate: false }]);
    setInputValue('');
    setCurrentQuickReplies(null);

    const nextStep = currentStep + 1;
    if (currentStep === 0) {
      const parsed = parseAgentsAndTechsFromUserText(content);
      const techsFromUser = parsed.techs;
      const agentsFromUser = parsed.agents;

      if (techsFromUser.length > 0) {
        updateState({ selectedTechs: techsFromUser });
        updateContextPanel({ stack: techsFromUser });
      }

      if (agentsFromUser.length > 0) {
        updateState({ generatedAgents: agentsFromUser });
        updateContextPanel({
          projectSummary: `Agents: ${agentsFromUser.map(a => a.name).slice(0, 6).join(', ')}${agentsFromUser.length > 6 ? '…' : ''}`,
        });
      }
    }

    setCurrentStep(nextStep);

    setTimeout(() => {
      sendAIMessage(nextStep);
    }, 600);
  };

  const handleGenerate = () => {
    updateState({ projectStatus: 'generated' });
    navigate('/orchestration');
  };

  return (
    <AppLayout 
      rightPanel={<ContextPanel contextPanel={contextPanel} onGenerate={handleGenerate} />} 
      noPadding
    >
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex flex-col h-[calc(100vh-4rem)] relative"
      >
        <ParticleNetwork particleCount={30} className="opacity-10 fixed pointer-events-none" />

        {/* Chat Header */}
        <div className="px-8 py-5 border-b border-white/5 bg-surface-container-low/80 backdrop-blur-md relative z-10 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">psychology</span>
              </div>
              <div>
                <h2 className="font-headline font-bold text-lg text-on-surface tracking-wide drop-shadow-sm">Synthesis Chat</h2>
                <p className="text-[11px] font-mono text-primary/80 uppercase tracking-widest mt-0.5 animate-breathe">Active Neural Link</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/configurator')}
              className="text-xs font-bold tracking-widest uppercase text-outline hover:text-primary transition-colors flex items-center gap-2 px-4 py-2 hover:bg-white/5 rounded-lg"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              Return
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-12 py-8 space-y-8 custom-scrollbar relative z-10 scroll-smooth">
          {messages.map((msg, i) => (
            <ChatBubble
              key={i}
              role={msg.role}
              content={msg.content}
              animate={msg.animate}
              onTypingComplete={handleTypingComplete}
            />
          ))}

          <AnimatePresence>
            {isTyping && <TypingIndicator />}
          </AnimatePresence>

          {/* Quick Replies */}
          <AnimatePresence>
            {currentQuickReplies && !isTyping && !isAITypingText && (
              <motion.div 
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: { transition: { staggerChildren: 0.1 } }
                }}
                className="flex flex-col gap-3 max-w-[70%] ml-14"
              >
                {currentQuickReplies.map((reply) => (
                  <motion.button
                    key={reply}
                    variants={{
                      hidden: { opacity: 0, x: -20 },
                      visible: { opacity: 1, x: 0 }
                    }}
                    whileHover={{ scale: 1.02, x: 5 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSendMessage(reply)}
                    className="text-left px-5 py-3.5 rounded-xl glass-panel-strong border-outline-variant/30 text-sm text-on-surface-variant hover:text-primary hover:border-primary/50 hover:bg-primary/10 transition-colors shadow-sm"
                  >
                    {reply}
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={messagesEndRef} className="h-4" />
        </div>

        {/* Input Area */}
        <div className="px-8 py-6 border-t border-white/5 bg-surface-container-low/90 backdrop-blur-xl relative z-10">
          <div className="max-w-4xl mx-auto flex items-end gap-4 relative">
            <div className={`flex-1 relative transition-all duration-300 ${contextPanel.status === 'ready' ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(inputValue);
                  }
                }}
                placeholder={isAITypingText ? "Agent is typing..." : "Communicate your parameters..."}
                disabled={contextPanel.status === 'ready' || isAITypingText || isTyping}
                className="w-full bg-surface-container-highest border border-outline-variant/30 focus:border-primary/70 focus:ring-0 focus:outline-none rounded-2xl px-6 py-4 text-sm text-on-surface placeholder-outline disabled:opacity-50 transition-all shadow-inner custom-scrollbar resize-none max-h-32 min-h-[56px]"
                rows={1}
              />
              <div className="absolute right-4 bottom-4 flex gap-2 text-outline-variant">
                <span className="material-symbols-outlined text-sm hover:text-primary cursor-pointer transition-colors">mic</span>
                <span className="material-symbols-outlined text-sm hover:text-primary cursor-pointer transition-colors">attach_file</span>
              </div>
            </div>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleSendMessage(inputValue)}
              disabled={!inputValue.trim() || contextPanel.status === 'ready' || isAITypingText || isTyping}
              className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                inputValue.trim() && !isAITypingText && !isTyping && contextPanel.status !== 'ready'
                  ? 'bg-gradient-to-br from-primary to-primary-container text-on-primary-container shadow-[0_0_20px_-5px_#3adffa] drop-shadow-[0_0_5px_#3adffa]'
                  : 'bg-surface-container-highest text-slate-500 border border-outline-variant/20'
              }`}
            >
              <span className="material-symbols-outlined">send</span>
            </motion.button>
          </div>
        </div>
      </motion.div>
    </AppLayout>
  );
}
