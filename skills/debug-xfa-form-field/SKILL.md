---
name: debug-xfa-form-field
description: Use when a field is missing, blank, or wrong on a generated IRCC PDF even though the wizard collected the data correctly (e.g. "the phone number isn't showing on the 1295", "this field is blank on the generated form", "the sheet has the answer but the PDF doesn't"). Playbook for pure-XFA form fillers (imm1294, imm1295, imm5257, imm5707, ...).
---

# Debug: a field isn't rendering on a generated PDF

This project's pure-XFA forms (see `add-new-form/SKILL.md` for the AcroForm-vs-XFA
distinction) are filled by building a complete datasets XML string and injecting it
via `fill_xfa_pdf()`. Because the writer walks the XML tree with
`element.find("ChildTag")`, a wrong path doesn't raise — it just returns `None`,
the field is silently skipped, and everything upstream still looks correct. That
silence is why this bug class is so easy to miss and so common in this codebase.

**Two root-cause categories account for almost every case:**

## 1. Wrong-parent element lookup (silent `None`)

`filler.py` assumes an XML nesting structure from memory or from a similar form,
but the actual template disagrees — usually because a field that *looks* like it
belongs under a wrapper element is actually a sibling of it.

**Real example (imm1295/filler.py):** the code did
`wrap.find("BackgroundInfo2")` where `wrap = page4.find("PageWrapper")`, assuming
`BackgroundInfo2` was nested under `PageWrapper` like `BackgroundInfo3`/`Military`/
`Occupation`/`GovPosition` are. It isn't — the template has it as a direct
sibling of `PageWrapper`:
```
Page4
├─ BackgroundInfo
├─ BackgroundInfo2        <- sibling, NOT inside PageWrapper
└─ PageWrapper
   ├─ BackgroundInfo3
   ├─ Military
   ├─ Occupation
   └─ GovPosition
```
`wrap.find("BackgroundInfo2")` always returned `None`, so the whole
`if bg2 is not None:` block silently never executed — three background
questions never rendered even though the data was correct all the way through
the Python layer.

**How to catch it:** never trust the `.find()` chain from reading `filler.py`
alone. Open `backend/app/forms/<form>/template/<form>_datasets.xml` and read the
actual nesting for the target field, then compare it line-by-line against the
`.find()` calls. If a template dump doesn't exist yet, extract it the same way
`add-new-form/SKILL.md` step "Determine the PDF type first" describes.

## 2. Missing lic-code translation on a dropdown

IRCC dropdowns bind `valueRef="lic"` (see `_xfa_application_common.py`'s
`COUNTRY_LIC`/`PROVINCE_LIC`/`STATE_LIC` for the established pattern) — the saved
value must be the LOV's `lic` code, not the human-readable label. Writing the
label directly (`el.text = data.some_dropdown_field`) looks completely correct in
code review and even passes every data-flow check, but the PDF viewer won't
resolve the code to the right option.

**Real example (imm1295/filler.py):** `WorkDetails.work_permit_type` stores
labels like `"Open Work Permit"`, but the field's dropdown needs lic codes like
`"OWP"`. There was no translation table at all — `wpt.text = w.work_permit_type`
wrote the raw label every time.

**How to catch it:** before writing any dropdown-shaped field, check whether the
template dump (this form's own, or a sibling form built on the same generic
application template, e.g. imm1294 for imm1295/imm5257) has an embedded
`<...List>` element with `lic="..."` attributes (search the datasets XML for
`LOV` or `lic="`). If it does, build a `{label: lic_code}` dict near the top of
`filler.py` (mirroring `WORK_PERMIT_TYPE_LIC` in `imm1295/filler.py`) and use
`.get(value, value)` instead of writing the raw string.

## The only verification that actually proves anything

Reading `filler.py` and confirming the Python data reaches the function is **not
verification** — it only proves the value arrived, not that the XML write
succeeded. `bg2.find(...)` returning `None` looks identical from the Python data
layer's perspective whether the bug exists or not.

The one check that catches both bug classes: call the form's
`_build_datasets_xml()` (or equivalent) directly with a constructed data object,
then inspect the actual output XML around the target element.

```python
from app.forms.imm1295.schema import Imm1295Data, WorkDetails
from app.forms.imm1295 import filler as f
# ...construct a minimal-but-valid Imm1295Data with the field set...
xml_str = f._build_datasets_xml(data)
idx = xml_str.find("PhoneNumbers")   # or whatever element you're checking
print(xml_str[idx:idx + 600])
```

Grep the printed slice for the value you set. If it's there, the filler is
correct and the bug is elsewhere (see below). If it's missing/empty, you've
confirmed a real filler bug — go find the wrong `.find()` path or the missing
lic-code map.

## If the isolated XML render is correct but the live PDF still shows blank

The filler isn't the problem. Check, in this order:

1. **Stale deploy.** Railway may not have picked up the latest push yet
   (`skills/deploy-railway/SKILL.md`). Confirm the deployed commit before
   spending more time on the code.
2. **Stale frontend draft.** `StudyPermitWizard.tsx` autosaves the whole form to
   `localStorage` per case. A draft started before a field existed won't have
   that key at all when restored — the user may be looking at an old in-progress
   case rather than starting fresh after the fix shipped.
3. **The field was never actually filled in.** Confirm the required-field
   `superRefine` check in `study_permit.ts` for that field — if it's genuinely
   required, an empty submission should have been blocked with a visible error,
   not silently produced a blank PDF. If it *wasn't* blocked, that's a separate
   validation bug worth its own investigation.

## Dependent-field data-modeling checklist

A second, unrelated bug class that produces the same symptom ("field renders,
but with the wrong value"): a spouse/child field silently sourcing from the
**main applicant's** data instead of the dependent's own. Real example: spouse
phone/email/fax always read `parent.contact.*` because `SpouseStudyApplicant` had
no phone/email fields of its own at all — the IMM 1295 rendered the main
applicant's email, not the spouse's, with zero errors anywhere.

Whenever a new spouse/child-facing field is added (or when a "wrong value"
report doesn't match the wrong-parent/lic-code patterns above), check:

- [ ] Does the field exist on the dependent's own Pydantic model
      (`SpouseStudyApplicant`/`ChildStudyApplicant`), not only on the main
      applicant's?
- [ ] Does the projection function (`_spouse_contact`,
      `_common_application_fields`, `build_child_principal_data`, ...) source it
      from the dependent's own field (`sa.*`), not `parent.*`?
- [ ] Does the frontend Zod schema **and** the wizard step UI actually collect
      it — or does it just exist on the schema with nothing rendering an input
      for it (silently stays default forever)?
- [ ] Is it in the relevant Sheets header list + row builder, sourced from the
      dependent's own answer (not `data.contact.*` / the main applicant's row)?
