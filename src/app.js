import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import { fraudRoutes } from './routes/fraud.routes.js';
import { errorHandler } from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp() {
  const app = express();

  app.use(helmet({
    contentSecurityPolicy: false,
  }));
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan(process.env.NODE_ENV === 'test' ? 'tiny' : 'dev'));

  // Serve static presentation & dashboard files
  app.use(express.static(path.join(__dirname, '../public')));

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'q-leap-fraud-decision-engine'
    });
  });

  app.use('/api/v1/fraud', fraudRoutes);
  app.use(errorHandler);

  return app;
}

