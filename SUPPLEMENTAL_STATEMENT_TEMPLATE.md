# SUPPLEMENTAL STATEMENT — MEMORIALIZED TEMPLATE

> **DO NOT MODIFY** — This document memorializes the finalized structure, formatting,
> and template of the Supplemental Statement as approved on 2026-02-17.
> Any code changes to the Supplemental Statement section in `ClaimBuilder.tsx`
> must be reviewed against this reference to ensure compliance.

---

## 1. Header Block (Date / From / To / Subj)

| Property | Value |
|----------|-------|
| Font | Arial, 12pt |
| Line spacing | Double spaced (lineHeight: 2) |
| Alignment | Far left margin (marginLeft: 0, textIndent: 0) |
| Color | Black (#000) |
| "Date:", "From:", "To:" labels | **Bold** — values are normal weight |
| "Subj:" line | Entire line is **bold** |
| Separator | 4px solid black horizontal rule, full width |

### Format:
```
Date:    MM/DD/YYYY
From:    Veteran [Full Name] (SSN: XXX-XX-XXXX)
To:      Veteran Affairs Claims Intake Center
Subj:    Supporting Statement / Documentation For VA Form 21-526EZ Claims
─────────────────────────────────────────────────────
```

---

## 2. Introduction ("To VA Intake Center,")

| Property | Value |
|----------|-------|
| Salutation | "To VA Intake Center," — left aligned, no indent, 11pt Arial |
| Spacing after salutation | marginBottom: 1em |
| First paragraph | Indented (textIndent: 2em), 11pt Arial, 1.5 line spacing |
| Evidence toggle | If uploaded evidence exists: "I am also submitting additional evidence…"; otherwise: "This statement supports my claim(s)…" |
| Second paragraph | Indented (textIndent: 2em), 11pt Arial, 1.5 line spacing |
| PACT Act sentence | Combined into second paragraph: "…I am requesting that the following new claims be reviewed and accepted, including conditions covered under the PACT Act:" |

---

## 3. Condition Blocks (one per condition)

### Condition Heading
| Property | Value |
|----------|-------|
| Format | "Condition N: [CONDITION NAME]" |
| Font | Large (text-lg), **bold**, underline |
| Color | Black (#000) |
| Alignment | Far left margin |
| Spacing | marginTop: 2em above, marginBottom: 1.5em below |

### Subheadings (6 total)
All subheadings share these properties:

| Property | Value |
|----------|-------|
| Font size | **12pt** |
| Style | **Italic + Underline** (no bold) |
| Alignment | Far left margin (textIndent: 0, marginLeft: 0) |
| Spacing | marginTop: 1.5em, marginBottom: 0.5em |
| Color | Black (#000, inherited) |

1. **Service Connection:** — Always shown
2. **Onset:** — Shown when onsetDate is present
3. **Frequency:** — Always shown
4. **Current Symptoms:** — Shown when symptoms array is non-empty
5. **Functional Impact on Daily Life:** — Shown when dailyImpact is present
6. **Legal Framework** — Always shown

### Body Paragraphs Under Subheadings
| Property | Value |
|----------|-------|
| Font | Arial, 11pt |
| Indent | textIndent: 2em |
| Line spacing | 1.5 |
| Spacing after | marginBottom: 1.5em |
| Color | Black (#000) |
| Text align | Justify |

### Legal Framework Content
- Two paragraphs: (1) statutory citations, (2) Buchanan v. Nicholson case law
- Both justified, indented 2em, 11pt Arial
- First paragraph has marginBottom: 1em

### Closing Paragraph (Per Condition)
- "Per 38 CFR § 3.303, § 4.40, § 4.45, and § 4.59…"
- Indented 2em, 11pt Arial, marginTop: 1.5em, black

---

## 4. Conclusion / Rationale

| Property | Value |
|----------|-------|
| Heading | "Conclusion / Rationale" |
| Font | Arial, 11pt, **bold**, underline |
| Color | Black (#000) |
| Alignment | Far left margin |
| Spacing | marginTop: 2em (border-top separator), marginBottom: 1.5em |

### Body
- Two paragraphs, both indented (2em), 11pt Arial, 1.5 line spacing, marginBottom: 1.5em
- Second paragraph combines "Please accept my formal written statement…" with "If there is anything you need…" into one sentence/paragraph

---

## 5. Signature Block

| Property | Value |
|----------|-------|
| "Respectfully submitted," | Normal weight, marginTop: 2em from last paragraph |
| "Veteran [First] [Last]" | **Bold**, marginTop: 2em below "Respectfully submitted," |

---

## 6. Generated Memorandum (AI Path)

When an AI-generated memorandum exists, headings follow these rules:

| Heading Type | Style |
|-------------|-------|
| CONDITION N: … | Bold, underline, black, far left, double spaced above/below |
| CONCLUSION / RATIONALE | Bold, underline, black, far left, double spaced above/below |
| CURRENT SYMPTOMS AND FUNCTIONAL IMPAIRMENT | **Bold** (no italic), far left |
| SUPPORTING EVIDENCE CITATIONS | **Bold** (no italic), far left |
| APPLICABLE LEGAL FRAMEWORK | **Italic + Underline** (no bold), far left |
| CASE LAW PRECEDENTS | **Italic + Underline** (no bold), far left |
| REQUESTED RATING AND LEGAL ARGUMENT | **Italic + Underline** (no bold), far left |
| Body paragraphs | Indented 2em, justified |

---

## 7. Global Document Properties

| Property | Value |
|----------|-------|
| Base font | Arial, 11pt |
| Base color | Black (#000) throughout — no blue/primary color text |
| Container | space-y-6 wrapper |
| Print | border-0, padding-0, break-before-page |

---

*This template was memorialized on 2026-02-17. Do not alter without explicit approval.*
