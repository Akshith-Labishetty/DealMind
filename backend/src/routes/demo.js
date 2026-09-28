import { Router } from 'express';
import { Deal } from '../models/Deal.js';
import { Interaction } from '../models/Interaction.js';
import { Activity } from '../models/Activity.js';
import { asyncHandler } from '../utils/http.js';
import { serializeDeal, serializeInteraction, buildTimeline } from '../utils/serialize.js';
import { bankIdFor, ensureBank, retainItems, resetBank, buildInteractionContent } from '../services/hindsight.js';
import { extractInteraction, applyExtraction } from '../services/extractor.js';
import { DEMO_ACME } from '../seed/demoData.js';

const router = Router();

// The demo always reuses this bank id, so it must be cleared explicitly — a
// bank whose Mongo deal was already deleted is invisible to wipeAll().
const DEMO_BANK_ID = bankIdFor('acme-demo');

async function wipeAll() {
  const deals = await Deal.find().select('bankId').lean();
  await Interaction.deleteMany({});
  await Activity.deleteMany({});
  await Deal.deleteMany({});

  const warnings = [];
  const bankIds = new Set([...deals.map((d) => d.bankId), DEMO_BANK_ID]);
  for (const bankId of bankIds) {
    try {
      const r = await resetBank(bankId);
      if (!r.ok) warnings.push(`Hindsight bank ${bankId}: ${r.error}`);
    } catch (e) {
      warnings.push(`Hindsight bank ${bankId}: ${e.message}`);
    }
  }
  return warnings;
}

/**
 * POST /api/demo/load
 * Loads the Acme Technologies demo deal with its historical interactions and
 * retains every one of them in Hindsight. Idempotent: wipes Mongo AND resets
 * the memory banks first, so re-running never piles up duplicate memories.
 */
router.post(
  '/demo/load',
  asyncHandler(async (req, res) => {
    const warnings = await wipeAll();

    const spec = DEMO_ACME;
    const deal = await Deal.create({
      company: spec.company,
      industry: spec.industry,
      contactName: spec.contactName,
      contactRole: spec.contactRole,
      title: spec.title,
      plan: spec.plan,
      value: spec.value,
      stage: spec.stage,
      summary: spec.summary,
      nextMeetingAt: spec.nextMeetingAt,
      bankId: DEMO_BANK_ID
    });

    const bank = await ensureBank(deal.bankId);
    if (!bank.ok) warnings.push(`Hindsight bank: ${bank.error}`);

    const interactions = [];
    for (const item of spec.interactions) {
      const count = await Interaction.countDocuments({ dealId: deal._id });
      const interaction = await Interaction.create({
        dealId: deal._id,
        seq: count + 1,
        date: new Date(item.date),
        type: item.type,
        participants: item.participants,
        notes: item.notes
      });

      try {
        const extraction = await extractInteraction(deal, interaction);
        interaction.extraction = extraction;
        applyExtraction(deal, extraction, interaction);
      } catch (e) {
        warnings.push(`Extraction (interaction #${interaction.seq}): ${e.message}`);
      }

      try {
        await retainItems(deal.bankId, [
          {
            content: buildInteractionContent(deal, {
              seq: interaction.seq,
              date: item.date,
              type: item.type,
              participants: item.participants,
              notes: item.notes
            }),
            context: `sales meeting #${interaction.seq} — ${deal.company}`,
            timestamp: new Date(item.date),
            metadata: { deal_id: String(deal._id), company: deal.company, interaction: String(interaction.seq) },
            tags: [`deal:${deal._id}`]
          }
        ]);
        interaction.memoryStored = true;
      } catch (e) {
        interaction.memoryError = String(e?.message || e).slice(0, 200);
        warnings.push(`Hindsight retain (interaction #${interaction.seq}): ${interaction.memoryError}`);
      }

      await interaction.save();
      interactions.push(interaction);
    }

    await deal.save();
    await Activity.create({
      dealId: deal._id,
      company: deal.company,
      kind: 'demo',
      title: 'Acme demo loaded',
      detail: `${interactions.length} historical interactions retained in Hindsight`
    });

    res.json({
      deal: serializeDeal(deal),
      interactions: interactions.map(serializeInteraction),
      timeline: buildTimeline(interactions),
      warnings
    });
  })
);

/** POST /api/demo/load-all — seed all pipeline deals with full Hindsight memory banks */
router.post(
  '/demo/load-all',
  asyncHandler(async (req, res) => {
    const results = await seedAll({ wipe: true });
    res.json({
      ok: true,
      dealsCount: results.length,
      deals: results
    });
  })
);

/** POST /api/demo/reset — remove all deals, interactions, activity and memories. */
router.post(
  '/demo/reset',
  asyncHandler(async (req, res) => {
    const warnings = await wipeAll();
    res.json({ ok: true, warnings });
  })
);

export default router;
