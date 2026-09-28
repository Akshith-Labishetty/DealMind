import { chatJSON, LlmError } from './llm.js';

const EXTRACTION_SCHEMA = `{
  "summary": "one sentence capturing what happened",
  "facts": ["durable customer/company facts"],
  "requirements": ["product/feature/technical requirements mentioned"],
  "objections": [{"subject": "pricing|security|integration|deployment|other", "detail": "what was objected to", "status": "unresolved|resolved", "stakeholder": "who raised it"}],
  "stakeholders": [{"name": "Full Name", "role": "job title"}],
  "competitors": ["competitor names mentioned"],
  "commitments": ["promises made by us or by the customer"],
  "outcomes": ["what went well / badly"],
  "nextSteps": [{"text": "action", "due": "date or empty"}],
  "positiveSignals": ["buying signals"],
  "riskFlags": ["signals that put the deal at risk"],
  "newInformation": true
}`;

/**
 * Structured extraction of an interaction note. The raw note is ALSO retained
 * in Hindsight (which does its own fact extraction); this pass produces the
 * structured application state kept in MongoDB.
 */
export async function extractInteraction(deal, interaction) {
  const system = `You are DealMind, an extraction engine for a sales deal intelligence app.
Extract only information explicitly present in the note. Do not invent.
Every array may be empty. "newInformation" is false when the note adds nothing a salesperson would need later.

Schema:
${EXTRACTION_SCHEMA}`;

  const user = `DEAL
Company: ${deal.company}
Contact: ${deal.contactName} (${deal.contactRole})
Product: ${deal.title} / ${deal.plan} plan, value $${deal.value}, stage: ${deal.stage}
Existing known requirements: ${(deal.requirements || []).join('; ') || 'none'}
Existing open objections: ${(deal.objections || []).filter((o) => o.status === 'unresolved').map((o) => o.subject).join(', ') || 'none'}

INTERACTION #${interaction.seq} — ${new Date(interaction.date).toISOString().slice(0, 10)} — ${interaction.type}
Participants: ${(interaction.participants || []).join(', ') || 'n/a'}
Notes:
"""
${interaction.notes}
"""`;

  try {
    const parsed = await chatJSON(
      [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      { temperature: 0.1 }
    );
    return sanitize(parsed);
  } catch (e) {
    if (e instanceof LlmError) throw e;
    throw new LlmError('Could not extract structured data from the interaction.', 'extract_failed');
  }
}

function arr(v) {
  return Array.isArray(v) ? v.filter((x) => x != null) : [];
}

function str(v, fallback = '') {
  return typeof v === 'string' ? v.trim() : fallback;
}

export function sanitize(parsed) {
  return {
    summary: str(parsed.summary),
    facts: arr(parsed.facts).map((x) => str(x)).filter(Boolean),
    requirements: arr(parsed.requirements).map((x) => str(x)).filter(Boolean),
    objections: arr(parsed.objections)
      .map((o) => ({
        subject: str(o?.subject, 'other').toLowerCase(),
        detail: str(o?.detail),
        status: o?.status === 'resolved' ? 'resolved' : 'unresolved',
        stakeholder: str(o?.stakeholder)
      }))
      .filter((o) => o.detail || o.subject),
    stakeholders: arr(parsed.stakeholders)
      .map((s) => ({ name: str(s?.name), role: str(s?.role) }))
      .filter((s) => s.name),
    competitors: arr(parsed.competitors).map((x) => str(x)).filter(Boolean),
    commitments: arr(parsed.commitments).map((x) => str(x)).filter(Boolean),
    outcomes: arr(parsed.outcomes).map((x) => str(x)).filter(Boolean),
    nextSteps: arr(parsed.nextSteps)
      .map((n) => ({ text: str(n?.text || n), due: str(n?.due) }))
      .filter((n) => n.text),
    positiveSignals: arr(parsed.positiveSignals).map((x) => str(x)).filter(Boolean),
    riskFlags: arr(parsed.riskFlags).map((x) => str(x)).filter(Boolean),
    newInformation: parsed.newInformation !== false
  };
}

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * Merge an extraction into the deal document (structured application state).
 * Returns a list of human-readable change descriptions for the activity log.
 */
export function applyExtraction(deal, ex, interaction) {
  const changes = [];

  for (const req of ex.requirements) {
    if (!deal.requirements.some((r) => norm(r) === norm(req))) {
      deal.requirements.push(req);
      changes.push(`Requirement added: ${req}`);
    }
  }

  for (const c of ex.competitors) {
    if (!deal.competitors.some((x) => norm(x) === norm(c))) {
      deal.competitors.push(c);
      changes.push(`Competitor noted: ${c}`);
    }
  }

  for (const cm of ex.commitments) {
    if (!deal.commitments.some((x) => norm(x) === norm(cm))) {
      deal.commitments.push(cm);
      changes.push(`Commitment recorded: ${cm}`);
    }
  }

  for (const st of ex.stakeholders) {
    const existing = deal.stakeholders.find((s) => norm(s.name) === norm(st.name));
    if (existing) {
      if (st.role && !existing.role) existing.role = st.role;
    } else {
      deal.stakeholders.push({ name: st.name, role: st.role, notes: '' });
      changes.push(`Stakeholder added: ${st.name}${st.role ? ` (${st.role})` : ''}`);
    }
  }

  for (const ob of ex.objections) {
    const existing = deal.objections.find((o) => norm(o.subject) === norm(ob.subject));
    if (existing) {
      if (ob.status === 'resolved' && existing.status === 'unresolved') {
        existing.status = 'resolved';
        changes.push(`Objection resolved: ${ob.subject}`);
      } else if (ob.detail && ob.detail.length > existing.detail.length) {
        existing.detail = ob.detail;
      }
      if (ob.stakeholder && !existing.stakeholder) existing.stakeholder = ob.stakeholder;
    } else {
      deal.objections.push({
        subject: ob.subject,
        detail: ob.detail,
        status: ob.status,
        stakeholder: ob.stakeholder,
        raisedAt: interaction.date,
        source: `Interaction #${interaction.seq}`
      });
      changes.push(`Objection recorded: ${ob.subject}`);
    }
  }

  for (const ns of ex.nextSteps) {
    if (!deal.nextSteps.some((n) => norm(n.text) === norm(ns.text))) {
      deal.nextSteps.push({ text: ns.text, due: ns.due, done: false, source: `Interaction #${interaction.seq}` });
      changes.push(`Next step: ${ns.text}`);
    }
  }

  for (const rf of ex.riskFlags) {
    if (!deal.risks.some((r) => norm(r.text) === norm(rf))) {
      deal.risks.push({ text: rf, level: 'medium', source: `Interaction #${interaction.seq}` });
      changes.push(`Risk flagged: ${rf}`);
    }
  }

  deal.lastInteractionAt = interaction.date;
  deal.health = computeHealth(deal);
  return changes;
}

export function computeHealth(deal) {
  const open = (deal.objections || []).filter((o) => o.status === 'unresolved');
  const highRisk = (deal.risks || []).some((r) => r.level === 'high');
  if (open.length >= 2 || highRisk) return 'risk';
  if (open.length === 1 || (deal.competitors || []).length > 0) return 'attention';
  return 'healthy';
}
