import fs from 'fs';

const parts = JSON.parse(fs.readFileSync('config/parts.json', 'utf8'));

// Groups from PRD 7.2:
// body_panels, glass_and_lights, interior, mechanical, brakes, wheels, misc

const groups = {};

function classifyPart(name, part) {
  const mats = part.materials || [];
  const [cx, cy, cz] = part.center;
  const [sx, sy, sz] = part.size;
  const cleanName = name.replace(/\./g, '');

  let group = 'misc';
  let confidence = 'low';
  let reason = 'unclassified';

  // 1. Wheels
  if (name.startsWith('wheel_') || cleanName.startsWith('wheel_')) {
    group = 'wheels';
    confidence = 'high';
    reason = 'descriptive name wheel_*';
  }
  // 2. Brakes / Calipers
  else if (name.startsWith('Caliper_') || cleanName.startsWith('Caliper_')) {
    group = 'brakes';
    confidence = 'high';
    reason = 'descriptive name Caliper_*';
  }
  // 3. Glass & Lights
  else if (
    name.startsWith('GLASS') || cleanName.startsWith('GLASS') ||
    name.startsWith('LIGHT_GLOW') || cleanName.startsWith('LIGHT_GLOW') ||
    name.startsWith('TAIL_GLOW') || cleanName.startsWith('TAIL_GLOW') ||
    name.startsWith('CHROME_REFLECTOR') || cleanName.startsWith('CHROME_REFLECTOR') ||
    name.startsWith('METAL_TAIL_LIGHT') || cleanName.startsWith('METAL_TAIL_LIGHT') ||
    name.startsWith('Shape001') || name.startsWith('Shape002') || name.startsWith('Shape003') || name.startsWith('Shape004') ||
    mats.some(m => m.includes('Glass') || m.includes('Brake_Lamp'))
  ) {
    group = 'glass_and_lights';
    confidence = 'high';
    reason = 'glass or lighting name/material';
  }
  // 4. Interior
  else if (
    name.startsWith('int') || cleanName.startsWith('int') ||
    name.startsWith('STITCH') || cleanName.startsWith('STITCH') ||
    name.startsWith('SEAT_STITCHES') || cleanName.startsWith('SEAT_STITCHES') ||
    name.startsWith('speedook') || cleanName.startsWith('speedook') ||
    mats.some(m => m.includes('Leather') || m.includes('red Rubber'))
  ) {
    group = 'interior';
    confidence = 'high';
    reason = 'interior name or upholstery material';
  }
  // 5. Mechanical
  else if (
    name.startsWith('chassis') || cleanName.startsWith('chassis') ||
    name.startsWith('cooler') || cleanName.startsWith('cooler') ||
    name.startsWith('GAPFILL') || cleanName.startsWith('GAPFILL')
  ) {
    group = 'mechanical';
    confidence = 'high';
    reason = 'mechanical name';
  }
  // 6. Logos & Emblems
  else if (name.startsWith('bugatti_logo') || cleanName.startsWith('bugatti_logo')) {
    group = 'body_panels';
    confidence = 'high';
    reason = 'manufacturer emblem on body';
  }
  // 7. Large outer body pieces or paint materials
  else if (name === 'Box002.004' || cleanName === 'Box002004') {
    group = 'body_panels';
    confidence = 'high';
    reason = 'known large shell piece from PRD';
  }
  else if (mats.some(m => m.toLowerCase().includes('paint'))) {
    // Automotive painted panel
    group = 'body_panels';
    confidence = 'high';
    reason = 'automotive paint material';
  }
  // 8. Geometric heuristics (low confidence)
  else if (cy > 0.25 && cy < 0.8 && cz > -0.6 && cz < 0.6 && Math.abs(cx - 0.067) < 0.6) {
    group = 'interior';
    confidence = 'low';
    reason = 'heuristic: inside cabin volume';
  }
  else if (cy < 0.35 && (mats.includes('mETAL') || mats.includes('bLACK mETAL') || mats.includes('black'))) {
    group = 'mechanical';
    confidence = 'low';
    reason = 'heuristic: undercarriage metal/structure';
  }
  else if (sx > 0.9 || sz > 1.3) {
    group = 'body_panels';
    confidence = 'low';
    reason = 'heuristic: large outer dimension';
  }
  else {
    group = 'misc';
    confidence = 'low';
    reason = 'anonymous mesh with no strong spatial match';
  }

  return { group, confidence, reason };
}

for (const part of parts) {
  const origName = part.name;
  const sanitizedName = origName.replace(/\./g, '');
  const classification = classifyPart(origName, part);

  // Store under original name
  groups[origName] = classification;
  // Also store under sanitized name so Three.js name lookups work instantly
  if (sanitizedName !== origName) {
    groups[sanitizedName] = classification;
  }
}

// Summary stats on unique parts
const uniqueSummary = {};
for (const part of parts) {
  const g = groups[part.name].group;
  uniqueSummary[g] = (uniqueSummary[g] || 0) + 1;
}

console.log('Group counts (196 parts):', uniqueSummary);

fs.writeFileSync('config/groups.json', JSON.stringify(groups, null, 2));
console.log('Saved config/groups.json successfully.');
