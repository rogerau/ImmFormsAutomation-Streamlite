"""IMM 5476 — Use of a Representative."""
from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel


class RepAction(str, Enum):
    """Top-level 'I am:' RadioButtonList on IMM 5476 — picks which sections render.

    Mapping to XFA Page1/RadioButtonList item values:
      1 = appointing                       (Sections A, B, E)
      2 = updating                         (Sections A, B, E)
      3 = cancelling                       (Sections A, C, E)
      4 = cancelling_and_appointing        (Sections A, B, C, E)
      5 = withdrawing                      (Sections A, D, E)
    """

    appointing = "appointing"
    updating = "updating"
    cancelling = "cancelling"
    cancelling_and_appointing = "cancelling_and_appointing"
    withdrawing = "withdrawing"


class RepType(str, Enum):
    """Section B / Question 6 sub-radio — paid vs unpaid + accreditation body.

    Maps to two XFA exclGroups (uncompensated[1..5], compensated[1..3]).
    """

    # Unpaid (uncompensated exclGroup)
    unpaid_friend_family = "unpaid_friend_family"   # item "1"
    unpaid_iccrc = "unpaid_iccrc"                   # item "2" (CICC)
    unpaid_other = "unpaid_other"                   # item "3" (other – specify)
    unpaid_law_society = "unpaid_law_society"       # item "4"
    unpaid_chambre = "unpaid_chambre"               # item "5" (Chambre)

    # Paid (compensated exclGroup)
    paid_iccrc = "paid_iccrc"                       # item "1" (CICC)
    paid_law_society = "paid_law_society"           # item "2"
    paid_chambre = "paid_chambre"                   # item "3" (Chambre)


class Imm5476Data(BaseModel):
    # Section A — Applicant (person who is applying)
    applicant_family_name: str
    applicant_given_name: str
    applicant_dob: str             # YYYY-MM-DD
    uci_number: str = ""           # IRCC unique client identifier (if known)
    applicant_email: str = ""      # SectionA office[0] — applicant's email
    type_of_application: str = "Study Permit (Outside Canada)"  # SectionA office[2]

    # Top-level action (RadioButtonList)
    rep_action: RepAction = RepAction.appointing

    # Section B — Representative
    rep_type: RepType = RepType.paid_iccrc
    rep_family_name: str = ""
    rep_given_name: str = ""

    # Membership / accreditation
    iccrc_number: str = ""                 # CICC member # (paid or unpaid)
    provincial_law_society: str = ""       # law society province
    membership_id: str = ""                # law society / Chambre member ID
    unpaid_other_specify: str = ""         # free-text when rep_type=unpaid_other

    # Organization info
    organization_name: str = ""
    lawyer_name: str = ""                  # if law firm

    # Contact address
    unit: str = ""
    street_number: str = ""
    street_name: str = ""
    city: str = ""
    province: str = ""
    country: str = ""
    postal_code: str = ""
    phone_country_code: str = "1"
    phone_number: str = ""
    fax_country_code: str = ""
    fax_number: str = ""
    email: str = ""

    # Signatures (Section B Q8, Section E reuses applicant_signature/date).
    # Rep signature/date are filled by hand by the representative, not collected
    # from the client — see imm5476/filler.py for the blank PDF slot.
    applicant_signature: str = ""          # applicant typed name
    applicant_date_signed: str = ""        # YYYY-MM-DD
