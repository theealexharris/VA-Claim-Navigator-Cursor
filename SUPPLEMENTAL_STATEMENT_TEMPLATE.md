# Supplemental Statement — Frozen & Memorialized Template

> **STATUS: FROZEN — DO NOT MODIFY**
>
> This document is the single source of truth for the Supporting Statement / Documentation
> For VA Form 21-526EZ as rendered in the VA Claim Navigator. The live implementation is
> in `client/src/pages/ClaimBuilder.tsx` between the `FROZEN-SUPPLEMENTAL-START` and
> `FROZEN-SUPPLEMENTAL-END` guard markers.
>
> **Any change to the supplemental statement code MUST be reflected here and vice versa.**
> **Do not add, remove, or restyle elements unless explicitly requested by the product owner.**

---

## 1. Framework & Purpose

- **Legal basis:** VA Title 38 U.S.C. 1151; 38 U.S.C. §§ 1110, 1131; 38 CFR Part 3 and Part 4; 38 C.F.R. § 3.102; *Buchanan v. Nicholson*, 451 F.3d 1334 (Fed. Cir. 2006).
- **Form:** Supporting documentation for **VA Form 21-526EZ** (Application for Disability Compensation and Related Compensation Benefits).
- **Intent:** Formal written statement plus evidence submitted to the VA Evidence Intake Center to support service-connected disability claims, including PACT Act–related conditions.

---

## 2. Document Structure (Order of Sections)

1. **Memorandum header** — Date, From, To, Subj (bold + underlined). No horizontal rule.
2. **Salutation** — "To VA Intake Center," (no extra spacing before first paragraph)
3. **Introduction** — Two paragraphs (veteran identity/service connection, request to review conditions)
4. **Conditions detail** — For each condition (see Section 3.4)
5. **Conclusion / Rationale** — Bold underlined heading; two paragraphs (evidence standard, contact info)
6. **Signature block** — "Respectfully submitted," then "Veteran [FirstName] [LastName]"
7. **Supportive Evidence/Exhibits For Claims** (if evidence attached) — New page; numbered list of documents
8. **End of Claim Package** — "End of Claim Package," total evidence count

---

## 3. Statement Template by Section

### 3.1 Memorandum Header

- **Font:** Arial 12pt, double-spaced (lineHeight: 2)
- **Alignment:** Left
- **Date:** `[current date MM/DD/YYYY]` — label **bold**, value not bold
- **From:** `Veteran [Full Name] (SSN: [XXX-XX-XXXX])` — label **bold**, value not bold
- **To:** `Veteran Affairs Claims Intake Center` — label **bold**, value not bold
- **Subj:** `Supporting Statement / Documentation For VA Form 21-526EZ Claims` — entire line **bold** AND **underlined**
- **NO horizontal rule/divider after Subj line**

---

### 3.2 Salutation

- **Text:** `To VA Intake Center,`
- **Font:** Arial 11pt, lineHeight 1.5
- **Margins:** marginTop 0, marginBottom 0 (flush with first paragraph — NO gap/line)
- **No bold, no border, no box-shadow**

---

### 3.3 Introduction

- **Paragraph 1 (indented 2em):**
  `I [Full Name] ([NameCode]), am filing the following statement in connection with my claims for Military Service-Connected benefits per VA Title 38 U.S.C. 1151. [Evidence sentence]. ([Branch]), as Primary and/or Secondary injuries/illness as a direct result of my Military service and hazardous conditions/exposures. Based on the totality of the circumstances, a service connection to my military service has been established per VA Title 38 U.S.C. 1151.`
  - *[NameCode] = LastInitial + last 4 SSN*
  - *[Branch] = branch of service from profile*
  - *[Evidence sentence]: If evidence uploaded: "I am also submitting additional evidence that supports my claim(s) to be valid, true and associated with my Active Military Service". Otherwise: "This statement supports my claim(s) to be valid, true and associated with my Active Military Service"*

- **Paragraph 2 (indented 2em, marginTop 1em):**
  `These conditions should have already been accepted and "presumptively" approved by the VA Executive Administration once discharged from Active Duty. Thus, the VA failed to "service connect" my injuries upon discharge of my Military service which is no fault of mine (the Veteran). I am requesting that the following new claims be reviewed and accepted, including conditions covered under the PACT Act:`

- **Font:** Arial 11pt, lineHeight 1.5, text-align justify

---

### 3.4 Conditions Detail (Per Condition)

- **Spacing:** marginTop 2em, marginBottom 2em per condition block
- **Condition heading:** `Condition [N]: [CONDITION NAME]` — **bold + underline**, text-lg, left-aligned, marginBottom 1.5em

**Subheadings (italic + underline, not bold):**

| Subheading | Content |
|---|---|
| **Service Connection:** | Direct: `This condition is directly related to my active duty service and began during my time in service.` Secondary: `This condition developed as a secondary condition resulting from my existing service-connected disability.` If presumptive: append ` This condition qualifies for presumptive service connection under the PACT Act provisions.` |
| **Onset:** | `Symptoms first manifested on or around [onsetDate].` *(Only if onset date exists)* |
| **Frequency:** | `Symptoms occur on a [frequency] basis.` |
| **Current Symptoms:** | `[symptoms list].` *(Only if symptoms selected)* |
| **Functional Impact on Daily Life:** | `[dailyImpact]` *(Only if dailyImpact text exists)* |
| **Legal Framework** | Two fixed paragraphs (see below). Subheading italic + underline. |

**Legal Framework paragraphs (fixed text — do not alter):**

1. Service connection and compensation for disability are governed by 38 U.S.C. §§ 1110 and 1131 and implementing regulations at 38 CFR Part 3 and Part 4. Under 38 CFR § 3.303(a), service connection may be established by evidence of continuity of symptomatology or by medical nexus. Under 38 CFR § 4.1 and § 4.10, disability ratings are based on the average impairment of earning capacity and the functional effects of the disability. The VA must consider all evidence of record and resolve reasonable doubt in the veteran's favor under 38 U.S.C. § 5107(b).

2. In *Buchanan v. Nicholson*, 451 F.3d 1334 (Fed. Cir. 2006), the Federal Circuit held that when the evidence is in relative equipoise, the benefit of the doubt must go to the veteran and the claim must be granted. The court reaffirmed that the "at least as likely as not" standard in 38 C.F.R. § 3.102 requires the VA to grant the claim when the evidence for and against service connection is evenly balanced. This standard applies to the evaluation of the conditions set forth in this supporting statement.

**Closing line (per condition, indented 2em, marginTop 1.5em):**
`Per 38 CFR § 3.303, § 4.40, § 4.45, and § 4.59, the functional limitations caused by this condition warrant service connection and appropriate rating consideration.`

- **Subheading style:** italic + underline, 11pt Arial, marginTop 1.5em, marginBottom 0.5em
- **Body text style:** indented 2em, lineHeight 1.5, 11pt Arial, marginBottom 1.5em

---

### 3.5 Conclusion / Rationale

- **Heading:** `Conclusion / Rationale` — **bold + underline**, left-aligned, 11pt Arial
- **Border:** border-top, padding-top 2, marginTop 2em
- **Paragraph 1 (indented 2em):**
  `The evidence provided has proven that it is at least as likely as not (more likely than not), that my reported and documented medical conditions are directly related to events and/or exposure due to Active Military service. The medical evidence from my service records shows I have injuries and subsequent pain, which were are all direct causes of my active-duty service. All medical issues were present and existed within the first year after being discharged from active duty to present.`
- **Paragraph 2 (indented 2em):**
  `Please accept my formal written statement and evidence as proof of accepted VA claims. If there is anything you need or would like to talk to me about, please get in touch with me at [phone] or via personal email at: [email].`

---

### 3.6 Signature Block

- `Respectfully submitted,`
- *(blank space for signature — marginTop 2em)*
- `Veteran [FirstName] [LastName]` — **bold**
- **Font:** Arial 11pt, lineHeight 1.5

---

### 3.7 Supportive Evidence/Exhibits For Claims

- **When:** Only if at least one uploaded, print-enabled evidence document exists.
- **Page:** New page (print break before). border-top-2 border-black, marginTop 8.
- **Heading:** `Supportive Evidence/Exhibits For Claims` — italic, uppercase, centered, text-xl
- **Preponderance note (italic, centered, text-sm):**
  `(Preponderance of the evidence is that degree of relevant evidence that a reasonable person, considering the record as a whole, would accept as sufficient to find that a contested fact is more likely to be true than untrue).`
- **Intro (centered, text-sm):** `The following [N] document(s) are attached as supporting evidence for this claim:`
- **Per document:** Numbered circle (1, 2, …); evidence type (italic, text-lg); description (text-sm); filename if present. Then image display, or "PDF Document - See attached file," or "Document attached" / "Document pending upload" as appropriate.
- **Footer:** `End of Claim Package` (italic); `Total Evidence Documents: [N]`

---

## 4. Styling Rules (Memorialized)

| Element | Rule |
|---|---|
| Header labels (Date, From, To) | **Bold** label, normal value |
| Subj line | Entire line **bold** + **underlined** |
| No horizontal rule after Subj | Removed — do not re-add |
| "To VA Intake Center," | Normal weight, marginBottom 0 (no gap before paragraph) |
| Condition heading | **Bold** + **underline**, text-lg |
| Condition subheadings | **Italic** + **underline** (no bold) |
| Legal Framework body | Normal weight, 11pt, indented 2em |
| Conclusion / Rationale heading | **Bold** + **underline**, left-aligned |
| Signature name | **Bold** |
| All body text | Arial 11pt, lineHeight 1.5, text-align justify |
| Header text | Arial 12pt, lineHeight 2 (double-spaced) |

---

## 5. Data Sources (Variables)

- **Profile:** firstName, lastName, ssn, phone, email (from user profile via `getUserProfile()`)
- **Service history:** branch (via `getServiceHistory()`, displayed via `getBranchName()`)
- **Conditions:** name, onsetDate, frequency, connectionType, isPresumptive, symptoms[], dailyImpact (from `conditions` state, displayed via `conditionDisplayName()`)
- **Evidence:** uploaded and print-enabled items only; type, description, fileName, fileType, objectPath/fileData

---

## 6. Implementation Reference

- **File:** `client/src/pages/ClaimBuilder.tsx`
- **Guard markers:** `FROZEN-SUPPLEMENTAL-START` and `FROZEN-SUPPLEMENTAL-END`
- **The generated memorandum view** (when AI content exists) mirrors the same header block (Date/From/To/Subj) and "To VA Intake Center," salutation style.

---

## 7. Security Rails

1. The supplemental statement code is wrapped in `FROZEN-SUPPLEMENTAL-START` / `FROZEN-SUPPLEMENTAL-END` guard comments.
2. Do NOT add horizontal rules, dividers, or separator lines between any elements.
3. Do NOT change margins, padding, font sizes, or line heights unless explicitly requested.
4. Do NOT change the legal text, wording, or paragraph structure.
5. Do NOT rearrange sections or add new sections between existing ones.
6. The generated memorandum header MUST always mirror the supplemental statement header exactly.
7. Any modification request must be verified against this template before implementation.
