"""IMM 5646 — Custodianship Declaration (minors studying in Canada)."""
from __future__ import annotations

from pydantic import BaseModel


class Imm5646Data(BaseModel):
    # Minor student info
    student_family_name: str
    student_given_names: str
    student_citizenship: str
    student_dob: str           # YYYY-MM-DD
    student_sex: str           # "Male" or "Female"
    school_address: str
    student_address: str       # Canadian address where student will live

    # Parent 1
    parent1_family_name: str
    parent1_given_names: str
    parent1_dob: str           # YYYY-MM-DD
    parent1_address: str
    parent1_phone: str

    # Parent 2 (optional — second parent or guardian)
    parent2_family_name: str = ""
    parent2_given_names: str = ""
    parent2_dob: str = ""
    parent2_address: str = ""
    parent2_phone: str = ""

    # Custodian info
    custodian_family_name: str
    custodian_given_names: str
    custodian_status: str = "Canadian Citizen"  # or "Permanent Resident"
    custodian_dob: str         # YYYY-MM-DD
    custodian_address: str
    custodian_phone: str

    # Declaration (Page 1 — custodian declaration)
    custodian_name_for_decl: str   # signed name
    student_name_for_decl: str     # student name in declaration
    sworn_city: str
    sworn_province: str = ""
    sworn_country: str
    sworn_day: str
    sworn_month: str
    sworn_year: str
    parent_signature: str          # parent/guardian typed name
    notary_signature: str = ""     # optional notary

    # Page 2 additional declarations (if applicable)
    other_parent_name: str = ""    # other parent's name
    parent1_name_decl: str = ""
    parent2_name_decl: str = ""
