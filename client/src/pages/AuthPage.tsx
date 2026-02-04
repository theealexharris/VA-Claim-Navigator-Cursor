import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, ArrowRight, Loader2, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AuthPage() {
  const [location, setLocation] = useLocation();
  // Parse path and query from the full window location for tier param
  const isLogin = location === "/login" || location.startsWith("/login?");
  const isSignup = location === "/signup" || location.startsWith("/signup?");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const { login, register } = useAuth();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
  });

  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberedEmail");
    const savedRememberMe = localStorage.getItem("rememberMe");
    const savedTimestamp = localStorage.getItem("rememberMeTimestamp");
    
    if (savedEmail && savedRememberMe === "true" && savedTimestamp) {
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      const timePassed = Date.now() - parseInt(savedTimestamp);
      
      if (timePassed < thirtyDays) {
        setFormData(prev => ({ ...prev, email: savedEmail }));
        setRememberMe(true);
      } else {
        localStorage.removeItem("rememberedEmail");
        localStorage.removeItem("rememberMe");
        localStorage.removeItem("rememberMeTimestamp");
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      if (isLogin) {
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
        
        toast({
          title: "Welcome back!",
          description: "You've successfully logged in.",
        });
      } else {
        await register(formData.email, formData.password, formData.firstName, formData.lastName);
        
        // Clear all previous user data for fresh account - prevent data leakage from previous sessions
        const keysToRemove = [
          "serviceHistory",
          "medicalConditions", 
          "claimBuilderConditions",
          "claimBuilderEvidence",
          "generatedMemorandum",
          "layStatements",
          "buddyStatements",
          "serviceConnectedPercentage",
          "personalInfoComplete",
          "previousClaimEnded"
        ];
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        // Pre-populate personal information from registration form
        const userProfile = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: "",
          address: "",
          city: "",
          state: "",
          zipCode: "",
          ssn: "",
          vaFileNumber: ""
        };
        localStorage.setItem("userProfile", JSON.stringify(userProfile));
        
        // Set flag to show onboarding sequence after account creation
        localStorage.setItem("showOnboarding", "true");
        toast({
          title: "Account created!",
          description: "Welcome to VA Claim Navigator.",
        });
      }
      
      // Check if user came from a tier signup - redirect to profile for payment
      const urlParams = new URLSearchParams(window.location.search);
      const tierParam = urlParams.get("tier");
      const pendingDeluxe = localStorage.getItem("pendingDeluxePayment");
      
      // Check for redirect destination saved before login
      const redirectAfterLogin = sessionStorage.getItem("redirectAfterLogin");
      sessionStorage.removeItem("redirectAfterLogin");
      
      if (tierParam === "deluxe" || pendingDeluxe === "true") {
        // Ensure the flag is set for deluxe payment
        localStorage.setItem("pendingDeluxePayment", "true");
        localStorage.setItem("selectedTier", "deluxe");
        setLocation("/dashboard/profile");
      } else if (tierParam === "pro") {
        localStorage.setItem("selectedTier", "pro");
        setLocation("/dashboard/profile");
      } else if (redirectAfterLogin && redirectAfterLogin.startsWith("/dashboard")) {
        // Return user to where they were before session expired
        setLocation(redirectAfterLogin);
      } else {
        setLocation("/dashboard");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Authentication failed",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-white">
      <Card className="w-full max-w-md shadow-2xl border-gray-200">
        <CardHeader className="space-y-2 text-center pb-8">
          <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-2">
            <Shield className="h-8 w-8 text-primary" />
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
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first-name">First name</Label>
                  <Input 
                    id="first-name" 
                    data-testid="input-firstname"
                    placeholder="John" 
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last-name">Last name</Label>
                  <Input 
                    id="last-name" 
                    data-testid="input-lastname"
                    placeholder="Doe" 
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
                id="email" 
                data-testid="input-email"
                type="email" 
                placeholder="john.doe@example.com" 
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
                  id="password" 
                  data-testid="input-password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="pr-10"
                  required 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
                  data-testid="button-toggle-password"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {isLogin && (
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="remember" 
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                />
                <Label htmlFor="remember" className="text-sm font-normal text-muted-foreground">Remember me for 30 days</Label>
              </div>
            )}

            <Button type="submit" data-testid="button-submit" className="w-full h-11 text-base font-semibold shadow-md" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  {isLogin ? "Sign In" : "Create Account"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
          
        </CardContent>
        <CardFooter className="justify-center border-t pt-6 bg-gray-50/50 rounded-b-xl">
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
