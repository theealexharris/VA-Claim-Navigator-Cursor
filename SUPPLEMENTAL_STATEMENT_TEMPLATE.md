# Supplemental Statement Framework, Structure & Template

This document memorializes the **Supporting Statement / Documentation For VA Form 21-526EZ** framework, structure, and statement template used in the VA Claim Navigator. The live implementation is in `client/src/pages/ClaimBuilder.tsx` (Review & Generate Claim Package / Supporting Statement section).

---

## 1. Framework & Purpose

- **Legal basis:** VA Title 38 U.S.C. 1151; 38 U.S.C. §§ 1110, 1131; 38 CFR Part 3 and Part 4; 38 C.F.R. § 3.102; *Buchanan v. Nicholson*, 451 F.3d 1334 (Fed. Cir. 2006).
- **Form:** Supporting documentation for **VA Form 21-526EZ** (Application for Disability Compensation and Related Compensation Benefits).
- **Intent:** Formal written statement plus evidence submitted to the VA Evidence Intake Center to support service-connected disability claims, including PACT Act–related conditions.

---

## 2. Document Structure (Order of Sections)

1. **Memorandum header** — Date, From, To, Subj, horizontal rule  
2. **PACT Act request** — Centered statement requesting “NEW” claims reviewed & accepted under PACT ACT  
3. **Introduction** — “To VA Intake Center,” plus two paragraphs (veteran identity, service connection, request to review conditions)  
4. **Conditions detail** — For each condition (see Section 3)  
5. **Conclusion / Rationale** — Bold underlined heading; three paragraphs (evidence standard, acceptance of statement, contact info)  
6. **Signature block** — “Respectfully submitted,” then “Veteran [FirstName] [LastName]”  
7. **Supportive Evidence/Exhibits For Claims** (if evidence attached) — New page; numbered list of documents; placeholder or image/PDF per document  
8. **End of Claim Package** — “End of Claim Package,” total evidence count  
9. **VA Contact Information** — Standalone page with VA Evidence Intake Center address and fax  

---

## 3. Statement Template by Section

### 3.1 Memorandum Header

- **Date:** `[current date MM/DD/YYYY]`
- **From:** `Veteran [Full Name] (SSN: [XXX-XX-XXXX])`
- **To:** `Veteran Affairs Claims Intake Center`
- **Subj:** `Supporting Statement / Documentation For VA Form 21-526EZ Claims`
- **Rule:** Full-width 4px black border under Subj

**Styling:** Date/From/To/Subj labels in **bold**; Subj value also **bold**. Single line under header.

---

### 3.2 PACT Act Request (Centered)

- **Text (exact):** `Requesting "NEW" claims to be Reviewed & Accepted to include conditions covered under the "PACT ACT:"`
- **Styling:** Centered, **bold**, full width. **Do not alter wording.**

---

### 3.3 Introduction

- **Salutation:** `To VA Intake Center,` — **bold**
- **Paragraph 1:**  
  `I [Full Name] ([NameCode]), am filing the following statement in connection with my claims for Military Service-Connected benefits per VA Title 38 U.S.C. 1151. I am also submitting additional evidence that supports my claim(s) to be valid, true and associated with of my Active Military Service ([Branch]), as Primary and/or Secondary injuries/illness as a direct result of my Military service and hazardous conditions/exposures. Based on the totality of the circumstances, a service connection to my military service has been established per VA Title 38 U.S.C. 1151.`
  - *[NameCode] = LastInitial + last 4 SSN; [Branch] = branch of service from profile.*
- **Paragraph 2:**  
  `These conditions should have already been accepted and "presumptively" approved by the VA Executive Administration once discharged from Active Duty. Thus, the VA failed to "service connect" my injuries upon discharge of my Military service which is no fault of mine (the Veteran). I am requesting your office review and approve the following medical conditions:`

**Styling:** Justified text; first paragraph indented 2rem.

---

### 3.4 Conditions Detail (Per Condition)

**Layout:** Each condition in a block with left border (4px primary color), padding, justified text.

- **Condition heading (only line in bold + underline):**  
  `Condition [N]: [CONDITION NAME] (Pg. #[page])`  
  - *[N] = 1-based index. (Pg. #…) only if `sourcePage` is present.*

**Subheadings (underline only, not bold):**

| Subheading | Content / Template |
|------------|--------------------|
| **Service Connection:** | Direct: `This condition is directly related to my active duty service and began during my time in service.` Secondary: `This condition developed as a secondary condition resulting from my existing service-connected disability.` If presumptive: append ` This condition qualifies for presumptive service connection under the PACT Act provisions.` |
| **Onset:** | `Symptoms first manifested on or around [onsetDate].` (Only if onset date exists.) |
| **Frequency:** | `Symptoms occur on a [frequency] basis.` |
| **Current Symptoms:** | `[symptoms list].` (Only if symptoms selected.) |
| **Functional Impact on Daily Life:** | Subheading underlined; next line italic, indented: `[dailyImpact]`. (Only if daily impact text exists.) |
| **Legal Framework** | Fixed two paragraphs (see below). Subheading underlined only. |

**Legal Framework paragraphs (fixed text):**

1. Service connection and compensation for disability are governed by 38 U.S.C. §§ 1110 and 1131 and implementing regulations at 38 CFR Part 3 and Part 4. Under 38 CFR § 3.303(a), service connection may be established by evidence of continuity of symptomatology or by medical nexus. Under 38 CFR § 4.1 and § 4.10, disability ratings are based on the average impairment of earning capacity and the functional effects of the disability. The VA must consider all evidence of record and resolve reasonable doubt in the veteran’s favor under 38 U.S.C. § 5107(b).

2. In *Buchanan v. Nicholson*, 451 F.3d 1334 (Fed. Cir. 2006), the Federal Circuit held that when the evidence is in relative equipoise, the benefit of the doubt must go to the veteran and the claim must be granted. The court reaffirmed that the "at least as likely as not" standard in 38 C.F.R. § 3.102 requires the VA to grant the claim when the evidence for and against service connection is evenly balanced. This standard applies to the evaluation of the conditions set forth in this supporting statement.

**Closing line (per condition):**  
`Per 38 CFR § 3.303, § 4.40, § 4.45, and § 4.59, the functional limitations caused by this condition warrant service connection and appropriate rating consideration.`  
- Styling: smaller, muted.

---

### 3.5 Conclusion / Rationale

- **Heading:** `Conclusion / Rationale` — **bold**, **underline**, centered.
- **Paragraph 1:**  
  `The evidence provided has proven that it is at least as likely as not (more likely than not), that my reported and documented medical conditions are directly related to events and/or exposure due to Active Military service. The medical evidence from my service records shows I have injuries and subsequent pain, which were are all direct causes of my active-duty service. All medical issues were present and existed within the first year after being discharged from active duty to present.`
- **Paragraph 2:**  
  `Please accept my formal written statement and evidence as proof of accepted VA claims.`
- **Paragraph 3:**  
  `If there is anything you need or would like to talk to me about, please get in touch with me at [phone] or via personal email at: [email].`

**Styling:** Top border, padding, justified.

---

### 3.6 Signature Block

- `Respectfully submitted,`
- Blank space (signature)
- `Veteran [FirstName] [LastName]` — **bold**

---

### 3.7 Supportive Evidence/Exhibits For Claims

- **When:** Only if at least one uploaded, print-enabled evidence document exists.
- **Page:** New page (print break before).
- **Heading:** `Supportive Evidence/Exhibits For Claims` — uppercase, bold, centered.
- **Preponderance note (italic):**  
  `(Preponderance of the evidence is that degree of relevant evidence that a reasonable person, considering the record as a whole, would accept as sufficient to find that a contested fact is more likely to be true than untrue).`
- **Intro:** `The following [N] document(s) are attached as supporting evidence for this claim:`
- **Per document:** Numbered (1, 2, …); evidence type (bold); optional description; filename if present. Then image display, or “PDF Document - See attached file,” or “Document attached” / “Document pending upload” as appropriate.
- **Footer:** `End of Claim Package` (bold); `Total Evidence Documents: [N]`

---

### 3.8 VA Contact Information (Standalone Page)

- **Heading:** `VA CONTACT INFORMATION` — large, bold, uppercase, centered.
- **Subheading:** `VA Evidence Intake Center (Disability Claims):` — bold.
- **Mailing Address:**  
  Department of Veterans Affairs  
  Evidence Intake Center  
  PO Box 4444  
  Janesville, WI 53547-4444  
- **Fax Number:** 844-531-7818  

**Styling:** New page; block always visible in print.

---

## 4. Styling Rules (Memorialized)

| Element | Rule |
|--------|------|
| Condition line (per-condition title) | **Bold** + **underline** only for this line. |
| All subheadings under each condition | **Underline only** (no bold): Service Connection, Onset, Frequency, Current Symptoms, Functional Impact on Daily Life, Legal Framework. |
| Legal Framework body | No bold; smaller text; left padding. |
| Memorandum header labels | Bold (Date, From, To, Subj). |
| PACT Act line | Bold, centered; wording fixed. |
| Conclusion / Rationale heading | Bold, underline, centered. |
| Signature name | Bold. |
| VA Contact heading/subheading | Bold as specified. |

---

## 5. Data Sources (Variables)

- **Profile:** firstName, lastName, ssn, phone, email (from user profile).
- **Service history:** branch (for branch name).
- **Conditions:** name, sourcePage (for Pg. #), onsetDate, frequency, connectionType, isPresumptive, symptoms, dailyImpact.
- **Evidence:** uploaded and print-enabled items only; type, description, fileName, fileType, objectPath/fileData for display.

---

## 6. Implementation Reference

- **File:** `client/src/pages/ClaimBuilder.tsx`
- **Section:** “Supporting Statement” / “Conditions Detail” and following blocks inside the generated memorandum (when `generatedMemorandum` is not set, the template above is used).
- **Helper:** `conditionDisplayName(condition)` — returns `[name] (Pg. #[sourcePage])` when sourcePage exists, else name only.

Changes to the supplemental statement content or structure should be reflected here and in the code so the template remains the single source of truth for the memorialized framework and structure.
