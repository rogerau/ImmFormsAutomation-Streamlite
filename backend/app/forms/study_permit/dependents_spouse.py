"""Dependant form generation for the spouse/common-law partner (Phase 2).

When a study-permit applicant has an accompanying spouse who is also filing
their OWN application, we generate that spouse's IMM 5707 (Family Information)
plus either IMM 1295 (open work permit) or IMM 5257 + Schedule 1 (visitor visa),
depending on which of "spouse_work_permit" / "spouse_visitor" is present in
optional_forms (see forms/study_permit/filler.py).

Mirrors the child-as-principal projection in dependents.py: build_spouse_principal_data
synthesizes a StudyPermitData in which the spouse is the principal, reusing the
parent's already-captured data wherever IRCC asks for the same fact, so the
existing fill_imm5707 runs unchanged. build_spouse_imm1295_data / build_spouse_imm5257_data
build the new IMM 1295 / IMM 5257 standalone data classes directly (those fillers
were written from scratch for this phase, so no projection trick is needed —
just construct the data they expect).

No custodian declaration applies to the spouse (IMM 5646 is a minor-applicant
form); IMM 5484 / IMM 5488 (document checklists in forms_by_path) are not
fillable forms, same precedent as IMM 5483 for the child path — both
intentionally have no filler registered.
"""
from __future__ import annotations

from copy import deepcopy

from ..imm1294.schema import Imm1294Address, Sex
from ..imm1295.schema import Imm1295Data, WorkDetails
from ..imm5257.schema import Imm5257Data, Imm5257Schedule1Data, VisitDetails
from ..imm5707.schema import Parent5707, ParentStatus, Person5707
from .schema import FamilyInfo, PersonalInfo, SpouseStudyApplicant, StudyPermitData


def _format_address(addr: Imm1294Address | None) -> str:
    """Flatten the structured mailing address into the single free-text line IRCC
    forms expect. Duplicated from dependents.py (private, 8 lines) rather than
    shared — not worth a cross-module dependency for this small a helper."""
    if addr is None:
        return ""
    street = " ".join(p for p in [addr.street_number, addr.street_name] if p).strip()
    if addr.unit:
        street = f"{addr.unit}-{street}" if street else addr.unit
    locality = ", ".join(
        p for p in [addr.city, addr.province_state, addr.postal_code] if p
    )
    return ", ".join(p for p in [street, locality, addr.country] if p)


_MARITAL_TEXT_MAP = {
    "Single": "Single",
    "Common-law": "Common-law",
    "Married-physically present": "Married",
    "Married-not physically present": "Married",
    "Divorced": "Divorced",
    "Legally separated": "Separated",
    "Widowed": "Widowed",
    "Annulled marriage": "Annulled",
}


def _marital_text(status) -> str:
    """Collapse the detailed IMM 5707 MaritalStatus enum to the plain-text value
    IMM 1295/IMM 5257 expect (same mapping IMM 1294's filler uses)."""
    if status is None:
        return ""
    key = status.value if hasattr(status, "value") else str(status)
    return _MARITAL_TEXT_MAP.get(key, key)


def _require_spouse(parent: StudyPermitData) -> Person5707:
    spouse = parent.family.spouse
    if spouse is None:
        raise ValueError("spouse_study_applicant is set but family.spouse is missing")
    return spouse


def _spouse_full_name(spouse: Person5707) -> str:
    """The spouse's own full name, used for every signature on the spouse's own
    forms (Phase X2 obs #4/#5/#7 — previously the main applicant's name leaked
    onto the spouse's IMM 5707 / 1295 / 5257 / 5476 signature lines)."""
    return " ".join(p for p in [spouse.given_names, spouse.family_name] if p).strip()


def _blank_parent() -> Parent5707:
    return Parent5707(
        family_name="", given_names="", date_of_birth="",
        country_of_birth="", address="", occupation="",
        status=ParentStatus.living,
    )


def _spouse_contact(parent: StudyPermitData, sa: SpouseStudyApplicant):
    """The spouse's contact block. When address_same_as_main is True (default —
    cohabiting), reuse the main applicant's household contact; otherwise use the
    spouse's own structured address, keeping the household phone/email."""
    contact = deepcopy(parent.contact)
    if not sa.address_same_as_main and sa.mailing_address is not None:
        contact.mailing_address = sa.mailing_address
        contact.residential_address_same_as_mailing = sa.residential_address_same_as_mailing
        contact.residential_address = sa.residential_address
    return contact


def build_spouse_principal_data(parent: StudyPermitData, spouse_applicant: SpouseStudyApplicant) -> StudyPermitData:
    """Project a StudyPermitData in which the spouse is the principal applicant,
    so the existing fill_imm5707 can fill the spouse's own Family Information
    form. Raises ValueError if the spouse lacks the minimal applicant data."""
    if spouse_applicant.passport is None:
        raise ValueError("spouse_study_applicant is missing passport details")
    spouse = _require_spouse(parent)
    ppi = parent.personal_info

    main_applicant_as_spouse = Person5707(
        family_name=ppi.family_name,
        given_names=ppi.given_name,
        native_name=ppi.native_name,
        date_of_birth=ppi.date_of_birth,
        country_of_birth=ppi.place_birth_country,
        address=_format_address(parent.contact.mailing_address),
        occupation=parent.family.applicant_occupation,
        marital_status=parent.family.applicant_marital_status,
        will_accompany=True,
    )

    # Phase X2 obs #4 — the spouse signs their OWN forms with their OWN name.
    sign = _spouse_full_name(spouse)
    sign_date = parent.applicant_signature_date

    spouse_personal = PersonalInfo(
        family_name=spouse.family_name,
        given_name=spouse.given_names,
        native_name=spouse.native_name,
        sex=spouse_applicant.sex or (Sex.female if ppi.sex == Sex.male else Sex.male),
        date_of_birth=spouse.date_of_birth,
        place_birth_city=spouse_applicant.place_birth_city,
        place_birth_country=spouse.country_of_birth,
        citizenship=spouse_applicant.citizenship or ppi.citizenship,
        current_country=spouse_applicant.current_country or ppi.current_country,
        language=spouse_applicant.language,
        service_in=spouse_applicant.service_in,
    )

    # Phase X2 obs #4 — the spouse declares their OWN parents (+ accompany flags)
    # on their IMM 5707 Section A. Falls back to blank only if not collected.
    father = spouse_applicant.father or _blank_parent()
    mother = spouse_applicant.mother or _blank_parent()

    spouse_family = FamilyInfo(
        applicant_marital_status=spouse.marital_status or parent.family.applicant_marital_status,
        applicant_occupation=spouse.occupation,
        spouse=main_applicant_as_spouse,
        no_spouse_signature=sign,
        no_spouse_date=sign_date,
        father=father,
        mother=mother,
        section_a_signature=sign,
        section_a_date=sign_date,
        children=parent.family.children,    # same children as the main applicant
        no_children_signature=sign,
        no_children_date=sign_date,
        section_c_signature=sign,
        section_c_date=sign_date,
    )

    return StudyPermitData(
        case_id=parent.case_id,
        submission_id=parent.submission_id,
        optional_forms=[],                  # the spouse bundle does not recurse
        personal_info=spouse_personal,
        passport=spouse_applicant.passport,
        contact=_spouse_contact(parent, spouse_applicant),   # own address if it differs
        study=parent.study,                 # not read by fill_imm5707; satisfies the required field
        family=spouse_family,
        consent_to_contact=spouse_applicant.consent_to_contact,
        applicant_signature=sign,           # the spouse signs their own form
        applicant_signature_date=sign_date,
    )


def _common_application_fields(parent: StudyPermitData, spouse_applicant: SpouseStudyApplicant) -> dict:
    """Field values shared by Imm1295Data and Imm5257Data — both reuse the same
    generic-application shape (see those schemas' module docstrings).

    Only the household facts (mailing/residential address, phone, email) and
    the applicant's own signature context are legitimately shared with the
    main applicant. Every other personal/background fact (language,
    education/occupation history, medical/criminal/military/political
    declarations, consent) is the spouse's OWN data (full parity, Phase G) —
    previously this wrongly borrowed the main applicant's answers."""
    if spouse_applicant.passport is None:
        raise ValueError("spouse_study_applicant is missing passport details")
    spouse = _require_spouse(parent)
    ppi = parent.personal_info
    contact = _spouse_contact(parent, spouse_applicant)   # own address if it differs (obs #5)
    sa = spouse_applicant

    return dict(
        family_name=spouse.family_name,
        given_name=spouse.given_names,
        sex=sa.sex or (Sex.female if ppi.sex == Sex.male else Sex.male),
        date_of_birth=spouse.date_of_birth,
        place_birth_city=sa.place_birth_city,
        place_birth_country=spouse.country_of_birth,
        citizenship=sa.citizenship or ppi.citizenship,
        current_country=sa.current_country or ppi.current_country,
        marital_status=_marital_text(spouse.marital_status or parent.family.applicant_marital_status),
        language=sa.language,
        language_most_at_ease=sa.language_most_at_ease,
        service_in=sa.service_in,
        # Residence history — the spouse's OWN (obs #5, was missing entirely).
        current_residence=sa.current_residence,
        has_previous_residence=sa.has_previous_residence,
        previous_residences=sa.previous_residences,
        applying_country_same_as_current=sa.applying_country_same_as_current,
        applying_country=sa.applying_country,
        # Previous marriage — the spouse may be in a second marriage (obs #5).
        previously_married=sa.previously_married,
        prev_spouse_family_name=sa.prev_spouse_family_name,
        prev_spouse_given_name=sa.prev_spouse_given_name,
        prev_spouse_date_of_birth=sa.prev_spouse_date_of_birth,
        prev_relationship_type=sa.prev_relationship_type,
        prev_relationship_from=sa.prev_relationship_from,
        prev_relationship_to=sa.prev_relationship_to,
        # Current spouse = the main applicant (reciprocal, derived).
        spouse_family_name=ppi.family_name,
        spouse_given_name=ppi.given_name,
        marriage_date=parent.family.marriage_date,
        passport=sa.passport,
        # National ID / US PR card — the spouse's OWN (obs #5, was default-blank).
        national_id=sa.national_id,
        us_pr_card=sa.us_pr_card,
        mailing_address=contact.mailing_address,
        residential_address_same_as_mailing=contact.residential_address_same_as_mailing,
        residential_address=contact.residential_address,
        phone=contact.phone,
        primary_phone_type=contact.primary_phone_type,
        primary_phone_country_code=contact.primary_phone_country_code,
        primary_phone_ext=contact.primary_phone_ext,
        has_alt_phone=contact.has_alt_phone,
        alt_phone=contact.alt_phone,
        has_fax=contact.has_fax,
        fax=contact.fax,
        email=contact.email,
        education_history=sa.education_history,
        occupation_history=sa.occupation_history,
        medical_condition=sa.medical_condition,
        medical_condition_details=sa.medical_condition_details,
        previously_remained_status=sa.previously_remained_status,
        previously_applied_canada=sa.previously_applied_canada,
        previously_refused_visa=sa.previously_refused_visa,
        previously_refused_visa_details=sa.previously_refused_visa_details,
        criminal_record=sa.criminal_record,
        criminal_record_details=sa.criminal_record_details,
        military_service=sa.military_service,
        military_service_details=sa.military_service_details,
        political_party=sa.political_party,
        war_crimes=sa.war_crimes,
        consent_to_contact=sa.consent_to_contact,
        # obs #5 — the spouse signs their own 1295/5257 with their own name.
        applicant_signature=_spouse_full_name(spouse),
        applicant_signature_date=parent.applicant_signature_date,
    )


def build_spouse_imm1295_data(parent: StudyPermitData, spouse_applicant: SpouseStudyApplicant) -> Imm1295Data:
    """Open work permit path. Household contact is reused (same policy as the
    dependent-child projection); the background/history questions are the
    spouse's own (full parity, Phase G)."""
    common = _common_application_fields(parent, spouse_applicant)
    work = spouse_applicant.work or WorkDetails()
    if work.work_permit_type == "Open Work Permit":
        # Mirror the frontend hardcode (DependentSpouseStep.tsx) as a backend
        # fallback — an open work permit isn't tied to a specific job.
        work = work.model_copy(update={
            "job_title": "OPEN",
            "position_description": "OPEN",
            "intended_city_town": "",
            "intended_province_state": "",
        })
    return Imm1295Data(
        tuberculosis=spouse_applicant.tuberculosis,
        work=work,
        **common,
    )


def build_spouse_imm5257_data(parent: StudyPermitData, spouse_applicant: SpouseStudyApplicant) -> Imm5257Data:
    """Visitor visa path (IMM 5257 + Schedule 1)."""
    common = _common_application_fields(parent, spouse_applicant)
    return Imm5257Data(
        visit=spouse_applicant.visit or VisitDetails(),
        schedule1=spouse_applicant.visit_background or Imm5257Schedule1Data(),
        **common,
    )
