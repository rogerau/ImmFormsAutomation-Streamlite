"""Per-tenant config: Drive folders, Sheets file name.

Loaded from a TENANTS_JSON env var (literal JSON), e.g.:

    {
      "patko": {
        "filled_forms_folder_id": "1rUUpGi3K-bngZR0g-ObfEGROD1J0UEut",
        "application_data_folder_id": "...",
        "submissions_sheet_name": "IMM5645 Submissions"
      }
    }

Keeping this in env (not the codebase) lets us add tenants without redeploying.
"""
from __future__ import annotations

import json
import os
from functools import lru_cache
from typing import Optional

from pydantic import BaseModel


class TenantConfig(BaseModel):
    filled_forms_folder_id: str
    application_data_folder_id: str
    submissions_sheet_name: str = "IMM5645 Submissions"


@lru_cache(maxsize=1)
def _all() -> dict[str, TenantConfig]:
    raw = os.environ.get("TENANTS_JSON", "{}")
    parsed = json.loads(raw)
    return {k: TenantConfig(**v) for k, v in parsed.items()}


def get(tenant_id: str) -> Optional[TenantConfig]:
    return _all().get(tenant_id)
