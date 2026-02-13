import { insforge } from './insforge';

// Use Insforge's built-in AI integration -- no separate API key needed
// Available models — ordered so the working / cheapest models come first in fallback.
// When a model hits its credit limit the retry loop skips to the next one.
const AI_MODELS = {
  fast: [
    "openai/gpt-4o-mini",
    "x-ai/grok-4.1-fast",
    "deepseek/deepseek-v3.2",
  ],
  smart: [
    "anthropic/claude-sonnet-4.5",   // best quality — try first
    "openai/gpt-4o-mini",            // reliable fallback
    "x-ai/grok-4.1-fast",            // secondary fallback
    "deepseek/deepseek-v3.2",        // tertiary fallback
  ],
};
const FAST_MODEL = AI_MODELS.fast[0];
const SMART_MODEL = AI_MODELS.smart[0];

console.log('[AI SERVICE] Using Insforge AI integration (no separate API key needed)');

/** Returns true when the error looks like a transient credits / API-key issue. */
function isRetryableAiError(err: any): boolean {
  const msg = String(err?.message || err || "").toLowerCase();
  return (
    msg.includes("insufficient credits") ||
    msg.includes("renew cloud api key") ||
    msg.includes("forbidden") ||
    msg.includes("gateway time") ||        // 504
    msg.includes("rate limit") ||
    msg.includes("too many requests") ||
    msg.includes("service unavailable") ||  // 503
    msg.includes("internal server error")   // 500
  );
}

/**
 * Call the Insforge AI chat API with automatic retry + model fallback.
 * On a credits/API-key/timeout error the call is retried once with the same
 * model, then once more with each fallback model in order.
 */
async function aiChat(
  model: string,
  messages: Array<{ role: string; content: any }>,
  maxTokens: number = 1500,
  temperature: number = 0.7,
  extraOptions?: Record<string, any>
): Promise<string> {
  // Build ordered list of models to try: requested model first, then fallbacks
  const isSmart = AI_MODELS.smart.includes(model);
  const fallbacks = (isSmart ? AI_MODELS.smart : AI_MODELS.fast).filter(m => m !== model);
  const modelsToTry = [model, ...fallbacks];

  let lastError: any;

  for (const currentModel of modelsToTry) {
    // Each model gets up to 2 attempts (initial + 1 retry)
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        console.log(`[AI] Calling ${currentModel} (attempt ${attempt + 1})...`);
        const response = await insforge.ai.chat.completions.create({
          model: currentModel,
          messages: messages as any,
          maxTokens,
          temperature,
          ...extraOptions,
        });
        const content = (response as any).choices?.[0]?.message?.content || "";
        if (content) {
          if (currentModel !== model) {
            console.log(`[AI] Succeeded with fallback model ${currentModel} (original: ${model})`);
          }
          return content;
        }
      } catch (err: any) {
        lastError = err;
        const msg = err?.message || String(err);
        console.warn(`[AI] ${currentModel} attempt ${attempt + 1} failed: ${msg}`);

        if (!isRetryableAiError(err)) {
          // Non-retryable error (bad request, auth, etc.) — stop immediately
          throw err;
        }

        // Brief pause before retry/next model
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }

  // All models exhausted
  const errMsg = lastError?.message || "AI service unavailable";
  console.error(`[AI] All models exhausted. Last error: ${errMsg}`);
  throw new Error(
    `AI service temporarily unavailable (${errMsg}). ` +
    "This is usually caused by exhausted cloud AI credits on the Insforge backend. " +
    "Please try again in a few minutes, or contact support if the issue persists."
  );
}

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
    const messages: Array<{ role: string; content: string }> = [
      { role: "system", content: systemPrompt },
    ];
    if (context) {
      messages.push({ role: "user", content: `Context about my situation: ${context}` });
    }
    messages.push({ role: "user", content: userQuery });

    return await aiChat(FAST_MODEL, messages, 1500, 0.7) || "I apologize, but I couldn't generate a response. Please try again.";
  } catch (error) {
    console.error("AI Service Error:", error);
    throw new Error("Failed to get AI response. Please try again later.");
  }
}

export async function streamFeatureResearch(
  feature: FeatureType,
  userQuery: string,
  context?: string
): Promise<any> {
  const systemPrompt = FEATURE_SYSTEM_PROMPTS[feature];
  const messages: Array<{ role: string; content: string }> = [
    { role: "system", content: systemPrompt },
  ];
  if (context) {
    messages.push({ role: "user", content: `Context about my situation: ${context}` });
  }
  messages.push({ role: "user", content: userQuery });

  return insforge.ai.chat.completions.create({
    model: FAST_MODEL,
    messages: messages as any,
    maxTokens: 1500,
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
    const content = await aiChat(FAST_MODEL, [
      {
        role: "system",
        content: `You are a VA disability claims expert. Provide specific guidance for the condition mentioned. Return your response in this exact JSON format (no markdown, no code fences, just raw JSON):
{
  "ratingCriteria": "Explain the VA rating criteria for this condition",
  "evidenceNeeded": "List the specific evidence needed",
  "commonMistakes": "List common mistakes veterans make",
  "tips": "Provide practical tips for maximizing success"
}`,
      },
      {
        role: "user",
        content: `Provide comprehensive guidance for claiming: ${conditionName}`,
      },
    ], 1500, 0.5);

    if (content) {
      const cleaned = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      return JSON.parse(cleaned);
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
    const result = await aiChat(FAST_MODEL, [
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
    ], 1500, 0.7);

    return result || "Unable to generate statement. Please try again.";
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
    const result = await aiChat(FAST_MODEL, [
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
    ], 1500, 0.7);

    return result || "Unable to generate template. Please try again.";
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
    return await aiChat(SMART_MODEL, [
      { role: "system", content: "You are a VA claims legal expert specializing in evidence analysis. Analyze evidence packages and identify how each piece supports service connection elements." },
      { role: "user", content: analysisPrompt }
    ], 2000, 0.5);
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
    
    // STEP 1: Deep dive evidence analysis
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

    const hasEvidence = data.evidence && data.evidence.length > 0;
    
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
    
    const noEvidenceText = `Please note that medical records and supporting documentation are not attached to this claim at this time. I am actively gathering evidence that will substantiate the claims made herein, including: Service Treatment Records documenting relevant medical complaints during active duty; VA medical records containing diagnostic test results that confirm the presence and progression of my condition; private medical records from specialists detailing my ongoing symptoms, formal diagnoses, and prescribed treatment plans; and lay statements from family members and myself establishing the continuity and severity of symptoms since military service. These materials will be submitted at a later date. While a formal nexus opinion may not yet be included, the cumulative evidence will demonstrate a clear connection between my military service and my current disability.`;

    // STEP 2: Generate comprehensive memorandum
    const systemPrompt = `You are an expert VA disability claims legal writer with deep knowledge of 38 CFR Part 4, VA case law, and claims procedures. Generate a formal, comprehensive memorandum that MUST follow this EXACT format and structure. Do NOT deviate from this format.

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
- ALL section headings within each condition must be formatted as: "[HEADING NAME]:" (bold, underlined, all caps, colon at end)
- Section headings must appear on their own line directly above the paragraph content

REQUIRED SECTIONS FOR EACH CONDITION:

CONDITION [NUMBER]: [CONDITION NAME]:
(Write 1-2 paragraphs describing how this condition is connected to military service)

CURRENT SYMPTOMS AND FUNCTIONAL IMPAIRMENT:
(Write paragraph about current symptoms and daily impact)

SUPPORTING EVIDENCE CITATIONS:
${hasEvidence ? `(Write paragraph referencing ONLY the following evidence types that were actually submitted: ${[
  hasMedicalRecords ? "medical records" : null,
  hasServiceRecords ? "service treatment records" : null,
  hasLayStatement ? "lay statements" : null,
  hasBuddyStatement ? "buddy statements" : null,
  hasNexusLetter ? "nexus letter findings" : null
].filter(Boolean).join(", ") || "the submitted documentation"}.)` : `(USE THIS EXACT TEXT): "${noEvidenceText}"`}

APPLICABLE LEGAL FRAMEWORK:
(Write paragraph citing specific 38 CFR Part 4 Diagnostic Code)

CASE LAW PRECEDENTS:
(Write paragraph citing relevant precedents)

REQUESTED RATING AND LEGAL ARGUMENT:
(Write paragraph with suggested rating percentage)

After all conditions, include CONCLUSION / RATIONALE with the exact closing format.

Respectfully submitted,

Veteran ${firstName} ${lastName}

CRITICAL: No asterisks, no markdown, plain text only.`;

    const userPrompt = `Generate the complete VA claim memorandum following the exact format provided.

CONDITIONS BEING CLAIMED:
${conditionsList}

SUPPORTING EVIDENCE SUBMITTED:
${hasEvidence ? evidenceList : "NO EVIDENCE UPLOADED - USE EXACT NO-EVIDENCE TEXT FOR ALL SUPPORTING EVIDENCE CITATIONS SECTIONS"}

${hasEvidence ? `EVIDENCE ANALYSIS:\n${evidenceAnalysis || "Evidence analysis pending"}` : `Since NO evidence has been uploaded, use the exact no-evidence text for every SUPPORTING EVIDENCE CITATIONS section.`}

Write detailed, legally persuasive sections for each condition. No asterisks or markdown.`;

    const memorandumRaw = await aiChat(SMART_MODEL, [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ], 8000, 0.6);
    
    // Post-process
    let memorandum = memorandumRaw || "Unable to generate memorandum. Please try again.";
    memorandum = memorandum
      .replace(/---BEGIN MEMORANDUM---/gi, '')
      .replace(/---END MEMORANDUM---/gi, '')
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/^#+\s*/gm, '')
      .trim();
    
    return memorandum;
  } catch (error) {
    console.error("Claim memorandum generation error:", error);
    throw new Error("Failed to generate claim memorandum. Please try again.");
  }
}

// --- Medical record analysis for Evidence-first claim builder ---

export interface ExtractedDiagnosis {
  conditionName: string;
  diagnosticCode: string;
  cfrReference: string;
  onsetDate: string;
  connectionType: "direct" | "secondary";
  isPresumptive: boolean;
  sourceDocument: string;
  supportingQuotes: string[];
  category: string;
  /** Page number in the document where this diagnosis was found (e.g. "24"). Empty if not known. */
  pageNumber?: string;
}

const MEDICAL_RECORD_EXTRACTION_PROMPT = `You are a VA claims expert. Analyze the provided military or VA medical record and extract ALL diagnoses, injuries, and conditions that can be documented for a VA disability claim.

PHASE 1 - DOCUMENT CLASSIFICATION:
Identify the record type (e.g., SF 600, DD 2766, DD 214, Radiology Report, Operative Report, Mental Health Record, C&P Exam, etc.).

PHASE 2 - EXTRACTION:
From the record extract: dates of encounter, facility/provider, chief complaint, chronic problems list, active medications (infer conditions from meds: e.g., Albuterol→Asthma, SSRIs→Depression, Omeprazole→GERD, CPAP→Sleep Apnea), procedures, HPI, ROS positives, physical exam abnormals, Assessment/Plan diagnoses, diagnostic results, duty restrictions (LIMDU, profiles), mental health screening results.

PHASE 3 - DIAGNOSIS LIST:
For each diagnosis/condition found:
1. conditionName: Standard medical name (e.g., LUMBAR DEGENERATIVE DISC DISEASE, PTSD, SLEEP APNEA)
2. diagnosticCode: Map to 38 CFR Part 4 DC (e.g., DC 5243, DC 9411, DC 6847)
3. cfrReference: e.g., "38 CFR § 4.71a"
4. onsetDate: MM/YYYY if found in record, else ""
5. connectionType: "direct" or "secondary"
6. isPresumptive: true if PACT Act/Agent Orange/presumptive, else false
7. sourceDocument: Brief source (e.g., "SF 600 dated 03/2019")
8. supportingQuotes: 1-3 short direct quotes from the record
9. category: MUSCULOSKELETAL | MENTAL_HEALTH | RESPIRATORY | CARDIOVASCULAR | DIGESTIVE | NEUROLOGICAL | SKIN | AUDITORY | OTHER
10. pageNumber: Page number in the document where this diagnosis appears (e.g. 24). Use empty string if not known or single-page document.

Use this 38 CFR Part 4 mapping:
- Spine/back: DC 5237, 5242, 5243 (§ 4.71a)
- Knee: DC 5260, 5261, 5257, 5258 (§ 4.71a)
- PTSD: DC 9411 (§ 4.130)
- Depression: DC 9434 (§ 4.130)
- Anxiety: DC 9400 (§ 4.130)
- Sleep Apnea: DC 6847 (§ 4.97)
- Asthma: DC 6602 (§ 4.97)
- GERD: DC 7346 (§ 4.114)
- Tinnitus: DC 6260 (§ 4.87)
- Migraines: DC 8100 (§ 4.124a)
- Hypertension: DC 7101 (§ 4.104)
- TBI: DC 8045 (§ 4.124a)
- Neuropathy/Sciatica: DC 8520, 8526 (§ 4.124a)
- Dermatitis/Scars: DC 7806, 7800 (§ 4.118)

Return ONLY a valid JSON array of objects with keys: conditionName, diagnosticCode, cfrReference, onsetDate, connectionType, isPresumptive, sourceDocument, supportingQuotes, category, pageNumber. No markdown, no explanation.`;

/**
 * Analyze military / VA medical records and extract all VA-claimable diagnoses.
 *
 * Analysis pipeline:
 *   1. Images → AI vision
 *   2. PDFs  → Insforge fileParser with mistral-ocR (handles scanned docs)
 *              Falls back to local pdf-parse → text analysis for very large files
 *   3. DOCX  → mammoth text extraction → text analysis
 *   4. Other → best-effort text extraction → text analysis
 */
export async function analyzeMedicalRecords(
  fileData: string,
  fileType: string,
  fileName: string,
  extractedText?: string,
  fileBuffer?: Buffer
): Promise<{ diagnoses: ExtractedDiagnosis[]; rawAnalysis: string }> {

  const isImage = /^image\/(png|jpeg|jpg|gif|webp|tiff|bmp)$/i.test(fileType);
  const isPdf = fileType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf");
  const isDocx = /officedocument\.wordprocessingml\.document/i.test(fileType) || fileName.toLowerCase().endsWith(".docx");
  const isDoc = fileType === "application/msword" || fileName.toLowerCase().endsWith(".doc");
  const isTextLike =
    /^text\//i.test(fileType) ||
    /json|xml|csv/i.test(fileType) ||
    /\.(txt|csv|json|xml|md)$/i.test(fileName);

  const fileSizeMB = fileBuffer ? fileBuffer.length / (1024 * 1024) : 0;
  console.log(`[ANALYZE] Starting analysis: file=${fileName}, type=${fileType}, size=${fileSizeMB.toFixed(1)}MB, isPdf=${isPdf}, isImage=${isImage}, hasBuffer=${!!fileBuffer}, hasFileData=${!!fileData}, hasExtractedText=${!!(extractedText && extractedText.trim())}`);

  // ─────────────────────────────────────────────────────
  // 0. Pre-supplied extracted text (e.g. client-side OCR)
  // ─────────────────────────────────────────────────────
  if (extractedText && extractedText.trim().length > 100) {
    console.log(`[ANALYZE] Using pre-supplied extractedText: ${extractedText.length} chars`);
    return analyzeExtractedText(extractedText, fileName);
  }

  // ─────────────────────────────────────────────────────
  // 1. Images → AI vision (existing path)
  // ─────────────────────────────────────────────────────
  if (isImage) {
    const base64Img = fileBuffer
      ? `data:${fileType};base64,${fileBuffer.toString("base64")}`
      : fileData?.startsWith("data:")
        ? fileData
        : fileData
          ? `data:${fileType};base64,${fileData}`
          : null;

    if (base64Img) {
      console.log(`[ANALYZE] Sending image to AI vision: ${fileName}`);
      const raw = await aiChat(SMART_MODEL, [
        { role: "system", content: MEDICAL_RECORD_EXTRACTION_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: `Analyze this medical record image (${fileName}) and extract ALL VA-claimable diagnoses, conditions, medications, and injuries.` },
            { type: "image_url", image_url: { url: base64Img } },
          ] as any,
        },
      ], 4096, 0.3);
      console.log(`[ANALYZE] AI vision response: ${raw.length} chars`);
      return { diagnoses: parseDiagnosesFromResponse(raw), rawAnalysis: raw };
    }
    return { diagnoses: [], rawAnalysis: "No image data available for analysis." };
  }

  // ─────────────────────────────────────────────────────
  // 2. PDFs → split into small page-chunks → fileParser OCR → aggregate
  //    Large scanned PDFs (like 99-page military records) time out when
  //    sent whole. Splitting into ~10-page chunks avoids gateway timeouts
  //    and lets the AI read every page.
  // ─────────────────────────────────────────────────────
  if (isPdf) {
    const bufferToUse = fileBuffer || (fileData ? Buffer.from(fileData.replace(/^data:[^;]+;base64,/, ""), "base64") : null);
    if (!bufferToUse) {
      return { diagnoses: [], rawAnalysis: "No PDF data available for analysis." };
    }

    // 2a. First try local text extraction (fast, works for text-layer PDFs)
    try {
      const pdfParse = (await import("pdf-parse")).default;
      const pdfData = await pdfParse(bufferToUse);
      const parsed = (pdfData.text || "").trim();
      console.log(`[ANALYZE] pdf-parse extracted: ${parsed.length} chars, ${pdfData.numpages || "?"} pages`);
      if (parsed.length > 200) {
        // Text-layer PDF — analyze the extracted text directly (fast)
        return analyzeExtractedText(parsed, fileName);
      }
      console.log(`[ANALYZE] pdf-parse: only ${parsed.length} chars — scanned document, trying single-file OCR then chunked approach`);
    } catch (pdfErr: any) {
      console.warn(`[ANALYZE] pdf-parse failed (${pdfErr.message}), using OCR approach`);
    }

    // 2b. For smaller scanned PDFs, try one-shot fileParser (full document) before chunking
    const sizeMB = bufferToUse.length / (1024 * 1024);
    if (sizeMB < 12) {
      try {
        const oneShotBase64 = `data:application/pdf;base64,${bufferToUse.toString("base64")}`;
        console.log(`[ANALYZE] Trying one-shot fileParser for ${fileName} (${sizeMB.toFixed(1)}MB)`);
        const raw = await aiChat(
          SMART_MODEL,
          [
            { role: "system", content: MEDICAL_RECORD_EXTRACTION_PROMPT },
            {
              role: "user",
              content: [
                { type: "text", text: `Analyze this military or VA medical record (${fileName}) and extract ALL VA-claimable diagnoses, conditions, injuries, and medications.` },
                { type: "file", file: { filename: fileName, file_data: oneShotBase64 } } as any,
              ],
            },
          ],
          4096,
          0.3,
          { fileParser: { enabled: true, pdf: { engine: "mistral-ocr" } } }
        );
        const oneShotDiagnoses = parseDiagnosesFromResponse(raw);
        if (oneShotDiagnoses.length > 0) {
          console.log(`[ANALYZE] One-shot fileParser found ${oneShotDiagnoses.length} diagnoses`);
          return { diagnoses: oneShotDiagnoses, rawAnalysis: raw };
        }
      } catch (oneShotErr: any) {
        console.warn(`[ANALYZE] One-shot fileParser failed (${oneShotErr.message}), falling back to chunked OCR`);
      }
    }

    // 2c. Scanned PDF — split into small page chunks and OCR each one
    return analyzeScannedPdfInChunks(bufferToUse, fileName);
  }

  // ─────────────────────────────────────────────────────
  // 3. DOCX → mammoth text extraction
  // ─────────────────────────────────────────────────────
  if (isDocx) {
    const buf = fileBuffer || (fileData ? Buffer.from(fileData.replace(/^data:[^;]+;base64,/, ""), "base64") : null);
    if (buf) {
      try {
        const mammoth = await import("mammoth");
        const docxData = await mammoth.extractRawText({ buffer: buf });
        const parsed = (docxData.value || "").trim();
        console.log(`[ANALYZE] DOCX parsed: ${parsed.length} chars`);
        if (parsed.length > 50) {
          return analyzeExtractedText(parsed, fileName);
        }
      } catch (e: any) {
        console.warn(`[ANALYZE] DOCX parse failed: ${e.message}`);
      }
    }
  }

  // ─────────────────────────────────────────────────────
  // 4. Text-like files, .doc, and other
  // ─────────────────────────────────────────────────────
  const buf = fileBuffer || (fileData ? Buffer.from(fileData.replace(/^data:[^;]+;base64,/, ""), "base64") : null);
  if (buf) {
    let text = "";
    if (isTextLike) {
      text = buf.toString("utf8").trim();
    } else if (isDoc) {
      text = buf.toString("utf8").replace(/[^\x09\x0A\x0D\x20-\x7E]+/g, " ").trim();
    } else {
      text = buf.toString("utf8").replace(/[^\x09\x0A\x0D\x20-\x7E]+/g, " ").trim();
    }
    console.log(`[ANALYZE] Text extraction for ${fileType}: ${text.length} chars`);
    if (text.length > 50) {
      return analyzeExtractedText(text, fileName);
    }
  }

  console.log(`[ANALYZE] No usable content could be extracted from ${fileName}`);
  return { diagnoses: [], rawAnalysis: "No text could be extracted from the document. Please try a different file format (PDF, DOCX, or image)." };
}

/**
 * Split a scanned PDF into small page-range chunks, OCR each chunk via
 * Insforge fileParser, then merge all diagnoses.
 *
 * Why chunking?  A 99-page scanned PDF causes gateway timeouts when sent
 * whole.  10-page chunks are small enough to process within the timeout.
 */
async function analyzeScannedPdfInChunks(
  pdfBuffer: Buffer,
  fileName: string,
): Promise<{ diagnoses: ExtractedDiagnosis[]; rawAnalysis: string }> {
  const { PDFDocument } = await import("pdf-lib");
  const srcDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const totalPages = srcDoc.getPageCount();
  const PAGES_PER_CHUNK = 10; // small enough to avoid gateway timeout
  const chunks = Math.ceil(totalPages / PAGES_PER_CHUNK);

  console.log(`[ANALYZE] Splitting ${totalPages}-page scanned PDF into ${chunks} chunk(s) of ~${PAGES_PER_CHUNK} pages`);

  const allDiagnoses: ExtractedDiagnosis[] = [];
  const rawParts: string[] = [];

  for (let i = 0; i < chunks; i++) {
    const startPage = i * PAGES_PER_CHUNK;
    const endPage = Math.min(startPage + PAGES_PER_CHUNK, totalPages);
    const label = `pages ${startPage + 1}-${endPage} of ${totalPages}`;

    console.log(`[ANALYZE] Processing chunk ${i + 1}/${chunks}: ${label}`);

    try {
      // Create a small PDF with just this page range
      const chunkDoc = await PDFDocument.create();
      const copiedPages = await chunkDoc.copyPages(
        srcDoc,
        Array.from({ length: endPage - startPage }, (_, j) => startPage + j),
      );
      copiedPages.forEach((p) => chunkDoc.addPage(p));
      const chunkBytes = await chunkDoc.save();
      const chunkBase64 = `data:application/pdf;base64,${Buffer.from(chunkBytes).toString("base64")}`;
      const chunkSizeMB = (chunkBytes.length / (1024 * 1024)).toFixed(1);

      console.log(`[ANALYZE]   chunk ${i + 1}: ${chunkSizeMB}MB, sending to fileParser…`);

      const raw = await aiChat(SMART_MODEL, [
        { role: "system", content: MEDICAL_RECORD_EXTRACTION_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this section of a military medical record (${fileName}, ${label}). Extract ALL VA-claimable diagnoses, conditions, injuries, medications, and abnormal findings from these pages.`,
            },
            {
              type: "file",
              file: { filename: `${fileName}_chunk${i + 1}.pdf`, file_data: chunkBase64 },
            } as any,
          ],
        },
      ], 4096, 0.3, {
        fileParser: { enabled: true, pdf: { engine: "mistral-ocr" } },
      });

      console.log(`[ANALYZE]   chunk ${i + 1} response: ${raw.length} chars`);
      rawParts.push(`--- ${label} ---\n${raw}`);

      const chunkDiagnoses = parseDiagnosesFromResponse(raw);
      const chunkFirstPage = String(startPage + 1);
      chunkDiagnoses.forEach((d) => {
        if (!d.pageNumber || !String(d.pageNumber).trim()) d.pageNumber = chunkFirstPage;
      });
      console.log(`[ANALYZE]   chunk ${i + 1} found ${chunkDiagnoses.length} diagnosis(es): ${chunkDiagnoses.map(d => d.conditionName).join(", ") || "(none)"}`);
      allDiagnoses.push(...chunkDiagnoses);
    } catch (chunkErr: any) {
      console.warn(`[ANALYZE]   chunk ${i + 1} failed: ${chunkErr.message}`);
      rawParts.push(`--- ${label} --- ERROR: ${chunkErr.message}`);
      // Continue with remaining chunks — don't abort the whole analysis
    }
  }

  // Deduplicate by condition name (case-insensitive)
  const seen = new Set<string>();
  const deduped = allDiagnoses.filter((d) => {
    const key = d.conditionName.toUpperCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`[ANALYZE] Chunked analysis complete: ${allDiagnoses.length} total → ${deduped.length} unique diagnoses`);
  return { diagnoses: deduped, rawAnalysis: rawParts.join("\n\n") };
}

/** Send extracted plain text to the AI for diagnosis extraction */
async function analyzeExtractedText(
  text: string,
  fileName: string
): Promise<{ diagnoses: ExtractedDiagnosis[]; rawAnalysis: string }> {
  const MAX_TEXT_CHARS = 400000; // ~100k tokens, supports ~500 pages
  const textForAI = text.slice(0, MAX_TEXT_CHARS);
  const wasTruncated = text.length > MAX_TEXT_CHARS;

  console.log(`[ANALYZE] Sending ${textForAI.length} chars to AI for diagnosis extraction${wasTruncated ? ` (truncated from ${text.length})` : ""}`);

  const raw = await aiChat(SMART_MODEL, [
    { role: "system", content: MEDICAL_RECORD_EXTRACTION_PROMPT },
    {
      role: "user",
      content: `Document: ${fileName}${wasTruncated ? ` (first ${Math.ceil(MAX_TEXT_CHARS / 3000)} of ~${Math.ceil(text.length / 3000)} pages shown)` : ""}\n\nExtract ALL VA-claimable diagnoses from this medical record. Look for every diagnosis, medication (infer conditions from meds), abnormal finding, injury, limitation, and mental health note:\n\n${textForAI}`,
    },
  ], 4096, 0.3);

  console.log(`[ANALYZE] AI text analysis response: ${raw.length} chars, first 300: ${raw.slice(0, 300)}`);
  const diagnoses = parseDiagnosesFromResponse(raw);
  console.log(`[ANALYZE] Parsed ${diagnoses.length} diagnoses: ${diagnoses.map(d => d.conditionName).join(", ")}`);
  return { diagnoses, rawAnalysis: raw };
}

function parseDiagnosesFromResponse(raw: string): ExtractedDiagnosis[] {
  if (!raw || !raw.trim()) {
    console.warn("[ANALYZE] parseDiagnoses: empty AI response");
    return [];
  }

  // Strip markdown fences and any leading/trailing prose
  let cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

  // If the response contains JSON array, extract it (AI sometimes wraps in explanatory text)
  const jsonArrayMatch = cleaned.match(/\[[\s\S]*\]/);
  if (jsonArrayMatch) {
    cleaned = jsonArrayMatch[0];
  }

  try {
    const arr = JSON.parse(cleaned);
    if (!Array.isArray(arr)) {
      console.warn(`[ANALYZE] parseDiagnoses: parsed JSON is not an array (type=${typeof arr})`);
      // If it's a single object, wrap it
      if (arr && typeof arr === "object" && (arr.conditionName || arr.condition_name)) {
        return [mapDiagnosisItem(arr)];
      }
      return [];
    }
    return arr.map(mapDiagnosisItem);
  } catch (parseErr: any) {
    console.warn(`[ANALYZE] parseDiagnoses: JSON parse failed: ${parseErr.message}`);
    console.warn(`[ANALYZE] parseDiagnoses: raw response (first 500): ${raw.slice(0, 500)}`);
    return [];
  }
}

function mapDiagnosisItem(item: any): ExtractedDiagnosis {
  return {
    conditionName: String(item.conditionName || item.condition_name || "").trim() || "Unspecified condition",
    diagnosticCode: String(item.diagnosticCode || item.diagnostic_code || "").trim(),
    cfrReference: String(item.cfrReference || item.cfr_reference || "").trim(),
    onsetDate: String(item.onsetDate || item.onset_date || "").trim(),
    connectionType: item.connectionType === "secondary" ? "secondary" : "direct",
    isPresumptive: Boolean(item.isPresumptive ?? item.is_presumptive),
    sourceDocument: String(item.sourceDocument || item.source_document || "").trim(),
    supportingQuotes: Array.isArray(item.supportingQuotes) ? item.supportingQuotes : (Array.isArray(item.supporting_quotes) ? item.supporting_quotes : []),
    category: String(item.category || "OTHER").trim(),
    pageNumber: String(item.pageNumber ?? item.page_number ?? "").trim() || undefined,
  };
}
