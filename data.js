// ─── CyberAI Navigator — Path-based career roadmap (ACM CC2020) ─────────────
// Rule: Each career has ONE linear path Start → Knowledge → Skills → Dispositions → Expert.
// Edges only between adjacent nodes in each path. Expert is global.

// Node definitions: id, label, type (career|foundation|knowledge|skill|disposition|expert)
const NODE_DEFS = {
  expert:   { id: "expert",   label: "EXPERT",                type: "expert",      layer: 4, icon: "⭐", desc: "The goal of every path. Deep expertise in your chosen career." },
  // Career nodes (one per job at bottom of map) — 2 per category
  data_sci:     { id: "data_sci",     label: "Data Scientist",    type: "career", layer: 0, icon: "📊", desc: "Extracts insights from data to drive decisions." },
  ml_eng:       { id: "ml_eng",       label: "Machine Learning Engineer", type: "career", layer: 0, icon: "🤖", desc: "Builds and deploys production ML systems." },
  pen_tester:   { id: "pen_tester",   label: "Pen Tester",        type: "career", layer: 0, icon: "🔓", desc: "Finds and reports vulnerabilities." },
  sec_arch:     { id: "sec_arch",     label: "Security Architect", type: "career", layer: 0, icon: "🏗️", desc: "Designs organizational security." },
  ai_sec_eng:   { id: "ai_sec_eng",   label: "AI Security Eng",   type: "career", layer: 0, icon: "🔐", desc: "Secures AI/ML systems." },
  threat_intel: { id: "threat_intel", label: "Threat Intel",      type: "career", layer: 0, icon: "📡", desc: "Uses AI/ML for threat detection." },
  edge_ai_eng:  { id: "edge_ai_eng",  label: "Edge AI Engineer",  type: "career", layer: 0, icon: "📱", desc: "Deploys ML on edge devices." },
  embedded_ml_eng: { id: "embedded_ml_eng", label: "Embedded ML", type: "career", layer: 0, icon: "🔧", desc: "Runs ML on embedded systems." },
  // Knowledge (K) — Blue
  python:   { id: "python",   label: "Python / R",            type: "knowledge",  layer: 2, icon: "💻", desc: "Programming fundamentals for data and automation." },
  sql:      { id: "sql",      label: "SQL",                   type: "knowledge",  layer: 2, icon: "📊", desc: "Data storage, queries, and databases." },
  statistics: { id: "statistics", label: "Statistics",      type: "knowledge",  layer: 2, icon: "📈", desc: "Statistical methods and inference." },
  linear_algebra: { id: "linear_algebra", label: "Linear Algebra", type: "knowledge", layer: 2, icon: "∑", desc: "Vectors, matrices, and linear operations." },
  ml_basics: { id: "ml_basics", label: "ML Basics",          type: "knowledge",  layer: 2, icon: "🧠", desc: "Core machine learning concepts." },
  networking: { id: "networking", label: "Networking",      type: "knowledge",  layer: 2, icon: "🌐", desc: "Networks, protocols, and infrastructure." },
  cryptography: { id: "cryptography", label: "Cryptography", type: "knowledge",  layer: 2, icon: "🔐", desc: "Encryption, hashing, and secure protocols." },
  threat_models: { id: "threat_models", label: "Threat Models", type: "knowledge", layer: 2, icon: "⚖️", desc: "Threat modeling and risk frameworks." },
  // Skills (S) — Green
  data_viz: { id: "data_viz", label: "Data Visualization",   type: "skill",      layer: 3, icon: "📉", desc: "Visualizing data and communicating insights." },
  model_training: { id: "model_training", label: "Model Training", type: "skill", layer: 3, icon: "🔧", desc: "Training and tuning ML models." },
  experiment_design: { id: "experiment_design", label: "Experiment Design", type: "skill", layer: 3, icon: "🧪", desc: "Designing and running experiments." },
  deep_learning: { id: "deep_learning", label: "Deep Learning", type: "skill", layer: 3, icon: "🦾", desc: "Neural networks and deep architectures." },
  model_deployment: { id: "model_deployment", label: "Model Deployment", type: "skill", layer: 3, icon: "🚀", desc: "Deploying and serving models in production." },
  mlops:   { id: "mlops",    label: "MLOps",                 type: "skill",      layer: 3, icon: "⚙️", desc: "ML pipelines, monitoring, and operations." },
  vuln_analysis: { id: "vuln_analysis", label: "Vulnerability Analysis", type: "skill", layer: 3, icon: "🔍", desc: "Finding and assessing vulnerabilities." },
  incident_response: { id: "incident_response", label: "Incident Response", type: "skill", layer: 3, icon: "🛡️", desc: "Responding to and containing security incidents." },
  security_arch: { id: "security_arch", label: "Security Architecture", type: "skill", layer: 3, icon: "🏗️", desc: "Designing secure systems and controls." },
  threat_intel_skill: { id: "threat_intel_skill", label: "Threat Intelligence", type: "skill", layer: 3, icon: "📡", desc: "Analyzing and reporting on threats." },
  // Dispositions (D) — Gold
  critical_thinking: { id: "critical_thinking", label: "Critical Thinking", type: "disposition", layer: 4, icon: "💡", desc: "Analyzing and evaluating information rigorously." },
  communication: { id: "communication", label: "Communication", type: "disposition", layer: 4, icon: "💬", desc: "Communicating clearly with technical and non-technical audiences." },
  ethical_resp: { id: "ethical_resp", label: "Ethical Responsibility", type: "disposition", layer: 4, icon: "⚖️", desc: "Applying ethics in technical decisions." },
  security_mindset: { id: "security_mindset", label: "Security Mindset", type: "disposition", layer: 4, icon: "🔒", desc: "Thinking like an attacker; defense in depth." },
  systems_thinking: { id: "systems_thinking", label: "Systems Thinking", type: "disposition", layer: 4, icon: "🧩", desc: "Holistic reasoning about complex systems and trade-offs." },
  collaboration: { id: "collaboration", label: "Collaboration", type: "disposition", layer: 4, icon: "🤝", desc: "Working effectively in teams." },
};

// Career paths: Career (bottom) → … → Expert. 2 careers per category.
const CAREER_PATHS = {
  data_sci:     ["data_sci", "python", "sql", "statistics", "data_viz", "model_training", "experiment_design", "critical_thinking", "communication", "expert"],
  // ML Engineer path: include Python knowledge before Linear Algebra / ML Basics
  ml_eng:       ["ml_eng", "python", "linear_algebra", "ml_basics", "deep_learning", "model_deployment", "mlops", "systems_thinking", "expert"],
  pen_tester:   ["pen_tester", "python", "networking", "threat_models", "vuln_analysis", "security_arch", "ethical_resp", "security_mindset", "expert"],
  sec_arch:     ["sec_arch", "networking", "cryptography", "threat_models", "security_arch", "vuln_analysis", "ethical_resp", "systems_thinking", "expert"],
  ai_sec_eng:   ["ai_sec_eng", "python", "ml_basics", "threat_models", "model_deployment", "vuln_analysis", "ethical_resp", "security_mindset", "expert"],
  threat_intel: ["threat_intel", "python", "statistics", "threat_models", "threat_intel_skill", "data_viz", "critical_thinking", "communication", "expert"],
  edge_ai_eng:  ["edge_ai_eng", "python", "ml_basics", "model_deployment", "mlops", "systems_thinking", "expert"],
  embedded_ml_eng: ["embedded_ml_eng", "python", "linear_algebra", "ml_basics", "deep_learning", "model_deployment", "systems_thinking", "expert"],
};

// Career metadata for panel (path careers only)
const CAREER_META = {
  data_sci:     { label: "Data Scientist",           desc: "Extracts insights from data to drive decisions. Path: Start → Python, SQL, Statistics → Data Viz, Model Training, Experiment Design → Critical Thinking, Communication → Expert.", knowledge: ["Python / R", "SQL", "Statistics"],           skills: ["Data Visualization", "Model Training", "Experiment Design"], dispositions: ["Critical Thinking", "Communication"] },
  ml_eng:       { label: "Machine Learning Engineer", desc: "Builds and deploys production ML systems. Path: Start → Python, Linear Algebra, ML Basics → Deep Learning, Model Deployment, MLOps → Systems Thinking → Expert.", knowledge: ["Python / R", "Linear Algebra", "ML Basics"],   skills: ["Deep Learning", "Model Deployment", "MLOps"],            dispositions: ["Systems Thinking"] },
  pen_tester:   { label: "Penetration Tester",       desc: "Finds and reports vulnerabilities. Path: Start → Python, Networking, Threat Models → Vuln Analysis, Security Arch → Ethical Responsibility, Security Mindset → Expert.", knowledge: ["Python / R", "Networking", "Threat Models"], skills: ["Vulnerability Analysis", "Security Architecture"],     dispositions: ["Ethical Responsibility", "Security Mindset"] },
  sec_arch:     { label: "Security Architect",       desc: "Designs organizational security. Path: Start → Networking, Cryptography, Threat Models → Security Arch, Vuln Analysis → Ethical Responsibility, Systems Thinking → Expert.", knowledge: ["Networking", "Cryptography", "Threat Models"],  skills: ["Security Architecture", "Vulnerability Analysis"],    dispositions: ["Ethical Responsibility", "Systems Thinking"] },
  ai_sec_eng:   { label: "AI Security Engineer",    desc: "Secures AI/ML systems. Path: Start → Python, ML Basics, Threat Models → Model Deployment, Vuln Analysis → Ethical Responsibility, Security Mindset → Expert.", knowledge: ["Python / R", "ML Basics", "Threat Models"],   skills: ["Model Deployment", "Vulnerability Analysis"],          dispositions: ["Ethical Responsibility", "Security Mindset"] },
  threat_intel: { label: "Threat Intel Engineer",    desc: "Uses AI/ML for threat detection. Path: Start → Python, Statistics, Threat Models → Threat Intel, Data Viz → Critical Thinking, Communication → Expert.", knowledge: ["Python / R", "Statistics", "Threat Models"], skills: ["Threat Intelligence", "Data Visualization"],         dispositions: ["Critical Thinking", "Communication"] },
  edge_ai_eng:  { label: "Edge AI Engineer",         desc: "Deploys ML models on edge devices with performance and reliability constraints. Path: Start → Python, ML Basics → Model Deployment, MLOps → Systems Thinking → Expert.", knowledge: ["Python / R", "ML Basics"], skills: ["Model Deployment", "MLOps"], dispositions: ["Systems Thinking"] },
  embedded_ml_eng: { label: "Embedded ML Engineer",  desc: "Builds and optimizes ML for embedded systems. Path: Start → Python, Linear Algebra, ML Basics → Deep Learning → Model Deployment → Systems Thinking → Expert.", knowledge: ["Python / R", "Linear Algebra", "ML Basics"], skills: ["Deep Learning", "Model Deployment"], dispositions: ["Systems Thinking"] },
};

// ── Tree/branch layout: depth from Start, x by path-order (no global columns) ─
const NODE_RADIUS = 28;
const DEPTH_STEP = 155;   // vertical spacing between depth levels
const LANE_WIDTH = 280;  // horizontal spacing between path lanes

function buildMapNodes() {
  const pathIds = Object.keys(CAREER_PATHS);
  const nodeIds = new Set();
  Object.values(CAREER_PATHS).forEach(path => path.forEach(id => nodeIds.add(id)));
  // Organic shared-node layout:
  // - Expert is top-center.
  // - Careers sit along the bottom with slight arc.
  // - Shared nodes are placed by barycenter of the careers that use them, with gentle vertical
  //   positioning based on average path progress (so order is respected without rigid rows).
  const positions = new Map();

  const totalWidth = 2500;
  const centerX = totalWidth / 2;
  const centerY = 950;
  const expertY = centerY;
  // Pull careers closer to the central skill clusters for shorter edges.
  const careersTopY = 420;
  const careersBottomY = 1420;

  positions.set("expert", { x: centerX, y: expertY });

  // Career anchors: pull closer to the tree area.
  const leftX = 520;
  const rightX = totalWidth - 520;
  const left = [];
  const right = [];
  pathIds.forEach((id, i) => ((i % 2 === 0) ? left : right).push(id));

  const placeColumn = (ids, x) => {
    const step = (careersBottomY - careersTopY) / Math.max(1, ids.length);
    ids.forEach((id, i) => positions.set(id, { x, y: careersTopY + (i + 0.5) * step }));
  };
  placeColumn(left, leftX);
  placeColumn(right, rightX);

  // Build usage stats for shared nodes.
  const usage = new Map(); // nodeId -> { sumX, sumT, n }
  for (const careerId of pathIds) {
    const path = CAREER_PATHS[careerId] || [];
    const cpos = positions.get(careerId);
    if (!cpos || path.length < 2) continue;
    const denom = Math.max(1, path.length - 1);
    for (let i = 0; i < path.length; i++) {
      const nodeId = path[i];
      if (nodeId === careerId || nodeId === "expert") continue;
      const def = NODE_DEFS[nodeId];
      if (!def) continue;
      const t = i / denom; // 0..1 progress along path
      const u = usage.get(nodeId) || { sumX: 0, sumT: 0, n: 0 };
      u.sumX += cpos.x;
      u.sumT += t;
      u.n += 1;
      usage.set(nodeId, u);
    }
  }

  // Deterministic small jitter per node to avoid perfect alignment but keep stable.
  const hash01 = (s) => {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return ((h >>> 0) % 1000) / 1000;
  };

  // Place non-career, non-expert nodes.
  for (const nodeId of nodeIds) {
    if (nodeId === "expert") continue;
    const def = NODE_DEFS[nodeId];
    if (!def) continue;
    if (def.type === "career") continue; // already placed

    const u = usage.get(nodeId);
    const jitter = (hash01(nodeId) - 0.5);
    const x = u ? (u.sumX / u.n) : centerX;
    const t = u ? (u.sumT / u.n) : 0.5;
    // Map progress to radius around the Expert hub: later nodes closer to center.
    const rMax = 720;
    const rMin = 170;
    const r = rMax - (rMax - rMin) * t;
    const angle = (hash01(nodeId) * Math.PI * 2);
    const y = centerY + Math.sin(angle) * r + jitter * 50;

    // Slight type-based nudges to keep the visual language (K a bit farther out than S than D).
    const typeNudge = def.type === "knowledge" ? 90 : def.type === "skill" ? 0 : def.type === "disposition" ? -80 : 0;
    positions.set(nodeId, {
      x: Math.max(180, Math.min(totalWidth - 180, x + Math.cos(angle) * typeNudge + jitter * 70)),
      y: Math.max(140, Math.min(careersBottomY - 80, y + Math.sin(angle) * typeNudge)),
    });
  }

  // Gentle collision-avoidance pass (keeps layout organic but reduces overlaps).
  const movable = Array.from(nodeIds)
    .filter(id => id !== "expert" && NODE_DEFS[id] && NODE_DEFS[id].type !== "career")
    .map(id => ({ id, type: NODE_DEFS[id].type }));
  const minDist = NODE_RADIUS * 2 + 78;
  for (let iter = 0; iter < 6; iter++) {
    for (let a = 0; a < movable.length; a++) {
      const ida = movable[a].id;
      const pa = positions.get(ida);
      if (!pa) continue;
      for (let b = a + 1; b < movable.length; b++) {
        const idb = movable[b].id;
        const pb = positions.get(idb);
        if (!pb) continue;
        const dx = pb.x - pa.x;
        const dy = pb.y - pa.y;
        const d = Math.max(1, Math.hypot(dx, dy));
        if (d >= minDist) continue;
        const push = (minDist - d) * 0.5;
        const ux = dx / d, uy = dy / d;
        // Prefer horizontal separation to preserve upward flow; small vertical component helps untangle.
        const kx = 0.9;
        const ky = 0.6;
        positions.set(ida, {
          x: Math.max(180, Math.min(totalWidth - 180, pa.x - ux * push * kx)),
          y: Math.max(140, Math.min(careersBottomY - 80, pa.y - uy * push * ky)),
        });
        positions.set(idb, {
          x: Math.max(180, Math.min(totalWidth - 180, pb.x + ux * push * kx)),
          y: Math.max(140, Math.min(careersBottomY - 80, pb.y + uy * push * ky)),
        });
      }
    }
  }

  // Minor manual nudge: keep Ethical Responsibility from overlapping Systems Thinking.
  const er = positions.get("ethical_resp");
  if (er) positions.set("ethical_resp", { x: er.x, y: Math.max(140, er.y - 60) });

  const skills = [];
  nodeIds.forEach(id => {
    const def = NODE_DEFS[id];
    if (!def) return;
    const pos = positions.get(id) || { x: centerX, y: careersY };
    const meta = def.type === "career" && CAREER_META[id];
    skills.push({
      id: def.id,
      label: def.label,
      icon: def.icon,
      tier: def.type === "career" ? "career" : def.type === "expert" ? "expert" : def.type === "foundation" ? "foundation" : "branch",
      branch: ["data_sci", "ml_eng"].includes(id) ? "ai" : ["pen_tester", "sec_arch"].includes(id) ? "cyber" : ["edge_ai_eng", "embedded_ml_eng"].includes(id) ? "edge" : "hybrid",
      x: pos.x,
      y: pos.y,
      radius: NODE_RADIUS,
      desc: meta ? meta.desc : def.desc,
      knowledge: meta ? meta.knowledge || [] : [],
      skills: meta ? meta.skills || [] : [],
      dispositions: meta ? meta.dispositions || [] : [],
      tools: [], learningSources: { courses: [], labs: [], projects: [] },
      prereqs: [],
      careers: [], salary: null, xp: 0,
      cc2020Layer: def.type === "career" ? "career" : def.type === "expert" ? "expert" : def.type === "foundation" ? "foundation" : def.type === "knowledge" ? "knowledge" : def.type === "skill" ? "skills" : def.type === "disposition" ? "dispositions" : "skills",
      nodeType: def.type,
      panelOnly: false,
    });
  });
  return skills;
}

// Edges: ONE clean path per career, using CAREER_PATHS:
// Career → (its Knowledge in order) → (its Skills) → (its Dispositions) → Expert.
function buildPathEdges() {
  const seen = new Set();
  const edges = [];

  // For each career, follow its linear path as defined in CAREER_PATHS.
  Object.keys(CAREER_PATHS).forEach(careerId => {
    const path = CAREER_PATHS[careerId];
    if (!Array.isArray(path) || path.length < 2) return;
    // Ensure the path ends at expert for consistency
    const fullPath = path[path.length - 1] === "expert" ? path : [...path, "expert"];
    for (let i = 0; i < fullPath.length - 1; i++) {
      const from = fullPath[i];
      const to = fullPath[i + 1];
      if (!from || !to) continue;
      const key = `${from}->${to}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ from, to });
    }
  });

  // Safety: ensure ALL disposition → Expert links are present.
  const dispositionToExpert = [
    "communication", "security_mindset", "systems_thinking"
  ];
  for (const dispId of dispositionToExpert) {
    const key = `${dispId}->expert`;
    if (!seen.has(key)) {
      seen.add(key);
      edges.push({ from: dispId, to: "expert" });
    }
  }

  return edges;
}

const MAP_NODES = buildMapNodes();
const PATH_EDGES = buildPathEdges();

// Career entries for panel (path careers — no node on map, used for selection + panel content)
const PATH_CAREER_SKILLS = Object.keys(CAREER_PATHS).map(id => ({
  id,
  label: CAREER_META[id]?.label || id,
  icon: "🤖",
  tier: "career",
  branch: ["data_sci","ml_eng"].includes(id) ? "ai" : ["pen_tester","sec_arch"].includes(id) ? "cyber" : "hybrid",
  x: 0, y: 0, radius: 44,
  desc: CAREER_META[id]?.desc || "",
  knowledge: CAREER_META[id]?.knowledge || [],
  skills: CAREER_META[id]?.skills || [],
  dispositions: CAREER_META[id]?.dispositions || [],
  tools: [], learningSources: { courses: [], labs: [], projects: [] },
  prereqs: [],
  careers: [], salary: null, xp: 0,
  cc2020Layer: "dispositions",
  panelOnly: true,
}));

// Panel-only careers (2 per category — Edge section; path careers are on map)
const PANEL_ONLY_CAREERS = [];

// Merge: map nodes (include career nodes at bottom) + panel-only careers
const SKILLS = [...MAP_NODES, ...PANEL_ONLY_CAREERS];

const SKILL_MAP = Object.fromEntries(SKILLS.map(s => [s.id, s]));

// Edges from path definition only (no extra cross-edges)
const EDGES = PATH_EDGES;
