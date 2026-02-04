import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, ChevronLeft } from "lucide-react";
import { Link } from "wouter";
import { addNotification } from "@/components/NotificationDropdown";

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
  const [, setLocation] = useLocation();
  const [isSaving, setIsSaving] = useState(false);
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
    const savedProfile = localStorage.getItem("userProfile");
    if (savedProfile) {
      setFormData(JSON.parse(savedProfile));
    }
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

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // First verify authentication is still valid before saving
      const authCheck = await fetch("/api/auth/me", { credentials: "include" });
      if (!authCheck.ok) {
        toast({
          title: "Session Expired",
          description: "Please log in again to continue.",
          variant: "destructive",
        });
        setLocation("/login");
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 300));
      localStorage.setItem("userProfile", JSON.stringify(formData));
      // Mark personal information as complete for workflow progression
      localStorage.setItem("personalInfoComplete", "true");
      // Dispatch event to update sidebar
      window.dispatchEvent(new Event('workflowProgressUpdate'));
      
      // Check if Deluxe payment is pending
      const pendingDeluxePayment = localStorage.getItem("pendingDeluxePayment");
      
      if (pendingDeluxePayment === "true") {
        toast({
          title: "Personal Information Saved",
          description: "Opening payment page in new tab...",
        });
        
        // Open new window immediately on user gesture to avoid popup blocker
        const paymentWindow = window.open('about:blank', '_blank');
        
        // Redirect to Stripe checkout for Deluxe tier
        try {
          const response = await fetch("/api/stripe/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ 
              priceId: "price_1StACoBWobRZKfqjXUH6tIQN",
              tier: "deluxe"
            })
          });
          
          if (response.status === 401) {
            // Close the blank window and redirect to signup
            if (paymentWindow) paymentWindow.close();
            toast({
              title: "Session Expired",
              description: "Please log in again to continue.",
              variant: "destructive",
            });
            setLocation("/login");
            return;
          }
          
          const data = await response.json();
          if (data.url) {
            // Navigate the pre-opened window to Stripe checkout
            if (paymentWindow) {
              paymentWindow.location.href = data.url;
              toast({
                title: "Payment Page Opened",
                description: "Complete your payment in the new tab. This page will wait for you.",
              });
            } else {
              // Fallback if popup was blocked
              window.location.assign(data.url);
            }
            return;
          } else {
            if (paymentWindow) paymentWindow.close();
            toast({
              title: "Payment Error",
              description: "Unable to create checkout session. Please try again.",
              variant: "destructive",
            });
          }
        } catch (error) {
          if (paymentWindow) paymentWindow.close();
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
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save changes. Please try again.",
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
              <Button onClick={handleSave} disabled={isSaving} data-testid="button-save-profile">
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Save Personal Information
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
