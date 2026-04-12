import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ParticleNetwork from '../components/ParticleNetwork';
import ScrollReveal, { ScrollRevealItem } from '../components/ScrollReveal';
import TiltCard from '../components/TiltCard';
import MagneticButton from '../components/MagneticButton';
import AnimatedCounter from '../components/AnimatedCounter';
import TypewriterText from '../components/TypewriterText';

export default function LandingPage() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-background text-on-background font-body dot-grid-bg relative"
    >
      <ParticleNetwork particleCount={80} interactive={true} />
      
      <div className="relative z-10">
        <Navbar transparent />

        <main className="pt-24">
          {/* ========== HERO SECTION ========== */}
          <section className="relative min-h-[90vh] flex items-center px-6 lg:px-24 overflow-hidden">
            {/* Background floating orbs */}
            <div className="absolute top-1/4 right-[10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] animate-float-delayed pointer-events-none" />
            <div className="absolute bottom-1/4 left-[10%] w-[400px] h-[400px] bg-secondary/10 rounded-full blur-[100px] animate-float-slow pointer-events-none" />

            <div className="relative z-20 max-w-4xl">
              <ScrollReveal variant="fadeUp" delay={0.1}>
                <span className="font-headline text-tertiary-dim tracking-[0.3em] uppercase text-sm mb-4 block font-bold">
                  The Synthetic Architect
                </span>
                <h1 className="font-headline text-6xl md:text-8xl font-bold leading-[0.9] tracking-tighter text-on-background mb-8">
                  Collaborative <br />
                  <span className="gradient-text-animated">AI Teams.</span>
                </h1>
              </ScrollReveal>

              <ScrollReveal variant="fadeUp" delay={0.3}>
                <div className="text-on-surface-variant text-xl max-w-xl leading-relaxed mb-10 font-light min-h-[90px]">
                  <TypewriterText 
                    text="Describe your project. Choose your stack. Let AI architect a collaborative team of specialized agents, ready to deploy on CrewAI, AutoGen, or LangChain."
                    speed={20}
                  />
                </div>
              </ScrollReveal>

              <ScrollReveal variant="fadeUp" delay={0.5}>
                <div className="flex flex-wrap gap-4">
                  <MagneticButton
                    to="/configurator"
                    className="bg-gradient-to-br from-primary to-primary-container text-on-primary-container px-8 py-4 rounded-md font-headline font-bold text-lg shadow-[0_0_30px_-5px_rgba(58,223,250,0.4)] transition-shadow hover:shadow-[0_0_50px_-5px_rgba(58,223,250,0.6)] flex items-center gap-2"
                  >
                    Start Building
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </MagneticButton>
                  <MagneticButton
                    className="px-8 py-4 rounded-md font-headline font-bold text-lg border border-outline-variant/30 hover:bg-white/5 transition-all text-on-background flex items-center gap-2"
                  >
                    View Documentation
                  </MagneticButton>
                </div>
              </ScrollReveal>
            </div>
          </section>

          {/* ========== STATS BAR ========== */}
          <section className="px-6 lg:px-24 pb-12 relative z-20">
            <ScrollReveal stagger delay={0.1} className="grid grid-cols-2 md:grid-cols-4 gap-8 py-12 border-y border-outline-variant/10 glass-panel">
              {[
                { value: "99.9", suffix: "%", label: 'Sync Accuracy', color: 'text-primary' },
                { value: "500", suffix: "ms", label: 'Decision Latency', color: 'text-secondary' },
                { value: "10", suffix: "k+", label: 'Active Agents', color: 'text-tertiary-dim' },
                { value: "2026", suffix: "", label: 'Next-Gen Spec', color: 'text-white' },
              ].map((stat) => (
                <ScrollRevealItem key={stat.label} className="text-center md:text-left md:pl-8 border-l border-outline-variant/20 first:border-0 md:first:border-l">
                  <div className={`font-headline text-4xl md:text-5xl font-bold ${stat.color} mb-1 drop-shadow-lg`}>
                    <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                  </div>
                  <div className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-on-surface-variant">{stat.label}</div>
                </ScrollRevealItem>
              ))}
            </ScrollReveal>
          </section>

          {/* ========== THE ORCHESTRATION FLOW (Bento Grid) ========== */}
          <section className="px-6 lg:px-24 py-24 bg-surface-container-low/50 relative z-20">
            <ScrollReveal variant="fadeUp" className="text-center mb-16">
              <h2 className="font-headline text-4xl font-bold mb-4 tracking-tight">The Orchestration Flow</h2>
              <div className="w-24 h-1 bg-gradient-to-r from-primary to-secondary mx-auto rounded-full" />
            </ScrollReveal>

            <ScrollReveal stagger delay={0.2} className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { num: '01', title: 'Describe', desc: 'Define your goals in natural language. Our intent engine turns complex requirements into executable manifests.', color: 'text-primary', border: 'hover:border-primary/40', bar: 'bg-primary', barWidth: 'w-1/3', icon: 'edit_note' },
                { num: '02', title: 'Choose Tech', desc: 'Select your stack. From classic SQL to next-gen vector databases, map agents to their native environments.', color: 'text-secondary', border: 'hover:border-secondary/40', bar: 'bg-secondary', barWidth: 'w-2/3', icon: 'settings_input_component' },
                { num: '03', title: 'Orchestrate', desc: 'Watch synergy in action. Real-time visualization of data flow and agent communication.', color: 'text-tertiary-dim', border: 'hover:border-tertiary/40', bar: 'bg-tertiary-dim', barWidth: 'w-full', icon: 'hub' },
              ].map((step) => (
                <ScrollRevealItem key={step.num}>
                  <TiltCard tiltIntensity={5} spotlightOpacity={0.1} className={`group p-8 rounded-xl glass-panel-strong border border-outline-variant/10 ${step.border} transition-all duration-500 flex flex-col justify-between h-96 relative overflow-hidden`} >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 group-hover:scale-110 group-hover:rotate-12 transition-all duration-500">
                      <span className="material-symbols-outlined text-8xl" style={{ fontVariationSettings: "'FILL' 1" }}>{step.icon}</span>
                    </div>
                    <div className="relative z-10">
                      <div className={`${step.color} font-headline text-5xl font-bold mb-4 drop-shadow-md`}>{step.num}</div>
                      <h3 className="text-2xl font-headline font-bold mb-2">{step.title}</h3>
                      <p className="text-on-surface-variant leading-relaxed">{step.desc}</p>
                    </div>
                    <div className="h-1 w-full bg-surface-variant rounded-full overflow-hidden relative z-10">
                      <div className={`h-full ${step.bar} ${step.barWidth}`} />
                    </div>
                  </TiltCard>
                </ScrollRevealItem>
              ))}
            </ScrollReveal>
          </section>

          {/* ========== SPECIALIZED AGENTS ========== */}
          <section className="px-6 lg:px-24 py-24 relative z-20">
            <div className="flex flex-col lg:flex-row gap-16 items-start">
              <ScrollReveal variant="slideRight" className="lg:sticky lg:top-32 max-w-sm">
                <h2 className="font-headline text-5xl font-bold mb-6">
                  Specialized <br /> <span className="gradient-text-animated">Agents</span>
                </h2>
                <p className="text-on-surface-variant mb-8 leading-relaxed">
                  Deploy specialized pre-trained models optimized for concrete domains in your synthetic team.
                </p>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 glass-panel rounded-lg border-l-2 border-primary hover:border-l-4 transition-all">
                    <span className="material-symbols-outlined text-primary shadow-[0_0_10px_#3adffa66] rounded-full">terminal</span>
                    <span className="font-headline text-sm font-bold tracking-wide">Auto-scaling Infrastructure</span>
                  </div>
                  <div className="flex items-center gap-3 p-4 hover:bg-white/5 rounded-lg transition-colors border-l-2 border-transparent">
                    <span className="material-symbols-outlined text-slate-400">shield_lock</span>
                    <span className="font-headline text-sm font-medium">Compliance-first Design</span>
                  </div>
                </div>
              </ScrollReveal>

              <ScrollReveal stagger delay={0.2} className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { tag: 'System Architect', tagColor: 'bg-primary-container/20 text-on-primary-container', name: 'Backend Agent', desc: 'Expert in Go, Rust, and distributed architectures. Optimized for high throughput and low latency.', icon: 'database', iconColor: 'text-primary', techs: ['GRPC', 'KUBERNETES', 'POSTGRES'] },
                  { tag: 'UX Engineer', tagColor: 'bg-secondary-container/20 text-on-secondary-container', name: 'Frontend Agent', desc: 'Specialist in React, Swift, and expressive UI components. Master of visual flow.', icon: 'brush', iconColor: 'text-secondary', techs: ['NEXT.JS', 'TAILWIND', 'GLSL'] },
                  { tag: 'Sentry Alpha', tagColor: 'bg-tertiary-container/20 text-on-tertiary-container', name: 'Security Agent', desc: 'Continuous vulnerability scanning and automated patch orchestration.', icon: 'policy', iconColor: 'text-tertiary-dim', techs: ['ZERO TRUST', 'SOC2', 'E2EE'] },
                  { tag: 'Relay Gamma', tagColor: 'bg-slate-700 text-slate-300', name: 'Operations Agent', desc: 'Manages team coordination, resource allocation, and cost optimization.', icon: 'insights', iconColor: 'text-slate-400', techs: ['COST CTL', 'CI/CD', 'SLO'] },
                ].map((agent) => (
                  <ScrollRevealItem key={agent.name}>
                    <TiltCard tiltIntensity={3} className="bg-surface-variant/40 p-[1px] rounded-xl group h-full">
                      <div className="bg-surface-container-high/90 backdrop-blur-md p-8 rounded-xl h-full transition-all group-hover:bg-surface-container-high group-hover:shadow-[0_4px_25px_-5px_rgba(0,0,0,0.5)]">
                        <div className="flex justify-between items-start mb-8">
                          <span className={`${agent.tagColor} px-3 py-1.5 rounded text-[10px] uppercase tracking-widest font-bold`}>
                            {agent.tag}
                          </span>
                          <span className={`material-symbols-outlined ${agent.iconColor} text-4xl opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all`} style={{ fontVariationSettings: "'FILL' 1" }}>{agent.icon}</span>
                        </div>
                        <h4 className="text-xl font-bold mb-2 text-on-surface group-hover:text-white transition-colors">{agent.name}</h4>
                        <p className="text-on-surface-variant text-sm mb-6 leading-relaxed min-h-[60px]">{agent.desc}</p>
                        <div className="flex flex-wrap gap-2">
                          {agent.techs.map((t) => (
                            <span key={t} className="text-[9px] bg-black/40 px-2 py-1.5 rounded text-slate-400 font-mono tracking-wider border border-white/5">{t}</span>
                          ))}
                        </div>
                      </div>
                    </TiltCard>
                  </ScrollRevealItem>
                ))}
              </ScrollReveal>
            </div>
          </section>

          {/* ========== FINAL CTA ========== */}
          <section className="px-6 lg:px-24 py-32 overflow-hidden relative z-20">
            <ScrollReveal variant="fadeUp" className="max-w-5xl mx-auto">
              <div className="absolute inset-0 z-0 bg-primary/10 blur-[150px] rounded-full scale-150 translate-y-1/2 pointer-events-none" />
              <TiltCard tiltIntensity={2} spotlightOpacity={0.15}>
                <div className="relative z-10 glass-panel-strong rounded-[2rem] p-12 lg:p-24 text-center border border-primary/20 overflow-hidden shadow-[0_0_50px_-20px_rgba(58,223,250,0.3)]">
                  <div className="absolute inset-0 border-beam opacity-30" />
                  <div className="relative z-20">
                    <h2 className="font-headline text-5xl md:text-7xl font-bold mb-8 drop-shadow-2xl">
                      Ready to Architect <br /> the <span className="gradient-text-animated italic">Future?</span>
                    </h2>
                    <p className="text-on-surface-variant text-xl max-w-2xl mx-auto mb-12 font-light">
                      Join the most innovative synthetic architects building the next era of digital intelligence.
                    </p>
                    <MagneticButton
                      to="/configurator"
                      className="inline-block bg-gradient-to-br from-primary to-primary-container text-on-primary-container px-12 py-5 rounded-xl font-headline font-bold text-xl shadow-[0_0_50px_-10px_rgba(58,223,250,0.5)] active:scale-95 transition-all hover:shadow-[0_0_80px_-10px_rgba(58,223,250,0.8)]"
                    >
                      Start Building
                    </MagneticButton>
                    <div className="mt-12 flex justify-center items-center gap-4 text-on-surface-variant font-headline text-xs tracking-widest uppercase">
                      <span>Free for solo creators</span>
                      <span className="w-1.5 h-1.5 bg-secondary rounded-full drop-shadow-[0_0_5px_#c180ff]" />
                      <span>Enterprise scale ready</span>
                      <span className="w-1.5 h-1.5 bg-tertiary-dim rounded-full drop-shadow-[0_0_5px_#a4ef3f]" />
                      <span>SOC2 Type II</span>
                    </div>
                  </div>
                </div>
              </TiltCard>
            </ScrollReveal>
          </section>
        </main>

        {/* ========== FOOTER ========== */}
        <footer className="w-full py-12 px-12 flex flex-col items-center gap-6 bg-surface-container-lowest/80 backdrop-blur-md border-t border-white/5 font-body text-xs uppercase tracking-[0.2em] relative z-20">
          <div className="flex gap-12 text-slate-500 font-bold mb-2">
            <a className="hover:text-primary transition-colors hover:drop-shadow-[0_0_8px_#3adffa]" href="#">Privacy</a>
            <a className="hover:text-primary transition-colors hover:drop-shadow-[0_0_8px_#3adffa]" href="#">Terms</a>
            <a className="hover:text-primary transition-colors hover:drop-shadow-[0_0_8px_#3adffa]" href="#">API Status</a>
          </div>
          <div className="font-headline font-bold tracking-widest text-lg bg-clip-text text-transparent bg-gradient-to-r from-slate-400 to-slate-200">
            Agent Architect
          </div>
          <div className="text-slate-600 text-center text-[10px] tracking-widest">
            © 2026 Agent Architect. Built for the Synthetic Framework.
          </div>
        </footer>
      </div>
    </motion.div>
  );
}
