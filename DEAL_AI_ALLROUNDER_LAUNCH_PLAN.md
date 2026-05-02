# Deal AI → Allrounder — Launch Plan (Frontend + Backend + AI Engine)

> **Prepared** May 2026. **Goal** ship Allrounder v1 (industry-agnostic AI marketing OS) as the new base product, with Deal AI's real-estate features ported to a `vertical: REAL_ESTATE` pack. **Companion to** `DEAL_AI_AUDIT_AND_ROADMAP.md` (April 2026 audit) and `DEAL_AI_MARKET_STUDY_AND_COMPETITIVE_STRATEGY.md` (May 2026 market study).

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Vision](#2-architecture-vision)
3. [Data Model Migration](#3-data-model-migration)
4. [Multi-Tenancy & Auth](#4-multi-tenancy--auth)
5. [Frontend Plan (Next.js)](#5-frontend-plan-nextjs)
6. [Backend Plan (Express)](#6-backend-plan-express)
7. [AI Engine Plan (Python + LangChain / LangGraph)](#7-ai-engine-plan-python--langchain--langgraph)
8. [Document Storage & RAG Strategy](#8-document-storage--rag-strategy)
9. [Token Optimization & Cost Control](#9-token-optimization--cost-control)
10. [Job Queue & Scheduling](#10-job-queue--scheduling)
11. [Observability, Security, Operations](#11-observability-security-operations)
12. [Mandatory vs Good-to-Have Features](#12-mandatory-vs-good-to-have-features)
13. [Phased Milestones](#13-phased-milestones)
14. [Open Questions & Risks](#14-open-questions--risks)
15. [Sources](#15-sources)

---

## 1. Executive Summary

**What we're building.** Allrounder is the base AI marketing OS — workspace + brand profile + AI strategy → campaign → posts/images → schedule → publish → analytics, industry-agnostic, AR + EN, voice-enabled, multi-tenant. Deal AI's existing real-estate features become a `verticalPack: REAL_ESTATE` add-on (REAM features layer on top in Phase 2).

**Three primary technical bets.**
1. **Workspace-centric data model.** Rip out RE-specific schema (`Project` + `Property` + `StudyCase`) in favor of generic `Workspace` + `BrandProfile` + `Campaign` + `Strategy` + `Post` + `Asset` + `Analytics` with extension tables for vertical packs. Every model gets a `workspaceId` and Prisma middleware auto-injects it.
2. **AI orchestration on LangGraph (with LangChain underneath).** The AI engine becomes a graph of agents: Ingestor → Strategist → Campaign Planner → Content Writer → Image Director → Scheduler → Publisher → Optimizer. State is persisted between steps; humans-in-the-loop checkpoints survive restarts. LangChain handles tool/LLM integration; LangGraph handles flow.
3. **Document-as-grounded-knowledge via RAG.** Every uploaded brochure / catalog / menu / spec sheet / Excel goes through an ingestion pipeline (Unstructured.io for layout + tables → page-level chunks → embeddings → MongoDB Atlas Vector Search). The AI engine grounds every generation in retrieved chunks — eliminating hallucination, locking outputs to real document content, and slashing prompt token usage by 60–80%.

**Three primary cost bets.**
1. **Anthropic prompt caching + OpenAI implicit caching** for static system prompts and brand-voice prefixes. Anthropic 5-min cache reads at 0.1× base price; observed savings 70–90% on real workloads.
2. **Semantic caching** (Redis + embeddings) on top of prompt caching to eliminate the ~60% of inbound calls that repeat in meaning. Stacks with prompt caching for compounding savings.
3. **Model routing.** Cheap models (Haiku 4.5 / GPT-4o-mini) for triage + extraction; expensive models (Opus 4.7 / Claude Sonnet 4.6) for strategy + creative writing only. Combined with caching, 40–60% cost reduction is realistic.

**Launch shape.** Allrounder v1 ships without REAM-specific features (WhatsApp BSP, REGA stamping, portal sync stay in Phase 2). Mandatory v1 covers: workspace + brand memory + ingestion + RAG + strategy + campaign + content + image + calendar + auto-publish + approval + audience insights + voice + AR/EN. Good-to-have items are scoped but not blockers.

**Headline numbers.** Engineering effort estimate: ~16–20 dev-weeks of focused work for v1 (3-person team in 6 calendar months). Cost target: <$0.40 of LLM spend per generated campaign at 100 RPS steady-state with caching + routing in place.

---

## 2. Architecture Vision

### 2.1 Three-tier service map

```
┌──────────────────────────────────────────────────────────────┐
│  Frontend — Next.js 14 App Router (deal-ai repo)             │
│  ─ App Router with [workspaceSlug] segment                   │
│  ─ Server Actions for mutations                              │
│  ─ Lucia auth (already wired)                                │
│  ─ Konva editor (already wired)                              │
│  ─ Voice agent (Siri component, already wired)               │
└─────────────────┬────────────────────────────────────────────┘
                  │ REST + websocket (live progress)
┌─────────────────┴────────────────────────────────────────────┐
│  Backend API — Express (deal-ai-server repo)                 │
│  ─ Auth middleware (JWT, signed)                             │
│  ─ Tenant middleware (workspaceId scoping via Prisma)        │
│  ─ Route handlers: workspace, brand, doc, campaign, post,    │
│    asset, analytics, billing, oauth                          │
│  ─ BullMQ job dispatcher → Worker pool                       │
│  ─ Webhook receivers (Stripe, OAuth callbacks, social)       │
└─────────────────┬────────────────────────────────────────────┘
                  │ HTTP + queue
┌─────────────────┴────────────────────────────────────────────┐
│  AI Engine — Python (TakamolAdvancedAI repo)                 │
│  ─ FastAPI (replace Flask)                                   │
│  ─ LangGraph orchestrator (workflow state machines)          │
│  ─ LangChain (tool/LLM/embedding wrappers)                   │
│  ─ RAG pipeline (Unstructured → chunks → MongoDB Vector)     │
│  ─ Semantic cache (Redis + embeddings)                       │
│  ─ Model router (Haiku → Sonnet → Opus / GPT-4o-mini → 4o)   │
└─────────────────┬────────────────────────────────────────────┘
                  │ Pulls embeddings + retrieves
┌─────────────────┴────────────────────────────────────────────┐
│  Storage layer                                               │
│  ─ MongoDB Atlas (relational + Vector Search index)          │
│  ─ Redis (BullMQ queue + semantic cache + OAuth state)       │
│  ─ DigitalOcean Spaces (raw assets: PDFs, images, videos)    │
└──────────────────────────────────────────────────────────────┘
```

### 2.2 Why this architecture

- **Three-repo split stays.** Each tier deploys independently. Frontend on Vercel (already), Backend on DO/Railway, AI engine on DO/Modal. No coupling beyond REST + queue.
- **MongoDB Atlas remains the single store.** Atlas Vector Search lets us colocate vectors with relational data — no separate Pinecone instance, no double infrastructure cost. Within the M10+ tier we already use, vector search is included.
- **LangGraph for orchestration, LangChain for plumbing.** LangGraph handles loops, branches, retries, human-in-the-loop pauses, durable state. LangChain handles tool calls, LLM wrappers, embeddings, prompt templates. Industry consensus in 2026: use both.
- **BullMQ replaces node-cron.** Multi-worker, Redis-backed, persistent, horizontally scalable. The current 30-second cron is single-instance and unsafe at scale per the audit.
- **FastAPI replaces Flask.** Async-first, OpenAPI docs auto-generated, typed request/response, plays well with LangGraph's async API. Migration is incremental — keep existing endpoints behind the same URLs.

### 2.3 Vertical-pack pattern

A "vertical pack" is a named set of:
- Extension tables (e.g., `Property`, `Owner`, `Lead`, `PortalListing` for `REAL_ESTATE`)
- Prompt templates (e.g., `listing_description.jinja`, `roi_case_study.jinja` for `REAL_ESTATE`)
- Integration connectors (Bayut, PropertyFinder for `REAL_ESTATE`)
- Compliance helpers (PDPL ledger, REGA FAL stamp for `REAL_ESTATE`)
- UI panels (lazy-loaded React modules)

Workspace records carry `verticalPacks: VerticalPack[]`. The AI engine receives the pack list with each request and selects the right prompt template + extraction schema. New packs = new pack folder + register in pack registry; no core schema changes.

---

## 3. Data Model Migration

### 3.1 Target schema (Prisma)

```prisma
// New core models — Workspace + BrandProfile + Campaign + Strategy + Post + Asset

model Workspace {
  id            String         @id @map("_id")
  slug          String         @unique
  name          String
  ownerId       String         @map("owner-id")
  verticalPacks VerticalPack[] @default([])  // [REAL_ESTATE, F_AND_B, RETAIL...]

  region        Region    @default(GLOBAL)  // KSA, UAE, EU for data residency
  plan          PlanTier  @default(FREE)
  members       Member[]

  brandProfile  BrandProfile?
  documents     Document[]
  campaigns     Campaign[]
  strategies    Strategy[]
  posts         Post[]
  assets        Asset[]
  analyticsData AnalyticsData[]
  audienceInsights AudienceInsights[]

  // Per-pack extensions (sparse)
  reProperties  Property[]      // populated only when REAL_ESTATE pack active
  reOwners      Owner[]
  reLeads       Lead[]
  rePortalListings PortalListing[]

  createdAt     DateTime @default(now()) @map("created-at")
  deletedAt     DateTime? @map("deleted-at")

  @@map("workspaces")
}

model Member {
  id           String     @id @map("_id")
  workspaceId  String     @map("workspace-id")
  userId       String     @map("user-id")
  role         MemberRole @default(EDITOR)  // OWNER | ADMIN | EDITOR | APPROVER | VIEWER
  invitedAt    DateTime   @default(now())
  acceptedAt   DateTime?

  workspace    Workspace  @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  user         User       @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([workspaceId, userId])
  @@map("members")
}

model BrandProfile {
  id           String   @id @map("_id")
  workspaceId  String   @unique @map("workspace-id")

  brandName    String
  logoUrl      String?
  colors       Json     // {primary, secondary, accent, neutral}
  fonts        Json     // {heading, body}
  toneVoice    String   // friendly | formal | luxury | playful | authoritative
  toneSamples  String[] // user-supplied "this sounds like us" examples
  bannedWords  String[]
  industry     String?
  targetAudience String?
  brandValues  String[]
  positioning  String?  // 1-paragraph
  competitors  String[]

  // Vector embeddings of voice samples + about-us, used at generation time
  voiceEmbedding Float[]?  // 1536-dim or 3072-dim, indexed via Atlas Vector Search

  workspace    Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  @@map("brand-profiles")
}

model Document {
  id           String       @id @map("_id")
  workspaceId  String       @map("workspace-id")
  uploaderId   String       @map("uploader-id")

  title        String
  fileType     DocumentType  // PDF | EXCEL | DOCX | IMAGE | URL | RAW_TEXT
  s3Key        String        @map("s3-key")
  sizeBytes    Int
  pageCount    Int?

  // Ingestion status
  status       DocumentStatus @default(QUEUED)  // QUEUED | PARSING | EMBEDDING | READY | FAILED
  parserUsed   String?        @map("parser-used")
  errorMsg     String?        @map("error-msg")

  // Extracted structured payload (vertical-pack aware)
  extractedJson Json?         @map("extracted-json")
  extractionConfidence Float? @map("extraction-confidence")

  chunks       DocumentChunk[]
  workspace    Workspace      @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  createdAt    DateTime  @default(now()) @map("created-at")
  deletedAt    DateTime? @map("deleted-at")

  @@index([workspaceId])
  @@map("documents")
}

model DocumentChunk {
  id            String  @id @map("_id")
  documentId    String  @map("document-id")
  workspaceId   String  @map("workspace-id")  // denormalized for fast filtering

  chunkIndex    Int     @map("chunk-index")
  pageNumber    Int?    @map("page-number")
  contentText   String  @map("content-text")
  contentType   ChunkType  // TEXT | TABLE | IMAGE_CAPTION | HEADING
  embedding     Float[] // text-embedding-3-large (3072) or -small (1536)

  // Optional figure/table reference
  figureUrl     String?

  document      Document @relation(fields: [documentId], references: [id], onDelete: Cascade)

  @@index([documentId])
  @@index([workspaceId])
  @@map("document-chunks")
}

model Campaign {
  id            String   @id @map("_id")
  workspaceId   String   @map("workspace-id")
  brandProfileId String? @map("brand-profile-id")

  name          String
  goal          CampaignGoal  // AWARENESS | ENGAGEMENT | CONVERSION | LAUNCH | RETENTION
  startDate     DateTime
  endDate       DateTime
  status        CampaignStatus  @default(DRAFT)  // DRAFT | ACTIVE | PAUSED | COMPLETED

  durationWeeks Int      @default(4) @map("duration-weeks")
  postFrequency Int      @default(5) @map("post-frequency")  // posts/week
  platforms     PLATFORM[]

  // Linked source documents (RAG grounding)
  sourceDocs    String[] @map("source-docs")  // Document.id[]

  strategy      Strategy?
  posts         Post[]
  workspace     Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  createdAt     DateTime  @default(now()) @map("created-at")
  deletedAt     DateTime? @map("deleted-at")

  @@index([workspaceId, status])
  @@map("campaigns")
}

model Strategy {
  id           String   @id @map("_id")
  campaignId   String   @unique @map("campaign-id")
  workspaceId  String   @map("workspace-id")  // denorm

  audience     Json     // structured audience profile
  pillars      Json     // content pillars [{name, weight, examples}]
  tonalGuide   Json     // per-platform tone overrides
  cadenceJson  Json     @map("cadence-json")  // weekly map
  kpiTargets   Json     @map("kpi-targets")   // {reach, engagement, leads, ROI}

  // Generation provenance
  modelUsed    String   @map("model-used")
  promptTokens Int      @map("prompt-tokens")
  completionTokens Int  @map("completion-tokens")
  generatedAt  DateTime @default(now()) @map("generated-at")

  campaign     Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  @@map("strategies")
}

model Post {
  id             String  @id @map("_id")
  workspaceId    String  @map("workspace-id")
  campaignId     String? @map("campaign-id")
  brandProfileId String? @map("brand-profile-id")

  platform       PLATFORM
  contentType    ContentType  // TEXT | IMAGE | CAROUSEL | VIDEO_REEL | STORY | THREAD
  caption        String
  hashtags       String[]
  mediaIds       String[]     @map("media-ids")  // Asset.id[]

  status         PostStatus  @default(DRAFT)  // DRAFT | NEEDS_APPROVAL | APPROVED | SCHEDULED | PUBLISHED | FAILED | CANCELED
  scheduledFor   DateTime?   @map("scheduled-for")
  publishedAt    DateTime?   @map("published-at")
  externalId     String?     @map("external-id")  // platform's post id for analytics

  // Approval trail
  approvedBy     String?  @map("approved-by")
  approvedAt     DateTime? @map("approved-at")
  rejectedReason String?  @map("rejected-reason")

  // Failure / retry
  failureReason  String?  @map("failure-reason")
  retryCount     Int      @default(0) @map("retry-count")

  // Generation provenance
  generationId   String?  @map("generation-id")  // links to AI run
  modelUsed      String?  @map("model-used")
  cacheHit       Boolean  @default(false) @map("cache-hit")
  tokensUsed     Int?     @map("tokens-used")

  campaign       Campaign? @relation(fields: [campaignId], references: [id], onDelete: SetNull)
  workspace      Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  createdAt      DateTime  @default(now()) @map("created-at")
  deletedAt      DateTime? @map("deleted-at")

  @@index([workspaceId, scheduledFor, status])
  @@index([campaignId])
  @@map("posts")
}

model Asset {
  id           String   @id @map("_id")
  workspaceId  String   @map("workspace-id")
  type         AssetType  // IMAGE | VIDEO | LOGO | TEMPLATE | FRAME

  s3Key        String   @map("s3-key")
  thumbnailKey String?  @map("thumbnail-key")
  width        Int?
  height       Int?
  durationSec  Float?   @map("duration-sec")

  // Origin
  origin       AssetOrigin  // UPLOADED | AI_GENERATED | EDITED | TEMPLATE
  prompt       String?      // for AI-generated
  modelUsed    String?      @map("model-used")
  parentAssetId String?     @map("parent-asset-id")  // for edits

  // Tagging for search + reuse
  tags         String[]
  brandSafe    Boolean  @default(true) @map("brand-safe")
  embedding    Float[]?  // for visual similarity search

  workspace    Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  createdAt    DateTime  @default(now()) @map("created-at")
  deletedAt    DateTime? @map("deleted-at")

  @@index([workspaceId, type])
  @@map("assets")
}

model AnalyticsData {
  id             String   @id @map("_id")
  workspaceId    String   @map("workspace-id")
  postId         String?  @map("post-id")

  platform       PLATFORM
  metricsAt      DateTime @map("metrics-at")
  reach          Int      @default(0)
  impressions    Int      @default(0)
  engagement     Int      @default(0)
  clicks         Int      @default(0)
  shares         Int      @default(0)
  comments       Int      @default(0)
  conversions    Int      @default(0)

  rawJson        Json?    @map("raw-json")  // full platform payload

  workspace      Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  @@index([workspaceId, platform, metricsAt])
  @@map("analytics-data")
}

model AudienceInsights {
  id           String   @id @map("_id")
  workspaceId  String   @map("workspace-id")
  platform     PLATFORM
  computedAt   DateTime @map("computed-at")

  ageBuckets   Json
  genderSplit  Json
  topGeos      Json
  topInterests Json
  bestPostHours Json    @map("best-post-hours")

  workspace    Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  @@index([workspaceId, platform])
  @@map("audience-insights")
}

// Existing User stays. PlatformUsage extended for per-workspace billing.
// Existing Platform table extended with workspaceId.
```

### 3.2 Migration steps

1. **Snapshot live data** (Prisma `dump` to JSON via custom script — MongoDB doesn't have prisma-migrate fully, so snapshot manually).
2. **Add new models** alongside existing ones; do not drop old tables yet.
3. **Backfill script.** For every existing user, create a `Workspace { ownerId, slug: <user.email-derived> }`. Move `Project` → `Campaign` (1:1 mapping with carry-over of name/description). Move `StudyCase` → `Strategy + Document` (case-study text becomes a synthetic Document with auto-generated chunks; the structured ROI/audience fields become `Strategy.kpiTargets` / `Strategy.audience`). Move `Post` (existing) → `Post` (new) with `workspaceId` populated.
4. **Add `verticalPacks: [REAL_ESTATE]` to migrated workspaces.** Property + Owner + Lead + PortalListing tables stay, but get `workspaceId` columns + indexes.
5. **Cut over reads** in backend routes one at a time; keep old routes alive but deprecated for 30 days.
6. **Drop old tables** after one full month of clean operation.

This is a 2–3 dev-week migration plus a week of monitoring.

---

## 4. Multi-Tenancy & Auth

### 4.1 Tenancy model: Shared-table + tenantId (workspaceId)

Per [WorkOS](https://workos.com/blog/developers-guide-saas-multi-tenant-architecture) and Prisma multi-tenant guides, the dominant 2026 pattern for SMB SaaS scaling to thousands of tenants is **shared-table + tenant_id middleware**. We follow this.

**Implementation:**
- Every workspace-owned model carries `workspaceId String`.
- Prisma client extension at `db/client.ts` injects `where: { workspaceId: ctx.workspaceId }` on every find/update/delete; refuses inserts that don't carry a workspaceId.
- Express middleware `requireWorkspace(req, res, next)` resolves `:workspaceSlug` URL param → workspace + checks membership + sets `req.ctx.workspaceId` and `req.ctx.role`.
- All AI engine calls receive workspaceId + role as JWT claims; AI engine uses workspaceId for vector search filter and asset retrieval.

**Hybrid for enterprise (later).** PIF giga-projects + KSA enterprise customers may demand isolated cluster. Add a `Workspace.dedicatedCluster: String?` field; route those to a separate Atlas cluster via Prisma multi-DB pattern when they upgrade.

### 4.2 Auth replacement

The existing audit's P0 includes "sign user-identity header." Implementation:

- Frontend keeps Lucia (Google + credentials) for session establishment.
- On session establishment, frontend mints a **JWT** (HS256 with secret rotation OR RS256 with public key) carrying `{userId, sessionId, exp}`. Stored in HTTP-only Secure SameSite=Lax cookie.
- Backend middleware verifies JWT signature; rejects if tampered. Resolves `:workspaceSlug` → workspace membership → role.
- AI engine receives the same JWT verbatim from backend → verifies → uses claims.
- OAuth state moves from `Map` in-memory to `OAuthState` Prisma model with TTL job.

**Roles:** `OWNER` (billing + delete workspace), `ADMIN` (manage members + integrations + brand), `EDITOR` (create/edit content), `APPROVER` (approve/reject content), `VIEWER` (read only). Role checks at backend route level + UI hides controls.

### 4.3 Billing (Stripe)

- Stripe Customer = User (top-level), Stripe Subscription = Workspace.
- Plan tiers (suggested): `FREE` (1 workspace, 50 posts/mo, 1 user), `STARTER` ($29/mo: 5 workspaces, 500 posts/mo, 3 users), `PRO` ($99/mo: 25 workspaces, 5000 posts/mo, 10 users), `ENTERPRISE` (custom). Workspace `plan` enum drives quotas.
- Webhook endpoint at `/api/webhooks/stripe` handles `customer.subscription.{created,updated,deleted}` + `invoice.payment_failed`. Updates `Workspace.plan` + `User.stripeCustomerId`.
- Quota enforcement at route level (e.g., post-create checks `Workspace.plan` quota against `PlatformUsage` rolling-month count, returns 402 Payment Required if exceeded).
- Reference: [Stripe + Next.js App Router guide](https://medium.com/@josh.ferriday/intergrating-stripe-payments-with-next-app-router-9e9ba130f101).

---

## 5. Frontend Plan (Next.js)

### 5.1 Routing structure (App Router)

```
app/
├── [lang]/
│   ├── (marketing)/
│   │   ├── page.tsx                          // landing
│   │   ├── pricing/page.tsx
│   │   └── features/page.tsx
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── verify/[token]/page.tsx
│   └── app/
│       ├── workspaces/page.tsx              // workspace switcher / create
│       ├── [workspaceSlug]/
│       │   ├── layout.tsx                   // tenant context provider
│       │   ├── page.tsx                     // dashboard (KPIs)
│       │   ├── brand/page.tsx               // BrandProfile editor
│       │   ├── documents/                   // upload + list
│       │   │   ├── page.tsx
│       │   │   └── [docId]/page.tsx         // chunk viewer + extraction preview
│       │   ├── campaigns/
│       │   │   ├── page.tsx                 // list + filters
│       │   │   ├── new/page.tsx             // wizard
│       │   │   └── [campaignId]/
│       │   │       ├── page.tsx             // overview + strategy
│       │   │       ├── strategy/page.tsx
│       │   │       ├── posts/page.tsx
│       │   │       └── analytics/page.tsx
│       │   ├── calendar/page.tsx            // drag-drop scheduling
│       │   ├── library/page.tsx             // assets + recycling queue
│       │   ├── inbox/page.tsx               // (good-to-have v1) DM/comments
│       │   ├── analytics/page.tsx           // workspace-level KPIs
│       │   ├── members/page.tsx
│       │   ├── billing/page.tsx
│       │   └── settings/page.tsx
│       └── (editors)/
│           └── editors/
│               ├── images/[assetId]/page.tsx     // Konva (existing, reuse)
│               └── videos/[assetId]/page.tsx     // (good-to-have v1)
```

### 5.2 Component reuse

The existing component library (90+ components per glob) is mostly reusable as-is. Specifically:

- ✅ **Reuse:** all `ui/*` (Radix/shadcn primitives), `data-table`, `datetime-picker`, `multiple-selector`, `image-cropper`, `image-editor` (Konva), `siri` (voice), `dashboard-layout`, `side-nav`, `sidebar-nav`, locale switcher, mode toggler, theme provider, calendar.
- ♻️ **Rename + generalize:** `project-form` → `campaign-form`, `case-study-form` → `strategy-form`, `property-form` → `vertical-extension-form` (becomes a vertical-pack-aware module).
- 🆕 **New:** workspace switcher, brand-profile editor, document uploader (drag-drop multi-file with progress), document chunk viewer, campaign wizard (multi-step: goal → docs → audience → cadence), approval-queue UI, drag-drop calendar (use `react-big-calendar` + `react-dnd`), inbox UI (good-to-have), analytics dashboards (use existing `recharts`), members-and-roles page, billing page (Stripe Customer Portal embed), notifications panel.
- 🗑 **Delete after migration:** `bin-projects-table`, `bin-properties-table` (keep behavior, generalize to `bin-table`), `project-create-button` etc. (replace with workspace-aware variants).

### 5.3 Critical UI flows

**Onboarding (target: <2 min to first campaign).**
1. Sign up → email verify (or Google).
2. Create first workspace (slug + name + industry hint).
3. Inline doc upload widget — accept PDF/Excel/DOCX/URL; immediate "Generating preview…" animation.
4. While ingestion runs (async), the UI surfaces: "We extracted 12 properties / a 4-page menu / 18 product variants. Confirm?" — confirm proceeds to campaign wizard.
5. Campaign wizard: **goal** (single-click presets) → **platforms** (multi-select with auto-recommend per goal) → **dates** (defaulted to next 4 weeks) → **review-and-generate**.
6. Strategy + first 5 posts render as draft cards inline within ~30 seconds; remaining posts stream in.
7. User clicks "Approve & schedule" → done.

**Approval workflow.**
- Posts in `NEEDS_APPROVAL` show in a queue panel for users with `APPROVER` role.
- Inline edit-or-approve-or-reject; rejection requires a one-line reason.
- Approver/Editor email notification with action links.

**Calendar.**
- Drag-drop reschedule using `react-big-calendar` + `react-dnd`.
- Per-platform color coding; click post → side-drawer with edit/preview.
- Conflict detection: same platform, same hour → red border with warning tooltip.

**Document uploader.**
- Multi-file drag-drop with progress per file.
- Live status: `Queued` → `Parsing` → `Embedding` → `Ready` (websocket from backend BullMQ events).
- Preview panel after `Ready`: thumbnails of pages + extracted JSON tree + chunk list (debug mode).

### 5.4 Voice agent (Siri component)

The existing `src/components/siri.tsx` is functional. Generalize:
- Strip RE-specific commands ("create villa", etc.); make it intent-aware via a small classifier prompt.
- Add a system prompt section that lists available actions per current page (e.g., on calendar page: "reschedule X to Y", "delete post Z").
- Fallback to a tool-call LLM if intent is ambiguous (Haiku 4.5 or GPT-4o-mini for routing).

### 5.5 Localization & RTL

- Existing AR/EN dual dictionaries + RTL CSS works. Extend dictionaries for new flows (workspace, brand, document, campaign wizard, calendar, inbox, billing, members).
- Add per-workspace **locale preference** (one workspace can be AR-default, another EN-default).
- For dialect support (good-to-have): per-campaign dialect picker (MSA / Saudi / Egyptian / Levantine) — sets a flag passed to AI engine which selects appropriate prompt template.

### 5.6 Real-time updates

- Use **Server-Sent Events** for ingestion progress, AI generation streaming, and post-publish notifications. Cheaper than WebSockets, easier to scale. Pattern: backend emits events to a per-workspace channel, frontend subscribes via `EventSource`.
- For inbox / DM (good-to-have): bidirectional websockets needed; defer to v1.1.

---

## 6. Backend Plan (Express)

### 6.1 Route surface (REST)

```
POST   /api/auth/google                       (Lucia callback)
POST   /api/auth/credentials
POST   /api/auth/session
POST   /api/auth/logout

POST   /api/workspaces                         create
GET    /api/workspaces                         list user's
GET    /api/workspaces/:slug                  detail
PATCH  /api/workspaces/:slug                  update
DELETE /api/workspaces/:slug                  soft-delete (OWNER only)
POST   /api/workspaces/:slug/transfer         transfer ownership

POST   /api/workspaces/:slug/members          invite
PATCH  /api/workspaces/:slug/members/:id      change role
DELETE /api/workspaces/:slug/members/:id

GET    /api/workspaces/:slug/brand            brand profile
PATCH  /api/workspaces/:slug/brand            update (triggers re-embed)

POST   /api/workspaces/:slug/documents        upload (multi-part, async ingestion)
GET    /api/workspaces/:slug/documents        list
GET    /api/workspaces/:slug/documents/:id    detail + chunks
DELETE /api/workspaces/:slug/documents/:id    soft-delete + remove from vector index
POST   /api/workspaces/:slug/documents/:id/reingest   force re-parse

POST   /api/workspaces/:slug/campaigns        create (kicks off generation pipeline)
GET    /api/workspaces/:slug/campaigns
GET    /api/workspaces/:slug/campaigns/:id
PATCH  /api/workspaces/:slug/campaigns/:id
POST   /api/workspaces/:slug/campaigns/:id/regenerate   re-run with new params

GET    /api/workspaces/:slug/campaigns/:id/strategy
PATCH  /api/workspaces/:slug/campaigns/:id/strategy

GET    /api/workspaces/:slug/posts            (filters: status, platform, dateRange)
GET    /api/workspaces/:slug/posts/:id
PATCH  /api/workspaces/:slug/posts/:id
POST   /api/workspaces/:slug/posts/:id/approve
POST   /api/workspaces/:slug/posts/:id/reject
POST   /api/workspaces/:slug/posts/:id/regenerate-image
POST   /api/workspaces/:slug/posts/:id/regenerate-text
POST   /api/workspaces/:slug/posts/bulk-approve
POST   /api/workspaces/:slug/posts/bulk-reschedule

GET    /api/workspaces/:slug/calendar?from&to
GET    /api/workspaces/:slug/library?type&tag
DELETE /api/workspaces/:slug/library/:assetId

GET    /api/workspaces/:slug/analytics?platform&from&to
GET    /api/workspaces/:slug/analytics/audience

GET    /api/workspaces/:slug/billing          subscription + usage + portal link
POST   /api/workspaces/:slug/billing/portal   redirects to Stripe Customer Portal

POST   /api/workspaces/:slug/oauth/:provider/start
GET    /api/workspaces/:slug/oauth/:provider/callback

POST   /api/webhooks/stripe                   (signature verified)
POST   /api/webhooks/social/:provider         (per-platform webhooks)

GET    /api/healthz                           deep health check (DB + Redis + AI + S3)
```

### 6.2 Service layer organization

```
deal-ai-server/src/
├── index.js                    // Express app + middleware chain
├── auth/
│   ├── jwt.js                  // sign + verify
│   ├── middleware.js           // requireAuth, requireWorkspace, requireRole
│   └── lucia-adapter.js        // adapter to existing Lucia
├── routes/
│   ├── auth.js
│   ├── workspaces.js
│   ├── members.js
│   ├── brand.js
│   ├── documents.js
│   ├── campaigns.js
│   ├── strategies.js
│   ├── posts.js
│   ├── library.js
│   ├── analytics.js
│   ├── billing.js
│   ├── oauth/
│   │   ├── linkedin.js
│   │   ├── twitter.js
│   │   ├── facebook.js
│   │   └── instagram.js
│   └── webhooks/
│       ├── stripe.js
│       └── social.js
├── services/
│   ├── ai-client.js            // talks to Python AI engine via REST
│   ├── document-ingest.js      // queues ingestion jobs
│   ├── image-gen.js            // shared rate-limiter (already exists)
│   ├── publisher.js            // platform-specific publish logic
│   ├── analytics-fetcher.js    // pulls platform metrics on schedule
│   ├── stripe.js
│   └── s3.js
├── queue/
│   ├── bullmq.js               // queue connection + worker registration
│   ├── workers/
│   │   ├── ingest-document.js
│   │   ├── generate-strategy.js
│   │   ├── generate-post-batch.js
│   │   ├── publish-post.js
│   │   ├── fetch-analytics.js
│   │   └── recompute-audience.js
│   └── schedulers/             // BullMQ JobSchedulers (replaces node-cron)
│       ├── publish-due.js
│       └── analytics-rollup.js
├── lib/
│   ├── prisma.js               // tenant-scoped Prisma client extension
│   ├── logger.js               // pino + PII redaction
│   ├── error-handler.js
│   ├── validators/             // Zod schemas per route
│   └── locale.js
└── ...
```

### 6.3 Validation + error handling

- **Zod everywhere.** Every route defines a body/query schema; middleware validates → 400 with structured field errors. No more `bodyParser.json({ limit: "100mb" })` without validation.
- **Standard error response.** `{ ok: false, error: { code, message, fields? } }`. Codes are documented in a single `errors.ts` enum.
- **No PII in logs.** `pino` with redact patterns for `password`, `email` (hash if needed for diagnosis), `token`, `phone`.

### 6.4 Migration of existing routes

Keep `/api/projects`, `/api/study-cases`, `/api/posts`, `/api/properties`, etc. as **deprecated thin wrappers** calling the new routes for 30 days. Frontend cuts over to new routes immediately. Old routes return `Deprecation` header pointing to the new endpoint.

---

## 7. AI Engine Plan (Python + LangChain / LangGraph)

### 7.1 Why LangGraph + LangChain

Decision per [LangChain docs](https://www.langchain.com/langgraph) + [2026 frameworks comparison](https://qubittool.com/blog/ai-agent-framework-comparison-2026):
- **LangChain** = tools, LLM wrappers, embeddings, prompt templates, chains.
- **LangGraph** = stateful multi-step orchestration with branches, loops, retries, human checkpoints, persistence.
- Decision tree: if a workflow loops, branches, or persists state → LangGraph. Otherwise → LangChain alone.
- Allrounder's main pipeline (Ingest → Strategize → Plan → Write → Generate Image → Schedule → Publish → Optimize) needs branches (vertical-pack switch), loops (regeneration on user reject), retries (rate-limited image gen), and durability (long-running campaigns) — **LangGraph fits**.

We use **both**. LangChain for tools/LLMs/embeddings; LangGraph for the workflow graphs.

### 7.2 Service migration: Flask → FastAPI + LangGraph

The current `app.py` is 1,930 lines, all inline. Migration target:

```
TakamolAdvancedAI/
├── main.py                     // FastAPI app entry
├── config.py                   // env, model registry
├── routers/
│   ├── ingest.py               // /v1/ingest/document
│   ├── strategy.py             // /v1/strategy/generate
│   ├── campaign.py             // /v1/campaign/plan
│   ├── content.py              // /v1/content/generate
│   ├── image.py                // /v1/image/generate
│   └── voice.py                // /v1/voice/transcribe
├── graphs/                     // LangGraph workflows
│   ├── document_ingest_graph.py
│   ├── strategy_graph.py
│   ├── campaign_planning_graph.py
│   ├── post_generation_graph.py
│   └── recovery_graph.py       // error-recovery sub-graph
├── agents/                     // Individual agent nodes
│   ├── ingestor.py             // PDF/Excel/DOCX/URL → structured payload
│   ├── strategist.py           // Goal + audience + pillars
│   ├── planner.py              // Calendar layout
│   ├── writer.py               // Caption + hashtags per platform
│   ├── image_director.py       // Prompt → DALL-E/Flux
│   ├── reviewer.py             // Brand-voice + safety check
│   └── optimizer.py            // Post-perf analysis → next-cycle suggestions
├── chains/                     // LangChain chains (single-turn)
│   ├── extract_brand_voice.py
│   ├── classify_intent.py
│   └── caption_rewrite.py
├── retrievers/                 // RAG retrievers
│   ├── document_retriever.py   // workspace-scoped semantic search
│   ├── brand_retriever.py
│   └── hybrid_retriever.py     // BM25 + dense + reranker
├── parsers/                    // Document parsers
│   ├── pdf_parser.py           // unstructured + pdfplumber fallback
│   ├── excel_parser.py
│   ├── docx_parser.py
│   ├── image_parser.py         // GPT-4o vision for ad-hoc images
│   └── url_parser.py           // trafilatura for web pages
├── cache/
│   ├── semantic_cache.py       // Redis + embeddings
│   └── prompt_cache.py         // Anthropic cache_control helpers
├── routing/
│   └── model_router.py         // task → model selection
├── prompts/
│   ├── system/                 // base system prompts (cacheable)
│   ├── strategy/
│   ├── content/
│   ├── packs/                  // per-vertical-pack prompt overrides
│   │   ├── real_estate/
│   │   ├── f_and_b/
│   │   └── retail/
│   └── locales/
│       ├── ar/
│       ├── en/
│       └── dialects/
│           ├── saudi/
│           ├── egyptian/
│           └── levantine/
├── tools/                      // LangChain tool definitions
│   ├── search_documents.py
│   ├── fetch_brand_profile.py
│   ├── generate_image.py
│   └── render_template.py
├── observability/
│   ├── langsmith.py            // trace export
│   ├── token_meter.py
│   └── cost_tracker.py
└── ...
```

### 7.3 LangGraph: Campaign Generation Workflow (canonical example)

```python
# graphs/campaign_planning_graph.py — sketch
from langgraph.graph import StateGraph, END
from typing_extensions import TypedDict, Annotated, Literal
import operator

class CampaignState(TypedDict):
    workspace_id: str
    campaign_id: str
    campaign_input: dict           # goal, dates, platforms, source_doc_ids
    brand_profile: dict
    retrieved_chunks: list         # from RAG
    strategy: dict
    posts: Annotated[list, operator.add]   # accumulating
    current_post_index: int
    errors: list
    cost_usd: float
    cache_hits: int
    needs_human_review: bool

def build_graph():
    g = StateGraph(CampaignState)

    # Step 1: load brand + retrieve docs
    g.add_node("load_context", load_context_node)
    # Step 2: generate strategy
    g.add_node("generate_strategy", generate_strategy_node)
    # Step 3: plan calendar
    g.add_node("plan_calendar", plan_calendar_node)
    # Step 4: generate posts in batches (parallel, rate-limited)
    g.add_node("generate_post_batch", generate_post_batch_node)
    # Step 5: image gen for each post
    g.add_node("generate_images", generate_images_node)
    # Step 6: brand-voice review
    g.add_node("review_brand_voice", review_node)
    # Step 7: write to DB
    g.add_node("persist", persist_node)
    # Step 8: notify (SSE event)
    g.add_node("notify", notify_node)
    # Recovery sub-graph
    g.add_node("recover", recovery_node)

    g.set_entry_point("load_context")
    g.add_edge("load_context", "generate_strategy")
    g.add_edge("generate_strategy", "plan_calendar")
    g.add_edge("plan_calendar", "generate_post_batch")
    g.add_conditional_edges(
        "generate_post_batch",
        lambda s: "generate_images" if not s["errors"] else "recover"
    )
    g.add_edge("generate_images", "review_brand_voice")
    g.add_conditional_edges(
        "review_brand_voice",
        lambda s: "persist" if not s["needs_human_review"] else END,
        {"persist": "persist", END: END}
    )
    g.add_edge("persist", "notify")
    g.add_edge("notify", END)
    g.add_edge("recover", "generate_post_batch")  # retry once

    return g.compile(
        checkpointer=mongo_checkpointer,   # state persisted to MongoDB
        interrupt_before=["persist"]       # human-review checkpoint optional
    )
```

**Why this pattern wins:**
- Each node is independently testable (just a function over state).
- State persists between nodes via the checkpointer → if the worker crashes mid-campaign, restart resumes from last completed node.
- Conditional edges handle errors / human review without nested if-else hell.
- Subscribing to LangGraph's event stream gives the frontend live progress.
- Branch-per-vertical-pack is one extra conditional edge.

### 7.4 Model routing & selection

A small `model_router.py` chooses the right model per task:

| Task | Default | Fallback | Why |
|---|---|---|---|
| Intent classification (voice) | Haiku 4.5 | GPT-4o-mini | Fast, cheap, accurate enough for routing |
| Document chunk classification | Haiku 4.5 | — | Bulk; classify table-vs-narrative cheaply |
| Brand voice extraction | Sonnet 4.6 | Opus 4.7 | Needs nuance |
| Strategy generation | Sonnet 4.6 | Opus 4.7 | Complex multi-step reasoning |
| Caption / post generation | Sonnet 4.6 | Haiku 4.5 (cheap variant) | Quality matters; allow tier-based downgrade |
| Hashtag suggestion | Haiku 4.5 | — | Simple |
| Image prompt expansion | Sonnet 4.6 | — | One-off per image |
| Image generation | DALL-E 3 + Flux Pro | Nano Banana 2 | Diversify by tier |
| Embeddings | text-embedding-3-large (3072d) | -small (1536d) | Large for accuracy, small for budget |
| Vision OCR (PDF fallback) | GPT-4o | Haiku 4.5 vision | When Unstructured can't parse |

Fall-through logic on rate limits / 429s / quota exhaustion → automatic downgrade with usage logging.

### 7.5 Agent prompt structure

Every agent prompt has the same shape (cacheable):

```
[CACHE: STATIC SYSTEM PROMPT]
You are the {agent_name} agent in the Allrounder marketing platform.
Your job is to {agent_role}.
You MUST output JSON matching the schema {schema}.
You MUST NOT hallucinate. If the source documents don't contain a fact, say so.
{agent-specific guardrails}

[CACHE: BRAND VOICE PREFIX]
Brand: {brand.name}
Tone: {brand.tone_voice}
Voice samples:
{brand.tone_samples}
Banned words: {brand.banned_words}
Brand values: {brand.brand_values}
Positioning: {brand.positioning}

[CACHE: VERTICAL PACK INSTRUCTIONS]
{pack-specific instructions, e.g., for REAL_ESTATE: "Always include FAL number when generating Saudi listing posts"}

[DYNAMIC: TASK INPUT]
{task-specific user prompt + retrieved chunks}
```

The first three sections are **identical across thousands of calls** for the same workspace + pack — Anthropic prompt caching kicks in after the first call (5-min TTL); cache reads are 0.1× the base price. For the 1-hour cache (2× write cost) we use it on the workspace's brand prefix during a generation run that exceeds 5 min.

### 7.6 Voice agent

Reuse the existing `siri.tsx` frontend. Backend gets a new `/v1/voice/intent` endpoint:
1. Browser captures audio → uploads to backend.
2. Backend → Whisper API (or local whisper-large-v3 if cost-prohibitive) → text.
3. Text → intent classifier (Haiku, structured-output) → `{intent, params, confidence}`.
4. If `confidence > 0.85` → execute via tool registry.
5. Else → ask user clarifying question (TTS via OpenAI TTS or ElevenLabs).

For Arabic voice in Saudi/Egyptian dialect: route to Whisper (handles MSA well; dialect is degraded but workable). For better quality, add Lahjawi or Saudi-Dialect-ALLaM finetune later.

---

## 8. Document Storage & RAG Strategy

### 8.1 Three-stage pipeline

```
[Upload]                         [Parse + Chunk]                  [Embed + Index]
  │                                    │                                │
  ▼                                    ▼                                ▼
S3 (raw)  ──────────────►  Unstructured.io / pdfplumber  ─────►  text-embedding-3-large
                                       │                                │
                                       ▼                                ▼
                              DocumentChunk rows           MongoDB Atlas Vector Search
                              (text + metadata)             (workspaceId-filtered KNN)
```

### 8.2 Storage: MongoDB Atlas Vector Search

**Why not a separate vector DB:**
- Deal AI already runs on MongoDB Atlas (M10 cluster on `cluster0.ipkg8bq` per session memory).
- Atlas Vector Search is included with M10+ tiers — zero extra infra cost.
- pgvector is cheaper at low scale, but switching DBs is a 4-week migration we don't need to take.
- Pinecone is faster at 100M+ vectors; we're nowhere close. Per [Encore's comparison](https://encore.dev/articles/pgvector-vs-pinecone), revisit only at >50M vectors.

**Setup:**
1. Define a vector index in Atlas on `document-chunks.embedding` and `assets.embedding` and `brand-profiles.voice-embedding`.
2. Use the `$vectorSearch` aggregation stage with workspace filter:

```js
{
  $vectorSearch: {
    index: "doc_chunks_idx",
    path: "embedding",
    queryVector: queryEmbedding,
    numCandidates: 200,
    limit: 10,
    filter: { workspaceId: ctxWorkspaceId, "document.deletedAt": null }
  }
}
```

3. Reranker on top (cross-encoder `bge-reranker-v2-m3` or Cohere Rerank) — applied to top 10 candidates to surface top 3–5.

### 8.3 Parser choice (per format)

| Format | Primary | Fallback | Notes |
|---|---|---|---|
| **PDF** (text-based) | [Unstructured.io](https://docs.unstructured.io) | [pdfplumber](https://github.com/jsvine/pdfplumber) | Unstructured returns typed elements (`Title`, `NarrativeText`, `Table`, `ListItem`) — drives semantic chunking. pdfplumber for tables. |
| **PDF** (scan / image) | GPT-4o vision (page-by-page) | Haiku 4.5 vision | Used when text layer empty or quality poor |
| **Excel** | `openpyxl` + custom | LlamaIndex Excel reader | Treat each sheet as a separate logical document; serialize as Markdown tables |
| **DOCX** | `python-docx` | mammoth.js → MD → unstructured | |
| **CSV** | `pandas` | — | Same logic as Excel |
| **Image** | GPT-4o vision caption | — | Stored as `IMAGE_CAPTION` chunk |
| **URL** | `trafilatura` + readability | Playwright fallback for JS sites | |
| **Raw text** | — | — | Passes straight to chunker |

Per [the 2026 RAG chunking benchmark](https://blog.premai.io/rag-chunking-strategies-the-2026-benchmark-guide/), chunking config has more impact on retrieval quality than embedding model choice. Get this right.

### 8.4 Chunking strategy

| Doc type | Strategy | Chunk size | Overlap |
|---|---|---|---|
| PDF (narrative) | Semantic (Unstructured element-aware) | 800 tokens | 100 tokens |
| PDF (with tables) | Page-level + table-as-row | page + per-row chunks | none for tables |
| Excel | One chunk per sheet (head) + one per row group | 100 rows or 1024 tokens | none |
| DOCX | Header-based | section bounded | 50 tokens |
| Long URL | Recursive markdown header split | 800 tokens | 100 tokens |

**Brochure-specific (current Deal AI use case):**
- Page 1–2 (cover, summary, location) → 1 chunk each.
- Per-property table row → 1 chunk with structured payload as JSON in `extractedJson`.
- Floor plan images → vision-LLM caption + image stored separately, link via `figureUrl`.

### 8.5 Retrieval pattern (hybrid + rerank)

```python
async def retrieve(query: str, workspace_id: str, k: int = 5):
    # 1. Dense retrieval via Atlas Vector Search
    query_emb = await embed(query, model="text-embedding-3-large")
    dense_hits = await vector_search(query_emb, workspace_id, limit=20)

    # 2. BM25 / lexical via MongoDB text index
    lexical_hits = await text_search(query, workspace_id, limit=20)

    # 3. Reciprocal Rank Fusion
    fused = rrf(dense_hits, lexical_hits, k=60)[:10]

    # 4. Cross-encoder rerank
    reranked = await rerank("bge-reranker-v2-m3", query, fused)
    return reranked[:k]
```

Why hybrid: dense alone misses keyword-exact matches (FAL numbers, model SKUs); lexical alone misses paraphrases. RRF + rerank is the 2026 production pattern per [InfoQ Hierarchical RAG](https://www.infoq.com/articles/building-hierarchical-agentic-rag-systems/).

### 8.6 Hallucination guardrails

For every generated post, the system stores `sourceChunkIds: string[]` referencing which chunks grounded the text. A post with empty `sourceChunkIds` and assertive factual claims gets flagged for review. The frontend optionally renders citation footnotes (good-to-have for v1, mandatory for legal/compliance contexts).

### 8.7 Document re-ingestion & versioning

When a document is updated (re-uploaded under same title): keep both versions, mark old as `superseded`, re-embed new. Old chunks remain queryable but score lower (a `weight` field decays).

---

## 9. Token Optimization & Cost Control

### 9.1 Layered caching

Three layers, stacked, in order of cheapness-first:

```
Request → [Layer 1: Semantic Cache (Redis)] hit? → return cached answer
                          ↓ miss
                   [Layer 2: Anthropic prompt cache] → big cacheable prefix
                          ↓
                   [Layer 3: OpenAI implicit cache] → automatic on prefix
                          ↓
                   Model invocation (paid)
                          ↓
                   Persist to semantic cache (with TTL + cost tag)
                          ↓
                   Response
```

Per [Maxim's analysis](https://www.getmaxim.ai/articles/reducing-your-openai-and-anthropic-bill-with-semantic-caching/): semantic cache eliminates ~60% of calls; provider-side prompt caching reduces cost on the remaining 40%. **Combined: 70–90% cost reduction is realistic**.

### 9.2 Anthropic prompt caching specifics

Per [Claude API docs](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) (May 2026):
- Default TTL **5 minutes** (was 1hr; quietly reduced early 2026 — workspace-level isolation since Feb 5, 2026).
- 5-min cache write = 1.25× base input price; cache read = 0.1× base input price.
- 1-hour cache write = 2× base input price (good for batch workloads inside a single user session).
- **Break-even**: 5-min cache pays off after 1 hit; 1-hour cache pays off after 2 hits.

**Where we use it:**
- **System prompt** (~1.5–3K tokens) — cached every call.
- **Brand voice prefix** (~500–1500 tokens) — cached per workspace, reused across all generations in a campaign.
- **Vertical-pack instructions** (~500–1000 tokens) — cached per pack.
- **Retrieved RAG context** is dynamic (not cached) but is gated by retrieval — small, focused chunks instead of dumping full documents.

**Engineering rule:** any static-or-slow-changing context >1024 tokens **must** be marked `cache_control` for Anthropic; OpenAI handles caching implicitly when prefix is the same.

### 9.3 Semantic caching

Layer-1 cache implemented in Redis:
- Embed every incoming user-facing prompt (cheap: text-embedding-3-small, $0.02/M tokens).
- Look up in Redis `RediSearch` vector index for similar prior prompts (cosine > 0.93).
- Hit → return cached LLM output.
- Miss → call LLM, store `(prompt_emb, response, cost_usd, ttl)`.

**Eviction:** TTL 24h for generic content, 7d for brand-voice extractions, 30d for strategy templates.

**Privacy:** scoped per `workspaceId` (cache key prefix). No cross-tenant leakage.

### 9.4 Model routing economics

Use Haiku 4.5 / GPT-4o-mini wherever possible. Real numbers (May 2026):
- Claude Haiku 4.5: ~$1/M input, ~$5/M output
- Claude Sonnet 4.6: ~$3/M input, ~$15/M output (5× more)
- Claude Opus 4.7: ~$15/M input, ~$75/M output (15× more)
- GPT-4o-mini: ~$0.15/M input, ~$0.60/M output (cheapest tier)
- GPT-4o: ~$2.50/M input, ~$10/M output

Routing rules (defaults; A/B test against quality):
- Triage / classification → Haiku 4.5 or GPT-4o-mini
- Caption rewrites / hashtag generation → Haiku 4.5
- Strategy generation, complex reasoning → Sonnet 4.6
- Critical brand-voice review or final QA → Opus 4.7 (only on flagged outputs)

Per [Moltbook AI Cost Optimization Guide 2026](https://moltbook-ai.com/posts/ai-agent-cost-optimization-2026): model routing + caching alone deliver 40–60% savings.

### 9.5 RAG-driven prompt minimization

Rather than dumping a 50-page PDF into context, retrieve only top 3–5 chunks (~2K tokens). This **lowers prompt size by 20–50×**. Output quality improves because the model sees only relevant content.

### 9.6 Batch APIs for bulk work

Anthropic and OpenAI both offer batch endpoints at 50% the price for non-urgent jobs. Use for:
- Audience-insights nightly recompute (analytics).
- Embedding regeneration after document re-ingest.
- Pre-generating "next week's posts" overnight while the user sleeps.

Implementation: BullMQ batch queue; worker buffers requests for ~30s, submits in batch, polls status.

### 9.7 Cost observability

Every LLM call logs:
- `workspace_id`, `agent`, `model`, `cache_hit`, `prompt_tokens`, `completion_tokens`, `cost_usd`, `latency_ms`.

Aggregated nightly into `PlatformUsage` table; surfaced in workspace billing UI as "AI usage this month: 1.2M tokens, $9.40."

Hard caps per tier: e.g., FREE = $5/mo budget, throttle at 80%, hard-stop at 100%.

### 9.8 Target unit economics

For a typical campaign generation (4-week, 5 posts/week, 4 platforms = 80 posts):
- Strategy: 1 call, ~3K input + 2K output, Sonnet → $0.039
- Calendar plan: 1 call, ~2K + 1K, Sonnet → $0.021
- Post text: 80 calls, ~1.5K + 0.5K each, Sonnet → ~$0.96 (without cache)
- Image prompts: 80 calls, ~0.5K + 0.2K, Haiku → ~$0.12
- Image generation (DALL-E 3): 80 × ~$0.04 = $3.20
- Brand-voice review: 1 call per post, ~0.5K + 0.3K, Haiku → $0.064

**Total uncached: ~$4.40 per campaign.** With prompt caching (~70% reduction on text) + semantic cache (~50% hit on repeated content) → **~$1.20 per campaign**, dominated by image gen. Goal: $0.40 by routing to Flux/Nano-Banana for non-hero images, hitting cheaper tier for sub-platforms.

---

## 10. Job Queue & Scheduling

### 10.1 BullMQ replaces node-cron

Per [BullMQ docs](https://bullmq.io/) and the existing audit's P0 finding:
- Today: `cron.schedule("*/30 * * * * *", scheduler)` is single-instance, unsafe at scale.
- Tomorrow: Redis-backed queue, multi-worker, persistent, supports delayed jobs natively.

### 10.2 Queue topology

| Queue | Purpose | Concurrency | Worker tier |
|---|---|---|---|
| `ingest` | Document parsing + embedding | 4 workers | CPU |
| `ai-strategy` | Strategy generation | 2 workers | API-bound |
| `ai-content` | Post text + image generation | 8 workers (rate-limited inside) | API-bound |
| `publish` | Send post to platform | 16 workers | I/O-bound |
| `analytics-fetch` | Pull metrics from platforms | 2 workers | I/O-bound |
| `email` | Transactional emails | 4 workers | I/O-bound |
| `webhook-retry` | Retry failed webhooks | 2 workers | I/O-bound |

### 10.3 Scheduled-publish replacement

Today's `scheduler.js` polls every 30s — replace with BullMQ delayed jobs:

```js
// On approve-post:
await publishQueue.add(
  'publish-post',
  { postId, workspaceId },
  { delay: post.scheduledFor.getTime() - Date.now() }
);
```

The job sits in Redis until `scheduledFor`. Multiple workers safely consume via Redis atomic operations. No DB scan, no race condition.

### 10.4 Long-running AI workflows

Campaign generation can take 3–10 minutes for 80 posts. Pattern:
1. Backend route returns `202 Accepted` with `generationId` immediately.
2. Worker runs LangGraph workflow; emits SSE events on each node completion.
3. Frontend subscribes to `GET /api/workspaces/:slug/generations/:id/stream` (SSE).
4. Worker persists state to Mongo via LangGraph checkpointer; survives restarts.

### 10.5 Failure handling

- **Retries**: BullMQ exponential backoff (1m → 5m → 30m → fail). Failed jobs land in a dead-letter queue inspectable in Bull Board.
- **Dead-letter UI**: backend exposes `/admin/dlq` (admin only) for manual replay.
- **Alerting**: any DLQ count > 0 fires a Slack/email alert.

---

## 11. Observability, Security, Operations

### 11.1 Logging

- Replace `console.log` (76 occurrences per audit) with `pino` (structured JSON, levels, PII redaction).
- Ship logs to a central store (Logtail / Datadog / Better Stack).
- One trace ID per request, propagated to Python AI engine via header.

### 11.2 Metrics

Surface in a basic Grafana / Better Stack dashboard:
- Request latency p50/p95/p99 per route.
- Queue depth per BullMQ queue.
- LLM cost per workspace per day.
- Cache hit rate (semantic + provider).
- Publish success rate per platform.
- Active workspace count by plan tier.

### 11.3 Tracing

- LangSmith for AI workflow traces (LangChain free tier sufficient initially).
- OpenTelemetry for backend route → AI engine → LLM call propagation.

### 11.4 Security checklist (P0 — same as audit)

- [ ] Sign + verify user identity (HMAC-JWT or RS256-JWT). Replace base64 user header.
- [ ] Workspace-scope every read/write via Prisma client extension.
- [ ] Rotate every secret in committed `.env` files; gitignore + repo history scrub.
- [ ] Add DB indexes on `(workspaceId, scheduledFor, status)`, `(workspaceId, type)`, etc.
- [ ] OAuth state in Redis with TTL.
- [ ] CORS whitelist via env, not hardcoded.
- [ ] Body-size limits per route (no global 100mb).
- [ ] Helmet + rate-limit middleware.
- [ ] Per-tenant rate limiting (e.g., Redis token bucket).
- [ ] Stripe webhook signature verification.
- [ ] CSP + cookie hardening on frontend.

### 11.5 Compliance

- For non-RE workspaces: GDPR + CCPA + LGPD baseline (consent logging, data export, right-to-delete, DPO contact).
- For RE pack (Phase 2): PDPL consent ledger + REGA FAL stamping (already documented in market study and existing audit).
- EU AI Act high-risk requirements live August 2026 — review applicability; if yes, add transparency + documentation + risk management system.

### 11.6 Deployment

- **Frontend**: Vercel (already).
- **Backend**: Render or Railway (Docker). Move off ad-hoc Node host.
- **AI engine**: Modal or Fly.io GPU pool (if running local models) or Render CPU (if all hosted via API).
- **Redis**: Upstash or Render Redis.
- **MongoDB**: Atlas (already).
- **Secrets**: Doppler or 1Password CLI; env-file-free in production.

### 11.7 CI/CD

- GitHub Actions per repo: lint, type-check, build, run tests, deploy on `main`.
- Preview environments per PR (Vercel handles frontend; Railway preview envs for backend).

### 11.8 Testing strategy

Currently zero tests across all three repos. Minimum viable:
- **Unit**: Zod schema validators, JWT sign/verify, prompt template rendering, model router, retrieval scoring.
- **Integration**: workspace creation flow, document ingest → query, campaign generation happy-path (mocked LLM).
- **E2E (Playwright)**: signup → upload → first campaign → first scheduled post.
- **AI eval suite**: a fixed test set of 50 input/expected pairs run nightly to detect prompt regressions; LangSmith eval is sufficient.

---

## 12. Mandatory vs Good-to-Have Features

### 12.1 Frontend

| Feature | Mandatory v1 | Good-to-have v1 | Defer |
|---|---|---|---|
| Auth (Lucia, Google + creds) | ✅ | | |
| Workspace switcher / create / settings | ✅ | | |
| Members + roles (Owner/Admin/Editor/Approver/Viewer) | ✅ | | |
| Brand profile editor (name, logo, colors, tone, samples) | ✅ | | |
| Document uploader (PDF, Excel, DOCX, URL) | ✅ | | |
| Document chunk viewer (debug mode) | | ✅ | |
| Campaign wizard (goal → docs → audience → cadence) | ✅ | | |
| Strategy editor | ✅ | | |
| Posts list + filters | ✅ | | |
| Post inline edit | ✅ | | |
| Approval queue UI | ✅ | | |
| Drag-drop calendar | ✅ | | |
| Bulk reschedule | | ✅ | |
| Asset library | ✅ | | |
| Content recycling rules | | ✅ | |
| Audience insights dashboard | ✅ | | |
| Engagement analytics | ✅ | | |
| Voice agent (Siri) — generic | ✅ | | |
| Voice → action execution (full intent registry) | | ✅ | |
| Inbox / DM management | | | ⏸ v1.1 |
| Image editor (Konva — already wired) | ✅ | | |
| Brand-locked image gen UI | ✅ | | |
| Video editor / Reels | | | ⏸ v1.1 |
| AR + EN with RTL | ✅ | | |
| Per-campaign dialect picker | | ✅ | |
| Stripe billing portal embed | ✅ | | |
| Plan upgrade/downgrade | ✅ | | |
| Workspace deletion (with grace period) | ✅ | | |
| Notifications panel (in-app) | ✅ | | |
| Email notifications | | ✅ | |
| Mobile-responsive | ✅ | | |
| PWA installable | | ✅ | |
| Native mobile | | | ⏸ v2 |

### 12.2 Backend

| Feature | Mandatory v1 | Good-to-have v1 | Defer |
|---|---|---|---|
| JWT auth middleware | ✅ | | |
| Tenant middleware (workspace scoping) | ✅ | | |
| Workspace CRUD | ✅ | | |
| Member invite / role mgmt | ✅ | | |
| Brand profile CRUD | ✅ | | |
| Document upload + ingest dispatch | ✅ | | |
| Campaign CRUD + regeneration | ✅ | | |
| Strategy CRUD | ✅ | | |
| Post CRUD + bulk ops | ✅ | | |
| Approval workflow APIs | ✅ | | |
| Asset CRUD + tagging | ✅ | | |
| Calendar query | ✅ | | |
| Analytics ingestion + query | ✅ | | |
| BullMQ queues + workers | ✅ | | |
| Scheduled publish via BullMQ delayed jobs | ✅ | | |
| OAuth (LinkedIn) | ✅ | | |
| OAuth (X / Twitter) | ✅ | | |
| OAuth (Facebook + Instagram) | ✅ | | |
| OAuth (TikTok) | | ✅ | |
| OAuth (WhatsApp / Telegram / Snapchat) | | | ⏸ Phase 2 |
| Stripe billing + webhooks | ✅ | | |
| Stripe usage-based add-ons | | ✅ | |
| Email transactional (SendGrid/Resend) | ✅ | | |
| Webhook receivers (per-platform analytics) | ✅ | | |
| Health check endpoint (deep) | ✅ | | |
| Structured logging (pino + redaction) | ✅ | | |
| Per-tenant rate limiting | ✅ | | |
| Admin / DLQ panel | | ✅ | |
| Audit log (member actions, billing changes) | | ✅ | |
| Soft-delete + restore for all entities | ✅ | | |
| Data export (JSON / CSV) | | ✅ | |
| API for external integrations | | | ⏸ Phase 2 |

### 12.3 AI Engine

| Feature | Mandatory v1 | Good-to-have v1 | Defer |
|---|---|---|---|
| FastAPI migration from Flask | ✅ | | |
| LangGraph orchestration framework | ✅ | | |
| LangChain tool/LLM abstractions | ✅ | | |
| Document ingest pipeline (PDF + Excel + DOCX + URL) | ✅ | | |
| Image / scanned PDF vision OCR fallback | ✅ | | |
| RAG retriever (Atlas Vector Search + BM25 + RRF + rerank) | ✅ | | |
| Brand voice extraction | ✅ | | |
| Strategy generation graph | ✅ | | |
| Campaign planning graph | ✅ | | |
| Post generation (text) graph | ✅ | | |
| Image generation pipeline (DALL-E 3 + retry) | ✅ | | |
| Image generation alt models (Flux Pro, Nano Banana 2) | | ✅ | |
| Brand-locked image generation (style refs) | ✅ | | |
| Voice intent classifier (Whisper + Haiku) | ✅ | | |
| Hashtag generation | ✅ | | |
| Caption rewriting per platform | ✅ | | |
| Anthropic prompt caching | ✅ | | |
| OpenAI implicit caching support | ✅ | | |
| Semantic cache (Redis) | ✅ | | |
| Model router + fallback chain | ✅ | | |
| Per-call cost & token logging | ✅ | | |
| LangSmith tracing | ✅ | | |
| Eval suite (50-pair regression test) | ✅ | | |
| Vertical-pack registry + REAL_ESTATE pack | ✅ (re-enabled) | | |
| Vertical-pack: F&B / retail / hospitality | | ✅ | ⏸ |
| A/B variant generation | | ✅ | |
| Performance prediction model | | | ⏸ Phase 2 |
| Optimizer agent (post-perf → next-cycle suggestions) | | ✅ | |
| Saudi/Egyptian dialect tuning (LoRA) | | | ⏸ Phase 2 (REAM pack) |
| Floor-plan extraction (WAFFLE-style) | | | ⏸ Phase 2 (REAM pack) |
| Comp-pricing ML model | | | ⏸ Phase 2 (REAM pack) |
| TikTok / Reels 9:16 video generation | | | ⏸ Phase 2 |
| Press distribution module | | | ⏸ Phase 3 |

### 12.4 Storage / Infra

| Feature | Mandatory v1 | Good-to-have v1 |
|---|---|---|
| MongoDB Atlas (existing M10+) | ✅ | |
| Atlas Vector Search index | ✅ | |
| Redis (Upstash or Render) | ✅ | |
| DigitalOcean Spaces (existing) | ✅ | |
| BullMQ queue infrastructure | ✅ | |
| LangSmith account | ✅ | |
| Sentry / error tracking | ✅ | |
| Stripe production account | ✅ | |
| Doppler / 1Password secrets | ✅ | |
| Per-tenant region routing | | ✅ (KSA/UAE/EU) |
| Multi-region read replicas | | | ⏸ Phase 2 |

---

## 13. Phased Milestones

Six-month plan to v1, with REAM pack restoration in Phase 2.

### Month 1 — Foundations + security (4 weeks)

- Audit P0 items: signed JWT, tenant filters, secret rotation, indexes, persisted OAuth state, dist-lock cron, Zod validation, structured logging.
- New schema: Workspace, BrandProfile, Document + DocumentChunk, Campaign, Strategy, Post, Asset, Member, AnalyticsData, AudienceInsights — Prisma defined, migrated, indexed.
- Multi-tenant Prisma client extension.
- BullMQ wired with Redis; one canary queue (`ingest`).
- FastAPI shell on AI engine; existing endpoints wrapped behind it (no logic change yet).

**Exit criteria:** existing flows still work end-to-end on the new schema; no security regressions; first ingest job runs through BullMQ.

### Month 2 — RAG + brand profile (4 weeks)

- Document ingest pipeline: PDF (Unstructured) + Excel + DOCX + URL.
- Atlas Vector Search index on `document-chunks.embedding` + `brand-profiles.voice-embedding` + `assets.embedding`.
- Hybrid retriever (dense + BM25 + RRF + rerank).
- Brand profile editor + brand voice extraction agent.
- Frontend: workspace switcher, brand profile editor, document uploader + chunk viewer.

**Exit criteria:** uploading a brochure produces structured chunks queryable in <100ms with workspace filter; brand profile generation from 3 voice samples produces stable voice embeddings.

### Month 3 — LangGraph + campaign generation (4 weeks)

- LangGraph campaign-planning graph (load_context → strategy → calendar → post_batch → images → review → persist).
- Model router + fallback chain.
- Anthropic prompt caching + Redis semantic cache.
- Cost & token logging per call.
- LangSmith tracing.
- Frontend: campaign wizard, strategy view, posts list.

**Exit criteria:** an end-to-end campaign for 80 posts generates in <8 min, costs <$1.50, with all outputs grounded in retrieved chunks.

### Month 4 — Approval, calendar, publishing, analytics (4 weeks)

- Approval workflow (UI + APIs).
- Drag-drop calendar.
- BullMQ delayed-job publish (replaces 30s cron).
- Facebook + Instagram OAuth + posting (closing the stubbed-platform gap).
- Analytics ingest from each platform's API.
- Audience insights computed nightly.
- Frontend: calendar, approval queue, analytics dashboard, audience insights.

**Exit criteria:** scheduled posts publish reliably across LI/X/FB/IG; analytics roll up daily; approval workflow end-to-end.

### Month 5 — Billing, voice, polish (4 weeks)

- Stripe integration + Customer Portal + plan tier enforcement.
- Voice agent generalized (intent registry, multi-page actions).
- Asset library + recycling rules.
- Image gen brand-lock (style refs, color/logo persistence).
- Notifications (in-app + email).
- Mobile-responsive QA + RTL polish.
- Vertical-pack registry restored; REAL_ESTATE pack re-enabled with old data migrated forward.

**Exit criteria:** a paid signup flows end-to-end; existing Deal AI users can opt into REAL_ESTATE pack and see migrated data; voice agent executes 10+ intents reliably.

### Month 6 — Hardening, eval, beta launch (4 weeks)

- Test suite: unit + integration + E2E (Playwright) + AI eval (50-pair regression).
- Load test: 100 concurrent campaign generations; measure latency, cost, queue depth.
- Documentation: API docs (OpenAPI), in-app guides, video walkthroughs.
- Closed beta with 20 users from 3 verticals (RE, F&B, retail).
- Bug burndown; cost tuning (Flux/Nano-Banana for non-hero images).
- Compliance: GDPR baseline, ToS + Privacy Policy + DPA template.

**Exit criteria:** beta NPS > 30; <0.5% publishing-failure rate; per-campaign cost ≤ $0.40; ready for public launch.

### Phase 2 (Months 7–12) — REAM vertical pack deepening + good-to-haves

Restored REAM features layered as the `REAL_ESTATE` pack on top of Allrounder:
- WhatsApp Business Cloud API outreach.
- Saudi/Egyptian dialect tuning.
- PDPL consent ledger + REGA FAL stamping.
- Bayut / PropertyFinder / Dubizzle / Aqarmap connectors.
- Excel/CSV owner-and-unit ingestion.
- Email outreach engine.
- Lead pipeline + Agent CRM.
- Marketplace listing posts.

Allrounder good-to-haves:
- Inbox / DM management (cross-platform unified inbox).
- TikTok + Reels 9:16 video generation.
- A/B variant generation + performance prediction.
- Optimizer agent.
- White-label / agency-mode.
- Additional vertical packs (F&B, retail, hospitality).

### Phase 3 (Months 13–18) — moat-deepening

- Agentic-voice flows (WhatsApp voice notes → campaigns).
- Press distribution module.
- Floor-plan extraction.
- Comp-pricing ML.
- API for external integrations.
- Native mobile.
- Compliance automation (PDPL/REGA generalized + EU AI Act + LGPD).

---

## 14. Open Questions & Risks

### 14.1 Open questions for stakeholders

1. **Pricing tiers.** The proposed FREE/STARTER/PRO/ENTERPRISE shape is a starting point. Concrete $/mo + quotas need a market-pricing test (consider 14-day free trial vs free-forever tier).
2. **Hosting region.** Atlas region for KSA enterprise customers — KSA region is available on Atlas; do we provision a separate cluster from day 1, or wait for first KSA enterprise deal? Recommend wait unless a deal is imminent.
3. **Local LLM use.** TakamolAdvancedAI currently has GGUF model files (per audit). Do we keep local Llama/Falcon/AceGPT for cost savings on bulk classification, or fully outsource to Anthropic/OpenAI? Recommend: phase out local models; hosted API is more reliable and cost-comparable after caching.
4. **Vector DB long-term.** Stay on Atlas Vector Search forever, or migrate to a purpose-built DB (Pinecone/Weaviate) when we cross 50M vectors? Recommend: stay until measurable performance issue, then migrate.
5. **i18n scope.** AR + EN at v1. Do we add French (Egypt/Maghreb) and Turkish (regional expansion) at v1.1, or wait for verified demand?

### 14.2 Risks

1. **Migration complexity.** RE-specific schema → generic + pack model is a non-trivial 2–3-week migration. Mitigation: snapshot before, keep both schemas live for 30 days, cut over reads route-by-route.
2. **LLM cost overrun.** If caching hit rate is lower than projected, the per-campaign cost could exceed $1. Mitigation: hard per-tenant budget caps + alerts at 80%.
3. **Anthropic 5-min cache TTL.** Quietly reduced from 1hr in early 2026; reduces effective savings on long-running workflows. Mitigation: use 1-hour cache (2× write cost) only for in-flight workflows that exceed 5 min; design prompt structure so cacheable prefix dominates total tokens.
4. **Provider API instability.** Instagram Graph cut to 200 calls/hour; X pay-per-use. Mitigation: per-platform usage accounting + backoff + graceful degradation.
5. **Anti-AI consumer backlash.** 52% of consumers disengage from AI-detected content. Mitigation: brand voice tuning + dialect awareness + human-in-loop approval workflow as a default.
6. **Vendor lock-in (LangChain/LangGraph).** Both are open-source; switching cost is moderate (rewrite graphs to e.g. CrewAI or DSPy). Mitigation: keep agent prompt logic in pure Python helpers; LangGraph is just glue.
7. **Test coverage debt.** Zero tests today is a regression risk on every change. Mitigation: dedicate at least 10% of every dev-week to tests.
8. **Onboarding friction.** If <2-min time-to-first-value isn't real, churn at week 1 is high. Mitigation: instrument onboarding funnel; iterate weekly until >70% of trials reach first-campaign in <5 min.

### 14.3 Out-of-scope (explicit)

- Native iOS / Android apps (Phase 3+).
- White-label / agency-mode (Phase 2).
- Custom-domain workspaces (Phase 2).
- SSO / SAML for enterprise (Phase 2 on customer demand).
- Real-time collaboration (multi-user simultaneous editing) (Phase 3).
- AI-generated long-form video (Phase 3).
- Commerce integrations (Shopify, WooCommerce) for product feeds (Phase 2 retail pack).

---

## 15. Sources

### Architecture & frameworks
- [LangGraph official](https://www.langchain.com/langgraph)
- [LangChain vs LangGraph 2026 (Kanerika)](https://kanerika.com/blogs/langchain-vs-langgraph/)
- [State of AI Agents 2026 (LangChain)](https://www.langchain.com/state-of-agent-engineering)
- [2026 AI Agent Framework Showdown (QubitTool)](https://qubittool.com/blog/ai-agent-framework-comparison-2026)
- [LangGraph 2.0 production guide (DEV)](https://dev.to/richard_dillon_b9c238186e/langgraph-20-the-definitive-guide-to-building-production-grade-ai-agents-in-2026-4j2b)
- [Multi-tenant SaaS Next.js + Express + Prisma (freeCodeCamp)](https://www.freecodecamp.org/news/how-to-build-a-multi-tenant-saas-platform-with-next-js-express-and-prisma)
- [Next.js multi-tenant guide](https://nextjs.org/docs/app/guides/multi-tenant)
- [Multi-tenant data isolation patterns (DEV)](https://dev.to/whoffagents/building-multi-tenant-saas-data-isolation-strategies-compared-299o)
- [WorkOS multi-tenant developer guide](https://workos.com/blog/developers-guide-saas-multi-tenant-architecture)

### RAG / vector DB / parsing
- [RAG Chunking Strategies 2026 Benchmark (PremAI)](https://blog.premai.io/rag-chunking-strategies-the-2026-benchmark-guide/)
- [Best PDF parsers for AI/RAG 2026 (Firecrawl)](https://www.firecrawl.dev/blog/best-pdf-parsers)
- [Best Chunking Strategies for RAG 2026 (Firecrawl)](https://www.firecrawl.dev/blog/best-chunking-strategies-rag)
- [Hierarchical Agentic RAG (InfoQ)](https://www.infoq.com/articles/building-hierarchical-agentic-rag-systems/)
- [Multimodal RAG Guide 2026 (DataCamp)](https://www.datacamp.com/tutorial/multimodal-rag)
- [Vector Database Comparison 2026 (GroovyWeb)](https://www.groovyweb.co/blog/vector-database-comparison-2026)
- [MongoDB Atlas Vector vs Pinecone (MongoEngine)](https://mongoengine.org/mongodb-atlas-vector-search-vs-pinecone/)
- [pgvector vs Pinecone 2026 (Encore)](https://encore.dev/articles/pgvector-vs-pinecone)
- [Unstructured.io docs](https://docs.unstructured.io)
- [PDFPlumber](https://github.com/jsvine/pdfplumber)
- [PyMuPDF RAG](https://pymupdf.readthedocs.io/en/latest/rag.html)

### Token / cost optimization
- [OpenAI prompt caching guide](https://developers.openai.com/api/docs/guides/prompt-caching)
- [Anthropic prompt caching docs](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
- [Anthropic API Pricing 2026 Complete Guide (Finout)](https://www.finout.io/blog/anthropic-api-pricing)
- [Claude Prompt Caching Cost Optimization (jangwook.net)](https://jangwook.net/en/blog/en/claude-api-prompt-caching-cost-optimization-guide/)
- [Reducing OpenAI/Anthropic bill with semantic caching (Maxim)](https://www.getmaxim.ai/articles/reducing-your-openai-and-anthropic-bill-with-semantic-caching/)
- [AI Agent Cost Optimization Guide 2026 (Moltbook)](https://moltbook-ai.com/posts/ai-agent-cost-optimization-2026)
- [PromptHub Caching with OpenAI/Anthropic/Google](https://www.prompthub.us/blog/prompt-caching-with-openai-anthropic-and-google-models)
- [Claude Prompt Caching 5-min TTL change (DEV)](https://dev.to/whoffagents/claude-prompt-caching-in-2026-the-5-minute-ttl-change-thats-costing-you-money-4363)

### Job queue / scheduling / billing
- [BullMQ official](https://bullmq.io/)
- [BullMQ scheduled tasks (Better Stack)](https://betterstack.com/community/guides/scaling-nodejs/bullmq-scheduled-tasks/)
- [How to Build a Task Scheduler with BullMQ (OneUptime)](https://oneuptime.com/blog/post/2026-01-26-task-scheduler-bullmq-nodejs/view)
- [Stripe + Next.js App Router (Medium)](https://medium.com/@josh.ferriday/intergrating-stripe-payments-with-next-app-router-9e9ba130f101)
- [Multi-tenant SaaS with Subdomains in Next.js (Medium)](https://medium.com/@theNewGenCoder/build-a-multi-tenant-saas-with-subdomains-in-next-js-6b40910da4cf)
- [Stripe & Paystack Webhooks Next.js App Router (DEV)](https://dev.to/thekarlesi/how-to-handle-stripe-and-paystack-webhooks-in-nextjs-the-app-router-way-5bgi)

### Companion documents
- `DEAL_AI_AUDIT_AND_ROADMAP.md` (April 2026 internal audit)
- `DEAL_AI_FUNCTIONAL_DOCUMENTATION.md` (full functional reference)
- `DEAL_AI_MARKET_STUDY_AND_COMPETITIVE_STRATEGY.md` (May 2026 market study)
- `D:\Work\Bits\Projects\AI Social Media Automation Platform\Docs\Allrounder_PRD.pdf`
- `D:\Work\Bits\Projects\AI Social Media Automation Platform\Docs\REAM Tech Spec v1.docx`

*End of document. Updated May 2026.*
