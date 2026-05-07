"""IMM 5707 — XFA-based PDF filler (modifies datasets XML stream)."""
from __future__ import annotations

import os
from typing import TYPE_CHECKING

from ..xfa_filler import _xml_escape as xe, yesno, fill_xfa_pdf

if TYPE_CHECKING:
    from ..study_permit.schema import StudyPermitData

TEMPLATE = os.path.join(os.path.dirname(__file__), "template", "imm5707e.pdf")

XFA_NS = 'xmlns:xfa="http://www.xfa.org/schema/xfa-data/1.0/"'
DG = 'xfa:dataNode="dataGroup"'


def _applicant_block(
    family_name: str,
    given_names: str,
    native_name: str,
    dob: str,
    cob: str,
    marital_status: str,
    occupation: str,
    married_in_person: bool | None,
) -> str:
    marriage_xml = ""
    if married_in_person is not None:
        marriage_xml = (
            f"<MarriageInPerson><MarriageInPerson>"
            f"<yesno>{yesno(married_in_person)}</yesno>"
            f"</MarriageInPerson></MarriageInPerson>"
        )
    return f"""<PaddedEntry>
<Title {DG}/>
<PersonalData>
<FamilyName>{xe(family_name)}</FamilyName>
<GivenNames>{xe(given_names)}</GivenNames>
<NativeName>{xe(native_name)}</NativeName>
</PersonalData>
<Title {DG}/>
<PersonalData>
<DOB>{xe(dob)}</DOB>
<COB>{xe(cob)}</COB>
<MaritalStatus>{xe(marital_status)}</MaritalStatus>
<Occupation>{xe(occupation)}</Occupation>
</PersonalData>
{marriage_xml}
</PaddedEntry>"""


def _person_block(
    family_name: str,
    given_names: str,
    native_name: str,
    dob: str,
    cob: str,
    address: str,
    marital_status: str,
    occupation: str,
    will_accompany: bool | None,
) -> str:
    return f"""<PaddedEntry>
<Accompanying><yesno>{yesno(will_accompany)}</yesno></Accompanying>
<Title {DG}/>
<PersonalData>
<FamilyName>{xe(family_name)}</FamilyName>
<GivenNames>{xe(given_names)}</GivenNames>
<NativeName>{xe(native_name)}</NativeName>
</PersonalData>
<Title {DG}/>
<PersonalData>
<DOB>{xe(dob)}</DOB>
<COB>{xe(cob)}</COB>
<Address>{xe(address)}</Address>
<MaritalStatus>{xe(marital_status)}</MaritalStatus>
<Occupation>{xe(occupation)}</Occupation>
</PersonalData>
</PaddedEntry>"""


def _parent_block(
    family_name: str,
    given_names: str,
    dob: str,
    cob: str,
    address: str,
    marital_status: str,
    occupation: str,
    will_accompany: bool | None,
) -> str:
    return f"""<PaddedEntry>
<Accompanying><yesno>{yesno(will_accompany)}</yesno></Accompanying>
<Title {DG}/>
<PersonalData>
<FamilyName>{xe(family_name)}</FamilyName>
<GivenNames>{xe(given_names)}</GivenNames>
<DOB>{xe(dob)}</DOB>
</PersonalData>
<Title {DG}/>
<PersonalData>
<COB>{xe(cob)}</COB>
<Address>{xe(address)}</Address>
<MaritalStatus>{xe(marital_status)}</MaritalStatus>
<Occupation>{xe(occupation)}</Occupation>
</PersonalData>
</PaddedEntry>"""


def _child_block(
    relationship: str,
    family_name: str,
    given_names: str,
    dob: str,
    cob: str,
    address: str,
    marital_status: str,
    occupation: str,
    will_accompany: bool,
) -> str:
    return f"""<Child>
<PaddedEntry>
<Accompanying><yesno>{yesno(will_accompany)}</yesno></Accompanying>
<Title {DG}/>
<PersonalData>
<Relationship>{xe(relationship)}</Relationship>
<FamilyName>{xe(family_name)}</FamilyName>
<GivenNames>{xe(given_names)}</GivenNames>
<DOB>{xe(dob)}</DOB>
</PersonalData>
<Title {DG}/>
<PersonalData>
<COB>{xe(cob)}</COB>
<Address>{xe(address)}</Address>
<MaritalStatus>{xe(marital_status)}</MaritalStatus>
<Occupation>{xe(occupation)}</Occupation>
</PersonalData>
<buttons {DG}/>
</PaddedEntry>
</Child>"""


def _empty_child() -> str:
    return f"""<Child>
<PaddedEntry>
<Accompanying><yesno/></Accompanying>
<Title {DG}/>
<PersonalData><Relationship/><FamilyName/><GivenNames/><DOB/></PersonalData>
<Title {DG}/>
<PersonalData><COB/><Address/><MaritalStatus/><Occupation/></PersonalData>
<buttons {DG}/>
</PaddedEntry>
</Child>"""


def build_datasets_xml(data: "StudyPermitData") -> str:
    pi = data.personal_info   # PersonalInfo
    f = data.family           # FamilyInfo

    ms_str = f.applicant_marital_status.value if f.applicant_marital_status else ""
    married = ms_str in (
        "Married-physically present",
        "Married-not physically present",
        "Common-law",
    )

    # Spouse block
    if f.spouse and married:
        spouse_ms = f.spouse.marital_status.value if f.spouse.marital_status else ""
        spouse_xml = f"""<Spouse>
<Relationship {DG}/>
{_person_block(
    f.spouse.family_name, f.spouse.given_names, getattr(f.spouse, "native_name", ""),
    f.spouse.date_of_birth, f.spouse.country_of_birth, f.spouse.address,
    spouse_ms, f.spouse.occupation, f.spouse.will_accompany,
)}
</Spouse>"""
    else:
        spouse_xml = f"""<Spouse>
<Relationship {DG}/>
<PaddedEntry>
<Accompanying><yesno/></Accompanying>
<Title {DG}/><PersonalData><FamilyName/><GivenNames/><NativeName/></PersonalData>
<Title {DG}/><PersonalData><DOB/><COB/><Address/><MaritalStatus/><Occupation/></PersonalData>
<MarriageInPerson><MarriageInPerson><yesno/></MarriageInPerson></MarriageInPerson>
</PaddedEntry>
</Spouse>"""

    father_ms = f.father.marital_status.value if f.father.marital_status else ""
    mother_ms = f.mother.marital_status.value if f.mother.marital_status else ""

    # Children (pad to 4)
    children_xml = ""
    for c in (f.children or [])[:4]:
        c_ms = c.marital_status.value if c.marital_status else ""
        children_xml += _child_block(
            c.relationship, c.family_name, c.given_names,
            c.date_of_birth, c.country_of_birth, c.address,
            c_ms, c.occupation, c.will_accompany,
        )
    for _ in range(4 - len(f.children or [])):
        children_xml += _empty_child()

    return f"""
<xfa:datasets {XFA_NS}>
<xfa:data>
<IMM_5707>
<page1>
<Instructions {DG}/>
<SectionA>
<Applicant>
{_applicant_block(
    pi.family_name, pi.given_name, pi.native_name,
    pi.date_of_birth, pi.place_birth_country,
    ms_str, f.applicant_occupation, f.married_in_person,
)}
</Applicant>
{spouse_xml}
<Parent1>
{_parent_block(
    f.father.family_name, f.father.given_names,
    f.father.date_of_birth, f.father.country_of_birth,
    f.father.address, father_ms, f.father.occupation,
    f.father.will_accompany,
)}
</Parent1>
<Parent2>
{_parent_block(
    f.mother.family_name, f.mother.given_names,
    f.mother.date_of_birth, f.mother.country_of_birth,
    f.mother.address, mother_ms, f.mother.occupation,
    f.mother.will_accompany,
)}
</Parent2>
<PaddedEntry>
<SectionAsignature>{xe(data.applicant_signature)}</SectionAsignature>
<SectionAdate>{xe(data.applicant_signature_date)}</SectionAdate>
</PaddedEntry>
</SectionA>
<SectionB>
<hideChildren>0</hideChildren>
{children_xml}
<Note2>
<subNote2>
<SectionBsignature>{xe(f.no_children_signature)}</SectionBsignature>
<SectionBdate>{xe(f.no_children_date)}</SectionBdate>
</subNote2>
</Note2>
</SectionB>
<SectionC>
<SectionCsignature>{xe(f.section_c_signature)}</SectionCsignature>
<SectionCdate>{xe(f.section_c_date)}</SectionCdate>
<infolinksub {DG}/>
</SectionC>
</page1>
</IMM_5707>
</xfa:data>
</xfa:datasets>
"""


def fill_pdf(data: "StudyPermitData") -> bytes:
    if not os.path.exists(TEMPLATE):
        raise FileNotFoundError(f"IMM 5707 template not found: {TEMPLATE}")
    xml = build_datasets_xml(data)
    return fill_xfa_pdf(TEMPLATE, xml)
