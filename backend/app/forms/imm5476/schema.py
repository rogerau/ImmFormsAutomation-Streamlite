"""IMM 5476 — Use of a Representative."""
from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel


class RepType(str, Enum):
    paid_member = "paid_member"     # Paid rep, member of regulatory body
    paid_other = "paid_other"       # Paid rep, not member
    unpaid = "unpaid"               # Unpaid rep (friend/family)
    cancel = "cancel"               # Cancel/withdraw previous rep


class Imm5476Data(BaseModel):
    # Section A — Applicant (person who is applying)
    applicant_family_name: str
    applicant_given_name: str
    applicant_dob: str             # YYYY-MM-DD
    uci_number: str = ""           # IRCC unique client identifier (if known)

    # Section B — Representative
    rep_type: RepType = RepType.paid_member
    rep_family_name: str
    rep_given_name: str

    # Membership / accreditation (for paid rep)
    iccrc_number: str = ""         # ICCRC membership number
    provincial_law_society: str = ""
    membership_id: str = ""

    # Organization info
    organization_name: str = ""
    lawyer_name: str = ""          # if law firm

    # Contact address
    unit: str = ""
    street_number: str = ""
    street_name: str
    city: str
    province: str = ""
    country: str
    postal_code: str = ""
    phone_country_code: str = "1"
    phone_number: str
    fax_country_code: str = ""
    fax_number: str = ""
    email: str

    # Signatures (Section B)
    applicant_signature: str       # applicant typed name
    applicant_date_signed: str     # YYYY-MM-DD
    rep_signature: str = ""        # rep typed name (if applicable)
    rep_date_signed: str = ""
