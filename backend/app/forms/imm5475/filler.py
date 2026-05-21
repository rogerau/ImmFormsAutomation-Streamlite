"""IMM 5475 — Authority to Release Personal Information filler.

Drop the IRCC IMM 5475 PDF at template/imm5475e.pdf and an unencrypted copy at
template/imm5475e_unenc.pdf. Until those files exist this filler raises a
clear error so the rest of the bundle can still be generated.
"""
from __future__ import annotations

import os
import zlib
from typing import TYPE_CHECKING
from xml.etree import ElementTree as ET

import pikepdf

from ..xfa_filler import fill_xfa_pdf

if TYPE_CHECKING:
    from .schema import Imm5475Data

TEMPLATE = os.path.join(os.path.dirname(__file__), "template", "imm5475e.pdf")
UNENC = os.path.join(os.path.dirname(__file__), "template", "imm5475e_unenc.pdf")
XFA_NS = "http://www.xfa.org/schema/xfa-data/1.0/"


def _get_raw_datasets(pdf_path: str) -> bytes:
    with pikepdf.open(pdf_path) as pdf:
        xfa = list(pdf.Root.AcroForm.XFA)
        for i in range(0, len(xfa) - 1, 2):
            if str(xfa[i]) == "datasets":
                return bytes(xfa[i + 1].read_raw_bytes())
    raise ValueError("datasets stream not found in IMM 5475 PDF")


def _build_datasets_xml(data: "Imm5475Data", applicant_data: dict) -> str:
    """Build the modified datasets XML.

    `applicant_data` is a flat dict of applicant identity fields read from the
    master StudyPermitData — e.g. family_name, given_name, dob, uci, signature,
    signed_date — so we don't ask the IMM 5475 schema to duplicate them.

    The exact XFA paths are discovered after the IRCC template ships; for now
    we do a best-effort generic write that the path-discovery pass will refine.
    """
    raw = _get_raw_datasets(UNENC)
    xml_str = zlib.decompress(raw).decode("utf-8", errors="replace")
    ET.register_namespace("xfa", XFA_NS)
    root = ET.fromstring(xml_str)
    # TODO: discover XFA paths from template/imm5475_datasets.xml after PDF is
    # committed and wire applicant + designated-individual fields here.
    return ET.tostring(root, encoding="unicode", xml_declaration=False)


def fill_pdf(data: "Imm5475Data", applicant_data: dict) -> bytes:
    if not (os.path.exists(TEMPLATE) and os.path.exists(UNENC)):
        raise FileNotFoundError(
            "IMM 5475 template not present. Drop imm5475e.pdf and "
            "imm5475e_unenc.pdf at backend/app/forms/imm5475/template/ to "
            "enable filling.",
        )
    xml_str = _build_datasets_xml(data, applicant_data)
    return fill_xfa_pdf(TEMPLATE, xml_str)
