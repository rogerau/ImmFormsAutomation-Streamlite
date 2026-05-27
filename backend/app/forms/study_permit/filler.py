"""Bundle filler — fills all forms in the study permit bundle and returns PDF bytes."""
from __future__ import annotations

from ..imm1294.filler import fill_pdf as fill_imm1294
from ..imm5409.filler import fill_pdf as fill_imm5409
from ..imm5475.filler import fill_pdf as fill_imm5475
from ..imm5476.filler import fill_pdf as fill_imm5476
from ..imm5646.filler import fill_pdf as fill_imm5646
from ..imm5707.filler import fill_pdf as fill_imm5707
from .schema import StudyPermitData


def fill_bundle(data: StudyPermitData) -> dict[str, bytes]:
    """
    Fill every form in the study permit bundle.
    Returns {form_id: pdf_bytes} for all applicable forms.
    """
    result: dict[str, bytes] = {
        "imm1294": fill_imm1294(data),
        "imm5707": fill_imm5707(data),
    }
    if "imm5409" in data.optional_forms and data.common_law:
        result["imm5409"] = fill_imm5409(data.common_law)
    if "imm5646" in data.optional_forms and data.custodian:
        result["imm5646"] = fill_imm5646(data)
    if "imm5476" in data.optional_forms and data.representative:
        result["imm5476"] = fill_imm5476(data)
    if "imm5475" in data.optional_forms and data.release_authority:
        # Applicant identity comes from the master schema so the IMM 5475
        # schema doesn't duplicate it.
        pi = data.personal_info
        applicant_data = {
            "family_name": pi.family_name,
            "given_name": pi.given_name,
            "date_of_birth": pi.date_of_birth,
            "uci": pi.uci,
        }
        result["imm5475"] = fill_imm5475(data.release_authority, applicant_data)
    return result
