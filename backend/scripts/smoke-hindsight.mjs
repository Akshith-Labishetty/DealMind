import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.loadEnvFile?.(path.resolve(__dirname, '..', '..', '.env'));

const BASE = (process.env.HINDSIGHT_URL || 'https://api.hindsight.vectorize.io').replace(/\/$/, '');
let KEY = (process.env.HINDSIGHT_API_KEY || '').trim();
if (KEY.startsWith('yhsk_')) KEY = KEY.slice(1); // cloud keys use the hsk_ prefix

const { HindsightClient } = await import('@vectorize-io/hindsight-client');
const client = new HindsightClient({ baseUrl: BASE, apiKey: KEY });
const BANK = 'dealmind-smoke';

console.log('version:', JSON.stringify(await client.getVersion()));

const retain = await client.retain(BANK, 'Acme Technologies is evaluating the Enterprise plan worth $75,000. Sarah Mitchell, CTO, raised a pricing concern during the commercial discussion. Competitor CloudCore was mentioned.', {
  context: 'sales meeting notes',
  metadata: { source: 'smoke-test' }
});
console.log('RETAIN OK:', JSON.stringify(retain).slice(0, 500));

const recall = await client.recall(BANK, 'What is the pricing objection?');
console.log('RECALL OK, results:', recall.results?.length);
for (const r of recall.results || []) console.log('  -', r.type, '|', (r.text || '').slice(0, 140));

const listed = await client.listMemories(BANK, { limit: 10 });
console.log('LIST OK:', JSON.stringify(listed).slice(0, 300));
