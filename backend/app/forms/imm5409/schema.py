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
    cohabitation_county: str = ""
    cohabitation_province: str = ""
    cohabitation_country: str
    years_together: str
    start_date: str           # YYYY-MM-DD (cohabitation start)
    end_date: str = ""        # YYYY-MM-DD or blank if ongoing

    # Section 1 — nature of relationship (4 yes/no statements, PDF order a..d)
    # Verbatim from imm5409e (Nov 2025) Section 1, captured via audit.
    # a) Have jointly signed a residential lease, mortgage or purchase
    #    agreement relating to a residence in which we both live.
    section1_joint_residential_agreement: bool = True
    # b) Jointly own property other than our residence.
    section1_joint_property_ownership: bool = True
    # c) Have joint bank, trust, credit union or charge card accounts.
    section1_joint_financial_accounts: bool = True
    # d) Have declared our common-law union under the Canadian Income Tax Act
    #    (T-1 "General — Individual Income Tax Return").
    section1_declared_income_tax: bool = True

    # Section 2 — children of the relationship
    has_children: bool = False

    # Section 3 — previous declarations
    previous_declaration: bool = False

    # Section 4 — additional details (free text)
    additional_details: str = ""

    # Section 5 — declarations and signatures
    declaration_city: str
    declaration_county: str = ""
    declaration_province: str = ""
    declaration_country: str
    declaration_day: str
    declaration_month: str
    declaration_year: str
    applicant_signature: str   # typed name
    partner_signature: str     # typed name
    # Section 5 — Commissioner / notary witnessing the declaration (optional)
    admin_name: str = ""
    admin_signature: str = ""
