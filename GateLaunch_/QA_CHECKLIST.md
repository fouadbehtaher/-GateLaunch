# GateLaunch QA Checklist

## 1) Login & Session
1. Open `http://localhost:3000/index.html`
2. Login with:
   - Email: `admin.demo@university.edu`
   - Password: `admin1234`
3. Confirm redirect to `dashboard.html`
4. Refresh page and confirm session remains active
5. Open `admin.html` and confirm page loads (admin access)

## 2) Landing / Login Buttons
1. In `index.html`, click `Request Demo` and confirm signup modal opens
2. In `index.html`, click `Open Support Portal` and confirm redirect to `dashboard.html#support`
3. Toggle language direction button and verify layout flips RTL/LTR correctly

## 3) Dashboard Core Interactions
1. Click plan cards and verify active state changes
2. Open payment modal and switch wallet types
3. Confirm receiver numbers:
   - InstaPay: `01147794004`
   - Others: `01143813016`
4. Click quick amount buttons and verify amount field updates
5. Click `Download invoice` and confirm JSON invoice file downloads

## 4) Dedicated Payment Pages
1. Open each page:
   - `payment-instapay.html`
   - `payment-vodafone.html`
   - `payment-orange.html`
   - `payment-etisalat.html`
   - `payment-fawry.html`
2. Confirm each page shows correct wallet logo and number
3. Try submit without proof image and confirm validation message appears
4. Upload proof + fill required fields and submit (should return to dashboard on success)

## 5) Orders / Tickets / Proofs
1. Submit new support ticket from dashboard
2. Submit new game top-up order with proof image
3. Open admin page and verify:
   - ticket appears in ticket queue
   - order appears in game orders
   - proof image preview opens in modal

## 6) Admin Notifications & AI
1. In admin page, verify notification badge updates
2. Click `Run AI Sync Now` and confirm success message
3. Verify AI metrics load in:
   - dashboard AI section
   - admin AI section
4. Send message in AI Assistant (dashboard/admin) and verify response appears

## 7) Integrations (Telegram / n8n / Slack / Webhook)
1. In admin `Integrations`, run integration test
2. Confirm status output shows each provider result
3. If `N8N_WEBHOOK_URL` is configured:
   - verify `/api/integrations/n8n/check` shows reachable
   - verify assistant source shows `n8n` (or fallback with reason)

## 8) Security/Validation Smoke Checks
1. Try invalid payment method payload to `/api/payment-receipts` and confirm rejection
2. Try empty AI assistant message to `/api/ai/assistant` and confirm rejection
3. Try invalid AI scope to `/api/ai/assistant` and confirm rejection
4. Confirm proof URL must start with `/api/uploads/proof/`

## 9) Final Acceptance
1. No button appears dead/unresponsive
2. No critical console errors during main user flow
3. User/admin flows remain consistent and role-based access works correctly
