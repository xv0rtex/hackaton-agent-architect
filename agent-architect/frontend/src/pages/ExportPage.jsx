import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import AppLayout from '../components/AppLayout';
import ParticleNetwork from '../components/ParticleNetwork';
import { useProject } from '../context/ProjectContext';
import JSZip from 'jszip';

const ROLE_ICON = {
  backend: 'database',
  frontend: 'brush',
  security: 'policy',
  database: 'storage',
  devops: 'cloud_sync',
  qa: 'bug_report',
  ux: 'design_services',
};

const ROLE_COLORS = {
  backend:  { border: 'border-primary/40',   bg: 'bg-primary/8',   text: 'text-primary',      glow: 'rgba(58,223,250,0.15)' },
  frontend: { border: 'border-secondary/40', bg: 'bg-secondary/8', text: 'text-secondary',    glow: 'rgba(193,128,255,0.15)' },
  security: { border: 'border-red-400/40',   bg: 'bg-red-400/8',   text: 'text-red-400',      glow: 'rgba(255,113,108,0.15)' },
  database: { border: 'border-tertiary-dim/40', bg: 'bg-tertiary-dim/8', text: 'text-tertiary-dim', glow: 'rgba(164,239,63,0.15)' },
  devops:   { border: 'border-amber-400/40', bg: 'bg-amber-400/8', text: 'text-amber-400',    glow: 'rgba(255,183,77,0.15)' },
  qa:       { border: 'border-cyan-400/40',  bg: 'bg-cyan-400/8',  text: 'text-cyan-400',     glow: 'rgba(79,195,247,0.15)' },
  ux:       { border: 'border-pink-400/40',  bg: 'bg-pink-400/8',  text: 'text-pink-400',     glow: 'rgba(236,72,153,0.15)' },
};

function getRoleStyle(role) {
  const r = (role || '').toLowerCase();
  return ROLE_COLORS[r] || ROLE_COLORS.backend;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 100);
}

export default function ExportPage() {
  const { projectId } = useParams();
  const { updateState } = useProject();
  const [projectName, setProjectName] = useState('');
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadingIdx, setDownloadingIdx] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [mcpOpen, setMcpOpen] = useState(false);

  useEffect(() => {
    if (projectId) {
      updateState({ currentProjectId: projectId });
      refreshAgents();
    }
  }, [projectId]);

  const regenerateAgents = async () => {
    try {
      await fetch(`/api/agents/${projectId}/generate`, { method: 'POST' });
    } catch (e) {
      console.warn('Could not regenerate agents before export', e);
    }
  };

  const loadAgents = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/agents/project/${projectId}`);
      if (!res.ok) throw new Error('Could not load agents');
      const data = await res.json();
      setProjectName(data.projectName || `Project #${projectId}`);
      const list = data.agents || [];
      setAgents(list);
      setLoading(false);
      return list;
    } catch (e) {
      console.error(e);
      setAgents([]);
      setLoading(false);
      return [];
    }
  };

  const refreshAgents = async () => {
    setLoading(true);
    await regenerateAgents();
    return await loadAgents();
  };

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleDownloadSingle = async (agent, idx) => {
    setDownloadingIdx(idx);
    try {
      const latestAgents = await refreshAgents();
      const latest = latestAgents.find((a) => (a.filename || a.name) === (agent.filename || agent.name)) || agent;
      const content = latest.content || `# ${latest.name}\n\nRole: ${latest.role}\nStack: ${latest.stack || '—'}\n\n${latest.description || ''}`;
      const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
      downloadBlob(blob, latest.filename || `${latest.name}.md`);
      showSuccess(`${latest.name} downloaded successfully`);
    } catch (e) {
      console.error(e);
    }
    setDownloadingIdx(null);
  };

  const handleDownloadAll = async () => {
    if (agents.length === 0) return;
    setDownloadingAll(true);
    try {
      const latestAgents = await refreshAgents();
      const zip = new JSZip();
      const folder = zip.folder('agents');
      for (const agent of latestAgents) {
        const content = agent.content || `# ${agent.name}\n\nRole: ${agent.role}\nStack: ${agent.stack || '—'}\n\n${agent.description || ''}`;
        folder.file(agent.filename || `${agent.name}.md`, content);
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      const safeName = (projectName || 'agents').replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
      downloadBlob(blob, `${safeName}_agents.zip`);
      showSuccess(`${agents.length} agents downloaded as ZIP`);
    } catch (e) {
      console.error(e);
    }
    setDownloadingAll(false);
  };



  return (
    <AppLayout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-[1600px] mx-auto min-h-[calc(100vh-8rem)] relative pb-8"
      >
        <ParticleNetwork particleCount={36} className="opacity-15 fixed" />

        {/* Header */}
        <div className="relative z-10 mb-8 pt-4 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div>
            <span className="inline-block px-3 py-1 bg-secondary/10 border border-secondary/25 text-secondary text-[10px] uppercase tracking-widest rounded-full font-bold mb-3">
              Step 05 · Export
            </span>
            <h1 className="text-4xl md:text-5xl font-headline font-bold text-on-surface tracking-tight">
              Export Agents
            </h1>
            <p className="text-on-surface-variant mt-2 max-w-2xl text-sm md:text-base font-light">
              Download the <code className="text-primary/80 bg-primary/5 px-1.5 py-0.5 rounded text-xs">.md</code> files for
              each agent to integrate them into your project. You can download all at once as ZIP or individually.
            </p>
          </div>

          {/* Action Buttons */}
          {agents.length > 0 && (
            <div className="flex items-center gap-3 shrink-0">
              {/* MCP Button */}
              <motion.button
                type="button"
                onClick={() => setMcpOpen(true)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="px-6 py-4 rounded-2xl border bg-primary/5 border-primary/20 hover:border-primary/40 hover:shadow-[0_0_30px_-10px_rgba(58,223,250,0.3)] text-on-surface font-headline font-bold text-sm flex items-center gap-3 transition-all duration-300"
              >
                <span className="material-symbols-outlined text-xl text-primary">integration_instructions</span>
                <span>MCP</span>
              </motion.button>

              {/* Download All Button */}
              <motion.button
                type="button"
                onClick={handleDownloadAll}
                disabled={downloadingAll}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="px-8 py-4 rounded-2xl bg-gradient-to-br from-secondary/30 to-primary/20 border border-secondary/30 text-on-surface font-headline font-bold text-sm flex items-center gap-3 hover:border-secondary/60 hover:shadow-[0_0_40px_-12px_rgba(193,128,255,0.5)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <span className="material-symbols-outlined text-xl text-secondary group-hover:animate-bounce">
                  {downloadingAll ? 'progress_activity' : 'folder_zip'}
                </span>
                <span>
                  {downloadingAll ? 'Generating ZIP…' : `Download all (${agents.length})`}
                </span>
              </motion.button>
            </div>
          )}
        </div>

        {/* Success Toast */}
        <AnimatePresence>
          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="fixed top-20 right-8 z-50 px-5 py-3 rounded-xl bg-tertiary-dim/15 border border-tertiary-dim/30 text-tertiary-dim text-sm font-medium flex items-center gap-2 shadow-2xl backdrop-blur-xl"
            >
              <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              {successMsg}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative z-10 grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Summary Card */}
          <div className="xl:col-span-4 flex flex-col gap-5">
            {/* Stats Panel */}
            <div className="rounded-2xl border border-white/5 bg-surface-container-low/80 backdrop-blur-xl p-6 shadow-xl">
              <h2 className="font-headline font-bold text-lg text-on-surface mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">analytics</span>
                Export summary
              </h2>

              {loading ? (
                <div className="flex items-center gap-2 text-primary text-sm font-mono animate-pulse">
                  <span className="material-symbols-outlined animate-spin">progress_activity</span>
                  Loading agents…
                </div>
              ) : agents.length === 0 ? (
                <div className="text-center py-8">
                  <span className="material-symbols-outlined text-5xl text-slate-600 mb-3 block">folder_off</span>
                  <p className="text-sm text-slate-500">No agents generated yet.</p>
                  <p className="text-xs text-slate-600 mt-1">Generate agents in the Orchestration section.</p>
                  <Link
                    to={`/project/${projectId}/orchestration`}
                    className="inline-block mt-4 text-xs text-primary hover:underline"
                  >
                    ← Go to Orchestration
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-base">groups</span>
                      <span className="text-xs text-slate-400 uppercase tracking-wider">Agents</span>
                    </div>
                    <span className="text-xl font-headline font-bold text-on-surface">{agents.length}</span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-secondary text-base">description</span>
                      <span className="text-xs text-slate-400 uppercase tracking-wider">.md Files</span>
                    </div>
                    <span className="text-xl font-headline font-bold text-on-surface">{agents.length}</span>
                  </div>



                  <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-amber-400 text-base">folder</span>
                      <span className="text-xs text-slate-400 uppercase tracking-wider">Target path</span>
                    </div>
                    <code className="text-xs text-primary/80 bg-primary/5 px-2 py-1 rounded">agents/</code>
                  </div>
                </div>
              )}
            </div>

            {/* Tip Card */}
            <div className="rounded-2xl border border-secondary/20 bg-secondary/5 p-5 text-sm text-on-surface-variant">
              <p className="flex items-center gap-2 text-secondary font-bold text-xs uppercase tracking-widest mb-2">
                <span className="material-symbols-outlined text-base">tips_and_updates</span>
                How to use agents
              </p>
              <ol className="list-decimal list-inside space-y-1.5 text-xs">
                <li>Download the ZIP with all agents.</li>
                <li>Extract at your project root: files will go into <code className="text-secondary/80 bg-secondary/5 px-1 rounded">agents/</code></li>
                <li>Each <code className="text-secondary/80 bg-secondary/5 px-1 rounded">.md</code> contains the full agent system prompt.</li>
                <li>Use them with Claude Code, Cursor, or another IDE with agent support.</li>
              </ol>
              <Link
                to={`/project/${projectId}/office`}
                className="inline-block mt-4 text-xs text-secondary hover:underline"
              >
                ← Back to Office
              </Link>
            </div>
          </div>

          {/* Agents Grid */}
          <div className="xl:col-span-8">
            <div className="rounded-2xl border border-white/5 bg-surface-container-low/80 backdrop-blur-xl shadow-xl overflow-hidden">
              {/* Grid Header */}
              <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-widest text-secondary font-bold">Available agents</p>
                  <p className="text-xs text-on-surface-variant truncate">
                    {projectName} · {agents.length} archivo{agents.length !== 1 ? 's' : ''} exportable{agents.length !== 1 ? 's' : ''}
                  </p>
                </div>
                {agents.length > 0 && (
                  <button
                    type="button"
                    onClick={handleDownloadAll}
                    disabled={downloadingAll}
                    className="text-[10px] uppercase tracking-wider px-4 py-2 rounded-lg border border-secondary/20 text-secondary hover:bg-secondary/10 hover:border-secondary/40 transition-colors shrink-0 disabled:opacity-40"
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm">download</span>
                      ZIP
                    </span>
                  </button>
                )}
              </div>

              {/* Agents List */}
              <div className="p-5 space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar">
                {loading ? (
                  <div className="flex items-center justify-center py-16 text-primary font-mono text-sm animate-pulse">
                    <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
                    Loading…
                  </div>
                ) : agents.length === 0 ? (
                  <div className="text-center py-16 text-slate-500">
                    <span className="material-symbols-outlined text-5xl mb-3 block opacity-30">smart_toy</span>
                    <p className="text-sm">No generated agents</p>
                  </div>
                ) : (
                  <AnimatePresence>
                    {agents.map((agent, idx) => {
                      const role = (agent.role || 'backend').toLowerCase();
                      const icon = ROLE_ICON[role] || 'smart_toy';
                      const style = getRoleStyle(role);
                      const sizeKb = agent.content ? (new Blob([agent.content]).size / 1024).toFixed(1) : '0';
                      const isDownloading = downloadingIdx === idx;

                      return (
                        <motion.div
                          key={agent.filename || idx}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.25, delay: idx * 0.06 }}
                          className={`group rounded-xl border ${style.border} ${style.bg} p-4 transition-all duration-300 hover:shadow-lg`}
                          style={{ '--agent-glow': style.glow }}
                        >
                          <div className="flex items-center gap-4">
                            {/* Icon */}
                            <div className={`w-11 h-11 rounded-lg flex items-center justify-center bg-black/20 border border-white/5 shrink-0`}>
                              <span className={`material-symbols-outlined text-xl ${style.text}`}>{icon}</span>
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <h3 className="text-sm font-bold text-on-surface truncate">{agent.name}</h3>
                                <span className={`text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full bg-black/20 ${style.text}`}>
                                  {role}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-[10px] text-slate-500">
                                <span className="flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[12px]">description</span>
                                  {agent.filename}
                                </span>

                                <span className="flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[12px]">weight</span>
                                  {sizeKb} KB
                                </span>
                              </div>
                              {agent.stack && (
                                <p className="text-[10px] text-slate-600 mt-1 truncate">
                                  Stack: {agent.stack}
                                </p>
                              )}
                            </div>

                            {/* Download button */}
                            <motion.button
                              type="button"
                              onClick={() => handleDownloadSingle(agent, idx)}
                              disabled={isDownloading}
                              whileHover={{ scale: 1.08 }}
                              whileTap={{ scale: 0.93 }}
                              className={`shrink-0 w-10 h-10 rounded-xl border border-white/10 bg-black/20 flex items-center justify-center transition-all duration-200 hover:border-white/20 hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed group-hover:shadow-md`}
                              title={`Download ${agent.filename}`}
                            >
                              <span className={`material-symbols-outlined text-lg ${isDownloading ? 'animate-spin text-primary' : 'text-slate-400 group-hover:text-on-surface'}`}>
                                {isDownloading ? 'progress_activity' : 'download'}
                              </span>
                            </motion.button>
                          </div>

                          {/* Preview snippet */}
                          {agent.content && (
                            <details className="mt-3 group/preview">
                              <summary className="text-[10px] text-slate-600 cursor-pointer hover:text-slate-400 transition-colors flex items-center gap-1 select-none">
                                <span className="material-symbols-outlined text-[12px]">visibility</span>
                                Vista previa
                              </summary>
                              <pre className="mt-2 p-3 rounded-lg bg-black/30 border border-white/5 text-[11px] text-slate-400 font-mono overflow-x-auto custom-scrollbar max-h-48 leading-relaxed whitespace-pre-wrap">
                                {agent.content.slice(0, 800)}{agent.content.length > 800 ? '\n\n…' : ''}
                              </pre>
                            </details>
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* MCP Modal */}
      <AnimatePresence>
        {mcpOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
              onClick={() => setMcpOpen(false)}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-0 z-[101] flex items-center justify-center p-6"
              onClick={() => setMcpOpen(false)}
            >
              <div
                className="w-full max-w-2xl max-h-[80vh] overflow-y-auto custom-scrollbar rounded-3xl border border-primary/20 bg-surface-container-low/98 backdrop-blur-2xl shadow-[0_0_80px_-20px_rgba(58,223,250,0.15)] p-8 relative"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close button */}
                <button
                  onClick={() => setMcpOpen(false)}
                  className="absolute top-4 right-4 w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-on-surface hover:bg-white/10 transition-colors"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>

                {/* Title */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary">integration_instructions</span>
                  </div>
                  <div>
                    <h2 className="font-headline font-bold text-xl text-on-surface">MCP Setup</h2>
                    <p className="text-xs text-on-surface-variant">Connect your agents with Claude Code</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Step 1 */}
                  <div className="rounded-2xl bg-black/15 border border-white/5 p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="w-7 h-7 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-primary text-xs font-bold shrink-0">1</span>
                      <h3 className="text-sm font-bold text-on-surface">MCP Server Installation</h3>
                    </div>
                    <p className="text-sm text-on-surface-variant mb-3 pl-10">
                      Run these commands in your terminal to clone the repository and install dependencies:
                    </p>
                    <div className="rounded-xl bg-black/40 border border-white/5 p-5 font-mono text-xs text-slate-300 leading-loose ml-10">
                      <div className="text-slate-600"># Clone the repository</div>
                      <div className="text-primary">git clone https://github.com/xv0rtex/mcp-agent_architect</div>
                      <div className="mt-3 text-slate-600"># Enter directory and install dependencies</div>
                      <div className="text-primary">cd mcp-agent_architect</div>
                      <div className="text-primary">npm install</div>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="rounded-2xl bg-black/15 border border-white/5 p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="w-7 h-7 rounded-full bg-secondary/15 border border-secondary/30 flex items-center justify-center text-secondary text-xs font-bold shrink-0">2</span>
                      <h3 className="text-sm font-bold text-on-surface">Configuration in Claude</h3>
                    </div>
                    <p className="text-sm text-on-surface-variant mb-3 pl-10">
                      Go back to your project root and link the server to Claude with this command:
                    </p>
                    <div className="rounded-xl bg-black/40 border border-white/5 p-5 font-mono text-xs text-primary leading-relaxed ml-10">
                      claude mcp add hackatin-agents -- node mcp-agent_architect/index.js
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="rounded-2xl bg-black/15 border border-white/5 p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="w-7 h-7 rounded-full bg-tertiary-dim/15 border border-tertiary-dim/30 flex items-center justify-center text-tertiary-dim text-xs font-bold shrink-0">3</span>
                      <h3 className="text-sm font-bold text-on-surface">Verification and Import</h3>
                    </div>
                    <p className="text-sm text-on-surface-variant mb-4 pl-10">
                      Once configured, open Claude and follow these steps:
                    </p>
                    <ul className="space-y-3 pl-10 text-sm text-on-surface-variant">
                      <li className="flex gap-3">
                        <span className="material-symbols-outlined text-primary text-base shrink-0 mt-0.5">check_circle</span>
                        <span><strong className="text-on-surface">Verify connection:</strong> Run <code className="text-primary bg-primary/5 px-1.5 py-0.5 rounded text-xs">/mcp</code> to confirm that <code className="text-primary bg-primary/5 px-1.5 py-0.5 rounded text-xs">hackatin-agents</code> appears in the list.</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="material-symbols-outlined text-secondary text-base shrink-0 mt-0.5">smart_toy</span>
                        <span><strong className="text-on-surface">Import agents:</strong> Request the import with this prompt:</span>
                      </li>
                    </ul>
                    <div className="rounded-xl bg-secondary/5 border border-secondary/15 p-4 mt-3 ml-[3.25rem] text-sm text-secondary italic leading-relaxed">
                      "Let's import the AI agents from project <strong className="text-on-surface not-italic">[PROJECT_NAME]</strong> with mcp hackatin-agents"
                    </div>
                    <ul className="pl-10 mt-3 text-sm text-on-surface-variant">
                      <li className="flex gap-3">
                        <span className="material-symbols-outlined text-tertiary-dim text-base shrink-0 mt-0.5">rocket_launch</span>
                        <span><strong className="text-on-surface">Deploy:</strong> Restart Claude and use <code className="text-primary bg-primary/5 px-1.5 py-0.5 rounded text-xs">/agents</code> to view and use your imported agents.</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
