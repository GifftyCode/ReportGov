# ReportGov Lite

A small ReportGov-style complaint tracker, built in the PEBEC stack:
**Next.js 16 (App Router) · TypeScript · Convex · Clerk (auth + RBAC) · Tailwind CSS + shadcn-style components · Vercel**.

A business reports a service failure by a government agency (MDA). The MDA's officers see it live and must respond within the SLA (72 hours). If they don't, a scheduled job escalates it to PEBEC. PEBEC admins see a live responsiveness leaderboard.

---

## 1. Run it locally (about 20 minutes)

You need Node.js 20+ and free accounts on [convex.dev](https://convex.dev) and [clerk.com](https://clerk.com).

```bash
npm install
```

**Convex.** In terminal 1:

```bash
npx convex dev
```

Log in, create a new project, and leave it running. It creates `.env.local` with `CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL`, and regenerates `convex/_generated/`.

**Clerk.**

1. In the Clerk dashboard, create an application (enable Email; Google is optional).
2. Go to **Configure → Integrations → Convex** (or open dashboard.clerk.com/apps/setup/convex) and click **Activate Convex integration**. Copy the **Frontend API URL** it shows, e.g. `https://xxx-yy-12.clerk.accounts.dev`.
3. Go to **API keys** and add both keys to `.env.local`:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

**Connect Clerk to Convex, set a short demo SLA, and add the MDAs.** In terminal 2:

```bash
npx convex env set CLERK_JWT_ISSUER_DOMAIN https://xxx-yy-12.clerk.accounts.dev
npx convex env set SLA_MINUTES 3
npx convex run mdas:seed
```

`SLA_MINUTES=3` lets you show escalation live in an interview. Remove it (`npx convex env remove SLA_MINUTES`) for the real 72 hours.

**Start the app:**

```bash
npm run dev
```

Open http://localhost:3000.

## 2. Create the three demo accounts

Sign in three times, in three separate browser windows (for example Chrome, a Chrome incognito window, and Edge):

| Account | Example email | Role |
| --- | --- | --- |
| Business | `yourname+business@gmail.com` | citizen (default) |
| NPA officer | `yourname+npa@gmail.com` | officer for NPA |
| PEBEC admin | `yourname+admin@gmail.com` | admin |

Tip: in a Clerk development instance, any email containing `+clerk_test` (e.g. `yourname+clerk_test_npa@gmail.com`) accepts the verification code **424242**, so no inbox is needed.

Everyone starts as a citizen. Grant roles **server-side only**. The easiest way, which also works on Windows, is the Convex dashboard: **Functions → users → setRole → Run function**, with arguments like:

```json
{ "email": "yourname+npa@gmail.com", "role": "officer", "mdaAcronym": "NPA" }
{ "email": "yourname+admin@gmail.com", "role": "admin" }
```

Or from a Mac/Linux terminal:

```bash
npx convex run users:setRole '{"email":"yourname+npa@gmail.com","role":"officer","mdaAcronym":"NPA"}'
npx convex run users:setRole '{"email":"yourname+admin@gmail.com","role":"admin"}'
```

Refresh the officer and admin windows: their menus now show **MDA inbox** and **PEBEC dashboard**.

## 3. Deploy to Vercel

1. Push the project to a GitHub repository (`.env.local` is git-ignored; never commit keys).
2. In the Convex dashboard, open your project's **Production** deployment → Settings → generate a **Deploy key**.
3. In Vercel, import the GitHub repo and set:
   - **Build command:** `npx convex deploy --cmd 'npm run build'`
   - **Environment variables:** `CONVEX_DEPLOY_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
4. Deploy, then set up the production backend once:

```bash
npx convex env set CLERK_JWT_ISSUER_DOMAIN https://xxx-yy-12.clerk.accounts.dev --prod
npx convex env set SLA_MINUTES 3 --prod
npx convex run mdas:seed --prod
```

After signing in on the live site, assign roles in the dashboard's Production deployment, as in step 2.

Every pull request now gets its own Vercel preview URL.

## 4. Run the tests

```bash
npm test
```

There are five backend tests (Convex functions run in memory with `convex-test`):

- the full report → resolve flow
- officers from another MDA are blocked
- escalation after 72 hours
- privacy and roles
- leaderboard scoring
- input validation

---

## 5. Three-minute interview demo

Before the interview: deploy, set `SLA_MINUTES=3`, and have the three windows signed in and arranged side by side. Make sure there's at least one resolved complaint and one escalated complaint, so the leaderboard has data.

1. **Business window → Report an issue.** Choose NPA, type a title and description, and submit. You land on the tracking page with a reference (RG-XXXXXX) and a live countdown.
2. **Officer window → MDA inbox.** The complaint has **already appeared, with no refresh**. *"That's Convex reactivity: every query updates live when the data changes."*
3. Officer clicks **Start**, then types a note and clicks **Resolve**. *Point at the business window:* the status, response note and timeline update instantly.
4. **Admin window → PEBEC dashboard.** NPA's score updates live.
5. File a second complaint and leave it. *"Each complaint schedules its own escalation job when it's created. I set the SLA to 3 minutes for this demo; in production it's 72 hours."* A few minutes later, it turns **Escalated** and appears in PEBEC's list, with "System" in its timeline.
6. *Security point:* sign the business account into `/officer` → **Not authorised**. *"And that's not just hidden in the UI: the Convex function itself checks the role, so the API refuses too. I have a test for it."*

## 6. How it works (talking points)

| Requirement | Where it lives | What to say |
| --- | --- | --- |
| App Router | `app/` | Server components by default (the landing page and the `[reference]` page wrapper, which awaits `params` as a Promise). Interactive pages are client components. |
| Route protection | `proxy.ts` | Next.js 16 renamed `middleware.ts` to `proxy.ts`. `clerkMiddleware` and `auth.protect()` send signed-out users to sign-in. |
| Auth → backend | `components/ConvexClientProvider.tsx`, `convex/auth.config.ts` | `ConvexProviderWithClerk` passes Clerk's JWT to Convex, and Convex verifies it against the Clerk issuer domain. |
| RBAC | `convex/lib/auth.ts`, `convex/users.ts` | Roles are stored in Convex, not in the browser. `requireRole()` runs inside every protected function. `setRole` is an `internalMutation`, so the browser can't call it at all. |
| Data model | `convex/schema.ts` | Tables `users`, `mdas`, `complaints` and `events` (audit trail), with indexes for every lookup (`by_mda`, `by_reporter`, `by_reference`). |
| SLA timer | `convex/complaints.ts` → `create` | `ctx.scheduler.runAfter(sla, internal.complaints.escalateIfUnresolved)`. Convex stores the job, so it survives restarts. |
| Real-time | `useQuery` in every page | No polling and no websocket code; queries re-run when data changes. |
| Validation | `create` mutation, plus form `minLength` | Convex `v` validators check types; the server enforces lengths, because the client can be bypassed. |
| Privacy | `complaints.get` | Returns `null` (not "forbidden") for complaints you can't see, so it doesn't even reveal that they exist. |
| UI | `components/ui/` | shadcn-style Button, Card, Badge and inputs (`cva`, `cn()`, Radix `Slot` for `asChild`), Tailwind v4 tokens with Nigerian green as the primary colour. |

**If asked "what would you add next?"**

- SMS/email notifications at 48 hours (a Convex action calling an SMS provider).
- File attachments (Convex storage).
- Running counters per MDA instead of scanning all complaints, for national scale.
- Clerk Organizations so each MDA manages its own officers.
- A Clerk webhook to sync users, accessibility testing, and pagination (`usePaginatedQuery`).

## Project structure

```
app/
  layout.tsx                      ClerkProvider → ConvexClientProvider → Header
  page.tsx                        Landing (server component)
  report/page.tsx                 Complaint form
  complaints/page.tsx             My complaints (live)
  complaints/[reference]/         Detail + timeline
  officer/page.tsx                MDA inbox (officer role)
  admin/page.tsx                  PEBEC leaderboard (admin role)
components/
  ConvexClientProvider.tsx        Clerk ↔ Convex wiring + user sync
  RequireSignIn.tsx               Auth + role gate for pages
  Header.tsx, StatusBadge.tsx, Countdown.tsx, ui/
convex/
  schema.ts                       Tables, validators, indexes
  auth.config.ts                  Trust Clerk's JWTs
  lib/auth.ts                     getCurrentUser / requireUser / requireRole
  users.ts                        store, me, setRole (internal)
  mdas.ts                         list, seed (internal)
  complaints.ts                   create, mine, get, inbox, updateStatus, escalate, leaderboard
  complaints.test.ts              convex-test suite
proxy.ts                          Clerk route protection (Next.js 16)
```

Note: `convex/_generated/` is included so the project type-checks right away. `npx convex dev` regenerates it.
