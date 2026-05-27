"""IMM 5476 — Use of a Representative (XFA datasets filler).

Root cause of the previous blank-PDF bug: the form has BOTH an XFA datasets
stream AND AcroForm field annotations.  Adobe reads values from XFA datasets;
the pypdf approach of writing AcroForm /V entries is silently ignored.

XFA datasets paths discovered from imm5476e_unenc.pdf:

  IMM_5476/Page1/
    RadioButtonList            — exclGroup; "1"=paid+member, "2"=paid+other,
                                  "3"=unpaid, "4"=cancel+appoint, "5"=cancel
    SectionA/
      familyName               — applicant family name (XHTML body in template)
      givenName
      DOB                      — YYYY-MM-DD
      UCI                      — unique client identifier
    SectionB/
      familyName               — rep family name (XHTML body in template)
      givenName
      question6/questionII/
        ICCRCMember            — ICCRC membership #
        province               — provincial law society
        membership             — membership ID
      question7/
        organization, lawyer, membershipID
        unit, streetNo, streetName, city, province, country, postalcode
        phoneCountryCode, phoneNumber, faxCountryCode, faxNumber, email
      question8/
        signatrureApplicant[0]  — applicant signature (note: typo "signatrure" in form)
        dateSigned[0]           — applicant date
        signatrureApplicant[1]  — rep signature
        dateSigned[1]           — rep date
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
from .schema import RepType

TEMPLATE = os.path.join(os.path.dirname(__file__), "template", "imm5476e.pdf")
UNENC = os.path.join(os.path.dirname(__file__), "template", "imm5476e_unenc.pdf")
XFA_NS = "http://www.xfa.org/schema/xfa-data/1.0/"

# XFA exclGroup item values for representative type (values 1–5, not the old AcroForm /0–/4).
_REP_TYPE_XFA_VAL = {
    RepType.paid_member: "1",   # Paid, member of regulatory body (ICCRC / law society)
    RepType.paid_other:  "2",   # Paid, not a member of a regulatory body
    RepType.unpaid:      "3",   # Unpaid (friend / family)
    RepType.cancel:      "5",   # Cancel only (item 5 in the exclGroup)
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

    # --- RadioButtonList: representative type ---
    _set(page1.find("RadioButtonList"), _REP_TYPE_XFA_VAL.get(d.rep_type, "1"))

    # --- Section A: applicant identity ---
    sec_a = page1.find("SectionA")
    if sec_a is not None:
        _set(sec_a.find("familyName"), d.applicant_family_name)
        _set(sec_a.find("givenName"), d.applicant_given_name)
        _set(sec_a.find("DOB"), d.applicant_dob)
        _set(sec_a.find("UCI"), d.uci_number)

    # --- Section B: representative details ---
    sec_b = page1.find("SectionB")
    if sec_b is not None:
        _set(sec_b.find("familyName"), d.rep_family_name)
        _set(sec_b.find("givenName"), d.rep_given_name)

        # Question 6: accreditation (paid rep)
        q6 = sec_b.find("question6")
        if q6 is not None:
            q6ii = q6.find("questionII")
            if q6ii is not None:
                _set(q6ii.find("ICCRCMember"), d.iccrc_number)
                _set(q6ii.find("province"), d.provincial_law_society)
                _set(q6ii.find("membership"), d.membership_id)

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

        # Question 8: signatures (note: "signatrure" is the typo in the form)
        q8 = sec_b.find("question8")
        if q8 is not None:
            sigs = q8.findall("signatrureApplicant")
            dates = q8.findall("dateSigned")
            _set(sigs[0] if sigs else None, d.applicant_signature)
            _set(dates[0] if dates else None, d.applicant_date_signed)
            _set(sigs[1] if len(sigs) > 1 else None, d.rep_signature)
            _set(dates[1] if len(dates) > 1 else None, d.rep_date_signed)

    # --- Sections C / D / E: clear XHTML body defaults ---
    # The original datasets has <body xmlns="..."> child elements inside
    # familyName nodes in these sections as placeholder content. If we don't
    # call _set() on them, Adobe renders the raw XHTML markup as visible text.
    # Explicitly clear them (set to "") so they appear blank.
    for section_name in ("sectionC", "sectionD"):
        sec = page1.find(section_name)
        if sec is not None:
            _set(sec.find("familyName"), "")

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
