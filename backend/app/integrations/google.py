"""Google Drive + Sheets via n8n webhook proxy.

Instead of a service-account JSON key (blocked by org policy), we delegate
all Google API calls to two n8n webhooks that use n8n's existing OAuth
credentials.  Set N8N_DRIVE_WEBHOOK_URL and N8N_SHEETS_WEBHOOK_URL in env.
"""
from __future__ import annotations

import base64
import os

import httpx

_TIMEOUT = 60.0  # Drive upload can take a few seconds for large PDFs


def _drive_url() -> str:
    url = os.environ.get("N8N_DRIVE_WEBHOOK_URL", "")
    if not url:
        raise RuntimeError("N8N_DRIVE_WEBHOOK_URL env var not set")
    return url


def _sheets_url() -> str:
    url = os.environ.get("N8N_SHEETS_WEBHOOK_URL", "")
    if not url:
        raise RuntimeError("N8N_SHEETS_WEBHOOK_URL env var not set")
    return url


def upload_pdf_to_drive(filename: str, pdf_bytes: bytes, folder_id: str) -> dict:
    """Upload a filled PDF via n8n and return {fileId, webViewLink}."""
    payload = {
        "filename": filename,
        "pdf_base64": base64.b64encode(pdf_bytes).decode(),
        "folder_id": folder_id,
    }
    r = httpx.post(_drive_url(), json=payload, timeout=_TIMEOUT)
    r.raise_for_status()
    return r.json()


def append_rows(spreadsheet_id: str, sheet_name: str, rows: list[list]) -> dict:
    """Append rows to a sheet via n8n. Returns {ok, updatedRows}."""
    if not rows:
        return {"ok": True, "updatedRows": 0}
    payload = {
        "spreadsheet_id": spreadsheet_id,
        "sheet_name": sheet_name,
        "rows": rows,
    }
    r = httpx.post(_sheets_url(), json=payload, timeout=_TIMEOUT)
    r.raise_for_status()
    return r.json()


def increment_counter(spreadsheet_id: str, counter_key: str) -> int:
    """Atomically bump a named counter in the tenant's "Counters" tab via n8n.

    Used to assign sequential per-use-case case numbers (e.g. STANDARD-0007)
    to submissions made through a shared/reusable template link.
    """
    payload = {
        "action": "increment_counter",
        "spreadsheet_id": spreadsheet_id,
        "counter_key": counter_key,
    }
    r = httpx.post(_sheets_url(), json=payload, timeout=_TIMEOUT)
    r.raise_for_status()
    return r.json()["value"]


def find_spreadsheet_in_folder(name: str, folder_id: str) -> str | None:
    """Not used when routing through n8n — tenants supply spreadsheet_id directly."""
    return None
