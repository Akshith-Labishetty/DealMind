import { Router } from 'express';
import { Deal } from '../models/Deal.js';
import { Interaction } from '../models/Interaction.js';
import { Activity } from '../models/Activity.js';
import { ApiError, asyncHandler, requireString, isValidObjectId } from '../utils/http.js';
import { serializeInteraction } from '../utils/serialize.js';
import { extractInteraction, applyExtraction } from '../services/extractor.js';
import { retainItems, recall, ensureBank, buildInteractionContent } from '../services/hindsight.js';
import { LlmError } from '../services/llm.js';

const router = Router();

const INTERACTION_TYPES = ['Discovery', 'Technical', 'Security', 'Commercial', 'Follow-up', 'Call', 'Email', 'Workshop'];

/**
 * POST /api/deals/:id/interactions
 *
 * 1. validate + persist the raw note (MongoDB = structured app state)
 * 2. LLM structured extraction -> updates requirements/objections/stakeholders/
 *    competitors/next steps/risks
 * 3. retain the raw note in Hindsight -> persistent semantic agent memory
 * 4. record activity
 */
router.post(
  '/deals/:id/interactions',
  asyncHandler(async (req, res) => {
    if (!isValidObjectId(req.params.id)) throw new ApiError('Invalid deal id.', 400, 'validation');
    const deal = await Deal.findById(req.params.id);
    if (!deal) throw new ApiError('Deal not found.', 404, 'not_found');

    const body = req.body || {};
    const notes = requireString(body.notes, 'notes', { min: 3, max: 12000 });
    const type = INTERACTION_TYPES.includes(body.type) ? body.type : 'Call';
    const date = body.date ? new Date(body.date) : new Date();
    if (Number.isNaN(date.getTime())) throw new ApiError('Invalid date.', 400, 'validation');

    const participants = Array.isArray(body.participants)
      ? body.participants.map((p) => String(p).trim()).filter(Boolean).slice(0, 12)
      : String(body.participants || '')
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean)
          .slice(0, 12);

    const last = await Interaction.findOne({ dealId: deal._id }).sort({ seq: -1 }).select('seq').lean();
    const seq = (last?.seq || 0) + 1;

    const interaction = await Interaction.create({
      dealId: deal._id,
      seq,
      date,
      type,
      participants,
      notes
    });

    // ---- 2. structured extraction (non-fatal on failure) --------------------
    let extraction = null;
    let extractionError = null;
    try {
      extraction = await extractInteraction(deal, interaction);
      interaction.extraction = extraction;
    } catch (e) {
      extractionError = e instanceof LlmError ? e.message : 'Extraction failed.';
    }

    const changes = extraction ? applyExtraction(deal, extraction, interaction) : [];

    // ---- 3. Hindsight retain (non-fatal on failure) ------------------------
    let memoryStored = false;
    let memoryError = '';
    try {
      await ensureBankSafe(deal.bankId);
      const content = buildInteractionContent(deal, { seq, date, type, participants, notes });

      await retainItems(deal.bankId, [
        {
          content,
          context: `sales meeting #${seq} — ${deal.company}`,
          timestamp: date,
          metadata: {
            deal_id: String(deal._id),
            company: deal.company,
            interaction: String(seq),
            stage: deal.stage
          },
          tags: [`deal:${deal._id}`]
        }
      ]);
      memoryStored = true;

      // Warm the index so the very next question recalls these facts.
      setTimeout(() => {
        recall(deal.bankId, `${deal.company} ${notes.slice(0, 120)}`, { tags: [`deal:${deal._id}`] }).catch(() => {});
      }, 1200);
    } catch (e) {
      memoryError =
        e?.status === 401 || /auth/i.test(String(e?.message || ''))
          ? 'Hindsight authentication failed.'
          : String(e?.message || 'Memory storage failed.').slice(0, 200);
    }

    interaction.memoryStored = memoryStored;
    interaction.memoryError = memoryError;
    await interaction.save();
    await deal.save();

    await Activity.create({
      dealId: deal._id,
      company: deal.company,
      kind: 'interaction',
      title: `Interaction #${seq} — ${type}`,
      detail: extraction?.summary || notes.slice(0, 120)
    });
    if (memoryStored) {
      await Activity.create({
        dealId: deal._id,
        company: deal.company,
        kind: 'memory',
        title: `Hindsight stored memories from interaction #${seq}`,
        detail: 'Facts extracted and added to the deal memory bank'
      });
    }

    res.status(201).json({
      interaction: serializeInteraction(interaction),
      extraction,
      extractionError,
      changes,
      memory: { stored: memoryStored, error: memoryError },
      dealUpdated: true
    });
  })
);

async function ensureBankSafe(bankId) {
  const result = await ensureBank(bankId);
  if (!result.ok) {
    const err = new Error(result.error || 'Hindsight bank unavailable');
    err.expose = true;
    throw err;
  }
}

router.delete(
  '/interactions/:id',
  asyncHandler(async (req, res) => {
    if (!isValidObjectId(req.params.id)) throw new ApiError('Invalid interaction id.', 400, 'validation');
    const interaction = await Interaction.findById(req.params.id);
    if (!interaction) throw new ApiError('Interaction not found.', 404, 'not_found');
    await interaction.deleteOne();
    res.json({ ok: true });
  })
);

export default router;
