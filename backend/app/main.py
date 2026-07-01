"""FastAPI entry point for the immigration form automation service."""
from __future__ import annotations

import io
import logging
import os
import zipfile
from datetime import datetime, timezone

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.requests import Request

load_dotenv()

from . import tenants
from .auth import TokenClaims, issue_token, verify_token
from .forms.study_permit.filler import fill_bundle
from .forms.study_permit.schema import StudyPermitData
from .integrations.google import append_rows, increment_counter, upload_pdf_to_drive
from .integrations.sheets_study_permit import (
    children_rows,
    common_law_row,
    custodian_row,
    education_rows,
    employment_rows,
    new_submission_id,
    release_authority_row,
    representatives_row,
    spouse_submission_row,
    submissions_row,
)

log = logging.getLogger("imm_automation")
logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO"))

def _client_ip(request: Request) -> str:
    fwd = request.headers.get("X-Forwarded-For")
    return fwd.split(",")[0].strip() if fwd else (request.client.host or "unknown")

limiter = Limiter(key_func=_client_ip)

app = FastAPI(
    title="Immigration Form Automation",
    version="0.2.0",
    docs_url=None,
    redoc_url=None,
)

allowed = os.environ.get("FRONTEND_ORIGIN", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in allowed.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


def require_token(authorization: str = Header(default="")) -> TokenClaims:
    if not authorization.lower().startswith("bearer "):
        log.warning("Token auth failure — missing bearer header")
        raise HTTPException(status_code=401, detail="Missing bearer token")
    claims = verify_token(authorization.split(" ", 1)[1])
    if not claims:
        log.warning("Token auth failure — invalid or expired JWT")
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return claims


def require_admin(x_admin_secret: str = Header(default="")) -> None:
    expected = os.environ.get("ADMIN_SECRET", "")
    if not expected or x_admin_secret != expected:
        log.warning("Admin auth failure — bad or missing x-admin-secret")
        raise HTTPException(status_code=401, detail="Admin secret required")


@app.get("/healthz")
def healthz():
    return {"ok": True}


class IssueLinkRequest(BaseModel):
    case_id: str
    form_type: str = "study_permit"
    client_name: str
    tenant_id: str
    expires_in_days: int = 30
    optional_forms: list[str] = []
    auto_number: bool = False


@app.post("/admin/issue-link")
@limiter.limit("10/minute")
def admin_issue_link(req: IssueLinkRequest, request: Request, _=Depends(require_admin)):
    if not tenants.get(req.tenant_id):
        raise HTTPException(status_code=400, detail=f"Unknown tenant: {req.tenant_id}")
    token = issue_token(
        case_id=req.case_id,
        form_type=req.form_type,
        client_name=req.client_name,
        tenant_id=req.tenant_id,
        expires_in_days=req.expires_in_days,
        optional_forms=req.optional_forms,
        auto_number=req.auto_number,
    )
    base = os.environ.get("FRONTEND_BASE_URL", "http://localhost:3000")
    return {"token": token, "url": f"{base}/apply/{token}"}


class TokenInfo(BaseModel):
    case_id: str
    form_type: str
    client_name: str
    tenant_id: str
    optional_forms: list[str]


@app.get("/forms/token-info", response_model=TokenInfo)
def token_info(claims: TokenClaims = Depends(require_token)):
    return TokenInfo(
        case_id=claims.case_id,
        form_type=claims.form_type,
        client_name=claims.client_name,
        tenant_id=claims.tenant_id,
        optional_forms=claims.optional_forms,
    )


# ---------------------------------------------------------------------------
# Study permit form number → filename prefix
# ---------------------------------------------------------------------------
_FORM_NUM = {
    "imm1294": "IMM1294",
    "imm5707": "IMM5707",
    "imm5409": "IMM5409",
    "imm5646": "IMM5646",
    "imm5476": "IMM5476",
    "imm1295": "IMM1295",
    "imm5257": "IMM5257",
    "imm5257_sch1": "IMM5257_SCH1",
}


def _filename(form_id: str, case_id: str, family_name: str, given_name: str) -> str:
    safe_family = "".join(c for c in family_name.upper() if c.isalnum()) or "UNKNOWN"
    safe_given = "".join(c for c in given_name.upper() if c.isalnum()) or "UNKNOWN"
    ts = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    # Dependant child forms are keyed e.g. "imm1294_child_2"; spouse forms are
    # keyed e.g. "imm1295_spouse". The prefix comes from the base form id, and
    # the name passed in is the dependant's (child's or spouse's).
    base_id = form_id.split("_child_")[0]
    if base_id.endswith("_spouse"):
        base_id = base_id[: -len("_spouse")]
    prefix = _FORM_NUM.get(base_id, base_id.upper())
    return f"{prefix}_{case_id}_{safe_family}_{safe_given}_{ts}.pdf"


# ---------------------------------------------------------------------------
# POST /forms/study_permit/fill
# ---------------------------------------------------------------------------
@app.post("/forms/study_permit/fill")
def study_permit_fill(payload: StudyPermitData, claims: TokenClaims = Depends(require_token)):
    if claims.form_type != "study_permit":
        raise HTTPException(status_code=403, detail="token not issued for study_permit")

    # Validate optional_forms in payload are a subset of what the token allows
    unauthorized = set(payload.optional_forms) - set(claims.optional_forms)
    if unauthorized:
        raise HTTPException(
            status_code=403,
            detail=f"optional_forms not authorized by token: {unauthorized}",
        )

    tenant = tenants.get(claims.tenant_id)
    if not tenant:
        raise HTTPException(status_code=400, detail=f"Unknown tenant: {claims.tenant_id}")

    case_numbering_warning = False
    if claims.auto_number:
        try:
            seq = increment_counter(tenant.submissions_spreadsheet_id, claims.case_id)
            payload.case_id = f"{claims.case_id}-{seq:04d}"
        except Exception:
            log.exception("Case numbering failed — falling back to timestamp suffix")
            payload.case_id = f"{claims.case_id}-{int(datetime.now(timezone.utc).timestamp())}"
            case_numbering_warning = True
    elif claims.case_id != payload.case_id:
        raise HTTPException(status_code=403, detail="case_id mismatch with token")

    payload.submission_id = new_submission_id()

    # Fill all PDFs
    try:
        pdf_bundle = fill_bundle(payload)
    except Exception:
        log.exception("PDF fill failed")
        raise HTTPException(status_code=500, detail="PDF fill failed — see server logs")

    # Upload each PDF to Drive
    family_name = payload.personal_info.family_name
    given_name = payload.personal_info.given_name
    drive_results: dict[str, dict] = {}
    upload_errors: list[str] = []

    for form_id, pdf_bytes in pdf_bundle.items():
        # Dependant child forms ("..._child_N") are named after the child, spouse
        # forms ("..._spouse") after the spouse — not the main applicant.
        if "_child_" in form_id:
            ci = int(form_id.rsplit("_child_", 1)[1]) - 1
            child = payload.family.children[ci]
            fam_n, giv_n = child.family_name, child.given_names
        elif form_id.endswith("_spouse") and payload.family.spouse:
            fam_n, giv_n = payload.family.spouse.family_name, payload.family.spouse.given_names
        else:
            fam_n, giv_n = family_name, given_name
        filename = _filename(form_id, payload.case_id, fam_n, giv_n)
        try:
            result = upload_pdf_to_drive(filename, pdf_bytes, tenant.filled_forms_folder_id)
            drive_results[form_id] = result
        except Exception as e:
            log.exception(f"Drive upload failed for {form_id}")
            upload_errors.append(f"{form_id}: {e}")

    if not drive_results and upload_errors:
        raise HTTPException(status_code=502, detail="Drive upload failed — see server logs")

    # Write to Google Sheets
    sheet_id = tenant.submissions_spreadsheet_id
    sheets_warning: bool = False
    try:
        append_rows(
            sheet_id,
            "Submissions",
            [submissions_row(payload, claims.tenant_id, drive_results)],
        )
        crows = children_rows(payload, drive_results)
        if crows:
            append_rows(sheet_id, "Children", crows)
        emp_rows = employment_rows(payload)
        if emp_rows:
            append_rows(sheet_id, "Employment", emp_rows)
        edu_rows = education_rows(payload)
        if edu_rows:
            append_rows(sheet_id, "Education", edu_rows)
        rep_row = representatives_row(payload)
        if rep_row:
            append_rows(sheet_id, "Representatives", [rep_row])
        cl_row = common_law_row(payload)
        if cl_row:
            append_rows(sheet_id, "CommonLaw", [cl_row])
        cust_row = custodian_row(payload)
        if cust_row:
            append_rows(sheet_id, "Custodian", [cust_row])
        ra_row = release_authority_row(payload)
        if ra_row:
            append_rows(sheet_id, "ReleaseAuthority", [ra_row])
        spouse_row = spouse_submission_row(payload, drive_results)
        if spouse_row:
            append_rows(sheet_id, "Spouse_Submissions", [spouse_row])
    except Exception:
        log.exception("Sheets append failed")
        sheets_warning = True

    response: dict = {
        "submission_id": payload.submission_id,
        "forms": {
            fid: {
                "pdf_drive_id": res.get("id"),
                "pdf_url": res.get("webViewLink"),
            }
            for fid, res in drive_results.items()
        },
    }
    if upload_errors:
        response["upload_warnings"] = True
    if sheets_warning:
        response["sheets_warning"] = True
    if case_numbering_warning:
        response["case_numbering_warning"] = True
    return response


# ---------------------------------------------------------------------------
# POST /forms/study_permit/preview  (returns ZIP of all PDFs)
# ---------------------------------------------------------------------------
@app.post("/forms/study_permit/preview")
def study_permit_preview(payload: StudyPermitData, claims: TokenClaims = Depends(require_token)):
    if claims.case_id != payload.case_id:
        raise HTTPException(status_code=403, detail="case_id mismatch with token")
    if claims.form_type != "study_permit":
        raise HTTPException(status_code=403, detail="token not issued for study_permit")

    if not payload.submission_id:
        payload.submission_id = new_submission_id()

    try:
        pdf_bundle = fill_bundle(payload)
    except Exception:
        log.exception("PDF fill failed")
        raise HTTPException(status_code=500, detail="PDF fill failed — see server logs")

    family_name = payload.personal_info.family_name
    given_name = payload.personal_info.given_name
    zip_buf = io.BytesIO()
    with zipfile.ZipFile(zip_buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for form_id, pdf_bytes in pdf_bundle.items():
            filename = _filename(form_id, payload.case_id, family_name, given_name)
            zf.writestr(filename, pdf_bytes)

    zip_buf.seek(0)
    return StreamingResponse(
        zip_buf,
        media_type="application/zip",
        headers={"Content-Disposition": 'attachment; filename="study_permit_preview.zip"'},
    )
