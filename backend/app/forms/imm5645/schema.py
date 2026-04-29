"""Pydantic schema for IMM 5645 (Family Information).

Mirrors the Zod schema in frontend/lib/schemas/imm5645.ts. Server is the
source of truth — the frontend re-validates for UX, but every value is
re-validated here before any PDF is generated.
"""
from __future__ import annotations

from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class MaritalStatus(str, Enum):
    """Display labels — mapped to numeric export values ('1'..'8') in filler.py."""
    annulled = "Annulled marriage"
    common_law = "Common-law"
    divorced = "Divorced"
    separated = "Legally separated"
    married_here = "Married-physically present"
    married_away = "Married-not physically present"
    single = "Single"
    widowed = "Widowed"


MARITAL_STATUS_EXPORT = {
    MaritalStatus.annulled: "1",
    MaritalStatus.common_law: "2",
    MaritalStatus.divorced: "3",
    MaritalStatus.separated: "4",
    MaritalStatus.married_here: "5",
    MaritalStatus.married_away: "6",
    MaritalStatus.single: "7",
    MaritalStatus.widowed: "8",
}


class ApplicationType(str, Enum):
    visitor = "Visitor"
    worker = "Worker"
    student = "Student"
    other = "Other"


class ParentStatus(str, Enum):
    living = "Living"
    deceased = "Deceased"


class Person(BaseModel):
    family_name: str = Field("", description="Family name (surname).")
    given_names: str = Field("", description="Given names.")
    date_of_birth: str = Field("", description="YYYY-MM-DD. Empty if unknown/deceased.")
    country_of_birth: str = ""
    address: str = Field("", description="Current address. If deceased: city, country, date of death.")
    occupation: str = ""
    marital_status: Optional[MaritalStatus] = None
    will_accompany: Optional[bool] = Field(None, description="Accompanies applicant to Canada.")

    def display_name(self) -> str:
        if self.family_name and self.given_names:
            return f"{self.family_name.upper()}, {self.given_names}"
        return (self.family_name or self.given_names).strip()


class Parent(Person):
    status: ParentStatus = ParentStatus.living


class Child(Person):
    relationship: str = ""


class FamilyData(BaseModel):
    """Complete payload that produces a filled IMM 5645."""
    case_id: str = Field(..., description="Tenant case identifier (e.g. PKT-20260428-00001).")
    submission_id: Optional[str] = Field(None, description="Server-generated UUID; set by backend, ignored if sent by client.")

    application_type: ApplicationType
    applicant: Person
    spouse: Optional[Person] = None
    no_spouse_signature: str = ""
    no_spouse_date: str = ""

    mother: Parent
    father: Parent

    children: List[Child] = Field(default_factory=list, max_length=4)
    no_children_signature: str = ""
    no_children_date: str = ""

    siblings: List[Person] = Field(default_factory=list, max_length=7)

    applicant_signature: str = ""
    applicant_signature_date: str = ""
