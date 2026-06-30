"""Shared helpers for the generic-IRCC-application family of pure-XFA forms
(IMM 1294, IMM 1295, IMM 5257, ...). These forms share the same PersonalDetails /
MaritalStatus / Passport / natID / USCard / ContactInformation field-path layout,
so the pure (data-agnostic) XML-navigation and LOV-lookup helpers live here once
instead of being copy-pasted per form.

Originally written for `imm1294/filler.py`. That file is intentionally left
untouched (it's a shipped, production filler) — this module is for new fillers
(imm1295, imm5257) to import from.
"""
from __future__ import annotations

import os
from xml.etree import ElementTree as ET

import pikepdf

XFA_NS = "http://www.xfa.org/schema/xfa-data/1.0/"

# IRCC dropdown LOV codes. Dropdowns bind `valueRef="lic"` so the saved value
# must be the lic code, not the human-readable label. ProvinceState fields also
# trigger setProvinceBasedOnCountry which only populates Canadian provinces /
# US states when Country.rawValue == "511" (Canada) or "461" (USA).
COUNTRY_LIC = {
    "canada": "511", "ca": "511",
    "united states": "461", "united states of america": "461",
    "usa": "461", "us": "461", "u.s.a.": "461", "u.s.": "461", "america": "461",
}

PROVINCE_LIC = {
    "ab": "09", "bc": "11", "mb": "07", "nb": "04", "nl": "01",
    "ns": "03", "nt": "10", "nu": "64", "on": "06", "pe": "02",
    "qc": "05", "sk": "08", "yt": "12",
}

STATE_LIC = {
    "al": "13", "ak": "14", "az": "15", "ar": "16", "ca": "17", "co": "18",
    "ct": "19", "de": "20", "dc": "21", "fl": "22", "ga": "23", "hi": "24",
    "id": "25", "il": "26", "in": "27", "ia": "28", "ks": "29", "ky": "30",
    "la": "31", "me": "32", "md": "33", "ma": "34", "mi": "35", "mn": "36",
    "ms": "37", "mo": "38", "mt": "39", "ne": "40", "nv": "41", "nh": "42",
    "nj": "43", "nm": "44", "ny": "45", "nc": "46", "nd": "47", "oh": "48",
    "ok": "49", "or": "50", "pa": "51", "ri": "52", "sc": "53", "sd": "54",
    "tn": "55", "tx": "56", "ut": "57", "vt": "58", "va": "59", "wa": "60",
    "wv": "61", "wi": "62", "wy": "63", "as": "66", "fm": "67", "gu": "68",
    "mh": "69", "mp": "70", "pw": "71", "vi": "72", "pr": "PR",
}

# Frontend province/state inputs are free text (no dropdown), so users type
# full names ("Ontario") as often as abbreviations ("ON"). Normalize both to
# the 2-letter abbreviation before any LOV lookup.
PROVINCE_FULLNAME_TO_ABBR = {
    "alberta": "ab", "british columbia": "bc", "manitoba": "mb",
    "new brunswick": "nb", "newfoundland and labrador": "nl",
    "newfoundland": "nl", "labrador": "nl", "nova scotia": "ns",
    "northwest territories": "nt", "nunavut": "nu", "ontario": "on",
    "prince edward island": "pe", "quebec": "qc", "québec": "qc",
    "saskatchewan": "sk", "yukon": "yt", "yukon territory": "yt",
}

STATE_FULLNAME_TO_ABBR = {
    "alabama": "al", "alaska": "ak", "arizona": "az", "arkansas": "ar",
    "california": "ca", "colorado": "co", "connecticut": "ct",
    "delaware": "de", "district of columbia": "dc", "florida": "fl",
    "georgia": "ga", "hawaii": "hi", "idaho": "id", "illinois": "il",
    "indiana": "in", "iowa": "ia", "kansas": "ks", "kentucky": "ky",
    "louisiana": "la", "maine": "me", "maryland": "md",
    "massachusetts": "ma", "michigan": "mi", "minnesota": "mn",
    "mississippi": "ms", "missouri": "mo", "montana": "mt",
    "nebraska": "ne", "nevada": "nv", "new hampshire": "nh",
    "new jersey": "nj", "new mexico": "nm", "new york": "ny",
    "north carolina": "nc", "north dakota": "nd", "ohio": "oh",
    "oklahoma": "ok", "oregon": "or", "pennsylvania": "pa",
    "rhode island": "ri", "south carolina": "sc", "south dakota": "sd",
    "tennessee": "tn", "texas": "tx", "utah": "ut", "vermont": "vt",
    "virginia": "va", "washington": "wa", "west virginia": "wv",
    "wisconsin": "wi", "wyoming": "wy", "american samoa": "as",
    "federated states of micronesia": "fm", "guam": "gu",
    "marshall islands": "mh", "northern mariana islands": "mp",
    "palau": "pw", "virgin islands": "vi", "puerto rico": "pr",
}


def country_lic(name: str) -> str:
    """Return LOV lic code for a country name, or the original text if unknown."""
    if not name:
        return ""
    return COUNTRY_LIC.get(name.strip().lower(), name)


def province_abbrev(country: str, prov: str) -> str:
    """Normalize a free-text province/state (full name or abbreviation) to its
    2-letter abbreviation. Returns "" for empty input or non-CA/US countries."""
    if not prov:
        return ""
    c = (country or "").strip().lower()
    p = prov.strip().lower()
    if c in ("canada", "ca"):
        return p if p in PROVINCE_LIC else PROVINCE_FULLNAME_TO_ABBR.get(p, "")
    if c in ("united states", "united states of america", "usa", "us",
             "u.s.a.", "u.s.", "america"):
        return p if p in STATE_LIC else STATE_FULLNAME_TO_ABBR.get(p, "")
    return ""


def province_lic(country: str, prov: str) -> str:
    """Return ProvinceAbbrev/StateAbbrev lic code for Canadian provinces / US
    states. Returns empty when the country isn't Canada or USA — those fields
    are blocked out by the form's design."""
    abbr = province_abbrev(country, prov)
    if not abbr:
        return ""
    c = (country or "").strip().lower()
    if c in ("canada", "ca"):
        return PROVINCE_LIC.get(abbr, "")
    return STATE_LIC.get(abbr, "")


def city_lic(datasets_root: ET.Element, prov_abbrev: str, city: str) -> str:
    """Look up the IRCC city-LOV `lic` code for a city/town within a given
    Canadian province, when the form's CityTown field is a closed choiceList
    bound to CityList.<ProvinceAbbrev>.City[*]. Returns "" if there's no exact
    (case-insensitive) match in the list."""
    if not prov_abbrev or not city:
        return ""
    lov = datasets_root.find("LOVFile")
    lov = lov.find("LOV") if lov is not None else None
    city_list = lov.find("CityList") if lov is not None else None
    if city_list is None:
        return ""
    prov_el = city_list.find(prov_abbrev.upper())
    if prov_el is None:
        return ""
    needle = city.strip().lower()
    for c in prov_el.findall("City"):
        if (c.text or "").strip().lower() == needle:
            return c.get("lic", "")
    return ""


def get_raw_datasets(pdf_path: str) -> bytes:
    """Return the raw (compressed) bytes of the XFA datasets stream."""
    with pikepdf.open(pdf_path) as pdf:
        xfa_array = list(pdf.Root.AcroForm.XFA)
        for i in range(0, len(xfa_array) - 1, 2):
            if str(xfa_array[i]) == "datasets":
                return bytes(xfa_array[i + 1].read_raw_bytes())
    raise ValueError(f"datasets stream not found in {pdf_path}")


def normalize_postal(code: str, country: str) -> str:
    """Canadian postal codes must be formatted "A1A 1A1" (with space) for IRCC's
    JavaScript validator. Insert the space if missing. Leave non-Canadian codes
    (US ZIPs, etc.) untouched."""
    if not code or not country:
        return code or ""
    if country.strip().lower() not in ("canada", "ca"):
        return code
    s = code.replace(" ", "").upper()
    if len(s) == 6 and s[0].isalpha() and s[1].isdigit() and s[2].isalpha() and s[3].isdigit() and s[4].isalpha() and s[5].isdigit():
        return f"{s[:3]} {s[3:]}"
    return code


def find(root: ET.Element, *tags: str) -> ET.Element | None:
    """Walk through a sequence of child tags and return the final node or None."""
    node = root
    for tag in tags:
        child = node.find(tag)
        if child is None:
            return None
        node = child
    return node


def set_path(root: ET.Element, *tags_and_value: str) -> None:
    """Set element text by navigating a sequence of child tags. Last arg is value."""
    *tags, value = tags_and_value
    node = root
    for tag in tags:
        child = node.find(tag)
        if child is None:
            return
        node = child
    node.text = value


def split_date(date_str: str) -> tuple[str, str, str]:
    """Return (year, month, day) from 'YYYY-MM-DD' or empty triple."""
    parts = (date_str or "").split("-")
    parts = parts + ["", "", ""]
    return parts[0], parts[1], parts[2]


def history_sort_key(entry) -> tuple[int, int]:
    """Chronological sort key (oldest first) for occupation/education entries.
    Clients can fill these out in any order — don't trust submission order."""
    try:
        year = int(entry.from_year)
    except (TypeError, ValueError):
        year = 0
    try:
        month = int(entry.from_month)
    except (TypeError, ValueError):
        month = 0
    return (year, month)


def is_na_phone(country_code: str, number: str = "") -> bool:
    """Heuristic: a phone is North American when the country code is 1 (or blank)."""
    cc = (country_code or "").lstrip("+").strip()
    return cc in ("1", "")


def fill_phone(phone_el, full_number: str, type_str: str = "",
               country_code: str = "", ext: str = "") -> None:
    """Fill a Phone/AltPhone/FaxEmail-Phone subform with parsed values.
    Handles CanadaUS / Other / NumberCountry / NANumber breakdown and IntlNumber.
    Always sets ActualNumber as a fallback."""
    if phone_el is None or not (full_number or country_code):
        return
    digits = "".join(c for c in (full_number or "") if c.isdigit())
    is_na = (country_code or "").lstrip("+") in ("1", "")
    if is_na and (len(digits) >= 11 and digits.startswith("1")):
        digits = digits[1:]
    if is_na and len(digits) == 10:
        area, first3, last5 = digits[:3], digits[3:6], digits[6:10]
        for tag, val in [("CanadaUS", "1"), ("Other", "0"), ("NumberCountry", "1")]:
            el = phone_el.find(tag)
            if el is not None:
                el.text = val
        na = phone_el.find("NANumber")
        if na is not None:
            for tag, val in [("AreaCode", area), ("FirstThree", first3), ("LastFive", last5)]:
                el = na.find(tag)
                if el is not None:
                    el.text = val
        actual_value = area + first3 + last5
    else:
        for tag, val in [("CanadaUS", "0"), ("Other", "1"), ("NumberCountry", (country_code or "").lstrip("+"))]:
            el = phone_el.find(tag)
            if el is not None:
                el.text = val
        intl = phone_el.find("IntlNumber")
        if intl is not None:
            inner = intl.find("IntlNumber")
            if inner is not None:
                inner.text = digits
        actual_value = digits
    actual = phone_el.find("ActualNumber")
    if actual is not None:
        actual.text = actual_value
    if type_str:
        t = phone_el.find("Type")
        if t is not None:
            t.text = type_str
    if ext:
        ne = phone_el.find("NumberExt")
        if ne is not None:
            ne.text = ext


def fill_residence_row(row_el, residence, date_parts_el=None) -> None:
    """Fill a CurrentCOR/PreviousCOR/CountryWhereApplying Row with one residence."""
    if row_el is None or residence is None:
        return
    for tag, val in [
        ("Country", residence.country),
        ("Status", residence.status or ""),
        ("Other", residence.status_other or ""),
        ("FromDate", residence.from_date),
        ("ToDate", residence.to_date),
    ]:
        el = row_el.find(tag)
        if el is not None:
            el.text = val
    if date_parts_el is not None:
        fy, fm, fd = split_date(residence.from_date)
        ty, tm, td = split_date(residence.to_date)
        for tag, val in [
            ("FromYr", fy), ("FromMM", fm), ("FromDD", fd),
            ("ToYr", ty), ("ToMM", tm), ("ToDD", td),
        ]:
            el = date_parts_el.find(tag)
            if el is not None:
                el.text = val
