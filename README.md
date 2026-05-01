# Immigration Form Automation

A multi-tenant web app that lets immigration consulting firms send their clients a personalized link to fill, validate, and digitally sign IRCC forms. Submissions land as filled PDFs in the firm's Google Drive and as structured rows in a Google Sheet.

**Stage 1 supports IMM 5645 (Family Information).** The architecture is designed to extend to IMM 1294, IMM 5257, IMM 0008, etc. by following the [add-new-form skill](skills/add-new-form/SKILL.md).

## Architecture

```
┌──────────── Next.js (Railway) ────────────┐     ┌─────── FastAPI (Railway) ───────┐
│ /apply/<jwt>            verify token       │ ──▶│ POST /forms/imm5645/fill         │
│ React Hook Form + Zod   submit             │     │ Pydantic validation              │
│ /apply/<jwt>/review     preview & sign     │ ◀──│ pypdf fill (encryption stripped) │
│ /api/admin/issue-link   generate JWT URLs  │     │ Drive upload + Sheets append     │
└────────────────────────────────────────────┘     └──────────────────────────────────┘
```

- **Frontend** owns user experience: validation, conditional sections (spouse hides when single, deceased-parent hint), and access control via signed JWT in the URL.
- **Backend** owns truth: re-validates every submission, fills the IRCC PDF deterministically, uploads to the tenant's Drive, appends rows to the tenant's Sheet, and returns the Drive URL.

## Repo layout

```
backend/                       FastAPI service
├── app/
│   ├── main.py                Endpoints
│   ├── auth.py                JWT issue/verify (HS256, shared secret with frontend)
│   ├── tenants.py             Per-tenant Drive folder + Sheet name (env-driven)
│   ├── forms/imm5645/         Schema, filler, PDF template
│   └── integrations/          Google Drive + Sheets clients
└── Dockerfile                 Python 3.12 slim

frontend/                      Next.js 14 (App Router)
├── app/apply/[token]/page.tsx Form landing page
├── app/api/admin/issue-link/  Admin endpoint to generate signed URLs
├── components/forms/          IMM 5645 form
├── lib/schemas/               Zod schemas (mirror Pydantic)
├── lib/token.ts               JWT (jose)
└── Dockerfile                 Node 20 alpine

tools/inspect_pdf_fields.py    AcroForm dumper (run when adding a new form)
skills/add-new-form/           SOP for extending to other IRCC forms
skills/deploy-railway/         SOP for Railway deployment
```

## How a submission flows

1. **Admin issues a link.** `POST /api/admin/issue-link` (frontend) or `POST /admin/issue-link` (backend) with `{case_id, form_type, client_name, tenant_id}`. Returns `/apply/<jwt>`.
2. **Client opens the link.** Frontend verifies the JWT server-side, renders the IMM 5645 form prefilled with case ID and the client's name.
3. **Client fills and submits.** Zod validates client-side (required vs. optional, conditional sections); request goes to FastAPI with the JWT in the `Authorization` header.
4. **Backend fills the PDF.** Pydantic re-validates → `fill_pdf()` strips PDF encryption → writes XFA field values → returns bytes. See PDF quirks below.
5. **Backend uploads + logs.** PDF goes to the tenant's `Filled Forms/` Drive folder; rows go to the tenant's `IMM5645 Submissions` sheet (3 sheets joined by `submission_id`).
6. **Client sees confirmation** with a link to the filled PDF.

## PDF quirks (IMM 5645, edition 2021-01)

These are baked into [backend/app/forms/imm5645/filler.py](backend/app/forms/imm5645/filler.py). When extending, run [tools/inspect_pdf_fields.py](tools/inspect_pdf_fields.py) on a new form and you may find different conventions:

| Quirk | Workaround |
|------|------------|
| PDF encrypted with empty user password | `pikepdf` strips encryption to bytes before pypdf clones |
| Radio button "on" state is `/1`, not `/Yes` | `BTN_ON = "/1"` in filler.py |
| Marital status dropdown export keys are `'1'`–`'8'` | `MARITAL_STATUS_EXPORT` map in schema.py |
| Deceased parents: no Yes/No field; address holds place + date of death | Validation rule in Zod `superRefine` |
| Form supports max 4 children, 7 siblings | Enforced in both Zod (`.max()`) and Pydantic (`max_length`) |

## Sheets data model

Tenant Drive: `Application Data/IMM5645 Submissions` (Google Sheet) with three tabs:

- **`Submissions`** — one row per application. PK: `submission_id` (UUIDv4). Holds applicant, spouse, parents, declarations, PDF filename + Drive ID.
- **`Children`** — zero or more rows. FK: `submission_id`. PK: `child_id`. Plus `child_index`, person fields, relationship, accompanies.
- **`Siblings`** — same shape as Children. FK: `submission_id`. PK: `sibling_id`.

Headers and row builders: [backend/app/integrations/sheets_imm5645.py](backend/app/integrations/sheets_imm5645.py). The first time you create the sheet, paste the header lists from `SUBMISSIONS_HEADERS`, `CHILDREN_HEADERS`, `SIBLINGS_HEADERS` into row 1 of each tab.

## Local development

```bash
# Backend
cd backend
cp .env.example .env       # set JWT_SECRET, ADMIN_SECRET, GOOGLE_SERVICE_ACCOUNT_JSON, TENANTS_JSON
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8080

# Frontend (separate shell)
cd frontend
cp .env.example .env.local # set JWT_SECRET (same as backend), ADMIN_SECRET, NEXT_PUBLIC_BACKEND_URL
npm install
npm run dev                # http://localhost:3000

# Issue a test link
curl -X POST http://localhost:3000/api/admin/issue-link \
  -H 'Content-Type: application/json' \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d '{"case_id":"PKT-TEST-1","client_name":"Jane Doe","tenant_id":"patko"}'
```

## Configuration

Tenants are configured by env, not code, so onboarding a new immigration firm = one env edit + restart. See `backend/.env.example` for the `TENANTS_JSON` shape.

For Google APIs, create a service account, download its JSON, paste into `GOOGLE_SERVICE_ACCOUNT_JSON` (single-line), and share each tenant's Drive folder with the SA's `client_email`.

## Deploying

See [skills/deploy-railway/SKILL.md](skills/deploy-railway/SKILL.md). In short: two Railway services (backend Dockerfile, frontend Dockerfile), shared `JWT_SECRET` and `ADMIN_SECRET`, plus the env vars listed in each `.env.example`.

## Adding a new IRCC form

See [skills/add-new-form/SKILL.md](skills/add-new-form/SKILL.md). Recipe: dump fields with `tools/inspect_pdf_fields.py` → write Pydantic schema + filler → mirror in Zod + form component → add a row builder in `integrations/`.

## Why the architecture looks like this

- **Two services** because the frontend needs Node (Next.js / Zod / RHF) and the PDF backend needs Python (pypdf / pikepdf). Splitting them keeps each repo idiomatic.
- **JWT-in-URL** keeps onboarding zero-friction — no client login, no password reset, no email-magic-link infra. Tokens carry tenant + case ID, so re-validation on the backend is a single `verify_token()` call.
- **pypdf over pdf.co** because IMM 5645 is a hybrid AcroForm/XFA: pypdf writes the XFA field paths directly, no coordinate calibration, no monthly credits, no presigned URL refresh. We discovered this works once we strip the empty-password encryption with pikepdf.
- **Sheets as a database** is good enough for stage 1: low volume, immigration consultants want to query it directly, and the PK/FK structure across `Submissions`/`Children`/`Siblings` keeps the relational integrity we'd want anyway.

## Disclaimer

This tool fills IRCC PDFs based on user-provided data — it does not provide immigration advice. The accuracy of every submission is the applicant's and their consultant's responsibility. Section 127 of the IRPA makes false declarations a federal offense. The UI surfaces this clearly; do not remove it.
