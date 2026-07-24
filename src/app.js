import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { fraudRoutes } from './routes/fraud.routes.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan(process.env.NODE_ENV === 'test' ? 'tiny' : 'dev'));

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
