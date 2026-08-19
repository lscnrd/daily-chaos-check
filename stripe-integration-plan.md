# Stripe subscription plan — Health Trail Pro

This is an implementation plan with real code sketches, not a working, deployed system —
Stripe payments require a real backend to verify webhooks and store subscription state
server-side, which doesn't exist yet in the test-phase (localStorage-only) version of this
app. This plan assumes you've done Phase 2 from the PWA README (Supabase added for auth +
data), since Stripe state needs to live somewhere trustworthy, not just in the browser.

## Why client-side-only gating isn't enough
It's tempting to just store `isPro: true` in `localStorage`/`window.storage` and check it in
the UI. That's fine for the UI *display* logic, but anyone can open devtools and set that
flag themselves to unlock Pro for free. **Server-side verification is required** for
anything that costs you money to serve (community recipe storage, sync, etc.) — the UI flag
is just for a responsive interface, the source of truth is your database.

## 1. Data model (Supabase)
```sql
create table subscriptions (
  user_id uuid primary key references auth.users(id),
  stripe_customer_id text,
  stripe_subscription_id text,
  status text, -- 'active' | 'trialing' | 'past_due' | 'canceled'
  current_period_end timestamptz,
  updated_at timestamptz default now()
);
```
A user is "Pro" if `status in ('active','trialing')` and `current_period_end > now()`.

## 2. Checkout — starting a subscription
A serverless function (Vercel API route or Supabase Edge Function) creates a Stripe
Checkout session server-side (never expose your Stripe secret key to the browser):

```js
// api/create-checkout-session.js
import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  const { userId, userEmail } = req.body; // from your authenticated session

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: userEmail,
    line_items: [{ price: process.env.STRIPE_PRICE_ID_PRO_MONTHLY, quantity: 1 }],
    success_url: `${process.env.APP_URL}/settings?upgraded=true`,
    cancel_url: `${process.env.APP_URL}/settings`,
    metadata: { userId }, // so the webhook knows who this is for
  });

  res.status(200).json({ url: session.url });
}
```
Client side: call this endpoint, then `window.location.href = url` to redirect to Stripe's
hosted checkout page (no card form to build yourself).

## 3. Webhook — the source of truth
Stripe calls your webhook when payment succeeds/subscription changes. This is what actually
updates the database — never trust the `success_url` redirect alone, since a user could
navigate there manually without paying.

```js
// api/stripe-webhook.js
import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const config = { api: { bodyParser: false } }; // Stripe needs the raw body

export default async function handler(req, res) {
  const sig = req.headers["stripe-signature"];
  let event;
  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook signature verification failed`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    await upsertSubscription({
      userId: session.metadata.userId,
      stripeCustomerId: session.customer,
      stripeSubscriptionId: session.subscription,
      status: "active",
    });
  }

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const sub = event.data.object;
    await updateSubscriptionStatus(sub.id, sub.status, sub.current_period_end);
  }

  res.json({ received: true });
}
```
Register this URL in the Stripe dashboard (Test mode first) under Developers → Webhooks,
listening for at least: `checkout.session.completed`, `customer.subscription.updated`,
`customer.subscription.deleted`.

## 4. Reading Pro status in the app
The client fetches its own subscription row (Supabase Row Level Security ensures a user can
only read their own row) and stores it in state/context:

```js
const { data } = await supabase
  .from("subscriptions")
  .select("status, current_period_end")
  .eq("user_id", user.id)
  .single();

const isPro = data && ["active", "trialing"].includes(data.status)
  && new Date(data.current_period_end) > new Date();
```

## 5. Gating pattern in the existing component
A simple wrapper keeps gating consistent and easy to find/audit later:

```jsx
function ProGate({ isPro, feature, children, onUpgradeClick }) {
  if (isPro) return children;
  return (
    <div className="rounded-lg p-4 text-center" style={{ background: "#EAF2F0" }}>
      <p className="text-sm mb-2">{feature} is a Pro feature.</p>
      <button onClick={onUpgradeClick} className="text-sm font-medium px-4 py-2 rounded-lg" style={{ background: "#2F6E63", color: "#FFFFFF" }}>
        Upgrade to Pro
      </button>
    </div>
  );
}
```
Where to drop it in, based on the Free/Pro split we discussed:

| Feature | File location (current App.jsx) |
|---|---|
| Add/browse community recipes | The "Add recipe" form + "Choose a different recipe" community list |
| Real push notifications | The "Enable browser notifications" button/section |
| Cross-device sync | Gate at the Supabase Auth login screen itself (Pro = login available) |
| Trend/insight text on the weight chart | Weight Tracker card, below the chart |
| Data export (CSV/PDF) | New button in Weight Tracker / Shopping list cards |
| History beyond 30 days | `entries` lookup — cap the date range for non-Pro in `weekDays`/shopping list range logic |

**Important:** gating "history beyond 30 days" needs the actual data restriction to also
happen server-side (don't sync/store more than 30 days for free users) — otherwise a free
user's local cache could still show it.

## 6. Testing before going live
- Use Stripe **test mode** keys everywhere until you're ready to charge real cards.
- Test card: `4242 4242 4242 4242`, any future expiry, any CVC.
- Use the Stripe CLI (`stripe listen --forward-to localhost:3000/api/stripe-webhook`) to
  receive webhooks locally during development.
- Test the cancellation and payment-failure paths too (`customer.subscription.deleted`,
  `invoice.payment_failed`) — these are the parts people forget until a real user hits them.

## 7. Costs (recap from earlier)
Stripe itself: no monthly fee, **1.5% + €0.25 per transaction** in the EU. Combined with the
Vercel Pro (~$20/mo) + Supabase Pro (~$25/mo) once you're commercial, your fixed cost floor
is roughly **~€45/month**, plus Stripe's per-transaction cut on whatever you actually sell.
