"""IMM 5409 — Statutory Declaration of Common-law Union (hybrid AcroForm filler)."""
from __future__ import annotations

import io
import os
from typing import TYPE_CHECKING

import pikepdf
from pypdf import PdfReader, PdfWriter

if TYPE_CHECKING:
    from ..study_permit.schema import StudyPermitData

TEMPLATE = os.path.join(os.path.dirname(__file__), "template", "imm5409e.pdf")
UNENC = os.path.join(os.path.dirname(__file__), "template", "imm5409e_unenc.pdf")


def _yesno_val(val: bool) -> str:
    return "/1" if val else "/0"


def build_field_dict(data: "StudyPermitData") -> dict:
    d = data.common_law
    if not d:
        return {}

    fields = {
        "IMM_5409[0].Page1[0].Info[0].Jurisdiction[0].Country[0]": d.jurisdiction_country,
        "IMM_5409[0].Page1[0].Info[0].Jurisdiction[0].Province[0]": d.jurisdiction_province,
        "IMM_5409[0].Page1[0].Info[0].FirstName[0]": d.applicant_name,
        "IMM_5409[0].Page1[0].Info[0].SecondName[0]": d.partner_name,
        "IMM_5409[0].Page1[0].Info[0].City[0]": d.cohabitation_city,
        "IMM_5409[0].Page1[0].Info[0].County[0]": d.cohabitation_county,
        "IMM_5409[0].Page1[0].Info[0].Province[0]": d.cohabitation_province,
        "IMM_5409[0].Page1[0].Info[0].Country[0]": d.cohabitation_country,
        "IMM_5409[0].Page1[0].Info[0].YearsTogether[0]": d.years_together,
        "IMM_5409[0].Page1[0].Info[0].startDate[0]": d.start_date,
        "IMM_5409[0].Page1[0].Info[0].endDate[0]": d.end_date,
        # Section 1 — 4 yes/no checkboxes
        "IMM_5409[0].Page1[0].Section1[0].Options[0].Sec[0].yesno[0]": _yesno_val(d.section1_q1),
        "IMM_5409[0].Page1[0].Section1[0].Options[0].Sec[1].yesno[0]": _yesno_val(d.section1_q2),
        "IMM_5409[0].Page1[0].Section1[0].Options[0].Sec[2].yesno[0]": _yesno_val(d.section1_q3),
        "IMM_5409[0].Page1[0].Section1[0].Options[0].Sec[3].yesno[0]": _yesno_val(d.section1_q4),
        # Section 2 — children
        "IMM_5409[0].Page1[0].Section2[0].yesno[0]": _yesno_val(d.has_children),
        # Section 3 — previous declarations
        "IMM_5409[0].Page1[0].Section3[0].yesno[0]": _yesno_val(d.previous_declaration),
        # Section 4 — additional details
        "IMM_5409[0].Page1[0].Section4[0].TextField2[0]": d.additional_details,
        # Section 5 — declarations and signatures
        "IMM_5409[0].Page1[0].Section5[0].NameDecl[0]": d.applicant_name,
        "IMM_5409[0].Page1[0].Section5[0].SignatureDecl[0]": d.applicant_signature,
        "IMM_5409[0].Page1[0].Section5[0].NamePartner[0]": d.partner_name,
        "IMM_5409[0].Page1[0].Section5[0].SignaturePartner[0]": d.partner_signature,
        "IMM_5409[0].Page1[0].Section5[0].City[0]": d.declaration_city,
        "IMM_5409[0].Page1[0].Section5[0].County[0]": d.declaration_county,
        "IMM_5409[0].Page1[0].Section5[0].Province[0]": d.declaration_province,
        "IMM_5409[0].Page1[0].Section5[0].Country[0]": d.declaration_country,
        "IMM_5409[0].Page1[0].Section5[0].Day[0]": d.declaration_day,
        "IMM_5409[0].Page1[0].Section5[0].Month[0]": d.declaration_month,
        "IMM_5409[0].Page1[0].Section5[0].Year[0]": d.declaration_year,
        # Commissioner / notary witnessing the declaration (optional)
        "IMM_5409[0].Page1[0].Section5[0].AdminDecl[0]": d.admin_name,
        "IMM_5409[0].Page1[0].Section5[0].SignatureAdminDecl[0]": d.admin_signature,
    }
    return fields


def fill_pdf(data: "StudyPermitData") -> bytes:
    if not os.path.exists(TEMPLATE):
        raise FileNotFoundError(f"IMM 5409 template not found: {TEMPLATE}")
    if not os.path.exists(UNENC):
        raise FileNotFoundError(f"IMM 5409 unencrypted copy not found: {UNENC}")

    fields = build_field_dict(data)
    reader = PdfReader(UNENC)
    writer = PdfWriter()
    writer.clone_reader_document_root(reader)
    # Same fix as IMM 5476: process all pages and let pypdf set /NeedAppearances
    # so Adobe regenerates field appearance streams on open.
    writer.update_page_form_field_values(None, fields)
    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()
