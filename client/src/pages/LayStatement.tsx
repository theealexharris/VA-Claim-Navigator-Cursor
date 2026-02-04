import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PenTool, Download, Save, Sparkles, Loader2, Copy, CheckCircle, User, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLayStatementGenerator, useAIResearch } from "@/hooks/use-ai-research";
import { useToast } from "@/hooks/use-toast";

export default function LayStatement() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [statement, setStatement] = useState("");
  const [conditionName, setConditionName] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [dailyImpact, setDailyImpact] = useState("");
  const [serviceConnection, setServiceConnection] = useState("");
  const [copied, setCopied] = useState(false);
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const [showProfileRequiredDialog, setShowProfileRequiredDialog] = useState(false);

  // Check if profile is complete on load
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

  const generator = useLayStatementGenerator();
  const { messages, sendMessage, isLoading: aiLoading } = useAIResearch("lay_statement");

  const handleGenerate = async () => {
    if (!conditionName || !symptoms || !dailyImpact || !serviceConnection) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields to generate your statement.",
        variant: "destructive",
      });
      return;
    }

    generator.mutate(
      {
        conditionName,
        symptoms: symptoms.split(",").map((s) => s.trim()),
        dailyImpact,
        serviceConnection,
      },
      {
        onSuccess: (data) => {
          setStatement(data.draft);
          toast({
            title: "Statement Generated",
            description: "Your lay statement draft is ready. Feel free to personalize it.",
          });
        },
      }
    );
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(statement);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied to clipboard" });
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary flex items-center gap-3">
            <PenTool className="h-8 w-8 text-secondary" /> Lay Statement Builder
          </h1>
          <p className="text-muted-foreground">
            Craft a compelling personal statement (VA Form 21-4138) to support your claim with AI assistance.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-secondary" />
                  AI Statement Generator
                </CardTitle>
                <CardDescription>
                  Fill in the details below and our AI will help draft a compelling statement for you.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="condition">Condition Name</Label>
                    <Input
                      id="condition"
                      placeholder="e.g., Tinnitus, PTSD, Back Pain"
                      value={conditionName}
                      onChange={(e) => setConditionName(e.target.value)}
                      data-testid="input-condition-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="symptoms">Key Symptoms (comma-separated)</Label>
                    <Input
                      id="symptoms"
                      placeholder="e.g., ringing, difficulty hearing, headaches"
                      value={symptoms}
                      onChange={(e) => setSymptoms(e.target.value)}
                      data-testid="input-symptoms"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="impact">How does this affect your daily life?</Label>
                  <Textarea
                    id="impact"
                    placeholder="Describe how this condition impacts your work, sleep, relationships, hobbies..."
                    value={dailyImpact}
                    onChange={(e) => setDailyImpact(e.target.value)}
                    rows={3}
                    data-testid="input-daily-impact"
                  />
                </div>

                <div>
                  <Label htmlFor="connection">How is it connected to your military service?</Label>
                  <Textarea
                    id="connection"
                    placeholder="Describe the in-service event, exposure, or activity that caused or worsened this condition..."
                    value={serviceConnection}
                    onChange={(e) => setServiceConnection(e.target.value)}
                    rows={3}
                    data-testid="input-service-connection"
                  />
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={generator.isPending}
                  className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
                  data-testid="button-generate-statement"
                >
                  {generator.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Statement
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Your Statement</CardTitle>
                <CardDescription>
                  Review and personalize the AI-generated draft or write your own from scratch.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  className="min-h-[400px] font-serif text-base leading-relaxed p-6"
                  placeholder="Your lay statement will appear here after generation, or start writing your own..."
                  value={statement}
                  onChange={(e) => setStatement(e.target.value)}
                  data-testid="textarea-statement"
                />
                <div className="flex gap-4">
                  <Button data-testid="button-save-draft">
                    <Save className="mr-2 h-4 w-4" /> Save Draft
                  </Button>
                  <Button variant="outline" data-testid="button-export-pdf">
                    <Download className="mr-2 h-4 w-4" /> Export to PDF
                  </Button>
                  {statement && (
                    <Button variant="outline" onClick={copyToClipboard} data-testid="button-copy">
                      {copied ? (
                        <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="mr-2 h-4 w-4" />
                      )}
                      {copied ? "Copied!" : "Copy"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="bg-gradient-to-br from-primary/5 to-secondary/5">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-secondary" />
                  AI Writing Tips
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="text-muted-foreground">Ask our AI for personalized guidance:</p>
                <div className="space-y-2">
                  {[
                    "How do I describe chronic pain effectively?",
                    "What details should I include about sleep problems?",
                    "How specific should I be about dates?",
                  ].map((prompt, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-xs h-auto py-2 px-3"
                      onClick={() => sendMessage(prompt)}
                      disabled={aiLoading}
                    >
                      {prompt}
                    </Button>
                  ))}
                </div>

                {messages.length > 0 && (
                  <div className="mt-4 p-3 bg-white rounded-lg border text-xs">
                    <p className="font-medium text-primary mb-1">AI Response:</p>
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {messages[messages.length - 1]?.content}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Key Points to Include</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  "Date of onset / first symptoms",
                  "Specific incident in service",
                  "Current frequency of symptoms",
                  "Impact on sleep",
                  "Impact on work focus",
                  "Impact on relationships",
                ].map((point, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-sm">
                    <div className="min-w-4 h-4 rounded-full border-2 border-gray-300 mt-0.5"></div>
                    <span>{point}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
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
              You must complete your Personal Information before using Lay Statement Builder. This ensures the Navigator can build your claim properly.
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
