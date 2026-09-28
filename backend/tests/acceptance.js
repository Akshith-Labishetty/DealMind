/**
 * End-to-end acceptance test. Runs against the LIVE API, so it exercises the
 * whole stack (Express → Mongo → Hindsight → Groq) rather than isolated
 * functions. Start the server first, then:
 *
 *   npm run verify
 *
 * Exit code is non-zero if any check fails, so it can gate a release.
 */
import { MIN_RELEVANCE_SCORE } from '../src/services/hindsight.js';

const BASE = process.env.API_BASE || 'http://localhost:4000/api';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* -------------------------------------------------------------- reporting */
let passed = 0;
let failed = 0;
const rows = [];

function check(name, ok, detail = '') {
  if (ok) {
    passed += 1;
    rows.push(['  \u2713', name, '']);
  } else {
    failed += 1;
    rows.push(['  \u2717', name, detail]);
  }
  return ok;
}

function section(title) {
  rows.push(['', title, '']);
}

/* ---------------------------------------------------------------- helpers */
async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  const text = await res.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text.slice(0, 200) };
  }
  return { status: res.status, body };
}

async function post(path, payload) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload ?? {})
  });
  const text = await res.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text.slice(0, 200) };
  }
  return { status: res.status, body };
}

/**
 * Ask is the one endpoint that hits Groq, and the free tier rate-limits.
 * Retry on the specific rate-limit code rather than reporting a false failure.
 */
async function askWithRetry(id, payload, attempts = 3) {
  let last = null;
  for (let i = 1; i <= attempts; i += 1) {
    last = await post(`/deals/${id}/ask`, payload);
    const code = last.body?.error?.code;
    if (last.status < 400 || code !== 'llm_rate_limited') return last;
    await sleep(4000 * i);
  }
  return last;
}

const norm = (t) =>
  String(t || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/* ------------------------------------------------------------------ checks */

async function main() {
  // ---- 1. service health -------------------------------------------------
  section('Service health');
  let health = null;
  try {
    const r = await get('/health');
    health = r.body;
    check('GET /api/health responds', r.status === 200 || r.status === 503, `HTTP ${r.status}`);
    check('MongoDB connected', Boolean(health?.db?.connected), health?.db?.message);
    check('LLM reachable', Boolean(health?.llm?.ok), health?.llm?.message);
    check('Hindsight reachable', Boolean(health?.hindsight?.ok), health?.hindsight?.message);
  } catch (e) {
    check('backend reachable', false, `${BASE} — ${e.message}. Start it with: npm start`);
    return report();
  }

  // ---- 2. data + memory bank hygiene ------------------------------------
  section('Memory bank hygiene');
  const dealsRes = await get('/deals');
  const deals = dealsRes.body?.deals || [];
  check('at least one deal exists', deals.length > 0, 'run: curl -X POST /api/demo/load');

  if (!deals.length) return report();
  const id = deals[0].id;

  const mem = await get(`/deals/${id}/memories`);
  const items = mem.body?.memories || [];
  check('memories listed', items.length > 0, mem.body?.error || 'bank is empty');

  const counts = new Map();
  for (const m of items) counts.set(norm(m.text), (counts.get(norm(m.text)) || 0) + 1);
  const dupes = [...counts.values()].filter((n) => n > 1).length;
  check('no duplicated memories (bank not contaminated)', dupes === 0, `${dupes} sentences repeated`);

  const missingType = items.filter((m) => !m.type).length;
  check('every memory exposes a type', items.length > 0 && missingType === 0, `${missingType} missing "type"`);

  // ---- 3. relevance filtering -------------------------------------------
  section('Relevance filtering (the "random answers" fix)');
  const offTopic = await post(`/deals/${id}/memories/search`, {
    query: 'what did we order for lunch'
  });
  const aboveGate = (offTopic.body?.results || []).filter(
    (r) => Number(r?.scores?.final ?? 0) >= MIN_RELEVANCE_SCORE
  ).length;
  check('off-topic recall surfaces no memories', aboveGate === 0, `${aboveGate} above the noise gate`);

  const onTopic = await post(`/deals/${id}/memories/search`, { query: 'who is the CTO' });
  const onTopicAbove = (onTopic.body?.results || []).filter(
    (r) => Number(r?.scores?.final ?? 0) >= MIN_RELEVANCE_SCORE
  ).length;
  check('relevant recall does surface memories', onTopicAbove > 0, 'nothing above the noise gate');

  // ---- 4. chat behaviour -------------------------------------------------
  section('Chat behaviour');

  const greeting = await askWithRetry(id, { question: 'hi', useMemory: true });
  check('greeting detected as smalltalk', greeting.body?.mode === 'smalltalk', `mode=${greeting.body?.mode}`);
  check('greeting recalls nothing', (greeting.body?.memoriesRetrieved ?? -1) === 0, `${greeting.body?.memoriesRetrieved} retrieved`);
  check(
    'greeting is short (no action plan)',
    String(greeting.body?.answer || '').length < 400 && !/action plan/i.test(greeting.body?.answer || ''),
    String(greeting.body?.answer || '').slice(0, 120)
  );

  const nonsense = await askWithRetry(id, {
    question: 'what did we order for lunch',
    useMemory: true
  });
  check('off-topic question recalls nothing', (nonsense.body?.memoriesRetrieved ?? -1) === 0, `${nonsense.body?.memoriesRetrieved} retrieved`);
  // Normalise typographic quotes — models love a curly apostrophe.
  const nonsenseText = String(nonsense.body?.answer || '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"');
  check(
    'off-topic question admits it does not know',
    /do not have|don'?t have|no information|not available|not something i/i.test(nonsenseText),
    nonsenseText.slice(0, 140)
  );

  const factual = await askWithRetry(id, { question: 'who is the CTO', mode: 'chat', useMemory: true });
  check('factual question answered', factual.status === 200, factual.body?.error?.message || '');
  check('factual question used memory', (factual.body?.memoriesRetrieved ?? 0) > 0, '0 retrieved');
  check('factual question cites memory', (factual.body?.memoriesUsed || []).length > 0, 'nothing cited');

  const structured = await askWithRetry(id, {
    question: "What are this customer's biggest concerns?",
    mode: 'objections',
    useMemory: true
  });
  check('objections mode answered', structured.status === 200, structured.body?.error?.message || '');
  check('objections answer is non-empty', (structured.body?.answer || '').length > 40, 'too short');

  const noMemory = await askWithRetry(id, { question: 'how should I prepare?', useMemory: false });
  check('memory-off returns a generic answer', noMemory.status === 200, noMemory.body?.error?.message || '');
  check(
    'memory-off cites nothing',
    (noMemory.body?.memoriesUsed || []).length === 0 && noMemory.body?.memoriesRetrieved === 0,
    'leaked memories into a memory-off request'
  );

  return report();
}

/* ----------------------------------------------------------------- report */
function report() {
  const width = Math.max(...rows.filter((r) => r[1]).map((r) => r[1].length), 10);
  console.log('');
  for (const [mark, name, detail] of rows) {
    if (!mark) {
      console.log(`\n${name}`);
      continue;
    }
    const pad = name.padEnd(width);
    console.log(`${mark} ${pad}${detail ? `  — ${detail}` : ''}`);
  }
  console.log(`\n${passed} passed, ${failed} failed\n`);
  return failed ? process.exit(1) : undefined;
}

main().catch((e) => {
  console.error('\nacceptance test crashed:', e.message);
  process.exit(1);
});
