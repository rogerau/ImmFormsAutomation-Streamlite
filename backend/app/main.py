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

load_dotenv()

from . import tenants
from .auth import TokenClaims, issue_token, verify_token
from .forms.study_permit.filler import fill_bundle
from .forms.study_permit.schema import StudyPermitData
from .integrations.google import append_rows, upload_pdf_to_drive
from .integrations.sheets_study_permit import (
    children_rows,
    common_law_row,
    custodian_row,
    education_rows,
    employment_rows,
    new_submission_id,
    release_authority_row,
    representatives_row,
    submissions_row,
)

log = logging.getLogger("imm_automation")
logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO"))

app = FastAPI(title="Immigration Form Automation", version="0.2.0")

allowed = os.environ.get("FRONTEND_ORIGIN", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in allowed.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def require_token(authorization: str = Header(default="")) -> TokenClaims:
    if not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    claims = verify_token(authorization.split(" ", 1)[1])
    if not claims:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return claims


def require_admin(x_admin_secret: str = Header(default="")) -> None:
    expected = os.environ.get("ADMIN_SECRET", "")
    if not expected or x_admin_secret != expected:
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


@app.post("/admin/issue-link")
def admin_issue_link(req: IssueLinkRequest, _=Depends(require_admin)):
    if not tenants.get(req.tenant_id):
        raise HTTPException(status_code=400, detail=f"Unknown tenant: {req.tenant_id}")
    token = issue_token(
        case_id=req.case_id,
        form_type=req.form_type,
        client_name=req.client_name,
        tenant_id=req.tenant_id,
        expires_in_days=req.expires_in_days,
        optional_forms=req.optional_forms,
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
}


def _filename(form_id: str, case_id: str, family_name: str) -> str:
    safe = "".join(c for c in family_name.upper() if c.isalnum()) or "UNKNOWN"
    today = datetime.now(timezone.utc).strftime("%Y%m%d")
    prefix = _FORM_NUM.get(form_id, form_id.upper())
    return f"{prefix}_{case_id}_{safe}_{today}.pdf"


# ---------------------------------------------------------------------------
# POST /forms/study_permit/fill
# ---------------------------------------------------------------------------
@app.post("/forms/study_permit/fill")
def study_permit_fill(payload: StudyPermitData, claims: TokenClaims = Depends(require_token)):
    if claims.case_id != payload.case_id:
        raise HTTPException(status_code=403, detail="case_id mismatch with token")
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

    payload.submission_id = new_submission_id()

    # Fill all PDFs
    try:
        pdf_bundle = fill_bundle(payload)
    except Exception as e:
        log.exception("PDF fill failed")
        raise HTTPException(status_code=500, detail=f"PDF fill failed: {e}")

    # Upload each PDF to Drive
    family_name = payload.personal_info.family_name
    drive_results: dict[str, dict] = {}
    upload_errors: list[str] = []

    for form_id, pdf_bytes in pdf_bundle.items():
        filename = _filename(form_id, payload.case_id, family_name)
        try:
            result = upload_pdf_to_drive(filename, pdf_bytes, tenant.filled_forms_folder_id)
            drive_results[form_id] = result
        except Exception as e:
            log.exception(f"Drive upload failed for {form_id}")
            upload_errors.append(f"{form_id}: {e}")

    if not drive_results and upload_errors:
        raise HTTPException(status_code=502, detail=f"Drive upload failed: {upload_errors}")

    # Write to Google Sheets
    sheet_id = tenant.submissions_spreadsheet_id
    sheets_warning: str | None = None
    try:
        append_rows(
            sheet_id,
            "Submissions",
            [submissions_row(payload, claims.tenant_id, drive_results)],
        )
        crows = children_rows(payload)
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
    except Exception as e:
        log.exception("Sheets append failed")
        sheets_warning = str(e)

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
        response["upload_warnings"] = upload_errors
    if sheets_warning:
        response["sheets_warning"] = sheets_warning
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
    except Exception as e:
        log.exception("PDF fill failed")
        raise HTTPException(status_code=500, detail=f"PDF fill failed: {e}")

    family_name = payload.personal_info.family_name
    zip_buf = io.BytesIO()
    with zipfile.ZipFile(zip_buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for form_id, pdf_bytes in pdf_bundle.items():
            filename = _filename(form_id, payload.case_id, family_name)
            zf.writestr(filename, pdf_bytes)

    zip_buf.seek(0)
    return StreamingResponse(
        zip_buf,
        media_type="application/zip",
        headers={"Content-Disposition": 'attachment; filename="study_permit_preview.zip"'},
    )
