"""IMM 5476 — Use of a Representative (hybrid AcroForm filler)."""
from __future__ import annotations

import io
import os
from typing import TYPE_CHECKING

from pypdf import PdfReader, PdfWriter

if TYPE_CHECKING:
    from ..study_permit.schema import StudyPermitData
from .schema import RepType

TEMPLATE = os.path.join(os.path.dirname(__file__), "template", "imm5476e.pdf")
UNENC = os.path.join(os.path.dirname(__file__), "template", "imm5476e_unenc.pdf")

# RadioButtonList values: 0=paid+member, 1=paid+other, 2=unpaid, 3=cancel+appoint, 4=cancel
_REP_TYPE_VAL = {
    RepType.paid_member: "/0",
    RepType.paid_other: "/1",
    RepType.unpaid: "/2",
    RepType.cancel: "/4",
}


def build_field_dict(data: "StudyPermitData") -> dict:
    d = data.representative
    if not d:
        return {}

    return {
        # Section A — applicant
        "IMM_5476[0].Page1[0].SectionA[0].familyName[0]": d.applicant_family_name,
        "IMM_5476[0].Page1[0].SectionA[0].givenName[0]": d.applicant_given_name,
        "IMM_5476[0].Page1[0].SectionA[0].DOB[0]": d.applicant_dob,
        "IMM_5476[0].Page1[0].SectionA[0].UCI[0]": d.uci_number,
        # Radio — rep type
        "IMM_5476[0].Page1[0].RadioButtonList[0]": _REP_TYPE_VAL.get(d.rep_type, "/0"),
        # Section B — representative
        "IMM_5476[0].Page1[0].SectionB[0].familyName[0]": d.rep_family_name,
        "IMM_5476[0].Page1[0].SectionB[0].givenName[0]": d.rep_given_name,
        "IMM_5476[0].Page1[0].SectionB[0].question6[0].questionII[0].ICCRCMember[0]": d.iccrc_number,
        "IMM_5476[0].Page1[0].SectionB[0].question6[0].questionII[0].province[0]": d.provincial_law_society,
        "IMM_5476[0].Page1[0].SectionB[0].question7[0].organization[0]": d.organization_name,
        "IMM_5476[0].Page1[0].SectionB[0].question7[0].lawyer[0]": d.lawyer_name,
        "IMM_5476[0].Page1[0].SectionB[0].question7[0].membershipID[0]": d.membership_id,
        "IMM_5476[0].Page1[0].SectionB[0].question7[0].unit[0]": d.unit,
        "IMM_5476[0].Page1[0].SectionB[0].question7[0].streetNo[0]": d.street_number,
        "IMM_5476[0].Page1[0].SectionB[0].question7[0].streetName[0]": d.street_name,
        "IMM_5476[0].Page1[0].SectionB[0].question7[0].city[0]": d.city,
        "IMM_5476[0].Page1[0].SectionB[0].question7[0].province[0]": d.province,
        "IMM_5476[0].Page1[0].SectionB[0].question7[0].country[0]": d.country,
        "IMM_5476[0].Page1[0].SectionB[0].question7[0].postalcode[0]": d.postal_code,
        "IMM_5476[0].Page1[0].SectionB[0].question7[0].phoneCountryCode[0]": d.phone_country_code,
        "IMM_5476[0].Page1[0].SectionB[0].question7[0].phoneNumber[0]": d.phone_number,
        "IMM_5476[0].Page1[0].SectionB[0].question7[0].faxCountryCode[0]": d.fax_country_code,
        "IMM_5476[0].Page1[0].SectionB[0].question7[0].faxNumber[0]": d.fax_number,
        "IMM_5476[0].Page1[0].SectionB[0].question7[0].email[0]": d.email,
        # Signatures
        "IMM_5476[0].Page1[0].SectionB[0].question8[0].signatrureApplicant[0]": d.applicant_signature,
        "IMM_5476[0].Page1[0].SectionB[0].question8[0].dateSigned[0]": d.applicant_date_signed,
        "IMM_5476[0].Page1[0].SectionB[0].question8[0].signatrureApplicant[1]": d.rep_signature,
        "IMM_5476[0].Page1[0].SectionB[0].question8[0].dateSigned[1]": d.rep_date_signed,
    }


def fill_pdf(data: "StudyPermitData") -> bytes:
    if not os.path.exists(TEMPLATE):
        raise FileNotFoundError(f"IMM 5476 template not found: {TEMPLATE}")
    if not os.path.exists(UNENC):
        raise FileNotFoundError(f"IMM 5476 unencrypted copy not found: {UNENC}")

    fields = build_field_dict(data)
    reader = PdfReader(UNENC)
    writer = PdfWriter()
    writer.clone_reader_document_root(reader)
    writer.update_page_form_field_values(writer.pages[0], fields, auto_regenerate=False)
    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()
