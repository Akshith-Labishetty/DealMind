import { Router } from 'express';
import { Deal } from '../models/Deal.js';
import { Interaction } from '../models/Interaction.js';
import { Activity } from '../models/Activity.js';
import { ApiError, asyncHandler, requireString, isValidObjectId } from '../utils/http.js';
import { askAgent, detectMode, MODES } from '../services/agent.js';
import { listMemories } from '../services/hindsight.js';
import { LlmError } from '../services/llm.js';

const router = Router();

router.get('/modes', (req, res) => {
  res.json({
    modes: Object.keys(MODES),
    presets: [
      { id: 'brief', label: 'Generate Meeting Brief', question: 'Give me a complete briefing for my next meeting.' },
      { id: 'objections', label: 'What are the biggest concerns?', question: "What are this customer's biggest concerns right now?" },
      { id: 'strategy', label: 'How should I prepare?', question: 'How should I prepare for my next meeting?' },
      { id: 'history', label: 'Meeting history', question: 'What happened in our previous meetings?' },
      { id: 'followup', label: 'Generate Follow-up', question: 'Draft a follow-up email.' },
      { id: 'risk', label: 'Deal risk', question: 'Is this deal at risk and why?' }
    ]
  });
});

/**
 * POST /api/deals/:id/ask
 * body: { question, mode?, useMemory? }
 *
 * When useMemory=true (default) the agent recalls Hindsight memories for the
 * deal and cites exactly which ones influenced the answer.
 * When useMemory=false the same question is answered without any deal context
 * (the "before memory" baseline used by the demo).
 */
router.post(
  '/deals/:id/ask',
  asyncHandler(async (req, res) => {
    if (!isValidObjectId(req.params.id)) throw new ApiError('Invalid deal id.', 400, 'validation');
    const deal = await Deal.findById(req.params.id).lean();
    if (!deal) throw new ApiError('Deal not found.', 404, 'not_found');

    const question = requireString(req.body?.question, 'question', { max: 2000 });
    const useMemory = req.body?.useMemory !== false;
    const mode = typeof req.body?.mode === 'string' ? req.body.mode : detectMode(question);

    const interactions = await Interaction.find({ dealId: deal._id }).sort({ date: 1 }).lean();

    const result = await askAgent({ deal, interactions, question, mode, useMemory });

    await Activity.create({
      dealId: deal._id,
      company: deal.company,
      kind: 'agent',
      title: `Agent asked: ${question.slice(0, 80)}`,
      detail: `${result.memoriesUsed.length} memory/memories used`
    });

    // `memories_used` is kept as an alias of `memoriesUsed` so older clients
    // (and anything reading the README's response shape) keep working.
    res.json({ ...result, memories_used: result.memoriesUsed, question });
  })
);

/** GET /api/deals/:id/memories — every memory Hindsight holds for this deal. */
router.get(
  '/deals/:id/memories',
  asyncHandler(async (req, res) => {
    if (!isValidObjectId(req.params.id)) throw new ApiError('Invalid deal id.', 400, 'validation');
    const deal = await Deal.findById(req.params.id).lean();
    if (!deal) throw new ApiError('Deal not found.', 404, 'not_found');

    const type = typeof req.query.type === 'string' ? req.query.type : undefined;
    const result = await listMemories(deal.bankId, { limit: 200, type });
    res.json({
      memories: result.items || [],
      total: result.total ?? (result.items || []).length,
      error: result.error || null,
      bankId: deal.bankId
    });
  })
);

/** POST /api/deals/:id/memories/search — live Hindsight recall demo. */
router.post(
  '/deals/:id/memories/search',
  asyncHandler(async (req, res) => {
    if (!isValidObjectId(req.params.id)) throw new ApiError('Invalid deal id.', 400, 'validation');
    const deal = await Deal.findById(req.params.id).lean();
    if (!deal) throw new ApiError('Deal not found.', 404, 'not_found');
    const query = requireString(req.body?.query, 'query', { max: 500 });
    const { recall } = await import('../services/hindsight.js');
    const result = await recall(deal.bankId, query, { tags: [`deal:${deal._id}`] });
    res.json({ query, results: result.results || [], error: result.error || null });
  })
);

export { LlmError };
export default router;
