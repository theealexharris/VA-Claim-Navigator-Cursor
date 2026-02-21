import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowRight, Loader2, Eye, EyeOff, Mail, KeyRound } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { resendVerificationEmail, verifyEmail, setAccessToken } from "@/lib/api";

type AuthView = "login" | "signup" | "verify-email";

export default function AuthPage() {
  const [location, setLocation] = useLocation();
  const isLogin = location === "/login" || location.startsWith("/login?");
  const isSignup = location === "/signup" || location.startsWith("/signup?");

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showLoginVerificationHint, setShowLoginVerificationHint] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const { login, register } = useAuth();
  const { toast } = useToast();

  // View state: after signup we may show the code-entry screen
  const [view, setView] = useState<AuthView>(isLogin ? "login" : "signup");
  const [verificationCode, setVerificationCode] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
  });
  const [authConfigError, setAuthConfigError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${typeof window !== "undefined" ? window.location.origin : ""}/api/auth/status`)
      .then((r) => r.json())
      .then((d) => setAuthConfigError(d.error ?? null))
      .catch(() => setAuthConfigError("Could not reach the server. Please check your internet connection and try again."));
  }, []);

  // Sync view when URL changes; set Deluxe pending when user lands on signup with tier=deluxe
  useEffect(() => {
    if (isLogin) { setView("login"); setShowLoginVerificationHint(false); }
    else if (isSignup) {
      setView("signup");
      const tierParam = new URLSearchParams(window.location.search).get("tier");
      if (tierParam === "deluxe") {
        localStorage.setItem("pendingDeluxePayment", "true");
        localStorage.setItem("selectedTier", "deluxe");
      }
    }
  }, [isLogin, isSignup]);

  // Remember-me
  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberedEmail");
    const savedRememberMe = localStorage.getItem("rememberMe");
    const savedTimestamp = localStorage.getItem("rememberMeTimestamp");
    if (savedEmail && savedRememberMe === "true" && savedTimestamp) {
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      if (Date.now() - parseInt(savedTimestamp) < thirtyDays) {
        setFormData(prev => ({ ...prev, email: savedEmail }));
        setRememberMe(true);
      } else {
        localStorage.removeItem("rememberedEmail");
        localStorage.removeItem("rememberMe");
        localStorage.removeItem("rememberMeTimestamp");
      }
    }
  }, []);

  // After successful login or signup – full redirect so URL bar shows correct origin
  function navigateAfterAuth() {
    const urlParams = new URLSearchParams(window.location.search);
    const tierParam = urlParams.get("tier");
    const pendingDeluxe = localStorage.getItem("pendingDeluxePayment");
    const redirectAfterLogin = sessionStorage.getItem("redirectAfterLogin");
    sessionStorage.removeItem("redirectAfterLogin");

    const origin = window.location.origin;
    let path = "/dashboard";
    if (tierParam === "deluxe" || pendingDeluxe === "true") {
      localStorage.setItem("pendingDeluxePayment", "true");
      localStorage.setItem("selectedTier", "deluxe");
      path = "/dashboard/profile";
    } else if (tierParam === "pro") {
      localStorage.setItem("selectedTier", "pro");
      // Pro users who were sent to login to reach claim builder go there; others go to profile
      path =
        redirectAfterLogin && redirectAfterLogin.startsWith("/dashboard")
          ? redirectAfterLogin
          : "/dashboard/profile";
    } else if (redirectAfterLogin && redirectAfterLogin.startsWith("/dashboard")) {
      path = redirectAfterLogin;
    }
    window.location.href = `${origin}${path}`;
  }

  // ─── Login submit ───
  async function handleLogin() {
    setIsLoading(true);
    try {
      await login(formData.email, formData.password);

      if (rememberMe) {
        localStorage.setItem("rememberedEmail", formData.email);
        localStorage.setItem("rememberMe", "true");
        localStorage.setItem("rememberMeTimestamp", Date.now().toString());
      } else {
        localStorage.removeItem("rememberedEmail");
        localStorage.removeItem("rememberMe");
        localStorage.removeItem("rememberMeTimestamp");
      }

      toast({ title: "Welcome back!", description: "You've successfully logged in." });
      navigateAfterAuth();
    } catch (error: any) {
      // Insforge returns AUTH_UNAUTHORIZED for BOTH wrong password AND unverified email.
      // Always show the "haven't verified?" hint so the user isn't stuck.
      setShowLoginVerificationHint(true);
      toast({
        title: "Sign-in failed",
        description: error?.message || "Invalid email or password. If you recently signed up, make sure you've verified your email.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  // ─── Register submit ───
  async function handleRegister() {
    setIsLoading(true);
    try {
      const result = await register(formData.email, formData.password, formData.firstName, formData.lastName);

      // Clear stale data for fresh account
      ["serviceHistory","medicalConditions","claimBuilderConditions","claimBuilderEvidence",
       "generatedMemorandum","layStatements","buddyStatements","serviceConnectedPercentage",
       "personalInfoComplete","previousClaimEnded"].forEach(k => localStorage.removeItem(k));

      if (result && typeof result === "object" && result.requireEmailVerification) {
        // Email verification required – switch to code entry view
        setView("verify-email");
        toast({
          title: "Check your email",
          description: "We sent a 6-digit verification code to " + formData.email,
        });
        return; // DO NOT navigate to dashboard
      }

      // Immediate login (no verification) – populate profile and redirect
      const savedUser = result && typeof result === "object" ? (result.user ?? result) : null;
      localStorage.setItem("userProfile", JSON.stringify({
        firstName: savedUser?.firstName ?? formData.firstName,
        lastName: savedUser?.lastName ?? formData.lastName,
        email: savedUser?.email ?? formData.email,
        phone: "", address: "", city: "", state: "", zipCode: "", ssn: "", vaFileNumber: "",
      }));
      localStorage.setItem("showOnboarding", "true");
      toast({ title: "Account created!", description: "Welcome to VA Claim Navigator." });
      navigateAfterAuth();
    } catch (error: any) {
      toast({
        title: "Registration failed",
        description: error?.message || "Could not create account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  // ─── Verify email code ───
  async function handleVerifyCode() {
    if (!verificationCode.trim()) return;
    setVerifyLoading(true);
    try {
      const result = await verifyEmail(formData.email, verificationCode.trim());
      const user = result?.user ?? result;

      // Populate profile for dashboard
      localStorage.setItem("userProfile", JSON.stringify({
        firstName: user?.firstName ?? formData.firstName,
        lastName: user?.lastName ?? formData.lastName,
        email: user?.email ?? formData.email,
        phone: "", address: "", city: "", state: "", zipCode: "", ssn: "", vaFileNumber: "",
      }));
      localStorage.setItem("showOnboarding", "true");

      toast({ title: "Email verified!", description: "Welcome to VA Claim Navigator." });

      // If they chose Deluxe, send them to profile to complete then pay $499
      const pendingDeluxe = localStorage.getItem("pendingDeluxePayment");
      const redirect = pendingDeluxe === "true" ? "/dashboard/profile" : "/dashboard";
      window.location.href = redirect;
    } catch (error: any) {
      toast({
        title: "Verification failed",
        description: error?.message || "Invalid or expired code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setVerifyLoading(false);
    }
  }

  // ─── Resend verification email ───
  async function handleResend() {
    const email = formData.email?.trim();
    if (!email) return;
    setResendLoading(true);
    try {
      await resendVerificationEmail(email);
      toast({
        title: "Verification code sent",
        description: "Check your inbox and spam folder for the new code.",
      });
    } catch {
      toast({
        title: "Could not send code",
        description: "Please wait a moment and try again.",
        variant: "destructive",
      });
    } finally {
      setResendLoading(false);
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (view === "verify-email") { handleVerifyCode(); return; }
    if (isLogin) handleLogin();
    else handleRegister();
  };

  // ─── Render: Verify Email Code Screen ───
  if (view === "verify-email") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-white">
        <Card className="w-full max-w-md shadow-2xl border-gray-200">
          <CardHeader className="space-y-2 text-center pb-6">
            <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-2">
              <KeyRound className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-serif font-bold text-primary">
              Verify Your Email
            </CardTitle>
            <CardDescription className="text-base">
              Enter the 6-digit code sent to <strong>{formData.email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="verification-code">Verification Code</Label>
                <Input
                  id="verification-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="123456"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="text-center text-2xl tracking-[0.5em] font-mono"
                  required
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full h-11 text-base font-semibold shadow-md" disabled={verifyLoading || verificationCode.length < 6}>
                {verifyLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifying...</>
                ) : (
                  <>Verify & Continue<ArrowRight className="ml-2 h-4 w-4" /></>
                )}
              </Button>
            </form>
            <div className="mt-4 text-center space-y-2">
              <p className="text-sm text-muted-foreground">Didn't receive the code?</p>
              <Button type="button" variant="outline" size="sm" onClick={handleResend} disabled={resendLoading} className="w-full">
                {resendLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                {resendLoading ? "Sending…" : "Resend Code"}
              </Button>
            </div>
          </CardContent>
          <CardFooter className="justify-center border-t pt-6 bg-gray-50/50 rounded-b-xl">
            <p className="text-sm text-muted-foreground">
              Wrong email?{" "}
              <button type="button" onClick={() => { setView("signup"); setVerificationCode(""); }} className="font-semibold text-primary hover:underline">
                Go back
              </button>
            </p>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // ─── Render: Login / Signup ───
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-white">
      <Card className="w-full max-w-md shadow-2xl border-gray-200">
        <CardHeader className="space-y-2 text-center pb-8">
          <div className="mx-auto p-1 rounded-full w-fit mb-2">
            <img src="/favicon.png" alt="VA Claim Navigator" className="h-10 w-10 object-contain mx-auto" />
          </div>
          <CardTitle className="text-2xl font-serif font-bold text-primary">
            {isLogin ? "Welcome Back, Warrior" : "Create Your Account"}
          </CardTitle>
          <CardDescription className="text-base">
            {isLogin
              ? "Enter your credentials to access your claim dashboard."
              : "Start your journey to the benefits you deserve."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {authConfigError && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 mb-4 text-left">
              <p className="text-sm font-medium text-amber-800">Auth not configured</p>
              <p className="text-sm text-amber-700 mt-1">{authConfigError}</p>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Login: verification hint after failed sign-in */}
            {isLogin && showLoginVerificationHint && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
                <p className="text-sm text-amber-800">
                  If you recently created an account, you may need to verify your email first.
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button" variant="outline" size="sm"
                    className="flex-1 border-amber-300 text-amber-800 hover:bg-amber-100"
                    onClick={handleResend} disabled={resendLoading || !formData.email}
                  >
                    {resendLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Mail className="h-4 w-4 mr-1" />}
                    {resendLoading ? "Sending…" : "Resend Code"}
                  </Button>
                  <Button
                    type="button" variant="outline" size="sm"
                    className="flex-1 border-amber-300 text-amber-800 hover:bg-amber-100"
                    onClick={() => { setView("verify-email"); setVerificationCode(""); }}
                    disabled={!formData.email}
                  >
                    <KeyRound className="h-4 w-4 mr-1" />
                    Enter Code
                  </Button>
                </div>
              </div>
            )}

            {!isLogin && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first-name">First name</Label>
                  <Input
                    id="first-name" data-testid="input-firstname" placeholder="John"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last-name">Last name</Label>
                  <Input
                    id="last-name" data-testid="input-lastname" placeholder="Doe"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email" data-testid="input-email" type="email" placeholder="john.doe@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                {isLogin && (
                  <Link href="/reset-password" className="text-sm text-primary font-medium hover:underline">
                    Forgot password?
                  </Link>
                )}
              </div>
              <div className="relative">
                <Input
                  id="password" data-testid="input-password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="pr-10"
                  required
                />
                <button
                  type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
                  data-testid="button-toggle-password"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {isLogin && (
              <div className="flex items-center space-x-2">
                <Checkbox id="remember" checked={rememberMe} onCheckedChange={(c) => setRememberMe(c as boolean)} />
                <Label htmlFor="remember" className="text-sm font-normal text-muted-foreground">Remember me for 30 days</Label>
              </div>
            )}

            <Button type="submit" data-testid="button-submit" className="w-full h-11 text-base font-semibold shadow-md" disabled={isLoading}>
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Authenticating...</>
              ) : (
                <>{isLogin ? "Sign In" : "Create Account"}<ArrowRight className="ml-2 h-4 w-4" /></>
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center border-t pt-6 bg-gray-50/50 rounded-b-xl flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <Link href={isLogin ? "/signup" : "/login"} className="font-semibold text-primary hover:underline">
              {isLogin ? "Sign up" : "Log in"}
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
