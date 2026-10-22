import { describe, expect, it } from 'vitest';
import { api } from './helpers';
import { apiRouter } from '../src/routes';
import { openApiDocument } from '../src/docs/openapi';

/** All routes registered in Express, e.g. "get /api/challenges/{id}". */
function registeredRoutes(): string[] {
  const routes: string[] = [];
  for (const layer of apiRouter.stack as { route?: { path: string; methods: Record<string, boolean> } }[]) {
    if (!layer.route) continue;
    const path = '/api' + layer.route.path.replace(/:(\w+)/g, '{$1}');
    for (const method of Object.keys(layer.route.methods)) routes.push(`${method} ${path}`);
  }
  return routes.sort();
}

describe('Swagger / OpenAPI', () => {
  it('documents exactly the routes the server has', () => {
    const documented: string[] = [];
    for (const [path, item] of Object.entries(openApiDocument.paths as Record<string, Record<string, unknown>>)) {
      for (const method of Object.keys(item)) if (method !== 'parameters') documented.push(`${method} ${path}`);
    }
    expect(documented.sort()).toEqual(registeredRoutes());
    expect(registeredRoutes()).toHaveLength(21);
  });

  it('every operation has responses, and protected ones declare 401 and the Bearer scheme', () => {
    expect(openApiDocument.openapi).toMatch(/^3\./);
    expect(openApiDocument.components.securitySchemes.bearerAuth).toEqual({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' });
    for (const [path, item] of Object.entries(openApiDocument.paths as Record<string, Record<string, { responses?: Record<string, unknown>; security?: unknown[] }>>)) {
      for (const [method, op] of Object.entries(item)) {
        if (method === 'parameters') continue;
        expect(op.responses, `${method} ${path}`).toBeDefined();
        if (op.security && op.security.length) expect(op.responses, `${method} ${path}`).toHaveProperty('401');
      }
    }
  });

  it('every $ref points to an existing schema', () => {
    const text = JSON.stringify(openApiDocument);
    const refs = [...text.matchAll(/"#\/components\/schemas\/(\w+)"/g)].map((m) => m[1]);
    for (const name of refs) expect(openApiDocument.components.schemas, name).toHaveProperty(name);
  });

  it('serves Swagger UI and the JSON document', async () => {
    const ui = await api().get('/api-docs/');
    expect(ui.status).toBe(200);
    expect(ui.text).toContain('swagger-ui');
    const doc = await api().get('/api-docs/openapi.json');
    expect(doc.status).toBe(200);
    expect(doc.body.info.title).toContain('Challenges API');
  });
});
