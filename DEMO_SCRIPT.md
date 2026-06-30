# Demo Video Script — AI Business Operations Platform

Target length: 9-11 minutes. Record AFTER you've personally clicked through
every flow once with real credentials — don't discover bugs on camera.

Tools: any screen recorder (Loom is easiest — auto-uploads, gives you a
shareable link, which is exactly what the submission form wants).

---

## 0. Cold open (15 sec) — say this on camera, don't skip it

"Hi, I'm [name]. This is my submission for the DareXAI Full Stack AI
Engineer challenge — an AI Business Operations Platform built with
Next.js 14, Postgres/Prisma, and the Gemini API. I'll walk through the
product, then the architecture."

Why: reviewers watch dozens of these. Stating your name + what this is
in the first 15 seconds means they don't have to guess.

## 1. Login (30 sec)

- Show the login screen, click "Continue with Google."
- Narrate while it loads: "This uses the OAuth Authorization Code flow
  with PKCE — even though it's a confidential server-side client, PKCE
  protects against authorization-code interception."
- Land on /onboarding for a fresh account.

## 2. Business Onboarding (30 sec)

- Fill in business name, industry, a goal, a product summary.
- Say: "This isn't just a form — this becomes the AI agent's business
  context. Every conversation the agent has is grounded in what I just
  typed here."
- Submit, land on dashboard.

## 3. Dashboard (30 sec)

- Point at each KPI: active opportunities, revenue pipeline, pending
  follow-ups, new customers, AI alerts.
- Say: "These are live queries against Postgres, not mock numbers —
  I'll prove that by changing data later and refreshing this page."

## 4. AI Conversation + Tool Calling + Explainability (2-2.5 min) — THE MOST IMPORTANT SECTION

- Go to /agent.
- Type something concrete: "Find Rahul Sharma and create a follow-up
  task for tomorrow" (use a contact you've seeded, or first ask it
  "create a contact named Rahul Sharma, phone +91XXXXXXXXXX" — works
  too since create_task doesn't require contactId).
- While it streams, narrate: "Watch the response stream token by
  token — that's Server-Sent Events from the API route. And here —"
  [point at the tool call box that appears] "— this shows exactly
  which tool the agent invoked, the arguments it used, and a one-line
  explanation of WHY it did that. That's the explainability requirement
  — it's not a black box."
- Ask a second, different question that triggers a different tool,
  e.g. "What's my pipeline looking like right now?" → triggers
  fetch_business_metrics. Point out it's pulling real numbers that
  match the dashboard.
- Say: "This chat is persisted — if I refresh, history is still here,"
  and actually refresh to prove it.

## 5. CRM (45 sec)

- /contacts: show the list, add one manually.
- /opportunities: click into one opportunity.
- On the detail page: change the stage by clicking a pill, point at the
  AI score and AI next-best-action fields, scroll to the audit trail.
- Say: "Every stage change here is also logged in the audit trail you
  see at the bottom — same audit system the AI agent uses."

## 6. Unified Inbox — WhatsApp / Email / Call (1.5-2 min)

- /conversations, show the channel filter pills.
- If you have a real WhatsApp sandbox number: send yourself a test
  message from your phone, show it land in the inbox live, point at
  the AI summary/intent/sentiment that gets generated.
- If not live: show an existing WhatsApp conversation with the AI
  summary box, then click "Reply for me" to show an AI-drafted reply,
  edit it slightly, send it.
- Switch to Email filter: show an email conversation (real if you set
  up Resend inbound; otherwise mention "Email uses the identical
  pattern via Resend's inbound webhook — same AI pipeline, same UI").
- Switch to Call: click "+ Log call", fill in a contact, paste a short
  fake transcript, save it live on camera, and show the AI-generated
  summary/sentiment appear within a few seconds.
- Say explicitly: "Call Logs use manual entry rather than a live
  telephony provider — I made that call deliberately, the same way the
  brief explicitly allows sandbox mode for WhatsApp. The AI analysis
  pipeline is identical regardless of how the data gets in."

## 7. Workflow Automation (1.5 min)

- Trigger the lead workflow (via a simple form if you built one, or via
  Postman/curl shown on screen — either is fine, just show the request
  and the response).
- Narrate while it runs: "This is the full chain — new lead created,
  Gemini scores it 0 to 100 with a reason, if the score clears the
  threshold it generates and sends a WhatsApp follow-up, creates a
  task, and logs every step."
- Show the resulting contact/opportunity/task appear in the CRM.
- Show the audit trail (GET on the workflow route, or the opportunity
  detail page) listing every step in order.

## 8. Multi-Tenant Isolation (1 min) — DON'T SKIP, IT'S NAMED EXPLICITLY

- Log out, log in with a SECOND Google account (or incognito window).
- Go through onboarding again with a different business name.
- Show the dashboard/contacts/opportunities are completely empty —
  none of tenant A's data is visible.
- Say: "Different tenant, zero overlap. tenantId comes only from the
  verified JWT on every single query — never from anything the client
  sends — so there's no way to leak across tenants even with a buggy
  request."

## 9. Security + Architecture Walkthrough (1.5-2 min)

Pull up the code, not just talk over it:
- middleware.ts: point at CSP/CORS headers.
- lib/auth/tokens.ts: explain refresh rotation + reuse detection in
  your own words (don't read the comments verbatim — paraphrase).
- lib/db.ts / any API route: point at tenantId always being in the
  `where` clause, sourced from the JWT.
- prisma/schema.prisma: scroll through briefly, mention the entities
  match their required list (Tenants, Users, Contacts, Opportunities,
  ChatMessage/ChatSession, RefreshToken, AuditLog) plus the extensions
  you made and why (Conversation/Message shared across channels, Task).
- Run `npm test` on screen, show all suites passing — auth, tenant
  isolation, AI tool calling, one frontend component, exactly what they
  asked for.

## 10. Close (15 sec)

"That's the full platform — auth, the AI agent with tool calling and
explainability, CRM, a unified inbox across three channels, one
complete workflow automation, and a tenant-isolated multi-tenant
architecture underneath all of it. README has full setup instructions
and the rationale behind every major decision. Thanks for watching."

---

## Before you hit record — checklist

- [ ] Fresh `npx prisma migrate dev` ran clean against your real Neon DB
- [ ] Real Gemini key in .env.local, tested at least one chat message
- [ ] At least 3-4 contacts and 2-3 opportunities seeded so screens
      aren't empty
- [ ] At least one WhatsApp conversation exists (sandbox is fine) so
      the inbox isn't empty when you switch to it on camera
- [ ] Second Google account ready and NOT already onboarded, so the
      isolation demo is a clean "empty dashboard" moment
- [ ] Browser zoom at 100%, close unrelated tabs, hide bookmarks bar
- [ ] Test your mic audio for 10 seconds before the real take
- [ ] Have the workflow-trigger request (Postman/curl) ready to fire
      with one click, not typed live
