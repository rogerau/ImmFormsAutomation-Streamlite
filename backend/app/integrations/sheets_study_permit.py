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
    "previously_refused_visa", "previously_refused_visa_details",
    "criminal_record", "criminal_record_details",
    "military_service", "military_service_details",
    "political_party", "war_crimes",
    "consent_to_contact",
    # Optional form summaries (key fields inline)
    "common_law_partner_name", "cohabitation_start",
    "custodian_name", "custodian_address",
    # PDFs per form
    "pdf_imm1294_id", "pdf_imm1294_url",
    "pdf_imm5707_id", "pdf_imm5707_url",
    "pdf_imm5409_id", "pdf_imm5409_url",
    "pdf_imm5646_id", "pdf_imm5646_url",
    "pdf_imm5476_id", "pdf_imm5476_url",
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

    # Optional form summaries
    cl_partner = data.common_law.partner_name if data.common_law else ""
    cl_start = data.common_law.start_date if data.common_law else ""
    cust_name = (
        f"{data.custodian.custodian_family_name} {data.custodian.custodian_given_names}"
        if data.custodian else ""
    )
    cust_addr = data.custodian.custodian_address if data.custodian else ""

    def _drive(form_id: str, key: str) -> str:
        return drive_results.get(form_id, {}).get(key, "")

    nid = data.national_id
    usc = data.us_pr_card
    addr = data.contact.mailing_address
    st = data.study

    yn = lambda v: "Yes" if v else "No"

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
        pi.citizenship, pi.current_country, pi.marital_status,
        f.applicant_occupation, pi.language.value if pi.language else "",
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
        # Contact
        addr.unit, addr.street_number, addr.street_name,
        addr.city, addr.country, addr.province_state, addr.postal_code,
        data.contact.phone, data.contact.email,
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
        f.no_spouse_signature, f.no_spouse_date,
        # Father
        fa.family_name, fa.given_names, fa.date_of_birth, fa.country_of_birth,
        fa.status.value if fa.status else "Living", fa.address, fa.occupation,
        # Mother
        mo.family_name, mo.given_names, mo.date_of_birth, mo.country_of_birth,
        mo.status.value if mo.status else "Living", mo.address, mo.occupation,
        # Children flags
        yn(bool(f.children)),
        f.no_children_signature, f.no_children_date,
        # Declarations
        f.section_c_signature, f.section_c_date,
        data.applicant_signature, data.applicant_signature_date,
        # Background — IMM 1294 Page 4
        yn(data.tuberculosis),
        yn(data.medical_condition), data.medical_condition_details,
        yn(data.previously_refused_visa), data.previously_refused_visa_details,
        yn(data.criminal_record), data.criminal_record_details,
        yn(data.military_service), data.military_service_details,
        yn(data.political_party), yn(data.war_crimes),
        yn(data.consent_to_contact),
        # Optional form summaries
        cl_partner, cl_start, cust_name, cust_addr,
        # PDFs
        _drive("imm1294", "id"), _drive("imm1294", "webViewLink"),
        _drive("imm5707", "id"), _drive("imm5707", "webViewLink"),
        _drive("imm5409", "id"), _drive("imm5409", "webViewLink"),
        _drive("imm5646", "id"), _drive("imm5646", "webViewLink"),
        _drive("imm5476", "id"), _drive("imm5476", "webViewLink"),
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
    # Applicant (Section A of IMM 5476)
    "applicant_family_name", "applicant_given_name", "applicant_dob", "uci_number",
    # Representative identity + accreditation
    "rep_type", "rep_family_name", "rep_given_name",
    "iccrc_number", "provincial_law_society", "membership_id",
    "organization_name", "lawyer_name",
    # Address
    "unit", "street_number", "street_name",
    "city", "province", "country", "postal_code",
    # Phone / fax / email
    "phone_country_code", "phone_number",
    "fax_country_code", "fax_number",
    "email",
    # Signatures
    "applicant_signature", "applicant_date_signed",
    "rep_signature", "rep_date_signed",
]


def representatives_row(data: StudyPermitData) -> Optional[list]:
    rep = data.representative
    if not rep:
        return None
    return [
        data.submission_id,
        # Applicant
        rep.applicant_family_name, rep.applicant_given_name,
        rep.applicant_dob, rep.uci_number,
        # Rep identity
        rep.rep_type.value if rep.rep_type else "",
        rep.rep_family_name, rep.rep_given_name,
        rep.iccrc_number, rep.provincial_law_society, rep.membership_id,
        rep.organization_name, rep.lawyer_name,
        # Address
        rep.unit, rep.street_number, rep.street_name,
        rep.city, rep.province, rep.country, rep.postal_code,
        # Phone / fax / email
        rep.phone_country_code, rep.phone_number,
        rep.fax_country_code, rep.fax_number,
        rep.email,
        # Signatures
        rep.applicant_signature, rep.applicant_date_signed,
        rep.rep_signature, rep.rep_date_signed,
    ]
