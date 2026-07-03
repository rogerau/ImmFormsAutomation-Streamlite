"""IMM 5707 — Family Information (study permit variant, replaces IMM 5645)."""
from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel


class MaritalStatus(str, Enum):
    annulled = "Annulled marriage"
    common_law = "Common-law"
    divorced = "Divorced"
    separated = "Legally separated"
    married_in_person = "Married-physically present"
    married_not_in_person = "Married-not physically present"
    single = "Single"
    widowed = "Widowed"


class ParentStatus(str, Enum):
    living = "Living"
    deceased = "Deceased"


class Person5707(BaseModel):
    family_name: str
    given_names: str
    native_name: str = ""
    date_of_birth: str        # YYYY-MM-DD
    country_of_birth: str
    address: str = ""   # derived from contact in fill_bundle; blank acceptable from frontend
    occupation: str
    marital_status: Optional[MaritalStatus] = None
    will_accompany: Optional[bool] = None


class Parent5707(Person5707):
    status: ParentStatus = ParentStatus.living


class Child5707(Person5707):
    relationship: str
    marital_status: MaritalStatus
    will_accompany: bool


class Imm5707Data(BaseModel):
    # ---- Applicant (Section A) ----
    applicant_family_name: str
    applicant_given_names: str
    applicant_native_name: str = ""
    applicant_dob: str           # YYYY-MM-DD
    applicant_country_of_birth: str
    applicant_address: str = ""  # not on IMM 5707 applicant section but kept for symmetry
    applicant_marital_status: MaritalStatus
    applicant_occupation: str
    married_in_person: Optional[bool] = None  # marriage in-person (not proxy)

    # ---- Spouse (Section A, conditional) ----
    spouse: Optional[Person5707] = None
    no_spouse_signature: str = ""
    no_spouse_date: str = ""

    # ---- Parents (Section A) ----
    father: Parent5707
    mother: Parent5707

    # Section A declaration
    section_a_signature: str = ""
    section_a_date: str = ""

    # ---- Children (Section B) ----
    children: list[Child5707] = []
    no_children_signature: str = ""
    no_children_date: str = ""

    # ---- Section C declaration (no siblings in IMM 5707) ----
    section_c_signature: str = ""
    section_c_date: str = ""

    # ---- Final signature ----
    applicant_signature: str
    applicant_signature_date: str
