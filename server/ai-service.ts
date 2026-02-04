import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export type FeatureType = 
  | "claim_builder"
  | "evidence_automation"
  | "warrior_coach"
  | "lay_statement"
  | "buddy_statement"
  | "appeals_hub"
  | "evidence_vault"
  | "tdiu_calculator"
  | "education_library";

const FEATURE_SYSTEM_PROMPTS: Record<FeatureType, string> = {
  claim_builder: `You are an expert VA disability claims specialist. Help veterans build strong claims by:
- Asking the right questions based on their specific conditions
- Identifying service connection requirements
- Explaining what evidence strengthens their claim
- Providing current VA rating criteria for their conditions
Always be encouraging and supportive. Use plain language, not VA jargon.`,

  evidence_automation: `You are an expert at organizing VA disability claim evidence. Help veterans by:
- Explaining what medical evidence the VA raters look for
- Describing how to request records from the VA and private doctors
- Identifying gaps in their evidence package
- Providing tips for organizing documents effectively
Focus on actionable steps they can take today.`,

  warrior_coach: `You are the Warrior AI Coach - a supportive, knowledgeable guide for veterans navigating the VA claims process. You:
- Answer questions about VA disability claims in clear, simple terms
- Help veterans articulate their symptoms effectively for C&P exams
- Provide encouragement and motivation during the claims journey
- Share strategies that have helped other veterans succeed
Be warm, understanding, and always remind them their service matters.`,

  lay_statement: `You are an expert at helping veterans write compelling lay statements. Guide them to:
- Describe how their disability affects daily life
- Use specific examples and details that resonate with raters
- Connect their current symptoms to their military service
- Structure their statement for maximum impact
Provide templates and examples they can adapt.`,

  buddy_statement: `You are an expert at helping veterans obtain effective buddy statements. Provide guidance on:
- Who makes a good buddy statement witness (fellow service members, family, coworkers)
- What information buddy statements should include
- How to format the statement properly (VA Form 21-10210)
- Templates and examples for different conditions
Help them understand what details are most valuable.`,

  appeals_hub: `You are an expert in VA disability claim appeals. Help veterans understand:
- The three appeal lanes (Supplemental, Higher-Level Review, Board Appeal)
- How to identify errors in their denial decision
- What new evidence could strengthen their case
- Timeline expectations for each appeal type
- When to consider hiring representation
Be strategic and give them hope - most denied claims can be won on appeal.`,

  evidence_vault: `You are an expert at managing VA disability claim evidence. Help veterans:
- Organize medical records by condition and date
- Identify the most important documents for their claim
- Understand what each type of evidence proves
- Ensure their evidence meets VA requirements
- Protect sensitive health information (HIPAA considerations)
Provide practical organization tips.`,

  tdiu_calculator: `You are an expert on Total Disability Individual Unemployability (TDIU). Help veterans understand:
- TDIU eligibility requirements (one condition at 60%+ OR combined 70% with one at 40%+)
- How TDIU provides 100% payment rate without 100% rating
- What evidence proves unemployability
- The difference between schedular and extraschedular TDIU
- How to document their work limitations effectively
Be clear about the criteria and help them assess their situation.`,

  education_library: `You are an educational guide for VA disability claims. Explain:
- The claims process step by step
- Key terms and what they mean in plain language
- Common mistakes to avoid
- Resources and tools available to veterans
- Recent changes to VA regulations
Make complex information accessible and easy to understand.`,
};

export async function getFeatureResearch(
  feature: FeatureType,
  userQuery: string,
  context?: string
): Promise<string> {
  try {
    const systemPrompt = FEATURE_SYSTEM_PROMPTS[feature];
    
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
    ];

    if (context) {
      messages.push({
        role: "user",
        content: `Context about my situation: ${context}`,
      });
    }

    messages.push({ role: "user", content: userQuery });

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 1500,
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content || "I apologize, but I couldn't generate a response. Please try again.";
  } catch (error) {
    console.error("AI Service Error:", error);
    throw new Error("Failed to get AI response. Please try again later.");
  }
}

export async function streamFeatureResearch(
  feature: FeatureType,
  userQuery: string,
  context?: string
): Promise<AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>> {
  const systemPrompt = FEATURE_SYSTEM_PROMPTS[feature];
  
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
  ];

  if (context) {
    messages.push({
      role: "user",
      content: `Context about my situation: ${context}`,
    });
  }

  messages.push({ role: "user", content: userQuery });

  return openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    max_tokens: 1500,
    temperature: 0.7,
    stream: true,
  });
}

export async function getConditionGuidance(conditionName: string): Promise<{
  ratingCriteria: string;
  evidenceNeeded: string;
  commonMistakes: string;
  tips: string;
}> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a VA disability claims expert. Provide specific guidance for the condition mentioned. Return your response in this exact JSON format:
{
  "ratingCriteria": "Explain the VA rating criteria for this condition (what percentages are possible and what symptoms qualify)",
  "evidenceNeeded": "List the specific evidence needed to prove this condition and its service connection",
  "commonMistakes": "List common mistakes veterans make when claiming this condition",
  "tips": "Provide practical tips for maximizing success with this claim"
}`,
        },
        {
          role: "user",
          content: `Provide comprehensive guidance for claiming: ${conditionName}`,
        },
      ],
      max_tokens: 1500,
      temperature: 0.5,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      return JSON.parse(content);
    }
    throw new Error("No content in response");
  } catch (error) {
    console.error("Condition guidance error:", error);
    return {
      ratingCriteria: "Unable to load rating criteria. Please try again.",
      evidenceNeeded: "Unable to load evidence requirements. Please try again.",
      commonMistakes: "Unable to load common mistakes. Please try again.",
      tips: "Unable to load tips. Please try again.",
    };
  }
}

export async function generateLayStatementDraft(
  conditionName: string,
  symptoms: string[],
  dailyImpact: string,
  serviceConnection: string
): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert at writing compelling VA disability lay statements. Write a first-person personal statement that:
- Uses specific, descriptive language about symptoms
- Explains how the condition affects daily activities
- Establishes clear connection to military service
- Follows a logical flow that raters can easily follow
- Is honest and authentic in tone`,
        },
        {
          role: "user",
          content: `Write a lay statement for:
Condition: ${conditionName}
Key symptoms: ${symptoms.join(", ")}
How it affects daily life: ${dailyImpact}
Connection to military service: ${serviceConnection}`,
        },
      ],
      max_tokens: 1500,
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content || "Unable to generate statement. Please try again.";
  } catch (error) {
    console.error("Lay statement generation error:", error);
    throw new Error("Failed to generate lay statement. Please try again.");
  }
}

export async function generateBuddyStatementTemplate(
  conditionName: string,
  relationship: string,
  observedSymptoms: string
): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert at creating buddy statement templates. Generate a template that:
- Is written from the perspective of the witness (spouse, friend, fellow service member, etc.)
- Includes specific observations about the veteran's condition
- Describes changes they've witnessed over time
- Uses credible, honest language
- Follows VA buddy statement format requirements`,
        },
        {
          role: "user",
          content: `Create a buddy statement template for:
Condition being claimed: ${conditionName}
Relationship to veteran: ${relationship}
Symptoms they've observed: ${observedSymptoms}`,
        },
      ],
      max_tokens: 1500,
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content || "Unable to generate template. Please try again.";
  } catch (error) {
    console.error("Buddy statement template error:", error);
    throw new Error("Failed to generate buddy statement template. Please try again.");
  }
}

export interface ClaimMemorandumData {
  veteranName: string;
  ssn: string;
  phone: string;
  email: string;
  branch: string;
  conditions: Array<{
    name: string;
    onsetDate: string;
    frequency: string;
    symptoms: string[];
    connectionType: string;
    isPresumptive: boolean;
    dailyImpact: string;
  }>;
  evidence: Array<{
    type: string;
    description: string;
    fileName?: string;
    category?: string;
    extractedText?: string;
  }>;
}

// Comprehensive 38 CFR Part 4 diagnostic code reference database
const DIAGNOSTIC_CODE_DATABASE = `
MUSCULOSKELETAL CONDITIONS (38 CFR § 4.71a):
- DC 5003: Degenerative arthritis (X-ray evidence required)
- DC 5010: Traumatic arthritis (rated as DC 5003)
- DC 5201: Limitation of arm motion (20-40% based on range)
- DC 5206-5207: Elbow limitation (0-50% based on flexion/extension)
- DC 5215: Wrist limitation (10% max)
- DC 5235-5243: Spine conditions including IVDS
- DC 5237: Lumbosacral strain (10-40% based on ROM/functional loss)
- DC 5238: Spinal stenosis
- DC 5242: Degenerative arthritis of spine
- DC 5243: Intervertebral disc syndrome (Formula or incapacitating episodes)
- DC 5256-5263: Knee conditions
- DC 5257: Knee instability (10-30%)
- DC 5258: Dislocated semilunar cartilage (20%)
- DC 5260: Limitation of knee flexion
- DC 5261: Limitation of knee extension
- DC 5270-5284: Ankle and foot conditions

MENTAL HEALTH (38 CFR § 4.130):
- DC 9201-9211: Schizophrenia spectrum disorders
- DC 9400: Generalized anxiety disorder
- DC 9411: PTSD (0-100% based on occupational/social impairment)
- DC 9432: Bipolar disorder
- DC 9434: Major depressive disorder
- DC 9440: Chronic adjustment disorder
Rating criteria: Total (100%), severe (70%), moderate (50%), mild (30%), subclinical (10%), none (0%)

RESPIRATORY (38 CFR § 4.97):
- DC 6502: Deviated septum
- DC 6504: Rhinitis
- DC 6510-6514: Sinusitis
- DC 6516: Laryngitis
- DC 6520: Stenosis of larynx
- DC 6600: Bronchitis
- DC 6602: Asthma (based on FEV-1/FVC)
- DC 6604: COPD
- DC 6845-6847: Sleep apnea (30-100% based on CPAP use)

CARDIOVASCULAR (38 CFR § 4.104):
- DC 7000-7020: Heart conditions
- DC 7005: Coronary artery disease
- DC 7007: Hypertensive heart disease
- DC 7101: Hypertension (10-60%)
- DC 7117: Raynaud's syndrome

DIGESTIVE SYSTEM (38 CFR § 4.114):
- DC 7301: Peritoneal adhesions
- DC 7305: Duodenal ulcer
- DC 7319: Irritable colon syndrome
- DC 7323: Ulcerative colitis
- DC 7332: Rectum/anus impairment
- DC 7346: Hiatal hernia/GERD

HEARING/EAR (38 CFR § 4.85-4.87):
- DC 6100: Hearing impairment (based on audiometric testing)
- DC 6200: Otitis media
- DC 6204: Peripheral vestibular disorders
- DC 6260: Tinnitus (10% max)

SKIN (38 CFR § 4.118):
- DC 7800-7805: Scars
- DC 7806: Dermatitis/eczema
- DC 7816-7817: Psoriasis

NEUROLOGICAL (38 CFR § 4.124a):
- DC 8045: Traumatic brain injury (TBI)
- DC 8100: Migraine headaches (0-50%)
- DC 8510-8730: Peripheral nerve conditions
- DC 8520: Sciatic nerve paralysis (10-80%)

ENDOCRINE (38 CFR § 4.119):
- DC 7903: Hypothyroidism
- DC 7913: Diabetes mellitus (10-100%)

GENITOURINARY (38 CFR § 4.115a-b):
- DC 7500-7542: Kidney/bladder conditions
- DC 7522: Erectile dysfunction
`;

// Key VA case law and precedent references
const CASE_LAW_DATABASE = `
KEY CASE LAW PRECEDENTS FOR VA CLAIMS:

SERVICE CONNECTION:
- Shedden v. Principi, 381 F.3d 1163 (Fed. Cir. 2004): Three elements for service connection - current disability, in-service incurrence, and nexus
- Combee v. Brown, 34 F.3d 1039 (Fed. Cir. 1994): Direct service connection may be established even without presumptive provisions
- Wagner v. Principi, 370 F.3d 1089 (Fed. Cir. 2004): Presumption of soundness at entry
- Hickson v. West, 12 Vet. App. 247 (1999): Elements required for direct service connection
- Caluza v. Brown, 7 Vet. App. 498 (1995): Credible evidence requirements

SECONDARY SERVICE CONNECTION:
- Allen v. Brown, 7 Vet. App. 439 (1995): Secondary service connection for aggravation
- El-Amin v. Shinseki, 26 Vet. App. 136 (2013): Aggravation of nonservice-connected condition

BENEFIT OF THE DOUBT:
- Gilbert v. Derwinski, 1 Vet. App. 49 (1990): Benefit of doubt doctrine (38 U.S.C. § 5107(b))
- Alemany v. Brown, 9 Vet. App. 518 (1996): Equipoise standard

FUNCTIONAL IMPAIRMENT:
- DeLuca v. Brown, 8 Vet. App. 202 (1995): Functional loss due to pain must be considered
- Mitchell v. Shinseki, 25 Vet. App. 32 (2011): Pain alone without functional impairment insufficient

PRESUMPTIVE CONDITIONS:
- Veterans and Agent Orange: Update 2014: Presumptive herbicide exposure conditions
- PACT Act of 2022: Expanded presumptive conditions for toxic exposures

CONTINUITY OF SYMPTOMATOLOGY:
- Walker v. Shinseki, 708 F.3d 1331 (Fed. Cir. 2013): Continuity of symptomatology for chronic diseases

CREDIBILITY:
- Layno v. Brown, 6 Vet. App. 465 (1994): Lay evidence competency
- Jandreau v. Nicholson, 492 F.3d 1372 (Fed. Cir. 2007): Lay evidence regarding observable symptoms
`;

// VA procedures and regulations reference
const VA_PROCEDURES_REFERENCE = `
KEY VA REGULATIONS AND PROCEDURES:

SERVICE CONNECTION REQUIREMENTS (38 CFR § 3.303):
(a) Principles relating to service connection: Current disability, in-service event, and causal nexus
(b) Chronicity and continuity: Chronic disease during service need not be shown if continuity established
(d) Post-service first diagnosis: Diseases first diagnosed after service may be service-connected

PRESUMPTIVE SERVICE CONNECTION:
- 38 CFR § 3.307: Presumptive service connection for chronic diseases
- 38 CFR § 3.309: Diseases subject to presumptive service connection
- 38 CFR § 3.317: Gulf War presumptives (undiagnosed illnesses)
- PACT Act (Public Law 117-168): Toxic exposure presumptives

SECONDARY SERVICE CONNECTION (38 CFR § 3.310):
(a) Disability proximately due to service-connected disease
(b) Aggravation of nonservice-connected disability by service-connected disability

RATING PRINCIPLES:
- 38 CFR § 4.1: Essentials of evaluative rating (history and examination)
- 38 CFR § 4.2: Interpretation of examination reports
- 38 CFR § 4.3: Resolution of reasonable doubt in veteran's favor
- 38 CFR § 4.7: Higher rating when symptoms approximate higher criteria
- 38 CFR § 4.10: Functional impairment
- 38 CFR § 4.40: Functional loss (weakness, fatigability, incoordination)
- 38 CFR § 4.45: Joints (pain on movement, swelling, deformity)
- 38 CFR § 4.59: Painful motion (establishes minimum 10% rating)

DUTY TO ASSIST (38 U.S.C. § 5103A):
- VA must assist in obtaining evidence
- VA must provide medical examinations when necessary

BENEFIT OF THE DOUBT (38 U.S.C. § 5107(b)):
- When evidence is in equipoise, decide in veteran's favor
`;

// Function to analyze evidence and match to conditions
async function analyzeEvidenceForConditions(
  conditions: ClaimMemorandumData['conditions'],
  evidence: ClaimMemorandumData['evidence']
): Promise<string> {
  const analysisPrompt = `Analyze the following veteran's medical conditions and uploaded evidence to create a comprehensive evidence-to-condition mapping:

CONDITIONS:
${conditions.map((c, i) => `${i + 1}. ${c.name} (${c.connectionType === 'direct' ? 'Direct' : 'Secondary'}, ${c.isPresumptive ? 'PACT Act Presumptive' : 'Non-Presumptive'})`).join('\n')}

UPLOADED EVIDENCE:
${evidence.map((e, i) => `${i + 1}. [${e.category || e.type}] ${e.description}${e.fileName ? ` - File: ${e.fileName}` : ''}`).join('\n')}

For each condition, identify:
1. Which evidence documents directly support this condition
2. What medical documentation establishes the diagnosis
3. What service records show in-service incurrence
4. What nexus evidence connects service to current disability
5. Any gaps in the evidence that should be addressed

Write in professional legal language suitable for a VA claims submission. Do NOT use markdown formatting.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a VA claims legal expert specializing in evidence analysis. Analyze evidence packages and identify how each piece supports service connection elements." },
        { role: "user", content: analysisPrompt }
      ],
      max_tokens: 2000,
      temperature: 0.5,
    });
    return response.choices[0]?.message?.content || "";
  } catch (error) {
    console.error("Evidence analysis error:", error);
    return "";
  }
}

export async function generateClaimMemorandum(data: ClaimMemorandumData): Promise<string> {
  try {
    // Parse veteran name for formatting
    const nameParts = data.veteranName.trim().split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts[nameParts.length - 1] || "";
    const lastInitial = lastName.charAt(0).toUpperCase();
    const last4SSN = data.ssn.replace(/-/g, "").slice(-4);
    const nameCode = `${lastInitial}${last4SSN}`;
    
    // Format SSN
    const ssnClean = data.ssn.replace(/-/g, "");
    const ssnFormatted = ssnClean.length === 9 
      ? `${ssnClean.slice(0,3)}-${ssnClean.slice(3,5)}-${ssnClean.slice(5)}`
      : data.ssn;
    
    // Get current date
    const currentDate = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
    
    // Separate PACT Act (presumptive) conditions from primary/secondary
    const pactActConditions = data.conditions.filter(c => c.isPresumptive);
    const primarySecondaryConditions = data.conditions.filter(c => !c.isPresumptive);

    // STEP 1: Deep dive evidence analysis (cross-reference evidence with conditions)
    const evidenceAnalysis = await analyzeEvidenceForConditions(data.conditions, data.evidence);

    const conditionsList = data.conditions.map((c, i) => 
      `${i + 1}. ${c.name}
   - Onset: ${c.onsetDate || "Not specified"}
   - Frequency: ${c.frequency}
   - Symptoms: ${c.symptoms.join(", ") || "Not specified"}
   - Connection: ${c.connectionType === "direct" ? "Direct service connection" : "Secondary condition"}
   - Presumptive: ${c.isPresumptive ? "Yes (PACT Act/Burn Pits/Agent Orange)" : "No"}
   - Daily Impact: ${c.dailyImpact || "Not specified"}`
    ).join("\n\n");

    const evidenceList = data.evidence.map((e, i) => 
      `${i + 1}. [${e.category || e.type}] ${e.description}${e.fileName ? ` (File: ${e.fileName})` : ""}`
    ).join("\n");

    // Check if any evidence was uploaded
    const hasEvidence = data.evidence && data.evidence.length > 0;
    
    // Check for specific evidence types
    const hasNexusLetter = data.evidence.some((e) => 
      (e.category || e.type || "").toLowerCase().includes("nexus") || 
      (e.description || "").toLowerCase().includes("nexus")
    );
    const hasBuddyStatement = data.evidence.some((e) => 
      (e.category || e.type || "").toLowerCase().includes("buddy") || 
      (e.description || "").toLowerCase().includes("buddy statement")
    );
    const hasLayStatement = data.evidence.some((e) => 
      (e.category || e.type || "").toLowerCase().includes("lay statement") || 
      (e.description || "").toLowerCase().includes("lay statement")
    );
    const hasMedicalRecords = data.evidence.some((e) => 
      (e.category || e.type || "").toLowerCase().includes("medical") || 
      (e.description || "").toLowerCase().includes("medical record")
    );
    const hasServiceRecords = data.evidence.some((e) => 
      (e.category || e.type || "").toLowerCase().includes("service") || 
      (e.description || "").toLowerCase().includes("service record") ||
      (e.description || "").toLowerCase().includes("service treatment")
    );
    
    // Build evidence restriction instructions for AI
    const evidenceRestrictions = [];
    if (!hasNexusLetter) {
      evidenceRestrictions.push("DO NOT mention or reference nexus letters, nexus opinions, or treating psychologist/physician nexus statements");
    }
    if (!hasBuddyStatement) {
      evidenceRestrictions.push("DO NOT mention or reference buddy statements");
    }
    const evidenceRestrictionText = evidenceRestrictions.length > 0 
      ? `\n\nCRITICAL EVIDENCE RESTRICTIONS (MUST FOLLOW):\n${evidenceRestrictions.map((r, i) => `${i + 1}. ${r}`).join("\n")}\nOnly reference evidence types that were actually submitted.`
      : "";
    
    // Text to use when no evidence is uploaded
    const noEvidenceText = `Please note that medical records and supporting documentation are not attached to this claim at this time. I am actively gathering evidence that will substantiate the claims made herein, including: Service Treatment Records documenting relevant medical complaints during active duty; VA medical records containing diagnostic test results that confirm the presence and progression of my condition; private medical records from specialists detailing my ongoing symptoms, formal diagnoses, and prescribed treatment plans; and lay statements from family members and myself establishing the continuity and severity of symptoms since military service. These materials will be submitted at a later date. While a formal nexus opinion may not yet be included, the cumulative evidence will demonstrate a clear connection between my military service and my current disability.`;

    // STEP 2: Generate comprehensive memorandum with deep legal analysis
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert VA disability claims legal writer with deep knowledge of 38 CFR Part 4, VA case law, and claims procedures. Generate a formal, comprehensive memorandum that MUST follow this EXACT format and structure. Do NOT deviate from this format.

CRITICAL FORMATTING RULES:
- Do NOT use asterisks (*) or markdown formatting like ** or *
- Do NOT include "---BEGIN MEMORANDUM---" or "---END MEMORANDUM---"
- Write in plain text only
- Start the memorandum directly with the Date: line
${evidenceRestrictionText}

LEGAL KNOWLEDGE BASE FOR REFERENCE:

${DIAGNOSTIC_CODE_DATABASE}

${CASE_LAW_DATABASE}

${VA_PROCEDURES_REFERENCE}

REQUIRED MEMORANDUM FORMAT (follow exactly):

Date:   ${currentDate}

From: Veteran ${data.veteranName} (SSN: ${ssnFormatted})

To:     Veteran Affairs Claims Intake Center

Subj: Supporting Statement / Documentation For VA Form 21-526EZ Claims

________________________________________________________________________________

To VA Intake Center,

I ${data.veteranName} (${nameCode}), am filing the following statement in connection with my claims for Military Service-Connected benefits per VA Title 38 U.S.C. 1151. I am also submitting additional evidence that supports my claim(s) to be valid, true and associated with of my Active Military Service (${data.branch}), as Primary and/or Secondary injuries/illness as a direct result of my Military service and hazardous conditions/exposures. Based on the totality of the circumstances, a service connection to my military service has been established per VA Title 38 U.S.C. 1151.

These conditions should have already been accepted and "presumptively" approved by the VA Executive Administration once discharged from Active Duty. Thus, the VA failed to "service connect" my injuries upon discharge of my Military service which is no fault of mine (the Veteran). I am requesting your office review and approve the following medical conditions as detailed below.

FOR EACH CONDITION, WRITE A COMPREHENSIVE LEGAL ARGUMENT SECTION WITH THESE EXACT FORMATTING REQUIREMENTS:

MANDATORY HEADING FORMAT (FOLLOW EXACTLY):
- ALL condition headings must be formatted as: "CONDITION 1: [CONDITION NAME IN CAPS]:" (bold, underlined, all caps, colon at end)
- Example: "CONDITION 1: BACK PAIN:" or "CONDITION 2: LEFT FOOT PAIN:"
- ALL section headings within each condition must be formatted as: "[HEADING NAME]:" (bold, underlined, all caps, colon at end)
- Section headings must appear on their own line directly above the paragraph content

REQUIRED SECTIONS FOR EACH CONDITION (use exact heading format):

CONDITION [NUMBER]: [CONDITION NAME]:
(Write 1-2 paragraphs describing how this condition is connected to military service, in-service incurrence or aggravation events, and continuity of symptomatology since service per Walker v. Shinseki)

CURRENT SYMPTOMS AND FUNCTIONAL IMPAIRMENT:
(Write paragraph about current symptoms, their frequency, functional limitations per DeLuca v. Brown criteria, and daily impact on occupational and social functioning)

SUPPORTING EVIDENCE CITATIONS:
${hasEvidence ? `(Write paragraph referencing ONLY the following evidence types that were actually submitted: ${[
  hasMedicalRecords ? "medical records" : null,
  hasServiceRecords ? "service treatment records" : null,
  hasLayStatement ? "lay statements" : null,
  hasBuddyStatement ? "buddy statements" : null,
  hasNexusLetter ? "nexus letter findings" : null
].filter(Boolean).join(", ") || "the submitted documentation"}. DO NOT reference nexus letters, buddy statements, or other evidence types that were NOT submitted.)` : `(USE THIS EXACT TEXT - DO NOT MODIFY OR ADD ANYTHING ELSE): "${noEvidenceText}"`}

APPLICABLE LEGAL FRAMEWORK:
(Write paragraph citing specific 38 CFR Part 4 Diagnostic Code with rating criteria, 38 CFR section 3.303 or 3.310, sections 4.40, 4.45, 4.59 for musculoskeletal functional impairment, and PACT Act provisions if presumptive)

CASE LAW PRECEDENTS:
(Write paragraph citing Shedden v. Principi, DeLuca v. Brown, Gilbert v. Derwinski, and other relevant precedents)

REQUESTED RATING AND LEGAL ARGUMENT:
(Write paragraph with suggested rating percentage and legal justification based on 38 CFR criteria and why evidence meets or approximates higher rating per 38 CFR section 4.7)

After all conditions are documented, include:

CONCLUSION / RATIONALE:

Based on the applicable provisions of 38 CFR Part 4, the controlling case law precedents, and the evidentiary standard established in Gilbert v. Derwinski, the evidence provided has proven that it is at least as likely as not (more likely than not), that my reported and documented medical conditions are directly related to events and/or exposure due to Active Military service. Per 38 U.S.C. section 5107(b) and 38 CFR section 3.102, when there is an approximate balance of positive and negative evidence regarding any issue material to the determination of a matter, the VA shall give the benefit of the doubt to the claimant.

The medical evidence from my service records, supporting documentation, and lay evidence establishes that these injuries and subsequent disabilities are all direct causes of my active-duty service. Pursuant to 38 CFR section 3.303(b), continuity of symptomatology has been established from service to present for all chronic conditions claimed.

Please accept my formal written statement and evidence as proof of accepted VA claims per the standards established in Caluza v. Brown and Hickson v. West.

If there is anything you need or would like to talk to me about, please get in touch with me at ${data.phone || "(XXX) XXX-XXXX"} or via personal email at: ${data.email || "XXXXX@email.com"}.

Respectfully submitted,

Veteran ${firstName} ${lastName}

CRITICAL OUTPUT RULES:
1. Do NOT include "---BEGIN MEMORANDUM---" or "---END MEMORANDUM---"
2. Do NOT use asterisks (*) or markdown formatting - plain text only
3. Use the EXACT header format shown above (Date, From, To, Subj lines)
4. Include the line of underscores after Subj: to separate the header from the body
5. Use the EXACT introduction paragraph wording
6. Do NOT list conditions at the top - go directly into detailed condition sections
7. ALL HEADINGS MUST BE: ALL CAPS, followed by a colon (:) at the end
8. Each heading must be on its own line directly above the paragraph content
9. Condition headings format: "CONDITION 1: BACK PAIN:" (number, condition name in caps, colon)
10. Section headings format: "CURRENT SYMPTOMS AND FUNCTIONAL IMPAIRMENT:" (all caps, colon at end)
11. Required section headings for each condition:
    - CONDITION [N]: [NAME]:
    - CURRENT SYMPTOMS AND FUNCTIONAL IMPAIRMENT:
    - SUPPORTING EVIDENCE CITATIONS:
    - APPLICABLE LEGAL FRAMEWORK:
    - CASE LAW PRECEDENTS:
    - REQUESTED RATING AND LEGAL ARGUMENT:
12. Final section heading: "CONCLUSION / RATIONALE:"
13. Use the EXACT enhanced conclusion paragraph wording with legal citations
14. Use the EXACT closing format with "Respectfully submitted," and "Veteran [Name]"
15. Write professionally in first person as the veteran`,
        },
        {
          role: "user",
          content: `Generate the complete VA claim memorandum following the exact format provided. This is a DEEP DIVE analysis requiring comprehensive legal arguments.

CONDITIONS BEING CLAIMED:
${conditionsList}

SUPPORTING EVIDENCE SUBMITTED:
${hasEvidence ? evidenceList : "NO EVIDENCE UPLOADED - USE EXACT NO-EVIDENCE TEXT FOR ALL SUPPORTING EVIDENCE CITATIONS SECTIONS"}

${hasEvidence ? `EVIDENCE ANALYSIS (Cross-referenced with conditions):
${evidenceAnalysis || "Evidence analysis pending - cite general evidence requirements"}` : `CRITICAL INSTRUCTION FOR SUPPORTING EVIDENCE CITATIONS:
Since NO evidence has been uploaded, you MUST use this EXACT text for EVERY "SUPPORTING EVIDENCE CITATIONS:" section - do not add, modify, or remove any words:
"${noEvidenceText}"

This text must appear exactly as written above in each condition's SUPPORTING EVIDENCE CITATIONS section. Do not add any additional analysis or references.`}

DEEP DIVE REQUIREMENTS:
1. Do NOT list conditions at the top of the memorandum - go directly into detailed condition sections after the introduction
2. For EACH condition, identify the specific 38 CFR Part 4 Diagnostic Code that applies
3. Cite the specific rating criteria from the Schedule for Rating Disabilities
4. Reference at least 2-3 relevant case law precedents per condition
5. Explain how the submitted evidence meets each Shedden element (current disability, in-service event, nexus)
6. Apply DeLuca factors for any musculoskeletal conditions (pain, weakness, fatigability, incoordination)
7. For PACT Act conditions, cite Public Law 117-168 and the specific presumptive provision
8. Cross-reference the uploaded evidence documents with each condition's legal arguments
9. Provide a suggested rating percentage with legal justification based on 38 CFR criteria

MANDATORY HEADING FORMAT:
- ALL condition headings: "CONDITION 1: BACK PAIN:" (all caps, colon at end)
- ALL section headings: "CURRENT SYMPTOMS AND FUNCTIONAL IMPAIRMENT:" (all caps, colon at end)
- Headings must be on their own line directly above the paragraph
- Do NOT use bullet lists for condition names - use detailed paragraph sections instead

Write detailed, legally persuasive sections for each condition. This memorandum should read like a professional legal brief supporting a VA disability claim, with proper legal citations throughout.

REMINDER: Do NOT use asterisks, markdown formatting, or include BEGIN/END MEMORANDUM markers. Do NOT list conditions as a bullet/numbered list at the top. Write in plain text only.`,
        },
      ],
      max_tokens: 8000,
      temperature: 0.6,
    });

    // STEP 3: Post-processing memorandum
    let memorandum = response.choices[0]?.message?.content || "Unable to generate memorandum. Please try again.";
    
    // Post-process to remove any markdown formatting the AI might have added
    memorandum = memorandum
      .replace(/---BEGIN MEMORANDUM---/gi, '')
      .replace(/---END MEMORANDUM---/gi, '')
      .replace(/\*\*/g, '') // Remove bold markdown
      .replace(/\*/g, '')   // Remove italic markdown
      .replace(/^#+\s*/gm, '') // Remove heading markdown
      .trim();
    
    return memorandum;
  } catch (error) {
    console.error("Claim memorandum generation error:", error);
    throw new Error("Failed to generate claim memorandum. Please try again.");
  }
}
