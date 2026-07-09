"""Bundle filler — fills all forms in the study permit bundle and returns PDF bytes."""
from __future__ import annotations

from ...eligibility.lookup import get_child_status
from ...eligibility.schema import ChildSchoolLevel
from ..imm1294.filler import fill_pdf as fill_imm1294
from ..imm1295.filler import fill_pdf as fill_imm1295
from ..imm5257.filler import fill_pdf as fill_imm5257, fill_schedule1_pdf as fill_imm5257_sch1
from ..imm5409.filler import fill_pdf as fill_imm5409
from ..imm5475.filler import fill_pdf as fill_imm5475
from ..imm5476.filler import fill_pdf as fill_imm5476
from ..imm5646.filler import fill_pdf as fill_imm5646
from ..imm5707.filler import fill_pdf as fill_imm5707
from .dependents import _format_address, build_child_principal_data
from .dependents_spouse import (
    build_spouse_imm1295_data,
    build_spouse_imm5257_data,
    build_spouse_principal_data,
)
from .schema import StudyPermitData


def _enrich_family_addresses(data: StudyPermitData) -> StudyPermitData:
    """Derive spouse/children IMM 5707 addresses from the structured contact,
    so the frontend only collects each address once.

    Spouse: if address_same_as_main (default), use the main applicant's
    household mailing address; otherwise use the spouse's own structured address.
    Children: always use the main applicant's household address (same household).
    Called at the top of fill_bundle so every downstream projection sees the
    enriched data (including build_child_principal_data's _spouse_as_parent)."""
    family = data.family
    changes: dict = {}

    if family.spouse is not None:
        sa = family.spouse_study_applicant
        if sa is not None and not sa.address_same_as_main and sa.mailing_address is not None:
            addr = _format_address(sa.mailing_address)
        else:
            addr = _format_address(data.contact.mailing_address)
        if addr:
            changes["spouse"] = family.spouse.model_copy(update={"address": addr})

    household_addr = _format_address(data.contact.mailing_address)
    if family.children and household_addr:
        changes["children"] = [
            c.model_copy(update={"address": household_addr}) for c in family.children
        ]

    if not changes:
        return data
    return data.model_copy(update={"family": family.model_copy(update=changes)})


def fill_bundle(data: StudyPermitData) -> dict[str, bytes]:
    """
    Fill every form in the study permit bundle.
    Returns {form_id: pdf_bytes} for all applicable forms.
    """
    data = _enrich_family_addresses(data)
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
    # their own application. Which package to build (IMM 1295 open work permit
    # vs IMM 5257 + Schedule 1 visitor visa) is decided by optional_forms —
    # already eligibility-checked by the admin intake page's deriveOptionalForms()
    # (mirroring the same dependents_eligibility.json ruleset) at token-issuance
    # time, and already enforced server-side as a subset of the token's
    # authorized claims.optional_forms (see /forms/study_permit/fill). It is
    # the same signal the frontend wizard itself uses to decide which fields to
    # render/collect for the spouse, so trusting it here keeps the generated
    # package consistent with what was actually asked and answered. IMM
    # 5409/5476/5475 reuse the SAME data already captured for the main
    # applicant's own bundle when those optional forms are active — the
    # common-law declaration and representative/release-authority designations
    # describe the same underlying facts, so no separate spouse data entry is
    # needed. IMM 5484/5488 (document checklists) are not fillable, same
    # precedent as IMM 5483 for the child path.
    spouse_applicant = data.family.spouse_study_applicant
    if (
        ("spouse_work_permit" in data.optional_forms or "spouse_visitor" in data.optional_forms)
        and spouse_applicant is not None
    ):
        spouse_data = build_spouse_principal_data(data, spouse_applicant)
        result["imm5707_spouse"] = fill_imm5707(spouse_data)

        if "spouse_work_permit" in data.optional_forms:
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
            # of reusing the main applicant's identity verbatim. type_of_application
            # also needs to reflect the spouse's OWN permit type, not the main
            # applicant's study permit — the main applicant's 5476 always says
            # "Study Permit (Outside Canada)" (RepresentativeStep.tsx), which is
            # wrong for the spouse's own accompanying application.
            spi = spouse_data.personal_info
            spouse_application_type = (
                "Work Permit (Outside Canada)" if "spouse_work_permit" in data.optional_forms
                else "Visitor Visa (Outside Canada)"
            )
            spouse_data.representative = data.representative.model_copy(update={
                "applicant_family_name": spi.family_name,
                "applicant_given_name": spi.given_name,
                "applicant_dob": spi.date_of_birth,
                "uci_number": spi.uci,
                "applicant_email": spouse_data.contact.email,
                "applicant_signature": spouse_data.applicant_signature,
                "applicant_date_signed": spouse_data.applicant_signature_date,
                "type_of_application": spouse_application_type,
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
