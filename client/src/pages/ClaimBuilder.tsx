import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { DashboardLayout, getWorkflowProgress } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  ChevronRight, 
  ChevronLeft, 
  Stethoscope, 
  AlertTriangle, 
  FileText, 
  CheckCircle2, 
  BrainCircuit,
  Bot,
  Plus,
  Trash2,
  Upload,
  Eye,
  Pencil,
  Printer,
  Download,
  Loader2,
  Lightbulb,
  X,
  AlertCircle,
  User
} from "lucide-react";
import { addNotification } from "@/components/NotificationDropdown";
import { CONTACT_EMAIL_ADMIN } from "@/lib/contact";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useStripePriceIds } from "@/hooks/use-stripe-price-ids";
import { useSubscription, PROMO_ACTIVE } from "@/hooks/use-subscription";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Evidence {
  id: string;
  type: string;
  description: string;
  fileName?: string;
  fileData?: string;  // Deprecated - kept for backwards compatibility
  objectPath?: string;  // Cloud storage path for uploaded files
  serverFilePath?: string; // Temp server path used for immediate AI analysis
  fileType?: string;
  status: "pending" | "uploaded";
  printEnabled?: boolean;
  analysisStatus?: "pending" | "processing" | "complete" | "failed";
  analysisError?: string;
}

interface Condition {
  id: string;
  name: string;
  onsetDate: string;
  frequency: string;
  symptoms: string[];
  otherSymptom: string;
  connectionType: "direct" | "secondary";
  isPresumptive: boolean;
  dailyImpact: string;
  /** Page number in source document (e.g. "24"); shown as "(Pg. #24)" after condition name */
  sourcePage?: string;
}

const steps = [
  { id: 1, title: "Evidence", icon: FileText },
  { id: 2, title: "Conditions", icon: Stethoscope },
  { id: 3, title: "Symptoms & Severity", icon: AlertTriangle },
  { id: 4, title: "Review, Print, & Send to VA", icon: CheckCircle2 },
];

const symptomOptions = ["Pain", "Discomfort", "Limited function", "Difficulty with daily activities", "Sleep disruption", "Anxiety", "Depression", "Other"];

const symptomDescriptions: Record<string, string> = {
  "Pain": "I experience chronic pain that significantly impacts my ability to perform routine tasks. Per 38 CFR, this pain is persistent and affects my concentration and ability to maintain gainful employment. The pain often radiates and worsens with physical activity.",
  "Discomfort": "I experience persistent discomfort that interferes with my daily activities and quality of life. As documented in VA rating criteria, this discomfort is present during both rest and activity, limiting my functional capacity.",
  "Limited function": "My range of motion and functional capacity is significantly limited due to this condition. Per 38 CFR rating criteria, this limitation prevents me from performing many routine physical activities and affects my ability to work.",
  "Difficulty with daily activities": "This condition makes it difficult to perform basic daily activities such as dressing, bathing, and household chores. The VA recognizes these limitations as impacting my ability to live independently and maintain employment.",
  "Sleep disruption": "I experience significant sleep disruption due to this condition, often waking multiple times per night. Per VA rating guidelines, this chronic sleep disturbance causes daytime fatigue, difficulty concentrating, and affects my overall health and productivity.",
  "Anxiety": "I experience persistent anxiety related to this condition that interferes with my daily functioning. Per 38 CFR mental health rating criteria, this anxiety causes hypervigilance, difficulty relaxing, and impacts my social and occupational functioning.",
  "Depression": "I experience depression symptoms including persistent sadness, loss of interest, and hopelessness related to this condition. Per VA mental health rating criteria, these symptoms significantly impact my motivation, relationships, and ability to function.",
};

const aiTips: Record<string, string> = {
  "Tinnitus": "For Tinnitus claims, document how the ringing affects your concentration and sleep. The VA values statements about 'persistent' or 'recurrent' symptoms.",
  "PTSD": "For PTSD claims, a detailed stressor statement and buddy statements from fellow service members can significantly strengthen your case.",
  "Sleep Apnea": "For Sleep Apnea, a current diagnosis via sleep study is essential. Document how fatigue impacts your work and daily life.",
  "Lower Back Pain": "For back conditions, document any specific in-service injuries and get current range of motion measurements from your doctor.",
  "default": "Document how this condition impacts your daily life, work, and relationships. The more specific details you provide, the stronger your claim."
};

export default function ClaimBuilder() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [activeConditionIndex, setActiveConditionIndex] = useState(0);
  const [showEvidenceDialog, setShowEvidenceDialog] = useState(false);
  const [editingEvidence, setEditingEvidence] = useState<Evidence | null>(null);
  const [allEvidence, setAllEvidence] = useState<Evidence[]>([]);
  const [subscriptionTier, setSubscriptionTier] = useState<string>("starter");
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showSymptomsPopup, setShowSymptomsPopup] = useState(false);
  const [showMissingConditionPopup, setShowMissingConditionPopup] = useState(false);
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<Evidence | null>(null);
  const [selectedTier, setSelectedTier] = useState<{name: string, price: string, link: string}>({ name: "", price: "", link: "" });
  const [onsetDateError, setOnsetDateError] = useState<string>("");
  const [showOnsetDateErrorDialog, setShowOnsetDateErrorDialog] = useState(false);
  const [generatedMemorandum, setGeneratedMemorandum] = useState<string>("");
  const [processingProgress, setProcessingProgress] = useState(0);
  const [isProcessingClaim, setIsProcessingClaim] = useState(false);
  const [processingPhase, setProcessingPhase] = useState<string>("Initializing deep dive analysis...");
  const [claimNumber, setClaimNumber] = useState<number>(1);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [claimStarted, setClaimStarted] = useState(false);
  const [showVagueConditionPopup, setShowVagueConditionPopup] = useState(false);
  const [hasShownVaguePopup, setHasShownVaguePopup] = useState(false);
  const [showPrintInstructionsPopup, setShowPrintInstructionsPopup] = useState(false);
  const [showDocumentPreview, setShowDocumentPreview] = useState(false);
  const [documentPreviewIntent, setDocumentPreviewIntent] = useState<"print" | "download" | null>(null);
  const [previewHtml, setPreviewHtml] = useState("");
  const printAreaRef = useRef<HTMLDivElement>(null);
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const [isAnalyzingRecords, setIsAnalyzingRecords] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState("");
  const [uploadingEvidenceId, setUploadingEvidenceId] = useState<string | null>(null);
  const [showProfileRequiredDialog, setShowProfileRequiredDialog] = useState(false);
  const [showEvidenceWarningPopup, setShowEvidenceWarningPopup] = useState(false);
  const [showConditionsFoundPopup, setShowConditionsFoundPopup] = useState(false);
  const [newConditionsCount, setNewConditionsCount] = useState(0);
  const [showEvidenceReviewPopup, setShowEvidenceReviewPopup] = useState(false);
  const [conditionIdsViewed, setConditionIdsViewed] = useState<Set<string>>(new Set());
  const [conditions, setConditions] = useState<Condition[]>([]);

  // When on step 3 (Symptoms & Severity), mark the currently viewed condition as "clicked"
  useEffect(() => {
    if (currentStep === 3 && conditions[activeConditionIndex]?.id) {
      setConditionIdsViewed((prev) => new Set(prev).add(conditions[activeConditionIndex].id));
    }
  }, [currentStep, activeConditionIndex, conditions]);

  // Route guard: Check workflow progress
  useEffect(() => {
    const progress = getWorkflowProgress();
    if (!progress.canAccessClaimBuilder) {
      if (!progress.canAccessServiceHistory) {
        toast({
          title: "Complete Personal Info First",
          description: "Please complete all previous steps before accessing Claim Builder.",
          variant: "destructive",
        });
        setLocation("/dashboard/profile");
      } else if (!progress.canAccessMedicalConditions) {
        toast({
          title: "Complete Service History First",
          description: "Please complete all previous steps before accessing Claim Builder.",
          variant: "destructive",
        });
        setLocation("/dashboard/service-history");
      } else {
        toast({
          title: "Complete Medical Conditions First",
          description: "Please save your medical conditions before accessing Claim Builder.",
          variant: "destructive",
        });
        setLocation("/dashboard/medical-history");
      }
    }
  }, []);

  const parseMonthYear = (value: string): { month: number; year: number } | null => {
    const match = value.match(/^(\d{2})\/(\d{4})$/);
    if (!match) return null;
    const month = parseInt(match[1], 10);
    const year = parseInt(match[2], 10);
    if (month < 1 || month > 12) return null;
    if (year < 1940 || year > new Date().getFullYear()) return null;
    return { month, year };
  };

  const formatMonthYearInput = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}/${digits.slice(2, 6)}`;
  };

  const handleOnsetDateChange = (value: string) => {
    const formatted = formatMonthYearInput(value);
    updateCondition(activeConditionIndex, { onsetDate: formatted });
    
    if (formatted.length === 7) {
      const parsed = parseMonthYear(formatted);
      if (!parsed) {
        setOnsetDateError("date is incorrect.");
        setShowOnsetDateErrorDialog(true);
      } else {
        setOnsetDateError("");
      }
    } else {
      setOnsetDateError("");
    }
  };

  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const { getPriceId } = useStripePriceIds();

  const handleSelectPlan = (tierName: string, price: string) => {
    // During promo, Pro tier is free - activate directly without payment
    if (tierName === "Pro" && PROMO_ACTIVE) {
      const savedProfile = localStorage.getItem("userProfile");
      const profile = savedProfile ? JSON.parse(savedProfile) : {};
      profile.subscriptionTier = "pro";
      localStorage.setItem("userProfile", JSON.stringify(profile));
      setSubscriptionTier("pro");
      setShowUpgradeDialog(false);
      toast({
        title: "Pro Plan Activated!",
        description: "You now have full access to all Pro features.",
      });
      return;
    }
    
    // For Deluxe or non-promo, show payment dialog
    setSelectedTier({ 
      name: tierName, 
      price, 
      link: `/signup?tier=${tierName.toLowerCase()}` 
    });
    setShowUpgradeDialog(false);
    setShowPaymentDialog(true);
  };

  const handleCheckout = async () => {
    const tierKey = selectedTier.name.toLowerCase();
    const priceId = getPriceId(tierKey);
    if (!priceId) {
      toast({ title: "Payment not configured", description: "This plan is not available for checkout right now. Please try again later.", variant: "destructive" });
      return;
    }

    setIsProcessingPayment(true);
    try {
      const { authFetch } = await import("../lib/api-helpers");
      const response = await authFetch("/api/stripe/checkout", {
        method: "POST",
        body: JSON.stringify({ priceId, tier: tierKey })
      });

      if (response.status === 401) {
        window.location.href = `/signup?tier=${tierKey}`;
        return;
      }

      const data = await response.json();
      const checkoutUrl = typeof data?.url === "string" && data.url.startsWith("https://") ? data.url : null;
      if (checkoutUrl) {
        setShowPaymentDialog(false);
        window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
      } else {
        const errorMessage = data?.message || "Unable to create checkout session. Please try again.";
        toast({ title: "Payment Error", description: errorMessage, variant: "destructive" });
        console.error("No checkout URL returned", data);
      }
    } catch (error) {
      toast({ title: "Payment Error", description: "Failed to process payment. Please try again.", variant: "destructive" });
      console.error("Checkout error:", error);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const [userRole, setUserRole] = useState<string>("user");

  // Check if profile is complete - must be done before any features are enabled. Sync Deluxe/Pro tier so claim builder is identical for both.
  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem("userProfile");
      const selectedTier = localStorage.getItem("selectedTier");
      const paymentComplete = localStorage.getItem("paymentComplete");

      if (savedProfile) {
        const profile = JSON.parse(savedProfile);
        let tier = profile.subscriptionTier || "starter";
        // Ensure Deluxe users who paid get subscriptionTier set (same claim builder as Pro)
        if (tier === "starter" && selectedTier && paymentComplete === "true") {
          const tierKey = selectedTier.toLowerCase();
          if (tierKey === "deluxe" || tierKey === "pro") {
            profile.subscriptionTier = tierKey;
            localStorage.setItem("userProfile", JSON.stringify(profile));
            tier = tierKey;
            window.dispatchEvent(new Event("workflowProgressUpdate"));
          }
        }
        setSubscriptionTier(tier);
        setUserRole(profile.role || "user");
        if (profile.firstName && profile.lastName && profile.email) {
          setIsProfileComplete(true);
        } else {
          setIsProfileComplete(false);
          setShowProfileRequiredDialog(true);
        }
      } else {
        setIsProfileComplete(false);
        setShowProfileRequiredDialog(true);
      }
    } catch {
      console.warn("[ClaimBuilder] Corrupt userProfile in localStorage, resetting");
      localStorage.removeItem("userProfile");
      setIsProfileComplete(false);
      setShowProfileRequiredDialog(true);
    }
  }, []);

  const isAdmin = userRole === "admin";
  const isDevelopment = import.meta.env.DEV;
  const { isPaidTier: subscriptionPaidTier } = useSubscription();
  const isPaidTier = isDevelopment || subscriptionTier !== "starter" || isAdmin || PROMO_ACTIVE || subscriptionPaidTier;
  
  const safeShowUpgradeDialog = () => {
    // BULLETPROOF: Never show upgrade dialog during promo period
    if (PROMO_ACTIVE) {
      console.log("Promo active - upgrade dialog blocked");
      return;
    }
    if (isPaidTier) {
      return;
    }
    setShowUpgradeDialog(true);
  };

  // Force close upgrade dialog if promo is active (safety net)
  useEffect(() => {
    if (PROMO_ACTIVE && showUpgradeDialog) {
      setShowUpgradeDialog(false);
    }
  }, [showUpgradeDialog]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("claimBuilderConditions");
      const savedEvidence = localStorage.getItem("claimBuilderEvidence");
      if (saved) {
        const parsed: Condition[] = JSON.parse(saved);
        const normalized: Condition[] = parsed.map((c) => ({
          ...c,
          connectionType: (c.connectionType === "secondary" ? "secondary" : "direct") as "direct" | "secondary",
        }));
        setConditions(normalized);
        if (normalized.length > 0 && JSON.stringify(normalized) !== saved) {
          localStorage.setItem("claimBuilderConditions", JSON.stringify(normalized));
        }
      }
      if (savedEvidence) {
        const parsed = JSON.parse(savedEvidence);
        const filtered = parsed
          .filter((e: Evidence) =>
            e.type !== "Buddy Statements" && e.type !== "Personal Statement" && e.type !== "Personal Statements"
          )
          .map((e: Evidence) => ({
            ...e,
            printEnabled: e.printEnabled !== undefined ? e.printEnabled : (e.status === "uploaded" ? true : false),
            analysisStatus: e.analysisStatus ?? (e.status === "uploaded" ? "pending" : undefined),
            analysisError: e.analysisError ?? undefined,
          }));
        setAllEvidence(filtered);
        localStorage.setItem("claimBuilderEvidence", JSON.stringify(filtered));
      }
      const savedMemo = localStorage.getItem("generatedMemorandum");
      if (savedMemo) {
        setGeneratedMemorandum(savedMemo);
      }
      const savedClaimNumber = localStorage.getItem("claimNumber");
      if (savedClaimNumber) {
        setClaimNumber(parseInt(savedClaimNumber, 10));
      }
      const savedClaimStarted = localStorage.getItem("claimStarted");
      const savedConditions = localStorage.getItem("claimBuilderConditions");
      const previousClaimEnded = localStorage.getItem("previousClaimEnded");

      let isClaimActive = false;
      if (previousClaimEnded === "true") {
        isClaimActive = false;
      } else if (savedClaimStarted === "true") {
        isClaimActive = true;
      } else if (savedConditions) {
        const parsed = JSON.parse(savedConditions);
        if (parsed && parsed.length > 0) {
          isClaimActive = true;
        }
      }

      setClaimStarted(isClaimActive);
      localStorage.setItem("claimStarted", isClaimActive.toString());
    } catch (err) {
      console.warn("[ClaimBuilder] Error loading saved state:", err);
    }
  }, []);

  const saveConditions = (updatedConditions: Condition[]) => {
    localStorage.setItem("claimBuilderConditions", JSON.stringify(updatedConditions));
  };

  const saveEvidence = (updater: Evidence[] | ((prev: Evidence[]) => Evidence[])) => {
    if (typeof updater === 'function') {
      setAllEvidence(prev => {
        const next = updater(prev);
        localStorage.setItem("claimBuilderEvidence", JSON.stringify(next));
        return next;
      });
    } else {
      localStorage.setItem("claimBuilderEvidence", JSON.stringify(updater));
      setAllEvidence(updater);
    }
  };

  const cancelClaim = () => {
    // Delete all claim data
    localStorage.removeItem("claimBuilderConditions");
    localStorage.removeItem("claimBuilderEvidence");
    localStorage.removeItem("generatedMemorandum");
    
    // Mark that previous claim was cancelled/completed - next startNewClaim will increment
    localStorage.setItem("previousClaimEnded", "true");
    
    // Reset state
    setConditions([]);
    setAllEvidence([]);
    setGeneratedMemorandum("");
    setCurrentStep(1);
    setActiveConditionIndex(0);
    setShowCancelDialog(false);
    setClaimStarted(false);
    localStorage.setItem("claimStarted", "false");
    
    toast({ 
      title: "Claim Cancelled", 
      description: "All claim data has been deleted.", 
      variant: "destructive" 
    });
  };

  // Centralized function to ensure claim is started before adding conditions
  const ensureClaimStarted = (): number => {
    // If no conditions exist and claim not started, this is starting a new claim
    if (conditions.length === 0 && !claimStarted) {
      const previousClaimEnded = localStorage.getItem("previousClaimEnded");
      const savedClaimNumber = localStorage.getItem("claimNumber");
      const currentNumber = savedClaimNumber ? parseInt(savedClaimNumber, 10) : 0;
      
      if (previousClaimEnded === "true") {
        // Increment claim number for new claim after cancel
        const newClaimNumber = currentNumber + 1;
        setClaimNumber(newClaimNumber);
        localStorage.setItem("claimNumber", newClaimNumber.toString());
        localStorage.removeItem("previousClaimEnded");
        setClaimStarted(true);
        localStorage.setItem("claimStarted", "true");
        
        toast({ 
          title: "New Claim Started", 
          description: "Starting Claim #" + newClaimNumber + "." 
        });
        return newClaimNumber;
      } else {
        // First ever claim or continuing
        const newNumber = currentNumber > 0 ? currentNumber : 1;
        setClaimNumber(newNumber);
        localStorage.setItem("claimNumber", newNumber.toString());
        setClaimStarted(true);
        localStorage.setItem("claimStarted", "true");
        return newNumber;
      }
    }
    // Return current claim number from localStorage for consistency
    const savedClaimNumber = localStorage.getItem("claimNumber");
    return savedClaimNumber ? parseInt(savedClaimNumber, 10) : claimNumber;
  };

  const startNewClaim = () => {
    ensureClaimStarted();
    addCondition();
  };

  const addCondition = () => {
    // Ensure claim is started before adding any condition
    ensureClaimStarted();
    
    const newCondition: Condition = {
      id: Date.now().toString(),
      name: "",
      onsetDate: "",
      frequency: "constant",
      symptoms: [],
      otherSymptom: "",
      connectionType: "direct",
      isPresumptive: false,
      dailyImpact: ""
    };
    const updated = [...conditions, newCondition];
    setConditions(updated);
    setActiveConditionIndex(updated.length - 1);
    saveConditions(updated);
    setCurrentStep(1);
  };

  const removeCondition = (index: number) => {
    if (conditions.length === 1) {
      toast({ title: "Cannot Remove", description: "You must have at least one condition.", variant: "destructive" });
      return;
    }
    const updated = conditions.filter((_, i) => i !== index);
    setConditions(updated);
    setActiveConditionIndex(Math.max(0, index - 1));
    saveConditions(updated);
  };

  const updateCondition = (index: number, updates: Partial<Condition>) => {
    const updated = conditions.map((c, i) => i === index ? { ...c, ...updates } : c);
    setConditions(updated);
    saveConditions(updated);
  };

  const toggleSymptom = (symptom: string) => {
    const current = conditions[activeConditionIndex];
    const isCurrentlyChecked = current.symptoms.includes(symptom);
    const newSymptoms = isCurrentlyChecked
      ? current.symptoms.filter(s => s !== symptom)
      : [...current.symptoms, symptom];
    
    let newDailyImpact = current.dailyImpact;
    
    if (!isCurrentlyChecked && symptom !== "Other") {
      // Adding a symptom - append description
      const description = symptomDescriptions[symptom];
      if (description) {
        newDailyImpact = newDailyImpact ? `${newDailyImpact}\n\n${description}` : description;
      }
    } else if (isCurrentlyChecked && symptom !== "Other") {
      // Removing a symptom - remove its description
      const description = symptomDescriptions[symptom];
      if (description && newDailyImpact) {
        // Remove the description (with or without leading newlines)
        newDailyImpact = newDailyImpact.replace(`\n\n${description}`, '');
        newDailyImpact = newDailyImpact.replace(`${description}\n\n`, '');
        newDailyImpact = newDailyImpact.replace(description, '');
        // Clean up any double newlines left over
        newDailyImpact = newDailyImpact.replace(/\n{3,}/g, '\n\n').trim();
      }
    }
    
    updateCondition(activeConditionIndex, { symptoms: newSymptoms, dailyImpact: newDailyImpact });
  };

  const generateEvidenceList = () => {
    const evidenceTypes = [
      { type: "Military Medical Records", description: "Service treatment records, military hospital records, and medical evaluations from your time in service" },
      { type: "Other Non-Military Medical Records", description: "VA treatment records, private doctor records, and civilian medical documentation" },
      { type: "Nexus / Buddy Letters and/or Other Supporting Documents (Optional)", description: "Medical opinion letters linking conditions to service, buddy statements, and other supporting evidence" },
    ];
    
        
    const newEvidence: Evidence[] = evidenceTypes.map((e, idx) => ({
      id: `ev-${Date.now()}-${idx}`,
      type: e.type,
      description: e.description,
      status: "pending"
    }));
    
    saveEvidence(newEvidence);
    toast({ title: "Evidence List Generated", description: "Upload your documents to strengthen your claim." });
  };

  // Auto-generate evidence list when entering Step 1 (Evidence) so all three Upload buttons are immediately visible
  useEffect(() => {
    if (currentStep === 1 && allEvidence.length === 0) {
      generateEvidenceList();
    }
  }, [currentStep]);

  const handleRealFileUpload = async (evidenceId: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.tif,.tiff,.bmp,.webp';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const MAX_UPLOAD_BYTES = 500 * 1024 * 1024;
      if (file.size > MAX_UPLOAD_BYTES) {
        toast({ title: "File Too Large", description: "Please upload files smaller than 500MB.", variant: "destructive" });
        return;
      }

      setUploadingEvidenceId(evidenceId);
      try {
        toast({ title: "Uploading...", description: `Uploading ${file.name} (${(file.size / (1024 * 1024)).toFixed(1)}MB)...` });

        const { authFetch, getAccessToken } = await import("../lib/api-helpers");
        const maxTries = 3;
        const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

        // Step 1: Request upload URL (with retry)
        let urlResponse: Response | null = null;
        let lastUrlError: Error | null = null;
        for (let attempt = 1; attempt <= maxTries; attempt++) {
          try {
            urlResponse = await authFetch("/api/uploads/request-url", {
              method: "POST",
              body: JSON.stringify({
                name: file.name,
                size: file.size,
                contentType: file.type || "application/octet-stream",
              }),
            });
            if (urlResponse.ok) break;
            const errData = await urlResponse.text();
            lastUrlError = new Error(`Server could not prepare the upload (${urlResponse.status}). Please try again.`);
            console.warn(`[Upload] request-url attempt ${attempt}/${maxTries} failed:`, urlResponse.status, errData);
          } catch (netErr: any) {
            lastUrlError = new Error("Cannot connect to server. Please check your connection and try again.");
            console.warn("[Upload] request-url network error:", netErr);
          }
          if (attempt < maxTries) await delay(500 * attempt);
        }

        if (!urlResponse?.ok) {
          throw lastUrlError ?? new Error("Server could not prepare the upload. Please try again.");
        }

        let urlData: { uploadURL?: string; objectPath?: string };
        try {
          const ct = urlResponse.headers.get("content-type") || "";
          if (!ct.includes("application/json")) {
            const txt = await urlResponse.text();
            throw new Error(`Server returned non-JSON (${ct}): ${txt.substring(0, 120)}`);
          }
          urlData = await urlResponse.json();
        } catch (parseErr: any) {
          throw new Error(`Invalid response from server: ${parseErr.message || "not JSON"}`);
        }
        const { uploadURL, objectPath } = urlData;
        if (!uploadURL) {
          throw new Error("Server did not return an upload URL. Please try again.");
        }

        const uploadFullUrl = uploadURL.startsWith("http") ? uploadURL : `${window.location.origin}${uploadURL}`;
        console.log("[Upload] uploadURL:", uploadURL, "→ uploadFullUrl:", uploadFullUrl);
        const token = getAccessToken();
        const uploadHeaders: Record<string, string> = {
          "Content-Type": file.type || "application/octet-stream",
        };
        if (token) uploadHeaders["Authorization"] = `Bearer ${token}`;

        // Step 2: PUT file (with retry)
        let uploadResponse: Response | null = null;
        let lastPutError: Error | null = null;
        for (let attempt = 1; attempt <= maxTries; attempt++) {
          try {
            uploadResponse = await fetch(uploadFullUrl, { method: "PUT", body: file, headers: uploadHeaders });
            if (uploadResponse.ok) break;
            const errText = await uploadResponse.text();
            lastPutError = new Error(
              uploadResponse.status === 413
                ? "File is too large for the server. Please try a smaller file."
                : `Upload failed (${uploadResponse.status}). Please try again.`
            );
            console.warn(`[Upload] PUT attempt ${attempt}/${maxTries} failed:`, uploadResponse.status, errText);
          } catch (netErr: any) {
            lastPutError = new Error("Upload interrupted. The file may be too large for your connection. Please try again.");
            console.warn("[Upload] PUT network error:", netErr);
          }
          if (attempt < maxTries) await delay(500 * attempt);
        }

        if (!uploadResponse?.ok) {
          throw lastPutError ?? new Error("Upload failed. Please try again.");
        }

        let uploadData: { serverFilePath?: string; objectPath?: string } = {};
        try {
          const text = await uploadResponse.text();
          uploadData = text ? JSON.parse(text) : {};
        } catch {
          console.warn("[Upload] Response was not JSON; continuing with local file path.");
        }

        const serverFilePath = uploadData?.serverFilePath;
        const resolvedObjectPath = objectPath ?? uploadData?.objectPath ?? `/objects/uploads/${file.name}`;

        handleFileUpload(evidenceId, file.name, undefined, file.type, resolvedObjectPath, serverFilePath);

        const evidenceItem = allEvidence.find((e) => e.id === evidenceId);
        runMedicalRecordsAnalysis(evidenceId, file, evidenceItem?.type || "Medical Records", serverFilePath);
      } catch (error: any) {
        console.error("Upload error:", error);
        toast({
          title: "Upload Failed",
          description: error?.message || "Could not upload file. Please try again.",
          variant: "destructive",
        });
      } finally {
        setUploadingEvidenceId(null);
      }
    };
    input.click();
  };

  const handleViewEvidence = (evidence: Evidence) => {
    if (evidence.objectPath || evidence.fileData) {
      setViewingDocument(evidence);
      setShowDocumentViewer(true);
    } else {
      toast({ title: "No Document", description: "No document has been uploaded yet.", variant: "destructive" });
    }
  };

  const retryEvidenceAnalysis = (evidence: Evidence) => {
    if (evidence.status !== "uploaded") return;
    runMedicalRecordsAnalysis(
      evidence.id,
      null,
      evidence.type || "Medical Records",
      evidence.serverFilePath,
      evidence.fileName,
      evidence.fileType
    );
  };

  const deleteEvidence = (evidenceId: string) => {
    saveEvidence(prev => prev.map(e =>
      e.id === evidenceId
        ? {
            ...e,
            fileName: undefined,
            fileData: undefined,
            fileType: undefined,
            objectPath: undefined,
            serverFilePath: undefined,
            status: "pending" as const,
            printEnabled: false,
            analysisStatus: undefined,
            analysisError: undefined,
          }
        : e
    ));
    toast({ title: "Document Removed", description: "The uploaded file has been removed. You can upload a new document." });
  };

  const togglePrintEnabled = (evidenceId: string) => {
    saveEvidence(prev => prev.map(e =>
      e.id === evidenceId ? { ...e, printEnabled: !e.printEnabled } : e
    ));
  };

  const capitalize = (str: string) => {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  const getUserProfile = () => {
    const saved = localStorage.getItem("userProfile");
    if (saved) return JSON.parse(saved);
    return { firstName: "", lastName: "", ssn: "", phone: "", email: "" };
  };

  const getServiceHistory = () => {
    const saved = localStorage.getItem("serviceHistory");
    if (saved) {
      const periods = JSON.parse(saved);
      if (periods.length > 0) return periods[0];
    }
    return { branch: "" };
  };

  const getBranchName = (branch: string) => {
    const branchNames: Record<string, string> = {
      army: "United States Army",
      navy: "United States Navy",
      marines: "United States Marine Corps",
      airforce: "United States Air Force",
      coastguard: "United States Coast Guard",
      spaceforce: "United States Space Force"
    };
    return branchNames[branch] || "United States Military";
  };

  const setEvidenceAnalysisState = (
    evidenceId: string,
    analysisStatus: "pending" | "processing" | "complete" | "failed",
    analysisError?: string,
  ) => {
    saveEvidence(prev => prev.map(e =>
      e.id === evidenceId ? { ...e, analysisStatus, analysisError } : e
    ));
  };

  const handleFileUpload = (
    evidenceId: string,
    fileName: string,
    fileData?: string,
    fileType?: string,
    objectPath?: string,
    serverFilePath?: string
  ) => {
    saveEvidence(prev => prev.map(e =>
      e.id === evidenceId
        ? {
            ...e,
            fileName,
            fileData,
            fileType,
            objectPath,
            serverFilePath,
            status: "uploaded" as const,
            printEnabled: true,
            analysisStatus: "pending" as const,
            analysisError: undefined,
          }
        : e
    ));
    toast({ title: "Document Uploaded", description: `${fileName} has been added.` });
  };

  const runMedicalRecordsAnalysis = async (
    evidenceId: string,
    file: File | null,
    evidenceType: string,
    serverFilePath?: string,
    fallbackFileName?: string,
    fallbackFileType?: string
  ) => {
    const { authFetch } = await import("../lib/api-helpers");
    setEvidenceAnalysisState(evidenceId, "processing");
    setIsAnalyzingRecords(true);
    const fileSizeMB = file ? (file.size / (1024 * 1024)).toFixed(1) : "?";
    const isLargeFile = file ? file.size > 10 * 1024 * 1024 : false;
    setAnalysisProgress(
      isLargeFile
        ? `Analyzing ${fileSizeMB}MB ${evidenceType || "medical records"} — large documents are scanned in 10-page chunks...`
        : `Analyzing ${evidenceType || "medical records"} for diagnoses...`
    );
    try {
      // Send serverFilePath so the server reads the file from disk (no base64 needed)
      const requestBody: Record<string, string> = {
        fileType: file?.type || fallbackFileType || "application/octet-stream",
        fileName: file?.name || fallbackFileName || "document",
      };
      if (serverFilePath) {
        requestBody.serverFilePath = serverFilePath;
      } else {
        if (!file) {
          throw new Error("Please re-upload the file so it can be analyzed.");
        }
        // Fallback for small files: read as base64 (only if server path unavailable)
        setAnalysisProgress("Reading document...");
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            const base64Data = result.includes(",") ? result.split(",")[1] : result;
            resolve(base64Data || "");
          };
          reader.onerror = () => reject(new Error("Failed to read file"));
          reader.readAsDataURL(file);
        });
        requestBody.fileData = base64;
        setAnalysisProgress("Analyzing medical records for diagnoses...");
      }

      let res: Response | null = null;
      let responseText = "";
      let lastTransportError: Error | null = null;
      const maxAttempts = 3;
      const baseOpts = { method: "POST" as const, body: JSON.stringify(requestBody) };
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          res = await authFetch("/api/ai/analyze-medical-records", baseOpts);
          responseText = await res.text();
          break;
        } catch (transportErr: any) {
          lastTransportError = transportErr instanceof Error ? transportErr : new Error(String(transportErr));
          if (attempt < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1200 * attempt));
          }
        }
      }
      if (!res) {
        throw (lastTransportError || new Error("Analysis request failed"));
      }
      // If server returned 503 or 401 (e.g. invalid token / config), retry once without auth so analysis can still run when anon key is valid
      if ((res.status === 503 || res.status === 401) && (await import("../lib/api-helpers")).getAccessToken()) {
        try {
          const { apiUrl } = await import("../lib/api-helpers");
          const fallback = await fetch(apiUrl("/api/ai/analyze-medical-records"), {
            ...baseOpts,
            headers: { "Content-Type": "application/json" },
            credentials: "include",
          });
          const fallbackText = await fallback.text();
          if (fallback.ok) {
            res = fallback;
            responseText = fallbackText;
          }
        } catch (_) {
          // Keep original res/responseText
        }
      }
      const isHtml = responseText.trimStart().toLowerCase().startsWith("<!doctype") || responseText.trimStart().toLowerCase().startsWith("<html");
      if (isHtml) {
        throw new Error("The backend server is not responding. Please restart the server and try again.");
      }
      if (!responseText.trim()) {
        throw new Error("The server returned an empty response. Please try again.");
      }
      let data: { diagnoses?: unknown[]; rawAnalysis?: string };
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error("The server returned an invalid response. Please restart the server and try again.");
      }
      if (!res.ok) {
        const message = (data as { message?: string })?.message || "Analysis failed. Please try again.";
        const isServiceUnavailable =
          res.status === 503 ||
          /invalid token|temporarily unavailable|not configured|service key|add conditions manually/i.test(message);
        throw new Error(isServiceUnavailable ? "Analysis service is temporarily unavailable. Add conditions manually in the Conditions step." : message);
      }
      const { diagnoses } = data;
      if (diagnoses && diagnoses.length > 0) {
        setEvidenceAnalysisState(evidenceId, "complete");
        ensureClaimStarted();
        const newConditions: Condition[] = (diagnoses as { conditionName: string; onsetDate?: string; connectionType?: string; isPresumptive?: boolean; pageNumber?: string }[]).map((d) => ({
          id: `cond-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          name: (d.conditionName || "").toUpperCase().trim() || "Condition",
          onsetDate: d.onsetDate || "",
          frequency: "constant",
          symptoms: [],
          otherSymptom: "",
          connectionType: d.connectionType === "secondary" ? "secondary" : "direct",
          isPresumptive: Boolean(d.isPresumptive),
          dailyImpact: "",
          sourcePage: (d.pageNumber && String(d.pageNumber).trim()) || undefined,
        }));
        setConditions(prev => {
          // Remove empty/unnamed default conditions when AI extracted real diagnoses
          const nonEmpty = prev.filter(c => c.name.trim() !== "");
          const next = [...nonEmpty, ...newConditions];
          saveConditions(next);
          setActiveConditionIndex(next.length - 1);
          return next;
        });
        toast({
          title: "Conditions Extracted",
          description: `Found ${newConditions.length} condition(s) from your medical records. Review and edit them in the Conditions step.`,
        });
        setNewConditionsCount(newConditions.length);
        setShowConditionsFoundPopup(true);
      } else {
        setEvidenceAnalysisState(evidenceId, "complete");
        // Check if the rawAnalysis explains why (e.g. scanned PDF, API error)
        const rawMsg = data?.rawAnalysis || "";
        const isApiError = rawMsg.toLowerCase().includes("credits") || rawMsg.toLowerCase().includes("api key") || rawMsg.toLowerCase().includes("unavailable");
        toast({
          title: isApiError ? "Analysis Service Busy" : "Analysis Complete",
          description: isApiError
            ? "The AI analysis service is temporarily busy. Please try again in a few minutes, or add conditions manually in the next step."
            : "No VA-claimable diagnoses were found in this document. You can add conditions manually in the next step.",
          variant: isApiError ? "destructive" : undefined,
        });
      }
    } catch (err: any) {
      console.error("Medical records analysis error:", err);
      const msg = err?.message || "";
      setEvidenceAnalysisState(evidenceId, "failed", msg || "Analysis failed");
      const isServiceUnavailable =
        msg.toLowerCase().includes("credits") ||
        msg.toLowerCase().includes("api key") ||
        msg.toLowerCase().includes("forbidden") ||
        msg.toLowerCase().includes("invalid token") ||
        msg.toLowerCase().includes("temporarily unavailable") ||
        msg.toLowerCase().includes("not configured") ||
        msg.toLowerCase().includes("add conditions manually");
      toast({
        title: isServiceUnavailable ? "Analysis Unavailable" : "Analysis Unavailable",
        description: isServiceUnavailable
          ? "The analysis service could not process this document. You can add conditions manually in the Conditions step."
          : (msg || "Could not analyze document. Add conditions manually in the Conditions step."),
        variant: "destructive",
      });
    } finally {
      setIsAnalyzingRecords(false);
      setAnalysisProgress("");
    }
  };

  const nextStep = async () => {
    // Step 1 (Evidence): show review popup; user must click OK to proceed
    if (currentStep === 1) {
      setShowEvidenceReviewPopup(true);
      return;
    }
    // Step 2 (Conditions): require at least one condition with a name
    if (currentStep === 2) {
      if (!activeCondition?.name || activeCondition.name.trim() === "") {
        setShowMissingConditionPopup(true);
        return;
      }
      setCurrentStep((prev) => Math.min(prev + 1, steps.length));
      return;
    }
    // Step 3 (Severity): show symptoms popup; on confirm, advance to step 4
    if (currentStep === 3) {
      setShowSymptomsPopup(true);
      return;
    }
    // Step 4: Continue button not used (user is on Review)
    if (currentStep === 4) {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length));
    }
  };

  const proceedFromEvidenceWarning = async () => {
    setShowEvidenceWarningPopup(false);
    if (!isPaidTier && !PROMO_ACTIVE) {
      safeShowUpgradeDialog();
      return;
    }
    await processClaimData();
  };

  const processClaimData = async () => {
    // Guard: prevent double-invoke while already processing
    if (isProcessingClaim) return;

    setIsProcessingClaim(true);
    setProcessingProgress(0);
    setProcessingPhase("Initializing deep dive analysis...");

    // Multi-phase progress with detailed status messages for deep AI analysis
    const phases = [
      { progress: 10, message: "Collecting veteran profile and service history..." },
      { progress: 20, message: "Analyzing uploaded evidence documents..." },
      { progress: 35, message: "Cross-referencing evidence with medical conditions..." },
      { progress: 50, message: "Researching applicable 38 CFR Part 4 diagnostic codes..." },
      { progress: 65, message: "Identifying relevant case law precedents..." },
      { progress: 75, message: "Building legal arguments for service connection..." },
      { progress: 85, message: "Generating comprehensive claim memorandum..." },
      { progress: 95, message: "Finalizing document with legal citations..." },
    ];

    let phaseIndex = 0;

    // Extended progress interval for deep AI analysis (up to 60 seconds)
    const progressInterval = setInterval(() => {
      if (phaseIndex < phases.length) {
        setProcessingProgress(phases[phaseIndex].progress);
        setProcessingPhase(phases[phaseIndex].message);
        phaseIndex++;
      }
    }, 5000); // Update every 5 seconds for detailed processing

    try {
      const profile = getUserProfile();
      const serviceInfo = getServiceHistory();
      const fullName = `${capitalize(profile.firstName) || ""} ${capitalize(profile.lastName) || ""}`.trim();
      const ssnFormatted = profile.ssn ? `${profile.ssn.slice(0, 3)}-${profile.ssn.slice(3, 5)}-${profile.ssn.slice(5)}` : "";
      const branchName = getBranchName(serviceInfo.branch);

      // Categorize evidence for deep analysis
      const categorizeEvidence = (evidence: Evidence[]) => {
        return evidence.filter(e => e.status === "uploaded").map(e => {
          let category = "other";
          const typeLower = e.type.toLowerCase();
          const descLower = e.description.toLowerCase();
          
          if (typeLower.includes("military") || descLower.includes("service treatment") || descLower.includes("str") || descLower.includes("dd-214")) {
            category = "military_medical";
          } else if (typeLower.includes("non-military") || typeLower.includes("private") || descLower.includes("private") || descLower.includes("civilian")) {
            category = "non_military_medical";
          } else if (typeLower.includes("nexus") || typeLower.includes("buddy") || descLower.includes("nexus") || descLower.includes("buddy") || descLower.includes("lay statement")) {
            category = "nexus_buddy_letters";
          }
          
          return {
            type: e.type,
            description: e.description,
            fileName: e.fileName || "",
            category: category
          };
        });
      };

      const categorizedEvidence = categorizeEvidence(allEvidence);

      const { authFetch } = await import("../lib/api-helpers");
      const response = await authFetch("/api/ai/generate-claim-memorandum", {
        method: "POST",
        body: JSON.stringify({
          veteranName: fullName,
          ssn: ssnFormatted,
          phone: profile.phone || "",
          email: profile.email || "",
          branch: branchName,
          conditions: conditions.map(c => ({
            name: c.name,
            onsetDate: c.onsetDate,
            frequency: c.frequency,
            symptoms: c.symptoms,
            connectionType: c.connectionType,
            isPresumptive: c.isPresumptive,
            dailyImpact: c.dailyImpact
          })),
          evidence: categorizedEvidence
        })
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedMemorandum(data.memorandum);
        localStorage.setItem("generatedMemorandum", data.memorandum);
        clearInterval(progressInterval);
        setProcessingProgress(100);
        setProcessingPhase("Deep dive analysis complete!");
        setTimeout(() => {
          setIsProcessingClaim(false);
          setProcessingProgress(0);
          setProcessingPhase("Initializing deep dive analysis...");
          setCurrentStep(4);
          toast({ title: "Support Statement Ready", description: "Your Support Statement has been generated. Review below and use Print or Download PDF when ready." });
        }, 1000);
      } else {
        // If API fails, show error and stay on current step
        clearInterval(progressInterval);
        setIsProcessingClaim(false);
        setProcessingProgress(0);
        setProcessingPhase("Initializing deep dive analysis...");
        localStorage.removeItem("generatedMemorandum");
        setGeneratedMemorandum("");
        toast({ 
          title: "Generation Failed", 
          description: "Unable to generate your claim statement. You can still proceed with the template or try again.", 
          variant: "destructive" 
        });
        // Still advance to step 4 to show the template fallback
        setCurrentStep(4);
      }
    } catch (error) {
      console.error("Error processing claim:", error);
      clearInterval(progressInterval);
      setIsProcessingClaim(false);
      setProcessingProgress(0);
      setProcessingPhase("Initializing deep dive analysis...");
      localStorage.removeItem("generatedMemorandum");
      setGeneratedMemorandum("");
      toast({ 
        title: "Processing Error", 
        description: "An error occurred while processing your claim. You can proceed with the template.", 
        variant: "destructive" 
      });
      setCurrentStep(4);
    }
  };
  
  const confirmNextStep = () => {
    setShowSymptomsPopup(false);
    // When advancing from Step 3 (Severity) to Step 4: auto-generate Support Statement after review/scan/analyze, then show preview & print only
    if (currentStep === 3) {
      const hasUploadedEvidence = allEvidence.some(e => e.status === "uploaded");
      if (!hasUploadedEvidence) {
        setShowEvidenceWarningPopup(true);
        return;
      }
      // With evidence: run deep-dive analysis to generate Support Statement, then advance to step 4 (preview & print)
      processClaimData();
      return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, steps.length));
  };
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  const activeCondition = conditions[activeConditionIndex];
  const conditionTip = aiTips[activeCondition?.name] || aiTips["default"];
  /** Display condition name with page reference when found in a document, e.g. "LUMBAR STRAIN (Pg. #24)" */
  const conditionDisplayName = (c: Condition) => {
    const base = c?.name?.trim() || "";
    return base ? (c.sourcePage ? `${base} (Pg. #${c.sourcePage})` : base) : "";
  };

  const allConditionsClicked = conditions.length === 0 || conditions.every((c) => conditionIdsViewed.has(c.id));
  const allConditionsHaveSymptomsFilled =
    conditions.length === 0 ||
    conditions.every(
      (c) => ((c.symptoms?.length ?? 0) > 0 || (c.dailyImpact?.trim() ?? "") !== "")
    );
  const canContinueFromStep3 = allConditionsClicked && allConditionsHaveSymptomsFilled;

  const handlePrint = () => {
    if (!isPaidTier && !PROMO_ACTIVE) {
      safeShowUpgradeDialog();
      return;
    }
    setDocumentPreviewIntent("print");
    setShowDocumentPreview(true);
  };

  const handleDownloadPDF = () => {
    if (!isPaidTier && !PROMO_ACTIVE) {
      safeShowUpgradeDialog();
      return;
    }
    setDocumentPreviewIntent("download");
    setShowDocumentPreview(true);
  };

  // Capture printable content when preview opens (also re-capture if memo content changes while open)
  useEffect(() => {
    if (showDocumentPreview && printAreaRef.current) {
      setPreviewHtml(printAreaRef.current.innerHTML);
    }
  }, [showDocumentPreview, generatedMemorandum, allEvidence]);

  const runPrint = () => {
    setShowDocumentPreview(false);
    setDocumentPreviewIntent(null);
    setTimeout(() => window.print(), 150);
  };

  const runDownloadPDF = () => {
    setShowDocumentPreview(false);
    setDocumentPreviewIntent(null);
    setTimeout(() => {
      window.print();
      toast({
        title: "Save as PDF",
        description: "In the print dialog, choose 'Save as PDF' or 'Print to PDF' to save the document to your computer or device.",
      });
    }, 150);
  };

  const confirmPrint = () => {
    setShowPrintInstructionsPopup(false);
    setTimeout(() => window.print(), 100);
  };

  const handleSaveFinishedClaim = () => {
    saveConditions(conditions);
    saveEvidence(allEvidence);
    toast({ title: "Claim Saved", description: "Your finished claim has been saved successfully." });
    
    addNotification({
      type: "success",
      title: "Claim Saved Successfully",
      message: `Your claim with ${conditions.length} condition${conditions.length !== 1 ? 's' : ''} has been saved. Consider submitting it to the VA soon.`,
      link: "/dashboard/claim-builder"
    });
  };

  const showWarriorCoach = currentStep === 2 || currentStep === 3;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <span>Claims</span>
            <ChevronRight className="h-4 w-4" />
            <span>New Claim</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-primary flex flex-wrap items-center gap-2 sm:gap-3">
            Intelligent Claim Builder
            <span className="text-xs bg-secondary/20 text-secondary-foreground px-2 py-1 rounded-full font-sans font-medium flex items-center gap-1 border border-secondary/30">
              <BrainCircuit className="h-3 w-3" /> AI Assisted
            </span>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground mt-2">
            Build your claim with AI-powered guidance for maximum approval likelihood.
          </p>
        </div>

        {/* Active Claims Box - Only shown when claim is started */}
        {claimStarted && (
          <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-primary/5 border border-primary/20 rounded-lg p-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="bg-primary text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-bold text-sm sm:text-base">
                Active Claim #{claimNumber}
              </div>
              <span className="text-muted-foreground text-sm sm:text-base">
                {conditions.length} condition{conditions.length !== 1 ? 's' : ''} added
              </span>
            </div>
            <Button
              variant="outline"
              className="bg-blue-500 hover:bg-blue-600 text-white border-blue-500 hover:border-blue-600 font-semibold min-h-[44px]"
              onClick={() => setShowCancelDialog(true)}
              data-testid="button-cancel-claim"
            >
              Cancel Claim
            </Button>
          </div>
        )}

        {/* Condition Tabs */}
        <div className="mb-6 flex flex-wrap gap-2 overflow-x-auto">
          {conditions.map((condition, index) => (
            <div key={condition.id} className="flex items-center flex-shrink-0">
              <Button
                variant={activeConditionIndex === index ? "default" : "outline"}
                onClick={() => {
                  setActiveConditionIndex(index);
                  setConditionIdsViewed((prev) => new Set(prev).add(condition.id));
                }}
                className="rounded-r-none text-xs sm:text-sm md:text-base max-w-[180px] sm:max-w-[240px] md:max-w-none truncate min-h-[44px]"
                data-testid={`button-condition-tab-${index}`}
                title={conditionDisplayName(condition) || `Condition ${index + 1}`}
              >
                {conditionDisplayName(condition) || `Condition ${index + 1}`}
              </Button>
              {conditions.length > 1 && (
                <Button
                  variant={activeConditionIndex === index ? "default" : "outline"}
                  size="icon"
                  className="rounded-l-none border-l-0 min-h-[44px] w-9"
                  onClick={() => removeCondition(index)}
                  aria-label={`Remove ${condition.name || 'condition'}`}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>

        {/* Stepper */}
        <div className="mb-8">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-4 sm:top-5 w-full h-1 bg-gray-200 -z-10 rounded-full"></div>
            <div className="absolute left-0 top-4 sm:top-5 h-1 bg-primary transition-all duration-500 rounded-full" style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}></div>

            {steps.map((step) => {
              const isActive = step.id === currentStep;
              const isCompleted = step.id <= currentStep;

              return (
                <div key={step.id} className="flex flex-col items-center gap-1 sm:gap-2 bg-muted/30 px-1 sm:px-2 rounded-lg">
                  <div
                    className={`
                      w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 z-10
                      ${isActive ? "bg-green-600 border-green-600 text-white shadow-lg scale-110" :
                        isCompleted ? "bg-green-600 border-green-600 text-white" : "bg-white border-gray-300 text-gray-400"}
                    `}
                  >
                    {isCompleted ? <CheckCircle2 className="h-4 w-4 sm:h-6 sm:w-6" /> : <step.icon className="h-4 w-4 sm:h-5 sm:w-5" />}
                  </div>
                  <span className={`text-[10px] sm:text-sm font-medium text-center leading-tight ${isActive ? "text-primary font-bold" : "text-muted-foreground"}`}>
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className={`grid ${showWarriorCoach ? 'lg:grid-cols-3' : ''} gap-8 print:block print:!grid-cols-1`} id="claim-builder-content-area">
          <div className={`${showWarriorCoach ? "lg:col-span-2" : ""} print:!col-span-full`}>
            <AnimatePresence mode="wait">
              <motion.div
                key={`${currentStep}-${activeConditionIndex}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="print:!opacity-100 print:!transform-none"
              >
                <Card className="shadow-lg border-primary/5 min-h-[350px] sm:min-h-[450px] print:shadow-none print:border-0 print:min-h-0">
                  <CardContent className="p-4 sm:p-6 md:p-8">
                    {/* Step 1: Evidence - Upload documents first */}
                    {currentStep === 1 && (
                      <div className="space-y-6">
                        <div className="flex justify-between items-center">
                          <h2 className="text-xl font-bold text-primary font-serif">Evidence for Claims</h2>
                          {allEvidence.length === 0 && (
                            <Button onClick={generateEvidenceList} className="bg-secondary text-secondary-foreground">
                              <FileText className="mr-2 h-4 w-4" /> Generate Evidence List
                            </Button>
                          )}
                        </div>

                        {conditions.length > 0 && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                            <p className="text-sm text-blue-800">
                              <span className="font-bold">Claiming {conditions.length} condition{conditions.length > 1 ? 's' : ''}:</span>{' '}
                              {conditions.map(c => c.name || 'Unnamed').join(', ')}
                            </p>
                          </div>
                        )}
                        {conditions.length === 0 && (
                          <p className="text-sm text-muted-foreground">Upload Military Medical Records to automatically extract conditions from your records. You can also add conditions manually in the next step.</p>
                        )}

                        {allEvidence.length === 0 ? (
                          <div className="text-center py-12 border-2 border-dashed rounded-lg">
                            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-lg text-muted-foreground">Click "Generate Evidence List" to see what documents to upload.</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {allEvidence.map((evidence) => (
                              <div key={evidence.id} className="border rounded-lg p-3 sm:p-4 hover:bg-gray-50 transition-colors">
                                <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:justify-between">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h4 className="font-bold text-primary text-sm sm:text-base">{evidence.type}</h4>
                                      {evidence.status === "uploaded" && (
                                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Uploaded</span>
                                      )}
                                    </div>
                                    <p className="text-sm sm:text-base text-muted-foreground mt-1">{evidence.description}</p>
                                    {evidence.fileName && (
                                      <p className="text-sm text-primary mt-2 flex items-center gap-1 truncate">
                                        <FileText className="h-3 w-3 flex-shrink-0" /> <span className="truncate">{evidence.fileName}</span>
                                      </p>
                                    )}
                                    {evidence.status === "uploaded" && evidence.analysisStatus === "processing" && (
                                      <p className="text-xs mt-2 text-blue-700 bg-blue-50 inline-flex px-2 py-0.5 rounded-full items-center gap-1">
                                        <Loader2 className="h-3 w-3 animate-spin" /> Analyzing document...
                                      </p>
                                    )}
                                    {evidence.status === "uploaded" && evidence.analysisStatus === "complete" && (
                                      <p className="text-xs mt-2 text-green-700 bg-green-50 inline-flex px-2 py-0.5 rounded-full">
                                        Analysis complete
                                      </p>
                                    )}
                                    {evidence.status === "uploaded" && evidence.analysisStatus === "failed" && (
                                      <p className="text-xs mt-2 text-red-700 bg-red-50 inline-flex px-2 py-0.5 rounded-full">
                                        Analysis failed: {evidence.analysisError || "Please retry."}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex flex-col gap-2 items-stretch sm:items-end">
                                    <div className="flex flex-wrap gap-2">
                                      {evidence.status === "uploaded" && (
                                        <>
                                          <Button variant="outline" size="sm" className="min-h-[44px] sm:min-h-0" onClick={() => handleViewEvidence(evidence)}>
                                            <Eye className="h-3 w-3 mr-1" /> View
                                          </Button>
                                          <Button variant="outline" size="sm" className="min-h-[44px] sm:min-h-0" onClick={() => { setEditingEvidence(evidence); setShowEvidenceDialog(true); }}>
                                            <Pencil className="h-3 w-3 mr-1" /> Edit
                                          </Button>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-destructive hover:text-destructive min-h-[44px] sm:min-h-0"
                                            onClick={() => deleteEvidence(evidence.id)}
                                          >
                                            <Trash2 className="h-3 w-3 mr-1" /> Delete
                                          </Button>
                                        </>
                                      )}
                                      <Button
                                        size="sm"
                                        variant={evidence.status === "uploaded" ? "outline" : "default"}
                                        disabled={uploadingEvidenceId === evidence.id}
                                        onClick={() => handleRealFileUpload(evidence.id)}
                                        className="min-h-[44px] sm:min-h-0"
                                      >
                                        {uploadingEvidenceId === evidence.id ? (
                                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                        ) : (
                                          <Upload className="h-3 w-3 mr-1" />
                                        )}
                                        {uploadingEvidenceId === evidence.id ? "Uploading..." : (evidence.status === "uploaded" ? "Re-upload" : "Upload")}
                                      </Button>
                                    </div>
                                    {evidence.status === "uploaded" && (
                                      <Button
                                        variant={evidence.printEnabled ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => togglePrintEnabled(evidence.id)}
                                        className={`min-h-[44px] sm:min-h-0 ${evidence.printEnabled ? "bg-primary" : ""}`}
                                      >
                                        <Printer className="h-3 w-3 mr-1" />
                                        {evidence.printEnabled ? "Print Enabled" : "Enable Print"}
                                      </Button>
                                    )}
                                    {evidence.status === "uploaded" && evidence.analysisStatus === "failed" && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="min-h-[44px] sm:min-h-0"
                                        onClick={() => retryEvidenceAnalysis(evidence)}
                                      >
                                        Retry Analysis
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Step 2: Conditions - Add or edit conditions (auto-populated from evidence if available) */}
                    {currentStep === 2 && (
                      <div className="space-y-6">
                        <h2 className="text-xl font-bold text-primary font-serif">Add your Disability/Injury To Be Claimed Below</h2>
                        {conditions.length === 0 ? (
                          <div className="text-center py-12 border-2 border-dashed rounded-lg">
                            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-lg text-muted-foreground mb-4">No conditions added yet. Add conditions below or upload Military Medical Records in the Evidence step to auto-extract them.</p>
                            <Button
                              onClick={startNewClaim}
                              className="bg-primary hover:bg-primary/90 text-white font-bold px-6 py-3"
                              data-testid="button-start-new-claim"
                            >
                              <Plus className="mr-2 h-5 w-5" /> ADD or Start New Claim
                            </Button>
                          </div>
                        ) : (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label className="text-lg font-semibold">What is the medical condition? <span className="text-muted-foreground font-normal">(Explanation should be vague)</span></Label>
                            <Input 
                              value={activeCondition?.name || ""} 
                              onChange={(e) => updateCondition(activeConditionIndex, { name: e.target.value.toUpperCase() })}
                              onFocus={() => {
                                if (!hasShownVaguePopup) {
                                  setShowVagueConditionPopup(true);
                                  setHasShownVaguePopup(true);
                                }
                              }}
                              placeholder="e.g., TINNITUS, PTSD, SLEEP APNEA, LOWER BACK PAIN"
                              className={`text-lg uppercase ${activeCondition?.name ? "font-bold" : ""}`}
                              data-testid="input-condition-name"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label className="text-base">Approximate Date of Onset (MM/YYYY)</Label>
                            <Input 
                              type="text"
                              value={activeCondition?.onsetDate || ""}
                              onChange={(e) => handleOnsetDateChange(e.target.value)}
                              placeholder="01/1990"
                              maxLength={7}
                              className={`w-full md:w-1/2 ${activeCondition?.onsetDate ? "font-bold" : ""} ${onsetDateError ? "border-2 border-red-500" : ""}`}
                              data-testid="input-onset-date"
                            />
                            {onsetDateError && (
                              <span className="text-xs text-red-500">{onsetDateError}</span>
                            )}
                          </div>

                          <div className="space-y-3 pt-2">
                            <div className="flex items-center space-x-2 border p-3 sm:p-3 rounded-lg hover:bg-gray-50 cursor-pointer min-h-[44px]" onClick={() => updateCondition(activeConditionIndex, { isPresumptive: !activeCondition?.isPresumptive })}>
                              <Checkbox 
                                id="presumptive"
                                checked={activeCondition?.isPresumptive || false}
                                onCheckedChange={(checked) => updateCondition(activeConditionIndex, { isPresumptive: checked as boolean })}
                                data-testid="checkbox-presumptive"
                              />
                              <Label htmlFor="presumptive" className="font-medium text-base cursor-pointer">This may be a presumptive condition (PACT Act, Burn Pits, Agent Orange, etc.)</Label>
                            </div>
                          </div>

                          <div className="space-y-3 pt-2">
                            <Label className="text-base">Type of Service Connection</Label>
                            <RadioGroup 
                              value={activeCondition?.connectionType ?? "direct"}
                              onValueChange={(value) => updateCondition(activeConditionIndex, { connectionType: value as any })}
                            >
                              <div className="flex items-center space-x-2 border p-3 sm:p-3 rounded-lg hover:bg-gray-50 cursor-pointer min-h-[44px]">
                                <RadioGroupItem value="direct" id="conn-direct" />
                                <Label htmlFor="conn-direct" className="cursor-pointer flex-1 text-base">
                                  <span className="font-medium">Direct</span>
                                  <span className="text-sm text-muted-foreground ml-2">- Condition started during or was caused by service</span>
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2 border p-3 sm:p-3 rounded-lg hover:bg-gray-50 cursor-pointer min-h-[44px]">
                                <RadioGroupItem value="secondary" id="conn-secondary" />
                                <Label htmlFor="conn-secondary" className="cursor-pointer flex-1 text-base">
                                  <span className="font-medium">Secondary</span>
                                  <span className="text-sm text-muted-foreground ml-2">- Caused by another service-connected condition</span>
                                </Label>
                              </div>
                            </RadioGroup>
                          </div>
                        </div>
                        )}
                      </div>
                    )}

                    {/* Step 3: Symptoms & Severity */}
                    {currentStep === 3 && (
                      <div className="space-y-6">
                        <h2 className="text-xl font-bold text-primary font-serif">Symptoms & Severity: {activeCondition ? (conditionDisplayName(activeCondition) || "Condition") : "Condition"}</h2>
                        
                        <div className="space-y-4">
                          <Label className="text-base">How often do you experience symptoms?</Label>
                          <RadioGroup 
                            value={activeCondition?.frequency || "constant"}
                            onValueChange={(value) => updateCondition(activeConditionIndex, { frequency: value })}
                          >
                            <div className="flex items-center space-x-2 border p-3 sm:p-3 rounded-lg hover:bg-gray-50 cursor-pointer min-h-[44px]">
                              <RadioGroupItem value="constant" id="freq-constant" />
                              <Label htmlFor="freq-constant" className="cursor-pointer flex-1 text-base">Constant / Persistent</Label>
                            </div>
                            <div className="flex items-center space-x-2 border p-3 sm:p-3 rounded-lg hover:bg-gray-50 cursor-pointer min-h-[44px]">
                              <RadioGroupItem value="frequent" id="freq-frequent" />
                              <Label htmlFor="freq-frequent" className="cursor-pointer flex-1 text-base">Frequent (3-4 times/week)</Label>
                            </div>
                            <div className="flex items-center space-x-2 border p-3 sm:p-3 rounded-lg hover:bg-gray-50 cursor-pointer min-h-[44px]">
                              <RadioGroupItem value="occasional" id="freq-occasional" />
                              <Label htmlFor="freq-occasional" className="cursor-pointer flex-1 text-base">Occasional</Label>
                            </div>
                          </RadioGroup>
                        </div>

                        <div className="space-y-3">
                          <Label className="text-base">Select all symptoms that apply:</Label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {symptomOptions.map((symptom) => (
                              <div key={symptom} className="flex items-center space-x-2">
                                <Checkbox 
                                  id={symptom} 
                                  checked={activeCondition?.symptoms.includes(symptom)}
                                  onCheckedChange={() => toggleSymptom(symptom)}
                                />
                                <Label htmlFor={symptom} className="font-normal text-base">{symptom}</Label>
                              </div>
                            ))}
                          </div>
                          
                          {activeCondition?.symptoms.includes("Other") && (
                            <div className="mt-3">
                              <Label className="text-base">Please describe other symptoms:</Label>
                              <Input 
                                value={activeCondition?.otherSymptom || ""}
                                onChange={(e) => updateCondition(activeConditionIndex, { otherSymptom: e.target.value })}
                                placeholder="Describe your other symptoms..."
                                className={`mt-2 text-base ${activeCondition?.otherSymptom ? "font-bold" : ""}`}
                              />
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label className="text-base">How does this condition affect your daily life?</Label>
                          <Textarea
                            value={activeCondition?.dailyImpact || ""}
                            onChange={(e) => updateCondition(activeConditionIndex, { dailyImpact: e.target.value })}
                            placeholder="Describe specific activities you can no longer do or have difficulty with..."
                            rows={4}
                            className={`text-sm sm:text-base min-h-[120px] sm:min-h-[160px] ${activeCondition?.dailyImpact ? "font-bold" : ""}`}
                          />
                          <p className="text-sm text-muted-foreground">Symptom descriptions from 38 CFR are automatically added when you select symptoms above.</p>
                        </div>
                      </div>
                    )}
                    
                    {currentStep === 4 && (
                      <div className="space-y-6 print:p-0">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 print:hidden">
                          <h2 className="text-lg sm:text-xl font-bold text-primary font-serif">Review & Print Support Statement</h2>
                          <div className="flex gap-2 flex-shrink-0">
                            <Button variant="outline" onClick={handlePrint} disabled={isProcessingClaim} className="min-h-[44px] sm:min-h-0">
                              <Printer className="h-4 w-4 mr-2" /> Print
                            </Button>
                            <Button variant="outline" onClick={handleDownloadPDF} disabled={isProcessingClaim} className="min-h-[44px] sm:min-h-0">
                              <Download className="h-4 w-4 mr-2" /> Download PDF
                            </Button>
                          </div>
                        </div>

                        {/* Warning: missing profile contact info would print placeholders */}
                        {(() => {
                          const profile = getUserProfile();
                          const missingFields: string[] = [];
                          if (!profile.phone) missingFields.push("phone number");
                          if (!profile.email) missingFields.push("email address");
                          if (!profile.ssn) missingFields.push("SSN");
                          return missingFields.length > 0 ? (
                            <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 flex items-start gap-3 print:hidden">
                              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm font-bold text-amber-800">Missing profile information</p>
                                <p className="text-sm text-amber-700">
                                  Your {missingFields.join(", ")} {missingFields.length === 1 ? "is" : "are"} not set. Placeholder text will appear in your printed document.{" "}
                                  <button className="underline font-medium" onClick={() => setLocation("/dashboard/profile")}>Update profile</button>
                                </p>
                              </div>
                            </div>
                          ) : null;
                        })()}

                        {/* Claim Summary - Hidden during print (full memorandum prints instead) */}
                        <div className="bg-gray-50 p-4 sm:p-6 rounded-lg space-y-4 print:hidden">
                          <h3 className="italic text-primary border-b pb-2 text-lg sm:text-xl">VA Disability Claim Summary</h3>
                          
                          {conditions.map((condition, idx) => (
                            <div key={condition.id} className="border-b pb-4 last:border-0">
                              <h4 className="font-bold text-primary mb-2 text-lg">Condition {idx + 1}: {conditionDisplayName(condition) || "Not specified"}</h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm sm:text-base">
                                <div className="text-muted-foreground">Onset Date:</div>
                                <div className="font-bold">{condition.onsetDate || "Not specified"}</div>
                                
                                <div className="text-muted-foreground">Frequency:</div>
                                <div className="font-bold capitalize">{condition.frequency}</div>
                                
                                <div className="text-muted-foreground">Connection Type:</div>
                                <div className="font-bold capitalize">{condition.connectionType}{condition.isPresumptive ? " (Presumptive)" : ""}</div>
                                
                                <div className="text-muted-foreground">Symptoms:</div>
                                <div className="font-bold">{condition.symptoms.length > 0 ? condition.symptoms.join(", ") : "None selected"}</div>
                              </div>
                            </div>
                          ))}
                          
                          <div className="border-t pt-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm sm:text-base">
                              <div className="text-muted-foreground">Evidence Uploaded:</div>
                              <div className="font-bold">{allEvidence.filter(e => e.status === "uploaded").length} of {allEvidence.length}</div>
                            </div>
                          </div>
                        </div>

                        {/* Evidence Print Selection */}
                        {allEvidence.filter(e => e.status === "uploaded").length > 0 && (
                          <div className="bg-gray-50 p-4 sm:p-6 rounded-lg space-y-4 print:hidden">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b pb-2">
                              <h3 className="italic text-primary text-lg sm:text-xl">Evidence Documents to Print</h3>
                              <span className="text-sm text-muted-foreground">
                                {allEvidence.filter(e => e.status === "uploaded" && e.printEnabled).length} of {allEvidence.filter(e => e.status === "uploaded").length} enabled
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Select which evidence documents should be printed with your claim memorandum:
                            </p>
                            <div className="space-y-3">
                              {allEvidence.filter(e => e.status === "uploaded").map((evidence) => (
                                <div
                                  key={evidence.id}
                                  className={`border rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:justify-between transition-colors ${evidence.printEnabled ? 'bg-primary/5 border-primary/30' : 'bg-white'}`}
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${evidence.printEnabled ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'}`}>
                                      <FileText className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0">
                                      <h4 className="italic text-sm sm:text-base">{evidence.type}</h4>
                                      <p className="text-sm text-muted-foreground truncate">{evidence.fileName}</p>
                                    </div>
                                  </div>
                                  <Button
                                    variant={evidence.printEnabled ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => togglePrintEnabled(evidence.id)}
                                    className="min-h-[44px] sm:min-h-0 flex-shrink-0"
                                  >
                                    <Printer className="h-4 w-4 mr-2" />
                                    {evidence.printEnabled ? "Will Print" : "Enable Print"}
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Support Statement: auto-generated after review/scan/analyze; preview and print only (no separate generate step) */}
                        {/* Printable area: memorandum + VA contact (ref used for preview dialog) */}
                        <div ref={printAreaRef} className="contents">
                        {/* Claim Memorandum - VA Form 21-526 EZ Equivalent - Arial 11pt, justify, 1.5 line spacing, paragraph indent */}
                        <div className="rounded-lg p-6 bg-white print:p-0 print:block print:break-before-page" data-testid="container-claim-memorandum" style={{ fontFamily: 'Arial', fontSize: '11pt', color: 'black' }}>
                          {generatedMemorandum ? (
                            <div className="text-base" style={{ lineHeight: 2, marginLeft: 0, paddingLeft: 0, color: 'black', fontFamily: 'Arial', fontSize: '11pt', border: 'none', borderWidth: 0 }}>
                              {/* FROZEN-HEADER-MIRROR — Must match supplemental statement header (SUPPLEMENTAL_STATEMENT_TEMPLATE.md §3.1). No horizontal rule. */}
                              {(() => {
                                const profile = getUserProfile();
                                const firstName = capitalize(profile.firstName) || "[First Name]";
                                const lastName = capitalize(profile.lastName) || "[Last Name]";
                                const fullName = `${firstName} ${lastName}`;
                                const ssnFormatted = profile.ssn ? `${profile.ssn.slice(0, 3)}-${profile.ssn.slice(3, 5)}-${profile.ssn.slice(5)}` : "XXX-XX-XXXX";
                                const currentDate = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
                                return (
                                  <div style={{ lineHeight: 2, marginLeft: 0, paddingLeft: 0, textAlign: 'left', fontFamily: 'Arial', fontSize: '12pt' }}>
                                    <p style={{ margin: 0, textIndent: 0, fontFamily: 'Arial', fontSize: '12pt' }}><span className="font-bold">Date:</span> {currentDate}</p>
                                    <p style={{ margin: 0, textIndent: 0, fontFamily: 'Arial', fontSize: '12pt' }}><span className="font-bold">From:</span> Veteran {fullName} (SSN: {ssnFormatted})</p>
                                    <p style={{ margin: 0, textIndent: 0, fontFamily: 'Arial', fontSize: '12pt' }}><span className="font-bold">To:</span> Veteran Affairs Claims Intake Center</p>
                                    <p className="font-bold" style={{ margin: 0, textIndent: 0, fontFamily: 'Arial', fontSize: '12pt', textDecoration: 'underline' }}>Subj: Supporting Statement / Documentation For VA Form 21-526EZ Claims</p>
                                  </div>
                                );
                              })()}
                              {/* To VA Intake Center, at top left under Subj */}
                              <p style={{ textIndent: 0, textAlign: 'left', fontFamily: 'Arial', fontSize: '11pt', marginTop: '0.5em', marginBottom: 0, lineHeight: 2, border: 'none', borderWidth: 0, boxShadow: 'none' }}>To VA Intake Center,</p>
                              <div className="max-w-none whitespace-pre-wrap text-justify" data-testid="text-generated-memorandum" style={{ lineHeight: 2, color: 'black', fontFamily: 'Arial', fontSize: '11pt', marginTop: 0, border: 'none', borderWidth: 0 }}>
                                {(generatedMemorandum.replace(/\n{2,}/g, '\n')).split('\n').filter((line) => {
                                  const t = line.trim();
                                  return !/^Date:\s*/i.test(t) && !/^From:\s*/i.test(t) && !/^To:\s*(Veteran|VA)?/i.test(t) && !/^Subj:\s*/i.test(t);
                                }).map((line, idx) => {
                                  const trimmedLine = line.trim();
                                  const isConditionHeading = /^CONDITION\s+\d+:\s*.+:$/i.test(trimmedLine);
                                  const isConclusionHeading = /^CONCLUSION\s*\/?\s*RATIONALE:?$/i.test(trimmedLine);
                                  const isSectionSubheading = /^(CURRENT SYMPTOMS AND FUNCTIONAL IMPAIRMENT|SUPPORTING EVIDENCE CITATIONS|APPLICABLE LEGAL FRAMEWORK|CASE LAW PRECEDENTS|REQUESTED RATING AND LEGAL ARGUMENT):?$/i.test(trimmedLine);
                                  const isToVAIntakeLine = /^To VA Intake Center,?\s*$/i.test(trimmedLine);
                                  if (isToVAIntakeLine) return null;
                                  const isSeparatorLine = /^[-_=─━═—–·•*]{3,}\s*$/.test(trimmedLine);
                                  if (isSeparatorLine) return null;
                                  
                                  if (isConditionHeading) {
                                    const condNumMatch = trimmedLine.match(/^CONDITION\s+(\d+):/i);
                                    const condIndex = condNumMatch ? parseInt(condNumMatch[1], 10) - 1 : -1;
                                    const sourcePage = condIndex >= 0 && conditions[condIndex]?.sourcePage
                                      ? ` (Pg. #${conditions[condIndex].sourcePage})`
                                      : "";
                                    const displayLine = sourcePage
                                      ? (trimmedLine.endsWith(":") ? trimmedLine.replace(/:$/, `${sourcePage}:`) : trimmedLine + sourcePage)
                                      : trimmedLine;
                                    return (
                                      <div key={idx} style={{ textIndent: 0, textAlign: 'left', marginLeft: 0, marginTop: '1.5em', marginBottom: '1.5em', fontFamily: 'Arial', fontSize: '11pt' }}>
                                        <span className="font-bold underline" style={{ color: 'black' }}>{displayLine}</span>
                                        {'\n'}
                                      </div>
                                    );
                                  }
                                  if (isConclusionHeading) {
                                    return (
                                      <div key={idx} style={{ textIndent: 0, textAlign: 'left', marginLeft: 0, marginTop: '1.5em', marginBottom: '1.5em', fontFamily: 'Arial', fontSize: '11pt' }}>
                                        <span className="font-bold underline" style={{ color: 'black' }}>{trimmedLine}</span>
                                        {'\n'}
                                      </div>
                                    );
                                  }
                                  if (isSectionSubheading) {
                                    return (
                                      <div key={idx} style={{ textIndent: 0, textAlign: 'left', marginLeft: 0, marginTop: '1.5em', marginBottom: '0.5em', fontFamily: 'Arial', fontSize: '11pt', color: 'black' }}>
                                        <span className="italic underline">{trimmedLine}</span>
                                        {'\n'}
                                      </div>
                                    );
                                  }
                                  return (
                                    <div key={idx} style={{ textIndent: '2em', textAlign: 'justify', marginBottom: '0.5em', fontFamily: 'Arial', fontSize: '11pt' }}>
                                      {line}{'\n'}
                                    </div>
                                  );
                                })}
                              </div>
                              
                              {/* Supportive Evidence/Exhibits For Claims - New Page (for AI-generated content) */}
                              {allEvidence.filter(e => e.status === "uploaded" && e.printEnabled).length > 0 && (
                                <div className="mt-8 pt-6 border-t-2 border-black evidence-print-section print:break-before-page" style={{ color: 'black' }}>
                                  <h3 className="text-xl italic uppercase tracking-wide text-center mb-4" style={{ color: 'black' }}>Supportive Evidence/Exhibits For Claims</h3>
                                  <p className="text-sm mb-6 text-center italic" style={{ color: 'black' }}>
                                    (Preponderance of the evidence is that degree of relevant evidence that a reasonable person, considering the record as a whole, would accept as sufficient to find that a contested fact is more likely to be true than untrue).
                                  </p>
                                  <p className="text-sm mb-4 text-center" style={{ color: 'black' }}>
                                    The following {allEvidence.filter(e => e.status === "uploaded" && e.printEnabled).length} document(s) are attached as supporting evidence for this claim:
                                  </p>
                                  {allEvidence.filter(e => e.status === "uploaded" && e.printEnabled).map((evidence, idx) => (
                                    <div key={evidence.id} className="print:break-before-page mb-8" style={{ color: 'black' }}>
                                      <div className="border-b-2 border-black pb-2 mb-4">
                                        <div className="flex items-center gap-2">
                                          <div className="border-2 border-black rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ color: 'black' }}>
                                            {idx + 1}
                                          </div>
                                          <div>
                                            <h4 className="italic text-lg" style={{ color: 'black' }}>{evidence.type}</h4>
                                            <p className="text-sm" style={{ color: 'black' }}>{evidence.description}</p>
                                            {evidence.fileName && (
                                              <p className="text-xs mt-1 flex items-center gap-1">
                                                <FileText className="h-3 w-3" /> 
                                                <span>File: {evidence.fileName}</span>
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      {/* Display images from cloud storage (objectPath) or legacy base64 (fileData) */}
                                      {(evidence.objectPath || evidence.fileData) && evidence.fileType?.startsWith('image/') ? (
                                        <div className="flex justify-center print:block evidence-image-container">
                                          <img 
                                            src={evidence.objectPath || evidence.fileData} 
                                            alt={evidence.type}
                                            className="max-w-full max-h-[800px] object-contain border rounded-lg shadow-sm print:max-h-none print:shadow-none print:rounded-none"
                                          />
                                        </div>
                                      ) : (evidence.objectPath || evidence.fileData) && evidence.fileType === 'application/pdf' ? (
                                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50 print:bg-white" style={{ color: 'black' }}>
                                          <FileText className="h-16 w-16 mx-auto mb-4" style={{ color: 'black' }} />
                                          <p className="italic text-lg">{evidence.fileName}</p>
                                          <p className="text-sm mt-2" style={{ color: 'black' }}>PDF Document - See attached file</p>
                                        </div>
                                      ) : (evidence.objectPath || evidence.fileData) ? (
                                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50 print:bg-white" style={{ color: 'black' }}>
                                          <FileText className="h-16 w-16 mx-auto mb-4" style={{ color: 'black' }} />
                                          <p className="italic text-lg">{evidence.fileName || "Document"}</p>
                                          <p className="text-sm mt-2" style={{ color: 'black' }}>Document attached</p>
                                        </div>
                                      ) : (
                                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50 print:bg-white" style={{ color: 'black' }}>
                                          <FileText className="h-16 w-16 mx-auto mb-4" style={{ color: 'black' }} />
                                          <p className="italic text-lg">{evidence.fileName || "Document"}</p>
                                          <p className="text-sm mt-2" style={{ color: 'black' }}>Document pending upload</p>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                  <div className="mt-6 pt-4 border-t text-center text-sm print:break-before-avoid" style={{ color: 'black' }}>
                                    <p className="italic">End of Claim Package</p>
                                    <p>Total Evidence Documents: {allEvidence.filter(e => e.status === "uploaded" && e.printEnabled).length}</p>
                                  </div>
                                </div>
                              )}

                            </div>
                          ) : (
                          (() => {
                            /* ═══════════════════════════════════════════════════════════════
                             * FROZEN-SUPPLEMENTAL-START
                             * ─────────────────────────────────────────────────────────────
                             * This supplemental statement block is FROZEN and memorialized.
                             * The canonical reference is SUPPLEMENTAL_STATEMENT_TEMPLATE.md
                             *
                             * SECURITY RAILS — DO NOT:
                             *   • Add horizontal rules, dividers, or separator lines
                             *   • Change margins, padding, font sizes, or line heights
                             *   • Alter legal text, wording, or paragraph structure
                             *   • Rearrange or insert sections between existing ones
                             *   • Remove or rename the FROZEN-SUPPLEMENTAL guard markers
                             *
                             * Any modification must be explicitly requested by the product
                             * owner and reflected in SUPPLEMENTAL_STATEMENT_TEMPLATE.md.
                             * ═══════════════════════════════════════════════════════════════ */
                            const profile = getUserProfile();
                            const serviceInfo = getServiceHistory();
                            const firstName = capitalize(profile.firstName) || "[First Name]";
                            const lastName = capitalize(profile.lastName) || "[Last Name]";
                            const fullName = `${firstName} ${lastName}`;
                            const ssnFormatted = profile.ssn ? `${profile.ssn.slice(0, 3)}-${profile.ssn.slice(3, 5)}-${profile.ssn.slice(5)}` : "XXX-XX-XXXX";
                            const lastInitial = lastName.charAt(0).toUpperCase();
                            const last4SSN = profile.ssn ? profile.ssn.slice(-4) : "XXXX";
                            const nameCode = `${lastInitial}${last4SSN}`;
                            const branchName = getBranchName(serviceInfo.branch);
                            const currentDate = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
                            
                            const allNamedConditions = conditions.filter(c => c.name);
                            
                            return (
                              <div className="text-base" style={{ fontFamily: 'Arial', fontSize: '11pt', color: 'black', border: 'none', borderWidth: 0 }}>
                                {/* #1 Header — Date/From/To labels bold; Subj bold+underlined; 12pt Arial, double spaced; NO horizontal rule */}
                                <div style={{ lineHeight: 2, marginLeft: 0, paddingLeft: 0, textAlign: 'left', fontFamily: 'Arial', fontSize: '12pt' }}>
                                  <p style={{ margin: 0, textIndent: 0, fontFamily: 'Arial', fontSize: '12pt' }}><span className="font-bold">Date:</span> {currentDate}</p>
                                  <p style={{ margin: 0, textIndent: 0, fontFamily: 'Arial', fontSize: '12pt' }}><span className="font-bold">From:</span> Veteran {fullName} (SSN: {ssnFormatted})</p>
                                  <p style={{ margin: 0, textIndent: 0, fontFamily: 'Arial', fontSize: '12pt' }}><span className="font-bold">To:</span> Veteran Affairs Claims Intake Center</p>
                                  <p className="font-bold" style={{ margin: 0, textIndent: 0, fontFamily: 'Arial', fontSize: '12pt', textDecoration: 'underline' }}>Subj: Supporting Statement / Documentation For VA Form 21-526EZ Claims</p>
                                </div>
                                
                                {/* Body: 11pt Arial; structure aligned with GitHub master (SUPPLEMENTAL_STATEMENT_TEMPLATE.md) */}
                                <div style={{ textAlign: 'justify', lineHeight: 1.5, fontFamily: 'Arial', fontSize: '11pt' }}>
                                {/* Introduction - prepopulated */}
                                {(() => {
                                  const hasEvidence = allEvidence.some(e => e.status === "uploaded");
                                  return (
                                <div style={{ border: 'none', borderWidth: 0 }}>
                                  <p style={{ textIndent: 0, textAlign: 'left', fontFamily: 'Arial', fontSize: '11pt', lineHeight: 1.5, marginBottom: 0, border: 'none', borderWidth: 0, boxShadow: 'none' }}>To VA Intake Center,</p>
                                  <p style={{ textIndent: '2em', lineHeight: 1.5, fontFamily: 'Arial', fontSize: '11pt', marginTop: 0, border: 'none', borderWidth: 0 }}>
                                    I {fullName} ({nameCode}), am filing the following statement in connection with my claims for Military Service-Connected benefits per VA Title 38 U.S.C. 1151. {hasEvidence ? "I am also submitting additional evidence that supports my claim(s) to be valid, true and associated with my Active Military Service" : "This statement supports my claim(s) to be valid, true and associated with my Active Military Service"} ({branchName}), as Primary and/or Secondary injuries/illness as a direct result of my Military service and hazardous conditions/exposures. Based on the totality of the circumstances, a service connection to my military service has been established per VA Title 38 U.S.C. 1151.
                                  </p>
                                  <p style={{ textIndent: '2em', lineHeight: 1.5, fontFamily: 'Arial', fontSize: '11pt', marginTop: '1em', border: 'none', borderWidth: 0 }}>
                                    These conditions should have already been accepted and "presumptively" approved by the VA Executive Administration once discharged from Active Duty. Thus, the VA failed to "service connect" my injuries upon discharge of my Military service which is no fault of mine (the Veteran). I am requesting that the following new claims be reviewed and accepted, including conditions covered under the PACT Act:
                                  </p>
                                </div>
                                  );
                                })()}
                                
                                {/* #3 Paragraph spacing before Condition; Condition 1 at far left margin; first paragraph under condition indented */}
                                {allNamedConditions.map((condition, idx) => (
                                  <div key={condition.id} style={{ textAlign: 'justify', marginTop: '2em', marginBottom: '2em', marginLeft: 0, paddingLeft: 0 }}>
                                    <h4 className="font-bold underline text-lg" style={{ marginBottom: '1.5em', textIndent: 0, textAlign: 'left', color: 'black' }}>Condition {idx + 1}: {conditionDisplayName(condition) || condition.name}</h4>
                                    
                                    {/* Subheadings: 11pt, underlined; auto-populate when matching condition/evidence data present */}
                                    <div style={{ fontFamily: 'Arial', fontSize: '11pt', marginLeft: 0, textAlign: 'left' }}>
                                      <p className="italic underline" style={{ textIndent: 0, fontFamily: 'Arial', fontSize: '11pt', marginLeft: 0, marginTop: '1.5em', marginBottom: '0.5em' }}>Service Connection:</p>
                                      <p style={{ textIndent: '2em', lineHeight: 1.5, fontFamily: 'Arial', fontSize: '11pt', marginBottom: '1.5em' }}>
                                        This condition {condition.connectionType === "direct" ? "is directly related to my active duty service and began during my time in service" : 
                                        "developed as a secondary condition resulting from my existing service-connected disability"}.
                                        {condition.isPresumptive && " This condition qualifies for presumptive service connection under the PACT Act provisions."}
                                      </p>
                                      
                                      {condition.onsetDate && (
                                        <>
                                          <p className="italic underline" style={{ textIndent: 0, fontFamily: 'Arial', fontSize: '11pt', marginLeft: 0, marginTop: '1.5em', marginBottom: '0.5em' }}>Onset:</p>
                                          <p style={{ textIndent: '2em', lineHeight: 1.5, fontFamily: 'Arial', fontSize: '11pt', marginBottom: '1.5em' }}>Symptoms first manifested on or around {condition.onsetDate}.</p>
                                        </>
                                      )}
                                      
                                      <p className="italic underline" style={{ textIndent: 0, fontFamily: 'Arial', fontSize: '11pt', marginLeft: 0, marginTop: '1.5em', marginBottom: '0.5em' }}>Frequency:</p>
                                      <p style={{ textIndent: '2em', lineHeight: 1.5, fontFamily: 'Arial', fontSize: '11pt', marginBottom: '1.5em' }}>Symptoms occur on a {condition.frequency} basis.</p>
                                      
                                      {condition.symptoms.length > 0 && (
                                        <>
                                          <p className="italic underline" style={{ textIndent: 0, fontFamily: 'Arial', fontSize: '11pt', marginLeft: 0, marginTop: '1.5em', marginBottom: '0.5em' }}>Current Symptoms:</p>
                                          <p style={{ textIndent: '2em', lineHeight: 1.5, fontFamily: 'Arial', fontSize: '11pt', marginBottom: '1.5em' }}>{condition.symptoms.join(", ")}.</p>
                                        </>
                                      )}
                                      {condition.dailyImpact && (
                                        <div>
                                          <p className="italic underline" style={{ textIndent: 0, fontFamily: 'Arial', fontSize: '11pt', marginLeft: 0, marginTop: '1.5em', marginBottom: '0.5em' }}>Functional Impact on Daily Life:</p>
                                          <p style={{ textIndent: '2em', lineHeight: 1.5, fontFamily: 'Arial', fontSize: '11pt', marginBottom: '1.5em' }}>{condition.dailyImpact}</p>
                                        </div>
                                      )}
                                      
                                      <div style={{ marginTop: '1.5em' }}>
                                        <p className="italic underline" style={{ textIndent: 0, fontFamily: 'Arial', fontSize: '11pt', marginLeft: 0, marginBottom: '0.5em' }}>Legal Framework</p>
                                        <p style={{ textAlign: 'justify', textIndent: '2em', lineHeight: 1.5, fontFamily: 'Arial', fontSize: '11pt', marginBottom: '1em' }}>
                                          Service connection and compensation for disability are governed by 38 U.S.C. §§ 1110 and 1131 and implementing regulations at 38 CFR Part 3 and Part 4. Under 38 CFR § 3.303(a), service connection may be established by evidence of continuity of symptomatology or by medical nexus. Under 38 CFR § 4.1 and § 4.10, disability ratings are based on the average impairment of earning capacity and the functional effects of the disability. The VA must consider all evidence of record and resolve reasonable doubt in the veteran’s favor under 38 U.S.C. § 5107(b).
                                        </p>
                                        <p style={{ textAlign: 'justify', textIndent: '2em', lineHeight: 1.5, fontFamily: 'Arial', fontSize: '11pt' }}>
                                          In <em>Buchanan v. Nicholson</em>, 451 F.3d 1334 (Fed. Cir. 2006), the Federal Circuit held that when the evidence is in relative equipoise, the benefit of the doubt must go to the veteran and the claim must be granted. The court reaffirmed that the “at least as likely as not” standard in 38 C.F.R. § 3.102 requires the VA to grant the claim when the evidence for and against service connection is evenly balanced. This standard applies to the evaluation of the conditions set forth in this supporting statement.
                                        </p>
                                      </div>
                                      
                                      <p style={{ textIndent: '2em', lineHeight: 1.5, fontFamily: 'Arial', fontSize: '11pt', marginTop: '1.5em', color: 'black' }}>
                                        Per 38 CFR § 3.303, § 4.40, § 4.45, and § 4.59, the functional limitations caused by this condition warrant service connection and appropriate rating consideration.
                                      </p>
                                    </div>
                                  </div>
                                ))}
                                
                                {/* #9 Conclusion / Rationale - far left margin; same font and bold as Condition 1 (no italic) */}
                                <div className="border-t pt-2" style={{ marginLeft: 0, paddingLeft: 0, marginTop: '2em' }}>
                                  <p className="font-bold underline" style={{ textIndent: 0, textAlign: 'left', fontFamily: 'Arial', fontSize: '11pt', marginLeft: 0, marginBottom: '1.5em', color: 'black' }}>Conclusion / Rationale</p>
                                  <p style={{ textIndent: '2em', lineHeight: 1.5, fontFamily: 'Arial', fontSize: '11pt', marginBottom: '1.5em' }}>
                                    The evidence provided has proven that it is at least as likely as not (more likely than not), that my reported and documented medical conditions are directly related to events and/or exposure due to Active Military service. The medical evidence from my service records shows I have injuries and subsequent pain, which were are all direct causes of my active-duty service. All medical issues were present and existed within the first year after being discharged from active duty to present.
                                  </p>
                                  <p style={{ textIndent: '2em', lineHeight: 1.5, fontFamily: 'Arial', fontSize: '11pt', marginBottom: '1.5em' }}>
                                    Please accept my formal written statement and evidence as proof of accepted VA claims. If there is anything you need or would like to talk to me about, please get in touch with me at {profile.phone || "(XXX) XXX-XXXX"} or via personal email at: {profile.email || "XXXXX@email.com"}.
                                  </p>
                                </div>
                                
                                {/* Signature Block - matches GitHub master */}
                                <div style={{ lineHeight: 1.5, marginTop: '2em', fontFamily: 'Arial', fontSize: '11pt' }}>
                                  <p>Respectfully submitted,</p>
                                  <p style={{ marginTop: '2em' }} className="font-bold">Veteran {firstName} {lastName}</p>
                                </div>
                                </div>

                                {/* Supportive Evidence/Exhibits For Claims - New Page */}
                                {allEvidence.filter(e => e.status === "uploaded" && e.printEnabled).length > 0 && (
                                  <div className="mt-8 pt-6 border-t-2 border-black evidence-print-section print:break-before-page" style={{ color: 'black' }}>
                                    <h3 className="text-xl italic uppercase tracking-wide text-center mb-4" style={{ color: 'black' }}>Supportive Evidence/Exhibits For Claims</h3>
                                    <p className="text-sm mb-6 text-center italic" style={{ color: 'black' }}>
                                      (Preponderance of the evidence is that degree of relevant evidence that a reasonable person, considering the record as a whole, would accept as sufficient to find that a contested fact is more likely to be true than untrue).
                                    </p>
                                    <p className="text-sm mb-4 text-center" style={{ color: 'black' }}>
                                      The following {allEvidence.filter(e => e.status === "uploaded" && e.printEnabled).length} document(s) are attached as supporting evidence for this claim:
                                    </p>
                                    {allEvidence.filter(e => e.status === "uploaded" && e.printEnabled).map((evidence, idx) => (
                                      <div key={evidence.id} className="print:break-before-page mb-8" style={{ color: 'black' }}>
                                        <div className="border-b-2 border-black pb-2 mb-4">
                                          <div className="flex items-center gap-2">
                                            <div className="border-2 border-black rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ color: 'black' }}>
                                              {idx + 1}
                                            </div>
                                            <div>
                                              <h4 className="italic text-lg" style={{ color: 'black' }}>{evidence.type}</h4>
                                              <p className="text-sm" style={{ color: 'black' }}>{evidence.description}</p>
                                              {evidence.fileName && (
                                                <p className="text-xs mt-1 flex items-center gap-1">
                                                  <FileText className="h-3 w-3" /> 
                                                  <span>File: {evidence.fileName}</span>
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                        {/* Display images from cloud storage (objectPath) or legacy base64 (fileData) */}
                                        {(evidence.objectPath || evidence.fileData) && evidence.fileType?.startsWith('image/') ? (
                                          <div className="flex justify-center print:block evidence-image-container">
                                            <img 
                                              src={evidence.objectPath || evidence.fileData} 
                                              alt={evidence.type}
                                              className="max-w-full max-h-[800px] object-contain border rounded-lg shadow-sm print:max-h-none print:shadow-none print:rounded-none"
                                            />
                                          </div>
                                        ) : (evidence.objectPath || evidence.fileData) && evidence.fileType === 'application/pdf' ? (
                                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50 print:bg-white" style={{ color: 'black' }}>
                                            <FileText className="h-16 w-16 mx-auto mb-4" style={{ color: 'black' }} />
                                            <p className="italic text-lg">{evidence.fileName}</p>
                                            <p className="text-sm mt-2" style={{ color: 'black' }}>PDF Document - See attached file</p>
                                            <p className="text-xs mt-1" style={{ color: 'black' }}>This PDF document is included as a separate attachment to this claim package.</p>
                                          </div>
                                        ) : (evidence.objectPath || evidence.fileData) ? (
                                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50 print:bg-white" style={{ color: 'black' }}>
                                            <FileText className="h-16 w-16 mx-auto mb-4" style={{ color: 'black' }} />
                                            <p className="italic text-lg">{evidence.fileName || "Document"}</p>
                                            <p className="text-sm mt-2" style={{ color: 'black' }}>Document attached</p>
                                          </div>
                                        ) : (
                                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50 print:bg-white" style={{ color: 'black' }}>
                                            <FileText className="h-16 w-16 mx-auto mb-4" style={{ color: 'black' }} />
                                            <p className="italic text-lg">{evidence.fileName || "Document"}</p>
                                            <p className="text-sm mt-2" style={{ color: 'black' }}>Document pending upload</p>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                    <div className="mt-6 pt-4 border-t text-center text-sm print:break-before-avoid" style={{ color: 'black' }}>
                                      <p className="italic">End of Claim Package</p>
                                      <p>Total Evidence Documents: {allEvidence.filter(e => e.status === "uploaded" && e.printEnabled).length}</p>
                                    </div>
                                  </div>
                                )}

                              </div>
                            );
                            /* FROZEN-SUPPLEMENTAL-END — Do not modify above without updating SUPPLEMENTAL_STATEMENT_TEMPLATE.md */
                          })()
                          )}
                          
                        </div>
                        
                        {/* VA Contact Information Page - ALWAYS displays and prints - STANDALONE SECTION */}
                        <div 
                          className="mt-8 pt-6 border-t-2 border-primary bg-white rounded-lg p-6 print:break-before-page print:block print:visible" 
                          data-testid="va-contact-info-section"
                          id="va-contact-info-print-section"
                          style={{ display: 'block', visibility: 'visible' }}
                        >
                          <div className="text-center mb-6">
                            <h2 className="text-2xl font-bold text-primary uppercase tracking-wide">VA CONTACT INFORMATION</h2>
                            <p className="mt-2 text-base">(Print Supporting Statement and/or any other supporting documents and send all documents to VA.)</p>
                          </div>
                          <div className="bg-gray-50 p-6 rounded-lg border-2 border-primary/30 print:bg-white print:border-2 print:border-primary/30">
                            <h3 className="font-bold text-lg text-primary mb-4">VA Evidence Intake Center (Disability Claims):</h3>
                            <div className="space-y-2 text-base">
                              <p><span className="font-bold">Mailing Address:</span></p>
                              <p className="ml-4">Department of Veterans Affairs</p>
                              <p className="ml-4">Evidence Intake Center</p>
                              <p className="ml-4">PO Box 4444</p>
                              <p className="ml-4">Janesville, WI 53547-4444</p>
                              <p className="mt-4"><span className="font-bold">Fax Number:</span> 844-531-7818</p>
                            </div>
                          </div>
                        </div>

                        {/* Contact Us – VA Claim Navigator support email */}
                        <div 
                          className="mt-8 pt-6 border-t-2 border-secondary bg-white rounded-lg p-6 print:block print:visible"
                          data-testid="contact-us-section"
                        >
                          <div className="text-center mb-4">
                            <h2 className="text-xl font-bold text-primary uppercase tracking-wide">Contact Us</h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                              Need help with your claim? Reach out to our support team.
                            </p>
                          </div>
                          <div className="bg-secondary/5 p-5 rounded-lg border border-secondary/30 text-center">
                            <p className="font-bold text-base text-primary mb-2">VA Claim Navigator Support</p>
                            <a
                              href={`mailto:${CONTACT_EMAIL_ADMIN}`}
                              className="inline-flex items-center gap-2 text-base font-medium text-secondary hover:text-secondary/80 underline underline-offset-2"
                            >
                              {CONTACT_EMAIL_ADMIN}
                            </a>
                          </div>
                        </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                  
                  <div className="p-3 sm:p-6 border-t bg-gray-50/50 flex flex-wrap justify-between items-center gap-2 rounded-b-lg print:hidden">
                    <Button
                      variant="outline"
                      onClick={prevStep}
                      disabled={currentStep === 1}
                      className="font-bold min-h-[44px]"
                    >
                      <ChevronLeft className="mr-1 sm:mr-2 h-4 w-4" /> Back
                    </Button>

                    {currentStep === 2 && (
                      <Button
                        onClick={addCondition}
                        variant="outline"
                        className="border-secondary text-secondary hover:bg-secondary/10 font-bold min-h-[44px] text-sm sm:text-base"
                        data-testid="button-add-condition-claim"
                      >
                        <Plus className="mr-1 sm:mr-2 h-4 w-4" /> Add Condition
                      </Button>
                    )}

                    {currentStep < 4 ? (
                      <Button
                        onClick={nextStep}
                        className="bg-primary hover:bg-primary/90 min-h-[44px]"
                        disabled={(currentStep === 3 && !canContinueFromStep3) || isProcessingClaim}
                      >
                        Continue <ChevronRight className="ml-1 sm:ml-2 h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        className="bg-green-600 hover:bg-green-700 text-white min-h-[44px] text-sm sm:text-base"
                        onClick={handleSaveFinishedClaim}
                      >
                        Save Finished Claim <CheckCircle2 className="ml-1 sm:ml-2 h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </Card>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Helper Sidebar - Only show on steps 1 and 2 */}
          {showWarriorCoach && (
            <div className="lg:col-span-1 print:hidden">
              <Card className="sticky top-24 border-secondary/20 shadow-md">
                <CardHeader className="bg-secondary/10 pb-4">
                  <CardTitle className="text-xl font-serif flex items-center gap-2">
                    <Bot className="h-5 w-5 text-primary" /> Warrior Coach
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div className="bg-white p-3 rounded-lg border shadow-sm text-base leading-relaxed">
                    <p className="text-muted-foreground">
                      <span className="font-bold text-primary flex items-center gap-1 mb-2">
                        <Lightbulb className="h-4 w-4" /> AI Tip:
                      </span>
                      {conditionTip}
                    </p>
                  </div>
                  
                  {activeCondition?.name && (
                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                      <p className="text-sm font-medium text-blue-800 mb-1">For {activeCondition.name}:</p>
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li>• Document frequency and duration</li>
                        <li>• Get buddy statements if possible</li>
                        <li>• Connect to in-service events</li>
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Evidence Edit Dialog */}
      <Dialog open={showEvidenceDialog} onOpenChange={setShowEvidenceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl">Edit Evidence</DialogTitle>
            <DialogDescription className="text-base">Update the document details.</DialogDescription>
          </DialogHeader>
          {editingEvidence && (
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label className="text-base">Document Type</Label>
                <Input value={editingEvidence.type} readOnly className="bg-gray-50 text-base" />
              </div>
              <div className="space-y-2">
                <Label className="text-base">Description</Label>
                <Textarea value={editingEvidence.description} rows={3} className="text-base" />
              </div>
              <div className="space-y-2">
                <Label className="text-base">File Name</Label>
                <Input value={editingEvidence.fileName || ""} className="text-base" />
              </div>
              <div className="flex gap-2 pt-4">
                <Button onClick={() => setShowEvidenceDialog(false)} className="flex-1">Save Changes</Button>
                <Button variant="outline" onClick={() => setShowEvidenceDialog(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Upgrade Dialog with Pricing Options - Completely hidden during promo */}
      {!PROMO_ACTIVE && (
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif text-primary text-center">
              Upgrade Required
            </DialogTitle>
            <DialogDescription className="text-center text-base pt-2">
              Select a plan to unlock Print, Download, and AI Memorandum features.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Pro Plan */}
              <div className="border-2 border-secondary rounded-lg p-4 text-center hover:shadow-lg transition-shadow">
                <div className="bg-secondary text-secondary-foreground text-xs font-bold px-2 py-1 rounded-full inline-block mb-2">Most Popular</div>
                <h4 className="text-xl font-serif font-bold text-primary">PRO</h4>
                <p className="text-xl font-bold text-primary my-1">Free For First 500 Veterans</p>
                <p className="text-xs text-green-600 font-semibold mb-1">Limited Time Offer</p>
                <p className="text-xs text-muted-foreground mb-2">Standard Price is <span className="line-through">$97</span></p>
                <ul className="text-xs text-left space-y-1 mb-4">
                  <li className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-600" /> Full Claim Builder</li>
                  <li className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-600" /> Print & Download</li>
                  <li className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-600" /> AI Coach Access</li>
                </ul>
                <Button 
                  className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold min-h-[44px] touch-manipulation"
                  onClick={(e) => { e.stopPropagation(); handleSelectPlan("Pro", "Free"); }}
                  data-testid="button-select-pro"
                >
                  Select Pro
                </Button>
              </div>

              {/* Deluxe Plan */}
              <div className="border-2 border-primary rounded-lg p-4 text-center bg-gradient-to-b from-primary/5 to-transparent hover:shadow-lg transition-shadow">
                <div className="bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-full inline-block mb-2">White Glove</div>
                <h4 className="text-xl font-serif font-bold text-primary">DELUXE</h4>
                <p className="text-sm text-muted-foreground line-through">$999</p>
                <p className="text-3xl font-bold text-primary my-1">$499</p>
                <p className="text-xs text-green-600 font-semibold mb-2">Ambassador Promotion</p>
                <ul className="text-xs text-left space-y-1 mb-4">
                  <li className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-600" /> Everything in Pro</li>
                  <li className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-600" /> 1-on-1 Coaching</li>
                  <li className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-600" /> Personal Consultant</li>
                </ul>
                <Button 
                  className="w-full bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:from-primary/90 font-semibold min-h-[44px] touch-manipulation"
                  onClick={(e) => { e.stopPropagation(); handleSelectPlan("Deluxe", "$499"); }}
                  data-testid="button-select-deluxe"
                >
                  Select Deluxe
                </Button>
              </div>
            </div>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setShowUpgradeDialog(false)}
            >
              Continue with Starter
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      )}

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif text-primary text-center">
              Upgrade to {selectedTier.name}
            </DialogTitle>
            <DialogDescription className="text-center text-base pt-2">
              Get full access to all Navigator features for {selectedTier.price}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            <div className="text-center">
              <p className="text-4xl font-bold text-primary">{selectedTier.price}</p>
              <p className="text-muted-foreground text-sm">One-time payment</p>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>Full access to Claim Builder</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>Print & Download PDF features</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>Support Statement (AI-generated after review)</span>
              </div>
            </div>
            <Button 
              className="w-full h-12 text-lg font-bold bg-secondary text-secondary-foreground hover:bg-secondary/90"
              onClick={handleCheckout}
              disabled={isProcessingPayment}
            >
              {isProcessingPayment ? "Processing..." : "Pay Now"}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Secure payment processing. Your data is protected.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Profile Required Popup - blocks all features until profile is complete */}
      <Dialog open={showProfileRequiredDialog} onOpenChange={(open) => {
        if (!open && !isProfileComplete) {
          // If trying to close without profile complete, redirect to profile
          setLocation("/dashboard/profile");
        }
        setShowProfileRequiredDialog(open);
      }}>
        <DialogContent className="border-2 border-amber-500" data-testid="dialog-profile-required">
          <DialogHeader>
            <DialogTitle className="text-xl text-amber-600 flex items-center gap-2">
              <User className="h-6 w-6" /> Complete Your Profile First
            </DialogTitle>
            <DialogDescription className="text-base pt-2" data-testid="text-profile-required-message">
              You must complete your Personal Information before using the Claim Builder. This ensures the Navigator can build your claim properly with your correct details.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end pt-4">
            <Button 
              onClick={() => setLocation("/dashboard/profile")} 
              className="bg-amber-600 hover:bg-amber-700"
              data-testid="button-go-to-profile"
            >
              Go to My Profile <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Missing Condition Popup */}
      <Dialog open={showMissingConditionPopup} onOpenChange={setShowMissingConditionPopup}>
        <DialogContent className="border-2 border-red-500" data-testid="dialog-missing-condition">
          <DialogHeader>
            <DialogTitle className="text-xl text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-6 w-6" /> Medical Condition Required
            </DialogTitle>
            <DialogDescription className="text-base pt-2 text-red-600 font-medium" data-testid="text-missing-condition-message">
              A Medical Condition Must be Added To Move Forward.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end pt-4">
            <Button onClick={() => setShowMissingConditionPopup(false)} data-testid="button-missing-condition-ok">
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Evidence step: review popup - OK to continue or Add/Remove Documents (no forced start over) */}
      <Dialog open={showEvidenceReviewPopup} onOpenChange={setShowEvidenceReviewPopup}>
        <DialogContent className="border-2 border-red-500 sm:max-w-md" data-testid="dialog-evidence-review-popup">
          <DialogHeader>
            <DialogTitle className="text-xl text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-6 w-6" /> Review Required
            </DialogTitle>
            <DialogDescription className="text-base pt-2 text-left">
              Every above listed condition needs to be reviewed/verified. You can add or remove documents before continuing.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowEvidenceReviewPopup(false)}
              className="min-h-[44px]"
              data-testid="button-evidence-review-add-remove"
            >
              Add / Remove Documents
            </Button>
            <Button
              onClick={() => {
                setShowEvidenceReviewPopup(false);
                setCurrentStep(2);
              }}
              className="min-h-[44px]"
              data-testid="button-evidence-review-ok"
            >
              OK — Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Symptoms Continue Popup */}
      <Dialog open={showSymptomsPopup} onOpenChange={setShowSymptomsPopup}>
        <DialogContent className="border-2 border-red-500" data-testid="dialog-symptoms-popup">
          <DialogHeader>
            <DialogTitle className="text-xl text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-6 w-6" /> Add More Claims?
            </DialogTitle>
            <DialogDescription className="text-base pt-2" data-testid="text-symptoms-popup-message">
              Click the &quot;Add Condition&quot; tab to add more claims or click on continue to move forward. All claims must be clicked on and &quot;Symptoms &amp; Severity&quot; must be inputted.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-4">
            <Button 
              variant="outline"
              onClick={() => { setShowSymptomsPopup(false); addCondition(); }}
              className="flex-1"
              data-testid="button-symptoms-add-condition"
            >
              <Plus className="mr-2 h-4 w-4" /> Add Condition
            </Button>
            <Button onClick={confirmNextStep} className="flex-1" data-testid="button-symptoms-continue">
              Continue <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Document Viewer Dialog */}
      <Dialog open={showDocumentViewer} onOpenChange={setShowDocumentViewer}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh]" data-testid="dialog-document-viewer">
          <DialogHeader>
            <DialogTitle className="text-xl" data-testid="text-document-title">
              {viewingDocument?.fileName || "Document Preview"}
            </DialogTitle>
            <DialogDescription data-testid="text-document-type">
              {viewingDocument?.type}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 max-h-[70vh] overflow-auto border rounded-lg" data-testid="container-document-preview">
            {/* Cloud storage files (objectPath) */}
            {viewingDocument?.objectPath && (
              viewingDocument.fileType?.startsWith('image/') ? (
                <img 
                  src={viewingDocument.objectPath} 
                  alt={viewingDocument.fileName} 
                  className="w-full h-auto"
                  data-testid="img-document-preview"
                />
              ) : viewingDocument.fileType === 'application/pdf' ? (
                <iframe 
                  src={viewingDocument.objectPath} 
                  className="w-full h-[60vh]"
                  title={viewingDocument.fileName}
                  data-testid="iframe-document-preview"
                />
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <FileText className="h-16 w-16 mx-auto mb-4" />
                  <p>Document preview not available for this file type.</p>
                  <a 
                    href={viewingDocument.objectPath} 
                    download={viewingDocument.fileName}
                    className="text-primary underline mt-2 inline-block"
                    data-testid="link-document-download"
                  >
                    Download to view
                  </a>
                </div>
              )
            )}
            {/* Legacy base64 files (fileData) - backwards compatibility */}
            {!viewingDocument?.objectPath && viewingDocument?.fileData && (
              viewingDocument.fileType?.startsWith('image/') ? (
                <img 
                  src={viewingDocument.fileData} 
                  alt={viewingDocument.fileName} 
                  className="w-full h-auto"
                  data-testid="img-document-preview"
                />
              ) : viewingDocument.fileType === 'application/pdf' ? (
                <iframe 
                  src={viewingDocument.fileData} 
                  className="w-full h-[60vh]"
                  title={viewingDocument.fileName}
                  data-testid="iframe-document-preview"
                />
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <FileText className="h-16 w-16 mx-auto mb-4" />
                  <p>Document preview not available for this file type.</p>
                  <a 
                    href={viewingDocument.fileData} 
                    download={viewingDocument.fileName}
                    className="text-primary underline mt-2 inline-block"
                    data-testid="link-document-download"
                  >
                    Download to view
                  </a>
                </div>
              )
            )}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            {(viewingDocument?.objectPath || viewingDocument?.fileData) && (
              <a 
                href={viewingDocument?.objectPath || viewingDocument?.fileData} 
                download={viewingDocument?.fileName}
                data-testid="link-document-download-button"
              >
                <Button variant="outline" data-testid="button-download-document">
                  <Download className="mr-2 h-4 w-4" /> Download
                </Button>
              </a>
            )}
            <Button onClick={() => setShowDocumentViewer(false)} data-testid="button-close-document-viewer">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Onset Date Error Dialog */}
      <Dialog open={showOnsetDateErrorDialog} onOpenChange={setShowOnsetDateErrorDialog}>
        <DialogContent className="border-2 border-red-500" data-testid="dialog-onset-date-error">
          <DialogHeader>
            <DialogTitle className="text-xl text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-6 w-6" /> Date Error
            </DialogTitle>
            <DialogDescription className="text-base pt-2" data-testid="text-onset-date-error-message">
              {onsetDateError || "The date entered is incorrect. Please use MM/YYYY format."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end pt-4">
            <Button onClick={() => setShowOnsetDateErrorDialog(false)} data-testid="button-close-onset-date-error">
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Processing Claim Dialog */}
      <Dialog open={isProcessingClaim} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-processing-claim">
          <DialogHeader>
            <DialogTitle className="text-xl text-primary flex items-center gap-2">
              <BrainCircuit className="h-6 w-6 animate-pulse" /> Deep Dive Analysis in Progress
            </DialogTitle>
            <DialogDescription className="text-base pt-2">
              Performing comprehensive analysis with 38 CFR Part 4 diagnostic codes, case law precedents, and VA procedures...
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="relative w-full h-4 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="absolute left-0 top-0 h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500 ease-out"
                style={{ width: `${Math.min(processingProgress, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span className="font-medium text-primary">{processingPhase}</span>
              <span className="font-semibold">{Math.round(processingProgress)}%</span>
            </div>
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground mt-2">May take several minutes given the amount of records/documents submitted. Bear with us as we prepare to assist you in getting your earned benefits.</p>
              <p className="text-xs text-muted-foreground mt-1">Cross-referencing evidence with legal requirements...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Analyzing Medical Records Dialog */}
      <Dialog open={isAnalyzingRecords} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl text-primary flex items-center gap-2">
              <FileText className="h-6 w-6 animate-pulse" /> Analyzing Medical Records
            </DialogTitle>
            <DialogDescription className="text-base pt-2">
              Scanning every page for diagnoses, conditions, and diseases. Large documents are processed in 10-page chunks to capture all findings.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground text-center">{analysisProgress || "Please wait."}</p>
            <p className="text-xs text-muted-foreground text-center">Large documents may take several minutes. Do not close this window.</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Claim Confirmation Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="border-4 border-red-500 sm:max-w-md" data-testid="dialog-cancel-claim">
          <DialogHeader>
            <DialogTitle className="text-xl text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-6 w-6" /> Cancel Claim
            </DialogTitle>
            <DialogDescription className="text-base pt-2 text-center">
              Click Cancel Tab To Confirm Cancel; All data will be deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center gap-4 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowCancelDialog(false)}
              data-testid="button-cancel-dialog-close"
            >
              Go Back
            </Button>
            <Button
              variant="destructive"
              className="bg-red-600 hover:bg-red-700"
              onClick={cancelClaim}
              data-testid="button-confirm-cancel-claim"
            >
              Cancel Claim
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Evidence Warning Popup */}
      <Dialog open={showEvidenceWarningPopup} onOpenChange={setShowEvidenceWarningPopup}>
        <DialogContent className="max-w-lg border-4 border-red-500" data-testid="dialog-evidence-warning">
          <DialogHeader>
            <DialogTitle className="text-xl text-red-600 flex items-center gap-2">
              <AlertCircle className="h-6 w-6" /> Evidence Notice
            </DialogTitle>
          </DialogHeader>
          <div className="pt-2">
            <p className="text-base font-bold text-red-600" data-testid="text-evidence-warning">
              If you do not attach medical records and/or documentation, the Navigator will create a broad generic statement, based on the claiming condition(s).
            </p>
          </div>
          <div className="flex justify-center gap-4 pt-4">
            <Button onClick={proceedFromEvidenceWarning} data-testid="button-evidence-warning-continue">
              Continue Anyway
            </Button>
            <Button variant="outline" onClick={() => setShowEvidenceWarningPopup(false)} data-testid="button-evidence-warning-cancel">
              Go Back
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Vague Condition Explanation Popup */}
      <Dialog open={showVagueConditionPopup} onOpenChange={setShowVagueConditionPopup}>
        <DialogContent className="max-w-lg border-4 border-red-500" data-testid="dialog-vague-condition">
          <DialogHeader>
            <DialogTitle className="text-xl text-red-600 flex items-center gap-2">
              <AlertCircle className="h-6 w-6" /> Important Notice
            </DialogTitle>
          </DialogHeader>
          <div className="pt-2">
            <p className="text-base font-bold" data-testid="text-vague-condition-explanation">
              Unless you have a documented "specific," medical diagnosis, it may be advantageous to be "Vague" in your explanation of your condition (i.e. "I have Depression" (Specific) vs. "I have persistent feeling of hopelessness" (Vague)).
            </p>
          </div>
          <div className="flex justify-center pt-4">
            <Button onClick={() => setShowVagueConditionPopup(false)} data-testid="button-vague-condition-ok">
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Conditions Found Alert Popup */}
      <Dialog open={showConditionsFoundPopup} onOpenChange={setShowConditionsFoundPopup}>
        <DialogContent className="max-w-lg border-4 border-red-500" data-testid="dialog-conditions-found">
          <DialogHeader>
            <DialogTitle className="text-xl text-red-600 flex items-center gap-2">
              <AlertCircle className="h-6 w-6" /> Conditions Found
            </DialogTitle>
          </DialogHeader>
          <div className="pt-2">
            <p className="text-base font-bold text-red-600" data-testid="text-conditions-found-message">
              {newConditionsCount} medical condition(s) have been extracted from your records and added to your claim. Click on each condition tab at the top of the page to review, edit, and account for every claim.
            </p>
          </div>
          <div className="flex justify-center pt-4">
            <Button onClick={() => setShowConditionsFoundPopup(false)} data-testid="button-conditions-found-ok">
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Document Preview - View before printing or downloading */}
      <Dialog open={showDocumentPreview} onOpenChange={(open) => { if (!open) { setShowDocumentPreview(false); setDocumentPreviewIntent(null); } }}>
        <DialogContent className="max-w-[95vw] sm:max-w-5xl max-h-[95vh] flex flex-col border-2 border-primary print:hidden" data-testid="dialog-document-preview">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <FileText className="h-6 w-6" /> Review Your Claim Document
            </DialogTitle>
            <DialogDescription>
              Review the document below. When ready, use Print to print or Download PDF to save to your computer or mobile device.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-auto rounded-lg border bg-white p-6 my-2 text-base" style={{ maxHeight: "70vh" }}>
            <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: previewHtml }} />
          </div>
          <div className="flex flex-wrap gap-2 justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => { setShowDocumentPreview(false); setDocumentPreviewIntent(null); }}>
              Cancel
            </Button>
            <Button onClick={runPrint} data-testid="button-preview-print">
              <Printer className="h-4 w-4 mr-2" /> Print
            </Button>
            <Button onClick={runDownloadPDF} data-testid="button-preview-download-pdf">
              <Download className="h-4 w-4 mr-2" /> Download PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Print Instructions Popup - Hidden when printing */}
      <Dialog open={showPrintInstructionsPopup} onOpenChange={setShowPrintInstructionsPopup}>
        <DialogContent className="max-w-lg border-4 border-red-500 print:hidden" data-testid="dialog-print-instructions">
          <DialogHeader>
            <DialogTitle className="text-xl text-red-600 flex items-center gap-2">
              <AlertCircle className="h-6 w-6" /> Print Instructions
            </DialogTitle>
          </DialogHeader>
          <div className="pt-2">
            <p className="text-base font-bold" data-testid="text-print-instructions">
              Print Claim Statement and mail or fax the statement to the VA Evidence Intake Center (see VA Contact Printed Page).
            </p>
          </div>
          <div className="flex justify-center pt-4">
            <Button onClick={confirmPrint} data-testid="button-print-ok">
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
