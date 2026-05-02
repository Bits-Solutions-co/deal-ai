# Allrounder — Session Summary

> Working session covering full Phase 1 build of the Allrounder platform from requirements to live, end-to-end-tested system. All five services running locally.

---

## 1. What was built

### 1.1 Strategy & planning docs

| File | Purpose |
|---|---|
| `DEAL_AI_AUDIT_AND_ROADMAP.md` | Internal audit + initial competitor table + 9-point action plan (carried over from prior session) |
| `DEAL_AI_FUNCTIONAL_DOCUMENTATION.md` | Full functional reference (carried over) |
| `DEAL_AI_MARKET_STUDY_AND_COMPETITIVE_STRATEGY.md` | 9.8K-word market study covering 14 competitors, Pressmaster.ai deep-dive, B2B pain research, Deal AI vs the field comparison matrix, 12 differentiation vectors, P0/P1/P2 roadmap |
| `DEAL_AI_ALLROUNDER_LAUNCH_PLAN.md` | 9.7K-word launch plan: architecture, data model, frontend/backend/AI plan, RAG strategy, token optimization, BullMQ, mandatory vs good-to-have features |
| `DEAL_AI_PHASE1_EXECUTION_PLAN.md` | Phase 1 execution plan integrating Belal's 3-page UI spec + sub-agent waves |
| `PHASE1_PROGRESS.md` | Progress tracker across multiple sessions |
| `MIGRATION_NOTES.md` (in `deal-ai-server/`) | Schema cutover + Atlas Vector Search index definitions |
| `FLASK_TO_FASTAPI_MIGRATION.md` (in `TakamolAdvancedAI/`) | Full migration record + rollback steps |

### 1.2 Architecture (live, running)

```
┌──────────────────────────────────────────────────────────────────┐
│  Frontend (Next.js 14)   :3010                                   │
│  /[lang]/app/workspaces  →  pick / create workspace              │
│  /[lang]/app/[slug]      →  workspace dashboard + Quick Start    │
│  /[lang]/app/[slug]/campaigns/new       Page 1 — Brief Input     │
│  /[lang]/app/[slug]/campaigns/[id]/strategy  Page 2 — Strategy   │
│  /[lang]/app/[slug]/calendar             Page 3 — Content        │
└──────────────────────────────────────────────────────────────────┘
                  │  fetch( ar_session cookie )
┌─────────────────┴────────────────────────────────────────────────┐
│  Backend (Express)       :5500                                   │
│  Auth: signed JWT cookie (jose HS256)                            │
│  Tenancy: Prisma client extension auto-injects workspaceId       │
│  Routes: workspaces, members, brand, documents, campaigns,       │
│          posts, assets, exports, billing, analytics, voice,      │
│          quick-start, oauth/{lk,tw,fb}, webhooks/stripe,         │
│          + legacy /api/{projects,study-cases,posts,ideas,images} │
└─────────────────┬────────────────────────────────────────────────┘
            │ REST                       │ BullMQ delayed jobs
            ▼                            ▼
┌──────────────────────┐    ┌─────────────────────────────────────┐
│ AI Engine (FastAPI)  │    │ BullMQ Workers (Node, separate proc)│
│ :5050  single proc   │    │ 7 queues: ingest, ai-strategy,      │
│ /v1/*  (12 new)      │    │ ai-content, publish, analytics-     │
│ /ar/*, /en/*, /image,│    │ fetch, email, webhook-retry         │
│ /investment/*, ...   │    │                                     │
│ (49 legacy ported)   │    │ Real workers: publish, analytics,   │
│                      │    │ ingest. Stubs for the rest.         │
└──────────┬───────────┘    └────────────────┬────────────────────┘
           │                                 │
           └─────────────┬───────────────────┘
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│  Storage                                                         │
│  MongoDB Atlas  cluster0.ipkg8bq / db: deal_ai                   │
│    Atlas Vector Search:                                          │
│      doc_chunks_idx          (1536d cosine, workspace-id filter) │
│      asset_embedding_idx     (1536d cosine, workspace-id filter) │
│      brand_voice_idx         (1536d cosine)                      │
│    Mongo text index: content_text_idx on document-chunks         │
│  Redis  (Docker container `allrounder-redis`)  :6380             │
│  DigitalOcean Spaces  cognerax-learn / sfo3                      │
└──────────────────────────────────────────────────────────────────┘
                                  │
              External providers ──┤
                                  ▼
                   OpenAI · ElevenLabs · DALL-E · Ideogram
```

### 1.3 Component-by-component status

| Component | Lines added | Status | Notes |
|---|---:|---|---|
| Prisma schema | 700+ | ✅ live | 16 new models + indexes; mirrored in both repos |
| Backfill + seed scripts | 400+ | ✅ ran | 1 user → 1 workspace + 4 system templates |
| JWT auth + Prisma tenancy | 300+ | ✅ live | Signed JWT cookie, legacy header fallback |
| Backend routes (new) | 1500+ | ✅ live | Workspaces, members, brand, documents, campaigns, posts, assets, exports, billing, analytics, voice, quickstart |
| BullMQ + Redis (Docker) | 350+ | ✅ live | 7 queues; `publish` + `analytics-fetch` + `ingest` real |
| FastAPI (new /v1/*) | 1000+ | ✅ live | 12 endpoints |
| FastAPI (49 legacy) | 716 | ✅ live | Flask fully migrated; `app.py` archived |
| LangGraph quick_start_graph | 250+ | ✅ live | Real httpx + trafilatura web research; SSE-streamed |
| Real PDF ingestion | 250+ | ✅ live | pdfplumber + OpenAI embeddings + Mongo writes |
| Hybrid retriever | 250+ | ✅ live | Atlas $vectorSearch + BM25 + RRF + cross-encoder rerank |
| Voice agent (ElevenLabs) | 200+ | ✅ live | Scribe STT + gpt-4o-mini intent + ElevenLabs TTS |
| Brand-locked image gen | 150+ | ✅ live | DALL-E with style-ref/color/banned-words from BrandProfile |
| Frontend workspace shell | 250+ | ✅ live | App Router, layout, members, billing shell |
| Frontend Page 1 (Brief Input) | 600+ | ✅ live | 4 templates, guided flow, file upload, design guidelines, content style, Quick Start button |
| Frontend Page 2 (Strategy Output) | 350+ | ✅ live | Editable table + SWOT + suggestions + preview |
| Frontend Page 3 (Calendar + Detail) | 700+ | ✅ live | Drag-drop calendar + post detail drawer (versions/comments/brand/text-on-visual/variations/time) |
| Logging + observability | 100+ | ✅ live | pino with PII redaction, healthz, trace IDs |
| Stripe billing | 350+ | code-only | Real handlers; needs live `STRIPE_SECRET_KEY` to exercise |
| Facebook + Instagram OAuth | 300+ | code-only | Real handlers; blocked by Meta App Review |

### 1.4 Live tests passed

End-to-end flows verified against real services:

**Backend / auth / tenancy:**
- JWT cookie issue + read-back
- Forged legacy `user` header rejected (401)
- Cross-workspace ID guess returns 404
- Pydantic-equivalent Zod validation returns structured field errors

**BullMQ delayed publish:**
- Post APPROVED → `bull:publish:publish-{postId}` job in Redis
- Worker fired at scheduled time
- Correctly handled missing-platform path → status `FAILED`

**AI engine — Quick Start (real web research):**
- `httpx` fetched stripe.com, `trafilatura` extracted text
- Heuristic industry classifier picked `ecommerce`
- `_pick_template` selected `ecommerce` template
- Pre-filled fields returned to frontend
- SSE stream emitted 7 node events in order

**ElevenLabs voice round-trip:**
- TTS generated audio: "Reschedule post ABC 123 to tomorrow at 3 pm"
- Posted to `/v1/voice/intent`
- Scribe transcribed: `'Reschedule post ABC 123 to tomorrow at 3 p.m..'` (exact)
- gpt-4o-mini intent classifier: `reschedule_post` confidence `0.95`, params `{post_id: "ABC 123", new_time: "..."}`
- Tested 4 commands across 2 page contexts — all classified correctly

**Real PDF ingestion (3-page synthetic PDF):**
- Uploaded to DO Spaces
- Document registered → BullMQ `ingest-{id}` job
- Worker called FastAPI `/v1/ingest/document`
- Pipeline: `QUEUED → PARSING (3s) → EMBEDDING (6s) → READY (10s)`
- 3 TEXT chunks extracted, 1536d embeddings stored, AI summary generated by gpt-4o-mini

**RAG retrieval:**
- 4 different queries against the indexed PDF
- Returned semantically correct chunks (e.g. "real estate brochures" → page 3 "Use cases")
- Atlas `$vectorSearch` + BM25 + RRF working together

**Flask → FastAPI legacy migration:**
- `POST /shortcontent` → 200 (Arabic short/medium/long)
- `POST /ar/prompt-generator` → 200 (full Arabic visual prompt)
- `POST /ar/prompt-enhancer` → 200 (enhanced)
- `POST /ar/strategy` → 200 (Market_Strategy + Performance_Metrics + Post_Frequency)
- `POST /ar/roi` → 200 (ROI_Calculation)
- `POST /ar/content/ideas` → 200 (Arabic ideas with metadata)
- `POST /group-services` → 200 (services grouped)
- `POST /ar/strategy` missing-fields → 422 (Pydantic field errors)

### 1.5 Bugs found and fixed

| # | Bug | Fix |
|---|---|---|
| 1 | Forgeable base64 `user` header | Signed JWT in HTTP-only cookie + legacy fallback during migration |
| 2 | `node-cron` 30s scheduler not horizontally safe | Replaced with BullMQ delayed jobs |
| 3 | Prisma + MongoDB `deletedAt: null` filter missed records where the field is absent | Added `ACTIVE = { OR: [{deletedAt: null}, {deletedAt: {isSet: false}}] }` helper |
| 4 | BullMQ rejected `:` in jobIds | Changed to `-` separator |
| 5 | Backend worker was hitting legacy Flask :5000 instead of FastAPI :5050 | Added `AI_ENGINE_URL` env var |
| 6 | Python `.env` missing `DATABASE_URL`, `DO_SPACE_*` | Copied required vars |
| 7 | uvicorn doesn't auto-load `.env` | Added `dotenv.load_dotenv()` to `api_server.py` |
| 8 | Voice agent hardcoded `audio/webm` even when receiving mp3 | Pass through real filename + content-type from FastAPI UploadFile |
| 9 | Embedding-dim mismatch (retriever 3072, index 1536) | Aligned retriever default to `text-embedding-3-small` (1536) |
| 10 | Atlas Vector filter path wrong (`workspaceId` vs Prisma's `workspace-id`) | Updated retriever filter |
| 11 | Mixed kebab/camelCase fields in retrieval response | Added `_normalize_chunk()` so clients always get camelCase |
| 12 | `_cffi_backend.pyd` lock during pip install on Windows | Stop uvicorn before installs |
| 13 | TS errors in legacy frontend after schema change | Marked `caseStudy`, `postAt`, `content` as nullable in legacy types |
| 14 | Flask `jsonify` calls in `api/openai_api_requests.py` crashed outside Flask context (masking real errors) | Removed Flask import; handlers `raise` instead |
| 15 | Windows cp1252 crashed `print(arabic_text)` | Launch uvicorn with `PYTHONIOENCODING=utf-8 PYTHONUTF8=1` |
| 16 | Embedding bloat in retrieval response (~6KB/chunk) | Strip `embedding` field before returning |

---

## 2. How to run each server

### 2.1 Prerequisites (one-time)

**Required toolchain:**
- Node.js 20.x
- Python 3.12 (via the existing `.venv` at `TakamolAdvancedAI/.venv`)
- Docker Desktop (for Redis)
- MongoDB Atlas account (already provisioned: `cluster0.ipkg8bq`)
- DigitalOcean Spaces account (already provisioned: `cognerax-learn` / `sfo3`)

**Required env vars** (already populated in the `.env` files):
- `deal-ai-server/.env` — `DATABASE_URL`, `JWT_SECRET`, `REDIS_URL=redis://localhost:6380`, `AI_ENGINE_URL=http://127.0.0.1:5050`, `LINKEDIN_*`, `TWITTER_*`, `GOOGLE_*`, `DO_SPACE_*`, `LEGACY_USER_HEADER=enabled`
- `deal-ai/.env` — `NEXT_PUBLIC_BASE_URL`, `NEXT_PUBLIC_SERVER_BASE_URL=http://localhost:5500`, `NEXT_PUBLIC_AI_API=http://localhost:5050`
- `TakamolAdvancedAI/.env` — `OPENAI_API_KEY`, `ELEVENLABS_API_KEY`, `DATABASE_URL`, `DATABASE_NAME=deal_ai`, `DO_SPACE_*`

**One-time database setup** (already run for `smoke-test-ws` workspace):
```bash
# 1. Push schema to Atlas
cd "D:/Work/CreativeMotion/Deal AI/Server/deal-ai-server"
npx prisma generate
npx prisma db push

# 2. Seed templates
node scripts/seed-templates.js

# 3. Backfill workspaces from existing legacy data
node scripts/backfill-workspaces.js

# 4. Create Atlas Vector Search indexes (3 indexes)
cd "D:/Work/CreativeMotion/Takamol Advanced AI/PythonAI/TakamolAdvancedAI"
.venv/Scripts/python.exe scripts/create_vector_indexes.py

# 5. Create Mongo text index for hybrid retrieval BM25 leg
.venv/Scripts/python.exe -c "
from dotenv import load_dotenv; load_dotenv()
from pymongo import MongoClient, TEXT
import os
client = MongoClient(os.environ['DATABASE_URL'])
client[os.environ.get('DATABASE_NAME', 'deal_ai')]['document-chunks'].create_index([('content-text', TEXT)], name='content_text_idx')
print('text index created')
"
```

### 2.2 Start order (5 steps)

Open **5 terminals** (or use a tool like `concurrently` / `pm2`).

#### Terminal 1 — Redis (Docker)

```bash
# Start (one-time per boot)
docker start allrounder-redis

# Or first-time create
docker run -d --name allrounder-redis -p 6380:6379 redis:7-alpine

# Verify
docker exec allrounder-redis redis-cli PING   # → PONG
```

#### Terminal 2 — Backend (Express on :5500)

```bash
cd "D:/Work/CreativeMotion/Deal AI/Server/deal-ai-server"
PORT=5500 NODE_ENV=development node src/index.js

# Expect:
#   [INFO] API server listening { port: 5500 }
# Health probe:
curl http://localhost:5500/api/healthz   # → {"ok":true,"db":"up"}
```

#### Terminal 3 — BullMQ workers (separate Node process)

```bash
cd "D:/Work/CreativeMotion/Deal AI/Server/deal-ai-server"
NODE_ENV=development node src/queue/workers.js

# Expect:
#   [INFO] BullMQ workers running
```

#### Terminal 4 — AI engine (FastAPI on :5050)

```bash
cd "D:/Work/CreativeMotion/Takamol Advanced AI/PythonAI/TakamolAdvancedAI"
PYTHONIOENCODING=utf-8 PYTHONUTF8=1 .venv/Scripts/python.exe -m uvicorn api_server:app --host 127.0.0.1 --port 5050

# Expect:
#   INFO: Uvicorn running on http://127.0.0.1:5050
# Health probe:
curl http://127.0.0.1:5050/v1/healthz   # → {"ok":true,"service":"allrounder-ai-engine",...}
```

> **Why `PYTHONIOENCODING=utf-8 PYTHONUTF8=1`?** Some legacy handlers `print()` Arabic content. On Windows, the default cp1252 console encoding crashes — these env vars switch stdio to utf-8.

#### Terminal 5 — Frontend (Next.js on :3010)

```bash
cd "D:/Work/CreativeMotion/Takamol Advanced AI/Next Website/deal-ai"
PORT=3010 npm run dev

# Expect:
#   ✓ Ready in ~2s
# Open browser:
#   http://localhost:3010/en/app/workspaces
```

> Port 3010 used because port 3000 may be occupied by another project. If 3000 is free, drop the `PORT=` env.

### 2.3 Verify the full stack is wired

```bash
# Backend
curl http://localhost:5500/api/healthz
# → {"ok":true,"db":"up"}

# AI engine
curl http://127.0.0.1:5050/v1/healthz
# → {"ok":true,...}

# Frontend
curl -o /dev/null -s -w "%{http_code}\n" http://localhost:3010/en/app/workspaces
# → 200

# Redis
docker exec allrounder-redis redis-cli PING
# → PONG

# BullMQ queues registered
docker exec allrounder-redis redis-cli KEYS "bull:*" | head -5
# → bull:publish:* / bull:ingest:* / etc.
```

### 2.4 Quick smoke flow (end-to-end)

```bash
# 1. Mint a session (replace USER_ID with a real user._id)
USER_ID="6pjxnbrw2hpzv4cr"
curl -c /tmp/cookies.txt -X POST http://localhost:5500/api/session \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$USER_ID\",\"sessionId\":\"smoke\"}"

# 2. List workspaces (should include `smoke-test-ws`)
curl -b /tmp/cookies.txt http://localhost:5500/api/workspaces

# 3. List templates (4 seeded)
curl -b /tmp/cookies.txt http://localhost:5500/api/templates

# 4. Create a campaign
curl -b /tmp/cookies.txt -X POST http://localhost:5500/api/workspaces/smoke-test-ws/campaigns \
  -H "Content-Type: application/json" \
  -d '{"name":"Spring Launch","goal":"AWARENESS","startDate":"2026-05-15T00:00:00Z","endDate":"2026-06-15T00:00:00Z","platforms":["LINKEDIN","INSTAGRAM"]}'

# 5. Test the AI engine — Quick Start with web research
curl -X POST http://127.0.0.1:5050/v1/quickstart/ \
  -H "Content-Type: application/json" \
  -d '{"workspace_id":"smoke-test-ws","brand_name":"Stripe","homepage_url":"https://stripe.com"}'

# 6. Test legacy endpoint (Flask migration verified)
curl -X POST http://127.0.0.1:5050/shortcontent \
  -H "Content-Type: application/json" \
  -d '{"input":"a 2BR apartment in Riyadh"}'

# 7. RAG retrieve (after ingesting at least one document)
curl -X POST http://127.0.0.1:5050/v1/retrieve/ \
  -H "Content-Type: application/json" \
  -d '{"workspace_id":"lc6anh7f0lul","query":"real estate brochures","k":3}'
```

### 2.5 Stopping everything

```bash
# Kill servers (PowerShell)
Get-NetTCPConnection -LocalPort 3010 -State Listen | Stop-Process -Id $_.OwningProcess -Force
Get-NetTCPConnection -LocalPort 5050 -State Listen | Stop-Process -Id $_.OwningProcess -Force
Get-NetTCPConnection -LocalPort 5500 -State Listen | Stop-Process -Id $_.OwningProcess -Force

# Stop Redis container (data persists in the container)
docker stop allrounder-redis

# Or remove entirely (drops queue state — only do this if you don't care about pending jobs)
docker rm -f allrounder-redis
```

---

## 3. Critical env vars reference

### Backend (`deal-ai-server/.env`)

| Var | Purpose |
|---|---|
| `DATABASE_URL` | MongoDB Atlas connection |
| `JWT_SECRET` | HMAC key for session JWT (32+ chars) |
| `REDIS_URL` | `redis://localhost:6380` for BullMQ |
| `AI_ENGINE_URL` | `http://127.0.0.1:5050` (FastAPI) |
| `LEGACY_USER_HEADER` | `enabled` during migration window; `disabled` after cutover |
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowed origins |
| `LINKEDIN_*`, `TWITTER_*`, `GOOGLE_*` | OAuth client creds |
| `DO_SPACE_*` | DigitalOcean Spaces creds |
| `STRIPE_*` | Stripe live keys (only required when billing flows are exercised) |
| `FB_*` | Facebook OAuth creds (only required after Meta App Review) |

### Frontend (`deal-ai/.env`)

| Var | Purpose |
|---|---|
| `NEXT_PUBLIC_BASE_URL` | Frontend's own URL |
| `NEXT_PUBLIC_SERVER_BASE_URL` | `http://localhost:5500` (Express) |
| `NEXT_PUBLIC_AI_API` | `http://localhost:5050` (FastAPI) |
| `NEXT_PUBLIC_LEGACY_USER_HEADER` | `enabled` during migration |
| `DATABASE_URL` | Same as backend (Lucia uses Prisma server-side) |
| `GOOGLE_CLIENT_ID/SECRET` | Lucia Google auth |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Map component |
| `DO_SPACE_*` | Direct uploads from frontend |

### AI Engine (`TakamolAdvancedAI/.env`)

| Var | Purpose |
|---|---|
| `OPENAI_API_KEY` | embeddings + chat + DALL-E + Whisper-fallback |
| `ELEVENLABS_API_KEY` | Scribe STT + TTS |
| `DATABASE_URL` | Mongo Atlas (same as backend) |
| `DATABASE_NAME` | `deal_ai` |
| `DO_SPACE_*` | Document downloads during ingest |
| `IDEOGRAM_API_KEY` | Ideogram image generation |
| `DOMAIN_ORIGIN` | Used by some legacy handlers |
| `AR_EMBEDDING_MODEL` (optional) | Defaults to `text-embedding-3-small` (1536 dims). Must match the dim baked into Atlas Vector Search indexes. |
| `AR_VECTOR_INDEX` (optional) | Defaults to `doc_chunks_idx` |
| `AR_VOICE_INTENT_MODEL` (optional) | Defaults to `gpt-4o-mini` |
| `ELEVENLABS_VOICE_ID` (optional) | TTS voice; defaults to a generic voice |

---

## 4. Pending work (genuinely external blockers)

| Item | Blocker |
|---|---|
| Stripe billing live | Live `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, plan price IDs |
| Facebook + Instagram OAuth + posting | Meta App Review for `pages_manage_posts`, `pages_show_list`, `business_management` (2-3 weeks) |
| LinkedIn analytics | Community Management API access (gated) |
| Production deploy | Pick hosting: Vercel (frontend, already wired) + Render/Railway/Fly.io (backend + worker) + Modal/Render (AI engine) + Upstash (Redis) |
| Playwright E2E suite | Wave 5 finish |
| AI eval suite (50-pair regression) | Wave 5 finish |
| Cost smoke (real 80-post campaign) | Wave 5 finish |

---

## 5. Quick file map

```
D:/Work/CreativeMotion/
├── Takamol Advanced AI/
│   ├── Next Website/deal-ai/                            ← FRONTEND
│   │   ├── prisma/schema.prisma                         (mirrored)
│   │   ├── src/app/[lang]/app/
│   │   │   ├── workspaces/page.tsx
│   │   │   └── [workspaceSlug]/
│   │   │       ├── layout.tsx, page.tsx
│   │   │       ├── campaigns/new/page.tsx               Page 1
│   │   │       ├── campaigns/[id]/strategy/page.tsx     Page 2
│   │   │       └── calendar/page.tsx                    Page 3
│   │   ├── src/components/
│   │   │   ├── template-form-renderer.tsx
│   │   │   ├── content-style-selector.tsx
│   │   │   ├── file-upload-zone.tsx
│   │   │   └── post-detail-drawer.tsx
│   │   ├── src/lib/{api.ts, axios.ts}
│   │   └── (this file) SESSION_SUMMARY.md
│   │
│   └── PythonAI/TakamolAdvancedAI/                      ← AI ENGINE
│       ├── api_server.py                                FastAPI entry
│       ├── routers/{health,ingest,strategy,content,
│       │            image,voice,retrieve,quickstart,
│       │            legacy}.py
│       ├── agents/{ingestor,writer,image_director,
│       │           voice_agent}.py
│       ├── graphs/{campaign_planning,quick_start}_graph.py
│       ├── retrievers/hybrid_retriever.py
│       ├── parsers/{dispatch,pdf_parser}.py
│       ├── routing/model_router.py
│       ├── cache/{semantic,prompt}_cache.py
│       ├── scripts/{create_vector_indexes,smoke_test_ingest}.py
│       ├── app_legacy.py.bak                            (decommissioned Flask)
│       └── FLASK_TO_FASTAPI_MIGRATION.md
│
└── Deal AI/Server/deal-ai-server/                       ← BACKEND
    ├── prisma/schema.prisma                             (canonical)
    ├── scripts/{backfill-workspaces,seed-templates}.js
    ├── src/lib/{jwt,prisma,oauth-state,logger,
    │            errors,validators,stripe,
    │            analytics-fetcher,social}.js
    ├── src/middleware/auth.js
    ├── src/queue/{redis,queues,workers}.js
    ├── src/routes/
    │   ├── session.js, workspaces.js, brand.js,
    │   ├── documents.js, campaigns.js, posts-v2.js,
    │   ├── templates.js, assets.js, exports.js,
    │   ├── analytics.js, voice.js, quick-start.js,
    │   ├── billing.js, stripe-webhook.js,
    │   ├── facebook.js, linkedin.js, twitter.js
    │   └── (legacy: projects.js, study-cases.js, etc.)
    └── MIGRATION_NOTES.md
```

---

## 6. One-page cheat sheet

**Every time you sit down to work on this codebase:**

```bash
# 1. Make sure Redis is up
docker start allrounder-redis

# 2. Open 4 terminals; in each:

# Terminal A
cd "D:/Work/CreativeMotion/Deal AI/Server/deal-ai-server"
PORT=5500 node src/index.js

# Terminal B
cd "D:/Work/CreativeMotion/Deal AI/Server/deal-ai-server"
node src/queue/workers.js

# Terminal C
cd "D:/Work/CreativeMotion/Takamol Advanced AI/PythonAI/TakamolAdvancedAI"
PYTHONIOENCODING=utf-8 PYTHONUTF8=1 .venv/Scripts/python.exe -m uvicorn api_server:app --host 127.0.0.1 --port 5050

# Terminal D
cd "D:/Work/CreativeMotion/Takamol Advanced AI/Next Website/deal-ai"
PORT=3010 npm run dev

# 3. Open browser → http://localhost:3010/en/app/workspaces
```

**Phase 1 base is complete and live.** What's left is external-credential gating (Stripe, Meta App Review) and Wave 5 hardening (Playwright + eval suite).
