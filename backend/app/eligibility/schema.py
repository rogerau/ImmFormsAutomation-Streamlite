"""Eligibility rules for dependents (spouse/partner, minor children) of a study
permit applicant applying from outside Canada.

Source of truth: research/study-permit-dependents-entry-conditions-research.md
(Decision Tables 1 & 2). Rules reflect the IRCC family open work permit changes
effective 2025-01-21 — re-verify against the live IRCC page before relying on
this for a real case, since immigration rules change frequently.
"""
from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel


class StudyLevel(str, Enum):
    """Principal applicant's program of study — drives spousal OWP eligibility."""
    doctoral = "doctoral"
    masters_16_plus_months = "masters_16_plus_months"
    masters_under_16_months = "masters_under_16_months"
    professional_degree = "professional_degree"
    pilot_program = "pilot_program"
    bachelors = "bachelors"
    college_diploma = "college_diploma"
    certificate = "certificate"
    language_program = "language_program"
    other = "other"


class SpousePath(str, Enum):
    open_work_permit = "open_work_permit"
    employer_specific_work_permit = "employer_specific_work_permit"
    visitor = "visitor"
    own_study_permit = "own_study_permit"


class RelationshipType(str, Enum):
    """Married spouses prove the relationship with a marriage certificate;
    common-law partners prove it with IMM 5409 instead — same form package
    otherwise."""
    married = "married"
    common_law = "common_law"


class ChildSchoolLevel(str, Enum):
    pre_school = "pre_school"
    k12 = "k12"


class ChildStatus(str, Enum):
    study_permit_required = "study_permit_required"
    visitor = "visitor"


class ProfessionalProgram(BaseModel):
    code: str
    name: str


class SpouseRuleSet(BaseModel):
    eligible_study_levels: list[StudyLevel]
    ineligible_study_levels: list[StudyLevel]
    professional_programs: list[ProfessionalProgram]
    alternatives_if_ineligible: list[SpousePath]
    forms_by_path: dict[str, list[str]]
    conditional_forms: list[str]
    common_law_proof_paths: list[SpousePath]
    common_law_proof_form: str
    notes: str
    source_refs: list[int]


class ChildRule(BaseModel):
    school_level: ChildSchoolLevel
    required_status: ChildStatus
    pal_tal_exempt: Optional[bool] = None
    forms: list[str]
    notes: str


class ChildRuleSet(BaseModel):
    rules: list[ChildRule]
    owp_eligible: bool
    custodian_required_if_unaccompanied: bool
    custodian_form: str
    age_of_majority_note: str
    source_refs: list[int]


class DependentsEligibilityRuleset(BaseModel):
    version: str
    effective_date: str
    source_doc: str
    spouse: SpouseRuleSet
    child: ChildRuleSet
    sources: dict[str, str]


class SpouseEligibilityResult(BaseModel):
    study_level: StudyLevel
    relationship_type: RelationshipType
    sowp_eligible: bool
    recommended_path: SpousePath
    alternative_paths: list[SpousePath]
    required_forms: list[str]
    notes: str
    source_refs: list[int]


class ChildStatusResult(BaseModel):
    school_level: ChildSchoolLevel
    accompanied_by_parent: bool
    required_status: ChildStatus
    pal_tal_exempt: Optional[bool]
    custodian_required: bool
    custodian_form: Optional[str]
    required_forms: list[str]
    notes: str
    source_refs: list[int]
