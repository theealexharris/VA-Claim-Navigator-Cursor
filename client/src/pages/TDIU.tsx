import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calculator, DollarSign, Briefcase, Sparkles, Loader2, CheckCircle, XCircle, HelpCircle, User, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAIResearch } from "@/hooks/use-ai-research";
import { ScrollArea } from "@/components/ui/scroll-area";

const TDIU_QUESTIONS = [
  "What is TDIU and how is it different from 100% schedular?",
  "How do I prove I can't work due to my disabilities?",
  "Can I work part-time and still qualify for TDIU?",
  "What evidence do I need for a TDIU claim?",
  "What if I don't meet the schedular requirements?",
];

export default function TDIU() {
  const [, setLocation] = useLocation();
  const { messages, sendMessage, isLoading } = useAIResearch("tdiu_calculator");
  const [showChat, setShowChat] = useState(false);
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const [showProfileRequiredDialog, setShowProfileRequiredDialog] = useState(false);

  useEffect(() => {
    const savedProfile = localStorage.getItem("userProfile");
    if (savedProfile) {
      const profile = JSON.parse(savedProfile);
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
  }, []);

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary flex items-center gap-3">
            <Calculator className="h-8 w-8 text-secondary" /> TDIU Calculator & Builder
          </h1>
          <p className="text-muted-foreground">
            Total Disability Individual Unemployability (TDIU) assessment tool with AI guidance.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Eligibility Check</CardTitle>
              <CardDescription>
                See if you qualify for TDIU benefits based on your current ratings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                  <CheckCircle className="h-6 w-6 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-green-800">Schedular TDIU Criteria</h3>
                    <p className="text-sm text-green-700 mt-1">
                      You meet the basic rating requirement: One disability at 60%+ OR combined 70% with one at 40%+.
                    </p>
                    <div className="mt-2 text-sm font-medium text-green-600">
                      Your Status: Meets Criteria (70% Combined)
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <HelpCircle className="h-6 w-6 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-amber-800">Employment Impact Assessment</h3>
                    <p className="text-sm text-amber-700 mt-1">
                      You must demonstrate that your service-connected disabilities prevent you from maintaining
                      "substantially gainful employment."
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 border-amber-300 text-amber-800 hover:bg-amber-100"
                      data-testid="button-start-assessment"
                    >
                      Start Employment Assessment
                    </Button>
                  </div>
                </div>

                
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="bg-primary text-primary-foreground">
              <CardHeader>
                <CardTitle className="text-secondary">Potential Benefit</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center space-y-2">
                  <p className="text-sm opacity-80">With TDIU, you could be paid at the</p>
                  <div className="text-5xl font-bold text-white">100%</div>
                  <p className="text-sm opacity-80">rate even if your combined rating is lower.</p>
                  <div className="pt-4 border-t border-white/10 mt-4">
                    <div className="flex items-center justify-center gap-2 text-3xl font-bold text-secondary">
                      <DollarSign className="h-7 w-7" /> 3,737.85
                    </div>
                    <p className="text-xs opacity-60 mt-1">Est. Monthly (Veteran Alone)</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-secondary/10 to-secondary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-secondary" />
                  AI TDIU Advisor
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4">
                <p className="text-sm text-muted-foreground mb-3">
                  Get instant answers about TDIU eligibility:
                </p>
                <div className="space-y-2">
                  {TDIU_QUESTIONS.slice(0, 3).map((question, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      className="w-full text-left text-xs h-auto py-2 px-3 whitespace-normal break-words leading-relaxed"
                      onClick={() => {
                        setShowChat(true);
                        sendMessage(question);
                      }}
                      disabled={isLoading}
                      data-testid={`tdiu-question-${idx}`}
                    >
                      <span className="block">{question}</span>
                    </Button>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-2 text-xs"
                  onClick={() => setShowChat(!showChat)}
                >
                  {showChat ? "Hide Chat" : "Show More Questions"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {showChat && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-secondary" />
                TDIU AI Advisor
              </CardTitle>
              <CardDescription>Ask any questions about TDIU eligibility and requirements.</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground mb-4">
                        Click a question above or ask your own about TDIU.
                      </p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {TDIU_QUESTIONS.map((q, idx) => (
                          <Button
                            key={idx}
                            variant="outline"
                            size="sm"
                            onClick={() => sendMessage(q)}
                            disabled={isLoading}
                            className="text-xs"
                          >
                            {q}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    messages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg ${
                          msg.role === "user"
                            ? "bg-primary text-white ml-8"
                            : "bg-gray-100 mr-8"
                        }`}
                      >
                        {msg.role === "assistant" && (
                          <p className="text-xs font-bold text-primary mb-1">AI Advisor</p>
                        )}
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    ))
                  )}

                  {isLoading && (
                    <div className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg mr-8">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">Analyzing...</span>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={showProfileRequiredDialog} onOpenChange={(open) => {
        if (!open && !isProfileComplete) {
          setLocation("/dashboard/profile");
        }
        setShowProfileRequiredDialog(open);
      }}>
        <DialogContent className="border-2 border-amber-500" data-testid="dialog-profile-required">
          <DialogHeader>
            <DialogTitle className="text-xl text-amber-600 flex items-center gap-2">
              <User className="h-6 w-6" /> Complete Your Profile First
            </DialogTitle>
            <DialogDescription className="text-base pt-2">
              You must complete your Personal Information before using TDIU Calculator. This ensures the Navigator can build your claim properly.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end pt-4">
            <Button 
              onClick={() => setLocation("/dashboard/profile")} 
              className="bg-amber-600 hover:bg-amber-700"
            >
              Go to My Profile <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
