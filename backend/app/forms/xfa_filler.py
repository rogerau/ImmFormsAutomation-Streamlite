"""Shared utility for filling IRCC pure-XFA PDF forms via datasets XML injection."""
from __future__ import annotations

import io
import zlib

import pikepdf


def _xml_escape(val: object) -> str:
    s = str(val) if val is not None else ""
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


def yesno(val: bool | None) -> str:
    """IMM 5707 exclGroup items are integer 1 (YES) and integer 2 (NO).
    "0" matches neither and leaves both checkboxes unticked, so always return
    the exact item value. Return "" when val is None so the radio stays empty.
    """
    if val is True:
        return "1"
    if val is False:
        return "2"
    return ""


def fill_xfa_pdf(
    template_path: str,
    new_datasets_xml: str,
    template_xml_transform=None,
) -> bytes:
    """
    Replace the XFA datasets stream in an IRCC PDF and return filled PDF bytes.
    Works for pure-XFA forms (0 AcroForm fields) like IMM 5707, IMM 1294, IMM 5646.

    Optionally also rewrite the template stream via `template_xml_transform`
    (a callable taking the decompressed template XML and returning the
    modified XML). Use this for fields whose default presence must change to
    accommodate pre-filled data (e.g. IMM 1294's NANumber subforms, which are
    invisible by template default and only become visible when the user clicks
    the CanadaUS checkbox at runtime).

    Note on compression: pikepdf's Stream.write(data, filter=FlateDecode) declares
    the data as already-flate-encoded — it does NOT compress for you. We must
    zlib.compress the XML ourselves before writing, otherwise Adobe finds the
    /Filter /FlateDecode declaration but raw uncompressed bytes, fails to decode,
    and gets stuck on the IRCC "Please wait..." fallback page.
    """
    with pikepdf.open(template_path, password="") as pdf:
        acroform = pdf.Root.AcroForm
        xfa_array = acroform.XFA

        # XFA is an alternating array: [name_str, stream_obj, ...]
        items = list(xfa_array)
        for i in range(0, len(items) - 1, 2):
            key = str(items[i])
            stream_obj = items[i + 1]
            if key == "datasets":
                compressed = zlib.compress(new_datasets_xml.encode("utf-8"))
                stream_obj.write(compressed, filter=pikepdf.Name.FlateDecode)
            elif key == "template" and template_xml_transform is not None:
                raw = bytes(stream_obj.read_raw_bytes())
                template_xml = zlib.decompress(raw).decode("utf-8", errors="replace")
                new_template_xml = template_xml_transform(template_xml)
                if new_template_xml != template_xml:
                    compressed = zlib.compress(new_template_xml.encode("utf-8"))
                    stream_obj.write(compressed, filter=pikepdf.Name.FlateDecode)

        buf = io.BytesIO()
        pdf.save(buf)
        return buf.getvalue()
