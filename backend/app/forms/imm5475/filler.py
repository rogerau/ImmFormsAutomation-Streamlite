"""IMM 5475 — Authority to Release Personal Information filler.

XFA dataset paths discovered from imm5475e_unenc.pdf:

  IMM_5475/Page1/
    Choice/RadioButtonList   — exclGroup; "4"=Authorize, "6"=Withdraw
    AppDetails/AppFamily     — applicant family name
    AppDetails/AppGiven      — applicant given names
    AppDetails/DOB/currentDate — applicant DOB
    AppDetails/TextField2 (×4) — application tracking metadata (where submitted,
                                  location, type, etc.) — left blank
    Five/AppFamily           — designated individual family name
    Five/AppGiven            — designated individual given names
    Five/TextField2 (#1)     — name of firm/organization (we reuse for relationship)
    Five/apt, Number, homeAddress
    Five/city (#1)           — City/Town
    Five/province            — ProvinceAbbrev LOV (lic-coded for CA/US)
    Five/city (#2)           — Country/Territory (free text)
    Five/postalCode
    Five/Rextension (#1), Rphone (#1)  — residential phone
    Five/Rextension (#2), Rphone (#2)  — alt phone (left blank — no schema field)
    Five/TextField2 (last)   — email
    Seven/TextField2 (#1), currentDate (#1) — applicant signature + date
    Seven/TextField2 (#2), currentDate (#2) — spouse signature + date (blank)
"""
from __future__ import annotations

import os
import zlib
from typing import TYPE_CHECKING
from xml.etree import ElementTree as ET

import pikepdf

from ..xfa_filler import fill_xfa_pdf

if TYPE_CHECKING:
    from .schema import Imm5475Data

TEMPLATE = os.path.join(os.path.dirname(__file__), "template", "imm5475e.pdf")
UNENC = os.path.join(os.path.dirname(__file__), "template", "imm5475e_unenc.pdf")
XFA_NS = "http://www.xfa.org/schema/xfa-data/1.0/"


def _get_raw_datasets(pdf_path: str) -> bytes:
    with pikepdf.open(pdf_path) as pdf:
        xfa = list(pdf.Root.AcroForm.XFA)
        for i in range(0, len(xfa) - 1, 2):
            if str(xfa[i]) == "datasets":
                return bytes(xfa[i + 1].read_raw_bytes())
    raise ValueError("datasets stream not found in IMM 5475 PDF")


def _normalize_postal(code: str, country: str) -> str:
    """Canadian postal codes need a space — "A1A 1A1" — for IRCC's validator."""
    if not code or not country:
        return code or ""
    if country.strip().lower() not in ("canada", "ca"):
        return code
    s = code.replace(" ", "").upper()
    if (
        len(s) == 6
        and s[0].isalpha() and s[1].isdigit() and s[2].isalpha()
        and s[3].isdigit() and s[4].isalpha() and s[5].isdigit()
    ):
        return f"{s[:3]} {s[3:]}"
    return code


def _set(node: ET.Element | None, value: str) -> None:
    if node is not None:
        node.text = value


def _build_datasets_xml(data: "Imm5475Data", applicant_data: dict) -> str:
    raw = _get_raw_datasets(UNENC)
    xml_str = zlib.decompress(raw).decode("utf-8", errors="replace")
    ET.register_namespace("xfa", XFA_NS)
    root = ET.fromstring(xml_str)

    data_root = root.find(f"{{{XFA_NS}}}data")
    if data_root is None:
        raise ValueError("xfa:data element not found in IMM 5475 datasets")
    form = data_root.find("IMM_5475")
    if form is None:
        raise ValueError("IMM_5475 element not found in datasets")
    page1 = form.find("Page1")
    if page1 is None:
        raise ValueError("Page1 element not found in datasets")

    # --- Choice: Authorize (4) vs Withdraw (6) ---
    radio = page1.find("./Choice/RadioButtonList")
    _set(radio, "6" if data.cancel_previous else "4")

    # --- AppDetails: applicant identity (pulled from master schema) ---
    app = page1.find("AppDetails")
    if app is not None:
        _set(app.find("AppFamily"), applicant_data.get("family_name", ""))
        _set(app.find("AppGiven"), applicant_data.get("given_name", ""))
        _set(app.find("./DOB/currentDate"), applicant_data.get("date_of_birth", ""))
        # AppDetails/TextField2 × 4 — application-tracking metadata we don't
        # collect on the IMM 5475 step (name of office where the application
        # was submitted, location, type of application, etc.). Leave blank.

    # --- Five: designated individual ---
    five = page1.find("Five")
    if five is not None:
        _set(five.find("AppFamily"), data.designated_family_name)
        _set(five.find("AppGiven"), data.designated_given_names)

        textfields = five.findall("TextField2")
        # First TextField2 = "Name of firm or organization"; reuse for relationship.
        if textfields:
            _set(textfields[0], data.designated_relationship)
        # Last TextField2 in Five = email.
        if len(textfields) >= 2:
            _set(textfields[-1], data.designated_email)

        _set(five.find("apt"), data.designated_unit)
        _set(five.find("Number"), data.designated_street_number)
        _set(five.find("homeAddress"), data.designated_street_name)

        cities = five.findall("city")
        if cities:
            _set(cities[0], data.designated_city)
        # Second <city> node is a free-text country/territory input (no LOV
        # binding), so write the human-readable name as-is.
        if len(cities) >= 2:
            _set(cities[1], data.designated_country)

        # The IMM 5475 template has no setProvinceBasedOnCountry script, so the
        # ProvinceAbbrev dropdown items never populate. Writing the LIC code
        # leaves the raw "11" visible. Adobe falls back to displaying the raw
        # rawValue, so we write the abbreviation directly.
        _set(five.find("province"), data.designated_province_state)
        _set(
            five.find("postalCode"),
            _normalize_postal(data.designated_postal_code, data.designated_country),
        )

        # Two phone slots in section 5 (residential + alt). We only carry one
        # phone in the schema; populate the first and leave the second blank.
        rexts = five.findall("Rextension")
        rphones = five.findall("Rphone")
        if rexts:
            _set(rexts[0], data.designated_phone_country_code)
        if rphones:
            _set(rphones[0], data.designated_phone)

    # --- Seven: signatures + dates ---
    seven = page1.find("Seven")
    if seven is not None:
        sigs = seven.findall("TextField2")
        dates = seven.findall("currentDate")
        if sigs:
            _set(sigs[0], data.applicant_signature)
        if dates:
            _set(dates[0], data.signed_date)
        # Second sig/date = spouse common-law partner; left blank.

    return ET.tostring(root, encoding="unicode", xml_declaration=False)


def fill_pdf(data: "Imm5475Data", applicant_data: dict) -> bytes:
    if not (os.path.exists(TEMPLATE) and os.path.exists(UNENC)):
        raise FileNotFoundError(
            "IMM 5475 template not present. Drop imm5475e.pdf and "
            "imm5475e_unenc.pdf at backend/app/forms/imm5475/template/ to "
            "enable filling.",
        )
    xml_str = _build_datasets_xml(data, applicant_data)
    return fill_xfa_pdf(TEMPLATE, xml_str)
