import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { corsOrigins } from './config/env';
import { apiRouter } from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { openApiDocument } from './docs/openapi';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1); // behind the cloud provider's proxy (needed for rate limiting by IP)
  app.use(helmet({ contentSecurityPolicy: false })); // CSP off so Swagger UI works
  app.use(cors({ origin: corsOrigins === '*' ? true : corsOrigins }));
  app.use(express.json({ limit: '100kb' }));

  app.get('/', (_req, res) => res.redirect('/api-docs'));
  app.get('/api-docs/openapi.json', (_req, res) => res.json(openApiDocument));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiDocument, {
    customSiteTitle: 'Challenges API',
    swaggerOptions: { persistAuthorization: true },
  }));

  app.use('/api', apiRouter);
  app.use('/api', notFoundHandler);
  app.use(errorHandler);
  return app;
}
