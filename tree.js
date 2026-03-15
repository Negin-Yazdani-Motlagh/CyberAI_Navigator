// ─── CyberAI Navigator — Interactive Skill Tree ────────────────────────────

const svg        = document.getElementById("skill-tree");
const treeGroup  = document.getElementById("tree-group");
const detailPanel= document.getElementById("detail-panel");
const panelEmpty = document.getElementById("panel-empty");
const panelContent = document.getElementById("panel-content");

// ── State ──────────────────────────────────────────────────────────────────
const state = {
  unlocked: new Set(["root"]),
  selected: null,
  activePath: new Set(),
  xp: 0,
  transform: { x: 0, y: 0, scale: 1 },
};

// ── Path helper ───────────────────────────────────────────────────────────
function getCareerPath(id) {
  const path = new Set();
  function traverse(nodeId) {
    if (path.has(nodeId)) return;
    path.add(nodeId);
    const skill = SKILL_MAP[nodeId];
    if (skill) skill.prereqs.forEach(p => traverse(p));
  }
  traverse(id);
  return path;
}

const TOTAL_XP = SKILLS.reduce((s, sk) => s + sk.xp, 0);

// ── Colour helpers ────────────────────────────────────────────────────────
function branchColor(branch) {
  return { ai: "var(--ai)", cyber: "var(--cyber)", hybrid: "var(--hybrid)", edge: "var(--edge)", crosscut: "var(--crosscut)", common: "var(--common)" }[branch] || "var(--common)";
}
function branchClass(branch) {
  const map = { ai: "ai", cyber: "cyber", hybrid: "hybrid", edge: "edge", crosscut: "crosscut", common: "common" };
  return map[branch] || "common";
}

// ── Cross-cutting soft skills ─────────────────────────────────────────────
const CROSSCUT_Y = 592;
const CROSSCUT_DATA = [
  {
    id: "cc_communication",
    label: "Communication",
    icon: "💬",
    x: 175,
    desc: "The ability to explain complex technical concepts clearly to technical and non-technical audiences alike. Essential in every AI and cybersecurity role — from presenting model results to writing incident reports.",
    careers: ["All AI & Cybersecurity Roles"],
    softSkills: ["Active Listening", "Written Communication", "Presentation", "Stakeholder Management"],
  },
  {
    id: "cc_ethical",
    label: "Ethical Reasoning",
    icon: "⚖️",
    x: 530,
    desc: "Applying moral judgement when designing AI systems or conducting security work. Covers data privacy, algorithmic bias, responsible disclosure, and the societal impact of automated decisions.",
    careers: ["All AI & Cybersecurity Roles"],
    softSkills: ["Critical Thinking", "Bias Awareness", "Responsible Disclosure", "Privacy-first Design"],
  },
  {
    id: "cc_systems",
    label: "Systems Thinking",
    icon: "🔭",
    x: 870,
    desc: "Understanding how components of a system interact, where failure points emerge, and how changes propagate. Critical for architecting secure AI systems and reasoning about complex attack surfaces.",
    careers: ["All AI & Cybersecurity Roles"],
    softSkills: ["Holistic Reasoning", "Failure Mode Analysis", "Dependency Mapping", "Root Cause Analysis"],
  },
  {
    id: "cc_collab",
    label: "Team Collaboration",
    icon: "🤝",
    x: 1225,
    desc: "Working effectively in cross-functional teams — pairing with domain experts, bridging AI and security disciplines, and participating in agile workflows. No AI or security professional works entirely alone.",
    careers: ["All AI & Cybersecurity Roles"],
    softSkills: ["Pair Programming", "Code Review Culture", "Conflict Resolution", "Remote Collaboration"],
  },
];
const CROSSCUT_MAP = Object.fromEntries(CROSSCUT_DATA.map(c => [c.id, c]));

// ── SVG helpers ───────────────────────────────────────────────────────────
function svgEl(tag, attrs = {}) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

// ── Build tree ────────────────────────────────────────────────────────────
function buildTree() {
  treeGroup.innerHTML = "";

  // ── Canvas offsets — shift all nodes down/right to free space for labels
  const OX = 100;   // horizontal padding each side
  const OY = 80;    // vertical padding at top for zone labels
  const CW = 1600;  // canvas width  (1400 + 2×OX)
  const CH = 1060;  // canvas height (900  + OY + bottom padding)


  // ── Horizontal tier band labels (3-layer competency framework) ────────
  const tierBands = [
    { y: 590 + OY, label: "CORE FOUNDATION"      },
    { y: 290 + OY, label: "COMPETENCY CLUSTERS"  },
    { y:  30 + OY, label: "CAREER READINESS"     },
  ];
  for (const b of tierBands) {
    treeGroup.appendChild(svgEl("line", {
      x1: 0, y1: b.y, x2: CW, y2: b.y,
      stroke: "rgba(255,255,255,0.06)", "stroke-width": 1,
    }));
    const lbl = svgEl("text", {
      x: 14, y: b.y + 22,
      "font-size": 13, fill: "rgba(255,255,255,0.32)",
      "letter-spacing": "3", "font-weight": "700",
      "pointer-events": "none",
    });
    lbl.textContent = b.label;
    treeGroup.appendChild(lbl);
  }


  // ── Node radius scale (bigger nodes) ─────────────────────────────────
  const RADIUS_BOOST = { root: 16, foundation: 12, branch: 10, advanced: 12, career: 14 };
  const ICON_SIZE    = { root: 42, foundation: 32, branch: 30, advanced: 34, career: 44 };

  // ── Edges (skip panel-only nodes) ─────────────────────────────────────
  const hasActivePath = state.activePath.size > 0;
  for (const edge of EDGES) {
    const from = SKILL_MAP[edge.from];
    const to   = SKILL_MAP[edge.to];
    if (!from || !to) continue;
    if (from.panelOnly || to.panelOnly) continue;

    const unlocked   = state.unlocked.has(edge.from) && state.unlocked.has(edge.to);
    const onPath     = !hasActivePath || (state.activePath.has(edge.from) && state.activePath.has(edge.to));
    const fx = from.x + OX, fy = from.y + OY, tx = to.x + OX, ty = to.y + OY;
    const midY = (fy + ty) / 2;

    const baseWidth = 3.2;
    const activeWidth = 7.5;
    const baseOpacity = unlocked ? 0.8 : 0.25;

    const pathEl = svgEl("path", {
      d: `M ${fx} ${fy} C ${fx} ${midY}, ${tx} ${midY}, ${tx} ${ty}`,
      class: `edge-line ${unlocked ? "unlocked" : "locked"} ${branchClass(to.branch)}`,
      id: `edge-${edge.from}-${edge.to}`,
      "stroke-width": hasActivePath ? (onPath ? activeWidth : 1.6) : baseWidth,
      opacity: hasActivePath ? (onPath ? 1 : 0.05) : baseOpacity,
      "stroke-linejoin": "round",
    });
    treeGroup.appendChild(pathEl);
  }

  // ── Nodes (skip panel-only nodes) ─────────────────────────────────────
  for (const skill of SKILLS) {
    if (skill.panelOnly) continue;

    const isUnlocked = state.unlocked.has(skill.id);
    const isSelected = state.selected === skill.id;
    const onPath     = !hasActivePath || state.activePath.has(skill.id);
    const bc         = branchClass(skill.branch);
    const color      = branchColor(skill.branch);
    const boost      = RADIUS_BOOST[skill.tier] || 0;
    const r          = skill.radius + boost;          // boosted radius
    const iconSize   = ICON_SIZE[skill.tier] || 20;
    const isCareer   = skill.tier === "career";

    const g = svgEl("g", {
      id: `node-${skill.id}`,
      transform: `translate(${skill.x + OX},${skill.y + OY})`,
      class: "node-group",
      opacity: hasActivePath ? (onPath ? 1 : 0.12) : 1,
    });

    // ── Ambient glow — always present but stronger on path
    const glowOuter = svgEl("circle", {
      r: r + 22,
      fill: color,
      opacity: hasActivePath ? (onPath ? 0.18 : 0.04) : 0.08,
      "pointer-events": "none",
    });
    const glowInner = svgEl("circle", {
      r: r + 10,
      fill: color,
      opacity: hasActivePath ? (onPath ? 0.25 : 0.06) : 0.12,
      "pointer-events": "none",
    });
    g.appendChild(glowOuter);
    g.appendChild(glowInner);

    // ── Outer ring — thicker for hub & clusters, heaviest for careers
    const outerRingWidth = isCareer ? 3.2 : (skill.tier === "root" ? 2.8 : 2.2);
    const outerRingOpacity = hasActivePath
      ? (onPath ? 0.9 : 0.18)
      : 0.5;
    const outerRing = svgEl("circle", {
      r: r + 4,
      fill: "none",
      stroke: color,
      "stroke-width": outerRingWidth,
      opacity: outerRingOpacity,
      "pointer-events": "none",
    });
    g.appendChild(outerRing);

    // ── Main circle
    const baseFill  = hasActivePath && onPath
      ? `color-mix(in srgb, ${color} 32%, #060712)`
      : isUnlocked ? "#141624" : "#060712";
    const strokeW   = isSelected ? 4.4 : (hasActivePath && onPath ? 3.6 : 2.6);
    const strokeOpacity = hasActivePath && onPath ? 1 : (isUnlocked ? 0.85 : 0.35);

    const circle = svgEl("circle", {
      r,
      fill: baseFill,
      stroke: color,
      "stroke-width": strokeW,
      "stroke-opacity": strokeOpacity,
    });
    g.appendChild(circle);

    // ── Inner radial highlight
    const highlight = svgEl("circle", {
      r: r - 3, fill: "url(#node-core)", "pointer-events": "none",
    });
    g.appendChild(highlight);

    // ── Selected ring
    if (isSelected) {
      const selRing = svgEl("circle", {
        r: r + 6, fill: "none",
        stroke: color, "stroke-width": 2.5, opacity: 0.6,
        "pointer-events": "none",
      });
      g.appendChild(selRing);
    }

    // ── Icon — large, centered, no labels
    const iconBrightness = hasActivePath && onPath ? 1 : (isUnlocked ? 0.75 : 0.35);
    const iconEl = svgEl("text", {
      y: 1, "font-size": iconSize,
      "text-anchor": "middle", "dominant-baseline": "central",
      opacity: iconBrightness,
      "pointer-events": "none",
    });
    iconEl.textContent = skill.icon;
    g.appendChild(iconEl);

    // ── Completion checkmark
    if (isUnlocked && skill.id !== "root") {
      const ck = svgEl("text", {
        x: r - 5, y: -(r - 5),
        "font-size": 13, fill: "var(--gold)",
        "text-anchor": "middle", "dominant-baseline": "central",
        "pointer-events": "none",
      });
      ck.textContent = "✓";
      g.appendChild(ck);
    }

    g.addEventListener("click", () => selectSkill(skill.id));
    g.style.cursor = "pointer";
    treeGroup.appendChild(g);
  }


  updateProgress();
}

// ── Cross-cutting detail ──────────────────────────────────────────────────
function showCrosscutDetail(id) {
  const cs = CROSSCUT_MAP[id];
  state.selected = id;
  state.activePath = new Set();
  buildTree();
  document.querySelectorAll(".cm-card").forEach(c => c.classList.remove("active-career"));

  panelEmpty.classList.add("hidden");
  panelContent.classList.remove("hidden");

  document.getElementById("panel-tier-badge").textContent = "⬡ Cross-Cutting · All Pathways";
  document.getElementById("panel-tier-badge").className = "crosscut";
  document.getElementById("panel-icon-ring").style.borderColor = "var(--crosscut)";
  document.getElementById("panel-icon").textContent = cs.icon;
  document.getElementById("panel-title").textContent = cs.label;
  document.getElementById("panel-type-label").textContent = "Universal Soft Skill · Applies to every AI & Cyber career";
  document.getElementById("panel-desc").textContent = cs.desc;

  document.getElementById("panel-tools-section").classList.add("hidden");
  document.getElementById("panel-prereqs-section").classList.add("hidden");
  document.getElementById("panel-learn-section").classList.add("hidden");

  const careersSec = document.getElementById("panel-careers-section");
  careersSec.classList.remove("hidden");
  document.querySelector("#panel-careers-section h4").textContent = "Applies To";
  document.getElementById("panel-careers").innerHTML =
    `<div class="career-item">🌐 ${cs.careers[0]}</div>`;

  const softSec = document.getElementById("panel-soft-section");
  softSec.classList.remove("hidden");
  document.querySelector("#panel-soft-section h4").textContent = "Core Behaviours";
  document.getElementById("panel-soft").innerHTML =
    `<div class="tag-group">${cs.softSkills.map(s => `<span class="tag soft-tag">${s}</span>`).join("")}</div>`;

  document.getElementById("unlock-btn").classList.add("hidden");
  document.getElementById("locked-btn").classList.add("hidden");
}

// ── Select / detail panel ─────────────────────────────────────────────────
function selectSkill(id) {
  state.selected = id;
  const skill = SKILL_MAP[id];
  state.activePath = (skill?.tier === "career") ? getCareerPath(id) : new Set();
  buildTree();
  showDetail(id);
  document.querySelectorAll(".cm-card").forEach(c => {
    c.classList.toggle("active-career", c.dataset.skill === id && CAREER_IDS.includes(id));
  });
}

function showDetail(id) {
  const skill = SKILL_MAP[id];
  panelEmpty.classList.add("hidden");
  panelContent.classList.remove("hidden");
  // Restore section headings that crosscut detail may have overwritten
  document.querySelector("#panel-careers-section h4").textContent = "Opens Pathways To";
  document.querySelector("#panel-soft-section h4").textContent = "Soft Skills";

  const bc = branchClass(skill.branch);
  const isUnlocked = state.unlocked.has(id);
  const prereqsMet = skill.prereqs.every(p => state.unlocked.has(p));

  // Badge
  const badge = document.getElementById("panel-tier-badge");
  const badgeLabels = { hybrid: "⬡ AI + Cyber Hybrid", ai: "◈ AI Systems", cyber: "◈ Cybersecurity", edge: "◈ Edge / Embedded AI", common: "◈ Foundation" };
  badge.textContent = badgeLabels[skill.branch] || "◈ Foundation";
  badge.className = bc;

  // Icon ring
  document.getElementById("panel-icon-ring").style.borderColor = branchColor(skill.branch);
  document.getElementById("panel-icon").textContent = skill.icon;

  // Title
  document.getElementById("panel-title").textContent = skill.label.replace("\n", " ");

  // Type label
  const tierLabels = { root: "Starting Point · Everyone begins here", foundation: "Foundation Skill · Required for all pathways", branch: "Specialization · Choose your direction", advanced: "Advanced Competency · Unlocks career roles", career: "Career Destination · Your target role" };
  document.getElementById("panel-type-label").textContent = tierLabels[skill.tier] || "";

  // Description
  document.getElementById("panel-desc").textContent = skill.desc;

  // Tools — hidden
  document.getElementById("panel-tools-section").classList.add("hidden");

  // Prereqs — hidden
  document.getElementById("panel-prereqs-section").classList.add("hidden");

  // Soft skills — shown first
  const softSec = document.getElementById("panel-soft-section");
  if (skill.softSkills && skill.softSkills.length) {
    softSec.classList.remove("hidden");
    document.getElementById("panel-soft").innerHTML =
      `<div class="tag-group">${skill.softSkills.map(s => `<span class="tag soft-tag">${s}</span>`).join("")}</div>`;
  } else { softSec.classList.add("hidden"); }

  // Career outcomes (for non-career nodes)
  const careersSec = document.getElementById("panel-careers-section");
  if (skill.careers && skill.careers.length) {
    careersSec.classList.remove("hidden");
    const container = document.getElementById("panel-careers");
    container.innerHTML = skill.careers.map(c => {
      const cs = SKILL_MAP[c];
      return `<div class="career-item">${cs ? cs.icon : "◈"} ${cs ? cs.label.replace("\n"," ") : c}</div>`;
    }).join("");
  } else { careersSec.classList.add("hidden"); }

  // Learning Sources — hidden
  document.getElementById("panel-learn-section").classList.add("hidden");

  // Buttons
  const unlockBtn = document.getElementById("unlock-btn");
  const lockedBtn = document.getElementById("locked-btn");

  if (isUnlocked) {
    unlockBtn.classList.add("hidden");
    lockedBtn.classList.add("hidden");
  } else if (prereqsMet) {
    unlockBtn.classList.remove("hidden");
    lockedBtn.classList.add("hidden");
    unlockBtn.textContent = skill.tier === "career" ? "🎓 Career Readiness" : "⚡ Complete Competency";
    unlockBtn.className = `${bc}`;
    unlockBtn.id = "unlock-btn";
    unlockBtn.onclick = () => unlockSkill(id);
  } else {
    unlockBtn.classList.add("hidden");
    lockedBtn.classList.remove("hidden");
  }
}

function unlockSkill(id) {
  const skill = SKILL_MAP[id];
  state.unlocked.add(id);
  state.xp += skill.xp;

  buildTree();
  showDetail(id);
  updateXPDisplay();
  updateCareerMapping();
  showToast(`⚡ Competency completed: ${skill.label.replace("\n"," ")}`);
}

// ── Career Mapping Panel ──────────────────────────────────────────────────
const CAREER_IDS = [
  "ml_eng","ai_researcher","data_sci","applied_ai_eng",
  "sec_analyst","pen_tester","sec_arch","ir_analyst",
  "edge_ai_eng","embedded_ml_eng","robotics_eng","iot_sec_eng",
  "ai_sec_eng","adv_ml_eng","threat_intel","resilient_auto_eng",
];

function updateCareerMapping() {
  for (const id of CAREER_IDS) {
    const card = document.querySelector(`.cm-card[data-skill="${id}"]`);
    const dot  = document.getElementById(`cm-dot-${id}`);
    if (!card || !dot) continue;
    const achieved = state.unlocked.has(id);
    const avatar = card.querySelector(".cm-avatar");
    card.classList.toggle("achieved", achieved);
    dot.classList.toggle("unlocked-dot", achieved);
    if (avatar) avatar.classList.toggle("achieved", achieved);
  }
}

function initCareerMapping() {
  document.querySelectorAll(".cm-card").forEach(card => {
    card.addEventListener("click", () => {
      const id = card.dataset.skill;
      // Clear active state from all cards
      document.querySelectorAll(".cm-card").forEach(c => c.classList.remove("active-career"));
      card.classList.add("active-career");
      selectSkill(id);
    });
  });
  updateCareerMapping();
}

// ── Progress ──────────────────────────────────────────────────────────────
function updateProgress() {
  const unlockableXP = [...state.unlocked].reduce((s, id) => s + (SKILL_MAP[id]?.xp || 0), 0);
  const pct = Math.min(100, (unlockableXP / TOTAL_XP) * 100);
  document.getElementById("progress-fill").style.width = pct + "%";
}

function updateXPDisplay() {
  document.getElementById("xp-display").querySelector("span").textContent = state.xp;
  const level = Math.floor(state.xp / 100) + 1;
  document.getElementById("level-display").querySelector("span").textContent = level;
}

// ── Toast ─────────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.classList.remove("show"); t.classList.add("hidden"); }, 2800);
}

// ── Reset ─────────────────────────────────────────────────────────────────
document.getElementById("reset-btn").addEventListener("click", () => {
  state.unlocked = new Set(["root"]);
  state.selected = null;
  state.activePath = new Set();
  state.xp = 0;
  document.querySelectorAll(".cm-card").forEach(c => c.classList.remove("active-career"));
  document.querySelector("#panel-careers-section h4").textContent = "Opens Pathways To";
  document.querySelector("#panel-soft-section h4").textContent = "Soft Skills";
  panelEmpty.classList.remove("hidden");
  panelContent.classList.add("hidden");
  updateXPDisplay();
  buildTree();
  updateCareerMapping();
  showToast("Progress reset.");
});

// ── Pan & Zoom ─────────────────────────────────────────────────────────────
let isPanning = false;
let panStart = { x: 0, y: 0 };

const container = document.getElementById("tree-container");

function applyTransform() {
  const { x, y, scale } = state.transform;
  treeGroup.setAttribute("transform", `translate(${x},${y}) scale(${scale})`);
}

function fitToView() {
  // Size the SVG viewBox to the tree's natural bounding area
  const W = container.clientWidth;
  const H = container.clientHeight;
  const TREE_W = 1600, TREE_H = 1060;
  const scaleX = W / TREE_W;
  const scaleY = H / TREE_H;
  const scale = Math.min(scaleX, scaleY) * 0.9;
  const x = (W - TREE_W * scale) / 2;
  const y = (H - TREE_H * scale) / 2;
  state.transform = { x, y, scale };
  applyTransform();
}

container.addEventListener("mousedown", e => {
  if (e.target.closest(".node-group")) return;
  isPanning = true;
  container.classList.add("grabbing");
  panStart = { x: e.clientX - state.transform.x, y: e.clientY - state.transform.y };
});
document.addEventListener("mousemove", e => {
  if (!isPanning) return;
  state.transform.x = e.clientX - panStart.x;
  state.transform.y = e.clientY - panStart.y;
  applyTransform();
});
document.addEventListener("mouseup", () => { isPanning = false; container.classList.remove("grabbing"); });

container.addEventListener("wheel", e => {
  e.preventDefault();
  const rect = container.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  const delta = e.deltaY > 0 ? 0.9 : 1.1;
  const newScale = Math.max(0.3, Math.min(2.5, state.transform.scale * delta));
  // Zoom towards mouse pointer
  state.transform.x = mx - (mx - state.transform.x) * (newScale / state.transform.scale);
  state.transform.y = my - (my - state.transform.y) * (newScale / state.transform.scale);
  state.transform.scale = newScale;
  applyTransform();
}, { passive: false });

document.getElementById("zoom-in").addEventListener("click", () => {
  state.transform.scale = Math.min(2.5, state.transform.scale * 1.2);
  applyTransform();
});
document.getElementById("zoom-out").addEventListener("click", () => {
  state.transform.scale = Math.max(0.3, state.transform.scale * 0.8);
  applyTransform();
});
document.getElementById("zoom-fit").addEventListener("click", fitToView);

// Touch support
let lastTouchDist = null;
container.addEventListener("touchstart", e => {
  if (e.touches.length === 1) {
    isPanning = true;
    panStart = { x: e.touches[0].clientX - state.transform.x, y: e.touches[0].clientY - state.transform.y };
  }
}, { passive: true });
container.addEventListener("touchmove", e => {
  if (e.touches.length === 1 && isPanning) {
    state.transform.x = e.touches[0].clientX - panStart.x;
    state.transform.y = e.touches[0].clientY - panStart.y;
    applyTransform();
  } else if (e.touches.length === 2) {
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (lastTouchDist) {
      const delta = dist / lastTouchDist;
      state.transform.scale = Math.max(0.3, Math.min(2.5, state.transform.scale * delta));
      applyTransform();
    }
    lastTouchDist = dist;
  }
}, { passive: true });
container.addEventListener("touchend", () => { isPanning = false; lastTouchDist = null; });

// ── Intro banner ──────────────────────────────────────────────────────────
document.getElementById("intro-dismiss").addEventListener("click", () => {
  const banner = document.getElementById("intro-banner");
  banner.style.opacity = "0";
  banner.style.transform = "translateY(-8px)";
  setTimeout(() => banner.style.display = "none", 300);
});

// ── Init ──────────────────────────────────────────────────────────────────
buildTree();
fitToView();
initCareerMapping();
