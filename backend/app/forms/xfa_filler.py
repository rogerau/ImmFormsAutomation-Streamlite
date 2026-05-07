"""Shared utility for filling IRCC pure-XFA PDF forms via datasets XML injection."""
from __future__ import annotations

import io

import pikepdf


def _xml_escape(val: object) -> str:
    s = str(val) if val is not None else ""
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


def yesno(val: bool | None) -> str:
    return "1" if val else "0"


def fill_xfa_pdf(template_path: str, new_datasets_xml: str) -> bytes:
    """
    Replace the XFA datasets stream in an IRCC PDF and return filled PDF bytes.
    Works for pure-XFA forms (0 AcroForm fields) like IMM 5707, IMM 1294, IMM 5646.
    """
    with pikepdf.open(template_path, password="") as pdf:
        acroform = pdf.Root.AcroForm
        xfa_array = acroform.XFA

        # XFA is an alternating array: [name_str, stream_obj, ...]
        items = list(xfa_array)
        for i in range(0, len(items) - 1, 2):
            if str(items[i]) == "datasets":
                stream_obj = items[i + 1]
                # Write uncompressed XML; pikepdf compresses with FlateDecode
                raw_xml = new_datasets_xml.encode("utf-8")
                stream_obj.write(raw_xml, filter=pikepdf.Name.FlateDecode)
                break

        buf = io.BytesIO()
        pdf.save(buf)
        return buf.getvalue()
