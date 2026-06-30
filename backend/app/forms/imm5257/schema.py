"""IMM 5257 — Application for a Temporary Resident Visa Made Outside Canada
(visitor visa), plus its Schedule 1 (background/security questions).

Built on the same generic IRCC application template as IMM 1294/IMM 1295 —
the shared person/passport/address/history types are imported from
imm1294.schema rather than redefined.
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


class VisitDetails(BaseModel):
    """IMM 5257 Page 3 — DetailsOfVisit + the two Contacts rows."""
    purpose_of_visit: str = "Visit"
    purpose_other: str = ""
    how_long_from: str = ""    # YYYY-MM-DD
    how_long_to: str = ""      # YYYY-MM-DD
    funds_available: str = ""  # CAD

    contact1_name: str = ""
    contact1_relationship: str = ""
    contact1_address_in_canada: str = ""

    contact2_name: str = ""
    contact2_relationship: str = ""
    contact2_address_in_canada: str = ""


class Schedule1Category(BaseModel):
    """One of Schedule 1's five yes/no background categories. IRCC's form
    allows up to 4 free-text detail lines per category when 'has' is true."""
    has: bool = False
    details: list[str] = Field(default_factory=list, max_length=4)


class Imm5257Schedule1Data(BaseModel):
    military_service: Schedule1Category = Schedule1Category()
    war_humanity_crimes: Schedule1Category = Schedule1Category()
    membership_association: Schedule1Category = Schedule1Category()
    government_positions: Schedule1Category = Schedule1Category()
    previous_travel: Schedule1Category = Schedule1Category()


class Imm5257Data(BaseModel):
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

    # Residence history
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

    # Current spouse
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

    # Visit details
    visit: VisitDetails = VisitDetails()

    # History
    education_history: list[Imm1294EducationEntry] = []
    occupation_history: list[Imm1294OccupationEntry] = []

    # Background — same shape as IMM 1294/1295 Page 4 (minus tuberculosis,
    # which IMM 5257 doesn't ask)
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

    # Schedule 1
    schedule1: Imm5257Schedule1Data = Imm5257Schedule1Data()

    # Signature
    applicant_signature: str
    applicant_signature_date: str    # YYYY-MM-DD
