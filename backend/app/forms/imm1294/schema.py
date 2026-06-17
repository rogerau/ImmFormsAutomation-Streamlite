"""IMM 1294 — Application for a Study Permit Made Outside of Canada."""
from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


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
    unit: str = Field(default="", max_length=20)
    street_number: str = Field(default="", max_length=20)
    street_name: str = Field(max_length=200)
    city: str = Field(max_length=100)
    country: str = Field(max_length=100)
    province_state: str = Field(default="", max_length=100)
    postal_code: str = Field(default="", max_length=20)
    district: str = Field(default="", max_length=100)


class Imm1294ResidenceRow(BaseModel):
    """One residence-history row used for current / previous / applying-from sections."""
    country: str = ""
    status: str = ""                  # "Citizen" / "Permanent resident" / "Visitor" / "Worker" / "Student" / "Other"
    status_other: str = ""            # free-text when status == "Other"
    from_date: str = ""               # YYYY-MM-DD
    to_date: str = ""                 # YYYY-MM-DD


class Imm1294Phone(BaseModel):
    """Simplified phone for primary / alternate / fax fields."""
    phone_type: str = ""              # "Residence" / "Work" / "Cell"
    country_code: str = ""            # "1" for NA, country code for international
    number: str = ""                  # the actual digits (E.164 minus '+')
    ext: str = ""                     # extension


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

    # Costs (Page 3 — "The cost of my studies will be:")
    tuition_amount: str = ""        # numeric string in CAD, e.g. "20000"
    room_board_amount: str = ""
    other_amount: str = ""
    funds_available: str = ""       # CAD funds available for stay

    # "My expenses in Canada will be paid by:" — IRCC dropdown options
    expenses_paid_by: str = ""      # "Myself", "Parents", "Other family"...
    expenses_paid_by_other: str = ""  # free-text when "Other"

    # Provincial Attestation Letter (PAL) / Territorial Attestation Letter (TAL)
    pal_doc_number: str = ""
    pal_doc_expiry: str = ""        # YYYY-MM-DD

    # Quebec Acceptance Certificate (CAQ)
    caq_cert_number: str = ""
    caq_cert_expiry: str = ""       # YYYY-MM-DD


class Imm1294NationalID(BaseModel):
    """National Identity Document — IMM 1294 Page 2 'natID' section."""
    has_document: bool = False      # natIDIndicator: Y/N
    doc_number: str = ""
    country_of_issue: str = ""
    issue_date: str = ""            # YYYY-MM-DD
    expiry_date: str = ""           # YYYY-MM-DD


class Imm1294USCard(BaseModel):
    """US Permanent Resident Card / Green Card — IMM 1294 Page 2 'USCard' section."""
    has_card: bool = False          # usCardIndicator: Y/N
    doc_number: str = ""
    uscis_number: str = ""          # 9-digit USCIS number (the "A-Number")
    expiry_date: str = ""           # YYYY-MM-DD


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
