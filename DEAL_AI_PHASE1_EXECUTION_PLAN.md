# Allrounder v1 — Phase 1 Execution Plan

> **Prepared** May 2026. **Companion to** `DEAL_AI_ALLROUNDER_LAUNCH_PLAN.md`. **Adds** Belal's AI Content System UI/UX specs + sub-agent role definitions + actionable task list. **Status** awaiting user approval before execution.

---

## 1. Context

Three documents now drive Allrounder v1 design:
- **Allrounder PRD** — base product capabilities + data model.
- **REAM Tech Spec V1** — real-estate vertical pack.
- **Belal's AI Content System Requirements** — granular UI/UX for the user journey across three pages, with four templates, a Guided Brief Flow, file upload, design guidelines, content style selection, and a "Generate for me" Quick Start Mode.

This Phase 1 plan integrates Belal's specs into the launch plan and breaks Phase 1 into parallelizable sub-agent tracks.

---

## 2. Belal's UI/UX Specs — Integration

### 2.1 Three pages = canonical user journey

| Belal's page | Maps to launch-plan route | Maps to data model |
|---|---|---|
| **Page 1 — Brief Input** | `/[workspaceSlug]/campaigns/new` | Inputs → `Campaign` + `Document(s)` + `BrandProfile` updates |
| **Page 2 — Strategy Output** | `/[workspaceSlug]/campaigns/[id]/strategy` | `Strategy` model |
| **Page 3 — Content Creation** | `/[workspaceSlug]/campaigns/[id]/posts` + `/calendar` + per-post detail | `Post`, `Asset`, `PostVersion` (new) |

### 2.2 Four templates (drive the campaign wizard)

Each template = a registered preset that pre-fills `Campaign` + initial `Strategy` fields and selects a vertical-pack-aware prompt.

| Template | Field count | Maps to |
|---|---|---|
| Social Media Strategy | 10 | Generic Allrounder base |
| Product Launch | 9 | Allrounder base + `launchDate` extension |
| E-commerce | 8 | `vertical: ECOMMERCE` (Phase 2 pack) |
| Brand Awareness | 7 | Allrounder base |

A new **Template** model holds these definitions:

```prisma
model Template {
  id            String   @id @map("_id")
  slug          String   @unique
  name          String
  description   String
  useCase       String
  fields        Json     // ordered field list with type, options, validation
  promptKey     String   // path into prompts/ folder
  verticalPack  VerticalPack?  // optional pack lock
  isSystem      Boolean  @default(true) @map("is-system")
  createdAt     DateTime @default(now()) @map("created-at")
  @@map("templates")
}
```

System templates seeded at deploy. Custom user templates supported in Phase 2.

### 2.3 Guided Brief Flow (alternative entry path)

If user skips template gallery → 5-step wizard: Objective → Target Audience → Product/Service → Tone → Competitors. Same backend output as templates.

### 2.4 File Upload (Page 1)

Drag-drop zone accepting **PDF, PPT, Word, Excel, Images, Videos** — feeds directly into `Document` ingest pipeline (§8 of launch plan). Per-file preview with name + size + parse status. AI summarization + insight extraction surface inline in the wizard before strategy generation.

### 2.5 Design Guidelines (Page 1)

User uploads: references, do's/don'ts, colors, fonts, style description; toggles "Strict adherence." These persist as `BrandProfile` updates with a `strictAdherence: Boolean` flag that the AI reviewer agent enforces.

### 2.6 Content Style Selection

Six radio options: **Bold, Corporate, Funny, Luxury, Gen Z, Minimal** — each with a preview snippet. Selection drives `Strategy.tonalGuide` + writer-agent prompt template.

### 2.7 Strategy Output (Page 2)

- **Strategy table** — fixed columns: Platform, Posts/Week, Posts/Month, Best Days, Best Time Slots, Content Type, Notes. Inline-editable.
- **SWOT** — 4 boxes, 3-5 points each.
- **Smart Suggestions** — three card categories: Trending Content Ideas, Missed Opportunities, Growth Hacks.
- **Editable global controls** above table: Objective, Message, Strategy Direction.
- **Preview step** — sample headlines, tone description, content direction. Buttons: **Approve** / **Refine**.

### 2.8 Content Creation (Page 3)

- **Calendar** — Monthly + Weekly views; each day shows post count + types; drag-drop reschedule; click → side-drawer post detail.
- **Post card** — title, platform, date, time.
- **Post detail** — visual preview + edit; text-on-visual editor with position controls (top/center/bottom) + font size; caption textarea + **Generate variations** (3 options); **Time recommendation** (3 slots labeled High engagement / Medium / Safe).
- **Visual editor** — Konva canvas (already built); prompt input + Regenerate; suggestions: "Make it more minimal", "Increase contrast", "Add product focus".
- **Brand elements** — logo upload + size/position/opacity controls; watermark toggle.
- **Version control** — save version, history list, restore button. New `PostVersion` model.
- **Collaboration** — users list, per-post comments, status (Draft / Approved / Rejected).

### 2.9 Export & Integration

Buttons: **Export Strategy PDF**, **Export Content Calendar PDF**, **Export Captions CSV**. Direct **Publish** button or **Copy formatted text** for manual paste.

### 2.10 Quick Start Mode

A single button **"Generate for me"** on the workspace dashboard. User enters only `Brand Name`. System runs an autonomous agent flow that:
1. Web-scrapes the brand (LinkedIn, website, social) for industry, tone, audience.
2. Picks the best-fit template automatically.
3. Pre-fills all template fields.
4. Triggers the full strategy + first 5 posts generation.
5. Surfaces a draft for the user to refine.

This is **the killer onboarding feature** — solves the 8/10 abandon-from-confusion pain (§4.7 of market study) and the <2-min time-to-first-value goal.

### 2.11 Schema additions

```prisma
model Template {  /* see §2.2 */ }

model PostVersion {
  id        String   @id @map("_id")
  postId    String   @map("post-id")
  version   Int
  snapshot  Json     // full Post fields at this point
  authorId  String   @map("author-id")
  createdAt DateTime @default(now()) @map("created-at")

  post Post @relation(fields: [postId], references: [id], onDelete: Cascade)
  @@unique([postId, version])
  @@map("post-versions")
}

model PostComment {
  id        String   @id @map("_id")
  postId    String   @map("post-id")
  authorId  String   @map("author-id")
  body      String
  createdAt DateTime @default(now()) @map("created-at")
  deletedAt DateTime? @map("deleted-at")

  post Post @relation(fields: [postId], references: [id], onDelete: Cascade)
  @@index([postId])
  @@map("post-comments")
}

// Post adds: status now includes APPROVED / REJECTED separately from PUBLISHED;
// add brandStrictAdherence: Boolean on BrandProfile.
```

---

## 3. Phase 1 Scope — Complete Allrounder Base (user clarification)

**Definition.** Phase 1 = the **complete Allrounder base product**, ready for real users. Every feature in the Allrounder PRD Phase-1 scope and every UI element in Belal's three-page spec is implemented end-to-end with real (not stubbed) AI flows. After Phase 1, a paying user can sign up → create workspace → upload documents → run Quick Start (real autonomous flow) OR pick a template → see real LangGraph-generated strategy → see real AI-generated posts on a calendar → edit, approve, schedule, and auto-publish across LinkedIn / X / Facebook / Instagram → see real engagement analytics flow back in.

**REAM vertical-pack features stay in Phase 2** (WhatsApp BSP, REGA/PDPL, dialect tuning, Bayut/Property Finder/Dubizzle/Aqarmap connectors, Excel owner ingestion, lead pipeline + agent CRM). Existing Deal AI customers retain full access during the migration via `verticalPacks: [REAL_ESTATE]` flag, but new pack-specific features are not added in Phase 1.

### 3.1 In scope — full feature list (all mandatory)

**Foundations & infra**
- New Prisma schema (Workspace, Member, BrandProfile, Document, DocumentChunk, Campaign, Strategy, Post, PostVersion, PostComment, Asset, Template, AnalyticsData, AudienceInsights, OAuthState, Subscription). Indexes + soft-delete.
- Backfill migration from old schema (Project/Property/StudyCase) → new schema, with `verticalPacks: [REAL_ESTATE]` preserving existing user data.
- Signed JWT auth (jose, HS256) replacing base64 user header; HTTP-only Secure cookie.
- Prisma client extension auto-injecting `workspaceId` on all tenant-scoped queries.
- Express middleware: `requireAuth`, `requireWorkspace`, `requireRole(roles)`.
- Pino structured logging with PII redaction; Sentry on all three repos.
- Zod validation on every backend route; standard error response shape.
- BullMQ + Redis (Upstash); seven production queues (`ingest`, `ai-strategy`, `ai-content`, `publish`, `analytics-fetch`, `email`, `webhook-retry`) with real workers.
- node-cron scheduler fully replaced with BullMQ delayed jobs.
- OAuth state in Prisma `OAuthState` with TTL.
- DB indexes per launch plan §11.4 verified on Atlas.
- Secret-rotation completed + `.env` removed from repo + `.env.example` templates + Doppler/1Password integration.
- FastAPI fully replacing Flask (existing endpoints rewritten, not proxied). LangGraph + LangChain installed.
- Per-tenant rate limiting (Redis token bucket).
- Helmet + strict CORS (env-driven whitelist).
- Deep healthz; Better Stack dashboard (latency, queue depth, cost, hit rate).
- Stripe billing fully integrated: Customer + Subscription + webhooks + Customer Portal + plan-tier quota enforcement.
- Email transactional (Resend / SendGrid) with templated invites, approval requests, post-publish digests.

**RAG pipeline (real, end-to-end)**
- Document ingest pipeline supporting PDF (Unstructured.io + pdfplumber fallback + GPT-4o vision for scanned), Excel (openpyxl), DOCX (python-docx), URL (trafilatura + Playwright fallback), Image (GPT-4o vision caption), CSV, raw text.
- Per-format chunking strategy per launch plan §8.4.
- Embeddings via `text-embedding-3-large` (3072d) for accuracy or `-small` (1536d) for budget tier.
- MongoDB Atlas Vector Search index on `document-chunks.embedding`, `assets.embedding`, `brand-profiles.voiceEmbedding`.
- Hybrid retriever: dense (`$vectorSearch`) + BM25 (text index) + Reciprocal Rank Fusion + cross-encoder rerank (`bge-reranker-v2-m3` or Cohere Rerank).
- Hallucination guardrails: every generated post stores `sourceChunkIds[]`; assertive claims with empty source flagged for review.
- Document re-ingestion with version-supersede; chunk weight decay.

**LangGraph orchestration (real workflows, not stubs)**
- Document ingest graph: classify → parse → chunk → embed → index → notify.
- Brand voice extraction graph: voice-samples → tonal analysis → embedding → BrandProfile update.
- Strategy generation graph: load_context → audience_synthesis → pillar_definition → cadence_planning → SWOT_synthesis → trends_lookup → opportunities_discovery → persist.
- Campaign planning graph: load_strategy → calendar_layout → per-platform-tone → cadence_distribution → persist.
- Post generation graph (canonical, per-post): retrieve_context → write_caption → expand_image_prompt → generate_image → brand_voice_review → time_recommendation → persist → notify.
- Variations graph: existing-post → 3 alternates (caption rewriting via Haiku 4.5).
- Image-edit graph: existing-image + prompt → DALL-E/Flux regeneration with brand-lock + suggestions ("Make it more minimal", "Increase contrast", "Add product focus").
- Optimizer graph: post-perf data → next-cycle suggestions.
- All graphs use MongoDB checkpointer (durable; survive worker restarts).
- LangSmith tracing on every graph run.

**Token & cost optimization**
- Anthropic prompt-cache helpers (system prompt + brand prefix + pack instructions cached at 5-min TTL; 1-hour for in-flight workflow runs).
- OpenAI implicit caching support (prefix structuring).
- Redis semantic cache (RediSearch + embeddings, cosine > 0.93, per-workspace scoping, 24h-30d TTL).
- Model router with full fallback chain: Haiku 4.5 / GPT-4o-mini for triage; Sonnet 4.6 / GPT-4o for generation; Opus 4.7 only on flagged outputs.
- Per-call cost & token logging → `PlatformUsage` table → workspace billing UI.
- Hard per-tier budget caps with 80% warning + 100% throttle.
- Batch APIs (Anthropic + OpenAI) for nightly audience-insight rollup, embedding regeneration, pre-generated next-week posts.

**Page 1 — Brief Input (Belal §1)**
- Template gallery: 4 cards (Social Media Strategy, Product Launch, E-commerce, Brand Awareness) with name, description, use case, "Use Template" CTA.
- Per-template forms with all field counts (10 / 9 / 8 / 7) including: dropdowns, multi-select, sliders (age range), tag inputs, "custom" overrides on dropdowns, link inputs.
- Guided Brief Flow: 5-step wizard with progress bar (Objective → Target Audience → Product/Service → Tone → Competitors).
- File Upload zone (drag-drop, multi-file, PDF/PPT/Word/Excel/Image/Video). SSE-fed live status: Queued → Parsing → Embedding → Ready. Inline AI summary + insight extraction shown before strategy generation.
- Manual Input textarea + URLs field (with example placeholder).
- Design Guidelines: References upload, Do's, Don'ts, Colors picker, Fonts picker, Style description, **Strict adherence checkbox** (enforced by reviewer agent).
- Content Style radio (6 options): Bold, Corporate, Funny, Luxury, Gen Z, Minimal — each with preview snippet rendered live.

**Quick Start Mode (Belal §"Generate for me", real implementation)**
- Single-field form on workspace dashboard: Brand Name only.
- Backend autonomous flow: web-scrape brand (LinkedIn + website + open social) → infer industry/tone/audience via LangChain web-research chain → auto-pick best template → pre-fill all template fields → trigger full strategy + first 5 posts generation.
- SSE-fed animated progress: "Researching brand…" → "Picking template…" → "Generating strategy…" → "Drafting first 5 posts…" → drops user on Page 2 with everything ready to refine.

**Page 2 — Strategy Output (Belal §2)**
- Strategy table (fixed columns: Platform, Posts/Week, Posts/Month, Best Days, Best Time Slots, Content Type, Notes) — inline editable.
- Editable global controls above table (Objective, Message, Strategy Direction).
- SWOT 4-box layout, 3-5 bullets each, inline-editable.
- Smart Suggestions cards: Trending Content Ideas + Missed Opportunities + Growth Hacks.
- Preview Step: sample headlines + tone description + content direction.
- **Approve** / **Refine** buttons. Approve advances to Page 3 generation; Refine reopens brief inputs.
- Real LangGraph generation with SSE progress events.

**Page 3 — Content Creation (Belal §3)**
- Calendar Monthly + Weekly views (`react-big-calendar` + `react-dnd`); each day shows post count + types.
- Drag-drop reschedule with optimistic UI + backend PATCH (re-enqueues BullMQ delayed job).
- Post card: title, platform, date, time.
- Post detail drawer: visual preview, **Edit** opens Konva editor (existing — generalized).
- Text-on-visual editor (position: top/center/bottom; font size).
- Caption textarea + **Generate variations** (3 alternates via LangGraph).
- Time Recommendation: 3 slots (High engagement / Medium / Safe) — heuristic in v1, audience-insights-driven once data accumulates.
- Visual editor: prompt input + Regenerate; suggestions ("Make it more minimal", "Increase contrast", "Add product focus") surface as one-click chips that re-prompt.
- Brand elements: logo upload + size/position/opacity controls; watermark toggle.
- Version control: save version, history list, restore — backed by `PostVersion` model.
- Comments thread per post; status chip Draft/Approved/Rejected.
- Conflict detection on calendar (same platform, same hour → red border + warning).

**Approval workflow**
- Posts in `NEEDS_APPROVAL` show in queue panel for `APPROVER` users.
- Inline approve / reject (with reason) / edit-and-approve.
- Email + in-app notifications to relevant role.

**Publishing pipeline**
- LinkedIn /rest/posts (migrated from deprecated /v2/ugcPosts).
- X / Twitter (existing PKCE flow + per-call cost tracking).
- **Facebook + Instagram OAuth + posting (newly added — closes the stubbed-platform gap).**
- Per-platform retry-with-backoff; failure surfaces in UI with specific message.
- BullMQ delayed-job pattern for scheduled publishing; persistent across restarts.

**Analytics & insights**
- Nightly analytics fetcher pulls from each connected platform's API.
- Engagement, reach, CTR, conversions (where supported) written to `AnalyticsData`.
- Audience insights computed nightly: age buckets, gender split, top geos, top interests, best post hours.
- Workspace dashboard: KPI cards + recharts trends + top-posts table.
- Per-campaign analytics view.

**Brand Memory & brand-locked image gen**
- BrandProfile editor (name, logo, colors, fonts, tone, voice samples, banned words, brand values, positioning, competitors).
- Voice samples → embeddings stored in BrandProfile.voiceEmbedding.
- Image-gen pipeline includes style-ref + color-palette + logo-position constraints; Konva editor enforces post-generation overlay.

**Voice agent generalization**
- Existing `siri.tsx` component + voicegpt-assistant kept.
- Backend `/v1/voice/intent` endpoint: Whisper → text → intent classifier (Haiku 4.5) → tool dispatch.
- Page-aware intent registry (calendar page → "reschedule X to Y"; campaign page → "regenerate post Z"; etc.).
- Generic for any industry; RE-specific commands move into REAL_ESTATE pack (Phase 2).

**Asset library & content recycling**
- `Asset` model + tagging + visual-similarity embedding.
- Library page: filter by type/tag, search by visual similarity, soft-delete + restore.
- Content recycling rules (per-asset): "republish to LI weekly", "include in next campaign of category X".

**Export & Integration (Belal §Export)**
- Export Strategy PDF (server-side puppeteer or React-PDF rendering).
- Export Content Calendar PDF.
- Export Captions CSV.
- "Copy formatted text" per post.
- "Publish now" button (immediate publish bypassing schedule).

**Localization**
- AR + EN with RTL across all three pages.
- Per-workspace locale preference.
- All new UI strings in dictionaries.

**Observability**
- LangSmith on every AI graph.
- Per-call cost/token logging → workspace usage UI.
- Sentry across all three repos.
- Better Stack dashboards: latency, queue depth, AI cost per workspace, cache hit rate, publish success rate, MAU per plan tier.

**Testing**
- Unit tests on auth, validators, prompt rendering, model router, retrieval scoring.
- Integration tests on workspace creation, document ingest → query, campaign generation happy-path (with mocked LLM).
- Playwright E2E: signup → upload → first campaign → first scheduled post → publish.
- AI eval suite: 50-pair regression test run nightly via LangSmith.

### 3.2 Out of scope for Phase 1 (Phase 2 / 3)

- REAM vertical-pack features: WhatsApp Business Cloud API outreach, email outreach engine, Excel owner-and-unit ingestion, REGA FAL stamping, PDPL consent ledger, Bayut / PropertyFinder / Dubizzle / Aqarmap connectors, lead pipeline + Agent CRM, Marketplace listing posts, Saudi/Egyptian dialect tuning, multi-tenant data residency switching.
- TikTok + Instagram Reels 9:16 video generation.
- Inbox / DM management (cross-platform unified inbox).
- A/B testing + performance prediction.
- White-label / agency-mode.
- Press distribution module.
- Floor-plan extraction (WAFFLE-style).
- Comp-pricing ML.
- Native mobile apps.
- Custom-domain workspaces.
- SSO / SAML.
- Real-time collaboration (multi-user simultaneous editing).
- Public API for external integrations.

### 3.3 Realistic effort + execution honesty

Complete Allrounder Phase 1 = **~16–22 dev-weeks** of focused work for a 3-person team in 5–6 calendar months per the launch plan §13.

**"In one call"** is not literally one tool execution — it's one approval + one continuous execution session. Even with 12 sub-agents running in parallel, the agent pool can realistically deliver:

- **Within ~3-6 hours of agent execution time**: Wave 1 (schema + auth) + Wave 2 (backend routes + queue + AI engine scaffold + observability) + Wave 3 frontend skeletons (Page 1/2/3 routes + base components).
- **Within ~8-12 hours**: full Wave 3 component build-out + Wave 4 integration smoke + real LangGraph workflow wiring on the campaign-planning graph.
- **Beyond 12 hours**: real Quick Start web-research, Stripe full integration, FB/IG OAuth + posting, voice intent registry, analytics ingestion, exports, image-gen brand-lock — these realistically need follow-up sessions.

**Recommended approach.** Treat Phase 1 as a multi-session program. **Session 1 ("the one call" you're approving now)** = Waves 1–3 foundation + UI skeletons + canonical campaign workflow. **Subsequent sessions** = filling out workflows, integrating Stripe, OAuth+posting on FB/IG, analytics, voice, exports. Each session ends with a clean deployable state and a concrete next-session task list.

I will be transparent about progress at the end of each session: what's done, what's stubbed, what's pending. This avoids "we shipped Phase 1" claims that don't match reality.

---

## 4. Sub-Agent Roles

Twelve sub-agents organized in four waves. Wave-1 agents must complete before Wave-2; Wave-2 agents run in parallel; Wave-3 agents run in parallel; Wave-4 is final integration. All run in isolated worktrees where possible to minimize merge conflicts; otherwise they own non-overlapping files.

### Wave 1 — Schema + Auth foundations (sequential, must finish first)

#### Agent A — `schema-migration-agent`
**Owns:** `prisma/schema.prisma` (frontend + backend), MongoDB indexes, backfill scripts.
**Tasks:**
- A1. Add new models (Workspace, Member, BrandProfile, Document, DocumentChunk, Campaign, Strategy, Post, PostVersion, PostComment, Asset, Template, AnalyticsData, AudienceInsights, OAuthState) alongside existing ones.
- A2. Add indexes per launch plan §11.4.
- A3. Write `scripts/backfill-workspaces.ts`: for each User, create Workspace + migrate Project→Campaign + StudyCase→Strategy+Document + Post→Post-with-workspaceId.
- A4. Run `prisma db push` against staging Atlas; verify counts.
- A5. Seed `Template` rows for the four Belal templates.
- A6. Document the migration in `MIGRATION_NOTES.md`.

#### Agent B — `auth-tenancy-agent`
**Owns:** `src/auth/*`, `src/lib/prisma.ts`, all auth middleware.
**Tasks:**
- B1. Sign JWT (`jose` library, HS256 with 32-byte secret) on Lucia session establishment; store in HTTP-only Secure cookie.
- B2. Backend `requireAuth` middleware: verify JWT, populate `req.ctx.userId` and `req.ctx.sessionId`.
- B3. Backend `requireWorkspace` middleware: resolve `:workspaceSlug` → check Member record → populate `req.ctx.workspaceId` and `req.ctx.role`.
- B4. Backend `requireRole(roles)` middleware factory.
- B5. Prisma client extension that auto-injects `where: { workspaceId: ctx.workspaceId }` on read/update/delete; refuses inserts without `workspaceId` for tenant-scoped models.
- B6. Replace `OAuthState` in-memory `Map` with Prisma model + 10-min TTL job.
- B7. Update frontend `src/lib/axios.ts` to send JWT cookie instead of base64 user header; remove the header.
- B8. Document role matrix in `AUTH.md`.

### Wave 2 — Backend + AI engine + observability (parallel, independent)

#### Agent C — `backend-api-agent`
**Owns:** `src/routes/*` in deal-ai-server, Zod validators, error handler.
**Tasks:**
- C1. Restructure routes per launch plan §6.1 (workspaces, members, brand, documents, campaigns, strategies, posts, library, analytics, billing, oauth, webhooks).
- C2. Add Zod schemas at `src/lib/validators/*`; middleware that 400s on invalid bodies.
- C3. Standard error response shape `{ ok: false, error: { code, message, fields? } }`.
- C4. Keep old routes (`/api/projects`, `/api/study-cases`, `/api/posts`, `/api/properties`) as thin wrappers calling new routes; add `Deprecation` header.
- C5. Per-tenant rate limiting using Redis token bucket.
- C6. Body-size limits per route (drop the global 100mb cap).
- C7. Helmet + strict CORS (env-driven whitelist).

#### Agent D — `queue-scheduler-agent`
**Owns:** `src/queue/*` in deal-ai-server; `index.js` cron removal.
**Tasks:**
- D1. Add Redis dependency (Upstash recommended); wire connection.
- D2. Install BullMQ; create three queues: `ingest`, `ai-content`, `publish`.
- D3. Rewrite the 30-second `cron.schedule` as BullMQ delayed jobs: on post approve, enqueue `publish-post` with `{delay: scheduledFor - now}`.
- D4. Create stub workers for each queue (log + ack for now; logic filled by other agents later).
- D5. Worker wiring in `src/queue/workers/index.js`; runnable as separate process.
- D6. Bull Board admin UI mounted at `/admin/queues` (admin-role-only).

#### Agent E — `ai-engine-agent`
**Owns:** `TakamolAdvancedAI/*` Python repo.
**Tasks:**
- E1. Install FastAPI + LangChain + LangGraph + Unstructured.io + pdfplumber + openpyxl + trafilatura + Redis client.
- E2. Create FastAPI app at `main.py`; routers under `routers/`.
- E3. Migrate existing Flask endpoints behind FastAPI (proxy first for back-compat).
- E4. Folder scaffold per launch plan §7.2: `graphs/`, `agents/`, `chains/`, `retrievers/`, `parsers/`, `cache/`, `routing/`, `prompts/`, `tools/`, `observability/`.
- E5. Build the document ingest pipeline: parser dispatch by mime → chunker → embedder (text-embedding-3-large) → write to `document-chunks`.
- E6. Build the hybrid retriever: dense via Atlas `$vectorSearch` + BM25 via text index + RRF + `bge-reranker-v2-m3`.
- E7. Define LangGraph campaign-planning graph stub (nodes: load_context, generate_strategy, plan_calendar, generate_post_batch, generate_images, review, persist, notify) with the canonical state shape.
- E8. Implement model router + Anthropic prompt-cache helper + Redis semantic-cache helper.
- E9. Create LangSmith trace export.
- E10. Endpoint `/v1/ingest/document` (returns 202 + jobId; pipeline runs async via BullMQ).
- E11. Endpoint `/v1/campaign/generate` (kicks off the LangGraph workflow; SSE for progress).

#### Agent F — `observability-security-agent`
**Owns:** logging, error tracking, secret hygiene, healthz, indexes verification.
**Tasks:**
- F1. Replace all `console.log` with `pino` at `src/lib/logger.js`; PII redaction patterns (password, email-hash, token, phone).
- F2. Wire Sentry SDK on all three repos.
- F3. Deep `/api/healthz` that pings DB + Redis + AI engine + S3.
- F4. Write `scripts/rotate-secrets.sh` with the rotation checklist; remove all `.env` from git tracking; add `.env.example` templates.
- F5. Verify all indexes from launch plan §11.4 are created on Atlas; produce a verification report.
- F6. Add basic Better Stack dashboard config (latency, queue depth, cost).

### Wave 3 — Frontend (parallel, independent route trees)

#### Agent G — `frontend-foundation-agent`
**Owns:** App Router structure, layouts, workspace switcher, brand editor, members page, billing shell.
**Tasks:**
- G1. Restructure `src/app/[lang]/dashboard/*` → `src/app/[lang]/app/[workspaceSlug]/*` per launch plan §5.1.
- G2. Create `app/[lang]/app/workspaces/page.tsx` (list + create form).
- G3. Create `[workspaceSlug]/layout.tsx` with tenant-context provider (sets workspaceId in client state).
- G4. Workspace switcher component (top-nav dropdown).
- G5. Brand profile editor (name, logo upload, colors, fonts, tone, samples, banned words, strictAdherence toggle, design references).
- G6. Members page (invite + role change + remove).
- G7. Billing page shell (Stripe Customer Portal embed; full integration is Phase 2).
- G8. Notifications panel (in-app — SSE-fed).

#### Agent H — `frontend-brief-input-agent` (Belal Page 1)
**Owns:** `app/[lang]/app/[workspaceSlug]/campaigns/new/*`.
**Tasks:**
- H1. Template gallery: 4 cards (Social Media Strategy, Product Launch, E-commerce, Brand Awareness) with name, description, use case, "Use Template" CTA.
- H2. Per-template form generators driven by the seeded `Template.fields` JSON (10/9/8/7 fields respectively).
- H3. Guided Brief Flow as fallback path: 5-step wizard with progress bar (Objective → Audience → Product/Service → Tone → Competitors). Age slider, gender, location, interests tags.
- H4. File Upload zone (drag-drop, multi-file, PDF/PPT/Word/Excel/Image/Video). Live status (Queued → Parsing → Embedding → Ready) via SSE.
- H5. Manual Input textarea + URLs field.
- H6. Design Guidelines fields: References upload, Do's, Don'ts, Colors picker, Fonts picker, Style description, Strict adherence checkbox.
- H7. Content Style radio: Bold, Corporate, Funny, Luxury, Gen Z, Minimal — each with preview snippet.
- H8. **Quick Start Mode button on workspace dashboard** ("Generate for me" — only Brand Name input; calls stub endpoint that mocks the autonomous flow for Phase 1).
- H9. On submit → POST `/api/workspaces/:slug/campaigns` → redirect to Page 2.

#### Agent I — `frontend-strategy-output-agent` (Belal Page 2)
**Owns:** `app/[lang]/app/[workspaceSlug]/campaigns/[campaignId]/strategy/*`.
**Tasks:**
- I1. Strategy table: Platform / Posts/Week / Posts/Month / Best Days / Best Time Slots / Content Type / Notes — inline editable.
- I2. Editable global controls above table (Objective, Message, Strategy Direction).
- I3. SWOT 4-box layout, 3-5 bullets each, inline-editable.
- I4. Smart Suggestions cards: Trending Content Ideas, Missed Opportunities, Growth Hacks.
- I5. Preview Step section: sample headlines + tone description + content direction.
- I6. **Approve** / **Refine** buttons. Approve advances to Page 3 generation; Refine reopens the brief inputs.
- I7. SSE listener for live strategy generation progress (shows skeleton while LangGraph runs).

#### Agent J — `frontend-content-creation-agent` (Belal Page 3)
**Owns:** `app/[lang]/app/[workspaceSlug]/calendar/*`, `app/[lang]/app/[workspaceSlug]/campaigns/[id]/posts/*`, post detail drawer.
**Tasks:**
- J1. Calendar Monthly + Weekly views (`react-big-calendar` + `react-dnd`); each day shows post count + types.
- J2. Drag-drop reschedule with optimistic UI + backend PATCH.
- J3. Post card: title, platform, date, time.
- J4. Post detail drawer: visual preview, **Edit** button (opens Konva editor — already exists, reuse), text-on-visual editor (position: top/center/bottom; font size).
- J5. Caption textarea + **Generate variations** (calls AI engine for 3 alternates).
- J6. Time Recommendation: 3 slots labeled High engagement / Medium / Safe (initially heuristic; later powered by AudienceInsights).
- J7. Brand elements: logo upload + size + position + opacity controls; watermark toggle.
- J8. Version control: save version button, history list, restore button (uses new `PostVersion` model).
- J9. Comments thread per post (uses new `PostComment` model); status chip Draft/Approved/Rejected.
- J10. Export buttons: Strategy PDF, Content Calendar PDF, Captions CSV (server-side rendered via existing `convert-docs.py` pattern adapted).

### Wave 4 — Real Quick Start + integrations + analytics + exports (parallel)

#### Agent K — `quick-start-real-agent`
**Owns:** `app/[lang]/app/[workspaceSlug]/quick-start/*`, `quick_start_graph.py` in AI engine.
**Tasks:**
- K1. Quick Start UI: single field (Brand Name), big "Generate for me" CTA.
- K2. Backend endpoint `/api/workspaces/:slug/quick-start`.
- K3. AI-engine LangGraph `quick_start_graph`: web_research (LangChain web-research chain hitting brand site + LinkedIn + open social) → industry_inference → tone_inference → audience_inference → template_selection → form_prefill → trigger campaign-planning graph.
- K4. Frontend SSE-fed animated steps reflect real graph progress.
- K5. After completion, redirects to Page 2 with everything refinable.

#### Agent M — `stripe-billing-agent`
**Owns:** `services/stripe.js`, `routes/billing.js`, `routes/webhooks/stripe.js`, frontend billing page.
**Tasks:**
- M1. Stripe Customer + Subscription per Workspace; Customer Portal redirect.
- M2. Webhook handlers (signature-verified): subscription created/updated/deleted, invoice payment_failed, etc.
- M3. Plan tiers (FREE / STARTER / PRO / ENTERPRISE) with quotas (workspaces, users, posts/mo, AI tokens/mo).
- M4. Quota enforcement middleware; 402 Payment Required when exceeded.
- M5. Frontend billing page: current plan + usage gauges + upgrade CTAs + portal embed.
- M6. Email notifications on plan changes + payment failures.

#### Agent N — `social-platforms-agent`
**Owns:** `routes/oauth/{linkedin,twitter,facebook,instagram}.js`, `services/publisher.js`.
**Tasks:**
- N1. Migrate LinkedIn from `/v2/ugcPosts` to `/rest/posts` (per audit P1).
- N2. Validate existing Twitter PKCE + per-call cost tracking; surface cost in UI.
- N3. Build Facebook Page OAuth + posting via Graph API (page tokens, image upload, Marketplace listing where applicable).
- N4. Build Instagram Business OAuth + posting (linked-Page requirement, container-then-publish flow, Reels support).
- N5. Per-platform rate-limit accounting (Redis token bucket per workspace × platform).
- N6. Failure UI: surface specific platform errors to users with actionable guidance.

#### Agent O — `analytics-ingest-agent`
**Owns:** `services/analytics-fetcher.js`, `queue/workers/fetch-analytics.js`, `queue/workers/recompute-audience.js`.
**Tasks:**
- O1. Per-platform metrics fetcher (LinkedIn, X, FB, IG); writes to `AnalyticsData`.
- O2. Nightly BullMQ scheduler enqueues fetch jobs per connected platform per workspace.
- O3. Audience-insights computer: age buckets, gender split, geos, interests, best post hours.
- O4. Frontend dashboards (recharts): KPI cards, engagement trends, reach trends, top-posts table.
- O5. Per-campaign analytics view.

#### Agent P — `voice-agent-agent`
**Owns:** `routers/voice.py` in AI engine, `src/components/siri.tsx` enhancements.
**Tasks:**
- P1. Whisper (or Whisper-large-v3 self-hosted) audio → text endpoint.
- P2. Intent classifier (Haiku 4.5 with structured output): page-aware action registry.
- P3. Tool dispatch (LangChain tools): create_campaign, reschedule_post, regenerate_post, approve_post, navigate_to, etc.
- P4. TTS reply (OpenAI TTS / ElevenLabs).
- P5. Per-page intent overlays in `siri.tsx` (different action lists by route).
- P6. Confirmation flow when confidence < 0.85.

#### Agent Q — `assets-library-agent`
**Owns:** `app/[lang]/app/[workspaceSlug]/library/*`, asset CRUD + recycling rules.
**Tasks:**
- Q1. Library page: grid + filters (type/tag/date) + visual-similarity search (embedding query).
- Q2. Asset CRUD with tagging.
- Q3. Recycling rules: "republish to LI weekly", "include in next campaign of category X".
- Q4. Brand-locked image-gen integration (style refs + color/logo persistence) wired into post-generation graph.

#### Agent R — `exports-agent`
**Owns:** export endpoints + UI buttons.
**Tasks:**
- R1. Strategy PDF (React-PDF or puppeteer).
- R2. Content Calendar PDF (paginated by week).
- R3. Captions CSV (per-platform with hashtags + scheduled times).
- R4. "Copy formatted text" per post.
- R5. "Publish now" button.

### Wave 5 — Final integration + smoke (sequential)

#### Agent L — `integration-smoke-agent`
**Owns:** end-to-end smoke test, README updates, deployment notes, AI eval suite.
**Tasks:**
- L1. Playwright smoke: signup → create workspace → upload brochure → Quick Start → see strategy → approve → see posts on calendar → trigger publish → verify on platform.
- L2. AI eval suite: 50-pair regression set in LangSmith (input → expected output type).
- L3. Update root `README.md` for all three repos with new architecture.
- L4. `DEPLOYMENT.md` covering Vercel + Render/Railway + Modal + Upstash + Atlas Vector index + Stripe webhook setup.
- L5. Cost-tracking smoke: run a real 80-post campaign; confirm <$1.50 spend with caching active.
- L6. Generate post-execution diff summary + remaining-task list for user review.

---

## 5. Dependencies (Gantt-style)

```
Wave 1 (sequential — gates everything)
  Agent A (schema + backfill + seeds) ─┐
  Agent B (auth + tenant + JWT)        ─┴──► gates Waves 2/3/4

Wave 2 (parallel — backend infra)
  Agent C (backend routes restructure + Zod + rate limit)
  Agent D (BullMQ + Redis + 7 queues)
  Agent E (FastAPI + LangGraph + RAG + ingest + retrieval + caches + model router)
  Agent F (pino + Sentry + secrets + healthz + dashboards)

Wave 3 (parallel — frontend pages, runs after C scaffolds routes)
  Agent G (workspace shell + brand + members + billing UI shell)
  Agent H (Page 1 — Brief Input + Quick Start button)
  Agent I (Page 2 — Strategy Output)
  Agent J (Page 3 — Content Creation + calendar + version control + comments)

Wave 4 (parallel — full feature integrations, needs Wave 2 + 3 done)
  Agent K (Quick Start REAL — web research, autonomous flow)
  Agent M (Stripe billing + webhooks + quotas)
  Agent N (LinkedIn + X + FB + IG OAuth + posting)
  Agent O (Analytics ingest + audience insights + dashboards)
  Agent P (Voice agent + intent classifier + tool dispatch)
  Agent Q (Assets library + recycling + brand-locked image gen)
  Agent R (Exports — PDF + CSV + Publish now)

Wave 5 (sequential — final)
  Agent L (smoke test + AI evals + docs + cost smoke)
```

**Realistic execution.** Wave 1 takes ~20-25% of session wall-clock. Wave 2 collapses to the cost of the slowest agent (E, the AI engine — most code). Wave 3 collapses similarly to its slowest agent. Wave 4 is the longest by far — seven agents working on real integrations with external services (Stripe, Meta APIs). Wave 5 is short.

For one continuous session: expect Waves 1–3 + ~30-50% of Wave 4 (best-case Quick Start + Stripe shell + LinkedIn-rest migration). The other Wave 4 work — FB/IG OAuth + posting, real analytics ingestion, voice intent registry, exports — typically needs follow-up sessions because they involve external API setup (FB App Review, Stripe webhook secret rotation, etc.) that cannot be completed by an agent alone.

---

## 6. File Ownership Map (conflict avoidance)

| Path | Owner |
|---|---|
| `prisma/schema.prisma` (both repos), `scripts/backfill-*.ts`, seed scripts | A |
| `src/auth/*`, `src/lib/prisma.ts`, `src/lib/axios.ts` (frontend) | B |
| `deal-ai-server/src/routes/*`, `deal-ai-server/src/lib/validators/*` | C |
| `deal-ai-server/src/queue/*`, `deal-ai-server/src/index.js` (cron lines only) | D |
| `TakamolAdvancedAI/**` (full Python repo) | E |
| `*/lib/logger.js`, `*/scripts/rotate-secrets.sh`, `.env.example`, `*/healthz` route | F |
| `src/app/[lang]/app/layout.tsx`, `src/app/[lang]/app/workspaces/*`, `src/app/[lang]/app/[workspaceSlug]/{layout,brand,members,billing,settings}/*`, `src/components/workspace-switcher.tsx`, `src/components/brand-form.tsx`, `src/components/members-table.tsx`, `src/components/notifications-panel.tsx` | G |
| `src/app/[lang]/app/[workspaceSlug]/campaigns/new/*`, `src/components/template-gallery.tsx`, `src/components/template-form-renderer.tsx`, `src/components/guided-brief-flow.tsx`, `src/components/file-upload-zone.tsx`, `src/components/design-guidelines-form.tsx`, `src/components/content-style-selector.tsx`, `src/components/quick-start-button.tsx` | H |
| `src/app/[lang]/app/[workspaceSlug]/campaigns/[campaignId]/strategy/*`, `src/components/strategy-table.tsx`, `src/components/swot-grid.tsx`, `src/components/smart-suggestions.tsx`, `src/components/strategy-preview.tsx` | I |
| `src/app/[lang]/app/[workspaceSlug]/calendar/*`, `src/app/[lang]/app/[workspaceSlug]/campaigns/[id]/posts/*`, `src/components/calendar-view.tsx`, `src/components/post-card.tsx`, `src/components/post-detail-drawer.tsx`, `src/components/text-on-visual-editor.tsx`, `src/components/caption-variations.tsx`, `src/components/time-recommendation.tsx`, `src/components/brand-elements-panel.tsx`, `src/components/version-history.tsx`, `src/components/post-comments.tsx`, `src/components/exports-menu.tsx` | J |
| `src/app/[lang]/app/[workspaceSlug]/quick-start/*`, stub endpoint route | K |
| `tests/*`, `README.md` (all three), `DEPLOYMENT.md` | L |

Shared files (`package.json`, `next.config.mjs`) get serialized edits — Agent A finalizes deps before Wave 2 starts.

---

## 7. Acceptance Criteria

- [ ] All Wave-1 schema migrations applied; backfill ran cleanly; existing user can sign in and see their migrated workspace.
- [ ] Old auth header rejected (returns 401); JWT-cookie path works end-to-end.
- [ ] Every list endpoint scoped to workspace; cross-tenant probes return 404 or empty.
- [ ] BullMQ delayed publish replaces 30-second cron; smoke test confirms a scheduled post fires within 1 minute of `scheduledFor`.
- [ ] FastAPI `/v1/healthz` returns 200; existing Flask endpoints still callable via FastAPI proxy paths.
- [ ] Document upload (PDF) → embeddings written to MongoDB → vector search returns the document chunk for a relevant query.
- [ ] LangGraph campaign-planning graph executes end-to-end with mocked LLM responses (real LLM gated until Phase 2 due to cost guardrails).
- [ ] Pino logs to stdout in JSON; no PII in sample output.
- [ ] Sentry receives a test exception.
- [ ] Frontend `[workspaceSlug]` routes all render; workspace switcher works.
- [ ] Page 1 — user can pick a template, fill the form, upload a file (file appears in document list), submit. New campaign created.
- [ ] Page 2 — strategy table renders with stub data; SWOT, suggestions, preview render; Approve advances to Page 3.
- [ ] Page 3 — calendar renders with stub posts; post-detail drawer opens; visual editor opens; caption variations button calls AI engine and returns 3 mock variations.
- [ ] Quick Start button calls stub endpoint and shows animated progress.
- [ ] Playwright smoke passes on staging.
- [ ] No regressions on existing scheduled-post-publishing path (LinkedIn/X still work).

---

## 8. Risks During Execution

1. **Prisma schema drift across three repos.** Agent A must update both `prisma/schema.prisma` files identically and validate before Wave 2 begins. Mitigation: Agent A produces a hash; downstream agents verify match.
2. **MongoDB Atlas Vector Search index propagation.** Index creation can take minutes on Atlas. Mitigation: Agent E creates index early in its task list; subsequent agents poll for readiness.
3. **Frontend route conflict** between old `/dashboard/*` and new `/app/[workspaceSlug]/*`. Mitigation: Agent G keeps old routes alive with redirects to new structure.
4. **Existing E2E broken.** Migration of LinkedIn/X publish path must not regress. Mitigation: Agent D writes a test that publishes a post to a sandbox account before declaring done.
5. **Agent context limits.** Long-running agents may exceed their context. Mitigation: each agent's task list is bounded; complex agents (E, J) split into sub-tasks.
6. **Conflicting `package.json` edits.** Mitigation: Agent A consolidates dependency updates before Wave 2 starts; later agents only add new deps within their owned subtree.

---

## 9. Approval Checklist (for the user)

Please confirm:
- [ ] **Scope**: Phase 1 = foundations + thin user-visible slice as defined in §3. Real billing, real Quick Start, real analytics ingest, REAM-pack features deferred to Phase 2. **Yes / Adjust**
- [ ] **Vertical-pack handling**: existing real-estate data migrates with `verticalPacks: [REAL_ESTATE]` so current users keep working; new signups default to no pack (generic Allrounder). **Yes / Adjust**
- [ ] **AI engine framework**: LangGraph + LangChain on FastAPI. **Yes / Adjust**
- [ ] **Vector storage**: MongoDB Atlas Vector Search (no separate Pinecone). **Yes / Adjust**
- [ ] **Job queue**: BullMQ + Redis (Upstash). **Yes / Adjust**
- [ ] **Auth**: JWT-in-HTTP-only-cookie replacing base64 user header. **Yes / Adjust**
- [ ] **Sub-agent waves**: 12 agents across 4 waves as defined in §4. **Yes / Adjust**
- [ ] **File ownership**: per §6. **Yes / Adjust**
- [ ] **Execute Phase 1 in one session**: starts when you reply with "approved" or equivalent.

After approval the agents launch. Wave 1 runs sequentially (~30% of session); Waves 2 and 3 launch in parallel; Wave 4 closes out with smoke + docs. Expect a long execution window — multiple hours of agent work for a Phase 1 of this size.

---

*End of Phase 1 Execution Plan. Updated May 2026.*
