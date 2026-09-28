import mongoose from 'mongoose';
import { Deal } from '../models/Deal.js';
import { Interaction } from '../models/Interaction.js';

export function serializeDeal(deal) {
  const d = deal.toObject ? deal.toObject() : { ...deal };
  const open = (d.objections || []).filter((o) => o.status === 'unresolved');
  return {
    id: String(d._id),
    company: d.company,
    industry: d.industry,
    contactName: d.contactName,
    contactRole: d.contactRole,
    title: d.title,
    plan: d.plan,
    value: d.value,
    stage: d.stage,
    health: d.health,
    summary: d.summary,
    bankId: d.bankId,
    requirements: d.requirements || [],
    objections: d.objections || [],
    openObjections: open,
    stakeholders: d.stakeholders || [],
    competitors: d.competitors || [],
    commitments: d.commitments || [],
    nextSteps: d.nextSteps || [],
    risks: d.risks || [],
    nextMeetingAt: d.nextMeetingAt,
    lastInteractionAt: d.lastInteractionAt,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt
  };
}

export function serializeInteraction(i) {
  const d = i.toObject ? i.toObject() : { ...i };
  return {
    id: String(d._id),
    dealId: String(d.dealId),
    seq: d.seq,
    date: d.date,
    type: d.type,
    participants: d.participants || [],
    notes: d.notes,
    extraction: d.extraction || null,
    memoryStored: d.memoryStored,
    memoryError: d.memoryError || '',
    createdAt: d.createdAt
  };
}

export function buildTimeline(interactions) {
  return [...interactions]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map((i) => ({
      seq: i.seq,
      date: i.date,
      type: i.type,
      title: `${i.type} — Interaction #${i.seq}`,
      summary:
        i.extraction?.summary ||
        i.notes.replace(/\s+/g, ' ').slice(0, 180) +
          (i.notes.length > 180 ? '…' : ''),
      participants: i.participants || [],
      memoryStored: i.memoryStored
    }));
}

export async function dashboardData() {
  const deals = await Deal.find().sort({ updatedAt: -1 }).lean();
  const interactions = await Interaction.find().sort({ date: -1 }).limit(6).lean();

  // One aggregate gives us a real interaction count per deal (no N+1 queries).
  const grouped = await Interaction.aggregate([
    { $group: { _id: '$dealId', count: { $sum: 1 }, lastAt: { $max: '$date' } } }
  ]);
  const counts = new Map(grouped.map((g) => [String(g._id), g]));

  const now = Date.now();
  const sevenDays = now + 7 * 24 * 3600 * 1000;

  const totalDeals = deals.length;
  const activeDeals = deals.filter((d) => !d.stage.startsWith('Closed')).length;
  const needsAttention = deals.filter((d) => d.health !== 'healthy').length;
  const upcomingMeetings = deals.filter(
    (d) => d.nextMeetingAt && new Date(d.nextMeetingAt).getTime() <= sevenDays
  ).length;
  const openObjections = deals.reduce(
    (n, d) => n + (d.objections || []).filter((o) => o.status === 'unresolved').length,
    0
  );
  const memoriesRetained = grouped.reduce((n, g) => n + g.count, 0);

  return {
    stats: {
      totalDeals,
      activeDeals,
      needsAttention,
      upcomingMeetings,
      openObjections,
      interactionCount: grouped.reduce((n, g) => n + g.count, 0),
      recentInteractions: interactions.length
    },
    recentDeals: deals.slice(0, 8).map((d) => ({
      ...serializeDeal(d),
      interactionCount: counts.get(String(d._id))?.count || 0,
      lastInteractionAt: counts.get(String(d._id))?.lastAt || d.lastInteractionAt
    })),
    recentInteractions: interactions.map((i) => {
      const deal = deals.find((x) => String(x._id) === String(i.dealId));
      return {
        id: String(i._id),
        dealId: String(i.dealId),
        company: deal?.company || 'Unknown',
        date: i.date,
        type: i.type,
        summary: i.extraction?.summary || i.notes.slice(0, 140),
        memoryStored: i.memoryStored
      };
    }),
    // Exposed so the UI can show "N memories in Hindsight" without a second call.
    memoriesRetained
  };
}

export { mongoose };
