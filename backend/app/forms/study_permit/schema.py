"""Master schema for the Study Permit application bundle.

One StudyPermitData instance feeds all forms in the bundle:
  Required: IMM 1294, IMM 5707
  Optional: IMM 5409 (common-law), IMM 5646 (custodian), IMM 5476 (representative)
"""
from __future__ import annotations

from typing import Optional

from pydantic import BaseModel

from ..imm1294.schema import (
    Imm1294Address,
    Imm1294EducationEntry,
    Imm1294NationalID,
    Imm1294OccupationEntry,
    Imm1294Passport,
    Imm1294StudyDetails,
    Imm1294USCard,
    Language,
    Sex,
)
from ..imm5409.schema import Imm5409Data
from ..imm5476.schema import Imm5476Data
from ..imm5646.schema import Imm5646Data
from ..imm5707.schema import Child5707, MaritalStatus, Parent5707, Person5707


class ContactInfo(BaseModel):
    mailing_address: Imm1294Address
    phone: str
    email: str


class PersonalInfo(BaseModel):
    """Applicant identity — common to IMM 1294 and IMM 5707."""
    family_name: str
    given_name: str
    native_name: str = ""             # IMM 5707 only
    alias_family_name: str = ""
    alias_given_name: str = ""
    sex: Sex
    date_of_birth: str                # YYYY-MM-DD
    place_birth_city: str
    place_birth_country: str
    citizenship: str                  # country of citizenship
    current_country: str              # current country of residence
    marital_status: str               # text for IMM 1294 (e.g. "Single")
    language: Language = Language.english
    uci: str = ""                     # UCI / Client ID (8 or 10 digits)


class FamilyInfo(BaseModel):
    """IMM 5707-specific data: occupation, marital status enum, family members."""
    applicant_marital_status: MaritalStatus
    applicant_occupation: str
    married_in_person: Optional[bool] = None

    # Spouse (conditional)
    spouse: Optional[Person5707] = None
    no_spouse_signature: str = ""
    no_spouse_date: str = ""

    # Parents
    father: Parent5707
    mother: Parent5707
    section_a_signature: str = ""
    section_a_date: str = ""

    # Children (max 4)
    children: list[Child5707] = []
    no_children_signature: str = ""
    no_children_date: str = ""

    # Section C — no siblings in IMM 5707
    section_c_signature: str = ""
    section_c_date: str = ""


class StudyPermitData(BaseModel):
    case_id: str
    submission_id: Optional[str] = None
    optional_forms: list[str] = []

    # --- Step 1: Applicant identity ---
    personal_info: PersonalInfo

    # --- Step 2: Passport + contact ---
    passport: Imm1294Passport
    national_id: Imm1294NationalID = Imm1294NationalID()
    us_pr_card: Imm1294USCard = Imm1294USCard()
    contact: ContactInfo

    # --- Step 3: Study details ---
    study: Imm1294StudyDetails

    # --- Step 6: Education + Occupation history ---
    education_history: list[Imm1294EducationEntry] = []
    occupation_history: list[Imm1294OccupationEntry] = []

    # --- Steps 4–5: Family data (IMM 5707) ---
    family: FamilyInfo

    # --- Background (IMM 1294 Page 4) — verbatim IRCC questions ---
    # Q86: tuberculosis (no textbox)
    tuberculosis: bool = False
    # Q87: medical disorder (with textbox; reuses MedicalDetails)
    medical_condition: bool = False
    medical_condition_details: str = ""
    # Q88+Q89: visa overstay/refusal (with textbox; reuses refusedDetails)
    previously_refused_visa: bool = False
    previously_refused_visa_details: str = ""
    # Q90: criminal record (with textbox)
    criminal_record: bool = False
    criminal_record_details: str = ""
    # Q92: military / political-violence
    military_service: bool = False
    military_service_details: str = ""
    # Q101: consent to be contacted by CIC
    consent_to_contact: bool = True

    # --- Applicant signature (shared across all forms) ---
    applicant_signature: str
    applicant_signature_date: str    # YYYY-MM-DD

    # --- Optional form payloads ---
    common_law: Optional[Imm5409Data] = None
    custodian: Optional[Imm5646Data] = None
    representative: Optional[Imm5476Data] = None
