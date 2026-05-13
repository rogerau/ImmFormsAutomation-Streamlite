"""IMM 1294 — Application for Study Permit (XFA-based filler).

Strategy: the datasets XML is ~500KB because it contains LOV lookup tables.
We read the datasets from the unencrypted template, parse just the <form1> data
section, replace field values in-place using ElementTree, then serialize and inject.
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

TEMPLATE = os.path.join(os.path.dirname(__file__), "template", "imm1294e.pdf")
UNENC = os.path.join(os.path.dirname(__file__), "template", "imm1294e_unenc.pdf")

XFA_NS = "http://www.xfa.org/schema/xfa-data/1.0/"


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
            # Current country of residence
            cor_el = _find(pd, "CurrentCOR", "Row2", "Country")
            if cor_el is not None:
                cor_el.text = d.current_country
        # Marital status
        ms_el = _find(page1, "MaritalStatus", "SectionA", "MaritalStatus")
        if ms_el is not None:
            ms_el.text = d.marital_status

    # ---- Page 2 — Passport + Contact ----
    page2 = form1.find("Page2")
    if page2 is not None:
        # Language
        lang_el = _find(page2, "MaritalStatus", "SectionA", "Languages", "languages", "ableToCommunicate", "ableToCommunicate")
        if lang_el is not None:
            lang_el.text = d.language.value
        native_lang = _find(page2, "MaritalStatus", "SectionA", "Languages", "languages", "nativeLang", "nativeLang")
        if native_lang is not None:
            native_lang.text = d.language.value

        # Passport
        pp = _find(page2, "MaritalStatus", "SectionA", "Passport")
        if pp is not None:
            issue_parts = p.issue_date.split("-") if p.issue_date else ["", "", ""]
            exp_parts = p.expiry_date.split("-") if p.expiry_date else ["", "", ""]
            iy, im, iday = (issue_parts + ["", "", ""])[:3]
            ey, em, eday = (exp_parts + ["", "", ""])[:3]
            for field_path, val in [
                (("PassportNum", "PassportNum"), p.passport_number),
                (("CountryofIssue", "CountryofIssue"), p.country_of_issue),
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

        # Contact — mailing address
        contact = page2.find("contact")
        if contact is not None:
            addr = data.contact.mailing_address
            postal = _normalize_postal(addr.postal_code, addr.country)
            for tag, val in [
                ("AddressRow1/StreetNum/StreetNum", addr.street_number),
                ("AddressRow1/Streetname/Streetname", addr.street_name),
                ("AddressRow1/Apt/AptUnit", addr.unit),
                ("AddressRow2/CityTow/CityTown", addr.city),
                ("AddressRow2/Country/Country", addr.country),
                ("AddressRow2/ProvinceState/ProvinceState", addr.province_state),
                ("AddressRow2/PostalCode/PostalCode", postal),
            ]:
                el = contact.find(tag)
                if el is not None:
                    el.text = val

    # ---- Page 3 — Phone, Study Details, Education, Occupation ----
    page3 = form1.find("Page3")
    if page3 is not None:
        # Phone
        phone_el = _find(page3, "PhoneNumbers", "Phone", "ActualNumber")
        if phone_el is not None:
            phone_el.text = data.contact.phone
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
                _set_path(row, "ProvinceState", "Prov", study.province_state)
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

        # Education history (first entry)
        edu_section = page3.find("Education")
        if edu_section is not None and data.education_history:
            e = data.education_history[0]
            edu_row = edu_section.find("Edu_Row1")
            if edu_row is not None:
                for tag, val in [
                    ("FromYear", e.from_year), ("FromMonth", e.from_month),
                    ("ToYear", e.to_year), ("ToMonth", e.to_month),
                    ("FieldOfStudy", e.field_of_study), ("School", e.school),
                    ("CityTown", e.city), ("ProvState", e.province_state),
                ]:
                    el = edu_row.find(tag)
                    if el is not None:
                        el.text = val
                country_el = _find(edu_row, "Country", "Country")
                if country_el is not None:
                    country_el.text = e.country

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
                        ("Employer", o.employer), ("ProvState", o.province_state),
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
                        country_el.text = o.country

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
            # Visa-refusal block (BackgroundInfo2): VisaChoice1/2/3 = three Y/N
            # sub-questions; refusedDetails = combined textbox.
            bg2 = wrap.find("BackgroundInfo2")
            if bg2 is not None:
                vc1 = bg2.find("VisaChoice1")  # overstay/unauthorized work
                if vc1 is not None:
                    vc1.text = "Y" if data.previously_refused_visa else "N"
                vc2 = bg2.find("VisaChoice2")  # previously applied
                if vc2 is not None:
                    vc2.text = "Y" if data.previously_refused_visa else "N"
                vc3 = bg2.find("VisaChoice3")  # been refused
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

    # ---- Serialize back to string ----
    ET.register_namespace("xfa", XFA_NS)
    return ET.tostring(root, encoding="unicode", xml_declaration=False)


def fill_pdf(data: "StudyPermitData") -> bytes:
    if not os.path.exists(TEMPLATE):
        raise FileNotFoundError(f"IMM 1294 template not found: {TEMPLATE}")
    if not os.path.exists(UNENC):
        raise FileNotFoundError(f"IMM 1294 unencrypted copy not found: {UNENC}")

    xml_str = _build_datasets_xml(data)
    return fill_xfa_pdf(TEMPLATE, xml_str)
