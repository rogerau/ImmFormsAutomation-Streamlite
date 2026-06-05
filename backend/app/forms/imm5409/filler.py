"""IMM 5409 — Statutory Declaration of Common-law Union (XFA datasets filler).

Root cause of the previous blank-PDF bug: the form has BOTH an XFA datasets
stream AND AcroForm field annotations.  Adobe reads values from XFA datasets;
the pypdf approach of writing AcroForm /V entries is silently ignored.

XFA datasets paths discovered from imm5409e_unenc.pdf:

  IMM_5409/Page1/
    Info/
      Jurisdiction/Country   — jurisdiction country
      Jurisdiction/Province  — jurisdiction province / state
      FirstName              — applicant full name
      SecondName             — partner full name
      City                   — cohabitation city
      County                 — cohabitation county (optional)
      Province               — cohabitation province / state
      Country                — cohabitation country
      YearsTogether          — number of years together
      startDate              — cohabitation start date (YYYY-MM-DD)
      endDate                — cohabitation end date (blank if ongoing)
    Section1/Options/Sec[0..3]/yesno  — exclGroup; "1"=Yes, "2"=No
    Section2/yesno            — life insurance: applicant names partner as beneficiary; "1"=Yes, "2"=No
    Section3/yesno            — life insurance: partner names applicant as beneficiary; "1"=Yes, "2"=No
    Section4/TextField2       — additional details (free text)
    Section5/
      NameDecl               — applicant name (declaration)
      SignatureDecl          — applicant signature
      NamePartner            — partner name
      SignaturePartner       — partner signature
      City                   — declaration city
      AdminDecl              — commissioner / notary name (optional)
      County                 — declaration county (optional)
      Province               — declaration province / state
      Country                — declaration country
      Day / Month / Year     — declaration date
      SignatureAdminDecl     — commissioner / notary signature (optional)
"""
from __future__ import annotations

import os
import zlib
from typing import TYPE_CHECKING
from xml.etree import ElementTree as ET

import pikepdf

from ..xfa_filler import fill_xfa_pdf

if TYPE_CHECKING:
    from .schema import Imm5409Data

TEMPLATE = os.path.join(os.path.dirname(__file__), "template", "imm5409e.pdf")
UNENC = os.path.join(os.path.dirname(__file__), "template", "imm5409e_unenc.pdf")
XFA_NS = "http://www.xfa.org/schema/xfa-data/1.0/"

# exclGroup item values for Yes/No questions
_YES = "1"
_NO  = "2"


def _get_raw_datasets(pdf_path: str) -> bytes:
    with pikepdf.open(pdf_path) as pdf:
        xfa = list(pdf.Root.AcroForm.XFA)
        for i in range(0, len(xfa) - 1, 2):
            if str(xfa[i]) == "datasets":
                return bytes(xfa[i + 1].read_raw_bytes())
    raise ValueError("datasets stream not found in IMM 5409 PDF")


def _set(node: ET.Element | None, value: str) -> None:
    """Set text on a node, clearing any child elements."""
    if node is not None:
        node.text = value or ""
        for child in list(node):
            node.remove(child)


def _yesno(val: bool) -> str:
    return _YES if val else _NO


def _build_datasets_xml(d: "Imm5409Data") -> str:
    raw = _get_raw_datasets(UNENC)
    xml_str = zlib.decompress(raw).decode("utf-8", errors="replace")
    ET.register_namespace("xfa", XFA_NS)
    root = ET.fromstring(xml_str)

    data_root = root.find(f"{{{XFA_NS}}}data")
    if data_root is None:
        raise ValueError("xfa:data element not found in IMM 5409 datasets")
    form = data_root.find("IMM_5409")
    if form is None:
        raise ValueError("IMM_5409 element not found in datasets")
    page1 = form.find("Page1")
    if page1 is None:
        raise ValueError("Page1 element not found in datasets")

    # --- Info: jurisdiction + cohabitation details ---
    info = page1.find("Info")
    if info is not None:
        juris = info.find("Jurisdiction")
        if juris is not None:
            _set(juris.find("Country"), d.jurisdiction_country)
            _set(juris.find("Province"), d.jurisdiction_province)
        _set(info.find("FirstName"), d.applicant_name)
        _set(info.find("SecondName"), d.partner_name)
        _set(info.find("City"), d.cohabitation_city)
        _set(info.find("County"), d.cohabitation_county)
        _set(info.find("Province"), d.cohabitation_province)
        _set(info.find("Country"), d.cohabitation_country)
        _set(info.find("YearsTogether"), d.years_together)
        _set(info.find("startDate"), d.start_date)
        _set(info.find("endDate"), d.end_date)

    # --- Section 1: 4 Yes/No statements (PDF order a, b, c, d) ---
    # exclGroup values: "1"=Yes, "2"=No
    #  a) jointly signed residential lease/mortgage/purchase agreement
    #  b) jointly own property other than our residence
    #  c) joint bank/trust/credit-union/charge-card accounts
    #  d) declared common-law union under the Canadian Income Tax Act
    sec1_vals = [
        _yesno(d.section1_joint_residential_agreement),
        _yesno(d.section1_joint_property_ownership),
        _yesno(d.section1_joint_financial_accounts),
        _yesno(d.section1_declared_income_tax),
    ]
    sec1 = page1.find("Section1")
    if sec1 is not None:
        opts = sec1.find("Options")
        if opts is not None:
            for idx, sec in enumerate(opts.findall("Sec")):
                if idx < len(sec1_vals):
                    _set(sec.find("yesno"), sec1_vals[idx])

    # --- Section 2: life insurance (applicant names partner as beneficiary) ---
    sec2 = page1.find("Section2")
    if sec2 is not None:
        _set(sec2.find("yesno"), _yesno(d.life_insurance_on_applicant))

    # --- Section 3: life insurance (partner names applicant as beneficiary) ---
    sec3 = page1.find("Section3")
    if sec3 is not None:
        _set(sec3.find("yesno"), _yesno(d.partner_life_insurance))

    # --- Section 4: additional details ---
    sec4 = page1.find("Section4")
    if sec4 is not None:
        _set(sec4.find("TextField2"), d.additional_details)

    # --- Section 5: declaration + signatures ---
    sec5 = page1.find("Section5")
    if sec5 is not None:
        _set(sec5.find("NameDecl"), d.applicant_name)
        _set(sec5.find("SignatureDecl"), d.applicant_signature)
        _set(sec5.find("NamePartner"), d.partner_name)
        _set(sec5.find("SignaturePartner"), d.partner_signature)
        _set(sec5.find("City"), d.declaration_city)
        _set(sec5.find("County"), d.declaration_county)
        _set(sec5.find("Province"), d.declaration_province)
        _set(sec5.find("Country"), d.declaration_country)
        _set(sec5.find("Day"), d.declaration_day)
        _set(sec5.find("Month"), d.declaration_month)
        _set(sec5.find("Year"), d.declaration_year)
        # Commissioner / notary (optional)
        _set(sec5.find("AdminDecl"), d.admin_name)
        _set(sec5.find("SignatureAdminDecl"), d.admin_signature)

    return ET.tostring(root, encoding="unicode", xml_declaration=False)


def fill_pdf(data: "Imm5409Data") -> bytes:
    if not (os.path.exists(TEMPLATE) and os.path.exists(UNENC)):
        raise FileNotFoundError(
            "IMM 5409 template not present. Drop imm5409e.pdf and "
            "imm5409e_unenc.pdf at backend/app/forms/imm5409/template/ to "
            "enable filling.",
        )
    xml_str = _build_datasets_xml(data)
    return fill_xfa_pdf(TEMPLATE, xml_str)
