// ─── CyberAI Navigator — Interactive Skill Tree ────────────────────────────

const svg        = document.getElementById("skill-tree");
const treeGroup  = document.getElementById("tree-group");
const detailPanel= document.getElementById("detail-panel");
const panelEmpty = document.getElementById("panel-empty");
const panelContent = document.getElementById("panel-content");

// ── State ──────────────────────────────────────────────────────────────────
const state = {
  unlocked: new Set(),
  selected: null,
  activePath: new Set(), // nodes on active career path
  activeEdges: new Set(), // edges on active career path ("from->to")
  xp: 0,
  transform: { x: 0, y: 0, scale: 1 },
};

// ── Path helper: one linear path per career (from CAREER_PATHS) ───────────
function getCareerPath(id) {
  if (typeof CAREER_PATHS !== "undefined" && CAREER_PATHS[id])
    return new Set(CAREER_PATHS[id]);
  const path = new Set();
  const skill = SKILL_MAP[id];
  if (skill && skill.prereqs && skill.prereqs.length)
    skill.prereqs.forEach(p => path.add(p));
  path.add(id);
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

// Flat-top hexagon path centered at 0,0 with "radius" R (vertex distance)
function hexPath(R) {
  const s = R * Math.sqrt(3) / 2, h = R / 2;
  return `M 0,${-R} L ${s},${-h} L ${s},${h} L 0,${R} L ${-s},${h} L ${-s},${-h} Z`;
}
// Diamond (rotated square) path for Dispositions layer
function diamondPath(R) {
  return `M 0,${-R} L ${R},0 L 0,${R} L ${-R},0 Z`;
}
// K = Blue, S = Green, D = Silver (distinct from Expert gold)
function layerColor(layer) {
  if (layer === "knowledge") return "#3b82f6";   // blue
  if (layer === "skills") return "#22c55e";       // green
  if (layer === "dispositions") return "#e5e7eb"; // silver
  return null;
}
const START_COLOR = "#6366f1";  // indigo for Start
const EXPERT_COLOR = "#f5c842"; // gold for Expert (distinct from dispositions)
const CAREER_NODE_COLOR = "#000000";
// Foundation badge colors (Programming=blue, Math=purple, Systems=green)
// Node color: Career, Expert, then by layer (K=blue, S=green, D=gold)
function getNodeColor(skill) {
  if (!skill) return null;
  if (skill.id === "expert") return EXPERT_COLOR;
  if (skill.tier === "career" || skill.nodeType === "career") return CAREER_NODE_COLOR;
  const layer = skill.cc2020Layer || (skill.nodeType === "knowledge" ? "knowledge" : skill.nodeType === "skill" ? "skills" : skill.nodeType === "disposition" ? "dispositions" : "skills");
  return layerColor(layer) || "#22c55e";
}
// Edge color by TARGET band: to Knowledge=blue, to Skills=green, to Dispositions=silver, to Expert=gold
function getEdgeColorFrom(from, to) {
  if (to && to.id === "expert") return EXPERT_COLOR;
  if (!to) return null;
  const layer = to.cc2020Layer || (to.nodeType === "knowledge" ? "knowledge" : to.nodeType === "skill" ? "skills" : to.nodeType === "disposition" ? "dispositions" : null);
  return layerColor(layer) || "#22c55e";
}
// When a career is selected, its path uses this job’s branch color (each job = its own path color)
const CAREER_PATH_COLORS = {
  data_sci: "#3b82f6", ai_researcher: "#a855f7", ml_eng: "#a855f7", applied_ai_eng: "#a855f7", adv_ml_eng: "#a855f7",
  pen_tester: "#22c55e", sec_arch: "#22c55e", ir_analyst: "#22c55e", sec_analyst: "#22c55e", iot_sec_eng: "#22c55e",
  ai_sec_eng: "#a855f7", threat_intel: "#22c55e", edge_ai_eng: "#a855f7", embedded_ml_eng: "#a855f7", robotics_eng: "#a855f7", resilient_auto_eng: "#a855f7",
};
function getPathColor() {
  const id = state.selected;
  return (id && CAREER_PATH_COLORS[id]) ? CAREER_PATH_COLORS[id] : null;
}

// ── Build tree ────────────────────────────────────────────────────────────
function buildTree() {
  treeGroup.innerHTML = "";

  // ── Canvas: layered roadmap (Start → K → S → D → Expert)
  const OX = 60;
  const OY = 50;
  const CW = 2500;
  const CH = 2000;

  const pathColor = getPathColor();
  // Keep legend pinned near the bottom, even if ELK places nodes low.
  const legendY = CH - 12;
  const leg = (x, label, col) => {
    const g = svgEl("g", { "pointer-events": "none" });
    g.appendChild(svgEl("circle", { cx: x, cy: legendY, r: 6, fill: "none", stroke: col, "stroke-width": 2 }));
    const t = svgEl("text", { x: x + 14, y: legendY, "font-size": 10, fill: "rgba(255,255,255,0.8)", "dominant-baseline": "middle" });
    t.textContent = label;
    g.appendChild(t);
    return g;
  };
  treeGroup.appendChild(leg(14, "Knowledge", "#3b82f6"));
  treeGroup.appendChild(leg(95, "Skill", "#22c55e"));
  treeGroup.appendChild(leg(145, "Disposition", "#e5e7eb"));
  treeGroup.appendChild(leg(235, "Career (bottom)", CAREER_NODE_COLOR));
  treeGroup.appendChild(leg(315, "Expert", EXPERT_COLOR));
  if (state.selected && typeof CAREER_PATHS !== "undefined" && CAREER_PATHS[state.selected]) {
    const jobLabel = (CAREER_META && CAREER_META[state.selected]) ? CAREER_META[state.selected].label : state.selected;
    const pathLeg = svgEl("text", {
      x: 350, y: legendY,
      "font-size": 10, fill: "rgba(255,255,255,0.9)", "dominant-baseline": "middle",
      "font-weight": "700", "pointer-events": "none",
    });
    pathLeg.textContent = `Path: ${jobLabel}`;
    treeGroup.appendChild(pathLeg);
  }
  const mapFlow = svgEl("text", {
    x: 14, y: CH - 2,
    "font-size": 10, fill: "rgba(255,255,255,0.5)",
    "letter-spacing": "1", "pointer-events": "none",
  });
  mapFlow.textContent = "Bottom: one node per job. Path: Career → Foundation → … → Expert (top). Dispositions grouped. CC2020.";
  treeGroup.appendChild(mapFlow);

  // Expert halo (optional)
  const expertSkill = SKILL_MAP.expert;
  if (expertSkill && !expertSkill.panelOnly) {
    const ex = expertSkill.x + OX, ey = expertSkill.y + OY;
    const haloG = svgEl("g", { "pointer-events": "none" });
    const haloR = (expertSkill.radius || 32) + 60;
    haloG.appendChild(svgEl("circle", { cx: ex, cy: ey, r: haloR, fill: "none", stroke: EXPERT_COLOR, "stroke-width": 4, opacity: 0.35 }));
    treeGroup.appendChild(haloG);
  }

  // ── Node radius and icon scale (bigger, clearer icons) ─────────────────
  const RADIUS_BOOST = { root: 18, foundation: 12, branch: 10, advanced: 12, career: 14, expert: 16 };
  const ICON_SIZE    = { root: 56, foundation: 44, branch: 40, advanced: 46, career: 52, expert: 50 };

  const renderRadius = (sk) => {
    if (!sk) return 28;
    const boost = RADIUS_BOOST[sk.tier] || 0;
    // Slightly UNDER-shoot the visible ring so the edge tucks under it,
    // avoiding visible "gaps" (cut-offs) at thick stroke widths.
    return Math.max(8, (sk.radius || 28) + boost - 4);
  };

  // ── Active career path (adjacent edges only) ──────────────────────────
  const selectedPathRaw = (state.selected && typeof CAREER_PATHS !== "undefined" && CAREER_PATHS[state.selected])
    ? CAREER_PATHS[state.selected]
    : null;
  const selectedPath = (selectedPathRaw && Array.isArray(selectedPathRaw))
    ? (selectedPathRaw[selectedPathRaw.length - 1] === "expert" ? selectedPathRaw : [...selectedPathRaw, "expert"])
    : null;
  const edgeOnSelectedPath = (fromId, toId) => {
    if (!selectedPath) return false;
    for (let i = 0; i < selectedPath.length - 1; i++) {
      if (selectedPath[i] === fromId && selectedPath[i + 1] === toId) return true;
    }
    return false;
  };

  // ── Edges (clean map): draw edges ONLY for selected career ───────────
  // This keeps the map visually calm (no noisy cross-lines) until a career is selected.
  const hasActivePath = !!selectedPath;
  if (hasActivePath) for (const edge of EDGES) {
    const from = SKILL_MAP[edge.from];
    const to   = SKILL_MAP[edge.to];
    if (!from || !to) continue;
    if (from.panelOnly || to.panelOnly) continue;

    const unlocked   = state.unlocked.has(edge.from) && state.unlocked.has(edge.to);
    const onPath     = edgeOnSelectedPath(edge.from, edge.to);
    if (!onPath) continue;
    const toExpert   = to.id === "expert";
    const psToExpert = edge.from === "systems_thinking" && edge.to === "expert";
    // We draw a dedicated topmost line for systems_thinking → Expert; skip the
    // base edge here to avoid double lines.
    if (psToExpert) continue;
    // Base coordinates from node centres
    const fx0 = from.x + OX, fy0 = from.y + OY, tx0 = to.x + OX, ty0 = to.y + OY;
    let fx, fy, tx, ty;
    let pathD;
    if (psToExpert) {
      // Special case: draw a bold, straight centre‑to‑centre line for
      // Problem Solving → Expert so it is absolutely obvious.
      fx = fx0; fy = fy0; tx = tx0; ty = ty0;
      pathD = `M ${fx} ${fy} L ${tx} ${ty}`;
    } else {
      // Draw edges from boundary-to-boundary to avoid "cut off" look behind nodes.
      const dx0 = tx0 - fx0, dy0 = ty0 - fy0;
      const dist = Math.max(1, Math.hypot(dx0, dy0));
      const ux = dx0 / dist, uy = dy0 / dist;
      // Clamp trim so edges don't collapse when nodes are close.
      const rf0 = renderRadius(from);
      const rt0 = renderRadius(to);
      const maxTrim = Math.max(0, dist / 2 - 2);
      const rf = Math.min(rf0, maxTrim);
      const rt = Math.min(rt0, maxTrim);
      fx = fx0 + ux * rf;
      fy = fy0 + uy * rf;
      tx = tx0 - ux * rt;
      ty = ty0 - uy * rt;
      // For the active highlighted path, draw straight segments so connections never look "broken".
      // For non-active edges, keep a gentle curve.
      const dx = tx - fx, dy = ty - fy;
      const curve = Math.min(80, Math.abs(dx) * 0.3);
      const c1x = fx + curve, c1y = fy;
      const c2x = tx - curve, c2y = ty;
      pathD = (hasActivePath && onPath)
        ? `M ${fx} ${fy} L ${tx} ${ty}`
        : `M ${fx} ${fy} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${tx} ${ty}`;
    }

    const baseWidth = 3;
    const activeWidth = 10;
    const toExpertWidth = 10;
    const baseOpacity = unlocked ? 0.9 : 0.35;
    // Edge colour always follows the TARGET band (Knowledge/Skills/Dispositions/Expert),
    // even when a career is selected; highlight is conveyed via width + glow.
    const edgeStroke = psToExpert ? EXPERT_COLOR : getEdgeColorFrom(from, to);
    const strokeW = psToExpert ? 18 : (toExpert ? toExpertWidth : activeWidth);
    const edgeOpacity = 1;
    const pathAttrs = {
      d: pathD,
      class: `edge-line ${unlocked ? "unlocked" : "locked"} ${toExpert ? "edge-to-expert" : ""} ${onPath && hasActivePath ? "path-active" : ""}`,
      id: `edge-${edge.from}-${edge.to}`,
      fill: "none",
      stroke: edgeStroke || undefined,
      "stroke-width": strokeW,
      opacity: edgeOpacity,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    };
    if (psToExpert) pathAttrs.filter = "url(#glow-gold)";
    else if (hasActivePath && onPath) pathAttrs.filter = "url(#glow-gold)";
    else if (toExpert) pathAttrs.filter = "url(#glow-gold)";
    const pathEl = svgEl("path", pathAttrs);
    treeGroup.appendChild(pathEl);
  }

  // ── Nodes: all circles; Lifelong Learning (root) has its own color, then Knowledge/Skills/Dispositions each distinct
  const layerBadge = { knowledge: "K", skills: "S", dispositions: "D" };
  for (const skill of SKILLS) {
    if (skill.panelOnly) continue;

    const isUnlocked = state.unlocked.has(skill.id);
    const isSelected = state.selected === skill.id;
    const onPath     = !hasActivePath || (selectedPath && selectedPath.includes(skill.id));
    const isCareer   = skill.tier === "career";
    const layer      = skill.cc2020Layer || "skills";
    const pathColor  = getPathColor();
    // Only career nodes adopt the selected career colour; Knowledge/Skills/Dispositions keep their band colours.
    const color      = (hasActivePath && onPath && pathColor && isCareer) ? pathColor : getNodeColor(skill);
    const boost     = RADIUS_BOOST[skill.tier] || 0;
    const r         = skill.radius + boost;
    const iconSize  = ICON_SIZE[skill.tier] || 20;

    const g = svgEl("g", {
      id: `node-${skill.id}`,
      transform: `translate(${skill.x + OX},${skill.y + OY})`,
      class: `node-group node-layer-${layer}`,
      opacity: hasActivePath ? (onPath ? 1 : 0.12) : 1,
    });

    const isExpert = skill.id === "expert";
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

      const outerRingWidth = isCareer ? 3.2 : (isExpert ? 3.2 : 2.2);
      const outerRingOpacity = hasActivePath ? (onPath ? 0.9 : 0.18) : 0.5;
      const baseFill = hasActivePath && onPath
        ? `color-mix(in srgb, ${color} 28%, #060712)`
        : isUnlocked ? "#141624" : "#060712";
      const strokeW = isSelected ? 4.4 : (hasActivePath && onPath ? 3.6 : 2.6);
      const strokeOpacity = hasActivePath && onPath ? 1 : (isUnlocked ? 0.85 : 0.35);

      const outerRing = svgEl("circle", {
        r: r + 5, fill: "none", stroke: color,
        "stroke-width": outerRingWidth, opacity: outerRingOpacity,
        "pointer-events": "none",
      });
      g.appendChild(outerRing);
      const mainCircle = svgEl("circle", {
        r, fill: baseFill, stroke: color,
        "stroke-width": strokeW, "stroke-opacity": strokeOpacity,
      });
      g.appendChild(mainCircle);

      const highlight = svgEl("circle", {
        r: r * 0.6, fill: "url(#node-core)", "pointer-events": "none",
      });
      g.appendChild(highlight);

      if (isSelected) {
        const selR = r + 8;
        const selRing = svgEl("circle", { r: selR, fill: "none", stroke: color, "stroke-width": 2.5, opacity: 0.6, "pointer-events": "none" });
        g.appendChild(selRing);
      }

      const iconBrightness = hasActivePath && onPath ? 1 : (isUnlocked ? 0.85 : 0.4);
      if (isExpert) {
        const iconEl = svgEl("text", { y: 1, "font-size": iconSize, "text-anchor": "middle", "dominant-baseline": "central", "font-weight": "bold", opacity: iconBrightness, "pointer-events": "none" });
        iconEl.textContent = skill.icon;
        g.appendChild(iconEl);
      } else if (isCareer) {
        const avatarSize = r * 1.6;
        const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(skill.id)}`;
        const img = svgEl("image", {
          href: avatarUrl,
          x: -avatarSize / 2,
          y: -avatarSize / 2,
          width: avatarSize,
          height: avatarSize,
          opacity: iconBrightness,
          "pointer-events": "none",
          "clip-path": "url(#avatar-clip)",
        });
        g.appendChild(img);
      } else {
        const iconEl = svgEl("text", {
          y: 1, "font-size": iconSize,
          "text-anchor": "middle", "dominant-baseline": "central",
          "font-weight": "bold",
          opacity: iconBrightness, "pointer-events": "none",
        });
        iconEl.textContent = skill.icon;
        g.appendChild(iconEl);
      }

    // K / S / D badge on competency nodes (not Expert or career)
    if (!isCareer && skill.id !== "expert") {
      const badge = layerBadge[layer];
      if (badge) {
        const badgeEl = svgEl("text", {
          y: r + 18, "font-size": 11, "font-weight": "700",
          fill: color, "text-anchor": "middle", "dominant-baseline": "central",
          opacity: hasActivePath && onPath ? 1 : 0.7, "pointer-events": "none",
        });
        badgeEl.textContent = badge;
        g.appendChild(badgeEl);
      }
    }

    // Expert node: show "EXPERT"
    if (skill.id === "expert") {
      const endLabel = svgEl("text", {
        y: r + 32, "font-size": 12, "font-weight": "700",
        fill: EXPERT_COLOR, "text-anchor": "middle", "dominant-baseline": "central",
        opacity: 0.95, "pointer-events": "none", "letter-spacing": "0.5",
      });
      endLabel.textContent = "EXPERT";
      g.appendChild(endLabel);
    }

    if (isUnlocked) {
      const rad = (skill.radius || 28) + (RADIUS_BOOST[skill.tier] || 0);
      const ck = svgEl("text", {
        x: rad - 5, y: -(rad - 5),
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

  // ── Overlay: ONE clear selected-career path ───────────────────────────
  // Draw the active path above nodes to guarantee continuity (no cut-offs).
  if (selectedPath && selectedPath.length >= 2) {
    const overlay = svgEl("g", { id: "active-path-overlay", "pointer-events": "none" });
    const segWidth = 12;
    for (let i = 0; i < selectedPath.length - 1; i++) {
      const fromId = selectedPath[i];
      const toId = selectedPath[i + 1];
      const from = SKILL_MAP[fromId];
      const to = SKILL_MAP[toId];
      if (!from || !to) continue;
      if (from.panelOnly || to.panelOnly) continue;

      // The final Systems Thinking → Expert segment is drawn once in the
      // topmost block; skip it here so we don't get two lines.
      if (fromId === "systems_thinking" && toId === "expert") continue;

      const isToExpert = to.id === "expert";
      // Trim overlay segments slightly so they meet node rings cleanly.
      // For the final segment into Expert, draw center-to-center to avoid any
      // perception of a missing last link due to trimming.
      const fx0 = from.x + OX, fy0 = from.y + OY;
      const tx0 = to.x + OX, ty0 = to.y + OY;
      const dx0 = tx0 - fx0, dy0 = ty0 - fy0;
      const dist = Math.max(1, Math.hypot(dx0, dy0));
      const ux = dx0 / dist, uy = dy0 / dist;
      const rf0 = renderRadius(from);
      const rt0 = renderRadius(to);
      const maxTrim = Math.max(0, dist / 2 - 2);
      const rf = isToExpert ? 0 : Math.min(rf0, maxTrim);
      const rt = isToExpert ? 0 : Math.min(rt0, maxTrim);
      const fx = fx0 + ux * rf;
      const fy = fy0 + uy * rf;
      const tx = tx0 - ux * rt;
      const ty = ty0 - uy * rt;
      const d = `M ${fx} ${fy} L ${tx} ${ty}`;
      const stroke = getEdgeColorFrom(from, to) || "#fff";

      const seg = svgEl("path", {
        d,
        fill: "none",
        stroke,
        "stroke-width": isToExpert ? 18 : segWidth,
        opacity: 1,
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
      });
      if (isToExpert) {
        // Draw a second, stronger gold pass to guarantee visibility.
        const gold = svgEl("path", {
          d,
          fill: "none",
          stroke: EXPERT_COLOR,
          "stroke-width": 22,
          opacity: 1,
          "stroke-linecap": "round",
          "stroke-linejoin": "round",
        });
        gold.setAttribute("filter", "url(#glow-gold)");
        overlay.appendChild(gold);
        seg.setAttribute("filter", "url(#glow-gold)");
      }
      overlay.appendChild(seg);
    }

    // Extra safety: if Problem Solving and Expert are both in the path,
    // draw a VERY clear, direct gold line between their centres so the
    // final hop is ALWAYS visible.
    const psIndex = selectedPath.indexOf("systems_thinking");
    const exIndex = selectedPath.indexOf("expert");
    if (psIndex !== -1 && exIndex !== -1) {
      const from = SKILL_MAP["systems_thinking"];
      const to = SKILL_MAP["expert"];
      if (from && to && !from.panelOnly && !to.panelOnly) {
        // Draw a slightly offset gold segment from Problem Solving to Expert so
        // it is clearly visible even if the direct center line is under nodes.
        const fx0 = from.x + OX;
        const fy0 = from.y + OY;
        const tx0 = to.x + OX;
        const ty0 = to.y + OY;
        const dx0 = tx0 - fx0;
        const dy0 = ty0 - fy0;
        const dist = Math.max(1, Math.hypot(dx0, dy0));
        const ux = dx0 / dist;
        const uy = dy0 / dist;
        // perpendicular unit vector for small sideways offset
        const px = -uy;
        const py = ux;
        const offset = 10;
        const fx = fx0 + px * offset;
        const fy = fy0 + py * offset;
        const tx = tx0 + px * offset;
        const ty = ty0 + py * offset;
        const d = `M ${fx} ${fy} L ${tx} ${ty}`;
        const psSeg = svgEl("path", {
          d,
          fill: "none",
          stroke: EXPERT_COLOR,
          "stroke-width": 22,
          opacity: 1,
          "stroke-linecap": "round",
          "stroke-linejoin": "round",
        });
        psSeg.setAttribute("filter", "url(#glow-gold)");
        overlay.appendChild(psSeg);
      }
    }

    treeGroup.appendChild(overlay);
  }

  // Topmost: one gold line Problem Solving → Expert when that path is selected.
  // Drawn last so it is never covered by nodes.
  //
  // IMPORTANT: Use the *rendered* node positions from the DOM (the <g transform="translate(x,y)">),
  // not SKILL_MAP coordinates, so this cannot drift due to layout/offset math.
  if (selectedPath && selectedPath.indexOf("systems_thinking") !== -1 && selectedPath.indexOf("expert") !== -1) {
    const fromG = document.getElementById("node-systems_thinking");
    const toG = document.getElementById("node-expert");
    if (fromG && toG) {
      const parseTranslate = (el) => {
        const t = el.getAttribute("transform") || "";
        const m = t.match(/translate\(([-0-9.]+)[ ,]([-0-9.]+)\)/);
        return m ? { x: Number(m[1]), y: Number(m[2]) } : null;
      };
      const fromP = parseTranslate(fromG);
      const toP = parseTranslate(toG);
      if (fromP && toP) {
        const top = svgEl("g", { id: "ps-expert-top", "pointer-events": "none" });
        const line = svgEl("path", {
          id: "ps-expert-top-line",
          d: `M ${fromP.x} ${fromP.y} L ${toP.x} ${toP.y}`,
          fill: "none",
          stroke: EXPERT_COLOR,
          "stroke-width": 30,
          opacity: 1,
          "stroke-linecap": "round",
          "stroke-linejoin": "round",
        });
        line.setAttribute("filter", "url(#glow-gold)");
        top.appendChild(line);
        treeGroup.appendChild(top);
      }
    }
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
  document.getElementById("panel-competencies-section").classList.add("hidden");
  document.getElementById("panel-zone-knowledge").classList.add("hidden");
  document.getElementById("panel-zone-skills").classList.add("hidden");
  document.getElementById("panel-zone-disposition").classList.add("hidden");
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
  state.activeEdges = new Set();
  if (skill?.tier === "career" && typeof CAREER_PATHS !== "undefined" && CAREER_PATHS[id]) {
    const path = CAREER_PATHS[id];
    state.activePath = new Set(path);
    for (let i = 0; i < path.length - 1; i++) {
      state.activeEdges.add(`${path[i]}->${path[i + 1]}`);
    }
  } else if (skill?.id === "expert" || skill?.id === "start" || skill?.nodeType) {
    state.activePath = new Set([id]);
  } else {
    state.activePath = new Set();
  }
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

  // Knowledge, Skills, Disposition: only for careers — hide by default for all nodes
  document.getElementById("panel-zone-knowledge").classList.add("hidden");
  document.getElementById("panel-zone-skills").classList.add("hidden");
  document.getElementById("panel-zone-disposition").classList.add("hidden");

  // Restore section headings that crosscut detail may have overwritten
  document.querySelector("#panel-careers-section h4").textContent = "Opens Pathways To";
  document.querySelector("#panel-soft-section h4").textContent = "Disposition/Characteristics";

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

  // Type label: Start is just "Start"; dispositions (e.g. Collaboration) show as Disposition
  const tierLabels = {
    root: "Start · All paths begin here",
    branch: "Specialization · Choose your direction",
    advanced: "Advanced Competency · Unlocks career roles",
    career: "Start of path · Gain the Knowledge, Skills & Disposition below to reach End (Expert)",
    expert: "Expert · All career paths lead here"
  };
  const typeLabel = (skill.cc2020Layer === "dispositions" && skill.tier === "branch")
    ? "Disposition · Professional attitudes and behaviors"
    : (tierLabels[skill.tier] || "");
  document.getElementById("panel-type-label").textContent = typeLabel;

  // Description (duty of the job/competency)
  document.getElementById("panel-desc").textContent = skill.desc;

  // Tools — hidden
  document.getElementById("panel-tools-section").classList.add("hidden");
  document.getElementById("panel-prereqs-section").classList.add("hidden");
  document.getElementById("panel-competencies-section").classList.add("hidden");
  document.getElementById("panel-soft-section").classList.add("hidden");

  // Only careers get the 3 parts: Knowledge, Skills, Dispositions (CC2020)
  if (skill.tier === "career") {
    document.getElementById("panel-zone-knowledge-title").textContent = "Knowledge";
    document.getElementById("panel-zone-skills-title").textContent = "Skills";
    document.getElementById("panel-zone-disposition-title").textContent = "Dispositions";

    const comps = skill.competencies && skill.competencies.length ? skill.competencies : [];
    const knowledgeBullets = (skill.knowledge && skill.knowledge.length ? skill.knowledge : comps.filter(c => /knowledge|understand/i.test(c))).slice(0, 3);
    const skillBullets = (skill.skills && skill.skills.length ? skill.skills : comps.filter(c => !/knowledge|understand/i.test(c))).slice(0, 3);
    const dispositions = (skill.dispositions || skill.softSkills || []).slice(0, 2);

    document.getElementById("panel-zone-knowledge-content").innerHTML =
      `<ul>${knowledgeBullets.map(c => `<li>${c}</li>`).join("")}</ul>`;
    document.getElementById("panel-zone-skills-content").innerHTML =
      `<ul>${skillBullets.map(c => `<li>${c}</li>`).join("")}</ul>`;
    document.getElementById("panel-zone-disposition-content").innerHTML = dispositions.length
      ? `<ul>${dispositions.map(s => `<li>${s}</li>`).join("")}</ul>`
      : `<ul><li>Professional attitudes for this role.</li></ul>`;

    document.getElementById("panel-zone-knowledge").classList.remove("hidden");
    document.getElementById("panel-zone-skills").classList.remove("hidden");
    document.getElementById("panel-zone-disposition").classList.remove("hidden");
  }

  // "Opens Pathways To" only for career nodes (not for skill/knowledge/disposition nodes)
  const careersSec = document.getElementById("panel-careers-section");
  if (skill.tier === "career" && skill.careers && skill.careers.length) {
    careersSec.classList.remove("hidden");
    const container = document.getElementById("panel-careers");
    container.innerHTML = skill.careers.map(c => {
      const cs = SKILL_MAP[c];
      return `<div class="career-item">${cs ? cs.icon : "◈"} ${cs ? cs.label.replace("\n"," ") : c}</div>`;
    }).join("");
  } else {
    careersSec.classList.add("hidden");
  }

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
  "ml_eng", "data_sci",
  "pen_tester", "sec_arch",
  "edge_ai_eng", "embedded_ml_eng",
  "ai_sec_eng", "threat_intel",
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
  state.unlocked = new Set();
  state.selected = null;
  state.activePath = new Set();
  state.xp = 0;
  document.querySelectorAll(".cm-card").forEach(c => c.classList.remove("active-career"));
  document.querySelector("#panel-careers-section h4").textContent = "Opens Pathways To";
  document.querySelector("#panel-soft-section h4").textContent = "Disposition/Characteristics";
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
  const TREE_W = 2500, TREE_H = 2000;
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

// ── Layout (ELK) ───────────────────────────────────────────────────────────
async function computeElkLayoutIfAvailable() {
  if (typeof ELK === "undefined") return false;
  if (!Array.isArray(SKILLS) || !Array.isArray(EDGES)) return false;

  const elk = new ELK();

  const getPartition = (sk) => {
    // Smaller partition index = earlier in layered order (top when direction=DOWN).
    if (!sk) return 3;
    if (sk.id === "expert") return 0;
    if (sk.tier === "career" || sk.nodeType === "career") return 4;
    if (sk.cc2020Layer === "dispositions") return 1;
    if (sk.cc2020Layer === "skills") return 2;
    if (sk.cc2020Layer === "knowledge") return 3;
    return 3;
  };

  const nodes = SKILLS
    .filter(s => !s.panelOnly)
    .map(s => {
      const r = (s.radius || 28) + 18; // breathing room
      return {
        id: s.id,
        width: r * 2,
        height: r * 2,
        layoutOptions: {
          // Partitioning forces coarse vertical ordering without rigid rows.
          "elk.layered.partitioning.partition": String(getPartition(s)),
        },
      };
    });

  const edges = EDGES
    .map((e, idx) => ({ id: `e${idx}`, sources: [e.from], targets: [e.to] }))
    .filter(e => SKILL_MAP[e.sources[0]] && SKILL_MAP[e.targets[0]] && !SKILL_MAP[e.sources[0]].panelOnly && !SKILL_MAP[e.targets[0]].panelOnly);

  const graph = {
    id: "root",
    layoutOptions: {
      algorithm: "layered",
      "elk.direction": "DOWN",
      "elk.layered.spacing.nodeNodeBetweenLayers": "110",
      "elk.spacing.nodeNode": "70",
      "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
      "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
      "elk.layered.edgeRouting": "ORTHOGONAL",
      "elk.layered.partitioning.activate": "true",
      "elk.layered.cycleBreaking.strategy": "GREEDY",
    },
    children: nodes,
    edges,
  };

  const out = await elk.layout(graph);
  if (!out || !Array.isArray(out.children)) return false;

  // Apply layout back to SKILL_MAP (tree draws at x+OX,y+OY).
  for (const n of out.children) {
    const sk = SKILL_MAP[n.id];
    if (!sk) continue;
    sk.x = (n.x || 0) + (n.width || 0) / 2;
    sk.y = (n.y || 0) + (n.height || 0) / 2;
  }

  // Post-layout styling: make the map feel less "row-like" and closer to the reference:
  // Knowledge cluster top-right, Skills cluster top-left, Dispositions near the middle.
  const expert = SKILL_MAP.expert;
  if (expert) {
    const cx = expert.x;
    const cy = expert.y;
    for (const sk of SKILLS) {
      if (!sk || sk.panelOnly) continue;
      if (sk.id === "expert") continue;
      const isCareer = sk.tier === "career" || sk.nodeType === "career";
      if (isCareer) continue;

      const layer = sk.cc2020Layer;
      let dx = 0, dy = 0;
      if (layer === "knowledge") { dx = 320; dy = -140; }
      else if (layer === "skills") { dx = -320; dy = -140; }
      else if (layer === "dispositions") { dx = 0; dy = 160; }

      // Apply a gentle pull toward the cluster target, not a hard snap.
      sk.x = sk.x + dx;
      sk.y = sk.y + dy;

      // Keep nodes within a reasonable radius of the Expert hub.
      const maxR = 980;
      const vx = sk.x - cx;
      const vy = sk.y - cy;
      const r = Math.max(1, Math.hypot(vx, vy));
      if (r > maxR) {
        sk.x = cx + (vx / r) * maxR;
        sk.y = cy + (vy / r) * maxR;
      }
    }

    // Light collision pass so clusters don't overlap after shifting.
    const movable = SKILLS.filter(s => s && !s.panelOnly && s.id !== "expert");
    const minDist = 28 * 2 + 70;
    for (let iter = 0; iter < 5; iter++) {
      for (let i = 0; i < movable.length; i++) {
        for (let j = i + 1; j < movable.length; j++) {
          const a = movable[i], b = movable[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const d = Math.max(1, Math.hypot(dx, dy));
          if (d >= minDist) continue;
          const push = (minDist - d) * 0.5;
          const ux = dx / d, uy = dy / d;
          a.x -= ux * push; a.y -= uy * push;
          b.x += ux * push; b.y += uy * push;
        }
      }
    }
  }
  return true;
}

// ── Init ──────────────────────────────────────────────────────────────────
computeElkLayoutIfAvailable()
  .catch(() => false)
  .finally(() => {
    buildTree();
    fitToView();
    initCareerMapping();
  });
