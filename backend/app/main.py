"""FastAPI entry point for the immigration form automation service."""
from __future__ import annotations

import io
import logging
import os
from datetime import datetime, timezone

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

load_dotenv()

from . import tenants
from .auth import TokenClaims, issue_token, verify_token
from .forms.imm5645.filler import fill_pdf
from .forms.imm5645.schema import FamilyData
from .integrations.google import (
    append_rows,
    find_spreadsheet_in_folder,
    upload_pdf_to_drive,
)
from .integrations.sheets_imm5645 import (
    children_rows,
    new_submission_id,
    siblings_rows,
    submissions_row,
)

log = logging.getLogger("imm5645")
logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO"))

app = FastAPI(title="Immigration Form Automation", version="0.1.0")

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
    form_type: str = "imm5645"
    client_name: str
    tenant_id: str
    expires_in_days: int = 30


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
    )
    base = os.environ.get("FRONTEND_BASE_URL", "http://localhost:3000")
    return {"token": token, "url": f"{base}/apply/{token}"}


class TokenInfo(BaseModel):
    case_id: str
    form_type: str
    client_name: str
    tenant_id: str


@app.get("/forms/token-info", response_model=TokenInfo)
def token_info(claims: TokenClaims = Depends(require_token)):
    return TokenInfo(
        case_id=claims.case_id,
        form_type=claims.form_type,
        client_name=claims.client_name,
        tenant_id=claims.tenant_id,
    )


def _filename(case_id: str, family_name: str) -> str:
    safe = "".join(c for c in family_name.upper() if c.isalnum() or c == "_") or "UNKNOWN"
    today = datetime.now(timezone.utc).strftime("%Y%m%d")
    return f"IMM5645_{case_id}_{safe}_{today}.pdf"


@app.post("/forms/imm5645/fill")
def imm5645_fill(payload: FamilyData, claims: TokenClaims = Depends(require_token)):
    if claims.case_id != payload.case_id:
        raise HTTPException(status_code=403, detail="case_id mismatch with token")
    if claims.form_type != "imm5645":
        raise HTTPException(status_code=403, detail="token issued for a different form")

    tenant = tenants.get(claims.tenant_id)
    if not tenant:
        raise HTTPException(status_code=400, detail=f"Unknown tenant: {claims.tenant_id}")

    payload.submission_id = new_submission_id()

    try:
        pdf_bytes = fill_pdf(payload)
    except Exception as e:
        log.exception("PDF fill failed")
        raise HTTPException(status_code=500, detail=f"PDF fill failed: {e}")

    filename = _filename(payload.case_id, payload.applicant.family_name)

    try:
        drive_file = upload_pdf_to_drive(filename, pdf_bytes, tenant.filled_forms_folder_id)
    except Exception as e:
        log.exception("Drive upload failed")
        raise HTTPException(status_code=502, detail=f"Drive upload failed: {e}")

    try:
        sheet_id = find_spreadsheet_in_folder(
            tenant.submissions_sheet_name, tenant.application_data_folder_id
        )
        if not sheet_id:
            raise RuntimeError(
                f"Sheet '{tenant.submissions_sheet_name}' not found in folder "
                f"{tenant.application_data_folder_id}"
            )
        append_rows(
            sheet_id,
            "Submissions",
            [submissions_row(payload, filename, drive_file["id"], claims.tenant_id)],
        )
        crows = children_rows(payload)
        if crows:
            append_rows(sheet_id, "Children", crows)
        srows = siblings_rows(payload)
        if srows:
            append_rows(sheet_id, "Siblings", srows)
    except Exception as e:
        log.exception("Sheets append failed")
        # Non-fatal: PDF is already in Drive. Surface as a warning so client knows.
        return {
            "submission_id": payload.submission_id,
            "pdf_drive_id": drive_file["id"],
            "pdf_url": drive_file.get("webViewLink"),
            "sheets_warning": str(e),
        }

    return {
        "submission_id": payload.submission_id,
        "pdf_drive_id": drive_file["id"],
        "pdf_url": drive_file.get("webViewLink"),
    }


@app.post("/forms/imm5645/preview")
def imm5645_preview(payload: FamilyData, claims: TokenClaims = Depends(require_token)):
    """Build the PDF without uploading anywhere — used by the review/sign step."""
    if claims.case_id != payload.case_id:
        raise HTTPException(status_code=403, detail="case_id mismatch with token")
    payload.submission_id = payload.submission_id or new_submission_id()
    pdf_bytes = fill_pdf(payload)
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": 'inline; filename="imm5645_preview.pdf"'},
    )
