import { useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Clock, Shield, FileCheck, Star } from "lucide-react";

const CALENDLY_URL = "https://calendly.com/admindesk-vaclaimnavigator/30min";

export default function ConsultationBooking() {
  // Load the Calendly widget script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://assets.calendly.com/assets/external/widget.js";
    script.async = true;
    document.head.appendChild(script);

    return () => {
      // Clean up script on unmount
      const existing = document.querySelector('script[src="https://assets.calendly.com/assets/external/widget.js"]');
      if (existing) existing.remove();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <Link href="/">
          <Button variant="ghost" className="mb-6" data-testid="button-back-home">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-serif font-bold text-primary mb-3">
              Book Your Free Strategy Session
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Speak with a claims specialist to understand your options and develop a winning strategy for your VA disability claim.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Calendly Inline Widget */}
            <div className="lg:col-span-2">
              <div
                className="calendly-inline-widget rounded-xl overflow-hidden border bg-white shadow-sm"
                data-url={CALENDLY_URL}
                style={{ minWidth: "320px", height: "700px" }}
              />
            </div>

            {/* Sidebar Info */}
            <div className="space-y-6">
              <Card className="bg-gradient-to-br from-primary/5 to-secondary/5">
                <CardHeader>
                  <CardTitle className="text-lg">What to Expect</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">30-Minute Call</p>
                      <p className="text-xs text-muted-foreground">A focused session to assess your situation</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Personalized Strategy</p>
                      <p className="text-xs text-muted-foreground">Tailored advice for your specific conditions</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <FileCheck className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Evidence Guidance</p>
                      <p className="text-xs text-muted-foreground">Learn what documentation you'll need</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-1 text-yellow-500 mb-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <p className="text-sm italic mb-3">
                    "The consultation helped me understand exactly what I needed for my claim. I went from 30% to 70% within 6 months."
                  </p>
                  <p className="text-sm font-medium">&mdash; James T., Army Veteran</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
