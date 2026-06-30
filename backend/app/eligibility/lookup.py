"""Lookup functions for dependents-of-study-permit-applicant eligibility.

Loads the rule table from data/dependents_eligibility.json (kept as data,
not code, so it can be updated when IRCC changes the rules without touching
the lookup logic) and exposes typed results for the two branching questions:

  get_spouse_path(study_level)              -> SpouseEligibilityResult
  get_child_status(school_level, ...)        -> ChildStatusResult
"""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

from .schema import (
    ChildSchoolLevel,
    ChildStatus,
    ChildStatusResult,
    DependentsEligibilityRuleset,
    RelationshipType,
    SpouseEligibilityResult,
    SpousePath,
    StudyLevel,
)

_DATA_PATH = Path(__file__).parent / "data" / "dependents_eligibility.json"


@lru_cache(maxsize=1)
def _ruleset() -> DependentsEligibilityRuleset:
    raw = json.loads(_DATA_PATH.read_text(encoding="utf-8"))
    return DependentsEligibilityRuleset.model_validate(raw)


def get_spouse_path(
    study_level: StudyLevel,
    relationship_type: RelationshipType = RelationshipType.married,
) -> SpouseEligibilityResult:
    """Given the principal applicant's program of study, determine the
    spouse/common-law partner's path (Decision Table 1).

    A common-law partner follows the exact same path/forms as a married
    spouse, with one addition: IMM 5409 (Statutory Declaration of
    Common-law Union) is required wherever the relationship would
    otherwise be proven by a marriage certificate.
    """
    rules = _ruleset().spouse
    eligible = study_level in rules.eligible_study_levels

    if eligible:
        recommended = SpousePath.open_work_permit
        alternatives: list[SpousePath] = []
    else:
        recommended = SpousePath.visitor
        alternatives = [p for p in rules.alternatives_if_ineligible if p != recommended]

    forms = list(rules.forms_by_path[recommended.value])
    if (
        relationship_type == RelationshipType.common_law
        and recommended in rules.common_law_proof_paths
        and rules.common_law_proof_form not in forms
    ):
        forms.append(rules.common_law_proof_form)

    return SpouseEligibilityResult(
        study_level=study_level,
        relationship_type=relationship_type,
        sowp_eligible=eligible,
        recommended_path=recommended,
        alternative_paths=alternatives,
        required_forms=forms,
        notes=rules.notes,
        source_refs=rules.source_refs,
    )


def get_child_status(
    school_level: ChildSchoolLevel,
    accompanied_by_parent: bool = True,
) -> ChildStatusResult:
    """Given a minor child's schooling situation, determine their required
    status to enter Canada (Decision Table 2)."""
    rules = _ruleset().child
    rule = next(r for r in rules.rules if r.school_level == school_level)

    custodian_required = (
        rule.required_status == ChildStatus.study_permit_required
        and not accompanied_by_parent
        and rules.custodian_required_if_unaccompanied
    )
    forms = list(rule.forms)
    if custodian_required and rules.custodian_form not in forms:
        forms.append(rules.custodian_form)

    return ChildStatusResult(
        school_level=school_level,
        accompanied_by_parent=accompanied_by_parent,
        required_status=rule.required_status,
        pal_tal_exempt=rule.pal_tal_exempt,
        custodian_required=custodian_required,
        custodian_form=rules.custodian_form if custodian_required else None,
        required_forms=forms,
        notes=rule.notes,
        source_refs=rules.source_refs,
    )
