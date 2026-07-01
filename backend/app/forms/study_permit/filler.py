"""Bundle filler — fills all forms in the study permit bundle and returns PDF bytes."""
from __future__ import annotations

from ...eligibility.lookup import get_child_status, get_spouse_path
from ...eligibility.schema import ChildSchoolLevel, SpousePath, StudyLevel
from ..imm1294.filler import fill_pdf as fill_imm1294
from ..imm1295.filler import fill_pdf as fill_imm1295
from ..imm5257.filler import fill_pdf as fill_imm5257, fill_schedule1_pdf as fill_imm5257_sch1
from ..imm5409.filler import fill_pdf as fill_imm5409
from ..imm5475.filler import fill_pdf as fill_imm5475
from ..imm5476.filler import fill_pdf as fill_imm5476
from ..imm5646.filler import fill_pdf as fill_imm5646
from ..imm5707.filler import fill_pdf as fill_imm5707
from .dependents import build_child_principal_data
from .dependents_spouse import (
    build_spouse_imm1295_data,
    build_spouse_imm5257_data,
    build_spouse_principal_data,
)
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
    # accompanied_by_parent is always True here: this child is a dependant of
    # the main applicant, who is themself the parent travelling to/residing in
    # Canada. IRCC's custodian requirement (IMM 5646) only applies when NO
    # parent/guardian accompanies the minor — that can't happen in this flow,
    # so IMM 5646 is never part of `status.required_forms` for accompanied
    # children and is correctly absent from `child_fillers` below. (A
    # genuinely unaccompanied minor — no parent involved at all — is a
    # different case type, out of scope for this main-applicant bundle.)
    #
    # IMM 5476 / 5475 are family-level (the main applicant's representative /
    # release authority) and IMM 5483 is a document checklist (not fillable),
    # so those codes are also intentionally skipped (no filler registered).
    if "child_study_permit" in data.optional_forms:
        child_fillers = {"IMM1294": fill_imm1294, "IMM5707": fill_imm5707}
        status = get_child_status(ChildSchoolLevel.k12, accompanied_by_parent=True)
        for idx, child in enumerate(data.family.children, start=1):
            if not getattr(child, "applying_study_permit", False):
                continue
            child_data = build_child_principal_data(data, child)
            for form_code in status.required_forms:
                filler = child_fillers.get(form_code)
                if filler is None:
                    continue
                result[f"{form_code.lower()}_child_{idx}"] = filler(child_data)

    # --- Spouse forms (Phase 2) — accompanying spouse/common-law partner filing
    # their own application. eligibility.lookup.get_spouse_path() decides the
    # branch from the main applicant's program: recommended_path is always
    # either open_work_permit (-> IMM 1295) or visitor (-> IMM 5257 + Schedule 1)
    # — the other SpousePath values only ever appear as informational
    # alternatives, never auto-selected. Re-derived here (not trusted from the
    # client's pre-computed optional_forms axis) so eligibility stays decided
    # in one place. IMM 5409/5476/5475 reuse the SAME data already captured for
    # the main applicant's own bundle when those optional forms are active —
    # the common-law declaration and representative/release-authority
    # designations describe the same underlying facts, so no separate spouse
    # data entry is needed. IMM 5484/5488 (document checklists) are not
    # fillable, same precedent as IMM 5483 for the child path.
    spouse_applicant = data.family.spouse_study_applicant
    if (
        ("spouse_work_permit" in data.optional_forms or "spouse_visitor" in data.optional_forms)
        and spouse_applicant is not None
    ):
        spouse_path = get_spouse_path(data.spouse_study_level or StudyLevel.other)
        spouse_data = build_spouse_principal_data(data, spouse_applicant)
        result["imm5707_spouse"] = fill_imm5707(spouse_data)

        if spouse_path.recommended_path == SpousePath.open_work_permit:
            result["imm1295_spouse"] = fill_imm1295(build_spouse_imm1295_data(data, spouse_applicant))
        else:
            spouse_5257_data = build_spouse_imm5257_data(data, spouse_applicant)
            result["imm5257_spouse"] = fill_imm5257(spouse_5257_data)
            result["imm5257_sch1_spouse"] = fill_imm5257_sch1(spouse_5257_data)

        if "imm5409" in data.optional_forms and data.common_law:
            result["imm5409_spouse"] = fill_imm5409(data.common_law)
        if "imm5476" in data.optional_forms and data.representative:
            # obs #7 — the spouse fills & signs their OWN IMM 5476. Reuse the
            # same representative (same lawyer) but override Section A applicant
            # identity + the applicant signature with the spouse's own, instead
            # of reusing the main applicant's identity verbatim.
            spi = spouse_data.personal_info
            spouse_data.representative = data.representative.model_copy(update={
                "applicant_family_name": spi.family_name,
                "applicant_given_name": spi.given_name,
                "applicant_dob": spi.date_of_birth,
                "uci_number": spi.uci,
                "applicant_email": spouse_data.contact.email,
                "applicant_signature": spouse_data.applicant_signature,
                "applicant_date_signed": spouse_data.applicant_signature_date,
            })
            result["imm5476_spouse"] = fill_imm5476(spouse_data)
        if "imm5475" in data.optional_forms and data.release_authority:
            spi = spouse_data.personal_info
            spouse_applicant_data = {
                "family_name": spi.family_name,
                "given_name": spi.given_name,
                "date_of_birth": spi.date_of_birth,
                "uci": spi.uci,
            }
            result["imm5475_spouse"] = fill_imm5475(data.release_authority, spouse_applicant_data)

    return result
