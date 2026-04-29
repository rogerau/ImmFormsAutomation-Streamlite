"""Google Drive + Sheets clients shared by all forms.

Auth: a Google service-account JSON. Provide it via the
GOOGLE_SERVICE_ACCOUNT_JSON env var (the literal JSON contents,
not a file path) — this lets us deploy on Railway without writing
secrets to disk.
"""
from __future__ import annotations

import io
import json
import os
from functools import lru_cache
from typing import Optional

from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload

SCOPES = [
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/spreadsheets",
]


@lru_cache(maxsize=1)
def _credentials():
    raw = os.environ.get("GOOGLE_SERVICE_ACCOUNT_JSON")
    if not raw:
        raise RuntimeError("GOOGLE_SERVICE_ACCOUNT_JSON env var not set")
    info = json.loads(raw)
    return service_account.Credentials.from_service_account_info(info, scopes=SCOPES)


def drive_client():
    return build("drive", "v3", credentials=_credentials(), cache_discovery=False)


def sheets_client():
    return build("sheets", "v4", credentials=_credentials(), cache_discovery=False)


def upload_pdf_to_drive(filename: str, pdf_bytes: bytes, folder_id: str) -> dict:
    """Upload a filled PDF and return {id, webViewLink}."""
    service = drive_client()
    media = MediaIoBaseUpload(io.BytesIO(pdf_bytes), mimetype="application/pdf", resumable=False)
    metadata = {"name": filename, "parents": [folder_id]}
    file = (
        service.files()
        .create(body=metadata, media_body=media, fields="id, webViewLink", supportsAllDrives=True)
        .execute()
    )
    return file


def find_spreadsheet_in_folder(name: str, folder_id: str) -> Optional[str]:
    """Return the Google Sheets file ID for `name` inside `folder_id`."""
    service = drive_client()
    q = (
        f"name = '{name}' "
        f"and '{folder_id}' in parents "
        f"and mimeType = 'application/vnd.google-apps.spreadsheet' "
        f"and trashed = false"
    )
    res = service.files().list(q=q, fields="files(id,name)", supportsAllDrives=True, includeItemsFromAllDrives=True).execute()
    files = res.get("files", [])
    return files[0]["id"] if files else None


def append_rows(spreadsheet_id: str, sheet_name: str, rows: list[list]) -> dict:
    """Append rows to a sheet, USER_ENTERED so dates parse natively."""
    if not rows:
        return {"updates": {"updatedRows": 0}}
    service = sheets_client()
    body = {"values": rows}
    return (
        service.spreadsheets()
        .values()
        .append(
            spreadsheetId=spreadsheet_id,
            range=f"{sheet_name}!A1",
            valueInputOption="USER_ENTERED",
            insertDataOption="INSERT_ROWS",
            body=body,
        )
        .execute()
    )
