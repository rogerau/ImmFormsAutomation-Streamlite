"""Bundle filler — fills all forms in the study permit bundle and returns PDF bytes."""
from __future__ import annotations

from ...eligibility.lookup import get_child_status
from ...eligibility.schema import ChildSchoolLevel
from ..imm1294.filler import fill_pdf as fill_imm1294
from ..imm5409.filler import fill_pdf as fill_imm5409
from ..imm5475.filler import fill_pdf as fill_imm5475
from ..imm5476.filler import fill_pdf as fill_imm5476
from ..imm5646.filler import fill_pdf as fill_imm5646
from ..imm5707.filler import fill_pdf as fill_imm5707
from .dependents import build_child_principal_data
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

    # --- Dependant forms (Phase X) — school-age minor children filing their own
    # study permit. The eligibility engine (data/dependents_eligibility.json)
    # decides each child's required form set; we fill the ones we support here.
    #
    # IMM 5476 / 5475 are family-level (the main applicant's representative /
    # release authority), IMM 5483 is a document checklist (not fillable), and
    # IMM 5646 (custodian) needs the Canadian custodian's details which are NOT
    # collected per child in Phase 1 — an unaccompanied child is instead flagged
    # in the Children sheet so the lawyer prepares IMM 5646 separately. So those
    # codes are intentionally skipped (no filler registered).
    if "child_study_permit" in data.optional_forms:
        child_fillers = {"IMM1294": fill_imm1294, "IMM5707": fill_imm5707}
        for idx, child in enumerate(data.family.children, start=1):
            if not getattr(child, "applying_study_permit", False):
                continue
            status = get_child_status(
                ChildSchoolLevel.k12,
                accompanied_by_parent=not getattr(child, "unaccompanied", False),
            )
            child_data = build_child_principal_data(data, child)
            for form_code in status.required_forms:
                filler = child_fillers.get(form_code)
                if filler is None:
                    continue
                result[f"{form_code.lower()}_child_{idx}"] = filler(child_data)
    return result
