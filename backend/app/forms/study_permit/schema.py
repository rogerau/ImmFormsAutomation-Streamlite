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
    Imm1294Phone,
    Imm1294ResidenceRow,
    Imm1294StudyDetails,
    Imm1294USCard,
    Language,
    Sex,
)
from ..imm5409.schema import Imm5409Data
from ..imm5475.schema import Imm5475Data
from ..imm5476.schema import Imm5476Data
from ..imm5646.schema import Imm5646Data
from ..imm5707.schema import Child5707, MaritalStatus, Parent5707, Person5707


class ContactInfo(BaseModel):
    mailing_address: Imm1294Address
    residential_address_same_as_mailing: bool = True
    residential_address: Optional[Imm1294Address] = None
    phone: str                                  # primary phone (digits — number portion)
    primary_phone_type: str = ""                # "Residence" / "Work" / "Cell"
    primary_phone_country_code: str = ""        # e.g. "1" for NA, "44" for UK
    primary_phone_ext: str = ""
    has_alt_phone: bool = False
    alt_phone: Optional[Imm1294Phone] = None
    has_fax: bool = False
    fax: Optional[Imm1294Phone] = None
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
    language: Language = Language.english          # IMM 1294 — able to communicate
    language_most_at_ease: Optional[Language] = None  # IMM 1294 — most at ease in
    taken_language_test: bool = False              # IMM 1294 — has taken language test
    uci: str = ""                     # UCI / Client ID (8 or 10 digits)
    # IMM 1294 Page 1, subsection 2 — "I want service in"
    service_in: str = "English"       # "English" or "French"

    # IMM 1294 Page 1 — residence history (subsections 7, 8, 9)
    current_residence: Optional[Imm1294ResidenceRow] = None
    has_previous_residence: bool = False
    previous_residences: list[Imm1294ResidenceRow] = []   # max 2
    applying_country_same_as_current: bool = True
    applying_country: Optional[Imm1294ResidenceRow] = None

    # IMM 1294 Passport extras (Taiwan / Israel Y/N indicators)
    taiwan_passport: bool = False
    israel_passport_not_valid: bool = False


class PreviousMarriage(BaseModel):
    """IMM 1294 subsection 11 — previous spouse / common-law partner."""
    had_previous: bool = False
    family_name: str = ""
    given_names: str = ""
    date_of_birth: str = ""           # YYYY-MM-DD
    relationship_type: str = ""       # "Married" or "Common-law"
    from_date: str = ""               # YYYY-MM-DD
    to_date: str = ""                 # YYYY-MM-DD


class FamilyInfo(BaseModel):
    """IMM 5707-specific data: occupation, marital status enum, family members."""
    applicant_marital_status: MaritalStatus
    applicant_occupation: str
    married_in_person: Optional[bool] = None

    # IMM 1294 subsection 10 — date of marriage / common-law relationship
    marriage_date: str = ""           # YYYY-MM-DD; only when married / common-law

    # Spouse (conditional)
    spouse: Optional[Person5707] = None
    no_spouse_signature: str = ""
    no_spouse_date: str = ""

    # IMM 1294 subsection 11 — previous marriage / common-law (optional)
    previous_marriage: Optional[PreviousMarriage] = None

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
    has_education_history: bool = False    # IMM 1294 Page 3 EducationIndicator Y/N
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
    # Q88a: remained beyond status / unauthorized work or study in Canada
    previously_remained_status: bool = False
    # Q88b: previously applied to enter or remain in Canada
    previously_applied_canada: bool = False
    # Q89: refused a visa/permit, denied entry, or ordered to leave any country
    previously_refused_visa: bool = False
    # Shared details textbox (visible if any Q88/Q89 = Yes)
    previously_refused_visa_details: str = ""
    # Q90: criminal record (with textbox)
    criminal_record: bool = False
    criminal_record_details: str = ""
    # Q92: military / police / security service
    military_service: bool = False
    military_service_details: str = ""
    # Q93: political party / group that advocated violence
    political_party: bool = False
    # Q94: war crimes / ill-treatment of prisoners / desecration
    war_crimes: bool = False
    # Q101: consent to be contacted by CIC
    consent_to_contact: bool = True

    # --- Applicant signature (shared across all forms) ---
    applicant_signature: str
    applicant_signature_date: str    # YYYY-MM-DD

    # --- Optional form payloads ---
    common_law: Optional[Imm5409Data] = None
    custodian: Optional[Imm5646Data] = None
    representative: Optional[Imm5476Data] = None
    release_authority: Optional[Imm5475Data] = None
