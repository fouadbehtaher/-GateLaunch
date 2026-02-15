# Database Setup (Secure)

## 1) Install dependencies
```bash
npm install
```

## 2) Configure environment
Create `.env` from `.env.example` and set:
```env
STORAGE_DRIVER=sqlite
DB_PATH=storage/gatelaunch.db
STORAGE_BACKUP_ENABLED=true
STORAGE_BACKUP_INTERVAL_MS=86400000
STORAGE_BACKUP_DIR=storage/backups
STORAGE_BACKUP_ON_STARTUP=true
DEMO_SEED_USERS=false
ADMIN_BOOTSTRAP_EMAIL=admin@your-domain.com
ADMIN_BOOTSTRAP_PASSWORD=Use-A-Strong-Password-Here123
```

## 3) Run server
```bash
npm start
```

On Windows PowerShell:
```powershell
powershell -ExecutionPolicy Bypass -File .\smoke-test.ps1
powershell -ExecutionPolicy Bypass -File .\prod-storage-check.ps1
```

## 4) Migration behavior
- On first run with `STORAGE_DRIVER=sqlite`, existing `data.json` is migrated automatically.
- After migration, app reads/writes from SQLite.

## 5) Security notes
- SQLite uses `WAL` mode + `FULL` sync + foreign keys enabled.
- Existing auth/session/password protections remain active.
- Keep database file inside a protected server directory.
- Backup files are generated automatically in `STORAGE_BACKUP_DIR`.

## 6) Admin health/backup endpoints
- `GET /api/storage/health` (admin only): storage health, record counts, backup status.
- `POST /api/storage/backup` (admin only): run manual backup immediately.
