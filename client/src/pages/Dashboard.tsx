import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Plus, Clock, FileText, ChevronRight, AlertCircle, Gift, Phone, Lock, Sparkles, User, Briefcase, FileCheck, Bot, ArrowRight, CheckCircle2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [activeClaims, setActiveClaims] = useState(0);
  const [completionStatus, setCompletionStatus] = useState(0);
  const [currentRating, setCurrentRating] = useState<string>("0");
  const [actionRequired, setActionRequired] = useState<{title: string; description: string; link: string} | null>(null);
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const [showProfileRequiredDialog, setShowProfileRequiredDialog] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [showTermsPopup, setShowTermsPopup] = useState(false);

  useEffect(() => {
    // If user has pending Deluxe payment, send them to Profile to complete then pay $499
    const pendingDeluxe = localStorage.getItem("pendingDeluxePayment");
    const urlParams = new URLSearchParams(window.location.search);
    if (pendingDeluxe === "true" && urlParams.get("payment") !== "success") {
      setLocation("/dashboard/profile");
      return;
    }

    // Check for successful payment return from Stripe
    if (urlParams.get("payment") === "success") {
      const tier = urlParams.get("tier") || "pro";
      
      // Update subscription tier in userProfile (Pro and Deluxe get same claim builder access)
      const profile = localStorage.getItem("userProfile");
      if (profile) {
        const profileData = JSON.parse(profile);
        profileData.subscriptionTier = tier;
        localStorage.setItem("userProfile", JSON.stringify(profileData));
      } else {
        // Create profile with tier if it doesn't exist
        localStorage.setItem("userProfile", JSON.stringify({ subscriptionTier: tier }));
      }
      
      // Clear pending payment flags on successful payment
      localStorage.removeItem("pendingDeluxePayment");
      localStorage.setItem("paymentComplete", "true");
      localStorage.setItem("selectedTier", tier);
      
      // Clean up URL
      window.history.replaceState({}, document.title, "/dashboard");
      window.dispatchEvent(new Event("workflowProgressUpdate"));
    }

    // Sync tier from selectedTier + paymentComplete so Deluxe (and Pro) get full claim builder even if they didn't land with ?payment=success
    const selectedTier = localStorage.getItem("selectedTier");
    const paymentComplete = localStorage.getItem("paymentComplete");
    const profileJson = localStorage.getItem("userProfile");
    if (profileJson && selectedTier && paymentComplete === "true") {
      const tierKey = selectedTier.toLowerCase();
      if (tierKey === "deluxe" || tierKey === "pro") {
        const profileData = JSON.parse(profileJson);
        if (profileData.subscriptionTier === "starter" || !profileData.subscriptionTier) {
          profileData.subscriptionTier = tierKey;
          localStorage.setItem("userProfile", JSON.stringify(profileData));
          window.dispatchEvent(new Event("workflowProgressUpdate"));
        }
      }
    }
    
    // Check if onboarding should be shown
    const shouldShowOnboarding = localStorage.getItem("showOnboarding");
    if (shouldShowOnboarding === "true") {
      setShowOnboarding(true);
    }

    const profile = localStorage.getItem("userProfile");
    if (profile) {
      const profileData = JSON.parse(profile);
      if (profileData.firstName && profileData.lastName && profileData.email) {
        setIsProfileComplete(true);
      }
    }

    const savedClaims = localStorage.getItem("claimBuilderConditions");
    if (savedClaims) {
      const claims = JSON.parse(savedClaims);
      setActiveClaims(claims.length > 0 ? 1 : 0);
      
      let progress = 0;
      const serviceHistory = localStorage.getItem("serviceHistory");
      const medicalHistory = localStorage.getItem("medicalConditions");
      
      if (profile) progress += 25;
      if (serviceHistory) progress += 25;
      if (medicalHistory) progress += 25;
      if (claims.length > 0 && claims[0].name) progress += 25;
      
      setCompletionStatus(progress);
    }

    const savedPercentage = localStorage.getItem("serviceConnectedPercentage");
    if (savedPercentage) {
      setCurrentRating(savedPercentage);
    }

    const serviceHistory = localStorage.getItem("serviceHistory");
    if (serviceHistory) {
      const periods = JSON.parse(serviceHistory);
      for (const period of periods) {
        if (period.dateEntered && period.dateSeparated) {
          if (new Date(period.dateSeparated) < new Date(period.dateEntered)) {
            setActionRequired({
              title: "Invalid Service Dates",
              description: "Your separation date is before your entry date. Please correct this in your Service History.",
              link: "/dashboard/service-history"
            });
            break;
          }
        }
        if (!period.dateEntered || !period.dateSeparated) {
          setActionRequired({
            title: "Missing Service Dates",
            description: "Please complete your service dates in Service History.",
            link: "/dashboard/service-history"
          });
          break;
        }
      }
    } else if (profile) {
      setActionRequired({
        title: "Service History Needed",
        description: "Please add your military service history to continue with your claim.",
        link: "/dashboard/service-history"
      });
    }
  }, []);

  const handleStartNewClaim = () => {
    if (!isProfileComplete) {
      setShowProfileRequiredDialog(true);
      return;
    }
    setShowTermsPopup(true);
  };

  const handleTermsAccept = () => {
    setShowTermsPopup(false);
    localStorage.removeItem("claimBuilderConditions");
    const newClaim = [{
      id: Date.now().toString(),
      name: "",
      onsetDate: "",
      frequency: "constant",
      symptoms: [],
      connectionType: "direct",
      isPresumptive: false,
      dailyImpact: ""
    }];
    localStorage.setItem("claimBuilderConditions", JSON.stringify(newClaim));
    setActiveClaims(1);
    setLocation("/dashboard/claim-builder");
  };

  const handleLockedFeatureClick = () => {
    setShowProfileRequiredDialog(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-serif font-bold text-primary">Dashboard</h1>
            <p className="text-lg text-muted-foreground">Manage your claims and track your progress.</p>
          </div>
          <Button 
            size="lg" 
            className="shadow-md bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold"
            onClick={handleStartNewClaim}
            data-testid="button-start-new-claim"
          >
            <Plus className="mr-2 h-5 w-5" /> Start New Claim
          </Button>
        </div>

        {!isProfileComplete && (
          <Alert className="bg-amber-50 border-amber-300 border-2">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <AlertTitle className="text-amber-800 font-bold text-lg">Complete Your Profile First</AlertTitle>
            <AlertDescription className="text-amber-700">
              You must complete your Personal Information before using other features. This ensures the Navigator can build your claim properly.
            </AlertDescription>
            <Link href="/dashboard/profile">
              <Button className="mt-3 bg-amber-600 hover:bg-amber-700 text-white" data-testid="button-complete-profile">
                Go to My Profile <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </Alert>
        )}

        {/* Status Overview */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className={`border-l-4 border-l-secondary shadow-sm ${!isProfileComplete ? "opacity-60" : ""}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                Current Rating
                {!isProfileComplete && <Lock className="h-4 w-4" />}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-primary">{currentRating}%</div>
              <p className="text-base text-muted-foreground mt-1">Combined Disability Rating</p>
            </CardContent>
          </Card>
          <Card className={`border-l-4 border-l-blue-500 shadow-sm ${!isProfileComplete ? "opacity-60" : ""}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                Active Claims
                {!isProfileComplete && <Lock className="h-4 w-4" />}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-primary">{activeClaims}</div>
              <p className="text-base text-muted-foreground mt-1">Claim{activeClaims !== 1 ? 's' : ''} in progress</p>
            </CardContent>
          </Card>
        </div>

        {/* Active Claim Card */}
        {activeClaims > 0 && isProfileComplete && (
          <Card className="shadow-md border-primary/10 overflow-hidden">
            <div className="bg-primary/5 p-6 border-b border-primary/10 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-primary font-serif">Active Claim</h3>
                <p className="text-base text-muted-foreground">Started on {new Date().toLocaleDateString()}</p>
              </div>
              <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-bold uppercase tracking-wide">
                Drafting
              </div>
            </div>
            <CardContent className="p-6">
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-base mb-2">
                    <span className="font-medium text-foreground">Completion Status</span>
                    <span className="text-primary font-bold">{completionStatus}%</span>
                  </div>
                  <Progress value={completionStatus} className="h-3" />
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className={`border rounded-lg p-4 flex items-start gap-3 ${completionStatus >= 25 ? 'bg-gray-50' : 'bg-white border-primary/20 shadow-sm ring-1 ring-primary/10'}`}>
                    <div className={`mt-1 p-1 rounded-full ${completionStatus >= 25 ? 'bg-green-100' : 'bg-blue-100 animate-pulse'}`}>
                      {completionStatus >= 25 ? <CheckCircleIcon className="h-4 w-4 text-green-600" /> : <Clock className="h-4 w-4 text-blue-600" />}
                    </div>
                    <div>
                      <h4 className={`font-medium text-base ${completionStatus >= 25 ? '' : 'text-primary'}`}>Personal Info</h4>
                      <p className="text-sm text-muted-foreground">{completionStatus >= 25 ? 'Completed' : 'In Progress'}</p>
                    </div>
                  </div>
                  <div className={`border rounded-lg p-4 flex items-start gap-3 ${completionStatus >= 75 ? 'bg-gray-50' : completionStatus >= 25 ? 'bg-white border-primary/20 shadow-sm ring-1 ring-primary/10' : 'bg-gray-50 opacity-60'}`}>
                    <div className={`mt-1 p-1 rounded-full ${completionStatus >= 75 ? 'bg-green-100' : completionStatus >= 25 ? 'bg-blue-100 animate-pulse' : 'bg-gray-200'}`}>
                      {completionStatus >= 75 ? <CheckCircleIcon className="h-4 w-4 text-green-600" /> : completionStatus >= 25 ? <Clock className="h-4 w-4 text-blue-600" /> : <FileText className="h-4 w-4 text-gray-500" />}
                    </div>
                    <div>
                      <h4 className={`font-medium text-base ${completionStatus >= 25 && completionStatus < 75 ? 'text-primary' : ''}`}>Condition Details</h4>
                      <p className="text-sm text-muted-foreground">{completionStatus >= 75 ? 'Completed' : completionStatus >= 25 ? 'In Progress' : 'Pending'}</p>
                    </div>
                  </div>
                  <div className={`border rounded-lg p-4 flex items-start gap-3 ${completionStatus >= 100 ? 'bg-gray-50' : 'bg-gray-50 opacity-60'}`}>
                    <div className={`mt-1 p-1 rounded-full ${completionStatus >= 100 ? 'bg-green-100' : 'bg-gray-200'}`}>
                      {completionStatus >= 100 ? <CheckCircleIcon className="h-4 w-4 text-green-600" /> : <FileText className="h-4 w-4 text-gray-500" />}
                    </div>
                    <div>
                      <h4 className="font-medium text-base">Evidence Upload</h4>
                      <p className="text-sm text-muted-foreground">{completionStatus >= 100 ? 'Completed' : 'Pending'}</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Link href="/dashboard/claim-builder">
                    <Button className="font-semibold text-base">
                      Continue Claim <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions - Consultation & Referral */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className={`bg-gradient-to-br from-secondary/10 to-secondary/5 border-secondary/20 ${!isProfileComplete ? "opacity-60 cursor-not-allowed" : ""}`}>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0">
                  <Phone className="h-6 w-6 text-secondary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-xl text-primary mb-1 flex items-center gap-2">
                    Free Strategy Session
                    {!isProfileComplete && <Lock className="h-4 w-4 text-muted-foreground" />}
                  </h3>
                  <p className="text-base text-muted-foreground mb-4">Speak with a claims specialist to develop a winning strategy for your case.</p>
                  {isProfileComplete ? (
                    <Link href="/book-consultation">
                      <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90" data-testid="button-book-consultation-dashboard">
                        Book Now <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    </Link>
                  ) : (
                    <Button 
                      className="bg-secondary text-secondary-foreground hover:bg-secondary/90" 
                      onClick={handleLockedFeatureClick}
                      data-testid="button-book-consultation-dashboard"
                    >
                      Book Now <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 ${!isProfileComplete ? "opacity-60 cursor-not-allowed" : ""}`}>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Gift className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-xl text-primary mb-1 flex items-center gap-2">
                    Refer a Fellow Veteran
                    {!isProfileComplete && <Lock className="h-4 w-4 text-muted-foreground" />}
                  </h3>
                  <p className="text-base text-muted-foreground mb-4">Help other veterans get their deserved benefits. Earn rewards when they file.</p>
                  {isProfileComplete ? (
                    <Link href="/dashboard/referrals">
                      <Button variant="outline" className="border-primary/30 hover:bg-primary/10" data-testid="button-referral-program-dashboard">
                        Start Referring <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    </Link>
                  ) : (
                    <Button 
                      variant="outline" 
                      className="border-primary/30 hover:bg-primary/10" 
                      onClick={handleLockedFeatureClick}
                      data-testid="button-referral-program-dashboard"
                    >
                      Start Referring <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Required */}
        {actionRequired && isProfileComplete && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-serif text-xl">
                <AlertCircle className="h-5 w-5 text-amber-500" /> Action Required
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="bg-amber-50 border-amber-200">
                <AlertTitle className="text-amber-800 font-semibold text-base">{actionRequired.title}</AlertTitle>
                <AlertDescription className="text-amber-700 text-sm">
                  {actionRequired.description}
                </AlertDescription>
                <Link href={actionRequired.link}>
                  <Button size="sm" variant="outline" className="mt-3 border-amber-300 text-amber-800 hover:bg-amber-100">
                    Fix Issue
                  </Button>
                </Link>
              </Alert>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Profile Required Dialog */}
      <Dialog open={showProfileRequiredDialog} onOpenChange={setShowProfileRequiredDialog}>
        <DialogContent className="border-2 border-red-500">
          <DialogHeader>
            <DialogTitle className="text-xl text-red-600 flex items-center gap-2">
              <AlertCircle className="h-6 w-6" /> Profile Required
            </DialogTitle>
            <DialogDescription className="text-base pt-2">
              Must go to My Profile before starting new claim.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-4">
            <Link href="/dashboard/profile" className="flex-1">
              <Button className="w-full" onClick={() => setShowProfileRequiredDialog(false)}>
                Go to My Profile
              </Button>
            </Link>
            <Button variant="outline" onClick={() => setShowProfileRequiredDialog(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Onboarding Sequence Dialog */}
      <Dialog open={showOnboarding} onOpenChange={(open) => {
        if (!open) {
          setShowOnboarding(false);
          localStorage.removeItem("showOnboarding");
        }
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif text-primary flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-secondary" />
              {onboardingStep === 0 && "Welcome to VA Claim Navigator!"}
              {onboardingStep === 1 && "Step 1: Complete Your Profile"}
              {onboardingStep === 2 && "Step 2: Add Service History"}
              {onboardingStep === 3 && "Step 3: Build Your Claim"}
              {onboardingStep === 4 && "Step 4: AI-Powered Memorandum"}
              {onboardingStep === 5 && "You're All Set!"}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Onboarding guide for new users
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {onboardingStep === 0 && (
              <div className="space-y-4">
                <p className="text-base text-muted-foreground">
                  Thank you for joining VA Claim Navigator! We're here to help you file your VA disability claims with confidence.
                </p>
                <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                  <p className="text-sm font-medium text-primary">
                    Let's walk through how the Navigator works so you can get started building your claim.
                  </p>
                </div>
              </div>
            )}
            
            {onboardingStep === 1 && (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="bg-primary text-white p-2 rounded-full">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">Personal Information</p>
                    <p className="text-sm text-muted-foreground">
                      Start by adding your personal details including name, SSN, and contact information. This is used to generate your official VA claim documents.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {onboardingStep === 2 && (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="bg-primary text-white p-2 rounded-full">
                    <Briefcase className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">Military Service History</p>
                    <p className="text-sm text-muted-foreground">
                      Add your service periods, branch, deployments, and any hazardous exposures. This helps establish your service connection.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {onboardingStep === 3 && (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="bg-primary text-white p-2 rounded-full">
                    <FileCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">Intelligent Claim Builder</p>
                    <p className="text-sm text-muted-foreground">
                      Add your medical conditions, symptoms, and daily impact. Upload your evidence documents like medical records and buddy statements.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {onboardingStep === 4 && (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="bg-secondary text-white p-2 rounded-full">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">AI-Generated Memorandum</p>
                    <p className="text-sm text-muted-foreground">
                      Our AI Warrior Coach analyzes your evidence and generates a formal VA memorandum with proper 38 CFR citations, ready for submission.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {onboardingStep === 5 && (
              <div className="space-y-4">
                <div className="flex items-center justify-center">
                  <div className="bg-green-100 text-green-600 p-4 rounded-full">
                    <CheckCircle2 className="h-10 w-10" />
                  </div>
                </div>
                <p className="text-center text-base text-muted-foreground">
                  You're ready to start! Begin by completing your profile, then work through each step to build a strong VA claim.
                </p>
              </div>
            )}
          </div>
          
          {/* Progress indicators */}
          <div className="flex justify-center gap-2 py-2">
            {[0, 1, 2, 3, 4, 5].map((step) => (
              <div 
                key={step}
                className={`h-2 w-8 rounded-full transition-colors ${
                  step === onboardingStep ? 'bg-primary' : step < onboardingStep ? 'bg-primary/50' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          
          <div className="flex gap-3 pt-2">
            {onboardingStep > 0 && onboardingStep < 5 && (
              <Button variant="outline" onClick={() => setOnboardingStep(prev => prev - 1)}>
                Back
              </Button>
            )}
            {onboardingStep < 5 ? (
              <Button 
                className="flex-1"
                onClick={() => setOnboardingStep(prev => prev + 1)}
              >
                {onboardingStep === 0 ? "Let's Get Started" : "Next"} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button 
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => {
                  setShowOnboarding(false);
                  localStorage.removeItem("showOnboarding");
                }}
              >
                Start Building My Claim <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Terms and Policy Popup */}
      <Dialog open={showTermsPopup} onOpenChange={setShowTermsPopup}>
        <DialogContent className="max-w-lg border-4 border-red-500" data-testid="dialog-terms-policy">
          <DialogHeader>
            <DialogTitle className="text-xl text-red-600 flex items-center gap-2">
              <AlertCircle className="h-6 w-6" /> Important Notice
            </DialogTitle>
          </DialogHeader>
          <div className="pt-2">
            <p className="text-base font-bold" data-testid="text-terms-policy">
              By clicking "OK" you have read and understand the Policy and Terms of condition, using the Navigator and confirm that the Navigator is NOT affiliated with the Department of Veteran Affairs or any other Veteran and/or Military organization.
            </p>
          </div>
          <div className="flex justify-center pt-4">
            <Button onClick={handleTermsAccept} data-testid="button-terms-ok">
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function CheckCircleIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
