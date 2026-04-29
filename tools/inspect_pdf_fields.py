"""Dump the AcroForm field map of an IRCC PDF.

Usage:
    python tools/inspect_pdf_fields.py <path/to/imm_xxxx.pdf>

Run this when adding a new form. The output is the input you need to write a
new build_field_dict() in backend/app/forms/<form>/filler.py.

Quirks the script will tell you about:
  - Empty-password encryption (run pikepdf to strip)
  - Radio-button "on" state (e.g. /1 vs /Yes)
  - Dropdown export values
"""
from __future__ import annotations

import sys
from pathlib import Path

import pikepdf
from pypdf import PdfReader


def main(pdf_path: str) -> None:
    p = Path(pdf_path)
    if not p.exists():
        sys.exit(f"Not found: {p}")

    # Strip encryption to a sibling _unenc.pdf so pypdf can clone safely.
    unenc = p.with_name(p.stem + "_unenc.pdf")
    with pikepdf.open(str(p)) as pdf:
        encrypted = pdf.is_encrypted
        pdf.save(str(unenc))
    print(f"# encrypted: {encrypted}; cleaned copy: {unenc}")

    r = PdfReader(str(unenc))
    fields = r.get_fields() or {}
    print(f"# total fields: {len(fields)}\n")

    for name, f in fields.items():
        ft = f.get("/FT")
        v = f.get("/V")
        states = f.get("/_States_")
        line = f"{name}\t{ft}\t{v!r}"
        if states:
            line += f"\tstates={list(states)}"
        print(line)

    # Walk widgets to surface dropdown /Opt values.
    print("\n# dropdown options (/Opt):")
    for page in r.pages:
        for a in page.get("/Annots") or []:
            ao = a.get_object()
            if ao.get("/FT") != "/Ch" and ao.get("/Parent", {}).get("/FT") != "/Ch":
                continue
            opt = ao.get("/Opt") or (ao.get("/Parent", {}).get("/Opt") if ao.get("/Parent") else None)
            if not opt:
                continue
            t = ao.get("/T", "")
            print(f"  {t}: {opt}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("Usage: python tools/inspect_pdf_fields.py <pdf_path>")
    main(sys.argv[1])
