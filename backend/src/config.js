import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// config.js lives in backend/src -> the project root (which holds .env) is two levels up.
const rootDir = path.resolve(__dirname, '..', '..');

function loadEnv(file) {
  try {
    if (fs.existsSync(file)) dotenv.config({ path: file });
  } catch {
    /* ignore malformed env files */
  }
}

// Root .env holds the shared secrets (HINDSIGHT_API_KEY, GROQ_API_KEY).
loadEnv(path.join(rootDir, '.env'));
// backend/.env can override individual values.
loadEnv(path.join(__dirname, '..', '.env'));

/**
 * Hindsight Cloud keys use the `hsk_` prefix. Some copy/paste flows add a
 * stray leading character (e.g. "yhsk_..."), which the API rejects with
 * "Invalid API key format". Normalize so the documented key always works.
 */
export function normalizeHindsightKey(value = '') {
  const key = String(value || '').trim();
  if (key.startsWith('yhsk_')) return key.slice(1);
  return key;
}

export const config = {
  port: Number(process.env.PORT || 4000),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dealmind',
  llm: {
    apiKey: String(process.env.GROQ_API_KEY || '').trim(),
    baseUrl: (process.env.LLM_BASE_URL || 'https://api.groq.com/openai/v1').replace(/\/+$/, ''),
    model: process.env.LLM_MODEL || 'openai/gpt-oss-120b',
    timeoutMs: Number(process.env.LLM_TIMEOUT_MS || 90000)
  },
  hindsight: {
    apiKey: normalizeHindsightKey(process.env.HINDSIGHT_API_KEY),
    baseUrl: (process.env.HINDSIGHT_URL || 'https://api.hindsight.vectorize.io').replace(/\/+$/, ''),
    timeoutMs: Number(process.env.HINDSIGHT_TIMEOUT_MS || 120000)
  }
};

export const ROOT_DIR = rootDir;
