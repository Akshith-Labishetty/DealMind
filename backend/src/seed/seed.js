import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { config } from '../config.js';
import { Deal } from '../models/Deal.js';
import { Interaction } from '../models/Interaction.js';
import { Activity } from '../models/Activity.js';
import { bankIdFor, ensureBank, retainItems, resetBank, buildInteractionContent } from '../services/hindsight.js';
import { extractInteraction, applyExtraction } from '../services/extractor.js';
import { DEMO_ACME, OTHER_DEALS } from './demoData.js';

async function seedDeal(spec, bankKey) {
  const warnings = [];
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
    nextMeetingAt: spec.nextMeetingAt || null,
    bankId: bankIdFor(bankKey)
  });

  const bank = await ensureBank(deal.bankId);
  if (!bank.ok) warnings.push(`bank: ${bank.error}`);

  let stored = 0;
  for (const item of spec.interactions) {
    const seq = (await Interaction.countDocuments({ dealId: deal._id })) + 1;
    const interaction = await Interaction.create({
      dealId: deal._id,
      seq,
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
      warnings.push(`extract #${seq}: ${e.message}`);
    }

    try {
      await retainItems(deal.bankId, [
        {
          content: buildInteractionContent(deal, {
            seq,
            date: item.date,
            type: item.type,
            participants: item.participants,
            notes: item.notes
          }),
          context: `sales meeting #${seq} — ${deal.company}`,
          timestamp: new Date(item.date),
          metadata: { deal_id: String(deal._id), company: deal.company, interaction: String(seq) },
          tags: [`deal:${deal._id}`]
        }
      ]);
      interaction.memoryStored = true;
      stored += 1;
    } catch (e) {
      interaction.memoryError = String(e?.message || e).slice(0, 200);
      warnings.push(`retain #${seq}: ${interaction.memoryError}`);
    }

    await interaction.save();
  }

  await deal.save();
  await Activity.create({
    dealId: deal._id,
    company: deal.company,
    kind: 'deal',
    title: `Seeded — ${deal.company}`,
    detail: `${spec.interactions.length} interactions, ${stored} retained in Hindsight`
  });

  return { company: deal.company, interactions: spec.interactions.length, memoriesRetained: stored, warnings };
}

export async function seedAll({ wipe = true } = {}) {
  if (wipe) {
    const deals = await Deal.find().select('bankId').lean();
    await Interaction.deleteMany({});
    await Activity.deleteMany({});
    await Deal.deleteMany({});
    // Reset the old banks too — otherwise re-seeding stacks duplicate memories
    // on top of whatever the previous run already retained.
    for (const d of deals) {
      try {
        await resetBank(d.bankId);
      } catch {
        /* bank already gone / unreachable — the seed still works */
      }
    }
  }

  const specs = [{ spec: DEMO_ACME, key: 'acme-demo' }, ...OTHER_DEALS.map((d, i) => ({ spec: d, key: `seed-${i + 1}` }))];

  // Deals are independent -> seed them in parallel for speed.
  const results = await Promise.all(specs.map(({ spec, key }) => seedDeal(spec, key)));
  return results;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  console.log('Seeding DealMind…');
  const connected = await mongoose.connect(config.mongoUri).then(() => true).catch((e) => {
    console.error('MongoDB connection failed:', e.message);
    return false;
  });
  if (connected) {
    try {
      const results = await seedAll({ wipe: true });
      for (const r of results) {
        console.log(` ✓ ${r.company}: ${r.interactions} interactions, ${r.memoriesRetained} retained in Hindsight`);
        for (const w of r.warnings) console.log(`   ! ${w}`);
      }
      console.log('Seed complete.');
    } finally {
      await mongoose.disconnect();
    }
  }
  process.exit(0);
}
