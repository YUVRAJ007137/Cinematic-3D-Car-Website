#!/usr/bin/env node

/**
 * Validates config/explode.json and config/groups.json against their schemas.
 * Usage: node scripts/validate-json.js
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import Ajv from 'ajv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function loadJSON(path) {
  return JSON.parse(readFileSync(resolve(root, path), 'utf-8'));
}

const ajv = new Ajv({ allErrors: true });

const validations = [
  { data: 'config/explode.json', schema: 'schemas/explode.schema.json' },
  { data: 'config/groups.json', schema: 'schemas/groups.schema.json' },
];

let hasErrors = false;

for (const { data, schema } of validations) {
  const schemaObj = loadJSON(schema);
  const dataObj = loadJSON(data);
  const validate = ajv.compile(schemaObj);
  const valid = validate(dataObj);

  if (valid) {
    console.log(`✅ ${data} is valid`);
  } else {
    console.error(`❌ ${data} has errors:`);
    validate.errors.slice(0, 10).forEach((err) => {
      console.error(`   ${err.instancePath || '/'}: ${err.message}`);
    });
    if (validate.errors.length > 10) {
      console.error(`   ... and ${validate.errors.length - 10} more errors`);
    }
    hasErrors = true;
  }
}

process.exit(hasErrors ? 1 : 0);
