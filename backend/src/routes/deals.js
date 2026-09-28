import { Router } from 'express';
import { Deal } from '../models/Deal.js';
import { Interaction } from '../models/Interaction.js';
import { Activity } from '../models/Activity.js';
import { ApiError, asyncHandler, requireString, isValidObjectId } from '../utils/http.js';
import { serializeDeal, serializeInteraction, buildTimeline, dashboardData } from '../utils/serialize.js';
import { bankIdFor, ensureBank } from '../services/hindsight.js';

const router = Router();

router.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    res.json(await dashboardData());
  })
);

router.get(
  '/deals',
  asyncHandler(async (req, res) => {
    const deals = await Deal.find().sort({ updatedAt: -1 }).lean();
    res.json({ deals: deals.map(serializeDeal) });
  })
);

router.post(
  '/deals',
  asyncHandler(async (req, res) => {
    const body = req.body || {};
    const company = requireString(body.company, 'company', { max: 120 });

    const deal = await Deal.create({
      company,
      industry: body.industry || '',
      contactName: body.contactName || '',
      contactRole: body.contactRole || '',
      title: body.title || 'Enterprise Software Platform',
      plan: body.plan || 'Enterprise',
      value: Number(body.value) || 0,
      stage: body.stage || 'Discovery',
      summary: body.summary || '',
      bankId: bankIdFor(Date.now().toString(36) + Math.random().toString(36).slice(2, 8))
    });

    const bank = await ensureBank(deal.bankId);
    await Activity.create({
      dealId: deal._id,
      company: deal.company,
      kind: 'deal',
      title: `Deal created — ${deal.company}`,
      detail: `${deal.plan} plan, $${deal.value}`
    });

    res.status(201).json({ deal: serializeDeal(deal), memory: bank });
  })
);

router.get(
  '/deals/:id',
  asyncHandler(async (req, res) => {
    if (!isValidObjectId(req.params.id)) throw new ApiError('Invalid deal id.', 400, 'validation');
    const deal = await Deal.findById(req.params.id).lean();
    if (!deal) throw new ApiError('Deal not found.', 404, 'not_found');
    const interactions = await Interaction.find({ dealId: deal._id }).sort({ date: 1 }).lean();
    res.json({
      deal: serializeDeal(deal),
      interactions: interactions.map(serializeInteraction),
      timeline: buildTimeline(interactions)
    });
  })
);

router.patch(
  '/deals/:id',
  asyncHandler(async (req, res) => {
    if (!isValidObjectId(req.params.id)) throw new ApiError('Invalid deal id.', 400, 'validation');
    const deal = await Deal.findById(req.params.id);
    if (!deal) throw new ApiError('Deal not found.', 404, 'not_found');

    const allowed = ['stage', 'health', 'value', 'plan', 'title', 'summary', 'nextMeetingAt', 'industry'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) deal[key] = req.body[key];
    }
    await deal.save();
    res.json({ deal: serializeDeal(deal) });
  })
);

router.delete(
  '/deals/:id',
  asyncHandler(async (req, res) => {
    if (!isValidObjectId(req.params.id)) throw new ApiError('Invalid deal id.', 400, 'validation');
    const deal = await Deal.findById(req.params.id);
    if (!deal) throw new ApiError('Deal not found.', 404, 'not_found');
    await Interaction.deleteMany({ dealId: deal._id });
    await Activity.deleteMany({ dealId: deal._id });
    await deal.deleteOne();
    res.json({ ok: true });
  })
);

router.get(
  '/deals/:id/interactions',
  asyncHandler(async (req, res) => {
    if (!isValidObjectId(req.params.id)) throw new ApiError('Invalid deal id.', 400, 'validation');
    const interactions = await Interaction.find({ dealId: req.params.id }).sort({ date: 1 }).lean();
    res.json({ interactions: interactions.map(serializeInteraction) });
  })
);

router.get(
  '/deals/:id/timeline',
  asyncHandler(async (req, res) => {
    if (!isValidObjectId(req.params.id)) throw new ApiError('Invalid deal id.', 400, 'validation');
    const interactions = await Interaction.find({ dealId: req.params.id }).sort({ date: 1 }).lean();
    res.json({ timeline: buildTimeline(interactions) });
  })
);

export default router;
