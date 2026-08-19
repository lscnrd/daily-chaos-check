# Health Trail Planner — standalone PWA (with Supabase sync)

A real, installable, standalone version of the planner — the existing `health-trail-planner.jsx`
component wired into a proper Vite project, with real accounts and cross-device sync via
Supabase, and browser notifications.

## ⚠️ Important: this has NOT been installed, run, or connected to a live Supabase project
Network access is disabled in the sandbox that generated this project, so nothing here has
been executed — `npm install`, the Supabase schema, and the auth flow all follow standard,
well-documented patterns, but treat your first real run as the actual first test.

## Setup
1. **Create a Supabase project** at supabase.com (free tier is fine — see the cost breakdown
   from earlier in our conversation).
2. **Run the schema**: open the SQL editor in your Supabase dashboard and run the contents of
   `supabase/schema.sql`.
3. **Copy env vars**: `cp .env.example .env`, then fill in your project's URL and anon key
   from Supabase dashboard → Settings → API.
4. **Install and run**:
   ```bash
   npm install
   npm run dev
   ```
5. Open the printed local URL. You'll see a login/signup screen (email + password) before
   the planner loads — that's `AuthGate.jsx`.

Notifications and service workers need **https or localhost** — they won't work over a plain
http LAN IP.

## What changed vs. the earlier localStorage-only version
1. **`src/supabaseClient.js`** — initializes the Supabase client from your `.env` values.
2. **`src/storageSupabase.js`** — replaces `storagePolyfill.js`. Same `get/set/delete/list`
   shape App.jsx already expects, now backed by real Supabase tables (`personal_data`,
   `community_data`) instead of `localStorage`. App.jsx itself is untouched.
3. **`src/AuthGate.jsx`** — wraps the app; shows a login/signup form until a session exists.
   Uses email/password by default — swap for `supabase.auth.signInWithOtp({ email })` if you'd
   rather do magic-link (passwordless) sign-in.
4. **Community recipes are now genuinely shared** across every signed-in user, since they live
   in the `community_data` table instead of per-device `localStorage`.
5. **`supabase/schema.sql`** also includes `households`/`household_members`/`subscriptions`
   tables, ready for the Pro tier described in `stripe-integration-plan.md` — not yet wired
   into the app's UI.

## Deploy
1. Push this folder to a GitHub repo (make sure `.env` is in `.gitignore` — don't commit it).
2. Import it into Vercel, and add `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` as
   environment variables in the Vercel project settings (not in the repo).
3. You'll get a real `https://...vercel.app` URL, which is what makes notifications and
   "Add to Home Screen" actually work.
4. Before shipping: replace the placeholder icon paths in `public/manifest.json`
   (`/icons/icon-192.png` etc.) with real PNGs.

## Seeing how often the app is used
Every app open logs a lightweight `session_start` event (see `src/analytics.js`, wired into
`AuthGate.jsx`) to the `analytics_events` table — no separate dashboard UI needed yet, just
run the ready-made queries in `supabase/usage-analytics-queries.sql` from the Supabase SQL
Editor (logged in as yourself, the project owner) to see sessions per user, daily/weekly
active users, your most engaged users, and who's gone quiet. Regular users can only ever
write their own session events, never read anyone's usage data — that's enforced by the RLS
policy in `supabase/schema.sql`, not just a UI restriction.

## Not yet built (next steps)
- **Household UI**: the database tables exist, but there's no UI yet to create a household,
  invite members, or share the meal schedule/shopping list within one. See
  `stripe-integration-plan.md` section 1b for the design.
- **Stripe subscriptions**: also schema-ready (`subscriptions` table), but the actual
  checkout/webhook serverless functions from `stripe-integration-plan.md` aren't built yet —
  that plan has real code sketches to start from.
- **True push notifications** (fires even when the app is fully closed): needs Web Push +
  VAPID keys + a server route that sends the push, using the `subscriptions`-style pattern.
  The stubbed `push` event listener in `public/service-worker.js` shows where that plugs in.

