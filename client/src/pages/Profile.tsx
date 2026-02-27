import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useStripePriceIds } from "@/hooks/use-stripe-price-ids";
import { Loader2, CheckCircle2, ChevronLeft } from "lucide-react";
import { Link } from "wouter";
import { addNotification } from "@/components/NotificationDropdown";
import { getProfile, updateProfile } from "@/lib/api";
import { authFetch } from "@/lib/api-helpers";

interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  ssn: string;
  vaFileNumber: string;
}

export default function Profile() {
  const { toast } = useToast();
  const { getPriceId } = useStripePriceIds();
  const [, setLocation] = useLocation();
  const [isSaving, setIsSaving] = useState(false);
  const [showSSNWarning, setShowSSNWarning] = useState(false);

  const handleSSNFocus = useCallback(() => {
    if (!sessionStorage.getItem("ssnWarningShown")) {
      setShowSSNWarning(true);
      sessionStorage.setItem("ssnWarningShown", "1");
    }
  }, []);

  const [formData, setFormData] = useState<ProfileData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    ssn: "",
    vaFileNumber: "",
  });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const savedProfile = localStorage.getItem("userProfile");
      if (savedProfile) {
        try {
          setFormData(JSON.parse(savedProfile));
        } catch (_) {}
      }
      // Sync from navigator (server) so dashboard profile is up to date
      try {
        const profile = await getProfile();
        if (cancelled || !profile) return;
        const fromApi: ProfileData = {
          firstName: profile.firstName ?? "",
          lastName: profile.lastName ?? "",
          email: profile.email ?? "",
          phone: profile.phone ?? "",
          address: profile.address ?? "",
          city: profile.city ?? "",
          state: profile.state ?? "",
          zipCode: profile.zipCode ?? "",
          ssn: (profile as any).ssn ?? "",
          vaFileNumber: (profile as any).vaFileNumber ?? "",
        };
        setFormData(fromApi);
        localStorage.setItem("userProfile", JSON.stringify(fromApi));
      } catch (_) {}
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const capitalizeFirstLetter = (str: string) => {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length === 0) return '';
    if (digits.length <= 3) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };

  const formatSSN = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length === 0) return '';
    if (digits.length <= 3) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5, 9)}`;
  };

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    if (field === "firstName" || field === "lastName") {
      value = capitalizeFirstLetter(value);
    }
    if (field === "phone") {
      value = formatPhoneNumber(value);
    }
    if (field === "ssn") {
      value = formatSSN(value);
    }
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSSNBlur = async () => {
    const ssnToSave = formData.ssn?.trim() ?? "";
    try {
      await updateProfile({ ssn: ssnToSave });
      const merged = { ...JSON.parse(localStorage.getItem("userProfile") || "{}"), ssn: ssnToSave };
      localStorage.setItem("userProfile", JSON.stringify(merged));
      if (ssnToSave) toast({ title: "SSN saved", description: "Your SSN has been saved automatically." });
    } catch (_) {
      toast({ title: "Could not save SSN", description: "Please try again or save the full profile.", variant: "destructive" });
    }
  };

  const pendingDeluxePayment = typeof window !== "undefined" ? localStorage.getItem("pendingDeluxePayment") === "true" : false;

  const handleSave = async () => {
    // When Deluxe is pending, require at least first name, last name, and email before saving and sending to Stripe
    const pendingDeluxe = localStorage.getItem("pendingDeluxePayment") === "true";
    if (pendingDeluxe) {
      const first = (formData.firstName || "").trim();
      const last = (formData.lastName || "").trim();
      const email = (formData.email || "").trim();
      if (!first || !last || !email) {
        toast({
          title: "Complete required fields",
          description: "Please enter your first name, last name, and email before continuing to payment.",
          variant: "destructive",
        });
        return;
      }
    }

    setIsSaving(true);
    try {
      // Verify authentication is still valid (authFetch auto-refreshes expired JWT)
      const authCheck = await authFetch("/api/auth/me");
      if (!authCheck.ok) {
        // Only show "Session Expired" if user has been logged in for 60+ minutes
        const loginTime = localStorage.getItem("loginTimestamp");
        const elapsed = loginTime ? Date.now() - parseInt(loginTime, 10) : Infinity;
        if (elapsed >= 60 * 60 * 1000) {
          toast({
            title: "Session Expired",
            description: "Please log in again to continue.",
            variant: "destructive",
          });
          setLocation("/login");
          return;
        }
        // Within 60 minutes — don't show session expired, just proceed with save using localStorage
        console.warn("[PROFILE] Auth check returned non-OK but session is under 60 min, continuing save.");
      }

      await new Promise(resolve => setTimeout(resolve, 300));
      // Save to navigator (server) so profile is stored and dashboard stays in sync
      await updateProfile({
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        ssn: formData.ssn || undefined,
        vaFileNumber: formData.vaFileNumber || undefined,
      });
      localStorage.setItem("userProfile", JSON.stringify(formData));
      // Mark personal information as complete for workflow progression
      localStorage.setItem("personalInfoComplete", "true");
      // Dispatch event to update sidebar
      window.dispatchEvent(new Event('workflowProgressUpdate'));
      
      // Check if Deluxe payment is pending
      const pendingDeluxePayment = localStorage.getItem("pendingDeluxePayment");
      
      if (pendingDeluxePayment === "true") {
        const deluxePriceId = getPriceId("deluxe");
        if (!deluxePriceId) {
          toast({
            title: "Stripe payment not configured",
            description: "The Deluxe Stripe Price ID is not set. Add STRIPE_PRICE_ID_DELUXE to the server .env file (see STRIPE_SETUP.md). Restart the server after saving.",
            variant: "destructive",
          });
          return;
        }
        try {
          const response = await authFetch("/api/stripe/checkout", {
            method: "POST",
            body: JSON.stringify({ priceId: deluxePriceId, tier: "deluxe" })
          });
          
          if (response.status === 401) {
            const loginTs = localStorage.getItem("loginTimestamp");
            const elapsedMs = loginTs ? Date.now() - parseInt(loginTs, 10) : Infinity;
            if (elapsedMs >= 60 * 60 * 1000) {
              toast({
                title: "Session Expired",
                description: "Please log in again to continue.",
                variant: "destructive",
              });
              setLocation("/login");
              return;
            }
            toast({
              title: "Authentication Error",
              description: "Unable to start checkout. Please try again.",
              variant: "destructive",
            });
            return;
          }
          
          const data = await response.json();
          const checkoutUrl = typeof data?.url === "string" && data.url.startsWith("https://") ? data.url : null;
          if (checkoutUrl) {
            toast({
              title: "Profile saved",
              description: "Redirecting you to secure payment for Deluxe ($499)...",
            });
            // Automatically send user to Stripe to pay $499
            window.location.href = checkoutUrl;
            return;
          }
          const errorMessage = data?.message || "Unable to create checkout session. Please try again.";
          toast({
            title: "Payment Error",
            description: errorMessage,
            variant: "destructive",
          });
        } catch (error) {
          toast({
            title: "Payment Error",
            description: "Failed to process payment. Please try again.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Personal Information Saved",
          description: "Your profile has been updated successfully. Proceeding to Service History.",
        });
        
        addNotification({
          type: "success",
          title: "Profile Updated",
          message: "Your personal information has been saved. Continue to add your service history.",
          link: "/dashboard/service-history"
        });
        
        // Use setTimeout to ensure state updates complete before navigation
        setTimeout(() => {
          setLocation("/dashboard/service-history");
        }, 100);
      }
    } catch (error: any) {
      const message = error?.message || "Failed to save changes. Please try again.";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary">User Profile</h1>
          <p className="text-lg text-muted-foreground">Manage your personal and contact information.</p>
        </div>

        {pendingDeluxePayment && (
          <Alert className="border-primary bg-primary/10">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <AlertTitle>Complete your profile, then continue to payment</AlertTitle>
            <AlertDescription>
              Fill in all applicable fields below. When you click &quot;Save Personal Information,&quot; your profile will be saved and you will be automatically taken to our linked Stripe payment page to complete your Deluxe purchase ($499).
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Personal Information</CardTitle>
            <CardDescription className="text-base">Update your contact details here. All information will be saved and used for your claims.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-base">First Name</Label>
                <Input 
                  value={formData.firstName}
                  onChange={(e) => handleInputChange("firstName", e.target.value)}
                  placeholder="Enter first name"
                  className={`text-base ${formData.firstName ? "font-bold" : ""}`}
                  data-testid="input-profile-firstname"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-base">Last Name</Label>
                <Input 
                  value={formData.lastName}
                  onChange={(e) => handleInputChange("lastName", e.target.value)}
                  placeholder="Enter last name"
                  className={`text-base ${formData.lastName ? "font-bold" : ""}`}
                  data-testid="input-profile-lastname"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-base">Email</Label>
              <Input 
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                type="email"
                placeholder="Enter email address"
                className={`text-base ${formData.email ? "font-bold" : ""}`}
                data-testid="input-profile-email"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-base">Phone Number</Label>
              <Input 
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                type="tel"
                placeholder="(555) 123-4567"
                className={`text-base ${formData.phone ? "font-bold" : ""}`}
                data-testid="input-profile-phone"
              />
            </div>
            
            <Separator className="my-4" />
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-base">Social Security Number (SSN)</Label>
                <Input
                  value={formData.ssn}
                  onChange={(e) => handleInputChange("ssn", e.target.value)}
                  onBlur={handleSSNBlur}
                  onFocus={handleSSNFocus}
                  placeholder="XXX-XX-XXXX"
                  className={`text-base ${formData.ssn ? "font-bold" : ""}`}
                  data-testid="input-profile-ssn"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-base">VA File Number (if different)</Label>
                <Input 
                  value={formData.vaFileNumber}
                  onChange={(e) => handleInputChange("vaFileNumber", e.target.value)}
                  placeholder="Enter VA file number"
                  className={`text-base ${formData.vaFileNumber ? "font-bold" : ""}`}
                  data-testid="input-profile-va-file"
                />
              </div>
            </div>
            
            <Separator className="my-4" />
            
            <div className="space-y-2">
              <Label className="text-base">Mailing Address</Label>
              <Input 
                value={formData.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
                placeholder="Enter street address"
                className={`text-base ${formData.address ? "font-bold" : ""}`}
                data-testid="input-profile-address"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2 col-span-1">
                <Label className="text-base">City</Label>
                <Input 
                  value={formData.city}
                  onChange={(e) => handleInputChange("city", e.target.value)}
                  placeholder="City"
                  className={`text-base ${formData.city ? "font-bold" : ""}`}
                  data-testid="input-profile-city"
                />
              </div>
              <div className="space-y-2 col-span-1">
                <Label className="text-base">State</Label>
                <Input 
                  value={formData.state}
                  onChange={(e) => handleInputChange("state", e.target.value)}
                  placeholder="State"
                  className={`text-base ${formData.state ? "font-bold" : ""}`}
                  data-testid="input-profile-state"
                />
              </div>
              <div className="space-y-2 col-span-1">
                <Label className="text-base">Zip Code</Label>
                <Input 
                  value={formData.zipCode}
                  onChange={(e) => handleInputChange("zipCode", e.target.value)}
                  placeholder="Zip"
                  className={`text-base ${formData.zipCode ? "font-bold" : ""}`}
                  data-testid="input-profile-zip"
                />
              </div>
            </div>
            <div className="pt-4 flex justify-between">
              <Link href="/dashboard">
                <Button variant="outline" data-testid="button-back-profile">
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
              </Link>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                data-testid="button-save-profile"
                className={pendingDeluxePayment ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {pendingDeluxePayment ? "Saving & redirecting to payment..." : "Saving..."}
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    {pendingDeluxePayment ? "Save Personal Information & continue to payment" : "Save Personal Information"}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* SSN HIPAA Warning Popup */}
      <Dialog open={showSSNWarning} onOpenChange={setShowSSNWarning}>
        <DialogContent className="border-4 border-red-500 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 text-xl">HIPAA Protection Notice</DialogTitle>
            <DialogDescription className="text-base text-foreground pt-2">
              For HIPAA Protection and Safety, your SSN and/or any records uploaded will not be saved or kept in the database after you log off and/or close the navigator.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center pt-4">
            <Button
              onClick={() => setShowSSNWarning(false)}
              className="bg-red-600 hover:bg-red-700 text-white px-8"
            >
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
