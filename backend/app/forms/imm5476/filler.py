"""IMM 5476 — Use of a Representative (XFA datasets filler).

XFA datasets paths confirmed via .tmp/dump_xfa_all.py audit (Phase F):

  IMM_5476/Page1/
    RadioButtonList            — top-level "I am:" exclGroup, items 1-5
                                   1 appointing            (A,B,E)
                                   2 updating              (A,B,E)
                                   3 cancelling            (A,C,E)
                                   4 cancel+appoint        (A,B,C,E)
                                   5 withdrawing           (A,D,E)
    SectionA/
      familyName, givenName, DOB   — applicant identity (note: XHTML body in template)
      office  (×3)               — [0] email, [1] phone/address fallback,
                                   [2] type of application (free text)
      application                — application number (if known)
      UCI                        — applicant UCI
    SectionB/
      familyName, givenName       — rep identity (note: XHTML body in template)
      question6/
        questionI/                — UNPAID sub-block
          uncompensated           — exclGroup items 1..5
              1 friend/family   2 CICC   3 other(specify)   4 law society   5 Chambre
          otherRep                — free-text for "Other (please specify)"
          province2               — law society province (unpaid)
          membership2             — law society member ID (unpaid)
          membership              — CICC/Chambre member # (unpaid)
        questionII/               — PAID sub-block
          compensated             — exclGroup items 1..3
              1 CICC   2 law society   3 Chambre
          ICCRCMember             — CICC member #
          province                — law society province
          membership              — law society member ID
          quebecLaw               — Chambre member #
      question7/                  — rep contact address + phone/email
      question8/                  — applicant + rep signatures (typo "signatrureApplicant")
    sectionC/                     — rep being cancelled
    sectionD/                     — rep withdrawing themselves
    sectionE/                     — Applicant's Consent (always written)
      signatrureApplicant (×2)    — applicant + spouse
      dateApplicantSigned
      dateSpouseSigned
"""
from __future__ import annotations

import os
import zlib
from typing import TYPE_CHECKING
from xml.etree import ElementTree as ET

import pikepdf

from ..xfa_filler import fill_xfa_pdf

if TYPE_CHECKING:
    from ..study_permit.schema import StudyPermitData
from .schema import RepAction, RepType

TEMPLATE = os.path.join(os.path.dirname(__file__), "template", "imm5476e.pdf")
UNENC = os.path.join(os.path.dirname(__file__), "template", "imm5476e_unenc.pdf")
XFA_NS = "http://www.xfa.org/schema/xfa-data/1.0/"

_REP_ACTION_XFA_VAL = {
    RepAction.appointing: "1",
    RepAction.updating: "2",
    RepAction.cancelling: "3",
    RepAction.cancelling_and_appointing: "4",
    RepAction.withdrawing: "5",
}

# Sub-radio (Section B / Question 6) — split across two exclGroups in the PDF.
_UNCOMPENSATED_XFA_VAL = {
    RepType.unpaid_friend_family: "1",
    RepType.unpaid_iccrc: "2",
    RepType.unpaid_other: "3",
    RepType.unpaid_law_society: "4",
    RepType.unpaid_chambre: "5",
}
_COMPENSATED_XFA_VAL = {
    RepType.paid_iccrc: "1",
    RepType.paid_law_society: "2",
    RepType.paid_chambre: "3",
}

# Which sections each action populates.
_ACTION_SECTIONS = {
    RepAction.appointing: {"B"},
    RepAction.updating: {"B"},
    RepAction.cancelling: {"C"},
    RepAction.cancelling_and_appointing: {"B", "C"},
    RepAction.withdrawing: {"D"},
}


def _get_raw_datasets(pdf_path: str) -> bytes:
    with pikepdf.open(pdf_path) as pdf:
        xfa = list(pdf.Root.AcroForm.XFA)
        for i in range(0, len(xfa) - 1, 2):
            if str(xfa[i]) == "datasets":
                return bytes(xfa[i + 1].read_raw_bytes())
    raise ValueError("datasets stream not found in IMM 5476 PDF")


def _set(node: ET.Element | None, value: str) -> None:
    """Set text on a node, clearing any child elements (e.g., XHTML body wrappers)."""
    if node is not None:
        node.text = value or ""
        for child in list(node):
            node.remove(child)


def _build_datasets_xml(data: "StudyPermitData") -> str:
    d = data.representative
    raw = _get_raw_datasets(UNENC)
    xml_str = zlib.decompress(raw).decode("utf-8", errors="replace")
    ET.register_namespace("xfa", XFA_NS)
    root = ET.fromstring(xml_str)

    data_root = root.find(f"{{{XFA_NS}}}data")
    if data_root is None:
        raise ValueError("xfa:data element not found in IMM 5476 datasets")
    form = data_root.find("IMM_5476")
    if form is None:
        raise ValueError("IMM_5476 element not found in datasets")
    page1 = form.find("Page1")
    if page1 is None:
        raise ValueError("Page1 element not found in datasets")

    sections = _ACTION_SECTIONS.get(d.rep_action, set())

    # --- Top-level RadioButtonList: action ---
    _set(page1.find("RadioButtonList"), _REP_ACTION_XFA_VAL.get(d.rep_action, "1"))

    # --- Section A: applicant identity (always written) ---
    sec_a = page1.find("SectionA")
    if sec_a is not None:
        _set(sec_a.find("familyName"), d.applicant_family_name)
        _set(sec_a.find("givenName"), d.applicant_given_name)
        _set(sec_a.find("DOB"), d.applicant_dob)
        _set(sec_a.find("UCI"), d.uci_number)
        # office × 3 — [0] email, [1] phone/address fallback (left blank),
        # [2] type-of-application text. Use findall to access by position.
        offices = sec_a.findall("office")
        if len(offices) >= 1:
            _set(offices[0], d.applicant_email)
        if len(offices) >= 3:
            _set(offices[2], d.type_of_application)

    # --- Section B: representative details (only when action includes B) ---
    sec_b = page1.find("SectionB")
    if sec_b is not None:
        if "B" in sections:
            _set(sec_b.find("familyName"), d.rep_family_name)
            _set(sec_b.find("givenName"), d.rep_given_name)

            q6 = sec_b.find("question6")
            if q6 is not None:
                # questionI = unpaid sub-block, questionII = paid sub-block
                q6i = q6.find("questionI")
                q6ii = q6.find("questionII")
                uncomp_val = _UNCOMPENSATED_XFA_VAL.get(d.rep_type, "")
                comp_val = _COMPENSATED_XFA_VAL.get(d.rep_type, "")
                if q6i is not None:
                    _set(q6i.find("uncompensated"), uncomp_val)
                    # Side fields per unpaid sub-type
                    if d.rep_type == RepType.unpaid_other:
                        _set(q6i.find("otherRep"), d.unpaid_other_specify)
                    else:
                        _set(q6i.find("otherRep"), "")
                    if d.rep_type == RepType.unpaid_law_society:
                        _set(q6i.find("province2"), d.provincial_law_society)
                        _set(q6i.find("membership2"), d.membership_id)
                    else:
                        _set(q6i.find("province2"), "")
                        _set(q6i.find("membership2"), "")
                    if d.rep_type in (RepType.unpaid_iccrc, RepType.unpaid_chambre):
                        # questionI has a single shared 'membership' field for
                        # CICC# / Chambre# under unpaid; uses iccrc_number or
                        # membership_id depending on which body.
                        val = d.iccrc_number if d.rep_type == RepType.unpaid_iccrc else d.membership_id
                        _set(q6i.find("membership"), val)
                    else:
                        _set(q6i.find("membership"), "")
                if q6ii is not None:
                    _set(q6ii.find("compensated"), comp_val)
                    _set(
                        q6ii.find("ICCRCMember"),
                        d.iccrc_number if d.rep_type == RepType.paid_iccrc else "",
                    )
                    _set(
                        q6ii.find("province"),
                        d.provincial_law_society if d.rep_type == RepType.paid_law_society else "",
                    )
                    _set(
                        q6ii.find("membership"),
                        d.membership_id if d.rep_type == RepType.paid_law_society else "",
                    )
                    _set(
                        q6ii.find("quebecLaw"),
                        d.membership_id if d.rep_type == RepType.paid_chambre else "",
                    )

            # Question 7: contact address
            q7 = sec_b.find("question7")
            if q7 is not None:
                _set(q7.find("organization"), d.organization_name)
                _set(q7.find("lawyer"), d.lawyer_name)
                _set(q7.find("membershipID"), d.membership_id)
                _set(q7.find("unit"), d.unit)
                _set(q7.find("streetNo"), d.street_number)
                _set(q7.find("streetName"), d.street_name)
                _set(q7.find("city"), d.city)
                _set(q7.find("province"), d.province)
                _set(q7.find("country"), d.country)
                _set(q7.find("postalcode"), d.postal_code)
                _set(q7.find("phoneCountryCode"), d.phone_country_code)
                _set(q7.find("phoneNumber"), d.phone_number)
                _set(q7.find("faxCountryCode"), d.fax_country_code)
                _set(q7.find("faxNumber"), d.fax_number)
                _set(q7.find("email"), d.email)

            # Question 8: signatures
            q8 = sec_b.find("question8")
            if q8 is not None:
                sigs = q8.findall("signatrureApplicant")
                dates = q8.findall("dateSigned")
                if sigs:
                    _set(sigs[0], d.applicant_signature)
                if dates:
                    _set(dates[0], d.applicant_date_signed)
                if len(sigs) > 1:
                    _set(sigs[1], d.rep_signature)
                if len(dates) > 1:
                    _set(dates[1], d.rep_date_signed)
        else:
            # action doesn't include B — clear everything under SectionB
            for tag in ("familyName", "givenName"):
                _set(sec_b.find(tag), "")

    # --- Section C: rep being cancelled (action 3 or 4) ---
    sec_c = page1.find("sectionC")
    if sec_c is not None:
        if "C" in sections:
            # Reuse rep_* fields as the rep being cancelled.
            _set(sec_c.find("familyName"), d.rep_family_name)
            _set(sec_c.find("givenName"), d.rep_given_name)
            _set(sec_c.find("organization"), d.organization_name)
        else:
            _set(sec_c.find("familyName"), "")
            _set(sec_c.find("givenName"), "")
            _set(sec_c.find("organization"), "")

    # --- Section D: rep withdrawing themselves (action 5) ---
    sec_d = page1.find("sectionD")
    if sec_d is not None:
        if "D" in sections:
            _set(sec_d.find("familyName"), d.rep_family_name)
            _set(sec_d.find("givenName"), d.rep_given_name)
            _set(sec_d.find("organization"), d.organization_name)
            _set(sec_d.find("signatrureApplicant"), d.rep_signature)
            _set(sec_d.find("dateApplicantSigned"), d.rep_date_signed)
        else:
            _set(sec_d.find("familyName"), "")
            _set(sec_d.find("givenName"), "")
            _set(sec_d.find("organization"), "")

    # --- Section E: Applicant's Consent (always required) ---
    sec_e = page1.find("sectionE")
    if sec_e is not None:
        sigs_e = sec_e.findall("signatrureApplicant")
        if sigs_e:
            _set(sigs_e[0], d.applicant_signature)
        _set(sec_e.find("dateApplicantSigned"), d.applicant_date_signed)

    return ET.tostring(root, encoding="unicode", xml_declaration=False)


def fill_pdf(data: "StudyPermitData") -> bytes:
    if not (os.path.exists(TEMPLATE) and os.path.exists(UNENC)):
        raise FileNotFoundError(
            "IMM 5476 template not present. Drop imm5476e.pdf and "
            "imm5476e_unenc.pdf at backend/app/forms/imm5476/template/ to "
            "enable filling.",
        )
    if not data.representative:
        return b""
    xml_str = _build_datasets_xml(data)
    return fill_xfa_pdf(TEMPLATE, xml_str)
