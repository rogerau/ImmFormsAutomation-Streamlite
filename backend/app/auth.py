"""JWT issuance + verification, shared with the Next.js frontend."""
from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from pydantic import BaseModel

JWT_ALGORITHM = "HS256"
JWT_SECRET = os.environ.get("JWT_SECRET", "")


class TokenClaims(BaseModel):
    case_id: str
    form_type: str
    client_name: str
    tenant_id: str
    exp: int


def issue_token(
    case_id: str,
    form_type: str,
    client_name: str,
    tenant_id: str,
    expires_in_days: int = 30,
) -> str:
    if not JWT_SECRET:
        raise RuntimeError("JWT_SECRET env var not set")
    exp = datetime.now(timezone.utc) + timedelta(days=expires_in_days)
    payload = {
        "case_id": case_id,
        "form_type": form_type,
        "client_name": client_name,
        "tenant_id": tenant_id,
        "exp": int(exp.timestamp()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_token(token: str) -> Optional[TokenClaims]:
    if not JWT_SECRET:
        raise RuntimeError("JWT_SECRET env var not set")
    try:
        decoded = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return TokenClaims(**decoded)
    except JWTError:
        return None
