"""IMM 1295 — Application for Work Permit Made Outside of Canada.

Built on the same generic IRCC application template as IMM 1294 (confirmed by
diffing the two forms' XFA datasets — PersonalDetails / MaritalStatus / Passport /
natID / USCard / ContactInformation are structurally identical field paths), so
the shared person/passport/address/history types are imported from imm1294.schema
rather than redefined.
"""
from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field

from ..imm1294.schema import (
    Imm1294Address,
    Imm1294EducationEntry,
    Imm1294NationalID,
    Imm1294OccupationEntry,
    Imm1294Passport,
    Imm1294Phone,
    Imm1294ResidenceRow,
    Imm1294USCard,
    Language,
    Sex,
)


class WorkDetails(BaseModel):
    """IMM 1295 Page 3 — DetailsOfIntendedWork / IntendedLocationInCanada /
    DetailsOfWorkCont. work_permit_type is the IRCC dropdown value (e.g.
    "Open Work Permit", "Employer-Specific Work Permit")."""
    work_permit_type: str = "Open Work Permit"
    employer_name: str = ""
    employer_address: str = ""
    intended_province_state: str = ""
    intended_city_town: str = ""
    intended_address: str = ""
    job_title: str = ""
    position_description: str = ""
    how_long_from: str = ""    # YYYY-MM-DD
    how_long_to: str = ""      # YYYY-MM-DD
    lmia_number: str = ""      # blank for open work permits

    # Live-in Caregiver Program block (LCP) — not applicable to spousal OWP,
    # kept for completeness since the field exists on the form.
    lcp_child_care: bool = False
    lcp_disabled: bool = False
    lcp_elderly: bool = False
    lcp_other: bool = False
    lcp_persons_care: str = ""


class Imm1295Data(BaseModel):
    # Personal identity
    family_name: str
    given_name: str
    alias_family_name: str = ""
    alias_given_name: str = ""
    sex: Sex
    date_of_birth: str         # YYYY-MM-DD
    place_birth_city: str
    place_birth_country: str
    citizenship: str
    current_country: str
    marital_status: str = ""
    language: Language = Language.english
    language_most_at_ease: Optional[Language] = None
    taken_language_test: bool = False
    uci: str = Field(default="", max_length=20)
    service_in: str = "English"

    # Residence history (subsections 7-9, same shape as IMM 1294)
    current_residence: Optional[Imm1294ResidenceRow] = None
    has_previous_residence: bool = False
    previous_residences: list[Imm1294ResidenceRow] = []
    applying_country_same_as_current: bool = True
    applying_country: Optional[Imm1294ResidenceRow] = None

    # Previous marriage (optional)
    previously_married: bool = False
    prev_spouse_family_name: str = ""
    prev_spouse_given_name: str = ""
    prev_spouse_date_of_birth: str = ""
    prev_relationship_type: str = ""
    prev_relationship_from: str = ""
    prev_relationship_to: str = ""

    # Current spouse (Page1 MaritalStatus/SectionA — name only, IMM 5707 has the rest)
    spouse_family_name: str = ""
    spouse_given_name: str = ""
    marriage_date: str = ""    # YYYY-MM-DD

    # Passport
    passport: Imm1294Passport
    taiwan_passport: bool = False
    israel_passport_not_valid: bool = False

    # National Identity Document / US PR Card
    national_id: Imm1294NationalID = Imm1294NationalID()
    us_pr_card: Imm1294USCard = Imm1294USCard()

    # Contact
    mailing_address: Imm1294Address
    residential_address_same_as_mailing: bool = True
    residential_address: Optional[Imm1294Address] = None
    phone: str = ""
    primary_phone_type: str = ""
    primary_phone_country_code: str = ""
    primary_phone_ext: str = ""
    has_alt_phone: bool = False
    alt_phone: Optional[Imm1294Phone] = None
    has_fax: bool = False
    fax: Optional[Imm1294Phone] = None
    email: str = ""

    # Intended work
    work: WorkDetails = WorkDetails()

    # History
    education_history: list[Imm1294EducationEntry] = []
    occupation_history: list[Imm1294OccupationEntry] = []

    # Background — same questions/shape as IMM 1294 Page 4
    tuberculosis: bool = False
    medical_condition: bool = False
    medical_condition_details: str = Field(default="", max_length=1000)
    previously_remained_status: bool = False
    previously_applied_canada: bool = False
    previously_refused_visa: bool = False
    previously_refused_visa_details: str = Field(default="", max_length=1000)
    criminal_record: bool = False
    criminal_record_details: str = Field(default="", max_length=1000)
    military_service: bool = False
    military_service_details: str = Field(default="", max_length=1000)
    political_party: bool = False
    war_crimes: bool = False
    consent_to_contact: bool = True

    # Signature
    applicant_signature: str
    applicant_signature_date: str    # YYYY-MM-DD
