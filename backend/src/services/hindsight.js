import { HindsightClient } from '@vectorize-io/hindsight-client';
import { config } from '../config.js';

/**
 * Hindsight memory layer.
 *
 * Uses the official Hindsight SDK (@vectorize-io/hindsight-client) against the
 * documented endpoints:
 *   POST   /v1/default/banks/{bank}/memories/retain   -> client.retain()
 *   POST   /v1/default/banks/{bank}/memories/recall   -> client.recall()
 *   GET    /v1/default/banks/{bank}/memories/list     -> client.listMemories()
 *   PUT    /v1/default/banks/{bank}                   -> client.createBank()
 *
 * Every failure is converted into a structured result so the app keeps
 * running when Hindsight is unreachable.
 */

let client = null;

export function getClient() {
  if (!client) {
    client = new HindsightClient({
      baseUrl: config.hindsight.baseUrl,
      apiKey: config.hindsight.apiKey
    });
  }
  return client;
}

export function bankIdFor(dealId) {
  return `dealmind-${String(dealId)}`;
}

function errInfo(e) {
  const status = e?.status ?? e?.statusCode ?? e?.response?.status ?? null;
  const message = e?.body || e?.message || String(e);
  return { status, message: typeof message === 'string' ? message : JSON.stringify(message) };
}

export async function ensureBank(bankId) {
  try {
    await getClient().createBank(bankId);
    return { ok: true };
  } catch (e) {
    const { status, message } = errInfo(e);
    // Already exists -> fine. Anything else is reported to the caller.
    if (status === 409 || /already exists|conflict/i.test(message)) return { ok: true, existed: true };
    if (status === 401) return { ok: false, error: 'Hindsight authentication failed. Check HINDSIGHT_API_KEY.' };
    return { ok: false, error: message.slice(0, 300) };
  }
}

/**
 * Drop a bank entirely and recreate it empty.
 *
 * Needed because Mongo wipes (demo load / seed) do NOT touch Hindsight — the
 * cloud bank keeps every memory from every previous run. Without this, a demo
 * reloaded twice serves the model a bank where the same sentence appears 12
 * times, which is exactly what makes answers look random and repetitive.
 */
export async function resetBank(bankId) {
  try {
    await getClient().deleteBank(bankId);
  } catch (e) {
    const { status, message } = errInfo(e);
    // 404 = nothing to delete. Anything else is surfaced to the caller.
    if (status !== 404 && !/not found|does not exist/i.test(message)) {
      return { ok: false, error: message.slice(0, 300) };
    }
  }
  return ensureBank(bankId);
}

/**
 * Retain one or more raw content items. Hindsight performs fact extraction,
 * entity linking and (background) observation consolidation server-side.
 */
export async function retainItems(bankId, items) {
  const c = getClient();
  const normalized = items.map((i) => ({
    content: i.content,
    context: i.context || '',
    timestamp: i.timestamp ? new Date(i.timestamp).toISOString() : undefined,
    metadata: i.metadata || undefined,
    tags: i.tags || undefined
  }));

  if (normalized.length > 1) {
    try {
      const res = await c.retainBatch(bankId, normalized);
      return { ok: true, data: res };
    } catch (e) {
      const { status } = errInfo(e);
      // Fall back to per-item retain when the batch shape is rejected;
      // auth/network failures still surface to the caller.
      if (status === 401 || status === 403) throw e;
      if (!(status === 400 || status === 404 || status === 405 || status === 422 || status === null)) throw e;
    }
  }

  const out = [];
  for (const item of normalized) {
    out.push(await c.retain(bankId, item.content, {
      context: item.context,
      timestamp: item.timestamp,
      metadata: item.metadata,
      tags: item.tags
    }));
  }
  return { ok: true, data: out };
}

/**
 * Multi-strategy recall (semantic + keyword + graph + temporal, fused and
 * reranked by Hindsight). Retries once when the index has not caught up yet
 * right after a retain.
 */
export async function recall(bankId, query, options = {}) {
  const c = getClient();
  const opts = {
    budget: options.budget || 'high',
    maxTokens: options.maxTokens || 4000
  };
  if (options.tags?.length) opts.tags = options.tags;
  if (options.types?.length) opts.types = options.types;

  try {
    let res = await c.recall(bankId, query, opts);
    if (!res?.results?.length) {
      await new Promise((r) => setTimeout(r, 1800));
      res = await c.recall(bankId, query, opts);
    }
    return { ok: true, results: res?.results || [], trace: res?.trace || null };
  } catch (e) {
    const { status, message } = errInfo(e);
    if (status === 404) return { ok: true, results: [], warning: 'memory bank not found yet' };
    if (status === 401) return { ok: false, results: [], error: 'Hindsight authentication failed.' };
    return { ok: false, results: [], error: message.slice(0, 300) };
  }
}

export async function listMemories(bankId, options = {}) {
  try {
    const res = await getClient().listMemories(bankId, {
      limit: options.limit || 100,
      offset: options.offset || 0,
      ...(options.type ? { type: options.type } : {}),
      ...(options.q ? { q: options.q } : {})
    });

    // The list endpoint calls it `fact_type` while recall calls it `type` —
    // normalise so the UI always has something to show.
    const raw = res.items || res.memories || res.units || [];
    const items = raw.map((n) => ({
      ...n,
      type: n.type || n.fact_type || '',
      date: n.date || n.occurred_start || null
    }));

    return { ok: true, ...res, items, total: res.total ?? items.length };
  } catch (e) {
    const { status, message } = errInfo(e);
    if (status === 404) return { ok: true, items: [], total: 0, warning: 'memory bank not found yet' };
    if (status === 401) return { ok: false, items: [], total: 0, error: 'Hindsight authentication failed.' };
    return { ok: false, items: [], total: 0, error: message.slice(0, 300) };
  }
}

/**
 * Build the exact text retained for one interaction.
 *
 * The deal header is identical on every note, and Hindsight stores one fact per
 * retain — so repeating it made the bank fill up with the same sentence (12
 * copies after two demo loads), which poisons recall. Retain it once, on the
 * first interaction; per-note context still travels in `context` + `metadata`.
 */
export function buildInteractionContent(deal, { seq, date, type = '', participants = [], notes = '' }) {
  const when = new Date(date).toISOString().slice(0, 10);
  const lines = [];

  if (Number(seq) === 1) {
    lines.push(`Deal: ${deal.company} — ${deal.title} (${deal.plan} plan, $${deal.value}), sales stage: ${deal.stage}.`);
    if (deal.contactName) {
      lines.push(`Primary contact: ${deal.contactName}${deal.contactRole ? `, ${deal.contactRole}` : ''}.`);
    }
  }

  lines.push(
    `Interaction #${seq} on ${when} (${type})${participants.length ? ` with ${participants.join(', ')}` : ''}:`
  );
  lines.push(notes);
  return lines.join('\n');
}

/**
 * Turn raw Hindsight recall results into the handful of memories worth showing
 * the model.
 *
 * Why this exists: Hindsight returns every memory in the bank (~28, or ~40
 * before de-duplication) for *whatever* you ask — including "what did we order
 * for lunch" — so relevance has to be enforced here.
 *
 * Measured on this bank, `scores.final` separates the two cleanly:
 *   genuine hits   0.00008 … 0.49
 *   off-topic noise 0.00004 and below
 *
 * So the cutoff is `max(noiseGate, best * ratio)`: the noise gate rejects a
 * query where nothing scored, and the ratio drops stragglers that are far
 * behind the best hit for this question. Then sort best-first, collapse
 * near-identical duplicates (Hindsight stores the same extracted fact once per
 * retain), and cap the list.
 */
export const MIN_RELEVANCE_SCORE = 0.00005;
export const RELEVANCE_RATIO = 0.25;
const normText = (t) => String(t || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export function rankMemories(
  results = [],
  { minScore = MIN_RELEVANCE_SCORE, ratio = RELEVANCE_RATIO, limit = 14 } = {}
) {
  const scored = (results || []).map((r) => ({
    ...r,
    relevance: Number(r?.scores?.final ?? 0)
  }));

  const best = scored.reduce((max, r) => Math.max(max, r.relevance), 0);
  const cutoff = Math.max(minScore, best * ratio);

  const ranked = scored
    .filter((r) => r.relevance >= cutoff)
    .sort((a, b) => b.relevance - a.relevance);

  const seen = new Set();
  const out = [];
  for (const r of ranked) {
    const key = normText(r.text);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(r);
    if (out.length >= limit) break;
  }
  return out;
}

let cachedStatus = null;
export async function hindsightStatus({ refresh = false } = {}) {
  if (cachedStatus && !refresh) return cachedStatus;
  if (!config.hindsight.apiKey) {
    cachedStatus = { ok: false, message: 'HINDSIGHT_API_KEY missing', baseUrl: config.hindsight.baseUrl };
    return cachedStatus;
  }
  try {
    const res = await fetch(`${config.hindsight.baseUrl}/version`, {
      headers: { Authorization: `Bearer ${config.hindsight.apiKey}` },
      signal: AbortSignal.timeout(10000)
    });
    const body = await res.json().catch(() => ({}));
    cachedStatus = {
      ok: res.ok,
      message: res.ok ? `connected (Hindsight ${body.api_version || 'unknown'})` : `HTTP ${res.status}`,
      baseUrl: config.hindsight.baseUrl,
      apiVersion: body.api_version
    };
  } catch (e) {
    cachedStatus = { ok: false, message: e.message, baseUrl: config.hindsight.baseUrl };
  }
  return cachedStatus;
}
