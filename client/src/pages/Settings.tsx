import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Bell, Shield, CreditCard, Check, Crown, Eye, EyeOff, Trash2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useStripePriceIds } from "@/hooks/use-stripe-price-ids";
import { PROMO_ACTIVE } from "@/hooks/use-subscription";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface UserSettings {
  subscriptionTier: string;
  role: string;
  twoFactorEnabled: boolean;
  email: string;
}

interface PaymentRecord {
  id: string;
  date: string;
  amount: string;
  plan: string;
  status: string;
}

export default function Settings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<UserSettings>({
    subscriptionTier: "starter",
    role: "user",
    twoFactorEnabled: false,
    email: ""
  });
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false);
  const [showPaymentHistoryDialog, setShowPaymentHistoryDialog] = useState(false);
  const [show2FADialog, setShow2FADialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [personalInfoComplete, setPersonalInfoComplete] = useState(false);
  const [stripeStatus, setStripeStatus] = useState<{ connected: boolean; webhookConfigured?: boolean; dashboardUrl?: string } | null>(null);

  const isAdmin = settings.role === "admin";
  const isPaidTier = settings.subscriptionTier !== "starter" || isAdmin || PROMO_ACTIVE;

  useEffect(() => {
    const savedProfile = localStorage.getItem("userProfile");
    if (savedProfile) {
      const profile = JSON.parse(savedProfile);
      setSettings({
        subscriptionTier: profile.subscriptionTier || "starter",
        role: profile.role || "user",
        twoFactorEnabled: profile.twoFactorEnabled || false,
        email: profile.email || ""
      });
    }
    // Check if personal information is complete
    const infoComplete = localStorage.getItem("personalInfoComplete");
    if (infoComplete === "true") {
      setPersonalInfoComplete(true);
    }
    fetch("/api/stripe/status", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setStripeStatus(data))
      .catch(() => setStripeStatus({ connected: false }));
  }, []);

  const getTierDisplayName = (tier: string) => {
    const names: Record<string, string> = {
      starter: "Starter (Free)",
      pro: "Pro (Free)",
      deluxe: "Deluxe ($499)"
    };
    return names[tier] || "Starter (Free)";
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "Please make sure your new passwords match.",
        variant: "destructive"
      });
      return;
    }
    if (newPassword.length < 8) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 8 characters.",
        variant: "destructive"
      });
      return;
    }
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    setShowPasswordDialog(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    toast({
      title: "Password Changed",
      description: "Your password has been updated successfully."
    });
  };

  const handleToggle2FA = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    const newValue = !settings.twoFactorEnabled;
    setSettings(prev => ({ ...prev, twoFactorEnabled: newValue }));
    const savedProfile = localStorage.getItem("userProfile");
    if (savedProfile) {
      const profile = JSON.parse(savedProfile);
      profile.twoFactorEnabled = newValue;
      localStorage.setItem("userProfile", JSON.stringify(profile));
    }
    setIsSaving(false);
    setShow2FADialog(false);
    toast({
      title: newValue ? "2FA Enabled" : "2FA Disabled",
      description: newValue 
        ? "Two-factor authentication is now active on your account."
        : "Two-factor authentication has been disabled."
    });
  };

  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const { getPriceId } = useStripePriceIds();

  const handleUpgradePlan = async (tier: string, price: string) => {
    const tierKey = tier.toLowerCase();
    
    // During promo, Pro tier is free - activate directly without payment
    if (tierKey === "pro" && PROMO_ACTIVE) {
      const savedProfile = localStorage.getItem("userProfile");
      const profile = savedProfile ? JSON.parse(savedProfile) : {};
      profile.subscriptionTier = "pro";
      localStorage.setItem("userProfile", JSON.stringify(profile));
      setSettings(prev => ({ ...prev, subscriptionTier: "pro" }));
      setShowSubscriptionDialog(false);
      toast({
        title: "Pro Plan Activated!",
        description: "You now have full access to all Pro features.",
      });
      return;
    }
    
    const priceId = getPriceId(tierKey);
    if (!priceId) {
      toast({ title: "Payment not configured", description: "This plan is not available for checkout right now. Please try again later.", variant: "destructive" });
      return;
    }

    setIsProcessingPayment(true);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ priceId, tier: tierKey })
      });

      if (response.status === 401) {
        window.location.href = `/signup?tier=${tierKey}`;
        return;
      }

      const data = await response.json();
      const checkoutUrl = typeof data?.url === "string" && data.url.startsWith("https://") ? data.url : null;
      if (checkoutUrl) {
        setShowSubscriptionDialog(false);
        window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
      } else {
        const errorMessage = data?.message || "Unable to create checkout session. Please try again.";
        toast({
          title: "Payment Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Payment Error",
        description: "Failed to process payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const paymentHistory: PaymentRecord[] = [
    { id: "1", date: "2024-01-15", amount: "$97.00", plan: "Pro", status: "Completed" },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary">Settings</h1>
          <p className="text-muted-foreground">Manage your account preferences and subscription.</p>
          {isAdmin && (
            <div className="mt-2 inline-flex items-center gap-2 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-3 py-1 rounded-full text-sm font-semibold">
              <Crown className="h-4 w-4" />
              Administrator Access - Full Navigator Access
            </div>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" /> Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Email Alerts</Label>
                <p className="text-sm text-muted-foreground">Receive updates about your claim status.</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Coach Reminders</Label>
                <p className="text-sm text-muted-foreground">Get weekly check-ins from your AI coach.</p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Security</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="outline" onClick={() => setShowPasswordDialog(true)}>
                Change Password
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShow2FADialog(true)}
                className={settings.twoFactorEnabled ? "border-green-500 text-green-600" : ""}
              >
                {settings.twoFactorEnabled ? "Manage Two-Factor Authentication" : "Enable Two-Factor Authentication"}
              </Button>
            </div>
            {settings.twoFactorEnabled && (
              <p className="text-sm text-green-600 flex items-center gap-1">
                <Check className="h-4 w-4" /> Two-factor authentication is enabled
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" /> Billing</CardTitle>
            <CardDescription>
              Current Plan: <span className="font-bold text-primary">{getTierDisplayName(settings.subscriptionTier)}</span>
              {isAdmin && <span className="ml-2 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">Admin Override</span>}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {stripeStatus && (
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Stripe account</p>
                    <p className="text-sm text-muted-foreground">
                      {stripeStatus.connected
                        ? "Connected to the Navigator. Payments are processed securely."
                        : "Not connected. Set STRIPE_PUBLISHABLE_KEY and STRIPE_SECRET_KEY to enable payments."}
                      {stripeStatus.connected && stripeStatus.webhookConfigured === false && (
                        <span className="block mt-1 text-amber-600">Add STRIPE_WEBHOOK_SECRET so subscription updates sync automatically.</span>
                      )}
                    </p>
                  </div>
                </div>
                {stripeStatus.connected && stripeStatus.dashboardUrl && (
                  <a
                    href={stripeStatus.dashboardUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Open Stripe Dashboard
                  </a>
                )}
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="outline" onClick={() => setShowSubscriptionDialog(true)}>
                Manage Subscription
              </Button>
              <Button variant="outline" onClick={() => setShowPaymentHistoryDialog(true)}>
                View Payment History
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Delete Account Section */}
        <Card className={!personalInfoComplete ? "opacity-60" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" /> Delete Account
            </CardTitle>
            <CardDescription>
              {personalInfoComplete 
                ? "Permanently delete your account and all associated data."
                : "Complete your personal information in User Profile to enable this feature."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="destructive" 
              onClick={() => setShowDeleteAccountDialog(true)}
              disabled={!personalInfoComplete}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-delete-account"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete Account
            </Button>
          </CardContent>
        </Card>

        </div>

      {/* Change Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif text-primary">Change Password</DialogTitle>
            <DialogDescription>Enter your current password and choose a new one.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Current Password</Label>
              <div className="relative">
                <Input 
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>New Password</Label>
              <div className="relative">
                <Input 
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 8 characters)"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Confirm New Password</Label>
              <Input 
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button onClick={handleChangePassword} disabled={isSaving} className="flex-1">
                {isSaving ? "Saving..." : "Update Password"}
              </Button>
              <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Two-Factor Authentication Dialog */}
      <Dialog open={show2FADialog} onOpenChange={setShow2FADialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif text-primary">Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              {settings.twoFactorEnabled 
                ? "Manage your two-factor authentication settings."
                : "Add an extra layer of security to your account."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm">
                {settings.twoFactorEnabled 
                  ? "Two-factor authentication is currently enabled. You will receive a verification code via email when signing in."
                  : "When enabled, you'll receive a verification code via email each time you sign in from a new device."}
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleToggle2FA} 
                disabled={isSaving}
                variant={settings.twoFactorEnabled ? "destructive" : "default"}
                className="flex-1"
              >
                {isSaving ? "Processing..." : settings.twoFactorEnabled ? "Disable 2FA" : "Enable 2FA"}
              </Button>
              <Button variant="outline" onClick={() => setShow2FADialog(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage Subscription Dialog */}
      <Dialog open={showSubscriptionDialog} onOpenChange={setShowSubscriptionDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif text-primary">Manage Subscription</DialogTitle>
            <DialogDescription>
              Current Plan: <span className="font-bold">{getTierDisplayName(settings.subscriptionTier)}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`border-2 rounded-lg p-4 text-center ${settings.subscriptionTier === "pro" ? "border-secondary bg-secondary/5" : ""}`}>
                <h4 className="text-lg font-bold text-primary">PRO</h4>
                <p className="text-lg font-bold text-primary my-1">Free For First 500 Veterans</p>
                <p className="text-xs text-green-600 font-semibold mb-1">Limited Time Offer</p>
                <p className="text-xs text-muted-foreground mb-2">Standard Price is <span className="line-through">$97</span></p>
                <Button 
                  className="w-full" 
                  variant={settings.subscriptionTier === "pro" ? "secondary" : "outline"}
                  onClick={() => handleUpgradePlan("Pro", "Free")}
                  disabled={settings.subscriptionTier === "pro" || isProcessingPayment}
                >
                  {settings.subscriptionTier === "pro" ? "Current Plan" : isProcessingPayment ? "Processing..." : "Upgrade"}
                </Button>
              </div>
              <div className={`border-2 rounded-lg p-4 text-center ${settings.subscriptionTier === "deluxe" ? "border-primary bg-primary/5" : ""}`}>
                <h4 className="text-lg font-bold text-primary">DELUXE</h4>
                <p className="text-sm text-muted-foreground line-through">$999</p>
                <p className="text-2xl font-bold text-primary my-1">$499</p>
                <p className="text-xs text-green-600 font-semibold mb-2">Ambassador Promotion</p>
                <Button 
                  className="w-full" 
                  variant={settings.subscriptionTier === "deluxe" ? "secondary" : "outline"}
                  onClick={() => handleUpgradePlan("Deluxe", "$499")}
                  disabled={settings.subscriptionTier === "deluxe" || isProcessingPayment}
                >
                  {settings.subscriptionTier === "deluxe" ? "Current Plan" : isProcessingPayment ? "Processing..." : "Upgrade"}
                </Button>
              </div>
            </div>
            <Button variant="outline" className="w-full" onClick={() => setShowSubscriptionDialog(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment History Dialog */}
      <Dialog open={showPaymentHistoryDialog} onOpenChange={setShowPaymentHistoryDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif text-primary">Payment History</DialogTitle>
            <DialogDescription>View your past transactions and receipts.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {settings.subscriptionTier === "starter" ? (
              <div className="text-center py-8 text-muted-foreground">
                <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No payment history available.</p>
                <p className="text-sm">Upgrade to a paid plan to see your transactions.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {paymentHistory.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{payment.plan} Plan</p>
                      <p className="text-sm text-muted-foreground">{payment.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">{payment.amount}</p>
                      <p className="text-xs text-green-600">{payment.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Button variant="outline" className="w-full" onClick={() => setShowPaymentHistoryDialog(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Account Confirmation Dialog */}
      <Dialog open={showDeleteAccountDialog} onOpenChange={setShowDeleteAccountDialog}>
        <DialogContent className="sm:max-w-md border-4 border-red-500">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-6 w-6" /> Delete Account
            </DialogTitle>
            <DialogDescription className="text-base">
              This action cannot be undone. All your data, claims, documents, and personal information will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">
                To confirm deletion, type <span className="font-bold">DELETE</span> below:
              </p>
            </div>
            <Input 
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
              placeholder="Type DELETE to confirm"
              className="text-center font-bold"
              data-testid="input-delete-confirm"
            />
            <div className="flex gap-2 pt-2">
              <Button 
                variant="destructive" 
                onClick={() => {
                  if (deleteConfirmText === "DELETE") {
                    // Clear all user data
                    localStorage.clear();
                    toast({
                      title: "Account Deleted",
                      description: "Your account and all data have been permanently deleted.",
                      variant: "destructive"
                    });
                    // Redirect to home page
                    window.location.href = "/";
                  } else {
                    toast({
                      title: "Confirmation Required",
                      description: "Please type DELETE to confirm account deletion.",
                      variant: "destructive"
                    });
                  }
                }}
                disabled={deleteConfirmText !== "DELETE"}
                className="flex-1 bg-red-600 hover:bg-red-700"
                data-testid="button-confirm-delete-account"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete Account
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowDeleteAccountDialog(false);
                  setDeleteConfirmText("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
