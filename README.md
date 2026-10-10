# AI Made Simple — membership website starter

A polished beginner AI education website with a course dashboard, email/password accounts, Stripe subscription checkout, Stripe billing portal, subscription webhook, and a live OpenAI-powered tutor that is gated behind an active subscription.

## Important: not live until you configure and deploy it

This package is source code, not an already-hosted public website. To accept real payments and serve live AI tutoring, connect your own Supabase project, Stripe account, OpenAI API key, and hosting account. Never send secret API keys in chat or place them in browser code. Use Stripe test mode before accepting real money.

## What's included

- Responsive public landing page and pricing section ($9.99/month proposed price)
- Sign-up/sign-in using Supabase Auth
- Six beginner lessons with copyable practice prompts
- AI tutor API route using OpenAI, server-side only
- Stripe subscription checkout and customer billing portal
- Stripe webhook updates subscription state in Supabase
- Supabase schema with row-level security
- Example environment file

## Quick setup

1. Install Node.js 20 or later and unzip this folder.
2. Create a Supabase project at https://supabase.com and enable email/password authentication. Add your local and deployed URLs to Supabase Auth URL settings.
3. In Supabase SQL Editor, run `supabase/schema.sql`.
4. Copy `.env.example` to `.env.local` and fill in the Supabase URL, anon key, Stripe test secret key, Stripe price ID, webhook secret, site URL, OpenAI API key, and service-role key. Add `SUPABASE_SERVICE_ROLE_KEY=...` to `.env.local` (server only). Do not expose this key publicly.
5. In Stripe test mode, create a recurring product priced at $9.99 USD/month. Copy its `price_...` ID into `STRIPE_PRICE_ID`.
6. Install packages and run locally:
   ```bash
   npm install
   npm run dev
   ```
   Open http://localhost:3000.
7. In Stripe Workbench / Developers, create a webhook endpoint for `https://YOUR_DEPLOYED_DOMAIN/api/webhook` and subscribe to `checkout.session.completed`, `customer.subscription.updated`, and `customer.subscription.deleted`. For local tests, use Stripe CLI to forward webhooks to `localhost:3000/api/webhook`. Put the webhook signing secret in `STRIPE_WEBHOOK_SECRET`.
8. Deploy to Vercel or another Node-compatible Next.js host. Add every environment variable to the host. Set `NEXT_PUBLIC_SITE_URL` to the deployed HTTPS URL. Configure the custom domain after the deployment works.
9. Test sign-up, email confirmation, subscription checkout in test mode, webhook subscription update, tutor access, cancellation, and failed/expired subscription handling before switching Stripe to live mode.

## Environment variables

See `.env.example`. Add `SUPABASE_SERVICE_ROLE_KEY` (server-only) before testing the webhook. Never prefix secret keys with `NEXT_PUBLIC_`.

## Security and production checklist

- Use Stripe test mode first, then verify checkout and webhook end-to-end.
- The tutor endpoint checks the user's active subscription on the server; client UI alone does not grant access.
- The webhook must be configured with the exact signing secret for the environment.
- Add rate limiting and usage caps before opening the tutor to a large audience. API calls cost money.
- Set up support email, refund/cancellation policy, privacy policy, terms, cookie/data disclosures as applicable, and accurate business details before accepting live payments.
- Enable Supabase email confirmation and use a strong password/authentication policy.
- Do not promise income or professional outcomes. Verify course material regularly.
- Review Stripe tax settings and your obligations before launch.

## Pricing note

The $9.99/month plan is an initial proposed offer. Change the Stripe recurring price and page copy together if you change it. A Stripe Price ID is not a payment link; the server creates a subscription Checkout Session after a signed-in user clicks the membership CTA.
