import { Router } from 'express';
import { dbStatus } from '../db.js';
import { llmStatus } from '../services/llm.js';
import { hindsightStatus } from '../services/hindsight.js';

const router = Router();

router.get('/health', async (req, res) => {
  const [llm, hindsight] = await Promise.all([llmStatus(), hindsightStatus()]);
  const db = dbStatus();
  const ok = db.connected && llm.ok && hindsight.ok;
  res.status(ok ? 200 : 503).json({
    status: ok ? 'ok' : 'degraded',
    db,
    llm,
    hindsight,
    uptime_seconds: Math.round(process.uptime())
  });
});

export default router;
