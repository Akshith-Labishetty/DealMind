# Working.md — How this project (DealMind) works

> A complete, file-by-file explanation of what is in this folder and how every piece connects.
> Written by reading the actual source, not the README (the README has drifted in a few places — see [§14](#14-changes-made-in-this-pass-bugs-fixed)).

---

## 1. One-paragraph summary

This is **DealMind**, a hackathon project: an AI sales-deal assistant that gives every sales deal a *persistent memory*. It is a two-part app — a **React/Vite frontend** (`frontend/`) and a **Node/Express backend** (`backend/`). When a salesperson logs a meeting note, the backend does three things at once: (1) saves the raw note to **MongoDB**, (2) asks a **Groq LLM** to extract structured facts (objections, stakeholders, requirements, risks) and merges them into the deal document, and (3) pushes the raw note into **Hindsight** (Vectorize.io's hosted memory service), which builds its own fact/entity graph. When you later ask the agent a question, it **recalls** relevant memories from Hindsight, feeds `deal state + memories + question` to the LLM, and returns a markdown answer plus a list of *exactly which memories shaped the answer*.

---

## 2. Folder map

```
hackwith/
├── .env                    ← REAL secrets (HINDSIGHT_API_KEY, GROQ_API_KEY). Git-ignore material.
├── .env.example            ← placeholder template (the real keys that were here are gone — rotate them)
├── README.md               ← project pitch, architecture diagram, acceptance test
├── working.md              ← this file
│
├── backend/                ← Express API, port 4000
│   ├── package.json        ← ESM ("type": "module"), scripts: start / dev / seed / test
│   ├── server.log          ← captured stdout from a previous run
│   ├── server.err.log      ← captured stderr
│   ├── tests/
│   │   └── run-tests.js    ← 20 unit tests (no network / no Mongo / no keys)
│   ├── scripts/
│   │   └── smoke-hindsight.mjs   ← standalone Hindsight connectivity test
│   └── src/
│       ├── index.js        ← app bootstrap: cors → bodyParser → request log → /api router → error handler
│       ├── config.js       ← loads root .env + backend/.env, normalizes keys, exports `config`
│       ├── db.js           ← mongoose connect + live `dbStatus()`
│       ├── models/         ← Deal, Interaction, Activity (mongoose schemas)
│       ├── services/       ← all the interesting logic lives here
│       │   ├── llm.js      ← Groq chat client (retry, timeout, tolerant JSON parsing)
│       │   ├── hindsight.js← retain / recall / list / ensureBank / status wrappers
│       │   ├── extractor.js← note → structured facts, and merge facts into the deal
│       │   └── agent.js    ← the "agent loop": recall → prompt → LLM → cited answer
│       ├── routes/         ← HTTP layer (thin; calls into services)
│       │   ├── index.js    ← mounts everything + 503 guard when Mongo is down
│       │   ├── health.js   ← GET /api/health (db + llm + hindsight)
│       │   ├── deals.js    ← deal CRUD, dashboard, timeline
│       │   ├── interactions.js ← POST interaction (extract + retain), DELETE
│       │   ├── agent.js    ← POST /ask, GET /memories, POST /memories/search, GET /modes
│       │   └── demo.js     ← POST /demo/load, POST /demo/reset
│       ├── utils/
│       │   ├── http.js     ← ApiError, asyncHandler, requireString, isValidObjectId
│       │   └── serialize.js← mongoose doc → plain JSON, timeline builder, dashboard stats
│       └── seed/
│           ├── demoData.js ← Acme Technologies fixture + other deals
│           └── seed.js     ← `npm run seed` → wipes Mongo, seeds deals, retains to Hindsight
│
└── frontend/               ← React 19 + Vite + Tailwind, port 5173
    ├── vite.config.js      ← dev proxy: /api → http://localhost:4000
    ├── tailwind.config.js / postcss.config.js / index.html
    ├── frontend.log / frontend.err.log ← captured run logs
    └── src/
        ├── main.jsx        ← ReactDOM root + BrowserRouter
        ├── App.jsx         ← sidebar shell + route table
        ├── api.js          ← axios instance (baseURL '/api', 120s timeout) + errMsg helper
        ├── index.css       ← Tailwind directives + all custom component CSS
        ├── lib/markdown.js ← tiny hand-rolled markdown → HTML (escapes first)
        ├── pages/
        │   ├── Dashboard.jsx      ← stat cards + deals table
        │   ├── DealDetail.jsx     ← 7 tabs (overview/timeline/interactions/ai/memory/risks/next steps)
        │   ├── AddInteraction.jsx ← the note-entry form
        │   ├── DemoPage.jsx       ← "Load Acme Demo" button
        │   └── NotFound.jsx
        └── components/
            ├── AiAssistant.jsx   ← question box + preset modes + compare-with/without-memory
            ├── ChatWidget.jsx    ← floating 💬 chat (draggable header, enlarge/decrease controls)
            ├── ModeButtons.jsx   ← preset question buttons + "Use Hindsight memory" checkbox
            ├── MemoriesPanel.jsx ← "🧠 Memories used" chips
            ├── StatCard.jsx      ← dashboard KPI tile
            └── DemoBar.jsx       ← optional embeddable demo button (not mounted; App routes to /demo)
```

---

## 3. Tech stack & external services

| Layer | Tech | Notes |
|---|---|---|
| Frontend | React 19, React Router 7, Vite, Tailwind 3, axios | dev server on **:5173**, proxies `/api` → :4000 |
| Backend | Node (ESM), Express 4, mongoose 8, body-parser, cors | dev server on **:4000** |
| Database | MongoDB `mongodb://127.0.0.1:27017/dealmind` | overridable via `MONGODB_URI` |
| Memory | **Hindsight Cloud** `https://api.hindsight.vectorize.io` | via `@vectorize-io/hindsight-client` |
| LLM | **Groq** `https://api.groq.com/openai/v1`, model `openai/gpt-oss-120b` | OpenAI-compatible, called with raw `fetch` |
| Auth | `Authorization: Bearer <hsk_…>` | keys live in `.env`, never sent to the browser |

Nothing here is mocked — every memory operation is a real HTTP call to Hindsight.

---

## 4. Configuration flow (`backend/src/config.js`)

1. Resolves project root as **two levels up** from `backend/src/`.
2. Loads `<root>/.env` (shared secrets), then `backend/.env` (overrides).
3. `normalizeHindsightKey()` strips a stray leading `y` from keys pasted as `yhsk_…` — the API only accepts `hsk_…`.
4. Exports:
   - `config.port` (default **4000**)
   - `config.mongoUri` (default local `dealmind` DB)
   - `config.llm` — `apiKey` (GROQ_API_KEY), `baseUrl`, `model`, `timeoutMs` (90s)
   - `config.hindsight` — `apiKey`, `baseUrl`, `timeoutMs` (120s)

Frontend config is separate: `vite.config.js` just proxies `/api` to `localhost:4000`, so the browser only ever talks to same-origin `/api`.

---

## 5. Backend startup (`backend/src/index.js`)

```
create app
 ├─ cors()                       (wide open — fine for a demo, not for prod)
 ├─ bodyParser.json/urlencoded   (1 MB limit)
 ├─ request logger               (only logs /api paths: method, path, status, ms)
 ├─ app.use('/api', apiRouter)
 └─ central error handler        (never leaks stack traces/secrets; logs full error server-side)

start()
 ├─ connectDB()  → if it fails, server STILL starts, data routes return 503
 └─ app.listen(config.port)
```

`routes/index.js` order matters:

1. `healthRouter` — always available (reports degraded status).
2. **DB guard middleware** — every other route returns `503 {code:'db_unavailable'}` if Mongo is disconnected.
3. `deals` → `interactions` → `agent` → `demo`.
4. 404 JSON fallback.

---

## 6. The data model (MongoDB)

**`Deal`** (`models/Deal.js`) — the structured application state:
- identity: `company, industry, contactName, contactRole, title, plan, value, stage, health, summary`
- **`bankId`** (unique) — the Hindsight memory bank for this deal, generated by `bankIdFor()` → `dealmind-<random>`
- arrays maintained by the extractor: `requirements[]`, `objections[{subject,detail,status,stakeholder,raisedAt,source}]`, `stakeholders[{name,role,notes}]`, `competitors[]`, `commitments[]`, `nextSteps[{text,due,done,source}]`, `risks[{text,level,source}]`
- `nextMeetingAt`, `lastInteractionAt`, timestamps

**`Interaction`** — one meeting/note:
- `dealId`, `seq` (1,2,3… per deal), `date`, `type`, `participants[]`, `notes`
- `extraction` — the structured blob returned by the LLM
- `memoryStored` / `memoryError` — whether the Hindsight retain succeeded
- `memoryIds[]` — reserved, currently unused

**`Activity`** — an append-only feed (`kind`: `deal | interaction | memory | agent | demo`) used for an audit trail of what the system did.

> Key design point: **two parallel representations of the same note.** MongoDB holds clean, queryable, structured state. Hindsight holds the raw narrative and its own derived facts/graph. The UI reads Mongo; the agent reads Hindsight (plus a Mongo digest).

---

## 7. The write path — logging an interaction

`POST /api/deals/:id/interactions` (`routes/interactions.js`) — this is the heart of the app:

```
1. VALIDATE      check ObjectId, notes (3–12000 chars), type, date, participants (max 12)
2. PERSIST       compute next `seq`, Interaction.create()  → raw note saved to Mongo
3. EXTRACT       extractInteraction(deal, interaction)     → LLM call (temp 0.1)
                 applyExtraction(deal, extraction, interaction)
                   • dedupe-merge requirements / competitors / commitments / stakeholders
                   • objections: new ones added, existing ones can flip to `resolved`
                   • nextSteps and risks appended
                   • recompute deal.health via computeHealth()
                 (failure is non-fatal → `extractionError`)
4. RETAIN        ensureBank(deal.bankId)
                 retainItems(bankId, [{content, context, timestamp, metadata, tags:[`deal:<id>`]}])
                 content = deal header + contact + "Interaction #N on <date> (type)" + raw notes
                 (failure is non-fatal → memoryError)
                 then a fire-and-forget recall after 1.2s to "warm" the index
5. SAVE & LOG    interaction.memoryStored, deal.save(), two Activity rows
6. RESPOND       { interaction, extraction, changes[], memory:{stored,error}, dealUpdated }
```

`computeHealth()` (`extractor.js`):
- `risk` if ≥2 open objections or any high-level risk
- `attention` if 1 open objection or any competitor present
- otherwise `healthy`

### `health` is a pure function of objections/competitors/risks — so it only changes when an extraction changes them.

---

## 8. The read path — asking the agent

`POST /api/deals/:id/ask` (`routes/agent.js` → `services/agent.js`):

```
body: { question, mode?, useMemory? }   (useMemory defaults true)

1. Load deal (lean) + all interactions sorted by date
2. MODE  = explicit `mode` if it's a known key, else detectMode(question) via regex
           brief | history | objections | followup | risk | strategy | chat
3. RECALL (only if useMemory)
     recall(bankId, question, { tags:[`deal:<id>`], budget:'high', maxTokens:4000 })
     → retry once after 1.8s if the index hasn't caught up
     → take top 14 results, number them M1…M14
4. BUILD PROMPT
     system: hard rules (ground every claim, cite [M1], never invent, no preamble)
             + if useMemory=false: "give generic role-generic advice only"
     user:   QUESTION + MODE_INSTRUCTIONS[mode] + DEAL CONTEXT (JSON digest of Mongo state)
             + RETRIEVED HINDSIGHT MEMORIES (each tagged [Mn] type/when/source)
             + "reply with ONLY { answer, memories_used:[{ref, why}] }"
5. LLM         chatJSON(..., {temperature:0.3})
6. RECONCILE   map each returned `ref` back to the real memory; drop unknown refs
7. LOG         Activity row: "Agent asked: … — N memory/memories used"
8. RESPOND     { answer, mode, usedMemory, generic, memoriesUsed[], memoriesRetrieved, memoryWarning }
```

The seven prompt templates in `MODE_INSTRUCTIONS` define the output shape for each mode (briefing sections, chronological history, objection analysis, strategy with talk tracks, follow-up email, risk assessment with evidence, general Q&A).

`GET /api/deals/:id/memories` lists everything Hindsight holds for the bank; `POST /api/deals/:id/memories/search` runs a live recall. Both are surfaced in the UI's "Memory" tab.

---

## 9. The service layer in detail

### `services/llm.js`
- `chat(messages, opts)` — POST `${LLM_BASE_URL}/chat/completions`, `AbortSignal.timeout(90s)`, **2 attempts**. Special handling: drops `max_completion_tokens` on a 400 (some models reject it), maps 401 → `llm_auth` (no retry) and 429 → `llm_rate_limited`, accepts `content` or `reasoning` from the response.
- `extractJson(text)` — strips ``` fences, tries `JSON.parse`, else grabs from the first `{`/`[` to the last matching close.
- `chatJSON(...)` — if parsing fails, appends a corrective "reply with ONLY valid JSON" turn and retries once; throws `llm_malformed` if still bad.
- `llmStatus()` — hits `/models` to report readiness for `/api/health`.
- All errors are `LlmError` with `expose = true`, so their message safely reaches the client.

### `services/hindsight.js`
Lazy singleton `HindsightClient`. Every function returns a **structured result** (`{ok, …}`) instead of throwing, so the app degrades instead of crashing:

| function | behaviour |
|---|---|
| `ensureBank(id)` | `createBank`; treats 409/"already exists" as success; maps 401 to a friendly message |
| `retainItems(id, items)` | tries `retainBatch`, falls back to per-item `retain` on shape errors (400/404/405/422); rethrows auth/network errors |
| `recall(id, q, opts)` | multi-strategy search; **retries once after 1.8s** when empty; 404 → empty list + warning |
| `listMemories(id, opts)` | limit/offset/type/q filters; 404 → empty |
| `hindsightStatus()` | cached `GET /version` probe (10s timeout), `refresh:true` to bypass cache |

`bankIdFor(dealId)` = `` `dealmind-${dealId}` `` — **one isolated memory bank per deal**, plus tag scoping `deal:<id>` on every retain/recall.

### `services/extractor.js`
- `EXTRACTION_SCHEMA` — the JSON contract the model must fill (summary, facts, requirements, objections, stakeholders, competitors, commitments, outcomes, nextSteps, positiveSignals, riskFlags, newInformation).
- `sanitize()` — defensive normalisation (arrays always arrays, objection subjects lowercased, statuses coerced).
- `applyExtraction()` — the merge/dedupe logic and `computeHealth()` described in §7.

### `services/agent.js`
- `MODES` / `detectMode()` / `MODE_INSTRUCTIONS` — mode plumbing.
- `dealDigest()` — compresses the Mongo deal + interaction timeline into the JSON block injected into the prompt.
- `formatMemories()` — renders memories as `[M1] type=… when=… source="…"` blocks.
- `askAgent()` — the loop in §8.

---

## 10. API reference

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | db + llm + hindsight status (503 if degraded) |
| GET | `/api/dashboard` | stats (active deals, attention, upcoming meetings, open objections) + recent items |
| GET | `/api/deals` | list deals |
| POST | `/api/deals` | create deal → generates `bankId`, calls `ensureBank` |
| GET | `/api/deals/:id` | deal + interactions + timeline |
| PATCH | `/api/deals/:id` | update stage/health/value/plan/title/summary/nextMeetingAt/industry |
| DELETE | `/api/deals/:id` | delete deal + its interactions + activities |
| GET | `/api/deals/:id/interactions` | list interactions |
| GET | `/api/deals/:id/timeline` | timeline entries |
| POST | `/api/deals/:id/interactions` | **the main write path** (§7) |
| DELETE | `/api/interactions/:id` | delete one interaction |
| GET | `/api/modes` | available agent modes + preset questions |
| POST | `/api/deals/:id/ask` | **the main read path** (§8) |
| GET | `/api/deals/:id/memories` | all Hindsight memories for the deal |
| POST | `/api/deals/:id/memories/search` | live recall demo |
| POST | `/api/demo/load` | wipe DB **and reset the memory banks** → create the Acme deal → **5 interactions**, each extracted + retained (idempotent, never duplicates memories) |
| POST | `/api/demo/reset` | wipe all deals/interactions/activities **and their memory banks** |

Error shape everywhere: `{ error: { message, code } }`.

---

## 11. Frontend walkthrough

**Routing** (`App.jsx`): sidebar with `Dashboard` and `Demo` links; routes `/`, `/deal/:id`, `/add/:id`, `/demo`, `*`.

**`Dashboard.jsx`** — fetches `/dashboard` (KPI tiles via `StatCard`) and `/deals` (table). Health badge colour: green/amber/red. Also mounts a `ChatWidget` bound to the most recent deal.

**`DealDetail.jsx`** — loads deal + interactions + timeline in parallel, then renders one of 7 tabs:
- **Overview** — summary, stakeholders, requirements, competitors
- **Timeline** — `buildTimeline()` output with the extraction summary
- **Interactions** — raw notes with a `Hindsight ✓ / pending` badge per note
- **AI Assistant** → `AiAssistant`
- **Memory** — search box → `POST /memories/search`, results shown as cards
- **Risks** — health badge + risk cards
- **Next Steps** — checklist

**`AiAssistant.jsx`** — `ModeButtons` (6 preset questions + editable textarea + "Use Hindsight memory" checkbox + **Run** + **⚖ Compare w/ & w/o memory**). Compare fires two `/ask` calls in parallel (`useMemory: true` and `false`) and renders them side by side — this is the demo's "before vs after memory" proof. Answer is rendered through `mdToHtml` into `dangerouslySetInnerHTML`.

**`ChatWidget.jsx`** — floating 💬 chat assistant with draggable top header (drag left/right across screen), one-click Enlarge/Decrease toggle, `−`/`+` step zoom controls, and a corner resize handle; same `/ask` endpoint; Enter-to-send; shows `MemoriesPanel`.

**`AddInteraction.jsx`** — form (date, type, participants, notes) posted as **`application/x-www-form-urlencoded`** (that's why the backend mounts `bodyParser.urlencoded`) → then `navigate('/deal/:id')`.

**`DemoPage.jsx`** — button → `POST /demo/load` → shows the created deal, interaction count and any warnings → link to the deal.

**`lib/markdown.js`** — deliberately tiny: HTML-escapes input first (so LLM output can't inject markup), then handles `#/##/###` headings, `-`/`*` lists, `**bold**`, paragraphs. This is why `dangerouslySetInnerHTML` is safe-ish here.

**`index.css`** — Tailwind layers plus hand-written `.shell`, `.sidebar`, `.card`, `.badge`, `.memory-chip`, `.timeline-item`, `.chat-bubble`, `.btn*` classes that the JSX actually uses.

---

## 12. How to run it

```bash
# 0. Prereqs: Node 18+, a running MongoDB (local or MONGODB_URI), keys in .env

# 1. Backend  (terminal A)
cd backend
npm install
npm run dev            # node --watch src/index.js → http://localhost:4000

# 2. Frontend (terminal B)
cd frontend
npm install
npm run dev            # vite → http://localhost:5173 (proxies /api → :4000)

# Optional data
cd backend && npm run seed      # wipes Mongo, seeds Acme + other deals, retains to Hindsight

# Unit tests (fast, offline — no Mongo, no API keys)
cd backend && npm test          # 29 tests: validation, extraction, merge, health, modes, serialisers,
                                # recall ranking, memory-content building

# End-to-end acceptance (needs the server running; hits Mongo, Hindsight and Groq)
cd backend && npm run verify    # health, bank hygiene, relevance filtering, chat behaviour

# Optional connectivity check for the memory service
node backend/scripts/smoke-hindsight.mjs
```

Open **http://localhost:5173** → **Demo** → **Load Acme Demo** → open the deal → **AI Assistant** tab.

**Health check:** `GET http://localhost:4000/api/health` returns `{status:'ok'|'degraded', db, llm, hindsight}`.

**Expected acceptance flow** (from README): log 4 interactions (pricing concern, SOC 2, API integration…), ask "What should I discuss in my next meeting?", then add "Procurement has now made pricing the main blocker", ask again — the second answer must change, and the "Memories used" chips must show what was retrieved.

**Expected chat behaviour** (§15): typing `hi` gives a one-line greeting, *"what did we order for lunch"* honestly says it does not know, and a real deal question returns memories with `[M1]` citations.

---

## 13. Error-handling philosophy

Everywhere the pattern is the same: **fail soft, report structured, never leak.**

- **Mongo down** → server still boots; data routes short-circuit with `503 db_unavailable`; `/health` reports it.
- **Hindsight down / bad key** → `retain`/`recall` return `{ok:false, error}`; the interaction is still saved and `memoryStored:false` is shown in the UI as `pending`.
- **LLM down / rate-limited / malformed JSON** → `LlmError` with a human message; extraction is skipped but the note is kept; agent answers fall back to generic advice when `useMemory=false`.
- **Central error handler** in `index.js` only sends `err.expose ? err.message : "Something went wrong…"`; full errors are logged server-side only.

---

## 14. Changes made in this pass (bugs fixed)

Everything below was broken when the folder was handed over. All are fixed in the current source, and the pure-logic parts are now covered by tests (`backend/tests/run-tests.js`).

| # | Was | Now |
|---|---|---|
| 1 | `DealDetail.jsx` rendered `<Link>` without importing it → **ReferenceError as soon as a deal page opened** | `Link` imported; page also handles load errors and empty states |
| 2 | `AiAssistant.jsx` rendered `<ModeButtons>` without importing it → **AI Assistant tab crashed** | imported; also dropped the unused `useNavigate` |
| 3 | Frontend read `res.data.memories_used`, backend sent `memoriesUsed` → **"Memories used" panel was always empty** | frontend reads `memoriesUsed ?? memories_used`; backend returns **both** keys; panel now also shows the memory `text` and a "N of M retrieved" count |
| 4 | `detectMode()` regex was unparenthesised (`\bbrief\|briefing\|prepare\|…`) so *any* question containing "prepare" was classified **brief**, never strategy | regexes grouped with word boundaries, ordered brief → history → objections → followup → risk → strategy → chat |
| 5 | `npm test` pointed at `tests/run-tests.js`, which didn't exist | **29 unit tests written and passing** — validation, key normalisation, JSON extraction, sanitise/merge, `computeHealth`, mode detection, serialisers, recall ranking, memory-content building |
| 6 | Central error handler precedence bug: `err.status \|\| err.expose ? … : …` | explicit `Number(err.status)` fallback to `expose ? 400 : 500` |
| 7 | `.env.example` contained what looked like **live API keys** | replaced with placeholders + rotation links. **Rotate both keys anyway** — treat them as leaked |
| 8 | `DemoBar.jsx` called `useNavigate()` without importing it (dead code, but broken) | fixed and documented as an unmounted optional component |
| 9 | `AddInteraction.jsx` set `result` and immediately navigated → the extraction/memory result was never seen | stays on the page: memory status, extraction summary, objection list, `changes[]`, plus a link to the deal |
| 10 | `ChatWidget` nested a whole `ModeButtons` (with its own textarea) whose "Run" button read a *different* state variable → preset questions silently did nothing | `ModeButtons` gained `showInput` / `compact`; the widget now has exactly one input, and presets pass `(question, mode, useMemory)` through explicitly |
| 11 | `Dashboard` had no loading/error state, `useState` declared after use, and `recentDeals.interactionCount` was hardcoded `0` | loading + error banner, `Promise.allSettled` for the two fetches, real per-deal counts via one Mongo aggregation, new **Recent activity** feed, "N memories retained" badge |
| 12 | Compare "with / without memory" used `Promise.all` → one failure hid both answers | `Promise.allSettled`, each side rendered independently |
| 13 | No service-health visibility — a dead Mongo/LLM/Hindsight only showed up as a cryptic 503 | sidebar **StatusStrip** polls `/api/health` every 60s and shows `● DB / AI / Memory` |
| 14 | Memory tab had no way to list memories and no error/loading states | "List all" + "Search" + Enter-to-search, bank id shown, per-memory text/date/context, explicit empty state |
| 15 | `DemoPage` claimed a fixed interaction count and had no reset | count comes from the response; added **Reset database** with a confirm |
| 16 | `dashboardData()` exposed a misleading `recentInteractions: interactions.length` (always 6) and no interaction total | added `stats.interactionCount` and `memoriesRetained` |

### Still true / by design (not bugs, but worth knowing)

1. **No authentication** and `cors()` is wide open — anyone who can reach :4000 can read or wipe the data. Local demo only; add auth before deploying.
2. **Secrets live in the root `.env`** — never commit it. The example file is now placeholder-only, but the real keys that were in it should be rotated.
3. **Logs** (`backend/server.log`, `backend/server.err.log`, `frontend/frontend.log`, `frontend/frontend.err.log`) are leftover captured output and may contain request paths or error details — safe to delete.
4. **README drift**: it says the demo has 4 interactions (there are **5**), and describes a sidebar "Demo Bar" (it's the `/demo` page). Treat this file and the source as truth.
5. **Two representations of every note** are intentional: MongoDB for structured/queryable state, Hindsight for narrative/semantic recall. They can drift if a Hindsight retain fails — the UI shows `pending` on that interaction when it does.
6. **A second pass** was done after you reported the chatbot "giving random answers". Its root-cause analysis is in **§15** and the before/after measurements are in **§16**.

---

## 15. Why the chatbot gave "random answers" (root cause + fix)

The complaints were real. Measured against the live app before the fix:

| Symptom you saw | Root cause | Fix |
|---|---|---|
| Said "hi" → got a full deal **action plan** | The UI always sent an explicit `mode`, so `detectMode()` **never ran** — a greeting was forced into `strategy` mode, which recalled 14 memories and told the model to "ground every claim in them" | New `isSmalltalk()` gate (anchored regexes for greetings/thanks/jokes/meta). `detectMode` returns `smalltalk`; recall is **skipped** entirely and a dedicated short, human prompt is used. Free-text input now sends `mode: null` so the server decides |
| Asked "what did we order for lunch" → got pricing facts | Hindsight returns **every memory in the bank for any query**, relevant or not. Relevance was never checked | `rankMemories()` in `services/hindsight.js` scores with `scores.final` using `max(noiseGate, best × 0.25)`. Measured on this bank: real hits score **0.00008–0.49**, off-topic noise tops out at **0.00004** |
| Answers repetitive / same fact cited over and over | The bank held **207 memories with one sentence repeated 12×** — `demo/load` wiped Mongo but **never cleared Hindsight**, and the identical deal header was re-retained on every note | `resetBank()` (deleteBank → createBank) runs on demo load/reset and seed; `buildInteractionContent()` keeps the header **only on interaction #1**; `rankMemories()` also collapses near-duplicates |
| Model waffled or improvised on odd questions | Prompt said "ground every claim in the retrieved memories" even when nothing was relevant | Added: *"If the retrieved memories contain nothing relevant, say plainly that you do not have that information. Do not improvise or pad the answer."* and *"Answer the question that was actually asked."* |
| Empty answers / "random" failures under load | Groq free-tier **429s** threw immediately: 2 attempts, no backoff, returned as HTTP **400** | Exponential-ish backoff (1.5s → 4s, 12s budget), 3 attempts, correct status codes (429 / 502 / 503 / 504), friendlier message. Axios timeout raised to 180s |
| Memory tab showed no memory type | `listMemories` returns `fact_type`, `recall` returns `type` | Normalised in `listMemories()` so both shapes expose `type` and `date` |

**The core lesson:** retrieval quality is the whole product here. Feeding the model 40 unfiltered, 12×-duplicated memories and then ordering it to "ground every claim" guarantees confident nonsense. The prompt cannot fix bad input — the input had to be filtered first.

## 16. Verification (live, after these fixes)

Everything below was measured against the running app, not reasoned about.

**Memory bank hygiene**

| Metric | Before | After |
|---|---|---|
| Memories in `dealmind-acme-demo` | 207 | **28** |
| Distinct sentences | 195 of 207 | **28 of 28** (zero duplicates) |
| Worst single fact repeated | 12× | **1×** |
| Memory `type` field in Memory tab | all `unknown` | `world` / `observation` / `experience` |
| Demo reload warnings | n/a | none — 5/5 interactions retained |

**Chat behaviour**

| You type | Before | After |
|---|---|---|
| `hi` | `strategy` mode, **14 memories recalled, 6 cited**, answer = a 6-step pricing action plan | `smalltalk`, **0 memories**, *"Hi there! 👋 Let me know if you need help with meeting briefings, objection handling, deal strategy, follow-up emails, or risk analysis."* |
| `tell me a joke` | a joke invented around deal facts | `smalltalk`, **0 memories**, a normal joke + offer to help |
| `what did we order for lunch` | 40 pricing facts served as "context" | **0 memories**, *"I don't have any information about a lunch order in the deal memory."* |
| `What are this customer's biggest concerns?` | 0 memories retrieved | **2 retrieved, 2 cited**, pricing + budget grounded |
| `is the deal at risk` | 0 memories retrieved | **7 retrieved, 3 cited** |
| `who is the CTO` | 14 near-identical copies (3 top hits were the same sentence) | de-duplicated, **1 cited**: *"The CTO is **Sarah Mitchell**."* |

**Quality gates**

- `cd backend && npm test` → **29/29 passing** (offline unit tests)
- `cd backend && npm run verify` → **22/22 passing** (new end-to-end acceptance test: health, bank hygiene, relevance filtering, chat behaviour)
- `npm run build` (frontend) → clean, 112 modules
- `GET /api/health` → `db` ✓, `llm` ✓, `hindsight` ✓

**The core lesson:** retrieval quality is the whole product. Feeding the model 40 unfiltered, 12×-duplicated memories and then ordering it to *"ground every claim in the retrieved memories"* guarantees confident nonsense — the model obeys the instruction using junk input. The prompt could not fix this; the input had to be filtered first, and the greeting path had to stop being a retrieval query at all.

## 17. Quick mental model

```
           ┌─────────────── FRONTEND (:5173) ───────────────┐
           │  Dashboard   DealDetail   AddInteraction   Demo │
           │        ChatWidget / AiAssistant                 │
           └───────────────────┬─────────────────────────────┘
                               │ axios  /api  (Vite proxy)
           ┌───────────────────▼─────────────────────────────┐
           │              BACKEND (:4000)                    │
           │  routes/  →  services/  →  models/              │
           │                                                 │
           │  write:  note ─┬─► MongoDB (raw + extraction)   │
           │                └─► Hindsight.retain (semantic)  │
           │                                                 │
           │  read:   question ─► Hindsight.recall           │
           │                    ─► + Mongo deal digest       │
           │                    ─► Groq LLM                  │
           │                    ─► answer + cited memories   │
           └────────┬──────────────────────────┬─────────────┘
                    │                          │
              MongoDB                      Groq LLM
              Hindsight Cloud (api.hindsight.vectorize.io)
```

**The one idea to remember:** MongoDB answers *questions about structure* (what stage, how many open objections), Hindsight answers *questions about narrative* (what did the CTO actually say last time), and the agent is just `recall → prompt → LLM` with citations back to the memories it used.
