import { Router } from 'express';
import { evaluateFraud } from '../services/fraud.service.js';
import { getAuditsByUser } from '../services/audit.service.js';
import { validateFraudPayload } from '../middleware/validateFraudPayload.js';

export const fraudRoutes = Router();

fraudRoutes.post('/evaluate', validateFraudPayload, async (req, res, next) => {
  try {
    const result = await evaluateFraud(req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

fraudRoutes.get('/audits/users/:userId', async (req, res, next) => {
  try {
    const result = await getAuditsByUser(req.params.userId, req.query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});
