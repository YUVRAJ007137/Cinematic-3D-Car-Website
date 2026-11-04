#!/usr/bin/env node

/**
 * Validates consistency between groups.json, explode.json, and parts.json.
 * Usage: node scripts/validate-names.js
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function loadJSON(filename) {
  const fullPath = resolve(root, filename);
  if (!existsSync(fullPath)) return null;
  return JSON.parse(readFileSync(fullPath, 'utf-8'));
}

function audit() {
  const explodeConfig = loadJSON('config/explode.json');
  const groupsData = loadJSON('config/groups.json');
  const partsData = loadJSON('config/parts.json');

  if (!explodeConfig || !groupsData) {
    console.error('❌ Missing config/explode.json or config/groups.json');
    process.exit(1);
  }

  let warnings = 0;
  const explodeGroups = new Set(Object.keys(explodeConfig));
  const assignedGroups = new Set(Object.values(groupsData).map((g) => g.group));

  console.log(`\n🔍 Auditing Groups and Explode configurations...`);
  console.log(`- Explode subsystems: ${Array.from(explodeGroups).join(', ')}`);
  console.log(`- Total mapped mesh nodes in groups.json: ${Object.keys(groupsData).length}`);

  // Check if any group assigned to meshes is missing from explodeConfig
  for (const group of assignedGroups) {
    if (!explodeGroups.has(group)) {
      console.warn(`⚠️  Group "${group}" is referenced in groups.json but not configured in explode.json`);
      warnings++;
    }
  }

  // Check parts.json coverage if it exists
  if (partsData && Array.isArray(partsData)) {
    console.log(`- Total meshes detected in model (parts.json): ${partsData.length}`);
    const unmappedMeshes = partsData.filter((p) => {
      const clean = p.name.replace(/\./g, '');
      return !groupsData[p.name] && !groupsData[clean];
    });

    if (unmappedMeshes.length > 0) {
      console.warn(`⚠️  ${unmappedMeshes.length} meshes in parts.json do not have an explicit mapping in groups.json (will default to 'misc')`);
      // Warning only, fallback handled
    } else {
      console.log(`✅ All ${partsData.length} parts in parts.json are accounted for in groups.json`);
    }
  }

  console.log(`\n${warnings === 0 ? '✅ Audit complete: No discrepancies found.' : `⚠️  Audit finished with ${warnings} warning(s).`}`);
  process.exit(warnings > 0 ? 1 : 0);
}

audit();
