# GateLaunch Production Checklist

## 1. Server Prerequisites
- Install Node.js LTS (v20+ recommended).
- Install npm (bundled with Node.js).
- Ensure ports are ready:
  - App: `3000` (internal)
  - Reverse proxy: `80/443`

## 2. Project Setup
- Run:
```powershell
npm install
```
- Verify scripts:
```powershell
npm run check
```

## 3. Environment Configuration
- Edit `.env`:
  - `NODE_ENV=production`
  - `STORAGE_DRIVER=sqlite`
  - `DB_PATH=storage/gatelaunch.db`
  - `STORAGE_BACKUP_ENABLED=true`
  - `STORAGE_BACKUP_INTERVAL_MS=86400000`
  - `STORAGE_BACKUP_DIR=storage/backups`
  - `ADMIN_BOOTSTRAP_EMAIL=<secure-admin-email>`
  - `ADMIN_BOOTSTRAP_PASSWORD=<strong-password>`
  - `DEMO_SEED_USERS=false` (set `true` only for demo/testing)
- Optional additional origins:
  - `ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com`

## 4. Start and Keep Service Alive
- Start app:
```powershell
npm start
```
- Recommended process manager:
```powershell
npm install -g pm2
pm2 start server.js --name gatelaunch
pm2 save
pm2 startup
```

## 5. Reverse Proxy + HTTPS
- Put app behind Nginx/Caddy/IIS reverse proxy.
- Enable TLS certificate (Let's Encrypt or managed cert).
- Route external traffic to internal `http://localhost:3000`.

## 6. Security Hardening
- Keep `DEMO_SEED_USERS=false` in real production.
- Use strong bootstrap admin credentials and rotate periodically.
- Restrict server firewall rules to required ports only.
- Keep OS and dependencies patched.

## 7. Storage and Backup Validation
- Check storage health endpoint (admin session required):
  - `GET /api/storage/health`
- Trigger backup test:
  - `POST /api/storage/backup`
- Confirm backup files are created in `storage/backups`.
- Test restore plan regularly.

## 8. Functional Smoke Test
- Run:
```powershell
powershell -ExecutionPolicy Bypass -File .\smoke-test.ps1
```
- Confirm:
  - Login success
  - `/api/me` authorized
  - AI endpoints responding
  - Storage health and backup endpoints working

## 9. Access Control Operations
- In `Admin`:
  - Review `Access Requests`
  - Approve/Reject requests
  - Verify notifications are generated

## 10. Monitoring and Alerts
- Monitor logs from process manager (`pm2 logs gatelaunch`).
- Watch admin Performance and Storage sections regularly.
- Configure webhook/telegram/slack integrations for critical alerts.

