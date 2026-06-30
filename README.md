# AI Business Operations Platform

Built for the DareXAI Full Stack AI Engineer internship challenge.

## What's implemented

| Module | Status | Notes |
|---|---|---|
| Auth (Google OAuth + PKCE, JWT, refresh rotation, multi-tenant) | Done | `app/api/auth/**`, `lib/auth/**` |
| AI Business Agent (streaming, tools, history, explainability) | Done | `app/api/ai/chat/route.ts`, `lib/ai/tools.ts`, UI at `/agent` |
| CRM (contacts, opportunities, opportunity detail, next-best-action) | Done | `app/api/crm/**`, UI at `/contacts`, `/opportunities`, `/opportunities/[id]` |
| Unified Inbox (WhatsApp + Email + Call Logs, AI summary/intent/sentiment) | Done — all 3 channels live | `lib/ai/insights.ts`, UI at `/conversations`, `app/api/email/webhook`, `app/api/calls` |
| WhatsApp Integration | Sandbox mode by default, flips to live Meta Cloud API via one env var | `lib/whatsapp/client.ts`, `app/api/whatsapp/webhook` |
| Workflow Automation | Lead -> AI Qualification -> WhatsApp -> Task -> Audit Log | `app/api/workflows/lead/route.ts` |
| Dashboard KPIs | Done | `app/api/dashboard/metrics`, UI at `/dashboard` |
| Security | Input validation (zod), HTTP-only cookies, CORS, parameterized queries (Prisma), CSP/XSS headers, audit logs | `middleware.ts` |
| Tests | Auth, tenant isolation, AI tool calling, 1 frontend component (12 tests, all passing) | `__tests__/` |

I prioritized depth on auth/multi-tenancy and the AI agent's tool-calling loop over breadth, since those modules most directly demonstrate AI-engineering skill rather than CRUD app-building. All three Unified Inbox channels are functional: WhatsApp via Meta Cloud API webhooks, Email via Resend's inbound webhook (svix-signed) + outbound send, and Call Logs via a manual entry form (no live telephony provider is wired — this follows the same "sandbox acceptable" pattern the brief explicitly allows for WhatsApp, applied to calls). All three run through the same AI insight pipeline (`lib/ai/insights.ts`) for summary/intent/sentiment, so the channel a message came from doesn't change how it's analyzed.

## App pages

| Route | Purpose |
|---|---|
| `/login` | Google sign-in |
| `/onboarding` | Business context capture (feeds the AI agent's system prompt) |
| `/dashboard` | Live KPIs + AI alerts |
| `/agent` | Streaming AI chat with visible tool calls + reasoning |
| `/conversations` | Unified inbox: channel filter, AI summary/intent/sentiment, AI-drafted replies |
| `/contacts` | Contact list + create |
| `/opportunities` | Pipeline list with AI score |
| `/opportunities/[id]` | Opportunity detail: stage editor, AI next-best-action, tasks, audit trail |

## Setup

```bash
npm install
cp .env.example .env.local   # fill in real values, see below
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

### Getting credentials (all free tier)
- **Postgres**: create a free project at neon.tech, copy the pooled connection string into `DATABASE_URL`.
- **Gemini**: get a free key at aistudio.google.com/apikey, put it in `GEMINI_API_KEY`.
- **Google OAuth**: Google Cloud Console -> APIs & Services -> Credentials -> Create OAuth Client (Web). Add `http://localhost:3000/api/auth/google/callback` as an authorized redirect URI.
- **JWT secrets**: generate with `openssl rand -base64 64`, paste into `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`.
- **WhatsApp**: leave blank to run in sandbox mode (outbound sends are logged and stored, not actually delivered). To go live, fill `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_APP_SECRET` from a Meta Cloud API app and set `USE_REAL_WHATSAPP=true` — no code changes needed.

### Tests
```bash
npm test
```

## Architecture

```
Browser (Next.js App Router, client components)
   |  HTTP-only cookies (access_token, refresh_token)
   v
Next.js Route Handlers (app/api/**)
   |  every handler calls getAuthContext() -> decodes JWT ->
   |  tenantId is read ONLY from the verified token, never
   |  from the request body/query
   v
lib/db.ts (Prisma singleton) --> Postgres (Neon)
   |
   +--> lib/ai/*       --> Gemini API (tool calling, streaming, insights)
   +--> lib/whatsapp/*  --> Meta Cloud API (or sandbox)
```

### Auth & multi-tenancy
- **PKCE** is used for the Google OAuth flow even though this is a confidential (server-side) client, because it's a low-cost defense against authorization-code interception and is increasingly best practice regardless of client type.
- **Access tokens** are short-lived (15 min) JWTs carrying `{ sub, tenantId, role }`, signed with `JWT_ACCESS_SECRET`. Every protected route decodes this and trusts `tenantId` from it — nowhere else.
- **Refresh tokens** are not trusted standalone — each one corresponds to a row in `refresh_tokens` (a hash only, the raw secret is never stored). On every refresh, the old row is revoked and a new one is created in the same `family`. If a revoked token is ever presented again (replay/theft), the entire family is revoked, forcing re-login. This is the standard "refresh token rotation with reuse detection" pattern.
- **Tenant isolation** is enforced at the application layer: every Prisma query that touches business data includes `tenantId` in its `where` clause, sourced from the verified JWT. As defense-in-depth, `prisma/rls.sql` adds Postgres Row-Level-Security policies as a second, independent layer (optional — see the file header for how to wire it in).
- **Business onboarding**: a new Google sign-in creates a placeholder `Tenant` immediately (so the user always has somewhere to belong), then `/onboarding` fills in the real business name/industry/goals, which feed into the AI agent's system prompt as business context.

### AI Agent
- Uses Gemini's native function-calling: `lib/ai/tools.ts` declares 5 tools (`search_contacts`, `create_task`, `update_opportunity`, `send_whatsapp`, `fetch_business_metrics`) matching the spec.
- `app/api/ai/chat/route.ts` streams Server-Sent Events back to the client. It runs a loop: send message -> if Gemini responds with a function call, execute it server-side (always tenant-scoped via the JWT's tenantId, never from the model's output) -> feed the result back to Gemini as a function response -> repeat (capped at 5 steps to prevent runaway loops) -> stream final text.
- **Explainability**: every tool call carries a short `reasoning` string explaining why the agent took that action, persisted in `ChatMessage.reasoning` and shown in the UI next to the tool call.
- **Persistent chat**: `ChatSession`/`ChatMessage` store full history per tenant+user, replayed into Gemini's `startChat` history on each request.

### Unified Inbox — Email & Call Logs
- **Email**: inbound mail arrives via Resend's webhook at `app/api/email/webhook`. Signature verification uses `svix` (the same library Resend uses to sign webhook payloads) — if `RESEND_WEBHOOK_SECRET` is unset, verification is skipped so the endpoint is curl-able for local testing. Outbound replies go through `lib/email/client.ts`, which has the identical sandbox/live switch pattern as WhatsApp (`USE_REAL_EMAIL`).
- **Call Logs**: there's no live VoIP/telephony integration (Twilio etc. would be the natural next step), so calls are logged manually via a small form on `/conversations` (contact, direction, duration, transcript/notes) right after a call happens. This is the same "sandbox acceptable" allowance the brief gives WhatsApp, applied consistently to calls. Once logged, the entry runs through the exact same `generateConversationInsights()` pipeline as WhatsApp/Email, so call transcripts get a real AI summary, intent, and sentiment — it's not just a static log entry.
- All three channels share one `Conversation`/`Message` schema distinguished by the `channel` enum, which is why the Unified Inbox UI, AI insight generation, and audit logging are channel-agnostic — adding a 4th channel (e.g. SMS) would mean one new webhook/entry-point, not new UI or AI logic.

### Workflow Automation
`POST /api/workflows/lead` implements the full chain end-to-end: creates the lead -> calls Gemini for a 0-100 qualification score with a reason -> branches (score > 80 continues, otherwise stops and logs why) -> generates and "sends" an AI-written WhatsApp follow-up -> creates a follow-up task -> writes an audit log row at every step. `GET` on the same route replays the full audit trail for a given opportunity, so the automation's decisions are inspectable after the fact.

### Security
- All input validated with `zod` schemas before touching the database.
- Cookies are `httpOnly`, `secure` (in production), `sameSite=lax`; the refresh cookie is additionally scoped to `path=/api/auth` only, so a script running on any other page can't read or send it.
- `middleware.ts` sets CSP, `X-Frame-Options`, `X-Content-Type-Options`, and a same-origin CORS allowlist for all `/api/*` routes (except the WhatsApp webhook, which Meta calls directly and is instead protected by HMAC signature verification of `X-Hub-Signature-256`).
- SQL injection is structurally prevented by using Prisma's parameterized query builder everywhere — no raw string-interpolated SQL exists in the codebase.
- Every sensitive action (auth events, AI tool calls, CRM writes, workflow steps) writes to `AuditLog`.

## Known limitations / what I'd do next with more time
- Call Logs use manual entry, not a live telephony provider (Twilio/Exotel) — by design, per the brief's sandbox-acceptable pattern, but worth calling out explicitly in the demo.
- The WhatsApp and Email webhooks both resolve an unknown sender to "the first tenant" for demo simplicity — production would map `phone_number_id` / receiving inbox address -> `tenantId` on the Tenant model directly.
- No rate limiting on the AI chat endpoint yet — would add a sliding-window limiter (e.g. Upstash Redis) per tenant before a public launch.
