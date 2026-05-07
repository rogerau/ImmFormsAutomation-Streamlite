"""IMM 1294 — Application for a Study Permit Made Outside of Canada."""
from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel


class Sex(str, Enum):
    male = "Male"
    female = "Female"


class Language(str, Enum):
    english = "English"
    french = "French"
    both = "Both"
    neither = "Neither"


class Imm1294Passport(BaseModel):
    passport_number: str
    country_of_issue: str
    issue_date: str    # YYYY-MM-DD
    expiry_date: str   # YYYY-MM-DD


class Imm1294Address(BaseModel):
    unit: str = ""
    street_number: str = ""
    street_name: str
    city: str
    country: str
    province_state: str = ""
    postal_code: str = ""


class Imm1294StudyDetails(BaseModel):
    school_name: str
    level: str          # "University", "College", "High School", etc.
    program: str
    city: str
    province_state: str = ""
    address: str = ""
    dli_number: str
    student_number: str = ""
    start_date: str    # YYYY-MM-DD
    end_date: str      # YYYY-MM-DD


class Imm1294EducationEntry(BaseModel):
    from_year: str
    from_month: str
    to_year: str
    to_month: str
    field_of_study: str
    school: str
    city: str
    country: str
    province_state: str = ""


class Imm1294OccupationEntry(BaseModel):
    from_year: str
    from_month: str
    to_year: str
    to_month: str
    occupation: str
    employer: str
    city: str
    country: str
    province_state: str = ""


class Imm1294Data(BaseModel):
    # Personal identity
    family_name: str
    given_name: str
    alias_family_name: str = ""
    alias_given_name: str = ""
    sex: Sex
    date_of_birth: str         # YYYY-MM-DD
    place_birth_city: str
    place_birth_country: str
    citizenship: str            # Country of citizenship
    current_country: str        # Current country of residence
    marital_status: str         # "Single", "Married", "Common-law", etc.
    language: Language = Language.english

    # Passport
    passport: Imm1294Passport

    # Contact
    mailing_address: Imm1294Address
    phone: str
    email: str

    # Study details
    study: Imm1294StudyDetails
    financial_support: str = ""

    # History (up to 1 education entry, 3 occupation entries)
    education_history: list[Imm1294EducationEntry] = []
    occupation_history: list[Imm1294OccupationEntry] = []

    # Background — default "no" (No) for most questions
    medical_condition: bool = False
    previously_refused_visa: bool = False
    military_service: bool = False

    # Signature
    applicant_signature: str
    applicant_date: str    # YYYY-MM-DD
