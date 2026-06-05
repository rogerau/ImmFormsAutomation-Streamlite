"""IMM 5646 — Custodianship Declaration (XFA-based filler)."""
from __future__ import annotations

import os
from typing import TYPE_CHECKING

from ..xfa_filler import _xml_escape as xe, fill_xfa_pdf
from .schema import ChildResidence

if TYPE_CHECKING:
    from ..study_permit.schema import StudyPermitData

TEMPLATE = os.path.join(os.path.dirname(__file__), "template", "imm5646e.pdf")

_CHILD_RESIDE_XFA_VAL = {
    ChildResidence.with_custodian: "1",
    ChildResidence.school_dormitory: "2",
    ChildResidence.with_other: "3",
}


def _full_name(family: str, given: str) -> str:
    family = (family or "").strip()
    given = (given or "").strip()
    if family and given:
        return f"{family}, {given}"
    return family or given

XFA_NS = 'xmlns:xfa="http://www.xfa.org/schema/xfa-data/1.0/"'
DG = 'xfa:dataNode="dataGroup"'


def _date_digits(date_str: str) -> str:
    """Produce 8 <d/> elements and a <theDate> for IMM 5646 date fields."""
    d = date_str.replace("-", "").ljust(8, " ")
    digits = "".join(f"<d>{xe(c)}</d>" for c in d[:8])
    return f"<iDate>{digits}</iDate><theDate>{xe(date_str)}</theDate>"


def _parent_block(
    family_name: str,
    given_names: str,
    dob: str,
    address: str,
    phone: str,
) -> str:
    return f"""<Parent>
<parentFamilyName>{xe(family_name)}</parentFamilyName>
<parentGivenNames>{xe(given_names)}</parentGivenNames>
<parentDOB>{_date_digits(dob)}</parentDOB>
<parentAddress>{xe(address)}</parentAddress>
<parentTelephone>{xe(phone)}</parentTelephone>
</Parent>"""


def build_datasets_xml(data: "StudyPermitData") -> str:
    d = data.custodian
    if not d:
        return ""

    sex_val = "1" if d.student_sex.lower().startswith("m") else "2"

    # statusGroup is an exclGroup whose items are integer "1" (Canadian citizen)
    # and "2" (Permanent resident). Writing the raw string label leaves both
    # checkboxes unticked.
    _STATUS_VAL = {"canadian citizen": "1", "permanent resident": "2"}
    status_val = _STATUS_VAL.get((d.custodian_status or "").strip().lower(), "")

    # Parent/guardian signature date is reused from the sworn date.
    parent_sig_date_iso = (
        f"{d.sworn_year}-{d.sworn_month}-{d.sworn_day}"
        if (d.sworn_year and d.sworn_month and d.sworn_day)
        else ""
    )
    parent2_sig_xml = (
        f"<parentSig2>{xe(d.parent2_signature)}</parentSig2>"
        f"<subParentSig2date>{_date_digits(parent_sig_date_iso)}</subParentSig2date>"
        if d.parent2_signature
        else "<parentSig2/><subParentSig2date><iDate><d/><d/><d/><d/><d/><d/><d/><d/></iDate><theDate/></subParentSig2date>"
    )

    # Build parent blocks (always 2)
    parent1 = _parent_block(
        d.parent1_family_name, d.parent1_given_names,
        d.parent1_dob, d.parent1_address, d.parent1_phone,
    )
    parent2 = _parent_block(
        d.parent2_family_name or "", d.parent2_given_names or "",
        d.parent2_dob or "", d.parent2_address or "", d.parent2_phone or "",
    )

    def page(page_num: int, extra_decl: str = "") -> str:
        return f"""<Page{page_num}>
<subStudentInfo>
<FamilyName>{xe(d.student_family_name)}</FamilyName>
<GivenNames>{xe(d.student_given_names)}</GivenNames>
<Citizenship>{xe(d.student_citizenship)}</Citizenship>
<DOB>{_date_digits(d.student_dob)}</DOB>
<schoolAddress>{xe(d.school_address)}</schoolAddress>
<sex><mfGroup>{sex_val}</mfGroup></sex>
<studentAddress>{xe(d.student_address)}</studentAddress>
</subStudentInfo>
<subParent>
<Banner {DG}/>
<Parents>
{parent1}
{parent2}
</Parents>
</subParent>
<subCustodian>
<FamilyName>{xe(d.custodian_family_name)}</FamilyName>
<GivenNames>{xe(d.custodian_given_names)}</GivenNames>
<subStatus><statusGroup>{status_val}</statusGroup></subStatus>
<DOB>{_date_digits(d.custodian_dob)}</DOB>
<Address>{xe(d.custodian_address)}</Address>
<Telephone>{xe(d.custodian_phone)}</Telephone>
</subCustodian>
{extra_decl}
</Page{page_num}>"""

    page1_decl = f"""<subDeclaration>
<nameCustodian>{xe(d.custodian_name_for_decl)}</nameCustodian>
<nameStudent>{xe(d.student_name_for_decl)}</nameStudent>
<swornCity>{xe(d.sworn_city)}</swornCity>
<swornProv>{xe(d.sworn_province)}</swornProv>
<swornCountry>{xe(d.sworn_country)}</swornCountry>
<swornDay>{xe(d.sworn_day)}</swornDay>
<swornMonth>{xe(d.sworn_month)}</swornMonth>
<swornYear>{xe(d.sworn_year)}</swornYear>
<parentSig1>{xe(d.custodian_name_for_decl)}</parentSig1>
<subParentSig1date>{_date_digits(parent_sig_date_iso)}</subParentSig1date>
</subDeclaration>"""

    child_reside_val = _CHILD_RESIDE_XFA_VAL.get(d.child_residence, "1")
    parent1_full = d.parent1_name_decl or _full_name(d.parent1_family_name, d.parent1_given_names)
    parent2_full = d.parent2_name_decl or _full_name(d.parent2_family_name, d.parent2_given_names)

    page2_decl = f"""<subDeclaration>
<childResideGroup>{xe(child_reside_val)}</childResideGroup>
<nameOther>{xe(d.child_residence_other_name)}</nameOther>
<nameParent1>{xe(parent1_full)}</nameParent1>
<nameParent2>{xe(parent2_full)}</nameParent2>
<nameStudent>{xe(d.student_name_for_decl)}</nameStudent>
<nameCust>{xe(d.custodian_name_for_decl)}</nameCust>
<parentSig1>{xe(d.parent_signature)}</parentSig1>
<subParentSig1date>{_date_digits(parent_sig_date_iso)}</subParentSig1date>
{parent2_sig_xml}
<swornCity>{xe(d.sworn_city)}</swornCity>
<swornProv>{xe(d.sworn_province)}</swornProv>
<swornCountry>{xe(d.sworn_country)}</swornCountry>
<swornDay>{xe(d.sworn_day)}</swornDay>
<swornMonth>{xe(d.sworn_month)}</swornMonth>
<swornYear>{xe(d.sworn_year)}</swornYear>
</subDeclaration>
<subPNS {DG}/>"""

    return f"""
<xfa:datasets {XFA_NS}>
<xfa:data>
<IMM_5646>
{page(1, page1_decl)}
{page(2, page2_decl)}
</IMM_5646>
</xfa:data>
</xfa:datasets>
"""


def fill_pdf(data: "StudyPermitData") -> bytes:
    if not os.path.exists(TEMPLATE):
        raise FileNotFoundError(f"IMM 5646 template not found: {TEMPLATE}")
    xml = build_datasets_xml(data)
    return fill_xfa_pdf(TEMPLATE, xml)
