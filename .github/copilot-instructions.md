# GateLaunch AI Copilot Instructions

## Project Overview
**GateLaunch** is a graduation demo platform for gaming top-ups, support tickets, and resource access management. It combines a multi-page HTML frontend with an Express.js backend offering authentication, payment proof workflows, admin moderation, and AI-driven operational insights.

## Architecture & Data Flow

### Core Entities (in `db.js` schema)
- **users**: id, email, passwordHash, role (admin/supervisor/user), name
- **orders**: Game top-up requests (game, playerId, amount, wallet type, proofUrl, status: pending→approved/rejected)
- **receipts**: Payment records (method, amount, paymentRef, proofUrl, status pending)
- **tickets**: Support requests (title, priority, status: open/closed, userId)
- **accessRequests**: Resource access (resource: research_vault/security_lab/engineering_hub, status: pending→approved/rejected)
- **notifications**: Admin-only alerts (type, message, details, dispatched to Telegram/Slack/n8n)
- **supportRequests**: Public-facing support form submissions (source: landing/public)

### Request → Approval Flow
1. User uploads proof image → `/api/uploads/proof` (returns fileUrl)
2. User creates order/receipt with proofUrl reference → POST `/api/orders` or `/api/payment-receipts`
3. Admin notification triggered → dispatched to integrations (Telegram, Slack, etc.)
4. Admin reviews in `admin.html` → PATCH `/api/orders/:id` with status update
5. Notification dispatched again on approval/rejection

### Session & Auth
- **Session TTL**: 12 hours (configurable via `SESSION_TTL_MS`)
- **Cookie name**: `gl_session` (secure, HttpOnly, SameSite=Lax, Secure only on HTTPS in production)
- **Password strength**: min 10 chars, upper+lower+digit (enforced in signup/login)
- **Rate limiting**: 30 failed attempts per 15 minutes per IP+email

## Key Code Patterns

### Frontend (`app.js`, HTML pages)
- **Bilingual UI**: All text wrapped in `.lang-inline` (ar/en spans) or `.lang-block`. Toggle via `data-action="toggle-dir"` button.
- **RTL/LTR**: RTL class added on `<body data-page="login">` when Arabic active. Handled by `initThirdPartyUi()`.
- **Toast notifications**: Use `toast(message, type)` helper. Type: "success"/"error"/"info" → Notyf library.
- **Game catalog**: Global `topupOfferCatalog` object (PUBG UC, Free Fire, Valorant Points, etc.) with amounts and tags. Used by dashboard + payment pages.
- **API call pattern**: 
  ```javascript
  const apiBase = inferApiBase(); // Detects localhost:3000 or origin, supports file: protocol fallback
  fetch(`${apiBase}/api/endpoint`, { credentials: 'include' })
  ```

### Backend (`server.js`)
- **Middleware order**: JSON parser → CORS handler → security headers → performance tracking
- **Auth middleware**: `requireAuth` verifies session, attaches `req.user`. Returns 401 if missing.
- **Admin-only endpoints**: Check `isAdmin(req.user)` before processing. Resources (read/modify) filtered by `isStaff(user)` role.
- **Data mutations**: All write operations read current data, modify, then write atomically via `writeData(data)`.
- **Validation**: Use `sanitizeText()`, `normalizeEmail()`, `normalizeRole()` helpers to clean input.

#### Payment Wallets (normalized strings)
```javascript
["vodafone_cash", "orange_cash", "etisalat_cash", "instapay", "fawry"]
```
Receiver numbers hardcoded in QA_CHECKLIST.md: InstaPay = 01147794004, others = 01143813016.

#### Resource Access (normalized)
```javascript
["research_vault", "security_lab", "engineering_hub"]
```

### Integrations & Notifications
- **Telegram**: `telegramApi(method, payload)` calls Bot API. Broadcast via `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID`.
- **Slack**: POST to `SLACK_WEBHOOK_URL`.
- **n8n**: POST to `N8N_WEBHOOK_URL` with `eventType` + `payload`. Includes fallback (local mock replies).
- **Admin webhooks**: POST to `ADMIN_WEBHOOK_URL` with `x-admin-webhook-secret` header.
- **Notification dispatch**: `dispatchExternalNotification(notification)` sends to all configured providers in parallel.

### AI & Insights
- **AI Sync**: Periodic health check (default 5 min) via `runAiSync()`. Compares signature (pending orders, open tickets, 24h volumes) to skip redundant runs.
- **Insights**: `buildAiInsights(data, user)` calculates health score (0-100) based on order backlog ratio (45% weight), ticket pressure (35%), recent receipts (20%). Returns recommendations.
- **Fallback**: If n8n unavailable, `localAssistantReply(message, user, insights)` responds with heuristics (matches keywords in lowercase/Arabic).

## Storage Architecture

### Driver Abstraction (`db.js`)
- **JSON driver** (default): Reads/writes `data.json` synchronously.
- **SQLite driver**: Uses `better-sqlite3`, WAL mode, FULL sync, foreign keys enabled.
- **Backup system**: Auto-runs on schedule or manual trigger (`POST /api/storage/backup`). Stored in `storage/backups/` with timestamp.
- **Bootstrap admin**: `ensureBootstrapAdmin()` creates admin from `ADMIN_BOOTSTRAP_EMAIL` + `ADMIN_BOOTSTRAP_PASSWORD` env vars if not exists.
- **Demo users**: Auto-seeded unless `DEMO_SEED_USERS=false`. Three accounts: admin.demo, supervisor.demo, user.demo (passwords in `server.js`).

## Configuration (`.env`)

Essential variables:
```env
NODE_ENV=production
PORT=3000
STORAGE_DRIVER=sqlite  # or "json"
DB_PATH=storage/gatelaunch.db
STORAGE_BACKUP_ENABLED=true
STORAGE_BACKUP_INTERVAL_MS=86400000  # 24h
DEMO_SEED_USERS=false  # Enable only for testing
ADMIN_BOOTSTRAP_EMAIL=admin@your-domain
ADMIN_BOOTSTRAP_PASSWORD=StrongPassword123
```

Optional integrations:
```env
TELEGRAM_BOT_TOKEN=botXXX
TELEGRAM_CHAT_ID=-123456789
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
ADMIN_WEBHOOK_URL=https://...
ADMIN_WEBHOOK_SECRET=secret
N8N_WEBHOOK_URL=https://n8n-instance/webhook/...
N8N_WEBHOOK_SECRET=secret
AI_SYNC_ENABLED=true
```

## Development Workflow

### Running Locally
```bash
npm install
npm start  # Starts server on port 3000
# Open http://localhost:3000/index.html
```

### Validation & Checks
```bash
npm run check  # Syntax check on all JS files
npm run smoke  # PowerShell smoke-test script
```

### Testing Checklist (`QA_CHECKLIST.md`)
- Login with demo credentials (admin.demo@university.edu / admin1234)
- Submit payment receipts with proof images
- Admin review & approval workflow
- Notifications via Telegram/Slack
- Bilingual UI toggle (RTL/LTR)

### Common Edits
- **Add payment wallet**: Update `allowedWallets` Set in `/api/orders` & `/api/payment-receipts` routes in [server.js](../server.js).
- **Modify admin notification**: Update `pushAdminNotification()` call with new `type`, `title`, `message`, `details`.
- **Change password requirements**: Edit `isStrongPassword()` regex + client-side placeholder in HTML.
- **Add role**: Update `normalizeRole()` to include new role value. Then update role checks (`isAdmin`, `isStaff`).

## Performance & Monitoring

- **Performance tracking**: `summarizePerformance(windowMs)` tracks success rate, latency (avg + p95), top paths over last N ms.
- **Endpoint**: `GET /api/metrics/performance` (admin-only) returns 1h + 5min summaries + recent errors.
- **Health check**: `GET /api/storage/health` (admin-only) reports storage driver, file size, record counts, backup status.

## Security Notes
- **CORS**: Whitelist localhost + `ALLOWED_ORIGINS` env var. Rejects mismatched origins.
- **CSP**: Restricts scripts/styles to self + Google Fonts. No inline scripts except `<meta>` tags.
- **Session security**: Cookie secure flag enabled in production (auto-detect via `x-forwarded-proto` header for reverse proxy setups).
- **File uploads**: Strict type check (`.png/.jpg/.jpeg/.webp` only), random UUID naming, stored in `uploads/proofs_private/`.
- **Proof access control**: Users see only their own proofs; admins see all via `canAccessProof()` check.

## Debugging Tips
- **Mock fallback**: Frontend supports mock data (localStorage `gl_mock_data`, `gl_mock_sessions`) if API unreachable.
- **Silent failures**: Integrations (Telegram, Slack, n8n) are non-blocking; errors logged but don't block response.
- **Session expiry**: Manual cleanup via `purgeExpiredSessions()` runs every 60s. Check `sessions.get(token)` to test.
- **AI skip logic**: If signature unchanged and recently ran, `runAiSync()` returns skipped. Force with `force: true` param.
