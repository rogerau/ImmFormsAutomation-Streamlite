"""IMM 1294 — Application for Study Permit (XFA-based filler).

Strategy: the datasets XML is ~500KB because it contains LOV lookup tables.
We read the datasets from the unencrypted template, parse just the <form1> data
section, replace field values in-place using ElementTree, then serialize and inject.
"""
from __future__ import annotations

import os
import re
import zlib
from typing import TYPE_CHECKING
from xml.etree import ElementTree as ET

import pikepdf

from ..xfa_filler import fill_xfa_pdf

if TYPE_CHECKING:
    from ..study_permit.schema import StudyPermitData

TEMPLATE = os.path.join(os.path.dirname(__file__), "template", "imm1294e.pdf")
UNENC = os.path.join(os.path.dirname(__file__), "template", "imm1294e_unenc.pdf")

XFA_NS = "http://www.xfa.org/schema/xfa-data/1.0/"

# IRCC dropdown LOV codes. Dropdowns bind `valueRef="lic"` so the saved value
# must be the lic code, not the human-readable label. ProvinceState fields also
# trigger setProvinceBasedOnCountry which only populates Canadian provinces /
# US states when Country.rawValue == "511" (Canada) or "461" (USA).
_COUNTRY_LIC = {
    "canada": "511", "ca": "511",
    "united states": "461", "united states of america": "461",
    "usa": "461", "us": "461", "u.s.a.": "461", "u.s.": "461", "america": "461",
}

_PROVINCE_LIC = {
    "ab": "09", "bc": "11", "mb": "07", "nb": "04", "nl": "01",
    "ns": "03", "nt": "10", "nu": "64", "on": "06", "pe": "02",
    "qc": "05", "sk": "08", "yt": "12",
}

_STATE_LIC = {
    "al": "13", "ak": "14", "az": "15", "ar": "16", "ca": "17", "co": "18",
    "ct": "19", "de": "20", "dc": "21", "fl": "22", "ga": "23", "hi": "24",
    "id": "25", "il": "26", "in": "27", "ia": "28", "ks": "29", "ky": "30",
    "la": "31", "me": "32", "md": "33", "ma": "34", "mi": "35", "mn": "36",
    "ms": "37", "mo": "38", "mt": "39", "ne": "40", "nv": "41", "nh": "42",
    "nj": "43", "nm": "44", "ny": "45", "nc": "46", "nd": "47", "oh": "48",
    "ok": "49", "or": "50", "pa": "51", "ri": "52", "sc": "53", "sd": "54",
    "tn": "55", "tx": "56", "ut": "57", "vt": "58", "va": "59", "wa": "60",
    "wv": "61", "wi": "62", "wy": "63", "as": "66", "fm": "67", "gu": "68",
    "mh": "69", "mp": "70", "pw": "71", "vi": "72", "pr": "PR",
}


def _country_lic(name: str) -> str:
    """Return LOV lic code for a country name, or the original text if unknown."""
    if not name:
        return ""
    return _COUNTRY_LIC.get(name.strip().lower(), name)


def _province_lic(country: str, prov: str) -> str:
    """Return ProvinceAbbrev/StateAbbrev lic code for Canadian provinces / US
    states. Returns empty when the country isn't Canada or USA — those fields
    are blocked out by the form's design."""
    if not prov:
        return ""
    c = (country or "").strip().lower()
    p = prov.strip().lower()
    if c in ("canada", "ca"):
        return _PROVINCE_LIC.get(p, "")
    if c in ("united states", "united states of america", "usa", "us",
             "u.s.a.", "u.s.", "america"):
        return _STATE_LIC.get(p, "")
    return ""


def _get_raw_datasets(pdf_path: str) -> bytes:
    """Return the raw (compressed) bytes of the XFA datasets stream."""
    with pikepdf.open(pdf_path) as pdf:
        xfa_array = list(pdf.Root.AcroForm.XFA)
        for i in range(0, len(xfa_array) - 1, 2):
            if str(xfa_array[i]) == "datasets":
                return bytes(xfa_array[i + 1].read_raw_bytes())
    raise ValueError("datasets stream not found in PDF")


def _normalize_postal(code: str, country: str) -> str:
    """Canadian postal codes must be formatted "A1A 1A1" (with space) for IRCC's
    JavaScript validator. Insert the space if missing. Leave non-Canadian codes
    (US ZIPs, etc.) untouched."""
    if not code or not country:
        return code or ""
    if country.strip().lower() not in ("canada", "ca"):
        return code
    s = code.replace(" ", "").upper()
    if len(s) == 6 and s[0].isalpha() and s[1].isdigit() and s[2].isalpha() and s[3].isdigit() and s[4].isalpha() and s[5].isdigit():
        return f"{s[:3]} {s[3:]}"
    return code


def _set(root: ET.Element, path: str, value: str) -> None:
    """Navigate dot-path and set element text; silently skip missing nodes."""
    node = root
    for part in path.split("."):
        found = node.find(f".//{part}") if part != node.tag else node
        if found is None:
            # Try direct child
            found = node.find(part)
        if found is None:
            return
        node = found
    node.text = value


def _find(root: ET.Element, *tags: str) -> ET.Element | None:
    """Walk through a sequence of child tags and return the final node or None."""
    node = root
    for tag in tags:
        child = node.find(tag)
        if child is None:
            return None
        node = child
    return node


def _set_path(root: ET.Element, *tags_and_value: str) -> None:
    """Set element text by navigating a sequence of child tags. Last arg is value."""
    *tags, value = tags_and_value
    node = root
    for tag in tags:
        child = node.find(tag)
        if child is None:
            return
        node = child
    node.text = value


def _split_date(date_str: str) -> tuple[str, str, str]:
    """Return (year, month, day) from 'YYYY-MM-DD' or empty triple."""
    parts = (date_str or "").split("-")
    parts = parts + ["", "", ""]
    return parts[0], parts[1], parts[2]


def _fill_phone(phone_el, full_number: str, type_str: str = "",
                country_code: str = "", ext: str = "") -> None:
    """Fill a Phone/AltPhone/FaxEmail-Phone subform with parsed values.
    Handles CanadaUS / Other / NumberCountry / NANumber breakdown and IntlNumber.
    Always sets ActualNumber as a fallback."""
    if phone_el is None or not (full_number or country_code):
        return
    digits = "".join(c for c in (full_number or "") if c.isdigit())
    # Strip leading "1" for NA numbers passed as 11 digits.
    is_na = (country_code or "").lstrip("+") in ("1", "")
    if is_na and (len(digits) >= 11 and digits.startswith("1")):
        digits = digits[1:]
    if is_na and len(digits) == 10:
        area, first3, last5 = digits[:3], digits[3:6], digits[6:10]
        for tag, val in [("CanadaUS", "1"), ("Other", "0"), ("NumberCountry", "1")]:
            el = phone_el.find(tag)
            if el is not None:
                el.text = val
        na = phone_el.find("NANumber")
        if na is not None:
            for tag, val in [("AreaCode", area), ("FirstThree", first3), ("LastFive", last5)]:
                el = na.find(tag)
                if el is not None:
                    el.text = val
        # ActualNumber is a calculated field that concatenates AreaCode+FirstThree+
        # LastFive+Ext. Seed it with the same value so it renders before Adobe
        # re-runs the calculate.
        actual_value = area + first3 + last5
    else:
        for tag, val in [("CanadaUS", "0"), ("Other", "1"), ("NumberCountry", (country_code or "").lstrip("+"))]:
            el = phone_el.find(tag)
            if el is not None:
                el.text = val
        intl = phone_el.find("IntlNumber")
        if intl is not None:
            inner = intl.find("IntlNumber")
            if inner is not None:
                inner.text = digits
        actual_value = digits
    actual = phone_el.find("ActualNumber")
    if actual is not None:
        actual.text = actual_value
    if type_str:
        t = phone_el.find("Type")
        if t is not None:
            t.text = type_str
    if ext:
        ne = phone_el.find("NumberExt")
        if ne is not None:
            ne.text = ext


def _fill_residence_row(row_el, residence, date_parts_el=None) -> None:
    """Fill a CurrentCOR/PreviousCOR/CountryWhereApplying Row with one residence."""
    if row_el is None or residence is None:
        return
    for tag, val in [
        ("Country", residence.country),
        ("Status", residence.status or ""),
        ("Other", residence.status_other or ""),
        ("FromDate", residence.from_date),
        ("ToDate", residence.to_date),
    ]:
        el = row_el.find(tag)
        if el is not None:
            el.text = val
    if date_parts_el is not None:
        fy, fm, fd = _split_date(residence.from_date)
        ty, tm, td = _split_date(residence.to_date)
        for tag, val in [
            ("FromYr", fy), ("FromMM", fm), ("FromDD", fd),
            ("ToYr", ty), ("ToMM", tm), ("ToDD", td),
        ]:
            el = date_parts_el.find(tag)
            if el is not None:
                el.text = val


def _build_datasets_xml(data: "StudyPermitData") -> str:
    """
    Read the template datasets XML, modify the form1 section with our data,
    and return the full XML string.
    """
    raw = _get_raw_datasets(UNENC)
    xml_str = zlib.decompress(raw).decode("utf-8", errors="replace")

    # ElementTree requires a single root; the datasets root is <xfa:datasets>
    # Register namespace to avoid ns0: prefixes
    ET.register_namespace("xfa", XFA_NS)

    # Parse
    root = ET.fromstring(xml_str)
    xfa_data = root.find(f"{{{XFA_NS}}}data")
    if xfa_data is None:
        raise ValueError("xfa:data element not found in datasets")

    form1 = xfa_data.find("form1")
    if form1 is None:
        raise ValueError("form1 element not found in xfa:data")

    d = data.personal_info
    p = data.passport

    # ---- Page 1 — Personal Details ----
    page1 = form1.find("Page1")
    if page1 is not None:
        pd = page1.find("PersonalDetails")
        if pd is not None:
            uci_el = pd.find("UCIClientID")
            if uci_el is not None:
                uci_el.text = d.uci or ""
            # "I want service in" (Page 1 subsection 2)
            service_in_el = _find(pd, "ServiceIn", "ServiceIn")
            if service_in_el is not None:
                service_in_el.text = d.service_in or "English"
            _set_path(pd, "Name", "FamilyName", d.family_name)
            _set_path(pd, "Name", "GivenName", d.given_name)
            if d.alias_family_name:
                _set_path(pd, "AliasName", "AliasFamilyName", d.alias_family_name)
                _set_path(pd, "AliasName", "AliasGivenName", d.alias_given_name)
                alias_ind = _find(pd, "AliasName", "AliasNameIndicator", "AliasNameIndicator")
                if alias_ind is not None:
                    alias_ind.text = "1"
            sex_el = _find(pd, "Sex", "Sex")
            if sex_el is not None:
                sex_el.text = d.sex.value
            # DOB
            dob_parts = d.date_of_birth.split("-") if d.date_of_birth else ["", "", ""]
            year, month, day = (dob_parts + ["", "", ""])[:3]
            for tag, val in [("DOBYear", year), ("DOBMonth", month), ("DOBDay", day)]:
                el = pd.find(tag)
                if el is not None:
                    el.text = val
            for tag, val in [("PlaceBirthCity", d.place_birth_city),
                              ("PlaceBirthCountry", d.place_birth_country)]:
                el = pd.find(tag)
                if el is not None:
                    el.text = val
            cit_el = _find(pd, "Citizenship", "Citizenship")
            if cit_el is not None:
                cit_el.text = d.citizenship

            # Current country of residence (subsection 7)
            if d.current_residence:
                _fill_residence_row(
                    _find(pd, "CurrentCOR", "Row2"),
                    d.current_residence,
                    pd.find("CORDates"),
                )
            else:
                cor_el = _find(pd, "CurrentCOR", "Row2", "Country")
                if cor_el is not None:
                    cor_el.text = d.current_country

            # Previous countries of residence (subsection 8)
            pcr_ind = pd.find("PCRIndicator")
            if pcr_ind is not None:
                pcr_ind.text = "Y" if d.has_previous_residence else "N"
            if d.has_previous_residence and d.previous_residences:
                pcr = pd.find("PreviousCOR")
                rows_dates = [
                    (pcr.find("Row2") if pcr is not None else None, pd.find("PCRDatesR1")),
                    (pcr.find("Row3") if pcr is not None else None, pd.find("PCRDatesR2")),
                ]
                for (row_el, dates_el), residence in zip(rows_dates, d.previous_residences[:2]):
                    _fill_residence_row(row_el, residence, dates_el)

            # Country where applying (subsection 9)
            same_ind = pd.find("SameAsCORIndicator")
            if same_ind is not None:
                same_ind.text = "Y" if d.applying_country_same_as_current else "N"
            if not d.applying_country_same_as_current and d.applying_country:
                _fill_residence_row(
                    _find(pd, "CountryWhereApplying", "Row2"),
                    d.applying_country,
                    pd.find("CWADates"),
                )

        # Marital status (subsection 10): status text + date of marriage + spouse name
        ms_section = _find(page1, "MaritalStatus", "SectionA")
        if ms_section is not None:
            ms_el = ms_section.find("MaritalStatus")
            if ms_el is not None:
                ms_el.text = d.marital_status
            fam = data.family
            if fam.spouse and fam.marriage_date:
                md_el = ms_section.find("DateOfMarriage")
                if md_el is not None:
                    md_el.text = fam.marriage_date
                my, mm, mdy = _split_date(fam.marriage_date)
                md_parts = ms_section.find("MarriageDate")
                if md_parts is not None:
                    for tag, val in [("FromYr", my), ("FromMM", mm), ("FromDD", mdy)]:
                        el = md_parts.find(tag)
                        if el is not None:
                            el.text = val
                fn_el = ms_section.find("FamilyName")
                if fn_el is not None:
                    fn_el.text = fam.spouse.family_name
                gn_el = ms_section.find("GivenName")
                if gn_el is not None:
                    gn_el.text = fam.spouse.given_names

    # ---- Page 2 — Passport + Contact ----
    page2 = form1.find("Page2")
    if page2 is not None:
        # Languages:
        #   1a) Native language       -> Languages/languages/nativeLang/nativeLang
        #   1b) Able to communicate   -> Languages/languages/ableToCommunicate/ableToCommunicate
        #   1c) Most at ease          -> Languages/languages/lov (sibling element)
        #   1d) Taken English/French test -> Languages/LanguageTest (Y/N)
        native_lang = _find(page2, "MaritalStatus", "SectionA", "Languages", "languages", "nativeLang", "nativeLang")
        if native_lang is not None:
            native_lang.text = d.language.value
        comm_lang = _find(page2, "MaritalStatus", "SectionA", "Languages", "languages", "ableToCommunicate", "ableToCommunicate")
        if comm_lang is not None:
            comm_lang.text = d.language.value
        most_at_ease = _find(page2, "MaritalStatus", "SectionA", "Languages", "languages", "lov")
        if most_at_ease is not None:
            most_at_ease.text = (d.language_most_at_ease.value if d.language_most_at_ease else d.language.value)
        lang_test_el = _find(page2, "MaritalStatus", "SectionA", "Languages", "LanguageTest")
        if lang_test_el is not None:
            lang_test_el.text = "Y" if d.taken_language_test else "N"

        # Previously married / common-law (subsection 11) — datasets path is Page2 even though
        # the form renders this on page 1. The IRCC structure puts it under Page2 MaritalStatus.
        ms2 = _find(page2, "MaritalStatus", "SectionA")
        if ms2 is not None:
            pm = data.family.previous_marriage if data.family else None
            pm_ind = ms2.find("PrevMarriedIndicator")
            if pm_ind is not None:
                pm_ind.text = "Y" if (pm and pm.had_previous) else "N"
            if pm and pm.had_previous:
                pmf = ms2.find("PMFamilyName")
                if pmf is not None:
                    pmf.text = pm.family_name
                pmg = _find(ms2, "GivenName", "PMGivenName")
                if pmg is not None:
                    pmg.text = pm.given_names
                psdob = ms2.find("PrevSpouseDOB")
                if psdob is not None:
                    psy, psm, psd = _split_date(pm.date_of_birth)
                    for tag, val in [("DOBYear", psy), ("DOBMonth", psm), ("DOBDay", psd)]:
                        el = psdob.find(tag)
                        if el is not None:
                            el.text = val
                tor = ms2.find("TypeOfRelationship")
                if tor is not None:
                    tor.text = pm.relationship_type
                fd = ms2.find("FromDate")
                if fd is not None:
                    fd.text = pm.from_date
                td = _find(ms2, "ToDate", "ToDate")
                if td is not None:
                    td.text = pm.to_date
                pmd = ms2.find("PreviouslyMarriedDates")
                if pmd is not None:
                    fy, fm, fdy = _split_date(pm.from_date)
                    ty, tm, tdy = _split_date(pm.to_date)
                    for tag, val in [
                        ("FromYr", fy), ("FromMM", fm), ("FromDD", fdy),
                        ("ToYr", ty), ("ToMM", tm), ("ToDD", tdy),
                    ]:
                        el = pmd.find(tag)
                        if el is not None:
                            el.text = val

        # Passport
        pp = _find(page2, "MaritalStatus", "SectionA", "Passport")
        if pp is not None:
            # Q5 — Taiwan passport (Y/N exclGroup; the dataset node TaiwanPIN takes "Y"/"N")
            tw = pp.find("TaiwanPIN")
            if tw is not None:
                tw.text = "Y" if d.taiwan_passport else "N"
            # Q6 — Israel passport indicator (Y/N exclGroup)
            isr = pp.find("IsraelPassportIndicator")
            if isr is not None:
                isr.text = "Y" if d.israel_passport_not_valid else "N"
            issue_parts = p.issue_date.split("-") if p.issue_date else ["", "", ""]
            exp_parts = p.expiry_date.split("-") if p.expiry_date else ["", "", ""]
            iy, im, iday = (issue_parts + ["", "", ""])[:3]
            ey, em, eday = (exp_parts + ["", "", ""])[:3]
            for field_path, val in [
                (("PassportNum", "PassportNum"), p.passport_number),
                (("CountryofIssue", "CountryofIssue"), p.country_of_issue),
                # Composite date widgets (what the form actually renders)
                (("IssueDate", "IssueDate"), p.issue_date),
                (("ExpiryDate",), p.expiry_date),
                # Date-part triples (kept in sync, some revisions render these)
                (("IssueYYYY",), iy), (("IssueMM",), im), (("IssueDD",), iday),
                (("expiryYYYY",), ey), (("expiryMM",), em), (("expiryDD",), eday),
            ]:
                node = pp
                for part in field_path:
                    child = node.find(part)
                    if child is None:
                        break
                    node = child
                else:
                    node.text = val

        # National Identity Document (page2/natID)
        nat_id = data.national_id
        nat_id_el = page2.find("natID")
        if nat_id_el is not None:
            ind = _find(nat_id_el, "q1", "natIDIndicator")
            if ind is not None:
                ind.text = "Y" if nat_id.has_document else "N"
            if nat_id.has_document:
                docs = nat_id_el.find("natIDdocs")
                if docs is not None:
                    dn = _find(docs, "DocNum", "DocNum")
                    if dn is not None:
                        dn.text = nat_id.doc_number
                    coi = _find(docs, "CountryofIssue", "CountryofIssue")
                    if coi is not None:
                        coi.text = nat_id.country_of_issue
                    isd = _find(docs, "IssueDate", "IssueDate")
                    if isd is not None:
                        isd.text = nat_id.issue_date
                    exp = docs.find("ExpiryDate")
                    if exp is not None:
                        exp.text = nat_id.expiry_date

        # US PR Card (page2/USCard)
        us = data.us_pr_card
        us_card_el = page2.find("USCard")
        if us_card_el is not None:
            ind = _find(us_card_el, "q1", "usCardIndicator")
            if ind is not None:
                ind.text = "Y" if us.has_card else "N"
            if us.has_card:
                docs = us_card_el.find("usCarddocs")
                if docs is not None:
                    dn = _find(docs, "DocNum", "DocNum")
                    if dn is not None:
                        dn.text = us.doc_number
                    exp = docs.find("ExpiryDate")
                    if exp is not None:
                        exp.text = us.expiry_date
                    # Some IMM 1294 revisions have a USCIS_Number sibling; write defensively.
                    uscis = docs.find("USCIS_Number")
                    if uscis is not None:
                        uscis.text = us.uscis_number or ""

        # Contact — mailing address (+ district), residential address (when not same)
        contact = page2.find("contact")
        if contact is not None:
            addr = data.contact.mailing_address
            postal = _normalize_postal(addr.postal_code, addr.country)
            for tag, val in [
                ("AddressRow1/StreetNum/StreetNum", addr.street_number),
                ("AddressRow1/Streetname/Streetname", addr.street_name),
                ("AddressRow1/Apt/AptUnit", addr.unit),
                ("AddressRow2/CityTow/CityTown", addr.city),
                ("AddressRow2/Country/Country", _country_lic(addr.country)),
                ("AddressRow2/ProvinceState/ProvinceState", _province_lic(addr.country, addr.province_state)),
                ("AddressRow2/PostalCode/PostalCode", postal),
                ("AddressRow2/District", addr.district or ""),
            ]:
                el = contact.find(tag)
                if el is not None:
                    el.text = val

            # Residential-same-as-mailing indicator + optional residential block
            same_mail = contact.find("SameAsMailingIndicator")
            if same_mail is not None:
                same_mail.text = "Y" if data.contact.residential_address_same_as_mailing else "N"
            res = data.contact.residential_address
            if not data.contact.residential_address_same_as_mailing and res is not None:
                res_postal = _normalize_postal(res.postal_code, res.country)
                for tag, val in [
                    ("ResidentialAddressRow1/AptUnit/AptUnit", res.unit),
                    ("ResidentialAddressRow1/StreetNum/StreetNum", res.street_number),
                    ("ResidentialAddressRow1/StreetName/Streetname", res.street_name),
                    ("ResidentialAddressRow1/CityTown/CityTown", res.city),
                    ("ResidentialAddressRow2/Country/Country", _country_lic(res.country)),
                    ("ResidentialAddressRow2/ProvinceState/ProvinceState", _province_lic(res.country, res.province_state)),
                    ("ResidentialAddressRow2/PostalCode/PostalCode", res_postal),
                    ("ResidentialAddressRow2/District", res.district or ""),
                ]:
                    el = contact.find(tag)
                    if el is not None:
                        el.text = val

    # ---- Page 3 — Phone, Study Details, Education, Occupation ----
    page3 = form1.find("Page3")
    if page3 is not None:
        # Primary phone — number + type + explicit country code + extension.
        primary_phone_el = _find(page3, "PhoneNumbers", "Phone")
        _fill_phone(
            primary_phone_el,
            data.contact.phone,
            data.contact.primary_phone_type or "",
            data.contact.primary_phone_country_code or "",
            data.contact.primary_phone_ext or "",
        )

        # Alternate phone (optional)
        if data.contact.has_alt_phone and data.contact.alt_phone is not None:
            alt = data.contact.alt_phone
            _fill_phone(
                _find(page3, "PhoneNumbers", "AltPhone"),
                alt.number, alt.phone_type, alt.country_code, alt.ext,
            )

        # Fax (optional) — same parser; FaxEmail/Phone has identical shape.
        if data.contact.has_fax and data.contact.fax is not None:
            fax = data.contact.fax
            _fill_phone(
                _find(page3, "FaxEmail", "Phone"),
                fax.number, "", fax.country_code, fax.ext,
            )

        # Email
        email_el = _find(page3, "FaxEmail", "Email")
        if email_el is not None:
            email_el.text = data.contact.email

        # Study details
        study = data.study
        dos = page3.find("DetailsOfStudy")
        if dos is not None:
            row = dos.find("PurposeRow1")
            if row is not None:
                _set_path(row, "schoolName", "SchoolName", study.school_name)
                _set_path(row, "schoolName", "Level", study.level)
                _set_path(row, "schoolName", "Program", study.program)
                _set_path(row, "ProvinceState", "Prov", _province_lic("Canada", study.province_state))
                _set_path(row, "CityTown", "CityTown", study.city)
                _set_path(row, "Address", "Address", study.address)
                dli_el = row.find("DLI")
                if dli_el is not None:
                    dli_el.text = study.dli_number
                sno_el = row.find("StudentNo")
                if sno_el is not None:
                    sno_el.text = study.student_number
                # Dates
                sd = study.start_date.split("-") if study.start_date else ["", "", ""]
                ed = study.end_date.split("-") if study.end_date else ["", "", ""]
                from_el = _find(row, "HowLongStudy", "FromDate")
                if from_el is not None:
                    from_el.text = study.start_date
                to_el = _find(row, "HowLongStudy", "ToDate")
                if to_el is not None:
                    to_el.text = study.end_date

        # Cost-of-studies / funds / PAL / CAQ (Page3/Contacts_Row1)
        contacts_row = page3.find("Contacts_Row1")
        if contacts_row is not None:
            tu = _find(contacts_row, "tuition", "amount")
            if tu is not None:
                tu.text = study.tuition_amount
            rb = _find(contacts_row, "roomBoard", "amount")
            if rb is not None:
                rb.text = study.room_board_amount
            ot = _find(contacts_row, "other", "amount")
            if ot is not None:
                ot.text = study.other_amount
            funds = _find(contacts_row, "expensesPaid", "Funds", "Funds")
            if funds is not None:
                funds.text = study.funds_available
            paid_by = _find(contacts_row, "expensesPaid", "expensesPaidBy")
            if paid_by is not None:
                paid_by.text = study.expenses_paid_by
            paid_other = _find(contacts_row, "expensesPaid", "Other")
            if paid_other is not None:
                paid_other.text = study.expenses_paid_by_other
            pal = contacts_row.find("PAL")
            if pal is not None:
                dn = pal.find("DocNum")
                if dn is not None:
                    dn.text = study.pal_doc_number
                de = pal.find("DocExpiry")
                if de is not None:
                    de.text = study.pal_doc_expiry
            caq = contacts_row.find("CAQ")
            if caq is not None:
                cn = caq.find("CertNum")
                if cn is not None:
                    cn.text = study.caq_cert_number
                ce = caq.find("CertExpiry")
                if ce is not None:
                    ce.text = study.caq_cert_expiry

        # Education indicator + history (first entry)
        edu_section = page3.find("Education")
        if edu_section is not None:
            edu_ind = edu_section.find("EducationIndicator")
            if edu_ind is not None:
                edu_ind.text = "Y" if data.has_education_history else "N"
        if edu_section is not None and data.education_history:
            e = data.education_history[0]
            edu_row = edu_section.find("Edu_Row1")
            if edu_row is not None:
                for tag, val in [
                    ("FromYear", e.from_year), ("FromMonth", e.from_month),
                    ("ToYear", e.to_year), ("ToMonth", e.to_month),
                    ("FieldOfStudy", e.field_of_study), ("School", e.school),
                    ("CityTown", e.city),
                    ("ProvState", _province_lic(e.country, e.province_state)),
                ]:
                    el = edu_row.find(tag)
                    if el is not None:
                        el.text = val
                country_el = _find(edu_row, "Country", "Country")
                if country_el is not None:
                    country_el.text = _country_lic(e.country)

        # Occupation history (up to 3 rows)
        occ_section = page3.find("Occupation")
        if occ_section is not None:
            for idx, row_tag in enumerate(["OccupationRow1", "OccupationRow2", "OccupationRow3"]):
                if idx >= len(data.occupation_history):
                    break
                o = data.occupation_history[idx]
                occ_row = occ_section.find(row_tag)
                if occ_row is not None:
                    for tag, val in [
                        ("FromYear", o.from_year), ("FromMonth", o.from_month),
                        ("ToYear", o.to_year), ("ToMonth", o.to_month),
                        ("Employer", o.employer),
                        ("ProvState", _province_lic(o.country, o.province_state)),
                    ]:
                        el = occ_row.find(tag)
                        if el is not None:
                            el.text = val
                    occ_el = _find(occ_row, "Occupation", "Occupation")
                    if occ_el is not None:
                        occ_el.text = o.occupation
                    city_el = _find(occ_row, "CityTown", "CityTown")
                    if city_el is not None:
                        city_el.text = o.city
                    country_el = _find(occ_row, "Country", "Country")
                    if country_el is not None:
                        country_el.text = _country_lic(o.country)

    # ---- Page 4 — Background Questions ----
    page4 = form1.find("Page4")
    if page4 is not None:
        # BackgroundInfo holds two sub-questions:
        #   Choice[0] = Q86 tuberculosis
        #   Choice[1] = Q87 medical disorder
        #   Details/MedicalDetails = Q87 textbox
        bg1 = page4.find("BackgroundInfo")
        if bg1 is not None:
            choices = bg1.findall("Choice")
            if len(choices) >= 1:
                choices[0].text = "Y" if data.tuberculosis else "N"
            if len(choices) >= 2:
                choices[1].text = "Y" if data.medical_condition else "N"
            details_el = _find(bg1, "Details", "MedicalDetails")
            if details_el is not None:
                details_el.text = data.medical_condition_details or ""

        # PageWrapper holds the rest
        wrap = page4.find("PageWrapper")
        if wrap is not None:
            # Visa-refusal block (BackgroundInfo2): three independent Y/N
            # sub-questions sharing one details textbox.
            bg2 = wrap.find("BackgroundInfo2")
            if bg2 is not None:
                vc1 = bg2.find("VisaChoice1")  # Q88a: remained beyond status
                if vc1 is not None:
                    vc1.text = "Y" if data.previously_remained_status else "N"
                vc2 = bg2.find("VisaChoice2")  # Q88b: previously applied
                if vc2 is not None:
                    vc2.text = "Y" if data.previously_applied_canada else "N"
                vc3 = bg2.find("VisaChoice3")  # Q89: refused a visa / denied entry
                if vc3 is not None:
                    vc3.text = "Y" if data.previously_refused_visa else "N"
                ref_details = _find(bg2, "Details", "refusedDetails")
                if ref_details is not None:
                    ref_details.text = data.previously_refused_visa_details or ""

            # Criminal record (BackgroundInfo3 — Q90)
            bg3 = wrap.find("BackgroundInfo3")
            if bg3 is not None:
                cc = bg3.find("Choice")
                if cc is not None:
                    cc.text = "Y" if data.criminal_record else "N"
                cd = bg3.find("Details")
                if cd is not None:
                    cd.text = data.criminal_record_details or ""

            # Military / police / security service (Q4 on Page 4)
            mil = wrap.find("Military")
            if mil is not None:
                mc = mil.find("Choice")
                if mc is not None:
                    mc.text = "Y" if data.military_service else "N"
                mil_details = mil.find("militaryServiceDetails")
                if mil_details is not None:
                    mil_details.text = data.military_service_details or ""

            # Political party that advocated violence (Q5 on Page 4)
            pol = wrap.find("Occupation")
            if pol is not None:
                pc = pol.find("Choice")
                if pc is not None:
                    pc.text = "Y" if data.political_party else "N"

            # War crimes / ill-treatment of prisoners / desecration (Q6 on Page 4)
            gov = wrap.find("GovPosition")
            if gov is not None:
                gc = gov.find("Choice")
                if gc is not None:
                    gc.text = "Y" if data.war_crimes else "N"

        # Consent (Consent0)
        consent = page4.find("Consent0")
        if consent is not None:
            cc = consent.find("Choice")
            if cc is not None:
                cc.text = "Y" if data.consent_to_contact else "N"

        # Applicant signature + date (bottom of Page 4)
        sig_el = page4.find("TextField2")
        if sig_el is not None:
            sig_el.text = data.applicant_signature or ""
        date_el = page4.find("C1CertificateIssueDate")
        if date_el is not None:
            date_el.text = data.applicant_signature_date or ""

    # ---- Serialize back to string ----
    ET.register_namespace("xfa", XFA_NS)
    return ET.tostring(root, encoding="unicode", xml_declaration=False)


def _is_na_phone(country_code: str, number: str = "") -> bool:
    """Heuristic: a phone is North American when the country code is 1 (or blank)."""
    cc = (country_code or "").lstrip("+").strip()
    if cc in ("1", ""):
        return True
    return False


def _patch_phone_visibility(template_xml: str, data: "StudyPermitData") -> str:
    """Flip NANumber/IntlNumber default presence per phone.

    The IMM 1294 template marks the NA-digit-breakdown subform invisible by
    default; only the CanadaUS checkbox's click handler flips it visible at
    runtime. Pre-filled PDFs never trigger that handler, so the digits stay
    hidden. Patch the template so each Phone/AltPhone/Fax block defaults to
    the layout that matches its data — NA shows NANumber + hides IntlNumber,
    international does the opposite.
    """
    primary_na = _is_na_phone(
        data.contact.primary_phone_country_code or "",
        data.contact.phone or "",
    )
    alt_na = (
        data.contact.has_alt_phone
        and data.contact.alt_phone is not None
        and _is_na_phone(data.contact.alt_phone.country_code, data.contact.alt_phone.number)
    )
    fax_na = (
        data.contact.has_fax
        and data.contact.fax is not None
        and _is_na_phone(data.contact.fax.country_code, data.contact.fax.number)
    )

    # NANumber subforms by their (unique) x/y coordinates
    na_coords = [
        ("49.53mm", "9.029mm", primary_na),   # Phone
        ("48.26mm", "9.466mm", alt_na),       # AltPhone
        ("49.53mm", "5.666mm", fax_na),       # Fax
    ]
    intl_coords = [
        ("35.56mm", "8.972mm", primary_na),   # Phone
        ("34.29mm", "8.89mm", alt_na),        # AltPhone
        ("35.56mm", "5.09mm", fax_na),        # Fax
    ]

    for x, y, is_na in na_coords:
        old = f'<subform presence="invisible" minH="10.313mm" name="NANumber" w="50.8mm" x="{x}" y="{y}"'
        new = (
            f'<subform minH="10.313mm" name="NANumber" w="50.8mm" x="{x}" y="{y}"'
            if is_na
            else old
        )
        template_xml = template_xml.replace(old, new, 1)

    for x, y, is_na in intl_coords:
        old = f'<subform minH="10.16mm" name="IntlNumber" w="53.34mm" x="{x}" y="{y}"'
        new = (
            f'<subform presence="invisible" minH="10.16mm" name="IntlNumber" w="53.34mm" x="{x}" y="{y}"'
            if is_na
            else old
        )
        template_xml = template_xml.replace(old, new, 1)

    return template_xml


def _prov_label_lic(country: str, abbrev: str) -> tuple[str, str]:
    """Return (display_label, lic_code) for a province/state abbreviation.

    Returns ("", "") for empty input or non-CA/US countries — the ProvState
    field is only relevant for Canada and USA per IRCC form design."""
    if not abbrev:
        return ("", "")
    lic = _province_lic(country, abbrev)
    return (abbrev.upper(), lic) if lic else ("", "")


def _patch_prov_state_items(
    template_xml: str,
    prov_data: list[tuple[str, str]],
) -> str:
    """Pre-populate the 4 ProvState choiceList fields with exactly one item each.

    The ProvState dropdowns are normally populated at runtime by the JS handler
    setProvinceBasedOnCountry, which never fires in a pre-filled PDF.  Instead of
    converting the widget type, we inject the correct label/lic pair directly into
    the template's empty <items> lists so the choiceList can display without JS.

    prov_data: [(label, lic_code), ...] for fields in template order —
        index 0 = Edu_Row1, 1 = OccupationRow1, 2 = OccupationRow2, 3 = OccupationRow3.
        Use ("", "") for rows with no province/state to leave the field blank."""
    counter = [0]

    def _patch(m: re.Match) -> str:
        idx = counter[0]
        counter[0] += 1
        block = m.group(0)
        label, lic = prov_data[idx] if idx < len(prov_data) else ("", "")
        block = re.sub(r"<bindItems[^\n]*\n/>", "", block)
        if label and lic:
            block = block.replace(
                "<items\n/>",
                f"<items\n><text\n>{label}</text\n></items\n>",
                1,
            )
            block = block.replace(
                '<items presence="hidden" save="1"\n/>',
                f'<items presence="hidden" save="1"\n><text\n>{lic}</text\n></items\n>',
                1,
            )
        return block

    return re.sub(
        r'<field[^>]*name="ProvState"[^>]*\n>[\s\S]*?</field\n>',
        _patch,
        template_xml,
    )


def fill_pdf(data: "StudyPermitData") -> bytes:
    if not os.path.exists(TEMPLATE):
        raise FileNotFoundError(f"IMM 1294 template not found: {TEMPLATE}")
    if not os.path.exists(UNENC):
        raise FileNotFoundError(f"IMM 1294 unencrypted copy not found: {UNENC}")

    xml_str = _build_datasets_xml(data)
    edu = data.education_history
    occ = data.occupation_history
    prov_data = [
        _prov_label_lic(edu[0].country, edu[0].province_state) if edu else ("", ""),
        _prov_label_lic(occ[0].country, occ[0].province_state) if len(occ) > 0 else ("", ""),
        _prov_label_lic(occ[1].country, occ[1].province_state) if len(occ) > 1 else ("", ""),
        _prov_label_lic(occ[2].country, occ[2].province_state) if len(occ) > 2 else ("", ""),
    ]
    return fill_xfa_pdf(
        TEMPLATE,
        xml_str,
        template_xml_transform=lambda xml: _patch_prov_state_items(
            _patch_phone_visibility(xml, data), prov_data
        ),
    )
