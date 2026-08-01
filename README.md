# FORM/FORWARD website starter

This is a Cloudflare Pages starter for a personal-training business. It contains a responsive marketing site, Stripe Checkout endpoint, and a D1 data model for member orders and bookings.

## Before publishing

1. Create a Stripe account and products/prices; replace the three `price_REPLACE...` values in `functions/api/create-checkout.js`.
2. Create a D1 database and replace its ID in `wrangler.toml`; apply `schema.sql` using a D1 migration.
3. Choose an account provider such as Clerk and add its sign-in/account pages. The account must be created before checkout and its verified member ID passed to Stripe metadata.
4. Store `STRIPE_SECRET_KEY` and your Stripe webhook secret as Cloudflare secrets—never in Git.
5. Complete `stripe-webhook.js` with signature verification and updates to D1. Stripe webhooks are the source of truth for paid access.
6. Create a GitHub repository, push this folder, then connect that repository in Cloudflare Pages. Add the D1 binding and secrets in Cloudflare's project settings.

## Important

The interface is ready to customise, but live charging and account access intentionally remain disabled until Stripe, authentication, and the webhook signature are configured. This prevents orders from being marked paid based only on a browser redirect.
