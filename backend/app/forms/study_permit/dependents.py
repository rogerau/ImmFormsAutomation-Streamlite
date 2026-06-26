"""Dependant form generation — child-as-principal projection (Phase X, Phase 1).

When a study-permit applicant has a school-age (K-12) minor child who is also
filing their OWN study permit, we generate that child's IMM 1294 (+ IMM 5707,
+ IMM 5646 when unaccompanied). Rather than rewrite the large IMM 1294 / IMM 5707
fillers (which read the *main* applicant off StudyPermitData), this module
synthesizes a StudyPermitData in which the **child is the principal**, reusing
the parent's already-captured data wherever IRCC asks for the same fact, so the
existing fillers run unchanged.

Reuse policy (see the 'keep the online form simple / no duplication' rule):
  - child name / DOB / native name / country of birth / address  -> from the
    child entry the parent already filled on IMM 5707;
  - contact (household address, phone, email), citizenship, current country,
    funding, service language  -> inherited from the parent;
  - the child's parents on *their* IMM 5707  -> the main applicant + spouse
    (NOT the main applicant's own parents — that is the one non-obvious remap);
  - signatures  -> the parent signs on the minor's behalf.
Only sex / place of birth city / passport / study details are genuinely
child-specific and collected in the wizard's Dependent Children step.
"""
from __future__ import annotations

from copy import deepcopy

from ..imm1294.schema import Imm1294Address, Imm1294Passport, Imm1294StudyDetails, Sex
from ..imm5707.schema import MaritalStatus, Parent5707, ParentStatus, Person5707
from .schema import ChildEntry, FamilyInfo, PersonalInfo, StudyPermitData


def _format_address(addr: Imm1294Address | None) -> str:
    """Flatten the structured mailing address into the single free-text line the
    IMM 5707 person/parent blocks expect."""
    if addr is None:
        return ""
    street = " ".join(p for p in [addr.street_number, addr.street_name] if p).strip()
    if addr.unit:
        street = f"{addr.unit}-{street}" if street else addr.unit
    locality = ", ".join(
        p for p in [addr.city, addr.province_state, addr.postal_code] if p
    )
    return ", ".join(p for p in [street, locality, addr.country] if p)


def _main_applicant_as_parent(parent: StudyPermitData) -> Parent5707:
    """The study-permit applicant, projected as one of the child's parents."""
    pi = parent.personal_info
    return Parent5707(
        family_name=pi.family_name,
        given_names=pi.given_name,
        native_name=pi.native_name,
        date_of_birth=pi.date_of_birth,
        country_of_birth=pi.place_birth_country,
        address=_format_address(parent.contact.mailing_address),
        occupation=parent.family.applicant_occupation,
        marital_status=parent.family.applicant_marital_status,
        will_accompany=True,  # the principal applicant is the one studying in Canada
        status=ParentStatus.living,
    )


def _spouse_as_parent(spouse: Person5707 | None) -> Parent5707:
    """The applicant's spouse/partner, projected as the child's other parent.
    Returns a blank parent when there is no spouse (single-parent family)."""
    if spouse is None:
        return Parent5707(
            family_name="", given_names="", date_of_birth="",
            country_of_birth="", address="", occupation="",
            status=ParentStatus.living,
        )
    return Parent5707(
        family_name=spouse.family_name,
        given_names=spouse.given_names,
        native_name=getattr(spouse, "native_name", ""),
        date_of_birth=spouse.date_of_birth,
        country_of_birth=spouse.country_of_birth,
        address=spouse.address,
        occupation=spouse.occupation,
        marital_status=spouse.marital_status,
        will_accompany=spouse.will_accompany,
        status=ParentStatus.living,
    )


def build_child_principal_data(parent: StudyPermitData, child: ChildEntry) -> StudyPermitData:
    """Project a StudyPermitData in which `child` is the principal applicant, so
    the existing IMM 1294 / IMM 5707 (/ IMM 5646) fillers can fill the child's
    own forms. Raises ValueError if the child lacks the minimal applicant data."""
    sa = child.study_applicant
    if sa is None or sa.passport is None or sa.study is None:
        raise ValueError(
            f"Child {child.given_names} {child.family_name} is flagged "
            "applying_study_permit but is missing passport/study details."
        )

    ppi = parent.personal_info

    # --- Parent remap: assign main applicant + spouse to father/mother by the
    # main applicant's sex. Same-sex / single-parent families fall back to a
    # best-effort default; a licensed rep should review those before filing. ---
    self_parent = _main_applicant_as_parent(parent)
    spouse_parent = _spouse_as_parent(parent.family.spouse)
    if ppi.sex == Sex.female:
        father, mother = spouse_parent, self_parent
    else:
        father, mother = self_parent, spouse_parent

    sign = parent.applicant_signature
    sign_date = parent.applicant_signature_date

    child_personal = PersonalInfo(
        family_name=child.family_name,
        given_name=child.given_names,
        native_name=child.native_name,
        sex=sa.sex or ppi.sex,
        date_of_birth=child.date_of_birth,
        place_birth_city=sa.place_birth_city,
        place_birth_country=child.country_of_birth,
        citizenship=sa.citizenship or ppi.citizenship,
        current_country=sa.current_country or ppi.current_country,
        service_in=ppi.service_in,
    )

    child_family = FamilyInfo(
        applicant_marital_status=child.marital_status,
        applicant_occupation=child.occupation,
        spouse=None,
        no_spouse_signature=sign,
        no_spouse_date=sign_date,
        father=father,
        mother=mother,
        section_a_signature=sign,
        section_a_date=sign_date,
        children=[],                      # a minor child has no children of their own
        no_children_signature=sign,
        no_children_date=sign_date,
        section_c_signature=sign,
        section_c_date=sign_date,
    )

    return StudyPermitData(
        case_id=parent.case_id,
        submission_id=parent.submission_id,
        optional_forms=[],                # the child bundle does not recurse
        personal_info=child_personal,
        passport=sa.passport,
        contact=deepcopy(parent.contact),  # same household
        study=sa.study,
        family=child_family,
        consent_to_contact=parent.consent_to_contact,
        applicant_signature=sign,          # the parent signs for the minor
        applicant_signature_date=sign_date,
        # NB: an unaccompanied child's custodian declaration (IMM 5646) is NOT
        # generated here — it needs the Canadian custodian's details, collected
        # separately. The child is flagged 'unaccompanied' in the Children sheet.
    )
