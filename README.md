# Immigration Form Automation

A multi-tenant web app that lets immigration consulting firms send their clients a personalized link to fill, validate, and digitally sign a bundle of IRCC study permit forms. Submissions land as filled PDFs in the firm's Google Drive and as structured rows across several Google Sheets tabs.

**Today the app produces a Study Permit application bundle**: the main applicant's own forms, plus — when the intake answers call for them — a dependent child's own study permit forms and/or a dependent spouse's own work permit or visitor visa forms. See "What's in a submission" below for the full form list.

## Architecture

```
┌────────────── Next.js (Railway) ───────────────┐     ┌──────── FastAPI (Railway) ────────┐
│ /admin/template-links   intake → issue link     │     │ POST /admin/issue-link              │
│ /apply/<jwt>            wizard, RHF + Zod       │ ──▶ │ POST /forms/study_permit/fill       │
│ /apply/<jwt>/review     preview & sign          │     │ POST /forms/study_permit/preview    │
└──────────────────────────────────────────────────┘     │ GET  /forms/token-info               │
                                                           └──────────────┬─────────────────────┘
                                                                          │ Pydantic re-validates,
                                                                          │ fills every PDF in the
                                                                          │ bundle (pikepdf/XFA),
                                                                          │ uploads + logs via n8n
                                                                          ▼
                                                     n8n webhooks (Drive upload, Sheets append)
```

- **Frontend** owns intake and user experience: computing which optional forms a case needs from a short questionnaire, driving the client through a dynamic multi-step wizard, and access control via a signed JWT in the URL.
- **Backend** owns truth: re-validates every submission against the same rules, fills every PDF in the bundle deterministically from one payload, and hands off the upload/logging work to n8n so the HTTP response comes back fast.

## Repo layout

```
backend/                            FastAPI service
├── app/
│   ├── main.py                     Endpoints: issue-link, fill, preview, token-info
│   ├── auth.py                     JWT issue/verify (HS256, shared secret with frontend)
│   ├── tenants.py                  Per-tenant Drive folder + Sheet name (env-driven)
│   ├── eligibility/                Dependent child/spouse eligibility rules
│   │   ├── lookup.py                 get_child_status(), get_spouse_path()
│   │   └── data/dependents_eligibility.json
│   ├── forms/
│   │   ├── _xfa_application_common.py   Shared XFA nav/LOV-lookup helpers
│   │   ├── xfa_filler.py                fill_xfa_pdf() — datasets-XML injection
│   │   ├── imm1294/  imm1295/  imm5257/    Each: schema.py, filler.py, template/
│   │   ├── imm5409/  imm5475/  imm5476/
│   │   ├── imm5646/  imm5707/
│   │   └── study_permit/                Bundle orchestrator — see below
│   │       ├── schema.py                Master StudyPermitData feeding every form
│   │       ├── filler.py                fill_bundle()
│   │       ├── dependents.py            Child-as-principal projection
│   │       └── dependents_spouse.py     Spouse-as-principal projection
│   └── integrations/
│       ├── google.py               Proxies Drive/Sheets calls through n8n webhooks
│       └── sheets_study_permit.py  Tab headers + row builders (see Sheets model)
└── Dockerfile                      Python slim

frontend/                           Next.js (App Router)
├── app/
│   ├── admin/template-links/       Intake questionnaire → issue a client link
│   ├── api/admin/issue-link/       Proxies to backend POST /admin/issue-link
│   ├── api/admin/template-links/
│   └── apply/[token]/              Wizard landing page
├── components/forms/
│   ├── StudyPermitWizard.tsx       Dynamic step sequence, draft autosave
│   ├── WizardProgress.tsx / FormsGuidance.tsx
│   ├── steps/                      One component per wizard step — see below
│   └── fields/                     Shared field primitives (residence history, parent block, ...)
├── lib/
│   ├── schemas/study_permit.ts     Zod schema mirroring the Pydantic one
│   ├── templateLinks.ts            IntakeAnswers → deriveOptionalForms()
│   ├── token.ts                    JWT (jose)
│   └── data/countries.ts
└── Dockerfile                      Node alpine

tools/inspect_pdf_fields.py         AcroForm field dumper (run when adding a new form)
skills/add-new-form/                SOP for extending to another IRCC form/bundle
skills/debug-xfa-form-field/        SOP for "field renders wrong/blank on a pure-XFA PDF"
skills/deploy-railway/              SOP for Railway deployment
```

## What's in a submission

One `StudyPermitData` payload can produce up to ~13 PDFs, depending on the intake answers:

**Main applicant — always generated:**
- IMM 1294 (Study Permit application)
- IMM 5707 (Family Information)

**Main applicant — optional, one form per active flag:**
- IMM 5409 (Statutory Declaration of Common-law Union) — if marital status is common-law
- IMM 5646 (Custodianship Declaration) — if the main applicant is a minor
- IMM 5476 (Use of a Representative) — if a rep/lawyer is appointed
- IMM 5475 (Authority to Release Personal Information) — if requested

**Each dependent child filing their own study permit** (gated by the eligibility engine — accompanied minors don't need a custodianship declaration since a parent is already travelling with them):
- IMM 1294 + IMM 5707, one pair per child

**A dependent spouse/common-law partner filing their own application** (mutually exclusive path, decided by the main applicant's program of study level against `eligibility/data/dependents_eligibility.json`'s eligible study levels):
- IMM 5707, always
- IMM 1295 (Work Permit) — if the main applicant's program qualifies for a spousal open work permit
- IMM 5257 (Temporary Resident Visa) + Schedule 1 — otherwise, as a visitor
- IMM 5409/5476/5475 are reused/adapted from the main applicant's own declarations when active, with the spouse's own identity, signature, and application type substituted in where IRCC requires it to be form-specific (e.g. the spouse's IMM 5476 says "Work Permit (Outside Canada)", not "Study Permit")

IMM 5483/5484/5488 (document checklists) aren't fillable forms and are out of scope everywhere.

## How a submission flows

1. **Admin runs the intake questionnaire.** `/admin/template-links` collects marital status, whether a rep is wanted, whether there are minor children studying, whether a spouse is accompanying, and (if so) the main applicant's program of study level. `deriveOptionalForms()` turns these answers into an `optional_forms` list.
2. **Admin issues the link.** `POST /admin/issue-link` `{case_id, client_name, tenant_id, optional_forms, auto_number}` returns a signed `/apply/<jwt>` URL, valid `expires_in_days` (default 30).
3. **Client opens the link.** The wizard verifies the JWT, then renders exactly the steps that `optional_forms` calls for — 5 fixed base steps, a dynamic run of optional steps in a fixed priority order, then Review & Sign. The whole draft autosaves to `localStorage` per case as the client fills it in.
4. **Client submits.** Zod validates client-side (required-vs-optional per active step, cross-field rules via `superRefine`); the full payload posts to `POST /forms/study_permit/fill` with the JWT in the `Authorization` header.
5. **Backend fills every PDF in the bundle.** Pydantic re-validates → `fill_bundle()` builds a complete XFA datasets XML per form and injects it via `fill_xfa_pdf()` → returns all PDF bytes keyed by form id (`imm1294`, `imm5707`, `imm1295_spouse`, `imm1294_child_1`, ...).
6. **Backend uploads + logs, in the background.** PDFs go to the tenant's `Filled Forms/` Drive folder and rows go to the tenant's Sheet (see the data model below) via n8n webhooks, as a `BackgroundTask` after the response is already sent — keeps the request under Railway's proxy timeout.
7. **Client sees confirmation** with links to every filled PDF.

## Base wizard steps

Steps 1–5 are always shown; the optional steps below are inserted in this order for whichever `optional_forms` are active; Review & Sign is always last.

| Step | Feeds |
|---|---|
| Personal Info & Passport | IMM 1294 |
| Study Details | IMM 1294 |
| Family Background | IMM 5707 — also decides which optional steps activate |
| Children | IMM 5707 |
| Education & Employment | IMM 1294 |
| Common-law Declaration | IMM 5409 |
| Custodian Declaration | IMM 5646 |
| Representative | IMM 5476 |
| Authority to Release Info | IMM 5475 |
| Dependent Children | each child's own IMM 1294 / IMM 5707 |
| Spouse — Work Permit / Visitor Visa | the spouse's own identity/passport/residence/address |
| Spouse — Background | the spouse's own language/education/employment/parents/previous-marriage (and Schedule 1, visitor path only) |
| Review & Sign | final Zod validation across the whole payload, signature capture |

## Sheets data model

All 9 tabs are keyed to `submission_id` (a UUIDv4 assigned once per bundle submission). Headers and row builders: [backend/app/integrations/sheets_study_permit.py](backend/app/integrations/sheets_study_permit.py).

- **`Submissions`** — one row per bundle: main applicant identity, passport, national ID, US PR card, contact/address, case/tenant metadata, and every PDF's Drive link.
- **`Children`** — zero+ rows: each child's identity + relationship, and (if filing their own permit) their own passport/school/study details + PDF links.
- **`Spouse_Submissions`** — one row when a spouse application exists: the spouse's own data not already duplicated on `Submissions`.
- **`Employment`** / **`Education`** — history entries for the main applicant and/or spouse, disambiguated by an `applicant` column.
- **`Representatives`** / **`CommonLaw`** / **`Custodian`** / **`ReleaseAuthority`** — one row each, only when that optional form is active.

The first time you create a tenant's Sheet, paste each tab's `*_HEADERS` list into row 1.

## Local development

```bash
# Backend
cd backend
cp .env.example .env       # set JWT_SECRET, ADMIN_SECRET, N8N_DRIVE_WEBHOOK_URL, N8N_SHEETS_WEBHOOK_URL, TENANTS_JSON
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8080

# Frontend (separate shell)
cd frontend
cp .env.example .env.local # set JWT_SECRET (same as backend), ADMIN_SECRET, NEXT_PUBLIC_BACKEND_URL, NEXT_PUBLIC_GEONAMES_USERNAME
npm install
npm run dev                # http://localhost:3000

# Issue a test link
curl -X POST http://localhost:3000/api/admin/issue-link \
  -H 'Content-Type: application/json' \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d '{"case_id":"PKT-TEST-1","client_name":"Jane Doe","tenant_id":"patko","optional_forms":["imm5476"]}'
```

Or use `/admin/template-links` in the browser to run the intake questionnaire and get `optional_forms` computed for you.

## Configuration

Tenants are configured by env, not code, so onboarding a new immigration firm is one env edit + restart — see `backend/.env.example` for the `TENANTS_JSON` shape (`filled_forms_folder_id`, `submissions_spreadsheet_id`, `submissions_sheet_name`). The `submissions_sheet_name` default string is a legacy leftover from the app's original single-form days; it doesn't affect behavior, just rename it per tenant.

**Google API access goes through n8n, not a service-account key** — `backend/app/integrations/google.py` proxies every Drive upload and Sheets append through two n8n webhooks (`N8N_DRIVE_WEBHOOK_URL`, `N8N_SHEETS_WEBHOOK_URL`) using n8n's own OAuth credentials. This was a deliberate switch away from a service-account JSON key, which was blocked by org policy.

## Deploying

See [skills/deploy-railway/SKILL.md](skills/deploy-railway/SKILL.md). In short: two Railway services (backend Dockerfile, frontend Dockerfile), shared `JWT_SECRET` and `ADMIN_SECRET`, plus the env vars listed in each `.env.example`.

## Adding a new IRCC form

See [skills/add-new-form/SKILL.md](skills/add-new-form/SKILL.md). Recipe: dump fields with `tools/inspect_pdf_fields.py` → write Pydantic schema + filler → mirror in Zod + form component → add a row builder in `integrations/`.

## A field is blank or wrong on a generated PDF

See [skills/debug-xfa-form-field/SKILL.md](skills/debug-xfa-form-field/SKILL.md). Pure-XFA fillers fail silently: a wrong `.find()` path or a missing lic-code map just skips the field, no exception. The skill covers both root causes and the one verification method that actually proves a fix works (render the datasets XML directly and inspect it — tracing Python data-flow alone doesn't prove anything).

## Why the architecture looks like this

- **Two services** because the frontend needs Node (Next.js / Zod / RHF) and the PDF backend needs Python (pikepdf / XFA datasets manipulation). Splitting them keeps each repo idiomatic.
- **JWT-in-URL** keeps onboarding zero-friction — no client login, no password reset, no email-magic-link infra. Tokens carry tenant + case ID + the authorized `optional_forms`, so re-validation on the backend is a single `verify_token()` call plus a subset check.
- **Datasets-XML injection over field-by-field filling** because every form in the current bundle is pure XFA (no AcroForm fields at all — confirmed per-form with `tools/inspect_pdf_fields.py`): the actual field values live in a `datasets` XML stream inside the PDF, so the filler builds a complete XML document from a template dump and injects it via `pikepdf`, rather than setting individual AcroForm field values.
- **One bundle endpoint, not one endpoint per form** because a single client submission almost always produces several related PDFs (main applicant + optional forms + dependents) from one coherent payload — splitting that into N separate requests would mean re-deriving cross-form facts (shared address, reciprocal spouse data, signatures) N times instead of once in `fill_bundle()`.
- **n8n webhooks over a service-account key** for Drive/Sheets access because a service-account JSON key was blocked by org policy; proxying through n8n's existing OAuth credentials avoided that without changing the per-tenant folder/sheet model.
- **Sheets as a database** is good enough for this stage: low volume, immigration consultants want to query it directly, and the `submission_id`-keyed tabs give the relational integrity the data actually needs (one bundle → one main row + variable child/spouse/history rows).

## Disclaimer

This tool fills IRCC PDFs based on user-provided data — it does not provide immigration advice. The accuracy of every submission is the applicant's and their consultant's responsibility. Section 127 of the IRPA makes false declarations a federal offense. The UI surfaces this clearly; do not remove it.
