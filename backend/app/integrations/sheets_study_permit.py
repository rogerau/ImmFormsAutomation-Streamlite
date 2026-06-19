"""Row builders for the study permit Google Sheets tabs."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from ..forms.study_permit.schema import StudyPermitData


def new_submission_id() -> str:
    return str(uuid.uuid4())


# ---------------------------------------------------------------------------
# Submissions tab (main row — one per submission)
# ---------------------------------------------------------------------------

SUBMISSIONS_HEADERS = [
    "submission_id", "timestamp", "case_id", "tenant_id", "form_type", "optional_forms",
    # Applicant identity
    "uci",
    "family_name", "given_name", "native_name", "alias_family_name", "alias_given_name",
    "sex", "date_of_birth", "place_birth_city", "place_birth_country",
    "citizenship", "current_country", "marital_status", "applicant_occupation", "language", "service_in",
    # Passport
    "passport_number", "passport_country_of_issue", "passport_issue_date", "passport_expiry_date",
    # National Identity Document
    "has_national_id", "nat_id_doc_number", "nat_id_country_of_issue",
    "nat_id_issue_date", "nat_id_expiry_date",
    # U.S. Permanent Resident Card
    "has_us_pr_card", "us_pr_doc_number", "us_pr_expiry_date",
    # Contact
    "address_unit", "address_street_number", "address_street_name",
    "address_city", "address_country", "address_province_state", "address_postal_code",
    "phone", "email",
    # Study details
    "school_name", "study_level", "study_program",
    "school_city", "school_province_state", "school_address",
    "dli_number", "student_number", "study_start_date", "study_end_date",
    # Cost of studies
    "tuition_amount", "room_board_amount", "other_amount", "funds_available",
    "expenses_paid_by", "expenses_paid_by_other",
    # PAL / TAL
    "pal_doc_number", "pal_doc_expiry",
    # Quebec CAQ
    "caq_cert_number", "caq_cert_expiry",
    # Spouse
    "spouse_family_name", "spouse_given_names", "spouse_dob", "spouse_country_of_birth",
    "spouse_marital_status", "spouse_address", "spouse_occupation", "spouse_accompanies",
    "no_spouse_signature", "no_spouse_date",
    # Father
    "father_family_name", "father_given_names", "father_dob", "father_country_of_birth",
    "father_status", "father_address", "father_occupation",
    # Mother
    "mother_family_name", "mother_given_names", "mother_dob", "mother_country_of_birth",
    "mother_status", "mother_address", "mother_occupation",
    # Children/siblings flags
    "has_children", "no_children_signature", "no_children_date",
    # Declarations
    "section_c_signature", "section_c_date",
    "applicant_signature", "applicant_signature_date",
    # Background — IMM 1294 Page 4
    "tuberculosis",
    "medical_condition", "medical_condition_details",
    "previously_remained_status", "previously_applied_canada",
    "previously_refused_visa", "previously_refused_visa_details",
    "criminal_record", "criminal_record_details",
    "military_service", "military_service_details",
    "political_party", "war_crimes",
    "consent_to_contact",
    # Phase B additions — IMM 1294 full coverage
    "language_most_at_ease", "taken_language_test",
    "taiwan_passport", "israel_passport_not_valid",
    "us_pr_uscis_number",
    "current_residence_country", "current_residence_status", "current_residence_status_other",
    "current_residence_from", "current_residence_to",
    "has_previous_residence",
    "prev_residence_1_country", "prev_residence_1_status", "prev_residence_1_from", "prev_residence_1_to",
    "prev_residence_2_country", "prev_residence_2_status", "prev_residence_2_from", "prev_residence_2_to",
    "applying_country_same_as_current",
    "applying_country_country", "applying_country_status", "applying_country_from", "applying_country_to",
    "mailing_district",
    "residential_same_as_mailing",
    "residential_unit", "residential_street_number", "residential_street_name",
    "residential_city", "residential_district", "residential_country",
    "residential_province_state", "residential_postal_code",
    "primary_phone_type", "primary_phone_country_code", "primary_phone_ext",
    "has_alt_phone", "alt_phone_type", "alt_phone_country_code", "alt_phone_number", "alt_phone_ext",
    "has_fax", "fax_country_code", "fax_number", "fax_ext",
    "marriage_date",
    "has_previous_marriage",
    "prev_marriage_family_name", "prev_marriage_given_names", "prev_marriage_dob",
    "prev_marriage_type", "prev_marriage_from", "prev_marriage_to",
    "has_education_history",
    # PDFs per form
    "pdf_imm1294_id", "pdf_imm1294_url",
    "pdf_imm5707_id", "pdf_imm5707_url",
    "pdf_imm5409_id", "pdf_imm5409_url",
    "pdf_imm5646_id", "pdf_imm5646_url",
    "pdf_imm5476_id", "pdf_imm5476_url",
    "pdf_imm5475_id", "pdf_imm5475_url",
]


def submissions_row(
    data: StudyPermitData,
    tenant_id: str,
    drive_results: dict[str, dict],   # {form_id: {id, webViewLink}}
) -> list:
    pi = data.personal_info
    f = data.family
    s = f.spouse
    fa = f.father
    mo = f.mother

    def _drive(form_id: str, key: str) -> str:
        return drive_results.get(form_id, {}).get(key, "")

    nid = data.national_id
    usc = data.us_pr_card
    addr = data.contact.mailing_address
    st = data.study

    yn = lambda v: "Yes" if v else "No"

    # Mirror imm5707/filler.py's gating exactly — the PDF only ever prints
    # no_spouse_signature/no_children_signature when those declarations are
    # genuinely true. Without the same gating here, the Sheets row showed the
    # raw signature text even for applicants who do have a spouse/children,
    # which contradicted what the (correctly gated) PDF rendered.
    ms_str = f.applicant_marital_status.value if f.applicant_marital_status else ""
    married = ms_str in (
        "Married-physically present",
        "Married-not physically present",
        "Common-law",
    )
    no_children = not (f.children or []) and bool(f.no_children_signature)

    # Phase G — consolidated sources (columns kept; value source redirected in-place):
    #   marital_status     ← family.applicant_marital_status (single source for both forms)
    #   applicant_occupation ← most recent activity in occupation_history
    marital_status_val = f.applicant_marital_status.value if f.applicant_marital_status else ""
    applicant_occupation_val = (
        data.occupation_history[0].occupation if data.occupation_history else ""
    )

    return [
        data.submission_id,
        datetime.now(timezone.utc).isoformat(),
        data.case_id,
        tenant_id,
        "study_permit",
        ",".join(data.optional_forms),
        # Applicant identity
        pi.uci,
        pi.family_name, pi.given_name, pi.native_name,
        pi.alias_family_name, pi.alias_given_name,
        pi.sex.value if pi.sex else "", pi.date_of_birth,
        pi.place_birth_city, pi.place_birth_country,
        pi.citizenship, pi.current_country, marital_status_val,
        applicant_occupation_val, pi.language.value if pi.language else "",
        pi.service_in or "",
        # Passport
        data.passport.passport_number,
        data.passport.country_of_issue,
        data.passport.issue_date,
        data.passport.expiry_date,
        # National Identity Document
        yn(nid.has_document), nid.doc_number, nid.country_of_issue,
        nid.issue_date, nid.expiry_date,
        # U.S. Permanent Resident Card
        yn(usc.has_card), usc.doc_number, usc.expiry_date,
        # Contact (mailing address basics + primary phone)
        addr.unit, addr.street_number, addr.street_name,
        addr.city, addr.country, addr.province_state, addr.postal_code,
        data.contact.phone, data.contact.email,
        # Phase B values added below at end-of-row (matches header order)
        # Study
        st.school_name, st.level, st.program,
        st.city, st.province_state, st.address,
        st.dli_number, st.student_number, st.start_date, st.end_date,
        # Cost of studies
        st.tuition_amount, st.room_board_amount, st.other_amount, st.funds_available,
        st.expenses_paid_by, st.expenses_paid_by_other,
        # PAL / TAL
        st.pal_doc_number, st.pal_doc_expiry,
        # Quebec CAQ
        st.caq_cert_number, st.caq_cert_expiry,
        # Spouse
        s.family_name if s else "", s.given_names if s else "",
        s.date_of_birth if s else "", s.country_of_birth if s else "",
        (s.marital_status.value if s.marital_status else "") if s else "",
        s.address if s else "", s.occupation if s else "",
        ("Yes" if s.will_accompany else "No") if s else "",
        f.no_spouse_signature if not (s and married) else "",
        f.no_spouse_date if not (s and married) else "",
        # Father
        fa.family_name, fa.given_names, fa.date_of_birth, fa.country_of_birth,
        fa.status.value if fa.status else "Living", fa.address, fa.occupation,
        # Mother
        mo.family_name, mo.given_names, mo.date_of_birth, mo.country_of_birth,
        mo.status.value if mo.status else "Living", mo.address, mo.occupation,
        # Children flags
        yn(bool(f.children)),
        f.no_children_signature if no_children else "",
        f.no_children_date if no_children else "",
        # Declarations
        f.section_c_signature, f.section_c_date,
        data.applicant_signature, data.applicant_signature_date,
        # Background — IMM 1294 Page 4
        yn(data.tuberculosis),
        yn(data.medical_condition), data.medical_condition_details,
        yn(data.previously_remained_status), yn(data.previously_applied_canada),
        yn(data.previously_refused_visa), data.previously_refused_visa_details,
        yn(data.criminal_record), data.criminal_record_details,
        yn(data.military_service), data.military_service_details,
        yn(data.political_party), yn(data.war_crimes),
        yn(data.consent_to_contact),
        # Phase B additions — IMM 1294 full coverage
        (pi.language_most_at_ease.value if pi.language_most_at_ease else ""),
        yn(pi.taken_language_test),
        yn(pi.taiwan_passport), yn(pi.israel_passport_not_valid),
        usc.uscis_number or "",
        (pi.current_residence.country if pi.current_residence else ""),
        (pi.current_residence.status if pi.current_residence else ""),
        (pi.current_residence.status_other if pi.current_residence else ""),
        (pi.current_residence.from_date if pi.current_residence else ""),
        (pi.current_residence.to_date if pi.current_residence else ""),
        yn(pi.has_previous_residence),
        (pi.previous_residences[0].country if len(pi.previous_residences) > 0 else ""),
        (pi.previous_residences[0].status if len(pi.previous_residences) > 0 else ""),
        (pi.previous_residences[0].from_date if len(pi.previous_residences) > 0 else ""),
        (pi.previous_residences[0].to_date if len(pi.previous_residences) > 0 else ""),
        (pi.previous_residences[1].country if len(pi.previous_residences) > 1 else ""),
        (pi.previous_residences[1].status if len(pi.previous_residences) > 1 else ""),
        (pi.previous_residences[1].from_date if len(pi.previous_residences) > 1 else ""),
        (pi.previous_residences[1].to_date if len(pi.previous_residences) > 1 else ""),
        yn(pi.applying_country_same_as_current),
        (pi.applying_country.country if pi.applying_country else ""),
        (pi.applying_country.status if pi.applying_country else ""),
        (pi.applying_country.from_date if pi.applying_country else ""),
        (pi.applying_country.to_date if pi.applying_country else ""),
        addr.district or "",
        yn(data.contact.residential_address_same_as_mailing),
        (data.contact.residential_address.unit if data.contact.residential_address else ""),
        (data.contact.residential_address.street_number if data.contact.residential_address else ""),
        (data.contact.residential_address.street_name if data.contact.residential_address else ""),
        (data.contact.residential_address.city if data.contact.residential_address else ""),
        (data.contact.residential_address.district if data.contact.residential_address else ""),
        (data.contact.residential_address.country if data.contact.residential_address else ""),
        (data.contact.residential_address.province_state if data.contact.residential_address else ""),
        (data.contact.residential_address.postal_code if data.contact.residential_address else ""),
        data.contact.primary_phone_type or "",
        data.contact.primary_phone_country_code or "",
        data.contact.primary_phone_ext or "",
        yn(data.contact.has_alt_phone),
        (data.contact.alt_phone.phone_type if data.contact.alt_phone else ""),
        (data.contact.alt_phone.country_code if data.contact.alt_phone else ""),
        (data.contact.alt_phone.number if data.contact.alt_phone else ""),
        (data.contact.alt_phone.ext if data.contact.alt_phone else ""),
        yn(data.contact.has_fax),
        (data.contact.fax.country_code if data.contact.fax else ""),
        (data.contact.fax.number if data.contact.fax else ""),
        (data.contact.fax.ext if data.contact.fax else ""),
        f.marriage_date or "",
        yn(f.previous_marriage.had_previous if f.previous_marriage else False),
        (f.previous_marriage.family_name if f.previous_marriage else ""),
        (f.previous_marriage.given_names if f.previous_marriage else ""),
        (f.previous_marriage.date_of_birth if f.previous_marriage else ""),
        (f.previous_marriage.relationship_type if f.previous_marriage else ""),
        (f.previous_marriage.from_date if f.previous_marriage else ""),
        (f.previous_marriage.to_date if f.previous_marriage else ""),
        yn(data.has_education_history),
        # PDFs
        _drive("imm1294", "id"), _drive("imm1294", "webViewLink"),
        _drive("imm5707", "id"), _drive("imm5707", "webViewLink"),
        _drive("imm5409", "id"), _drive("imm5409", "webViewLink"),
        _drive("imm5646", "id"), _drive("imm5646", "webViewLink"),
        _drive("imm5476", "id"), _drive("imm5476", "webViewLink"),
        _drive("imm5475", "id"), _drive("imm5475", "webViewLink"),
    ]


# ---------------------------------------------------------------------------
# Children tab (same structure as before — reused for IMM 5707)
# ---------------------------------------------------------------------------

CHILDREN_HEADERS = [
    "child_id", "submission_id", "child_index",
    "family_name", "given_names", "native_name",
    "date_of_birth", "country_of_birth",
    "relationship", "marital_status", "address", "occupation", "accompanies",
]


def children_rows(data: StudyPermitData) -> list[list]:
    rows = []
    for i, c in enumerate(data.family.children or [], start=1):
        rows.append([
            str(uuid.uuid4()), data.submission_id, i,
            c.family_name, c.given_names, c.native_name,
            c.date_of_birth, c.country_of_birth,
            c.relationship,
            c.marital_status.value if c.marital_status else "",
            c.address, c.occupation,
            "Yes" if c.will_accompany else "No",
        ])
    return rows


# ---------------------------------------------------------------------------
# Employment tab (from IMM 1294 occupation history)
# ---------------------------------------------------------------------------

EMPLOYMENT_HEADERS = [
    "employment_id", "submission_id", "entry_index",
    "employer", "occupation",
    "city", "province_state", "country",
    "from_date", "to_date",
]


def employment_rows(data: StudyPermitData) -> list[list]:
    rows = []
    for i, o in enumerate(data.occupation_history or [], start=1):
        from_date = f"{o.from_year}-{o.from_month}"
        to_date = f"{o.to_year}-{o.to_month}"
        rows.append([
            str(uuid.uuid4()), data.submission_id, i,
            o.employer, o.occupation,
            o.city, o.province_state, o.country,
            from_date, to_date,
        ])
    return rows


# ---------------------------------------------------------------------------
# Education tab (from IMM 1294 education history)
# ---------------------------------------------------------------------------

EDUCATION_HEADERS = [
    "education_id", "submission_id", "entry_index",
    "institution", "field_of_study",
    "city", "province_state", "country",
    "from_date", "to_date",
]


def education_rows(data: StudyPermitData) -> list[list]:
    rows = []
    for i, e in enumerate(data.education_history or [], start=1):
        from_date = f"{e.from_year}-{e.from_month}"
        to_date = f"{e.to_year}-{e.to_month}"
        rows.append([
            str(uuid.uuid4()), data.submission_id, i,
            e.school, e.field_of_study,
            e.city, e.province_state, e.country,
            from_date, to_date,
        ])
    return rows


# ---------------------------------------------------------------------------
# Representatives tab (IMM 5476, conditional)
# ---------------------------------------------------------------------------

REPRESENTATIVES_HEADERS = [
    "submission_id",
    # Action + Section A applicant-side fields specific to IMM 5476
    "rep_action", "applicant_email", "type_of_application",
    # Representative identity + accreditation (applicant identity lives in Submissions)
    "rep_sub_type", "rep_family_name", "rep_given_name",
    "iccrc_number", "provincial_law_society", "membership_id",
    "unpaid_other_specify",
    "organization_name", "lawyer_name",
    # Address
    "unit", "street_number", "street_name",
    "city", "province", "country", "postal_code",
    # Phone / fax / email
    "phone_country_code", "phone_number",
    "fax_country_code", "fax_number",
    "email",
    # Signatures
    "rep_signature", "rep_date_signed",
]


def representatives_row(data: StudyPermitData) -> Optional[list]:
    rep = data.representative
    if not rep:
        return None
    return [
        data.submission_id,
        rep.rep_action.value if rep.rep_action else "",
        rep.applicant_email, rep.type_of_application,
        rep.rep_type.value if rep.rep_type else "",
        rep.rep_family_name, rep.rep_given_name,
        rep.iccrc_number, rep.provincial_law_society, rep.membership_id,
        rep.unpaid_other_specify,
        rep.organization_name, rep.lawyer_name,
        rep.unit, rep.street_number, rep.street_name,
        rep.city, rep.province, rep.country, rep.postal_code,
        rep.phone_country_code, rep.phone_number,
        rep.fax_country_code, rep.fax_number,
        rep.email,
        rep.rep_signature, rep.rep_date_signed,
    ]


# ---------------------------------------------------------------------------
# CommonLaw tab (IMM 5409, conditional) — partner identity + relationship facts
# ---------------------------------------------------------------------------

COMMON_LAW_HEADERS = [
    "submission_id",
    "partner_name",
    "cohabitation_city", "cohabitation_province", "cohabitation_country",
    "years_together", "cohabitation_start", "cohabitation_end",
    "cohabitation_county",
    "section1_joint_residential_agreement", "section1_joint_property_ownership",
    "section1_joint_financial_accounts", "section1_declared_income_tax",
    "life_insurance_on_applicant", "partner_life_insurance",
    "additional_details",
    "jurisdiction_country", "jurisdiction_province",
    "declaration_city", "declaration_county",
    "declaration_province", "declaration_country",
    "declaration_day", "declaration_month", "declaration_year",
    "partner_signature",
    "admin_name", "admin_signature",
]


def common_law_row(data: StudyPermitData) -> Optional[list]:
    cl = data.common_law
    if not cl:
        return None
    return [
        data.submission_id,
        cl.partner_name,
        cl.cohabitation_city, cl.cohabitation_province, cl.cohabitation_country,
        cl.years_together, cl.start_date, cl.end_date,
        cl.cohabitation_county,
        cl.section1_joint_residential_agreement,
        cl.section1_joint_property_ownership,
        cl.section1_joint_financial_accounts,
        cl.section1_declared_income_tax,
        cl.life_insurance_on_applicant, cl.partner_life_insurance,
        cl.additional_details,
        cl.jurisdiction_country, cl.jurisdiction_province,
        cl.declaration_city, cl.declaration_county,
        cl.declaration_province, cl.declaration_country,
        cl.declaration_day, cl.declaration_month, cl.declaration_year,
        cl.partner_signature,
        cl.admin_name, cl.admin_signature,
    ]


# ---------------------------------------------------------------------------
# Custodian tab (IMM 5646, conditional)
# The custodian is a distinct person who is not necessarily a parent — so
# their identity, status, and address get their own row. Student and parent
# data already live in Submissions (applicant identity, father/mother).
# ---------------------------------------------------------------------------

CUSTODIAN_HEADERS = [
    "submission_id",
    "custodian_family_name", "custodian_given_names",
    "custodian_status", "custodian_dob",
    "custodian_address", "custodian_phone",
    "sworn_city", "sworn_province", "sworn_country",
    "sworn_day", "sworn_month", "sworn_year",
    "parent_signature",
    "parent2_family_name", "parent2_given_names", "parent2_dob",
    "parent2_address", "parent2_phone", "parent2_signature",
    "child_residence", "child_residence_other_name",
]


def custodian_row(data: StudyPermitData) -> Optional[list]:
    c = data.custodian
    if not c:
        return None
    return [
        data.submission_id,
        c.custodian_family_name, c.custodian_given_names,
        c.custodian_status, c.custodian_dob,
        c.custodian_address, c.custodian_phone,
        c.sworn_city, c.sworn_province, c.sworn_country,
        c.sworn_day, c.sworn_month, c.sworn_year,
        c.parent_signature,
        c.parent2_family_name, c.parent2_given_names, c.parent2_dob,
        c.parent2_address, c.parent2_phone, c.parent2_signature,
        c.child_residence.value if c.child_residence else "",
        c.child_residence_other_name,
    ]


# ---------------------------------------------------------------------------
# ReleaseAuthority tab (IMM 5475, conditional)
# The designated individual is a distinct person. Applicant identity stays in
# Submissions; signed_date/applicant_signature for this form are also stored
# here because they are scope-specific to the release authorization.
# ---------------------------------------------------------------------------

RELEASE_AUTHORITY_HEADERS = [
    "submission_id",
    "designated_family_name", "designated_given_names",
    "designated_relationship",
    "designated_unit", "designated_street_number", "designated_street_name",
    "designated_city", "designated_province_state",
    "designated_country", "designated_postal_code",
    "designated_phone_country_code", "designated_phone", "designated_email",
    "cancel_previous",
    "applicant_signature", "signed_date", "signed_city", "signed_country",
]


def release_authority_row(data: StudyPermitData) -> Optional[list]:
    ra = data.release_authority
    if not ra:
        return None
    return [
        data.submission_id,
        ra.designated_family_name, ra.designated_given_names,
        ra.designated_relationship,
        ra.designated_unit, ra.designated_street_number, ra.designated_street_name,
        ra.designated_city, ra.designated_province_state,
        ra.designated_country, ra.designated_postal_code,
        ra.designated_phone_country_code, ra.designated_phone, ra.designated_email,
        ra.cancel_previous,
        ra.applicant_signature, ra.signed_date, ra.signed_city, ra.signed_country,
    ]
