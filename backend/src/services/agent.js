import { chatJSON } from './llm.js';
import { recall, rankMemories } from './hindsight.js';

export const MODES = {
  brief: 'meeting_briefing',
  history: 'customer_history',
  objections: 'objection_analysis',
  strategy: 'deal_strategy',
  followup: 'follow_up_email',
  risk: 'deal_risk',
  chat: 'general',
  smalltalk: 'smalltalk'
};

/**
 * Questions that are NOT about the deal: greetings, sign-offs, filler and
 * meta questions. These must never trigger a memory recall — otherwise the
 * model gets handed 14 deal facts and dutifully turns "hi" into an action
 * plan, which reads as random/confused behaviour.
 *
 * Anchored to the WHOLE question so "hello, what's the pricing status?" is
 * still treated as a real question.
 */
const SMALLTALK_PATTERNS = [
  /^(hi|hii+|hey|hello|yo|hiya|howdy|henlo)[.!? ]*$/,
  /^(good (morning|afternoon|evening)|morning|evening|gm)[.!? ]*$/,
  /^(thanks|thank you|thankyou|thx|ty|cheers|appreciated)[.!? ]*$/,
  /^(ok|okay|k|cool|great|nice|perfect|awesome|great stuff|got it|makes sense|understood|noted)[.!? ]*$/,
  /^(bye|goodbye|see you|see ya|cya|later|talk soon)[.!? ]*$/,
  /^(how are you|how r u|how's it going|whats up|what's up|sup|how do you feel)[.!? ]*$/,
  /^(yes|yeah|yep|no|nope|nah|sure|hmm+)[.!? ]*$/,
  /^(tell me a joke|tell me something funny|joke|make me laugh|flip a coin|roll a dice|sing)[.!? ]*$/,
  /^(who are you|what are you|what can you do|what do you do|what is dealmind|how does this work|help)[.!? ]*$/
];

export function isSmalltalk(question = '') {
  const q = String(question || '').trim().toLowerCase();
  if (!q || q.length > 60) return false;
  return SMALLTALK_PATTERNS.some((re) => re.test(q));
}

export function detectMode(question = '') {
  if (isSmalltalk(question)) return 'smalltalk';
  const q = question.toLowerCase();
  if (/\bbrief(ing|s)?\b|before my next meeting|meeting tomorrow\b/.test(q)) return 'brief';
  if (/\b(history|recap|previously|previous meeting|what happened|so far|timeline)\b/.test(q)) return 'history';
  if (/\b(objection|objections|concern|concerns|blocker|blockers|worried)\b/.test(q)) return 'objections';
  if (/\b(follow[- ]?up|followup|email|draft)\b/.test(q)) return 'followup';
  if (/\b(risk|risks|losing|danger|vulnerable)\b/.test(q)) return 'risk';
  if (/\b(approach|strategy|strategies|playbook|prepare|preparing|prepared|next meeting|discuss)\b/.test(q)) return 'strategy';
  return 'chat';
}

export const MODE_INSTRUCTIONS = {
  meeting_briefing: `Produce a complete pre-meeting briefing with these sections:
## Customer Overview
## Current Deal Stage
## Key Stakeholders
## Requirements
## Unresolved Objections
## Competitor Situation
## Previous Commitments
## Latest Interaction
## Recommended Discussion Points
## Risks
## Suggested Next Steps`,
  customer_history: `Summarize the interaction history chronologically (oldest to newest). Use "### <date> — <type>" headings. Focus on what changed at each step: what was learned, what was raised, what was agreed. End with "### Where the deal stands now".`,
  objection_analysis: `Produce an objection analysis:
## Open Objections
For each: subject, who raised it, when, detail, what has been attempted, recommended next action.
## Resolved Objections
For each: subject and how it was closed.
## Bottom Line
One short paragraph on which objection matters most and why.`,
  deal_strategy: `Produce a concrete strategy for the next meeting:
## Recommended Approach (opening, sequencing, closing)
## Talk Tracks (2-4 specific points grounded in remembered facts)
## What To Avoid
## Desired Outcome
Ground every recommendation in a remembered fact — cite it inline like [M2]. Never give advice that contradicts the memories.`,
  follow_up_email: `Write a follow-up email as markdown:
**Subject:** ...
then the body.
It must reference specific remembered items (requested documents, open pricing discussion, security/SOC 2 win, agreed next steps). Warm, professional, short paragraphs, one clear call to action.`,
  deal_risk: `Produce a risk assessment:
## Risk Level (Low / Medium / High)
## Risk Factors (unresolved objections, competitor activity, stakeholder gaps, missing follow-ups, stale activity)
## Evidence (cite the memories that support each factor)
## Mitigations (what to do this week)
Do not invent facts. If there is no evidence for a risk, say so.`,
  general: `Answer the salesperson's question directly and specifically, grounded in the remembered deal context. Use short markdown sections or bullets. Cite the memories that shaped the answer inline as [M1], [M2]...`,
  smalltalk: `The user is greeting you, signing off, thanking you, or asking something that has nothing to do with this sales deal.
Reply in one or two warm, human sentences. Do NOT produce agendas, action plans, briefings or deal facts.
If it is natural to do so, end by mentioning that you can help with meeting briefings, objections, deal strategy, meeting history, follow-up emails and risk analysis.`
};

function formatMemories(memories) {
  if (!memories.length) return 'NO MEMORIES RETRIEVED';
  return memories
    .map((m, i) => {
      const bits = [`[${m.ref}]`];
      if (m.type) bits.push(`type=${m.type}`);
      if (m.date) bits.push(`when=${String(m.date).slice(0, 10)}`);
      if (m.context) bits.push(`source="${m.context}"`);
      return `${bits.join(' ')}\n${m.text}`;
    })
    .join('\n\n');
}

function dealDigest(deal, interactions = []) {
  const timeline = interactions.map((i) => ({
    n: i.seq,
    date: new Date(i.date).toISOString().slice(0, 10),
    type: i.type,
    happened: i.extraction?.summary || i.notes.slice(0, 160)
  }));
  return {
    company: deal.company,
    industry: deal.industry,
    contact: `${deal.contactName} (${deal.contactRole})`,
    product: deal.title,
    plan: deal.plan,
    value_usd: deal.value,
    stage: deal.stage,
    health: deal.health,
    requirements: deal.requirements,
    objections: deal.objections.map((o) => ({
      subject: o.subject,
      status: o.status,
      detail: o.detail,
      stakeholder: o.stakeholder,
      raised: o.raisedAt ? new Date(o.raisedAt).toISOString().slice(0, 10) : null
    })),
    stakeholders: deal.stakeholders,
    competitors: deal.competitors,
    commitments: deal.commitments,
    next_steps: deal.nextSteps,
    risks: deal.risks,
    interaction_timeline: timeline
  };
}

/**
 * The DealMind agent loop:
 *   recall memories -> combine with deal state + question -> LLM reasoning
 *   -> answer + which memories were used (with the reason they mattered).
 */
export async function askAgent({ deal, interactions = [], question, mode, useMemory = true }) {
  const resolvedMode = MODES[mode] ? mode : detectMode(question);
  // Small talk never recalls: handing the model deal facts for "hi" is what
  // makes the bot look like it is answering a question nobody asked.
  const wantsMemory = useMemory && resolvedMode !== 'smalltalk';

  let memories = [];
  let memoryWarning = null;

  if (wantsMemory) {
    const tags = [`deal:${deal._id}`];
    const recallResult = await recall(deal.bankId, question, { tags, budget: 'high', maxTokens: 4000 });
    if (!recallResult.ok) memoryWarning = recallResult.error;
    // Recall is generous (it returns ~40 rows whatever you ask), so relevance
    // and de-duplication are enforced here before anything reaches the model.
    memories = rankMemories(recallResult.results, { limit: 14 });
    if (!memories.length && recallResult.results?.length && !memoryWarning) {
      memoryWarning = 'No memories matched this question closely enough.';
    }
  }

  const numbered = memories.map((m, i) => ({ ...m, ref: `M${i + 1}` }));

  const identity = `You are DealMind, an AI sales deal intelligence agent. You help a sales representative prepare for and win a specific deal.

Hard rules:
- Never invent meetings, people, numbers, dates or commitments.
- Answer the question that was actually asked. Do not pivot to an agenda or an action plan unless asked for one.
- Be concrete and decision-oriented: a salesperson should know exactly what to do next.
- Write clean markdown. No preamble like "Here is...".`;

  const grounding = wantsMemory
    ? `- Ground every specific claim in the DEAL CONTEXT or the RETRIEVED MEMORIES.
- Cite influential memories inline as [M1], [M2] etc.
- If the retrieved memories contain nothing relevant to the question, say plainly that you do not have that information in the deal memory. Do not improvise or pad the answer.`
    : resolvedMode === 'smalltalk'
      ? `- This message is not a request about the deal. Stay brief and human; do not dump deal facts, agendas or action plans.`
      : `- MEMORY IS DISABLED FOR THIS REQUEST. Do not reference the specific company, people, numbers or history. Give general, role-generic sales advice only.`;

  const system = `${identity}\n${grounding}`;

  const user = `QUESTION
${question}

MODE
${MODE_INSTRUCTIONS[resolvedMode]}

${wantsMemory ? `DEAL CONTEXT (structured application state)
${JSON.stringify(dealDigest(deal, interactions), null, 1)}

RETRIEVED HINDSIGHT MEMORIES
${formatMemories(numbered)}
` : `No deal context and no memories are available for this request.
`}

Respond with ONLY this JSON:
{
  "answer": "markdown answer",
  "memories_used": [{"ref": "M1", "why": "one short sentence explaining why this memory mattered"}]
}
${wantsMemory ? '' : '"memories_used" must be an empty array.'}`;

  const parsed = await chatJSON(
    [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ],
    { temperature: 0.3 }
  );

  const usedRefs = Array.isArray(parsed.memories_used) ? parsed.memories_used : [];
  const memoriesUsed = usedRefs
    .map((u) => {
      const found = numbered.find((m) => m.ref === String(u?.ref || '').toUpperCase());
      if (!found) return null;
      return {
        id: found.id,
        ref: found.ref,
        text: found.text,
        type: found.type,
        date: found.date || found.occurred_start || null,
        context: found.context || '',
        why: String(u?.why || '').trim()
      };
    })
    .filter(Boolean);

  return {
    answer: String(parsed.answer || '').trim() || 'The assistant could not produce an answer. Please try again.',
    mode: resolvedMode,
    usedMemory: wantsMemory,
    generic: !wantsMemory,
    memoriesUsed,
    memoriesRetrieved: numbered.length,
    memoryWarning
  };
}
