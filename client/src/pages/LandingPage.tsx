import { Link } from "wouter";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { 
  CheckCircle2, 
  Shield, 
  FileCheck, 
  ArrowRight, 
  Star, 
  Bot,
  PenTool,
  Users,
  Scale,
  Calculator,
  BookOpen,
  Check,
  Zap,
  Sparkles
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import heroVideo from "@assets/Claim_navigator_video_1768853413666.mp4";
import avatar1 from "@assets/stock_images/diverse_professional_43b32cf6.jpg";
import avatar2 from "@assets/stock_images/diverse_professional_31dd8b43.jpg";
import avatar3 from "@assets/stock_images/diverse_professional_7cce766a.jpg";
import avatar4 from "@assets/stock_images/diverse_professional_b621c6df.jpg";

const TIER_PRICE_IDS: Record<string, string> = {
  pro: "price_1StA6uBWobRZKfqjxgQpF5W6",  // $47 Ambassador Promotion price
  deluxe: "price_1StACoBWobRZKfqjXUH6tIQN"  // $499 Ambassador Promotion price
};

export default function LandingPage() {
  const [showGetStarted, setShowGetStarted] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState("");
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedTier, setSelectedTier] = useState<{name: string, price: string, tier: string}>({ name: "", price: "", tier: "" });
  const [vetsServedCount, setVetsServedCount] = useState(526);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showPromoPopup, setShowPromoPopup] = useState(false);

  useEffect(() => {
    fetch("/api/stats/vets-served")
      .then(res => res.json())
      .then(data => {
        if (data.count) {
          setVetsServedCount(data.count);
        }
      })
      .catch(() => {
        // Keep default value on error
      });
  }, []);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = true;
      video.play().then(() => {
        video.muted = false;
      }).catch(() => {
        // Autoplay blocked, keep muted and try again
        video.play().catch(() => {});
      });
    }
  }, []);

  const handleFeatureClick = (featureTitle: string) => {
    setSelectedFeature(featureTitle);
    setShowGetStarted(true);
  };

  const handlePaidTierClick = async (tierName: string, price: string) => {
    // Check if user is logged in first
    try {
      const authCheck = await fetch("/api/auth/me", { credentials: "include" });
      const isLoggedIn = authCheck.status === 200;
      
      // Pro tier is free - go directly to profile
      if (tierName === "Pro") {
        localStorage.setItem("selectedTier", "pro");
        localStorage.removeItem("pendingDeluxePayment");
        if (isLoggedIn) {
          window.location.href = "/dashboard/profile";
        } else {
          window.location.href = "/signup?tier=pro";
        }
        return;
      }
      
      // Deluxe tier - go to profile first, then payment after saving
      if (tierName === "Deluxe") {
        localStorage.setItem("selectedTier", "deluxe");
        localStorage.setItem("pendingDeluxePayment", "true");
        if (isLoggedIn) {
          window.location.href = "/dashboard/profile";
        } else {
          window.location.href = "/signup?tier=deluxe";
        }
        return;
      }
    } catch (error) {
      console.error("Auth check failed:", error);
    }
    
    // Fallback for other tiers
    setSelectedTier({ 
      name: tierName, 
      price, 
      tier: tierName.toLowerCase() 
    });
    setShowPaymentDialog(true);
  };

  const handleCheckout = async () => {
    const priceId = TIER_PRICE_IDS[selectedTier.tier];
    if (!priceId) return;

    setIsProcessingPayment(true);
    
    // Open new window immediately on user gesture to avoid popup blocker
    const paymentWindow = window.open('about:blank', '_blank');
    
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ priceId, tier: selectedTier.tier })
      });

      if (response.status === 401) {
        if (paymentWindow) paymentWindow.close();
        window.location.href = `/signup?tier=${selectedTier.tier}`;
        return;
      }

      const data = await response.json();
      if (data.url) {
        setShowPaymentDialog(false);
        // Navigate the pre-opened window to Stripe checkout
        if (paymentWindow) {
          paymentWindow.location.href = data.url;
        } else {
          // Fallback if popup was blocked
          window.location.assign(data.url);
        }
      } else {
        if (paymentWindow) paymentWindow.close();
        console.error("No checkout URL returned");
      }
    } catch (error) {
      if (paymentWindow) paymentWindow.close();
      console.error("Checkout error:", error);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />
      
      <Dialog open={showGetStarted} onOpenChange={setShowGetStarted}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif text-primary flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-secondary" />
              Unlock {selectedFeature}
            </DialogTitle>
            <DialogDescription className="text-base pt-2">
              Create your free account to access our {selectedFeature} and all the tools you need to build a winning VA claim.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="h-4 w-4 text-green-600" />
                <span>Free to get started - no credit card required</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="h-4 w-4 text-green-600" />
                <span>Access to Education Library</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="h-4 w-4 text-green-600" />
                <span>Basic Claim Builder included</span>
              </div>
            </div>
            <div className="flex flex-col gap-3 pt-2">
              <Link href="/signup">
                <Button className="w-full h-12 text-lg font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/90" data-testid="button-popup-register">
                  Create Free Account <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <p className="text-center text-sm text-muted-foreground">
                Already have an account? <Link href="/login" className="text-primary font-medium hover:underline">Log in</Link>
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Hero Section */}
      <section className="relative pt-12 pb-20 lg:pt-24 lg:pb-32 overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 z-10 relative">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 text-secondary-foreground font-medium text-sm border border-secondary/20">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
                </span>
                Trusted and Built by Veterans for Veterans!
              </div>
              
              <h1 className="text-5xl lg:text-7xl font-serif font-bold text-primary leading-[1.1] tracking-tight">
                Get the VA Rating <br/>
                <span className="text-secondary relative inline-block">
                  You Deserve
                  <svg className="absolute w-full h-3 -bottom-1 left-0 text-secondary/30" viewBox="0 0 100 10" preserveAspectRatio="none">
                    <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" />
                  </svg>
                </span>
              </h1>
              
              <p className="text-xl text-muted-foreground leading-relaxed max-w-lg">
                Stop fighting the VA alone. Our intelligent platform guides you through every step of your disability claim, ensuring accuracy and maximizing your success.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link href="/book-consultation">
                  <Button size="lg" className="h-14 px-8 text-lg font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-lg shadow-secondary/20" data-testid="button-book-consultation">
                    Book Free Strategy Session
                  </Button>
                </Link>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="h-14 px-8 text-lg font-semibold border-2 hover:bg-muted/50 opacity-60 cursor-not-allowed" 
                  data-testid="button-get-started"
                  onClick={() => setShowPromoPopup(true)}
                >
                  Get Started Free
                </Button>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground pt-4">
                <div className="flex -space-x-2">
                  {[avatar1, avatar2, avatar3, avatar4].map((avatar, i) => (
                    <img 
                      key={i} 
                      src={avatar} 
                      alt={`Veteran ${i + 1}`}
                      className="h-8 w-8 rounded-full border-2 border-white object-cover"
                    />
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  <div className="flex">
                    {[1,2,3,4].map(i => <Star key={i} className="h-4 w-4 fill-secondary text-secondary" />)}
                    <div className="relative h-4 w-4">
                      <Star className="h-4 w-4 text-gray-300 fill-gray-300 absolute" />
                      <div className="overflow-hidden w-1/2 absolute">
                        <Star className="h-4 w-4 fill-secondary text-secondary" />
                      </div>
                    </div>
                  </div>
                  <span className="font-semibold text-primary">4.5/5 from Veterans</span>
                </div>
              </div>
            </div>
            
            <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-primary/20 border-4 border-white transform rotate-2 hover:rotate-0 transition-transform duration-500 flex justify-center">
              <video 
                ref={videoRef}
                src={heroVideo}
                playsInline
                controls
                className="max-h-[600px] w-auto rounded-xl"
                data-testid="video-hero"
              />
            </div>
          </div>
        </div>
        
        {/* Background Elements */}
        <div className="absolute top-0 right-0 -z-10 w-1/2 h-full bg-gray-50/50 clip-path-slant"></div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-2xl md:text-3xl font-extrabold text-secondary uppercase tracking-wider mb-2">HOW IT WORKS</h2>
            <h3 className="text-3xl md:text-4xl font-serif font-bold text-primary mb-4">Three Simple Steps to Your Claim</h3>
            <p className="text-lg text-muted-foreground">
              Our streamlined process takes the confusion out of filing your VA disability claim.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center p-8">
              <div className="w-16 h-16 rounded-full bg-secondary/20 flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl font-bold text-secondary">1</span>
              </div>
              <h4 className="text-xl font-bold text-primary mb-3 font-serif">Tell Us About Your Service</h4>
              <p className="text-muted-foreground">Answer guided questions about your military service, conditions, and current symptoms.</p>
            </div>
            <div className="text-center p-8">
              <div className="w-16 h-16 rounded-full bg-secondary/20 flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl font-bold text-secondary">2</span>
              </div>
              <h4 className="text-xl font-bold text-primary mb-3 font-serif">Build Your Evidence Package</h4>
              <p className="text-muted-foreground">Upload documents, create statements, and gather buddy letters with our smart tools.</p>
            </div>
            <div className="text-center p-8">
              <div className="w-16 h-16 rounded-full bg-secondary/20 flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl font-bold text-secondary">3</span>
              </div>
              <h4 className="text-xl font-bold text-primary mb-3 font-serif">Submit With Confidence</h4>
              <p className="text-muted-foreground">Review your complete claim package and submit knowing you have the strongest case possible.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-primary mb-4">Everything You Need to Win Your Claim</h2>
            <p className="text-lg text-muted-foreground">The VA system is complex. Our platform simplifies it into a clear, step-by-step path to success.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Shield className="h-10 w-10 text-secondary" />}
              title="Intelligent Claim Builder"
              description="Our adaptive system asks the right questions based on your specific conditions, ensuring no detail is missed."
              onClick={() => handleFeatureClick("Intelligent Claim Builder")}
            />
            <FeatureCard 
              icon={<FileCheck className="h-10 w-10 text-secondary" />}
              title="Evidence Automation"
              description="We help you gather, organize, and format the exact medical evidence the VA raters are looking for."
              onClick={() => handleFeatureClick("Evidence Automation")}
            />
            <FeatureCard 
              icon={<Bot className="h-10 w-10 text-secondary" />}
              title="Warrior AI Coach"
              description="Get instant answers to your questions and guidance on how to articulate your symptoms effectively."
              onClick={() => handleFeatureClick("Warrior AI Coach")}
            />
            <FeatureCard 
              icon={<BookOpen className="h-10 w-10 text-secondary" />}
              title="Education Library"
              description="Access a comprehensive library of video tutorials and articles explaining every step of the VA process."
              onClick={() => handleFeatureClick("Education Library")}
            />
            <div className="md:col-span-2 flex justify-center items-start">
              <img 
                src="/attached_assets/IMG_0398_1769121331059.jpeg" 
                alt="Veteran at VA Liberty Building" 
                className="rounded-xl shadow-lg max-w-md w-full object-cover"
                data-testid="img-veteran-feature"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Vets Served Counter Section */}
      <section className="py-16 bg-gradient-to-r from-primary/5 to-secondary/5">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-10">
            <h3 className="text-2xl md:text-3xl font-serif font-bold text-primary text-center md:text-right" data-testid="text-goal-message">
              Goal to 1 Million Vets Served!
            </h3>
            <div className="bg-white rounded-xl shadow-lg px-8 py-4 border-2 border-secondary/30" data-testid="counter-vets-served">
              <span className="text-4xl md:text-5xl font-mono font-bold text-primary tracking-wider">
                {(() => {
                  const padded = vetsServedCount.toString().padStart(7, '0');
                  return `${padded[0]},${padded.slice(1, 4)},${padded.slice(4, 7)}`;
                })()}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-sm font-bold text-secondary uppercase tracking-wider mb-2">PRICING</h2>
            <h3 className="text-3xl md:text-4xl font-serif font-bold text-primary mb-4">Invest in Your Future Benefits</h3>
            <p className="text-lg text-muted-foreground">
              Choose the plan that fits your needs. All plans include access to our proven claim-building methodology.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {/* Starter Plan */}
            <Card className="relative border-2 border-primary hover:shadow-xl transition-shadow">
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-2xl font-serif text-primary">Starter</CardTitle>
                <CardDescription className="text-sm">
                  Perfect for veterans just beginning their claim journey
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="text-center mb-6">
                  <span className="text-4xl font-bold text-primary">FREE</span>
                </div>
                <ul className="space-y-3 mb-6 text-sm">
                  <PricingFeature>Basic Claim Builder</PricingFeature>
                  <PricingFeature>Email Support</PricingFeature>
                  <PricingFeature>Resource Education Library Access</PricingFeature>
                </ul>
                <Button 
                  className="w-full h-11 font-semibold bg-primary text-primary-foreground hover:bg-primary/90 opacity-60 cursor-not-allowed" 
                  data-testid="button-starter"
                  onClick={() => setShowPromoPopup(true)}
                >
                  Get Started Free
                </Button>
              </CardContent>
            </Card>

            {/* Pro Plan - Most Popular */}
            <Card className="relative border-2 border-secondary shadow-xl z-10">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="bg-secondary text-secondary-foreground text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                  <Zap className="h-3 w-3" /> Most Popular
                </span>
              </div>
              <CardHeader className="text-center pb-2 pt-6">
                <CardTitle className="text-2xl font-serif text-primary">PRO</CardTitle>
                <CardDescription className="text-sm">
                  Complete toolkit for serious claim preparation
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="text-center mb-6">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-2xl font-bold text-primary">Free For First 500 Veterans</span>
                  </div>
                  <span className="text-sm font-semibold text-green-600 bg-green-100 px-2 py-1 rounded mt-2 inline-block">Limited Time Offer</span>
                  <p className="text-sm text-muted-foreground mt-2">Standard Price is <span className="line-through">$97</span></p>
                </div>
                <ul className="space-y-3 mb-6 text-sm">
                  <PricingFeature>Everything in Starter</PricingFeature>
                  <PricingFeature>Intelligent Claim Builder</PricingFeature>
                  <PricingFeature>Unlimited Document Uploads</PricingFeature>
                  <PricingFeature>Evidence Organization Tools</PricingFeature>
                  <PricingFeature>AI Coach Access</PricingFeature>
                  <PricingFeature>Statement Builders</PricingFeature>
                  <PricingFeature>Priority Support</PricingFeature>
                </ul>
                <Button 
                  className="w-full h-11 font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/90" 
                  data-testid="button-pro"
                  onClick={() => handlePaidTierClick("Pro", "Free")}
                >
                  Go Pro
                </Button>
              </CardContent>
            </Card>

            {/* Deluxe Plan */}
            <Card className="relative border-2 border-primary bg-gradient-to-b from-primary/5 to-transparent hover:shadow-xl transition-shadow">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                  White Glove
                </span>
              </div>
              <CardHeader className="text-center pb-2 pt-6">
                <CardTitle className="text-2xl font-serif text-primary">DELUXE</CardTitle>
                <CardDescription className="text-sm">
                  Full-Service 1:1 Coaching and Consulting
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="text-center mb-6">
                  <span className="text-2xl font-bold text-muted-foreground line-through">$999</span>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-4xl font-bold text-primary">$499</span>
                    <span className="text-muted-foreground text-sm">/One Time Rate</span>
                  </div>
                  <span className="text-sm font-semibold text-green-600 bg-green-100 px-2 py-1 rounded mt-2 inline-block">New Ambassador Promotion</span>
                </div>
                <ul className="space-y-3 mb-6 text-sm">
                  <PricingFeature>Everything in Pro</PricingFeature>
                  <PricingFeature>Live 1-on-1 coaching sessions</PricingFeature>
                  <PricingFeature>Personal Assigned Case Consultant</PricingFeature>
                  <PricingFeature>Live Intake</PricingFeature>
                  <PricingFeature>Live Claims Review and Audit</PricingFeature>
                  <PricingFeature>Live Claims Drafting Support</PricingFeature>
                  <PricingFeature>Live Draft Review and Editing</PricingFeature>
                  <PricingFeature>Live Final Submission Walk-thru</PricingFeature>
                </ul>
                <Button 
                  className="w-full h-11 font-semibold bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:from-primary/90 hover:to-primary/70" 
                  data-testid="button-deluxe"
                  onClick={() => handlePaidTierClick("Deluxe", "$499")}
                >
                  Go Deluxe
                </Button>
              </CardContent>
            </Card>

            {/* Business Plan */}
            <Card className="relative border-2 border-secondary hover:shadow-xl transition-shadow">
              <CardHeader className="text-center pb-2 pt-6">
                <CardTitle className="text-2xl font-serif text-primary">BUSINESS</CardTitle>
                <CardDescription className="text-sm">
                  For all Businesses, Law Firms, VA Organizations, Please Contact us Directly via email.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="text-center mb-6">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-2xl font-bold text-primary">Custom Pricing</span>
                  </div>
                  <span className="text-sm font-semibold text-primary bg-primary/10 px-2 py-1 rounded mt-2 inline-block">Enterprise Solutions</span>
                </div>
                <ul className="space-y-3 mb-6 text-sm">
                  <PricingFeature>Volume Licensing</PricingFeature>
                  <PricingFeature>Dedicated Account Manager</PricingFeature>
                  <PricingFeature>Custom Integration Support</PricingFeature>
                  <PricingFeature>Priority Technical Support</PricingFeature>
                  <PricingFeature>Training and Onboarding</PricingFeature>
                </ul>
                <a href="mailto:Frontdesk@vaclaimnavigator.com">
                  <Button 
                    className="w-full h-11 font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/90" 
                    data-testid="button-business"
                  >
                    Contact Us
                  </Button>
                </a>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-serif font-bold mb-6 text-primary">Ready to Take Control of Your Future?</h2>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Join thousands of veterans who have successfully increased their rating with our guided system.
          </p>
          <Link href="/signup">
            <Button size="lg" className="h-16 px-10 text-xl font-bold bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-xl">
              Start Your Claim Now <ArrowRight className="ml-2 h-6 w-6" />
            </Button>
          </Link>
          <p className="mt-6 text-sm text-muted-foreground">No credit card required for initial assessment.</p>
        </div>
      </section>

      <Footer />

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
                <Check className="h-4 w-4 text-green-600" />
                <span>Full access to Claim Builder</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span>Print & Download PDF features</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span>AI Claim Memorandum generation</span>
              </div>
            </div>
            <Button 
              className="w-full h-12 text-lg font-bold bg-secondary text-secondary-foreground hover:bg-secondary/90"
              onClick={handleCheckout}
              disabled={isProcessingPayment}
              data-testid="button-pay-now"
            >
              {isProcessingPayment ? "Processing..." : "Pay Now"}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Secure payment processing. Your data is protected.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Free Tier Promo Popup */}
      <Dialog open={showPromoPopup} onOpenChange={setShowPromoPopup}>
        <DialogContent className="sm:max-w-md border-4 border-red-500" data-testid="dialog-promo-popup">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif text-primary text-center">
              Use FREE PROMO PRO PLAN
            </DialogTitle>
            <DialogDescription className="text-center text-base pt-2 text-red-600 font-bold">
              The FREE Starter tier is temporarily disabled. Please use our FREE PROMO PRO PLAN instead to access all features at no cost!
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <p className="text-center text-sm text-muted-foreground">
              Sign up with the Pro plan and use promo code at checkout for 100% off.
            </p>
            <Link href="/signup?tier=pro">
              <Button 
                className="w-full h-12 text-lg font-bold bg-secondary text-secondary-foreground hover:bg-secondary/90"
                onClick={() => setShowPromoPopup(false)}
                data-testid="button-promo-ok"
              >
                OK - Go to Pro Plan
              </Button>
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FeatureCard({ icon, title, description, onClick }: { icon: React.ReactNode, title: string, description: string, onClick?: () => void }) {
  return (
    <div 
      className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300 group cursor-pointer"
      onClick={onClick}
      data-testid={`feature-card-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="mb-6 p-4 rounded-lg bg-primary/5 w-fit group-hover:bg-primary/10 transition-colors">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-primary mb-3 font-serif">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

function PricingFeature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
      <span className="text-muted-foreground">{children}</span>
    </li>
  );
}
