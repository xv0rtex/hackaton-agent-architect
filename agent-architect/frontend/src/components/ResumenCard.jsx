import React from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';

const ROLE_ICON = {
  backend: "database",
  frontend: "brush",
  security: "policy",
  database: "storage",
  devops: "cloud_sync",
  qa: "bug_report",
  ux: "design_services",
};

const ROLE_COLOR = {
  backend: { bg: "rgba(58,223,250,0.12)", border: "rgba(58,223,250,0.35)", text: "#3adffa" },
  frontend: { bg: "rgba(193,128,255,0.12)", border: "rgba(193,128,255,0.35)", text: "#c180ff" },
  security: { bg: "rgba(255,113,108,0.12)", border: "rgba(255,113,108,0.35)", text: "#ff716c" },
  database: { bg: "rgba(164,239,63,0.12)", border: "rgba(164,239,63,0.35)", text: "#a4ef3f" },
  devops: { bg: "rgba(0,203,230,0.12)", border: "rgba(0,203,230,0.35)", text: "#00cbe6" },
  qa: { bg: "rgba(255,193,7,0.12)", border: "rgba(255,193,7,0.35)", text: "#ffc107" },
  ux: { bg: "rgba(233,205,255,0.12)", border: "rgba(233,205,255,0.35)", text: "#e9cdff" },
};

const MarkdownComponents = {
  p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children || ""}</p>,
  strong: ({ children }) => <strong className="font-bold text-primary shadow-sm">{children || ""}$</strong>,
  ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1">{children || ""}</ul>,
  li: ({ children }) => <li className="ml-2">{children || ""}</li>,
};

function parseResumenBlock(text) {
  if (!text || typeof text !== 'string' || !text.includes('[RESUMEN]')) return null;

  const resumenStart = text.indexOf('[RESUMEN]');
  const resumenEnd = text.indexOf('[/RESUMEN]');
  if (resumenStart < 0 || resumenEnd < 0 || resumenEnd <= resumenStart) return null;

  const before = text.substring(0, resumenStart).trim();
  const after = text.substring(resumenEnd + '[/RESUMEN]'.length).trim();
  const block = text.substring(resumenStart + '[RESUMEN]'.length, resumenEnd).trim();

  const result = { before, after, idea: '', backend: '', frontend: '', database: '', agents: [] };

  try {
    const agentsMatch = block.match(/agents[^:]*:\s*(\[[\s\S]*\])/i);
    let agentsRaw = null;
    if (agentsMatch) {
      agentsRaw = agentsMatch[1];
    }

    const linesBlock = agentsMatch ? block.replace(agentsMatch[0], '') : block;
    for (const line of linesBlock.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const colon = trimmed.indexOf(':');
      if (colon <= 0) continue;
      const key = trimmed.substring(0, colon).replace(/\*/g, '').trim().toLowerCase();
      const value = trimmed.substring(colon + 1).replace(/^\*+/, '').trim();
      if (!value) continue;
      if (key === 'idea') result.idea = value;
      else if (key === 'backend') result.backend = value;
      else if (key === 'frontend') result.frontend = value;
      else if (key === 'database') result.database = value;
    }

    if (agentsRaw) {
      try {
        const agents = JSON.parse(agentsRaw);
        if (Array.isArray(agents)) {
          result.agents = agents;
        }
      } catch (_) {}
    }
  } catch (e) {
    console.warn("Parse error in ResumenCard", e);
  }

  return result;
}

function AgentMiniCard({ agent, index }) {
  if (!agent) return null;
  const role = (agent.role || 'backend').toLowerCase();
  const colors = ROLE_COLOR[role] || ROLE_COLOR.backend;
  const icon = ROLE_ICON[role] || 'smart_toy';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.1, type: 'spring', stiffness: 300, damping: 25 }}
      className="rounded-xl p-4 relative overflow-hidden"
      style={{
        background: colors.bg,
        border: `1px solid ${colors.border}`,
      }}
    >
      <div
        className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-20 blur-2xl"
        style={{ background: colors.text }}
      />

      <div className="flex items-start gap-3 relative z-10">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${colors.text}22`, border: `1px solid ${colors.border}` }}
        >
          <span
            className="material-symbols-outlined text-lg"
            style={{ color: colors.text, fontVariationSettings: "'FILL' 1" }}
          >
            {icon}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-headline font-bold text-sm" style={{ color: colors.text }}>
              {agent.title || agent.name || 'Agent'}
            </span>
            <span
              className="text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full"
              style={{
                background: `${colors.text}15`,
                color: colors.text,
                border: `1px solid ${colors.border}`,
              }}
            >
              {role}
            </span>
          </div>

          {agent.stack && (
            <div className="text-[11px] text-on-surface-variant/80 font-mono mb-1">
              🛠 {agent.stack}
            </div>
          )}

          {(agent.description || agent.instructions) && (
            <div className="text-xs text-on-surface-variant/70 leading-relaxed">
              <ReactMarkdown rehypePlugins={[rehypeRaw]} components={MarkdownComponents}>
                {(agent.description || agent.instructions) || ""}
              </ReactMarkdown>
            </div>
          )}

          {agent.personality && (
            <div className="text-[11px] text-on-surface-variant/50 italic mt-1.5 leading-relaxed flex items-start gap-1">
              <span className="shrink-0 mt-0.5">💬</span>
              <ReactMarkdown rehypePlugins={[rehypeRaw]} components={MarkdownComponents}>
                {agent.personality || ""}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function StackPill({ label, value, icon, color }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
      <span className="material-symbols-outlined text-base" style={{ color }}>
        {icon}
      </span>
      <div>
        <div className="text-[9px] uppercase tracking-widest text-on-surface-variant/50 font-bold">{label}</div>
        <div className="text-sm text-on-surface font-medium">{value}</div>
      </div>
    </div>
  );
}

export default function ResumenCard({ text }) {
  const data = React.useMemo(() => parseResumenBlock(text), [text]);

  if (!data) {
    return (
      <div className="whitespace-pre-wrap leading-relaxed">
        <ReactMarkdown rehypePlugins={[rehypeRaw]} components={MarkdownComponents}>
          {text || ""}
        </ReactMarkdown>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.before && (
        <div className="text-sm text-on-surface-variant leading-relaxed">
          <ReactMarkdown rehypePlugins={[rehypeRaw]} components={MarkdownComponents}>
            {data.before}
          </ReactMarkdown>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 250, damping: 22 }}
        className="rounded-xl border border-primary/20 overflow-hidden shadow-lg shadow-primary/5"
        style={{ background: 'linear-gradient(135deg, rgba(58,223,250,0.05) 0%, rgba(193,128,255,0.05) 100%)' }}
      >
        <div className="px-5 py-3 border-b border-white/[0.06] flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
            architecture
          </span>
          <span className="text-xs font-headline font-bold uppercase tracking-widest text-primary">
            Project Configuration
          </span>
        </div>

        {data.idea && (
          <div className="px-5 py-3 border-b border-white/[0.04]">
            <div className="text-[9px] uppercase tracking-widest text-on-surface-variant/50 font-bold mb-1">Idea</div>
            <p className="text-sm text-on-surface font-medium italic">"{data.idea}"</p>
          </div>
        )}

        <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StackPill label="Backend" value={data.backend} icon="terminal" color="#3adffa" />
          <StackPill label="Frontend" value={data.frontend} icon="web" color="#c180ff" />
          <StackPill label="Database" value={data.database} icon="storage" color="#a4ef3f" />
        </div>
      </motion.div>

      {data.agents && data.agents.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <span className="material-symbols-outlined text-secondary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
              groups
            </span>
            <span className="text-[10px] uppercase tracking-widest text-on-surface-variant/60 font-bold">
              Agent Team ({data.agents.length})
            </span>
          </div>

          <div className="grid gap-3">
            {data.agents.map((agent, i) => (
              <AgentMiniCard key={agent.name || i} agent={agent} index={i} />
            ))}
          </div>
        </div>
      )}

      {data.after && (
        <div className="text-sm text-on-surface-variant leading-relaxed font-medium">
          <ReactMarkdown rehypePlugins={[rehypeRaw]} components={MarkdownComponents}>
            {data.after}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}
