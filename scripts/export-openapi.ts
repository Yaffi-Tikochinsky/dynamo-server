// Writes the OpenAPI document to docs/openapi.json (run: npm run openapi:export).
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { openApiDocument } from '../src/docs/openapi';

const out = join(__dirname, '..', 'docs', 'openapi.json');
mkdirSync(join(__dirname, '..', 'docs'), { recursive: true });
writeFileSync(out, JSON.stringify(openApiDocument, null, 2) + '\n', 'utf8');
console.log(`OpenAPI written to ${out}`);
