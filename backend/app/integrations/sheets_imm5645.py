"""IMM 5645 → Sheets row builders.

Three sheets joined by `submission_id`:
  - Submissions  (parent, PK = submission_id)
  - Children     (FK submission_id, PK child_id)
  - Siblings     (FK submission_id, PK sibling_id)
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from ..forms.imm5645.schema import FamilyData, ParentStatus

SUBMISSIONS_HEADERS = [
    "submission_id", "timestamp", "case_id", "tenant_id", "application_type",
    "applicant_family_name", "applicant_given_names", "applicant_dob",
    "applicant_country_of_birth", "applicant_address", "applicant_marital_status",
    "applicant_occupation",
    "spouse_family_name", "spouse_given_names", "spouse_dob",
    "spouse_country_of_birth", "spouse_marital_status", "spouse_occupation",
    "spouse_address", "spouse_accompanies",
    "no_spouse_signature", "no_spouse_date",
    "father_family_name", "father_given_names", "father_dob",
    "father_country_of_birth", "father_status", "father_address_or_death",
    "father_occupation",
    "mother_family_name", "mother_given_names", "mother_dob",
    "mother_country_of_birth", "mother_status", "mother_address_or_death",
    "mother_occupation",
    "has_children", "has_siblings",
    "no_children_signature", "no_children_date",
    "applicant_signature", "applicant_signature_date",
    "pdf_filename", "pdf_drive_id",
]

CHILDREN_HEADERS = [
    "child_id", "submission_id", "child_index",
    "family_name", "given_names", "dob", "country_of_birth",
    "relationship", "marital_status", "address", "occupation", "accompanies",
]

SIBLINGS_HEADERS = [
    "sibling_id", "submission_id", "sibling_index",
    "family_name", "given_names", "dob", "country_of_birth",
    "relationship", "marital_status", "address", "occupation", "accompanies",
]


def new_submission_id() -> str:
    return str(uuid.uuid4())


def _accompany(b):
    return {True: "Yes", False: "No", None: ""}[b]


def submissions_row(data: FamilyData, pdf_filename: str, pdf_drive_id: str, tenant_id: str) -> list:
    a = data.applicant
    s = data.spouse
    f = data.father
    m = data.mother
    return [
        data.submission_id,
        datetime.now(timezone.utc).isoformat(),
        data.case_id,
        tenant_id,
        data.application_type.value,
        a.family_name, a.given_names, a.date_of_birth,
        a.country_of_birth, a.address,
        a.marital_status.value if a.marital_status else "",
        a.occupation,
        s.family_name if s else "",
        s.given_names if s else "",
        s.date_of_birth if s else "",
        s.country_of_birth if s else "",
        s.marital_status.value if s and s.marital_status else "",
        s.occupation if s else "",
        s.address if s else "",
        _accompany(s.will_accompany) if s else "",
        data.no_spouse_signature, data.no_spouse_date,
        f.family_name, f.given_names, f.date_of_birth,
        f.country_of_birth,
        f.status.value,
        f.address,
        f.occupation if f.status == ParentStatus.living else "Deceased",
        m.family_name, m.given_names, m.date_of_birth,
        m.country_of_birth,
        m.status.value,
        m.address,
        m.occupation if m.status == ParentStatus.living else "Deceased",
        len(data.children),
        len(data.siblings),
        data.no_children_signature, data.no_children_date,
        data.applicant_signature, data.applicant_signature_date,
        pdf_filename, pdf_drive_id,
    ]


def children_rows(data: FamilyData) -> list[list]:
    out = []
    for i, c in enumerate(data.children, start=1):
        out.append([
            str(uuid.uuid4()),
            data.submission_id,
            i,
            c.family_name, c.given_names, c.date_of_birth, c.country_of_birth,
            c.relationship,
            c.marital_status.value if c.marital_status else "",
            c.address, c.occupation,
            _accompany(c.will_accompany),
        ])
    return out


def siblings_rows(data: FamilyData) -> list[list]:
    out = []
    for i, s in enumerate(data.siblings, start=1):
        rel = getattr(s, "relationship", "")
        out.append([
            str(uuid.uuid4()),
            data.submission_id,
            i,
            s.family_name, s.given_names, s.date_of_birth, s.country_of_birth,
            rel,
            s.marital_status.value if s.marital_status else "",
            s.address, s.occupation,
            _accompany(s.will_accompany),
        ])
    return out
