/**
 * DealMind unit tests — no network, no MongoDB, no API keys required.
 *
 *   cd backend && npm test
 *
 * Covers the pure-logic parts of the app: validation helpers, config key
 * normalisation, LLM JSON parsing, note extraction/merge, agent mode
 * detection and response serialisation.
 */
import assert from 'node:assert/strict';
import { ApiError, asyncHandler, requireString, isValidObjectId } from '../src/utils/http.js';
import { normalizeHindsightKey, config } from '../src/config.js';
import { extractJson } from '../src/services/llm.js';
import { sanitize, applyExtraction, computeHealth } from '../src/services/extractor.js';
import { detectMode, isSmalltalk, MODES, MODE_INSTRUCTIONS } from '../src/services/agent.js';
import { serializeDeal, serializeInteraction, buildTimeline } from '../src/utils/serialize.js';
import { bankIdFor, rankMemories, buildInteractionContent, MIN_RELEVANCE_SCORE } from '../src/services/hindsight.js';

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

/* ------------------------------------------------------------------ http */

test('ApiError exposes a safe status + code', () => {
  const e = new ApiError('Nope.', 404, 'not_found');
  assert.equal(e.status, 404);
  assert.equal(e.code, 'not_found');
  assert.equal(e.expose, true);
  assert.equal(e.message, 'Nope.');
});

test('requireString trims and enforces length', () => {
  assert.equal(requireString('  hello  ', 'notes'), 'hello');
  assert.throws(() => requireString('', 'notes'), (e) => e.status === 400 && e.code === 'validation');
  assert.throws(() => requireString(42, 'notes'), /"notes" is required/);
  assert.throws(() => requireString('ab', 'notes', { min: 3 }), /too short/);
  assert.throws(() => requireString('abc', 'notes', { max: 2 }), /too long/);
});

test('isValidObjectId accepts 24 hex chars only', () => {
  assert.equal(isValidObjectId('507f1f77bcf86cd799439011'), true);
  assert.equal(isValidObjectId('507f1f77bcf86cd79943901'), false);
  assert.equal(isValidObjectId('not-an-id'), false);
  assert.equal(isValidObjectId(null), false);
  assert.equal(isValidObjectId(undefined), false);
});

test('asyncHandler forwards rejections to next()', async () => {
  let captured = null;
  const fn = asyncHandler(async () => {
    throw new Error('boom');
  });
  await fn({}, {}, (err) => { captured = err; });
  assert.equal(captured?.message, 'boom');
});

/* --------------------------------------------------------------- config */

test('normalizeHindsightKey strips the stray copy/paste "y" prefix', () => {
  assert.equal(normalizeHindsightKey('yhsk_abc'), 'hsk_abc');
  assert.equal(normalizeHindsightKey('  hsk_abc '), 'hsk_abc');
  assert.equal(normalizeHindsightKey(''), '');
  assert.equal(normalizeHindsightKey(undefined), '');
});

test('config exposes sane defaults', () => {
  assert.equal(typeof config.port, 'number');
  assert.ok(config.port > 0);
  assert.ok(config.llm.baseUrl.startsWith('http'));
  assert.ok(config.hindsight.baseUrl.startsWith('http'));
  assert.ok(config.llm.timeoutMs >= 1000);
});

test('memory bank ids are namespaced per deal', () => {
  assert.equal(bankIdFor('abc123'), 'dealmind-abc123');
  assert.notEqual(bankIdFor('a'), bankIdFor('b'));
});

/* --------------------------------------------------- recall relevance */

const mem = (text, final) => ({ id: text.slice(0, 12), text, scores: { final } });

test('rankMemories keeps real hits and drops the noise we measured', () => {
  // Off-topic queries ("lunch", "purple elephant banana") peak at 0.00004.
  const results = [
    mem('pricing is the blocker', 0.0165),
    mem('noise a', 0.00004),
    mem('noise b', 0),
  ];
  const out = rankMemories(results);
  assert.equal(out.length, 1);
  assert.equal(out[0].text, 'pricing is the blocker');
});

test('rankMemories keeps a weak-but-real hit when it is the best available', () => {
  // "What are this customer's biggest concerns?" only reaches ~0.00008, but it
  // is still a genuine deal question and must not come back with zero memories.
  const results = [
    mem('objections are pricing and deployment', 0.00008),
    mem('related colouring', 0.00005),
    mem('noise', 0.00004),
  ];
  const out = rankMemories(results);
  assert.ok(out.some((r) => r.text === 'objections are pricing and deployment'));
  assert.ok(!out.some((r) => r.text === 'noise'), 'pure noise must never reach the model');
  assert.ok(MIN_RELEVANCE_SCORE > 0.00004, 'noise gate must sit above measured noise');
});

test('rankMemories returns nothing when nothing is relevant', () => {
  // This is the "what did we order for lunch" case: every row scores ~0.
  const results = Array.from({ length: 40 }, (_, i) => mem(`filler fact ${i}`, 0));
  assert.deepEqual(rankMemories(results), []);
});

test('rankMemories collapses duplicated facts and sorts best-first', () => {
  const results = [
    mem('Sarah Mitchell is the CTO', 0.98),
    mem('Sarah  mitchell is the cto', 1.0), // same fact, different casing/punctuation
    mem('Pricing is unresolved', 0.5),
    mem('Sarah Mitchell is the CTO', 0.99),
  ];
  const out = rankMemories(results, { minScore: 0.1 });
  assert.equal(out.length, 2);
  assert.equal(out[0].text, 'Sarah  mitchell is the cto');
  assert.equal(out[1].text, 'Pricing is unresolved');
});

test('rankMemories respects the limit', () => {
  const results = Array.from({ length: 30 }, (_, i) => mem(`unique fact ${i}`, 1 - i / 100));
  assert.equal(rankMemories(results, { limit: 5 }).length, 5);
});

test('rankMemories tolerates missing score fields', () => {
  assert.deepEqual(rankMemories([{ text: 'no scores here' }]), []);
  assert.equal(rankMemories(undefined).length, 0);
});

/* -------------------------------------------- interaction memory content */

test('buildInteractionContent keeps the deal header only on the first note', () => {
  const deal = {
    company: 'Acme', title: 'Platform', plan: 'Enterprise', value: 75000,
    stage: 'Discovery', contactName: 'Sarah', contactRole: 'CTO'
  };
  const first = buildInteractionContent(deal, { seq: 1, date: '2026-09-03', type: 'Call', participants: ['Sarah'], notes: 'They like it.' });
  const second = buildInteractionContent(deal, { seq: 2, date: '2026-09-09', type: 'Call', participants: [], notes: 'Pricing concern.' });

  assert.ok(first.includes('Deal: Acme — Platform'));
  assert.ok(first.includes('Primary contact: Sarah, CTO'));
  assert.ok(first.includes('Interaction #1 on 2026-09-03 (Call) with Sarah'));
  assert.ok(first.includes('They like it.'));

  assert.ok(!second.includes('Deal: Acme'), 'header must not repeat on later notes');
  assert.ok(!second.includes('Primary contact'));
  assert.ok(second.includes('Interaction #2 on 2026-09-09 (Call)'));
  assert.ok(second.includes('Pricing concern.'));
});

/* ------------------------------------------------------------------- llm */

test('extractJson parses fenced JSON', () => {
  assert.deepEqual(extractJson('```json\n{"a":1}\n```'), { a: 1 });
});

test('extractJson finds JSON buried in prose', () => {
  assert.deepEqual(extractJson('Sure! Here you go:\n{"answer":"hi"}\nHope that helps.'), { answer: 'hi' });
});

test('extractJson returns null on garbage', () => {
  assert.equal(extractJson('no json here'), null);
  assert.equal(extractJson('{broken'), null);
  assert.equal(extractJson(''), null);
});

/* ------------------------------------------------------------ extractor */

const baseDeal = () => ({
  company: 'Acme Technologies',
  industry: 'Manufacturing',
  contactName: 'Sarah Mitchell',
  contactRole: 'CTO',
  title: 'Enterprise Software Platform',
  plan: 'Enterprise',
  value: 75000,
  stage: 'Discovery',
  health: 'healthy',
  requirements: [],
  objections: [],
  stakeholders: [],
  competitors: [],
  commitments: [],
  nextSteps: [],
  risks: []
});

const extraction = (over = {}) => sanitize({
  summary: 'Pricing raised again',
  facts: ['Acme uses on-prem today'],
  requirements: ['API integration', 'API integration'],
  objections: [{ subject: 'Pricing', detail: 'Budget cap of 50k', status: 'unresolved', stakeholder: 'CFO' }],
  stakeholders: [{ name: 'Sarah Mitchell', role: 'CTO' }, { name: '', role: 'Ignore me' }],
  competitors: ['CloudCore'],
  commitments: ['Send security doc'],
  outcomes: [],
  nextSteps: [{ text: 'Send pricing options', due: '2026-10-05' }],
  positiveSignals: ['Budget mentioned'],
  riskFlags: ['Procurement stall'],
  ...over
});

test('sanitize coerces every field to a safe shape', () => {
  const ex = sanitize({ objections: [{ status: 'weird' }], stakeholders: [{ name: null }], nextSteps: ['do it'] });
  assert.deepEqual(ex.requirements, []);
  assert.equal(ex.objections[0].status, 'unresolved');
  assert.equal(ex.objections[0].subject, 'other');
  assert.deepEqual(ex.stakeholders, []);
  assert.equal(ex.nextSteps[0].text, 'do it');
  assert.equal(ex.newInformation, true);
});

test('applyExtraction dedupes repeated requirements', () => {
  const deal = baseDeal();
  applyExtraction(deal, extraction(), { seq: 1, date: new Date() });
  applyExtraction(deal, extraction(), { seq: 2, date: new Date() });
  assert.equal(deal.requirements.filter((r) => r === 'API integration').length, 1);
  assert.equal(deal.competitors.length, 1);
  assert.equal(deal.commitments.length, 1);
});

test('applyExtraction resolves an objection when the model says so', () => {
  const deal = baseDeal();
  const note = { seq: 1, date: new Date('2026-01-01') };
  applyExtraction(deal, extraction(), note);
  assert.equal(deal.objections[0].status, 'unresolved');

  const followUp = extraction({ objections: [{ subject: 'pricing', detail: 'Agreed at 60k', status: 'resolved', stakeholder: 'CFO' }] });
  applyExtraction(deal, followUp, { seq: 2, date: new Date('2026-01-08') });
  assert.equal(deal.objections.length, 1);
  assert.equal(deal.objections[0].status, 'resolved');
});

test('applyExtraction returns human-readable change descriptions', () => {
  const changes = applyExtraction(baseDeal(), extraction(), { seq: 1, date: new Date() });
  assert.ok(changes.some((c) => c.startsWith('Requirement added:')));
  assert.ok(changes.some((c) => c.startsWith('Objection recorded:')));
  assert.ok(changes.some((c) => c.startsWith('Stakeholder added:')));
  assert.ok(changes.some((c) => c.startsWith('Competitor noted:')));
  assert.ok(changes.some((c) => c.startsWith('Risk flagged:')));
});

test('computeHealth escalates with objections, competitors and high risks', () => {
  const deal = baseDeal();
  assert.equal(computeHealth(deal), 'healthy');

  deal.competitors = ['CloudCore'];
  assert.equal(computeHealth(deal), 'attention');

  deal.objections = [{ status: 'unresolved' }];
  assert.equal(computeHealth(deal), 'attention');

  deal.objections = [{ status: 'unresolved' }, { status: 'unresolved' }];
  assert.equal(computeHealth(deal), 'risk');

  deal.objections = [{ status: 'resolved' }];
  deal.risks = [{ text: 'stall', level: 'high' }];
  assert.equal(computeHealth(deal), 'risk');
});

/* ----------------------------------------------------------------- agent */

test('detectMode maps question wording to the right mode', () => {
  assert.equal(detectMode('Give me a complete briefing for my next meeting'), 'brief');
  assert.equal(detectMode('What happened in our previous meetings?'), 'history');
  assert.equal(detectMode("What are this customer's biggest concerns?"), 'objections');
  assert.equal(detectMode('Draft a follow-up email'), 'followup');
  assert.equal(detectMode('Is this deal at risk?'), 'risk');
  assert.equal(detectMode('How should I prepare for my next meeting?'), 'strategy');
  assert.equal(detectMode('tell me something random'), 'chat');
  assert.equal(detectMode(''), 'chat');
});

test('every agent mode maps to prompt instructions', () => {
  const targets = new Set(Object.values(MODES));
  assert.ok(targets.size >= 6, 'expected several distinct agent modes');
  for (const target of targets) {
    assert.ok(MODE_INSTRUCTIONS[target], `missing instructions for "${target}"`);
    assert.ok(MODE_INSTRUCTIONS[target].length > 20, `thin instructions for "${target}"`);
  }
  // Nothing orphaned on the other side either.
  for (const key of Object.keys(MODE_INSTRUCTIONS)) {
    assert.ok(targets.has(key), `MODE_INSTRUCTIONS.${key} is never reachable from MODES`);
  }
});

test('isSmalltalk catches greetings but never a real question', () => {
  for (const q of ['hi', 'Hey!', 'thanks', 'ok', 'bye', 'tell me a joke', 'who are you', 'how are you?']) {
    assert.equal(isSmalltalk(q), true, `expected smalltalk: ${q}`);
  }
  for (const q of [
    'hello, what is the pricing status?',
    'How should I prepare for my next meeting?',
    'thanks for the update — what did procurement say?',
    'who is the CTO',
    'Is this deal at risk?',
  ]) {
    assert.equal(isSmalltalk(q), false, `expected a real question: ${q}`);
  }
  // Very long input is never smalltalk.
  assert.equal(isSmalltalk('hi '.repeat(60)), false);
  assert.equal(isSmalltalk(''), false);
});

test('detectMode routes greetings to smalltalk instead of a deal mode', () => {
  assert.equal(detectMode('hi'), 'smalltalk');
  assert.equal(detectMode('thanks!'), 'smalltalk');
  assert.equal(detectMode('what is DealMind?'), 'smalltalk');
  assert.equal(detectMode('what is the pricing status?'), 'chat');
});

/* ------------------------------------------------------------ serialisers */

test('serializeDeal exposes a string id and never leaks _id', () => {
  const s = serializeDeal({ ...baseDeal(), _id: '507f1f77bcf86cd799439011', bankId: 'dealmind-x', createdAt: 1, updatedAt: 2 });
  assert.equal(s.id, '507f1f77bcf86cd799439011');
  assert.equal(s._id, undefined);
  assert.equal(s.bankId, 'dealmind-x');
  assert.deepEqual(s.openObjections, []);
});

test('buildTimeline sorts chronologically and falls back to the raw notes', () => {
  const tl = buildTimeline([
    { seq: 2, date: new Date('2026-02-01'), type: 'Call', notes: 'second', extraction: { summary: 'Second meeting' } },
    { seq: 1, date: new Date('2026-01-01'), type: 'Email', notes: 'first'.repeat(60) }
  ]);
  assert.equal(tl.length, 2);
  assert.equal(tl[0].seq, 1);
  assert.equal(tl[1].summary, 'Second meeting');
  assert.ok(tl[0].summary.length <= 181);
});

test('serializeInteraction reports memory status', () => {
  const s = serializeInteraction({ _id: 'a', dealId: 'b', seq: 3, date: new Date(), type: 'Call', notes: 'n', memoryStored: true });
  assert.equal(s.id, 'a');
  assert.equal(s.memoryStored, true);
  assert.equal(s.memoryError, '');
  assert.equal(s.extraction, null);
});

/* ----------------------------------------------------------------- runner */

let passed = 0;
const failures = [];
for (const { name, fn } of tests) {
  try {
    await fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failures.push({ name, e });
    console.log(`  ✗ ${name}`);
    console.log(`      ${e.message}`);
  }
}

console.log(`\n${passed}/${tests.length} passed`);
if (failures.length) {
  process.exitCode = 1;
} else {
  console.log('All tests green.');
}
