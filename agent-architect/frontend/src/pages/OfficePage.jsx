import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import AppLayout from '../components/AppLayout';
import { useProject } from '../context/ProjectContext';

// ============================================================
// COLORS
// ============================================================

const AGENT_COLORS = [
  { body: '#3adffa', shirt: '#2ab8d4', skin: '#f0c8a0', hair: '#1a3a4a', screen: '#3adffa', glow: 'rgba(58,223,250,0.35)' },
  { body: '#c180ff', shirt: '#a060dd', skin: '#e8b896', hair: '#3a1a5a', screen: '#c180ff', glow: 'rgba(193,128,255,0.35)' },
  { body: '#a4ef3f', shirt: '#7ec62a', skin: '#f0c8a0', hair: '#2a4a1a', screen: '#a4ef3f', glow: 'rgba(164,239,63,0.35)' },
  { body: '#ff716c', shirt: '#d45550', skin: '#d4a87c', hair: '#4a1a1a', screen: '#ff716c', glow: 'rgba(255,113,108,0.35)' },
  { body: '#ffb74d', shirt: '#dd9530', skin: '#e8b896', hair: '#4a3a1a', screen: '#ffb74d', glow: 'rgba(255,183,77,0.35)' },
  { body: '#4fc3f7', shirt: '#3a9fd4', skin: '#f0c8a0', hair: '#1a2a4a', screen: '#4fc3f7', glow: 'rgba(79,195,247,0.35)' },
];

const AGENT_MESSAGE_PROFILES = {
  planning: {
    intros: ['I am finalizing the sprint strategy', 'I am refining the work plan', 'I am ordering the project priorities'],
    tasks: [
      'aligning milestones, risks, and team dependencies to avoid chain blockers',
      'recalculating delivery order so backend and frontend progress without waiting',
      'adjusting the roadmap with realistic estimates and weekly checkpoints',
    ],
  },
  implementation: {
    intros: ['I am implementing the core functionality', 'I am finishing the integration layer', 'I am moving forward with core development'],
    tasks: [
      'with input validation, error handling, and a structure ready to scale',
      'optimizing logic to reduce complexity and keep modules clear',
      'coordinating contracts between services for stable end-to-end flow',
    ],
  },
  code_review: {
    intros: ['I am reviewing the PR in depth', 'I am auditing recent changes', 'I am evaluating code quality and maintainability'],
    tasks: [
      'detecting regression risks and proposing improvements before merge',
      'validating conventions, coverage, and consistency in sensitive changes',
      'highlighting critical security, performance, and technical debt points',
    ],
  },
  testing: {
    intros: ['I am running the test suite', 'I am validating critical scenarios', 'I am expanding functional coverage'],
    tasks: [
      'including edge cases to avoid silent production failures',
      'checking integrations, contracts, and behavior under network errors',
      'automating regressions to catch breakages before deployment',
    ],
  },
  ui: {
    intros: ['I am polishing the visual experience', 'I am refining interface and accessibility', 'I am improving the interaction layer'],
    tasks: [
      'balancing visual hierarchy, spacing, and states for clearer reading',
      'fine-tuning responsive behavior and transitions for consistency across screens',
      'validating contrast, feedback, and behavior for a stronger UX',
    ],
  },
  deploy: {
    intros: ['I am preparing the controlled rollout', 'I am closing the release phase', 'I am securing the delivery pipeline'],
    tasks: [
      'verifying quality checks, monitoring, and rollback before publishing',
      'coordinating environment variables and service health to minimize risk',
      'reviewing stability metrics for safe releases',
    ],
  },
  default: {
    intros: ['I am advancing my current work block', 'I am executing priority tasks', 'I am resolving current flow pending items'],
    tasks: [
      'keeping focus on stability, code clarity, and delivery timelines',
      'coordinating changes to reduce risk and improve traceability',
      'documenting decisions to simplify review and maintenance',
    ],
  },
};

const PERSONALITY_STYLES = {
  strategic: {
    openers: ['I am looking at the full picture', 'Right now I am prioritizing what is most critical', 'I am organizing work to avoid blockers'],
    tones: ['so the team can move forward smoothly', 'without losing sight of impact and risk', 'ensuring each step makes sense as a whole'],
  },
  analytical: {
    openers: ['I just validated the latest changes', 'I am reviewing behavior in detail', 'I am comparing results against quality criteria'],
    tones: ['with clear evidence before closing', 'to reduce regression risk', 'ensuring technical consistency across the full flow'],
  },
  creative: {
    openers: ['I am polishing the user experience', 'I am refining interface details', 'I am fine-tuning how the interaction feels'],
    tones: ['so everything feels natural to understand', 'keeping balance between aesthetics and clarity', 'improving flow across every screen'],
  },
  execution: {
    openers: ['I am moving forward with implementation', 'I already have the next block in progress', 'I am closing tasks for this sprint'],
    tones: ['keeping a strong delivery pace', 'to leave a solid foundation', 'without breaking flow between modules'],
  },
  cautious: {
    openers: ['I am validating everything before release', 'I am reviewing stability and deployment', 'I am verifying there are no hidden risks'],
    tones: ['with total focus on stability', 'leaving monitoring and rollback ready', 'to minimize any production incident'],
  },
};

function lowerFirst(text) {
  const safe = (text || '').toString().trim();
  if (!safe) return '';
  return safe.charAt(0).toLowerCase() + safe.slice(1);
}

function pickProfile(agent) {
  const txt = `${agent?.name || ''} ${agent?.role || ''}`.toLowerCase();
  if (txt.includes('plan')) return 'planning';
  if (txt.includes('build') || txt.includes('implement') || txt.includes('dev')) return 'implementation';
  if (txt.includes('review')) return 'code_review';
  if (txt.includes('test') || txt.includes('qa')) return 'testing';
  if (txt.includes('design') || txt.includes('ui') || txt.includes('ux')) return 'ui';
  if (txt.includes('ops') || txt.includes('deploy') || txt.includes('release')) return 'deploy';
  return 'default';
}

function pickPersonality(agent, profileKey) {
  const explicit = (
    agent?.personality ||
    agent?.persona ||
    agent?.style ||
    agent?.tone ||
    ''
  ).toString().toLowerCase().trim();

  if (explicit.includes('strateg')) return 'strategic';
  if (explicit.includes('anal')) return 'analytical';
  if (explicit.includes('creat') || explicit.includes('design')) return 'creative';
  if (explicit.includes('caut') || explicit.includes('safe') || explicit.includes('risk')) return 'cautious';
  if (explicit.includes('exec') || explicit.includes('prag') || explicit.includes('builder')) return 'execution';

  const roleTxt = `${agent?.name || ''} ${agent?.role || ''}`.toLowerCase();
  if (profileKey === 'planning') return 'strategic';
  if (profileKey === 'code_review' || profileKey === 'testing') return 'analytical';
  if (profileKey === 'ui') return 'creative';
  if (profileKey === 'deploy') return 'cautious';
  if (roleTxt.includes('architect') || roleTxt.includes('lead')) return 'strategic';
  if (roleTxt.includes('qa') || roleTxt.includes('test') || roleTxt.includes('review')) return 'analytical';
  if (roleTxt.includes('design') || roleTxt.includes('ui') || roleTxt.includes('ux')) return 'creative';
  if (roleTxt.includes('ops') || roleTxt.includes('deploy') || roleTxt.includes('release')) return 'cautious';
  return 'execution';
}

function buildAgentMessage(agent) {
  const key = pickProfile(agent);
  const profile = AGENT_MESSAGE_PROFILES[key] || AGENT_MESSAGE_PROFILES.default;
  const personality = pickPersonality(agent, key);
  const style = PERSONALITY_STYLES[personality] || PERSONALITY_STYLES.execution;
  const agentName = (agent?.name || 'Agent').toString().trim();
  const intro = profile.intros[Math.floor(Math.random() * profile.intros.length)];
  const task = profile.tasks[Math.floor(Math.random() * profile.tasks.length)];
  const opener = style.openers[Math.floor(Math.random() * style.openers.length)];
  const tone = style.tones[Math.floor(Math.random() * style.tones.length)];
  const templates = [
    `${opener}, ${tone}. ${lowerFirst(intro)} and I am ${task}.`,
    `${agentName}: ${lowerFirst(intro)}. Right now I am ${task}, ${tone}.`,
    `${opener}. Specifically, I am ${task} ${tone}.`,
    `${agentName} reports progress: ${lowerFirst(intro)} and ${task}.`,
    `${lowerFirst(intro)}; I am ${task} ${tone}.`,
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}

function simplifyForBubble(text) {
  const safe = (text || '').trim();
  if (!safe) return 'Working...';
  const firstChunk = safe.split(/[,:.;]/)[0].trim();
  const compact = firstChunk.length > 20 ? firstChunk.slice(0, 20).trim() : firstChunk;
  return `${compact}...`;
}

// ============================================================
// ISOMETRIC WORKSTATION
// The character sits on the NEAR side, facing the monitor on the FAR side.
// We see the character from the RIGHT SIDE (profile view) — one ear only.
// ============================================================

function IsoWorkstation({ color, typingSpeed, headBob, dualMonitors }) {
  const top = { x: 0, y: -10 };
  const ax = { x: 55, y: 28 };
  const ay = { x: -55, y: 28 };
  const fmt = (n) => Math.round(n * 100) / 100;
  const p = (u, v, h = 0) => ({
    x: top.x + u * ax.x + v * ay.x,
    y: top.y + u * ax.y + v * ay.y - h,
  });
  const pt = (u, v, h = 0) => {
    const q = p(u, v, h);
    return `${fmt(q.x)},${fmt(q.y)}`;
  };
  const poly = (arr) => arr.map(([u, v, h]) => pt(u, v, h ?? 0)).join(' ');

  const seat = { u: 0.42, v: 0.98 };
  const kb = { u: 0.42, v: 0.76, du: 0.16, dv: 0.12 };
  const mon = { u: 0.70, v: 0.5, du: 0.16, dv: 0.024, h0: 9, h1: 23 };
  const mon2 = { du: 0.145, dv: 0.022 };
  const kbU0 = kb.u - kb.du;
  const kbV0 = kb.v - kb.dv;
  const kbCols = 5;
  const kbRows = 3;
  const stepU = (2 * kb.du) / kbCols;
  const stepV = (2 * kb.dv) / kbRows;
  const keyWU = stepU * 0.78;
  const keyWV = stepV * 0.72;

  const mousePos = p(kb.u + 0.24, kb.v + 0.07, 0);
  const mugPos = p(kb.u - 0.2, kb.v + 0.07, 0);
  const chairPos = p(seat.u, seat.v + 0.36, 0);

  // Desk diamond center is at (0, 18). Top vertex (0,-10), bottom (0,46),
  // left (-55,18), right (55,18).
  // Monitor goes centered on the FAR edge (top area).
  // Character sits CENTERED on the desk, facing the monitor.
  return (
    <g>
      {/* ── Floor shadow ── */}
      <ellipse cx="0" cy="62" rx="52" ry="16" fill="rgba(0,0,0,0.22)" />

      {/* ══════ DESK ══════ */}
      <polygon points="0,-10 55,18 0,46 -55,18" fill="#1c2333" stroke="#2a3250" strokeWidth="0.7" />
      <polygon points="-55,18 0,46 0,56 -55,28" fill="#141a2a" stroke="#2a3250" strokeWidth="0.5" />
      <polygon points="0,46 55,18 55,28 0,56" fill="#181f30" stroke="#2a3250" strokeWidth="0.5" />
      <line x1="-50" y1="20" x2="-50" y2="28" stroke="#2a3250" strokeWidth="1.5" />
      <line x1="50" y1="20" x2="50" y2="28" stroke="#2a3250" strokeWidth="1.5" />
      <line x1="0" y1="-7" x2="0" y2="1" stroke="#2a3250" strokeWidth="1.5" />
      <line x1="0" y1="48" x2="0" y2="56" stroke="#2a3250" strokeWidth="1.5" />

      {/* ══════ MONITOR — upright with depth, centered on desk ══════ */}
      {(() => {
        const renderMonitor = (u, v, du, dv, key) => {
          const u0 = u - du;
          const u1 = u + du;
          const vf = v - dv;
          const vb = v + dv;
          const standTop = mon.h0 - 0.6;
          const bottomH = standTop + 0.9;
          const topH = mon.h1;
          const screenInsetU = 0.012;
          const screenInsetH = 1.8;
          const screenH0 = bottomH + screenInsetH;
          const screenH1 = topH - screenInsetH;
          const lineMinU = u0 + screenInsetU + 0.008;
          const lineMaxU = u1 - screenInsetU - 0.008;
          const lineWidth = Math.max(0.02, lineMaxU - lineMinU);
          const clipId = `screen-clip-${key}`;
          return (
            <g key={key}>
              <defs>
                <clipPath id={clipId}>
                  <polygon
                    points={poly([
                      [u0 + screenInsetU, vf - 0.0005, screenH0],
                      [u1 - screenInsetU, vf - 0.0005, screenH0],
                      [u1 - screenInsetU, vf - 0.0005, screenH1],
                      [u0 + screenInsetU, vf - 0.0005, screenH1],
                    ])}
                  />
                </clipPath>
              </defs>

              {/* back face */}
              <polygon
                points={poly([
                  [u0, vb, bottomH],
                  [u1, vb, bottomH],
                  [u1, vb, topH],
                  [u0, vb, topH],
                ])}
                fill="#070c18"
                stroke="#27324b"
                strokeWidth="0.65"
              />

              {/* right side thickness */}
              <polygon
                points={poly([
                  [u1, vf, bottomH],
                  [u1, vb, bottomH],
                  [u1, vb, topH],
                  [u1, vf, topH],
                ])}
                fill="#0e1628"
                stroke="#2d3a58"
                strokeWidth="0.4"
                opacity="0.96"
              />

              {/* top cap */}
              <polygon
                points={poly([
                  [u0, vf, topH],
                  [u1, vf, topH],
                  [u1, vb, topH],
                  [u0, vb, topH],
                ])}
                fill="#11192d"
                stroke="#27324b"
                strokeWidth="0.45"
                opacity="0.95"
              />

              {/* front bezel (visible screen frame) */}
              <polygon
                points={poly([
                  [u0, vf, bottomH],
                  [u1, vf, bottomH],
                  [u1, vf, topH],
                  [u0, vf, topH],
                ])}
                fill="#151f36"
                opacity="0.98"
              />

              {/* active screen area */}
              <polygon
                points={poly([
                  [u0 + screenInsetU, vf - 0.0005, screenH0],
                  [u1 - screenInsetU, vf - 0.0005, screenH0],
                  [u1 - screenInsetU, vf - 0.0005, screenH1],
                  [u0 + screenInsetU, vf - 0.0005, screenH1],
                ])}
                fill="#0b1426"
                stroke={color.screen}
                strokeWidth="0.45"
                opacity="0.85"
              >
                <animate attributeName="opacity" values="0.76;0.92;0.76" dur={`${typingSpeed}s`} repeatCount="indefinite" />
              </polygon>

              {/* glossy reflection */}
              <polygon
                points={poly([
                  [u0 + 0.018, vf - 0.001, screenH0 + 1.6],
                  [u0 + 0.065, vf - 0.001, screenH0 + 1.6],
                  [u0 + 0.05, vf - 0.001, screenH1 - 1.2],
                  [u0 + 0.014, vf - 0.001, screenH1 - 1.2],
                ])}
                fill="rgba(255,255,255,0.08)"
              />

              <g clipPath={`url(#${clipId})`}>
                {[0, 1, 2, 3].map(l => {
                  const uA = lineMinU + l * (lineWidth * 0.09);
                  const uB = Math.min(lineMaxU, uA + lineWidth * (0.42 + l * 0.06));
                  const hL = Math.min(screenH1 - 0.8, screenH0 + 1.9 + l * ((screenH1 - screenH0) * 0.22));
                  return (
                    <line
                      key={`${key}_l${l}`}
                      x1={fmt(p(uA, vf - 0.001, hL).x)}
                      y1={fmt(p(uA, vf - 0.001, hL).y)}
                      x2={fmt(p(uB, vf - 0.001, hL).x)}
                      y2={fmt(p(uB, vf - 0.001, hL).y)}
                      stroke={color.screen}
                      strokeWidth="1"
                      opacity="0.32"
                      strokeLinecap="round"
                    >
                      <animate
                        attributeName="x2"
                        values={`${fmt(p(Math.max(uA + lineWidth * 0.18, uB - lineWidth * 0.24), vf - 0.001, hL).x)};${fmt(p(uB, vf - 0.001, hL).x)};${fmt(p(Math.max(uA + lineWidth * 0.18, uB - lineWidth * 0.24), vf - 0.001, hL).x)}`}
                        dur={`${typingSpeed + l * 0.3}s`}
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="opacity"
                        values="0.2;0.52;0.2"
                        dur={`${typingSpeed + l * 0.2}s`}
                        repeatCount="indefinite"
                      />
                    </line>
                  );
                })}
              </g>
            </g>
          );
        };

        return (
          <>
            {dualMonitors
              ? (
                <>
                  {renderMonitor(mon.u - 0.16, mon.v, mon2.du, mon2.dv, 'm1')}
                  {renderMonitor(mon.u + 0.16, mon.v, mon2.du, mon2.dv, 'm2')}
                </>
              )
              : renderMonitor(mon.u, mon.v, mon.du, mon.dv, 'm1')}
          </>
        );
      })()}

      {/* ══════ KEYBOARD — center-right of desk, between character and monitor ══════ */}
      <g>
        <polygon
          points={poly([
            [kbU0, kbV0, 0],
            [kbU0 + 2 * kb.du, kbV0, 0],
            [kbU0 + 2 * kb.du, kbV0 + 2 * kb.dv, 0],
            [kbU0, kbV0 + 2 * kb.dv, 0],
          ])}
          fill="#1a2035"
          stroke="#2a3250"
          strokeWidth="0.5"
        />

        {Array.from({ length: kbRows }).map((_, r) =>
          Array.from({ length: kbCols }).map((_, c) => {
            const u = kbU0 + c * stepU + stepU * 0.12;
            const v = kbV0 + r * stepV + stepV * 0.14;
            const u2 = u + keyWU;
            const v2 = v + keyWV;
            // Stable pseudo-random timing per key to simulate irregular typing.
            const seed = (((r + 1) * 37 + (c + 1) * 53) % 97) / 97;
            const keyStart = seed * 1.9;
            const keyCycle = 1.45 + seed * 2.2;
            const peak = 0.66 + seed * 0.28;
            return (
              <polygon
                key={`k${r}${c}`}
                points={poly([
                  [u, v, 0.8],
                  [u2, v, 0.8],
                  [u2, v2, 0.8],
                  [u, v2, 0.8],
                ])}
                fill="#252d45"
                opacity="0.34"
              >
                <animate
                  attributeName="fill"
                  values={`#252d45;#252d45;${color.screen};#36496e;#252d45;#252d45`}
                  keyTimes="0;0.58;0.66;0.74;0.82;1"
                  dur={`${keyCycle}s`}
                  begin={`${keyStart}s`}
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  values={`0.34;0.34;${peak};0.5;0.34;0.34`}
                  keyTimes="0;0.58;0.66;0.74;0.82;1"
                  dur={`${keyCycle}s`}
                  begin={`${keyStart}s`}
                  repeatCount="indefinite"
                />
              </polygon>
            );
          })
        )}
      </g>

      {/* ══════ MOUSE — right of keyboard, closer to monitor ══════ */}
      <g transform={`translate(${fmt(mousePos.x)}, ${fmt(mousePos.y)})`}>
        <ellipse cx="0" cy="0" rx="4" ry="5.5" fill="#1a2035" stroke="#2a3250" strokeWidth="0.5" transform="rotate(27)" />
        <line x1="0" y1="-2.5" x2="0" y2="0" stroke="#2a3250" strokeWidth="0.4" />
      </g>

      {/* ── Coffee mug — left side of desk ── */}
      <g transform={`translate(${fmt(mugPos.x)}, ${fmt(mugPos.y)}) rotate(27)`}>
        <ellipse cx="0" cy="0" rx="4.5" ry="2.8" fill="#2a1a10" stroke="#4a3020" strokeWidth="0.5" />
        <ellipse cx="0" cy="0" rx="2.8" ry="1.6" fill="#1a0f05" />
        <path d="M-1,-3.5 Q0,-7 1,-10" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.7" strokeLinecap="round">
          <animate attributeName="d" values="M-1,-3.5 Q0,-7 1,-10;M-1,-3.5 Q2,-8 0,-11;M-1,-3.5 Q0,-7 1,-10" dur="3s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.1;0.03;0.1" dur="3s" repeatCount="indefinite" />
        </path>
      </g>

      {/* ══════ CHARACTER — LEFT-CENTER of desk, facing RIGHT toward monitor ══════
          From left to right: ear → back of head → face → eye → nose → keyboard → monitor
          We see the LEFT ear (near side). Hair/back of head is on the LEFT.
          Face, eye, nose are on the RIGHT. */}
      <g transform={`translate(${fmt(chairPos.x)}, ${fmt(chairPos.y)})`}>
        {/* Chair seat */}
        <polygon points="0,-6 16,2 0,10 -16,2" fill="#1a1a2e" stroke="#2a2a44" strokeWidth="0.5" />
        {/* Chair back (behind character — LEFT side) */}
        <polygon points="0,10 -16,2 -16,8 0,16" fill="#1a1a2e" stroke="#2a2a44" strokeWidth="0.5" />

        {/* Near leg */}
        <rect x="-2" y="10" width="5" height="12" rx="2" fill="#1e293b" />

        {/* Torso — profile facing right */}
        <polygon points="-6,-16 5,-12 7,2 -4,2" fill={color.shirt} opacity="0.85" />
        <polygon points="-4,-14 2,-11 3,-2 -2,-2" fill="white" opacity="0.06" />

        {/* Arm (near side), reaching RIGHT toward keyboard */}
        <g>
          <animateTransform attributeName="transform" type="rotate" values="-5,0,-6;5,0,-6;-5,0,-6" dur={`${typingSpeed * 0.65}s`} repeatCount="indefinite" />
          <line x1="5" y1="-10" x2="3" y2="-2" stroke={color.shirt} strokeWidth="4.5" opacity="0.75" strokeLinecap="round" />
          <line x1="3" y1="-2" x2="10" y2="-18" stroke={color.shirt} strokeWidth="3.5" opacity="0.65" strokeLinecap="round" />
          <circle cx="10" cy="-19" r="2.5" fill={color.skin} opacity="0.7" />
        </g>

        {/* Head — PROFILE facing RIGHT */}
        <g>
          <animateTransform attributeName="transform" type="translate" values="0,0;0,-1.2;0,0" dur={`${headBob}s`} repeatCount="indefinite" />
          {/* Neck */}
          <rect x="-1" y="-20" width="4" height="5" rx="1" fill={color.skin} opacity="0.5" />

          {/* Back of head = hair (LEFT side, away from monitor) */}
          <ellipse cx="-3" cy="-28" rx="8" ry="10" fill={color.hair} opacity="0.8" />

          {/* Face = skin (RIGHT side, toward monitor) */}
          <ellipse cx="2" cy="-27" rx="7" ry="9" fill={color.skin} opacity="0.45" />

          {/* Hair on top and wrapping the back (left side) */}
          <path d="M6,-35 Q0,-40 -10,-33 Q-11,-27 -9,-23" fill={color.hair} opacity="0.75" />

          {/* Eye — on the RIGHT (facing monitor) */}
          <ellipse cx="5" cy="-28" rx="1.5" ry="1.8" fill="#0f172a" opacity="0.8">
            <animate attributeName="ry" values="1.8;0.2;1.8" dur="3.5s" repeatCount="indefinite" repeatDelay="2" />
          </ellipse>

          {/* Nose — pointing RIGHT (toward monitor) */}
          <polygon points="9,-26 7,-24 7,-28" fill={color.skin} opacity="0.55" />

          {/* LEFT ear — ONLY visible ear (on the LEFT/near side) */}
          <ellipse cx="-8" cy="-27" rx="2.5" ry="3.5" fill={color.skin} opacity="0.45" />
          <ellipse cx="-8" cy="-27" rx="1.5" ry="2" fill={color.skin} opacity="0.3" />
        </g>
      </g>

      {/* ── Status pulse ── */}
      <circle cx="0" cy="20" r="55" fill="none" stroke={color.screen} strokeWidth="0.5" opacity="0.12">
        <animate attributeName="r" values="55;62;55" dur="3s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.12;0.04;0.12" dur="3s" repeatCount="indefinite" />
      </circle>
    </g>
  );
}

// ============================================================
// CHAT BUBBLE
// ============================================================

function IsoBubble({ agent, color, text }) {
  const txt = text || `Working on ${agent.role || 'tasks'}`;
  const display = simplifyForBubble(txt);

  return (
    <motion.g initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
      <rect x="-52" y="-95" width="104" height="20" rx="6" fill="#0d1220" stroke={color.screen} strokeWidth="0.6" opacity="0.92" />
      <polygon points="-4,-75 4,-75 0,-70" fill="#0d1220" />
      <text x="0" y="-82" textAnchor="middle" fill={color.screen} fontSize="7.5" fontFamily="monospace" opacity="0.9">{display}</text>
    </motion.g>
  );
}

// ============================================================
// ACTIVITY LOG — fixed height, internal scroll
// ============================================================

function ActivityLog({ agents, colors, logs }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [logs]);

  return (
    <div className="bg-surface-container-low/90 backdrop-blur-xl rounded-2xl border border-white/5 shadow-xl flex flex-col overflow-hidden h-full">
      <div className="px-5 py-3 bg-surface-container-highest/80 border-b border-black/20 flex items-center gap-3 shrink-0">
        <span className="material-symbols-outlined text-sm text-primary">terminal</span>
        <span className="text-[10px] font-bold tracking-[0.2em] text-slate-300">AGENT ACTIVITY</span>
        <div className="ml-auto flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-error/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-tertiary-dim/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-primary/80" />
        </div>
      </div>
      <div ref={ref} className="flex-1 min-h-0 p-4 font-mono text-xs overflow-y-auto custom-scrollbar bg-black/40 space-y-2">
        <AnimatePresence initial={false}>
          {logs.map((l, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="leading-relaxed">
              <span className="text-slate-500">[{l.time}]</span>{' '}
              <span style={{ color: colors[l.ai % colors.length]?.screen }} className="font-bold">{l.name}:</span>{' '}
              <span className="text-slate-300">{l.msg}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ============================================================
// OFFICE PAGE
// ============================================================

export default function OfficePage() {
  const { projectId } = useParams();
  const location = useLocation();
  const { updateState } = useProject();
  const [agents, setAgents] = useState([]);
  const [projectData, setProjectData] = useState({});
  const [bubble, setBubble] = useState(null);
  const [agentMessages, setAgentMessages] = useState({});
  const [logs, setLogs] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [agentDetails, setAgentDetails] = useState('');
  const [loadingAgentDetails, setLoadingAgentDetails] = useState(false);
  const [selectedAgentIndex, setSelectedAgentIndex] = useState(-1);
  const demoOffice = useMemo(() => new URLSearchParams(location.search).get('demoOffice') === '1', [location.search]);
  const demoAgents = useMemo(() => ([
    { name: 'Planner', role: 'Planning', personality: 'strategic', description: 'Defines strategy, priorities, and project roadmap.' },
    { name: 'Builder', role: 'Implementation', personality: 'execution', description: 'Implements business core and key integrations.' },
    { name: 'Reviewer', role: 'Code Review', personality: 'analytical', description: 'Reviews quality, security, and code maintainability.' },
    { name: 'Tester', role: 'Testing', personality: 'analytical', description: 'Validates critical scenarios and functional coverage.' },
    { name: 'Designer', role: 'UI', personality: 'creative', description: 'Improves interface, accessibility, and visual consistency.' },
    { name: 'Ops', role: 'Deploy', personality: 'cautious', description: 'Ensures pipeline reliability, stable releases, and monitoring.' },
  ]), []);
  const demoCount = useMemo(() => {
    const v = Number(new URLSearchParams(location.search).get('demoAgents') || '');
    return Number.isFinite(v) && v > 0 ? Math.min(36, Math.floor(v)) : demoAgents.length;
  }, [demoAgents.length, location.search]);
  const demoList = useMemo(
    () => Array.from({ length: demoCount }).map((_, i) => demoAgents[i % demoAgents.length]),
    [demoAgents, demoCount]
  );

  async function fetchData() {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (!res.ok) {
        if (demoOffice) {
          setProjectData({ projectName: `Project #${projectId}` });
          setAgents(demoList);
        }
        return;
      }
      const data = await res.json();
      setProjectData(data);

      let parsed = [];
      if (data.agentsJson) parsed = JSON.parse(data.agentsJson);
      if (parsed.length === 0) {
        const r2 = await fetch(`/api/agents/project/${projectId}`);
        if (r2.ok) { const d2 = await r2.json(); if (d2.agents) parsed = d2.agents; }
      }
      if (parsed.length === 0 && demoOffice) {
        parsed = demoList;
      }
      setAgents(parsed.map((a, i) => ({
        name: a.name || a.title || `Agent ${i + 1}`,
        role: a.role || a.role_description || 'Specialist',
        personality: a.personality || a.persona || a.style || a.tone || '',
        description: a.description || a.goal || '',
        icon: a.icon || 'smart_toy',
      })));
    } catch (_) {
      if (demoOffice) {
        setProjectData({ projectName: `Project #${projectId}` });
        setAgents(demoList);
      }
    }
  }

  useEffect(() => {
    if (projectId) {
      updateState({ currentProjectId: projectId });
      fetchData();
    }
  }, [projectId, location.search, updateState]);

  // Live log feed
  useEffect(() => {
    if (!agents.length) return;
    const id = setInterval(() => {
      const ai = Math.floor(Math.random() * agents.length);
      const msg = buildAgentMessage(agents[ai]);
      const time = new Date().toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLogs(p => [...p, { ai, name: agents[ai].name, msg, time }].slice(-25));
      setAgentMessages(p => ({ ...p, [ai]: msg }));
      setBubble(ai);
    }, 2400);
    return () => clearInterval(id);
  }, [agents]);

  async function openAgentModal(agent) {
    const idx = agents.findIndex(a => a.name === agent.name);
    setSelectedAgent(agent);
    setSelectedAgentIndex(idx);
    setAgentDetails('');
    setLoadingAgentDetails(true);
    try {
      const res = await fetch(`/api/agents/${projectId}/detail?name=${encodeURIComponent(agent.name)}`);
      if (res.ok) {
        const data = await res.json();
        const detail = (data?.content || data?.description || '').toString().trim();
        if (detail) {
          setAgentDetails(detail);
          return;
        }
      }
      const fallback = (agent.description || `This agent works as ${agent.role || 'Specialist'} in this project.`).toString().trim();
      setAgentDetails(fallback);
    } catch (_) {
      const fallback = (agent.description || `This agent works as ${agent.role || 'Specialist'} in this project.`).toString().trim();
      setAgentDetails(fallback);
    } finally {
      setLoadingAgentDetails(false);
    }
  }

  function closeAgentModal() {
    setSelectedAgent(null);
    setAgentDetails('');
    setLoadingAgentDetails(false);
    setSelectedAgentIndex(-1);
  }

  const ROOM = useMemo(() => ({
    minX: -520,
    minY: -220,
    width: 1040,
    height: 760,
    centerX: 0,
    centerY: 160,
    insetX: 120,
    insetY: 140,
  }), []);

  const layout = useMemo(() => {
    const n = agents.length;
    if (n === 0) return [];
    const cols = n <= 8 ? 3 : Math.max(1, Math.ceil(Math.sqrt(n)));
    const dx = n <= 8 ? 150 : 180;
    const dy = n <= 8 ? 85 : 100;
    return agents.map((_, i) => {
      const c = i % cols;
      const r = Math.floor(i / cols);
      return { x: (c - r) * dx, y: (c + r) * dy };
    });
  }, [agents.length]);

  const fit = useMemo(() => {
    if (!layout.length) return { scale: 1, offsetX: 0, offsetY: 0 };
    const xs = layout.map(p => p.x);
    const ys = layout.map(p => p.y);
    const padX = agents.length <= 8 ? 120 : 150;
    const padY = agents.length <= 8 ? 160 : 190;
    const insetX = agents.length <= 8 ? 90 : ROOM.insetX;
    const insetY = agents.length <= 8 ? 110 : ROOM.insetY;
    const minX = Math.min(...xs) - padX;
    const maxX = Math.max(...xs) + padX;
    const minY = Math.min(...ys) - padY;
    const maxY = Math.max(...ys) + padY;
    const bboxW = Math.max(1, maxX - minX);
    const bboxH = Math.max(1, maxY - minY);
    const availW = Math.max(1, ROOM.width - insetX * 2);
    const availH = Math.max(1, ROOM.height - insetY * 2);
    const raw = Math.min(availW / bboxW, availH / bboxH);
    const maxScale = agents.length <= 2 ? 2.35 : agents.length <= 4 ? 1.75 : agents.length <= 8 ? 1.35 : 1.05;
    const zoomBoost =
      agents.length <= 1 ? 1.38 :
      agents.length <= 2 ? 1.3 :
      agents.length <= 4 ? 1.22 :
      agents.length <= 8 ? 1.14 :
      1.08;
    const scale = Math.min(maxScale, raw * zoomBoost);
    const offsetX = -(minX + maxX) / 2;
    const offsetY = -(minY + maxY) / 2;
    return { scale, offsetX, offsetY };
  }, [agents.length, layout, ROOM.height, ROOM.insetX, ROOM.insetY, ROOM.width]);

  const colorSchemes = useMemo(() => agents.map((_, i) => AGENT_COLORS[i % AGENT_COLORS.length]), [agents.length]);

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-[1600px] mx-auto pb-12 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10 min-h-[600px] lg:min-h-[640px]">

          {/* ── LEFT: HEADER + ISOMETRIC OFFICE ── */}
          <div className="lg:col-span-8">
            {/* Header */}
            <div className="mb-6 relative z-10 pt-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="px-3 py-1 bg-primary/10 border border-primary/20 text-primary text-[10px] uppercase tracking-widest rounded-full font-bold">Office</span>
                <span className="px-3 py-1 bg-tertiary-dim/10 border border-tertiary-dim/20 text-tertiary-dim text-[10px] uppercase tracking-widest rounded-full font-bold">{agents.length} agents active</span>
              </div>
              <h1 className="text-4xl font-headline font-bold text-on-surface tracking-tight">{projectData.projectName || `Project #${projectId}`}</h1>
              <p className="text-on-surface-variant text-base mt-1 font-light">Your agents are building the project right now.</p>
            </div>

            <div className="bg-surface-container-low/60 backdrop-blur-xl rounded-2xl border border-white/5 shadow-xl overflow-hidden relative min-h-[420px] lg:h-[580px]">
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/3 w-72 h-72 bg-primary/6 blur-[120px] rounded-full" />
                <div className="absolute bottom-1/3 right-1/4 w-56 h-56 bg-secondary/6 blur-[100px] rounded-full" />
              </div>

              {agents.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500">
                  <span className="material-symbols-outlined text-6xl mb-4 opacity-30">apartment</span>
                  <p className="text-lg font-medium">The office is empty</p>
                  <p className="text-sm mt-1 opacity-60">Generate agents to see them working here</p>
                </div>
              ) : (
                <svg
                  viewBox={`${ROOM.minX} ${ROOM.minY} ${ROOM.width} ${ROOM.height}`}
                  className="w-full h-full"
                  preserveAspectRatio="xMidYMid meet"
                >
                  <defs>
                    <filter id="glow"><feGaussianBlur stdDeviation="2.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                  </defs>

                  {/* Floor tiles */}
                  {(() => {
                    const tiles = [];
                    for (let r = -18; r <= 18; r++) {
                      for (let c = -18; c <= 18; c++) {
                        const tx = (c - r) * 44;
                        const ty = (c + r) * 24;
                        tiles.push(
                          <polygon
                            key={`t_${r}_${c}`}
                            points={`${tx},${ty - 24} ${tx + 44},${ty} ${tx},${ty + 24} ${tx - 44},${ty}`}
                            fill={(r + c) % 2 === 0 ? 'rgba(12,18,36,0.7)' : 'rgba(15,22,42,0.7)'}
                            stroke="rgba(42,50,80,0.2)" strokeWidth="0.5"
                          />
                        );
                      }
                    }
                    return tiles;
                  })()}

                  {/* Agents — sorted back-to-front for correct overlap */}
                  <g transform={`translate(${ROOM.centerX}, ${ROOM.centerY}) scale(${fit.scale}) translate(${fit.offsetX}, ${fit.offsetY})`}>
                    {layout
                      .map((pos, i) => ({ pos, i }))
                      .sort((a, b) => (a.pos.y - a.pos.x) - (b.pos.y - b.pos.x))
                      .map(({ pos, i }) => (
                        <g
                          key={agents[i]?.name || i}
                          transform={`translate(${pos.x}, ${pos.y})`}
                          onClick={() => openAgentModal(agents[i])}
                          style={{ cursor: 'pointer' }}
                        >
                          <IsoWorkstation
                            color={colorSchemes[i]}
                            typingSpeed={1.4 + i * 0.25}
                            headBob={3 + i * 0.4}
                            dualMonitors={agents.length >= 4 && i % 3 === 1}
                          />
                          <text x="0" y="82" textAnchor="middle" fill={colorSchemes[i].screen}
                            fontSize="8" fontFamily="monospace" fontWeight="bold" opacity="0.6" filter="url(#glow)">
                            {(agents[i]?.name || '').toUpperCase()}
                          </text>
                          <AnimatePresence>
                            {bubble === i && <IsoBubble agent={agents[i]} color={colorSchemes[i]} text={agentMessages[i]} />}
                          </AnimatePresence>
                        </g>
                      ))}
                  </g>
                </svg>
              )}
            </div>
          </div>

          {/* ── RIGHT: ACTIVITY LOG slightly shorter ── */}
          <div className="lg:col-span-4 min-h-[420px] lg:h-[720px] lg:self-start">
            <ActivityLog agents={agents} colors={colorSchemes} logs={logs} />
          </div>
        </div>
      </motion.div>

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
              <div className="flex items-center justify-between p-6 border-b border-white/10 relative overflow-hidden bg-surface-container-highest/40">
                <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ background: `linear-gradient(90deg, ${colorSchemes[selectedAgentIndex]?.screen || '#3adffa'}33, transparent)` }} />

                <div className="flex items-center gap-4 relative z-10">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center border shadow-[0_0_20px_rgba(0,0,0,0.2)]" style={{ backgroundColor: `${colorSchemes[selectedAgentIndex]?.screen || '#3adffa'}22`, borderColor: `${colorSchemes[selectedAgentIndex]?.screen || '#3adffa'}55` }}>
                    <span className="material-symbols-outlined text-3xl" style={{ color: colorSchemes[selectedAgentIndex]?.screen || '#3adffa' }}>{selectedAgent.icon}</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-headline font-bold text-on-surface tracking-tight">{selectedAgent.name}</h3>
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: colorSchemes[selectedAgentIndex]?.screen || '#3adffa' }} />
                      <p className="text-xs text-on-surface-variant uppercase tracking-[0.2em] font-bold">{selectedAgent.role}</p>
                    </div>
                  </div>
                </div>
                <button onClick={closeAgentModal} className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all hover:rotate-90 relative z-10">
                  <span className="material-symbols-outlined text-on-surface">close</span>
                </button>
              </div>

              <div className="p-0 overflow-y-auto custom-scrollbar flex-1 bg-[#0d1117]">
                {loadingAgentDetails ? (
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
                      <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                        {agentDetails}
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
