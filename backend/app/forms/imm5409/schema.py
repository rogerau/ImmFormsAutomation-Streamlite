"""IMM 5409 — Statutory Declaration of Common-law Union."""
from __future__ import annotations

from pydantic import BaseModel


class Imm5409Data(BaseModel):
    # Jurisdiction where declaration is made
    jurisdiction_country: str
    jurisdiction_province: str = ""

    # Partner names
    applicant_name: str       # full name of immigration applicant
    partner_name: str         # full name of common-law partner

    # Cohabitation details
    cohabitation_city: str
    cohabitation_province: str = ""
    cohabitation_country: str
    years_together: str
    start_date: str           # YYYY-MM-DD (cohabitation start)
    end_date: str = ""        # YYYY-MM-DD or blank if ongoing

    # Section 1 — nature of relationship (4 yes/no statements)
    # All default True (normal cohabiting couple)
    section1_q1: bool = True  # Have lived together continuously
    section1_q2: bool = True  # Have shared financial obligations
    section1_q3: bool = True  # Represent themselves as a couple
    section1_q4: bool = True  # Primary residence together

    # Section 2 — children of the relationship
    has_children: bool = False

    # Section 3 — previous declarations
    previous_declaration: bool = False

    # Section 4 — additional details (free text)
    additional_details: str = ""

    # Section 5 — declarations and signatures
    declaration_city: str
    declaration_province: str = ""
    declaration_country: str
    declaration_day: str
    declaration_month: str
    declaration_year: str
    applicant_signature: str   # typed name
    partner_signature: str     # typed name
