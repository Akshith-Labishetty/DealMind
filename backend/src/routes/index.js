import { Router } from 'express';
import { dbStatus } from '../db.js';
import healthRouter from './health.js';
import dealsRouter from './deals.js';
import interactionsRouter from './interactions.js';
import agentRouter from './agent.js';
import demoRouter from './demo.js';

const router = Router();

router.use(healthRouter);

// Data routes need MongoDB; fail fast with a clear message instead of buffering.
router.use((req, res, next) => {
  if (!dbStatus().connected) {
    return res.status(503).json({
      error: { message: 'Database unavailable. Start MongoDB and retry.', code: 'db_unavailable' }
    });
  }
  next();
});
router.use(dealsRouter);
router.use(interactionsRouter);
router.use(agentRouter);
router.use(demoRouter);

router.use((req, res) => {
  res.status(404).json({ error: { message: 'Endpoint not found.', code: 'not_found' } });
});

export default router;
