# Payments Setup (Stripe Checkout)

This project supports online card payments using Stripe Checkout.

## Environment

Configure these in `.env` (see `.env.example`):

- `PAYMENTS_ENABLED=true`
- `PAYMENTS_PROVIDER=stripe`
- `PAYMENT_CURRENCY=egp`
- `STRIPE_SECRET_KEY=sk_live_...` (or `sk_test_...`)
- `STRIPE_WEBHOOK_SECRET=whsec_...`
- `STRIPE_SUCCESS_URL=https://YOUR_DOMAIN/dashboard.html#payments`
- `STRIPE_CANCEL_URL=https://YOUR_DOMAIN/dashboard.html#game-charge`

## Flow

1. User opens `dashboard.html`, creates a top-up order with wallet `online_card`.
2. Server creates the order with status `pending_payment` and generates a Stripe Checkout URL.
3. User completes payment at Stripe.
4. Stripe calls the webhook: `POST /api/webhooks/stripe`.
5. Server verifies the signature, then marks:
   - Payment: `paid`
   - Order: `paid`
6. Staff reviews the paid order in `admin.html` and sets it to `approved` or `rejected`.

## Webhook Endpoint

The webhook endpoint is:

- `POST /api/webhooks/stripe`

It requires:

- `Stripe-Signature` header
- Raw JSON body (server stores it on `req.rawBody` for verification)

## Admin Screens

- `admin.html#payments` shows online payments.
- `admin.html#orders` shows orders (including `paid` and `pending_payment` states).

