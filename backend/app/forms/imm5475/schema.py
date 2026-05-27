"""IMM 5475 — Authority to Release Personal Information to a Designated Individual.

Captures the designated person who is authorized to receive case-file info from
IRCC / CBSA, the scope of the authorization, and signatures. Applicant identity
is reused from the master StudyPermitData (no duplicates) — this schema only
holds data that doesn't appear on any other form in the bundle.
"""
from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class Imm5475Data(BaseModel):
    # --- Section: Designated individual ---
    designated_family_name: str
    designated_given_names: str
    designated_relationship: str = ""    # "Spouse", "Parent", "Lawyer", "Friend", etc.

    # Address of designated individual
    designated_unit: str = ""
    designated_street_number: str = ""
    designated_street_name: str = ""
    designated_city: str = ""
    designated_province_state: str = ""
    designated_country: str = ""
    designated_postal_code: str = ""

    # Contact
    designated_phone_country_code: str = ""
    designated_phone: str = ""
    designated_email: str = ""

    # --- Section: Authorization vs cancellation ---
    cancel_previous: bool = False        # tick to cancel a prior designation

    # --- Section: Signature ---
    applicant_signature: str             # typed applicant name
    signed_date: str                     # YYYY-MM-DD
    signed_city: str = ""
    signed_country: str = ""
