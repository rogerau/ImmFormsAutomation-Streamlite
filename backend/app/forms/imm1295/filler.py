"""IMM 1295 — Application for Work Permit Made Outside of Canada (XFA-based filler).

Page1/Page2 field paths are structurally identical to IMM 1294 (confirmed by
diffing both forms' datasets XML) — see `_xfa_application_common.py` for the
shared LOV-lookup / XML-navigation helpers. Page3 diverges: IMM 1294 has
DetailsOfStudy, IMM 1295 has DetailsOfIntendedWork + IntendedLocationInCanada +
DetailsOfWorkCont + LCP. `imm1294/filler.py` is not touched by this file.
"""
from __future__ import annotations

import os
import zlib
from typing import TYPE_CHECKING
from xml.etree import ElementTree as ET

from .. import _xfa_application_common as common
from ..xfa_filler import fill_xfa_pdf

if TYPE_CHECKING:
    from .schema import Imm1295Data

TEMPLATE = os.path.join(os.path.dirname(__file__), "template", "imm1295e.pdf")
UNENC = os.path.join(os.path.dirname(__file__), "template", "imm1295e_unenc.pdf")

XFA_NS = common.XFA_NS


def _build_datasets_xml(data: "Imm1295Data") -> str:
    raw = common.get_raw_datasets(UNENC)
    xml_str = zlib.decompress(raw).decode("utf-8", errors="replace")

    ET.register_namespace("xfa", XFA_NS)
    root = ET.fromstring(xml_str)
    xfa_data = root.find(f"{{{XFA_NS}}}data")
    if xfa_data is None:
        raise ValueError("xfa:data element not found in datasets")
    form1 = xfa_data.find("form1")
    if form1 is None:
        raise ValueError("form1 element not found in xfa:data")

    # ---- Page 1 — Personal Details ----
    page1 = form1.find("Page1")
    if page1 is not None:
        pd = page1.find("PersonalDetails")
        if pd is not None:
            uci_el = pd.find("UCIClientID")
            if uci_el is not None:
                uci_el.text = data.uci or ""
            service_in_el = common.find(pd, "ServiceIn", "ServiceIn")
            if service_in_el is not None:
                service_in_el.text = data.service_in or "English"
            common.set_path(pd, "Name", "FamilyName", data.family_name)
            common.set_path(pd, "Name", "GivenName", data.given_name)
            if data.alias_family_name:
                common.set_path(pd, "AliasName", "AliasFamilyName", data.alias_family_name)
                common.set_path(pd, "AliasName", "AliasGivenName", data.alias_given_name)
                alias_ind = common.find(pd, "AliasName", "AliasNameIndicator", "AliasNameIndicator")
                if alias_ind is not None:
                    alias_ind.text = "1"
            sex_el = common.find(pd, "Sex", "Sex")
            if sex_el is not None:
                sex_el.text = data.sex.value
            year, month, day = common.split_date(data.date_of_birth)
            for tag, val in [("DOBYear", year), ("DOBMonth", month), ("DOBDay", day)]:
                el = pd.find(tag)
                if el is not None:
                    el.text = val
            for tag, val in [("PlaceBirthCity", data.place_birth_city),
                              ("PlaceBirthCountry", data.place_birth_country)]:
                el = pd.find(tag)
                if el is not None:
                    el.text = val
            cit_el = common.find(pd, "Citizenship", "Citizenship")
            if cit_el is not None:
                cit_el.text = data.citizenship

            if data.current_residence:
                common.fill_residence_row(
                    common.find(pd, "CurrentCOR", "Row2"),
                    data.current_residence,
                    pd.find("CORDates"),
                )
            else:
                cor_el = common.find(pd, "CurrentCOR", "Row2", "Country")
                if cor_el is not None:
                    cor_el.text = data.current_country

            pcr_ind = pd.find("PCRIndicator")
            if pcr_ind is not None:
                pcr_ind.text = "Y" if data.has_previous_residence else "N"
            if data.has_previous_residence and data.previous_residences:
                pcr = pd.find("PreviousCOR")
                rows_dates = [
                    (pcr.find("Row2") if pcr is not None else None, pd.find("PCRDatesR1")),
                    (pcr.find("Row3") if pcr is not None else None, pd.find("PCRDatesR2")),
                ]
                for (row_el, dates_el), residence in zip(rows_dates, data.previous_residences[:2]):
                    common.fill_residence_row(row_el, residence, dates_el)

            same_ind = pd.find("SameAsCORIndicator")
            if same_ind is not None:
                same_ind.text = "Y" if data.applying_country_same_as_current else "N"
            if not data.applying_country_same_as_current and data.applying_country:
                common.fill_residence_row(
                    common.find(pd, "CountryWhereApplying", "Row2"),
                    data.applying_country,
                    pd.find("CWADates"),
                )

        ms_section = common.find(page1, "MaritalStatus", "SectionA")
        if ms_section is not None:
            ms_el = ms_section.find("MaritalStatus")
            if ms_el is not None:
                ms_el.text = data.marital_status
            if data.spouse_family_name and data.marriage_date:
                md_el = ms_section.find("DateOfMarriage")
                if md_el is not None:
                    md_el.text = data.marriage_date
                my, mm, mdy = common.split_date(data.marriage_date)
                md_parts = ms_section.find("MarriageDate")
                if md_parts is not None:
                    for tag, val in [("FromYr", my), ("FromMM", mm), ("FromDD", mdy)]:
                        el = md_parts.find(tag)
                        if el is not None:
                            el.text = val
                fn_el = ms_section.find("FamilyName")
                if fn_el is not None:
                    fn_el.text = data.spouse_family_name
                gn_el = ms_section.find("GivenName")
                if gn_el is not None:
                    gn_el.text = data.spouse_given_name

    # ---- Page 2 — Marital history, Passport, natID, USCard, Contact ----
    page2 = form1.find("Page2")
    if page2 is not None:
        native_lang = common.find(page2, "MaritalStatus", "SectionA", "Languages", "languages", "nativeLang", "nativeLang")
        if native_lang is not None:
            native_lang.text = data.language.value
        comm_lang = common.find(page2, "MaritalStatus", "SectionA", "Languages", "languages", "ableToCommunicate", "ableToCommunicate")
        if comm_lang is not None:
            comm_lang.text = data.language.value
        most_at_ease = common.find(page2, "MaritalStatus", "SectionA", "Languages", "languages", "lov")
        if most_at_ease is not None:
            most_at_ease.text = (data.language_most_at_ease.value if data.language_most_at_ease else data.language.value)
        lang_test_el = common.find(page2, "MaritalStatus", "SectionA", "Languages", "LanguageTest")
        if lang_test_el is not None:
            lang_test_el.text = "Y" if data.taken_language_test else "N"

        ms2 = common.find(page2, "MaritalStatus", "SectionA")
        if ms2 is not None:
            pm_ind = ms2.find("PrevMarriedIndicator")
            if pm_ind is not None:
                pm_ind.text = "Y" if data.previously_married else "N"
            if data.previously_married:
                pmf = ms2.find("PMFamilyName")
                if pmf is not None:
                    pmf.text = data.prev_spouse_family_name
                pmg = common.find(ms2, "GivenName", "PMGivenName")
                if pmg is not None:
                    pmg.text = data.prev_spouse_given_name
                psdob = ms2.find("PrevSpouseDOB")
                if psdob is not None:
                    psy, psm, psd = common.split_date(data.prev_spouse_date_of_birth)
                    for tag, val in [("DOBYear", psy), ("DOBMonth", psm), ("DOBDay", psd)]:
                        el = psdob.find(tag)
                        if el is not None:
                            el.text = val
                tor = ms2.find("TypeOfRelationship")
                if tor is not None:
                    tor.text = data.prev_relationship_type
                fd = ms2.find("FromDate")
                if fd is not None:
                    fd.text = data.prev_relationship_from
                td = common.find(ms2, "ToDate", "ToDate")
                if td is not None:
                    td.text = data.prev_relationship_to
                pmd = ms2.find("PreviouslyMarriedDates")
                if pmd is not None:
                    fy, fm, fdy = common.split_date(data.prev_relationship_from)
                    ty, tm, tdy = common.split_date(data.prev_relationship_to)
                    for tag, val in [
                        ("FromYr", fy), ("FromMM", fm), ("FromDD", fdy),
                        ("ToYr", ty), ("ToMM", tm), ("ToDD", tdy),
                    ]:
                        el = pmd.find(tag)
                        if el is not None:
                            el.text = val

        p = data.passport
        pp = common.find(page2, "MaritalStatus", "SectionA", "Passport")
        if pp is not None:
            tw = pp.find("TaiwanPIN")
            if tw is not None:
                tw.text = "Y" if data.taiwan_passport else "N"
            isr = pp.find("IsraelPassportIndicator")
            if isr is not None:
                isr.text = "Y" if data.israel_passport_not_valid else "N"
            iy, im, iday = common.split_date(p.issue_date)
            ey, em, eday = common.split_date(p.expiry_date)
            for field_path, val in [
                (("PassportNum", "PassportNum"), p.passport_number),
                (("CountryofIssue", "CountryofIssue"), p.country_of_issue),
                (("IssueDate", "IssueDate"), p.issue_date),
                (("ExpiryDate",), p.expiry_date),
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

        nat_id = data.national_id
        nat_id_el = page2.find("natID")
        if nat_id_el is not None:
            ind = common.find(nat_id_el, "q1", "natIDIndicator")
            if ind is not None:
                ind.text = "Y" if nat_id.has_document else "N"
            if nat_id.has_document:
                docs = nat_id_el.find("natIDdocs")
                if docs is not None:
                    dn = common.find(docs, "DocNum", "DocNum")
                    if dn is not None:
                        dn.text = nat_id.doc_number
                    coi = common.find(docs, "CountryofIssue", "CountryofIssue")
                    if coi is not None:
                        coi.text = nat_id.country_of_issue
                    isd = common.find(docs, "IssueDate", "IssueDate")
                    if isd is not None:
                        isd.text = nat_id.issue_date
                    exp = docs.find("ExpiryDate")
                    if exp is not None:
                        exp.text = nat_id.expiry_date

        us = data.us_pr_card
        us_card_el = page2.find("USCard")
        if us_card_el is not None:
            ind = common.find(us_card_el, "q1", "usCardIndicator")
            if ind is not None:
                ind.text = "Y" if us.has_card else "N"
            if us.has_card:
                docs = us_card_el.find("usCarddocs")
                if docs is not None:
                    dn = common.find(docs, "DocNum", "DocNum")
                    if dn is not None:
                        dn.text = us.doc_number
                    exp = docs.find("ExpiryDate")
                    if exp is not None:
                        exp.text = us.expiry_date

        # Contact — nested under Page2/ContactInformation/contact (differs from
        # IMM 1294, which has `contact` directly under Page2).
        ci = page2.find("ContactInformation")
        contact = ci.find("contact") if ci is not None else None
        if contact is not None:
            addr = data.mailing_address
            postal = common.normalize_postal(addr.postal_code, addr.country)
            for tag, val in [
                ("AddressRow1/StreetNum/StreetNum", addr.street_number),
                ("AddressRow1/Streetname/Streetname", addr.street_name),
                ("AddressRow1/Apt/AptUnit", addr.unit),
                ("AddressRow2/CityTow/CityTown", addr.city),
                ("AddressRow2/Country/Country", common.country_lic(addr.country)),
                ("AddressRow2/ProvinceState/ProvinceState", common.province_lic(addr.country, addr.province_state)),
                ("AddressRow2/PostalCode/PostalCode", postal),
                ("AddressRow2/District", addr.district or ""),
            ]:
                el = contact.find(tag)
                if el is not None:
                    el.text = val

            same_mail = contact.find("SameAsMailingIndicator")
            if same_mail is not None:
                same_mail.text = "Y" if data.residential_address_same_as_mailing else "N"
            res = data.residential_address
            if not data.residential_address_same_as_mailing and res is not None:
                res_postal = common.normalize_postal(res.postal_code, res.country)
                for tag, val in [
                    ("ResidentialAddressRow1/AptUnit/AptUnit", res.unit),
                    ("ResidentialAddressRow1/StreetNum/StreetNum", res.street_number),
                    ("ResidentialAddressRow1/StreetName/Streetname", res.street_name),
                    ("ResidentialAddressRow1/CityTown/CityTown", res.city),
                    ("ResidentialAddressRow2/Country/Country", common.country_lic(res.country)),
                    ("ResidentialAddressRow2/ProvinceState/ProvinceState", common.province_lic(res.country, res.province_state)),
                    ("ResidentialAddressRow2/PostalCode/PostalCode", res_postal),
                    ("ResidentialAddressRow2/District", res.district or ""),
                ]:
                    el = contact.find(tag)
                    if el is not None:
                        el.text = val

            # Primary/alt phone live inside contact/PhoneNumbers on this form.
            phones = contact.find("PhoneNumbers")
            if phones is not None:
                common.fill_phone(
                    phones.find("Phone"), data.phone, data.primary_phone_type,
                    data.primary_phone_country_code, data.primary_phone_ext,
                )
                if data.has_alt_phone and data.alt_phone is not None:
                    alt = data.alt_phone
                    common.fill_phone(phones.find("AltPhone"), alt.number, alt.phone_type, alt.country_code, alt.ext)

    # ---- Page 3 — Fax/Email, Intended Work, Education, Occupation ----
    page3 = form1.find("Page3")
    if page3 is not None:
        if data.has_fax and data.fax is not None:
            fax = data.fax
            common.fill_phone(common.find(page3, "FaxEmail", "Phone"), fax.number, "", fax.country_code, fax.ext)
        email_el = common.find(page3, "FaxEmail", "Email")
        if email_el is not None:
            email_el.text = data.email

        w = data.work
        diw = page3.find("DetailsOfIntendedWork")
        if diw is not None:
            dow = diw.find("DetailsOfWork")
            if dow is not None:
                wpt = common.find(dow, "TypeofWork", "WorkPermitType")
                if wpt is not None:
                    wpt.text = w.work_permit_type
                en = common.find(dow, "PurposeRow1", "EmployerName", "EmployerName")
                if en is not None:
                    en.text = w.employer_name
                ea = common.find(dow, "PurposeRow1", "Address", "Address")
                if ea is not None:
                    ea.text = w.employer_address

        ilc = common.find(page3, "IntendedLocationInCanada", "intendedLocation")
        if ilc is not None:
            prov_abbr = common.province_abbrev("Canada", w.intended_province_state)
            common.set_path(ilc, "ProvinceState", "ProvinceState", common.PROVINCE_LIC.get(prov_abbr, ""))
            common.set_path(ilc, "CityTown", "CityTown", w.intended_city_town)
            addr_el = ilc.find("Address")
            if addr_el is not None:
                addr_el.text = w.intended_address

        dwc = common.find(page3, "DetailsOfWorkCont", "details")
        if dwc is not None:
            jt = dwc.find("jobTitle")
            if jt is not None:
                jt.text = w.job_title
            pdesc = dwc.find("posDesc")
            if pdesc is not None:
                pdesc.text = w.position_description
            from_el = common.find(dwc, "HowLongStudy", "FromDate")
            if from_el is not None:
                from_el.text = w.how_long_from
            to_el = common.find(dwc, "HowLongStudy", "ToDate")
            if to_el is not None:
                to_el.text = w.how_long_to
            lmo = common.find(dwc, "LMO", "LMO")
            if lmo is not None:
                lmo.text = w.lmia_number

        lcp = page3.find("LCP")
        if lcp is not None:
            caregiver = lcp.find("Caregiver")
            if caregiver is not None:
                for tag, val in [
                    ("ChildCare", "1" if w.lcp_child_care else "0"),
                    ("Disabled", "1" if w.lcp_disabled else "0"),
                    ("Elderly", "1" if w.lcp_elderly else "0"),
                    ("Other", "1" if w.lcp_other else "0"),
                ]:
                    el = caregiver.find(tag)
                    if el is not None:
                        el.text = val
                np = common.find(caregiver, "personsCare", "noPersons")
                if np is not None:
                    np.text = w.lcp_persons_care

        wrap = page3.find("PageWrapper")
        if wrap is not None:
            edu_section = wrap.find("Education")
            if edu_section is not None:
                edu_ind = edu_section.find("EducationIndicator")
                if edu_ind is not None:
                    edu_ind.text = "Y" if data.education_history else "N"
                if data.education_history:
                    e = sorted(data.education_history, key=common.history_sort_key)[-1]  # most recent
                    edu_row = edu_section.find("Edu_Row1")
                    if edu_row is not None:
                        for tag, val in [
                            ("FromYear", e.from_year), ("FromMonth", e.from_month),
                            ("ToYear", e.to_year), ("ToMonth", e.to_month),
                            ("FieldOfStudy", e.field_of_study), ("School", e.school),
                            ("CityTown", e.city),
                            ("ProvState", common.province_lic(e.country, e.province_state)),
                        ]:
                            el = edu_row.find(tag)
                            if el is not None:
                                el.text = val
                        country_el = common.find(edu_row, "Country", "Country")
                        if country_el is not None:
                            country_el.text = common.country_lic(e.country)

            occ_section = wrap.find("Occupation")
            occ_reversed = sorted(data.occupation_history, key=common.history_sort_key, reverse=True)
            if occ_section is not None:
                for idx, row_tag in enumerate(["OccupationRow1", "OccupationRow2", "OccupationRow3"]):
                    if idx >= len(occ_reversed):
                        break
                    o = occ_reversed[idx]
                    occ_row = occ_section.find(row_tag)
                    if occ_row is not None:
                        for tag, val in [
                            ("FromYear", o.from_year), ("FromMonth", o.from_month),
                            ("ToYear", o.to_year), ("ToMonth", o.to_month),
                            ("Employer", o.employer),
                            ("ProvState", common.province_lic(o.country, o.province_state)),
                        ]:
                            el = occ_row.find(tag)
                            if el is not None:
                                el.text = val
                        occ_el = common.find(occ_row, "Occupation", "Occupation")
                        if occ_el is not None:
                            occ_el.text = o.occupation
                        city_el = common.find(occ_row, "CityTown", "CityTown")
                        if city_el is not None:
                            city_el.text = o.city
                        country_el = common.find(occ_row, "Country", "Country")
                        if country_el is not None:
                            country_el.text = common.country_lic(o.country)

    # ---- Page 4 — Background Questions, Consent, Signature ----
    page4 = form1.find("Page4")
    if page4 is not None:
        bg1 = page4.find("BackgroundInfo")
        if bg1 is not None:
            choices = bg1.findall("Choice")
            if len(choices) >= 1:
                choices[0].text = "Y" if data.tuberculosis else "N"
            if len(choices) >= 2:
                choices[1].text = "Y" if data.medical_condition else "N"
            details_el = common.find(bg1, "Details", "MedicalDetails")
            if details_el is not None:
                details_el.text = data.medical_condition_details or ""

        wrap = page4.find("PageWrapper")
        if wrap is not None:
            bg2 = wrap.find("BackgroundInfo2")
            if bg2 is not None:
                vc1 = bg2.find("VisaChoice1")
                if vc1 is not None:
                    vc1.text = "Y" if data.previously_remained_status else "N"
                vc2 = bg2.find("VisaChoice2")
                if vc2 is not None:
                    vc2.text = "Y" if data.previously_applied_canada else "N"
                vc3 = bg2.find("VisaChoice3")
                if vc3 is not None:
                    vc3.text = "Y" if data.previously_refused_visa else "N"
                ref_details = common.find(bg2, "Details", "refusedDetails")
                if ref_details is not None:
                    ref_details.text = data.previously_refused_visa_details or ""

            bg3 = wrap.find("BackgroundInfo3")
            if bg3 is not None:
                cc = bg3.find("Choice")
                if cc is not None:
                    cc.text = "Y" if data.criminal_record else "N"
                cd = bg3.find("militaryServiceDetails")
                if cd is not None:
                    cd.text = data.criminal_record_details or ""

            mil = wrap.find("Military")
            if mil is not None:
                mc = mil.find("Choice")
                if mc is not None:
                    mc.text = "Y" if data.military_service else "N"
                mil_details = mil.find("militaryServiceDetails")
                if mil_details is not None:
                    mil_details.text = data.military_service_details or ""

            pol = wrap.find("Occupation")
            if pol is not None:
                pc = pol.find("Choice")
                if pc is not None:
                    pc.text = "Y" if data.political_party else "N"

            gov = wrap.find("GovPosition")
            if gov is not None:
                gc = gov.find("Choice")
                if gc is not None:
                    gc.text = "Y" if data.war_crimes else "N"

        # Consent + signature/date live inside Consent0 on this form (differs
        # from IMM 1294, where signature/date are direct Page4 children).
        consent = page4.find("Consent0")
        if consent is not None:
            cc = consent.find("Choice")
            if cc is not None:
                cc.text = "Y" if data.consent_to_contact else "N"
            sig_el = consent.find("TextField2")
            if sig_el is not None:
                sig_el.text = data.applicant_signature or ""
            date_el = consent.find("C1CertificateIssueDate")
            if date_el is not None:
                date_el.text = data.applicant_signature_date or ""

    ET.register_namespace("xfa", XFA_NS)
    return ET.tostring(root, encoding="unicode", xml_declaration=False)


def fill_pdf(data: "Imm1295Data") -> bytes:
    if not os.path.exists(TEMPLATE):
        raise FileNotFoundError(f"IMM 1295 template not found: {TEMPLATE}")
    if not os.path.exists(UNENC):
        raise FileNotFoundError(f"IMM 1295 unencrypted copy not found: {UNENC}")

    xml_str = _build_datasets_xml(data)
    return fill_xfa_pdf(TEMPLATE, xml_str)
