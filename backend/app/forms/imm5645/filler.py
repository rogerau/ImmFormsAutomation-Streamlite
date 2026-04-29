"""Fill the IRCC IMM 5645 PDF from a validated FamilyData payload.

Three quirks of this PDF (verified against the 2021-01 edition with
`tools/inspect_pdf_fields.py`):

1. The official PDF is encrypted with an empty user password (IRCC
   sets edit restrictions). pypdf can read field names but
   `PdfWriter(clone_from=...)` fails with a block-length error. We
   strip encryption with pikepdf into a transient buffer first.
2. Radio button "on" state is `/1` (not `/Yes`).
3. The marital-status dropdown (`ChildMStatus`) accepts the export key
   '1'..'8', not the human-readable label.
"""
from __future__ import annotations

import io
from pathlib import Path

import pikepdf
from pypdf import PdfReader, PdfWriter

from .schema import (
    ApplicationType,
    Child,
    FamilyData,
    MARITAL_STATUS_EXPORT,
    MaritalStatus,
    Parent,
    ParentStatus,
    Person,
)

TEMPLATE_PDF = Path(__file__).parent / "template" / "imm5645e.pdf"

A = "IMM_5645[0].page1[0].SectionA[0]"
B = "IMM_5645[0].page1[0].SectionB[0]"
C = "IMM_5645[0].page1[0].SectionC[0]"
P1 = "IMM_5645[0].page1[0].Subform1[0]"

BTN_ON = "/1"


def _decrypt_to_bytes(path: Path) -> bytes:
    """Strip empty-password encryption from the IRCC PDF; return raw bytes."""
    with pikepdf.open(str(path)) as pdf:
        buf = io.BytesIO()
        pdf.save(buf)
        return buf.getvalue()


def _person_text_fields(prefix: str, short: str, p: Person) -> dict:
    return {
        f"{prefix}.{short}Name[0]": p.display_name(),
        f"{prefix}.{short}DOB[0]": p.date_of_birth,
        f"{prefix}.{short}COB[0]": p.country_of_birth,
        f"{prefix}.{short}Address[0]": p.address,
        f"{prefix}.{short}Occupation[0]": p.occupation,
    }


def _accompany(prefix: str, short: str, p: Person) -> dict:
    if p.will_accompany is True:
        return {f"{prefix}.{short}Yes[0]": BTN_ON}
    if p.will_accompany is False:
        return {f"{prefix}.{short}No[0]": BTN_ON}
    return {}


def _marital(prefix: str, p: Person) -> dict:
    if p.marital_status is None:
        return {}
    return {f"{prefix}.ChildMStatus[0]": MARITAL_STATUS_EXPORT[p.marital_status]}


def build_field_dict(data: FamilyData) -> dict:
    fields: dict = {}

    # Application type radio button
    fields[f"{P1}.{data.application_type.value}[0]"] = BTN_ON

    # Section A — Applicant
    a = data.applicant
    fields.update(_person_text_fields(f"{A}.Applicant[0]", "App", a))
    fields.update(_marital(f"{A}.Applicant[0]", a))

    # Section A — Spouse
    if data.spouse:
        fields.update(_person_text_fields(f"{A}.Spouse[0]", "Spouse", data.spouse))
        fields.update(_marital(f"{A}.Spouse[0]", data.spouse))
        fields.update(_accompany(f"{A}.Spouse[0]", "Spouse", data.spouse))

    # No-spouse declaration
    if data.no_spouse_signature:
        fields[f"{A}.#subform[5].SectionAsignature[0]"] = data.no_spouse_signature
    if data.no_spouse_date:
        fields[f"{A}.#subform[5].SectionAdate[0]"] = data.no_spouse_date

    # Section A — Mother & Father
    for parent_obj, key, short in (
        (data.mother, "Mother", "Mother"),
        (data.father, "Father", "Father"),
    ):
        prefix = f"{A}.{key}[0]"
        fields.update(_person_text_fields(prefix, short, parent_obj))
        fields.update(_marital(prefix, parent_obj))
        # Living/deceased: PDF has no explicit field; deceased -> occupation already
        # carries that info per the validation rules (occupation = "Deceased").
        # The address field carries place + date of death.
        # The Yes/No radios on parents represent "accompanies"; mark No by default.
        if parent_obj.status == ParentStatus.living:
            fields.update(_accompany(prefix, short, parent_obj))
        # else: leave blank (deceased parents don't get an accompany answer)

    # Section B — Children (up to 4)
    for i, child in enumerate(data.children[:4]):
        prefix = f"{B}.Child[{i}]"
        fields.update(_person_text_fields(prefix, "Child", child))
        fields.update(_marital(prefix, child))
        fields.update(_accompany(prefix, "Child", child))
        if child.relationship:
            fields[f"{prefix}.ChildRelationship[0]"] = child.relationship

    # No-children declaration (Section B signature/date)
    if data.no_children_signature:
        fields[f"{B}.#subform[5].#subform[6].SectionBsignature[0]"] = data.no_children_signature
    if data.no_children_date:
        fields[f"{B}.#subform[5].#subform[6].SectionBdate[0]"] = data.no_children_date

    # Section C — Siblings (up to 7; PDF calls them "Child")
    for i, sib in enumerate(data.siblings[:7]):
        prefix = f"{C}.Child[{i}]"
        fields.update(_person_text_fields(prefix, "Child", sib))
        fields.update(_marital(prefix, sib))
        fields.update(_accompany(prefix, "Child", sib))
        if isinstance(sib, Child) and sib.relationship:
            fields[f"{prefix}.ChildRelationship[0]"] = sib.relationship

    # Final declaration
    if data.applicant_signature:
        fields[f"{C}.#subform[8].SectionCsignature[0]"] = data.applicant_signature
    if data.applicant_signature_date:
        fields[f"{C}.#subform[8].SectionCdate[0]"] = data.applicant_signature_date

    return fields


def fill_pdf(data: FamilyData) -> bytes:
    """Return the filled PDF as bytes."""
    if not TEMPLATE_PDF.exists():
        raise FileNotFoundError(f"IMM 5645 template not found at {TEMPLATE_PDF}")

    raw = _decrypt_to_bytes(TEMPLATE_PDF)
    reader = PdfReader(io.BytesIO(raw))
    writer = PdfWriter(clone_from=reader)

    field_values = build_field_dict(data)
    for page in writer.pages:
        writer.update_page_form_field_values(page, field_values)

    out = io.BytesIO()
    writer.write(out)
    return out.getvalue()
