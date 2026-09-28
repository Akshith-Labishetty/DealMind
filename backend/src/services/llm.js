import { config } from '../config.js';

export class LlmError extends Error {
  constructor(message, code = 'llm_error', status = null) {
    super(message);
    this.name = 'LlmError';
    this.code = code;
    this.expose = true;
    // Optional HTTP status for the API error handler (429, 502, 504, 503...).
    this.status = status;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Base backoff per retry attempt, capped by a total sleep budget. */
const RETRY_DELAYS_MS = [1500, 4000];
const MAX_ATTEMPTS = 3;
const TOTAL_SLEEP_BUDGET_MS = 12000;

/**
 * Minimal Groq (OpenAI-compatible) chat client with timeouts, retries and
 * tolerant JSON parsing. Never throws raw stack traces upstream.
 *
 * Rate limits are the common failure on the free Groq tier, so a 429 now
 * backs off and retries instead of failing the request immediately.
 */
export async function chat(messages, options = {}) {
  const { temperature = 0.35, maxTokens = null } = options;
  if (!config.llm.apiKey) {
    throw new LlmError('LLM is not configured (GROQ_API_KEY missing).', 'llm_not_configured', 503);
  }

  const payload = {
    model: config.llm.model,
    messages,
    temperature
  };
  if (maxTokens) payload.max_completion_tokens = maxTokens;

  let lastError = null;
  let droppedMaxTokens = false;
  let sleepBudget = TOTAL_SLEEP_BUDGET_MS;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    // Back off before every retry, unless the sleep budget is spent — in that
    // case we stop and surface the last error rather than hang the request.
    if (attempt > 1) {
      const base = RETRY_DELAYS_MS[attempt - 2] ?? 2000;
      const delay = Math.min(base, sleepBudget);
      if (delay <= 0) break;
      sleepBudget -= delay;
      await sleep(delay);
    }

    try {
      const res = await fetch(`${config.llm.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.llm.apiKey}`
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(config.llm.timeoutMs)
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');

        // Some models reject max_completion_tokens; retry once without it
        // (this does not consume a real attempt).
        if (res.status === 400 && payload.max_completion_tokens && !droppedMaxTokens) {
          delete payload.max_completion_tokens;
          droppedMaxTokens = true;
          attempt -= 1;
          continue;
        }

        if (res.status === 401) {
          throw new LlmError('LLM rejected the API key.', 'llm_auth', 401);
        }
        if (res.status === 429) {
          lastError = new LlmError(
            'The AI service is rate-limiting requests. Please wait a few seconds and try again.',
            'llm_rate_limited',
            429
          );
          continue;
        }
        lastError = new LlmError(
          `LLM request failed (${res.status}): ${text.slice(0, 200)}`,
          'llm_http',
          res.status >= 500 ? 502 : 400
        );
        continue;
      }

      const data = await res.json();
      const message = data?.choices?.[0]?.message;
      const content = message?.content ?? message?.reasoning ?? '';
      if (!content || !String(content).trim()) {
        lastError = new LlmError('LLM returned an empty response.', 'llm_empty', 502);
        continue;
      }
      return String(content);
    } catch (e) {
      if (e instanceof LlmError && e.code === 'llm_auth') throw e;
      if (e.name === 'TimeoutError' || e.name === 'AbortError') {
        lastError = new LlmError('The AI request timed out. Please try again.', 'llm_timeout', 504);
      } else if (e instanceof LlmError) {
        lastError = e;
      } else {
        lastError = new LlmError(`Could not reach the AI service: ${e.message}`, 'llm_unreachable', 502);
      }
    }
  }

  throw lastError || new LlmError('AI request failed.', 'llm_error', 502);
}

export function extractJson(text) {
  const cleaned = String(text)
    .replace(/^\s*```(?:json)?/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.search(/[{[]/);
    if (start === -1) return null;
    const open = cleaned[start];
    const close = open === '{' ? '}' : ']';
    const end = cleaned.lastIndexOf(close);
    if (end <= start) return null;
    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

/**
 * Ask the model for strict JSON. Retries once with a corrective instruction
 * when the model wraps the answer in prose or emits malformed JSON.
 */
export async function chatJSON(messages, options = {}) {
  let raw = await chat(messages, options);
  let parsed = extractJson(raw);
  if (parsed && typeof parsed === 'object') return parsed;

  const corrective = {
    role: 'user',
    content:
      'Your previous reply was not valid JSON. Reply again with ONLY a valid JSON object matching the requested schema. No prose, no code fences.'
  };
  raw = await chat([...messages, { role: 'assistant', content: raw }, corrective], options);
  parsed = extractJson(raw);
  if (parsed && typeof parsed === 'object') return parsed;

  throw new LlmError('The AI returned a malformed response. Please try again.', 'llm_malformed', 502);
}

export async function llmStatus() {
  if (!config.llm.apiKey) return { ok: false, message: 'GROQ_API_KEY missing' };
  try {
    const res = await fetch(`${config.llm.baseUrl}/models`, {
      headers: { Authorization: `Bearer ${config.llm.apiKey}` },
      signal: AbortSignal.timeout(10000)
    });
    if (!res.ok) return { ok: false, message: `LLM returned ${res.status}` };
    return { ok: true, message: `ready (${config.llm.model})`, model: config.llm.model };
  } catch (e) {
    return { ok: false, message: e.message };
  }
}
