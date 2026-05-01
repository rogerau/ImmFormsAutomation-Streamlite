---
name: deploy-railway
description: Deploy or redeploy the immigration form portal (FastAPI backend + Next.js frontend) to Railway as two separate services sharing JWT and admin secrets.
---

# Deploy to Railway

This project is two services that must share a few secrets but otherwise deploy independently. Use Railway's monorepo support: one project, two services, each pointing at a subfolder Dockerfile.

## One-time Google setup

1. In Google Cloud Console, create a service account with the **Drive API** and **Sheets API** enabled.
2. Generate a JSON key. Copy the contents (single-line) into the `GOOGLE_SERVICE_ACCOUNT_JSON` env var below.
3. For each tenant: share their `Filled Forms/` Drive folder and the `IMM5645 Submissions` Sheet with the SA's `client_email` (Editor access).

## Railway services

### Service 1: backend

- **Root directory:** `backend/`
- **Builder:** Dockerfile
- **Start command:** (empty — Dockerfile CMD handles it)
- **Port:** Railway auto-injects `PORT`; the Dockerfile binds uvicorn to it.

Env vars:

```
JWT_SECRET=<long random>            # MUST match frontend
ADMIN_SECRET=<long random>          # MUST match frontend
FRONTEND_ORIGIN=https://<frontend-railway-url>
FRONTEND_BASE_URL=https://<frontend-railway-url>
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}   # single line
TENANTS_JSON={"patko":{"filled_forms_folder_id":"...","application_data_folder_id":"...","submissions_sheet_name":"IMM5645 Submissions"}}
LOG_LEVEL=INFO
```

### Service 2: frontend

- **Root directory:** `frontend/`
- **Builder:** Dockerfile
- **Port:** Railway auto-injects `PORT`; Next.js binds via `npm start`.

Env vars:

```
JWT_SECRET=<same as backend>
ADMIN_SECRET=<same as backend>
NEXT_PUBLIC_BACKEND_URL=https://<backend-railway-url>
NEXT_PUBLIC_FRONTEND_BASE_URL=https://<frontend-railway-url>
```

## Deploy

```bash
# From the project root, after pushing to GitHub:
railway link             # pick the project
railway up               # deploys current branch
```

Or use Railway's GitHub integration so each push to `main` deploys both services. Set the **Watch Paths** so the backend service only rebuilds when `backend/**` changes (and same for frontend) — this avoids redeploying both for a one-line README change.

## Smoke test after deploy

```bash
# Health check
curl https://<backend>/healthz
# → {"ok": true}

# Issue a test link via the admin endpoint on the frontend
curl -X POST https://<frontend>/api/admin/issue-link \
  -H 'Content-Type: application/json' \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d '{"case_id":"TEST-1","client_name":"Test","tenant_id":"patko"}'

# Open the URL in a browser, fill a minimum-viable form, submit, verify:
# 1. PDF appeared in the tenant's Filled Forms Drive folder
# 2. New row in the Submissions sheet with the submission_id
```

## Adding a new tenant

1. Create their `Application Data/` folder in Drive with an empty `IMM5645 Submissions` Sheet (paste header rows from `backend/app/integrations/sheets_imm5645.py`).
2. Create their `Filled Forms/` folder.
3. Share both with the SA's `client_email`.
4. Edit `TENANTS_JSON` env on the backend service. Restart.

## Rotating secrets

- `JWT_SECRET` rotation invalidates all outstanding client links. Coordinate with the tenant before rotating; reissue any links they already shared.
- `ADMIN_SECRET` rotation only affects the firm's internal admin access — safe to rotate any time.

## Common deploy issues

- **CORS errors in the browser.** `FRONTEND_ORIGIN` on the backend must include the exact `https://...` origin Next.js runs on. Trailing slash matters.
- **`401 Invalid or expired token` on submit.** `JWT_SECRET` mismatch between services. Verify both Railway services have the identical secret.
- **`Sheet 'IMM5645 Submissions' not found`.** The SA isn't shared on the Drive folder, or the folder ID in `TENANTS_JSON` is wrong.
