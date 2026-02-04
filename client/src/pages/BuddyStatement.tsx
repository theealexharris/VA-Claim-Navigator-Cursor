import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Users, Send, Copy, Sparkles, Loader2, CheckCircle, User, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useBuddyStatementGenerator, useAIResearch } from "@/hooks/use-ai-research";
import { useToast } from "@/hooks/use-toast";

export default function BuddyStatement() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [buddyName, setBuddyName] = useState("");
  const [buddyEmail, setBuddyEmail] = useState("");
  const [relationship, setRelationship] = useState("");
  const [conditionName, setConditionName] = useState("");
  const [observedSymptoms, setObservedSymptoms] = useState("");
  const [generatedTemplate, setGeneratedTemplate] = useState("");
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

  const generator = useBuddyStatementGenerator();
  const { messages, sendMessage, isLoading: aiLoading } = useAIResearch("buddy_statement");

  const handleGenerate = async () => {
    if (!conditionName || !relationship || !observedSymptoms) {
      toast({
        title: "Missing Information",
        description: "Please fill in condition, relationship, and observed symptoms.",
        variant: "destructive",
      });
      return;
    }

    generator.mutate(
      { conditionName, relationship, observedSymptoms },
      {
        onSuccess: (data) => {
          setGeneratedTemplate(data.template);
          toast({
            title: "Template Generated",
            description: "Your buddy statement template is ready to share.",
          });
        },
      }
    );
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(generatedTemplate);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied to clipboard" });
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary flex items-center gap-3">
            <Users className="h-8 w-8 text-secondary" /> Buddy Statement Generator
          </h1>
          <p className="text-muted-foreground">
            Request supporting statements from people who know about your condition, with AI-powered templates.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-secondary" />
                  AI Template Generator
                </CardTitle>
                <CardDescription>
                  Generate a customized template your buddy can use as a starting point.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Their Name</Label>
                    <Input
                      placeholder="Jane Doe"
                      value={buddyName}
                      onChange={(e) => setBuddyName(e.target.value)}
                      data-testid="input-buddy-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Their Email</Label>
                    <Input
                      placeholder="jane@example.com"
                      type="email"
                      value={buddyEmail}
                      onChange={(e) => setBuddyEmail(e.target.value)}
                      data-testid="input-buddy-email"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Relationship to You</Label>
                  <Input
                    placeholder="e.g., Spouse, Platoon Leader, Co-worker, Fellow service member"
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                    data-testid="input-relationship"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Condition They Should Write About</Label>
                  <Input
                    placeholder="e.g., PTSD, Tinnitus, Back Pain"
                    value={conditionName}
                    onChange={(e) => setConditionName(e.target.value)}
                    data-testid="input-condition"
                  />
                </div>
                <div className="space-y-2">
                  <Label>What Symptoms Have They Observed?</Label>
                  <Textarea
                    placeholder="Describe specific behaviors, changes, or symptoms they've witnessed..."
                    value={observedSymptoms}
                    onChange={(e) => setObservedSymptoms(e.target.value)}
                    rows={3}
                    data-testid="input-observed-symptoms"
                  />
                </div>
                <Button
                  onClick={handleGenerate}
                  disabled={generator.isPending}
                  className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
                  data-testid="button-generate-template"
                >
                  {generator.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Template
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {generatedTemplate && (
              <Card>
                <CardHeader>
                  <CardTitle>Generated Template</CardTitle>
                  <CardDescription>
                    Share this with your buddy as a starting point. They should personalize it with their own words.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    className="min-h-[300px] font-serif text-sm leading-relaxed"
                    value={generatedTemplate}
                    onChange={(e) => setGeneratedTemplate(e.target.value)}
                    data-testid="textarea-template"
                  />
                  <div className="flex gap-4">
                    <Button onClick={copyToClipboard} data-testid="button-copy-template">
                      {copied ? (
                        <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="mr-2 h-4 w-4" />
                      )}
                      {copied ? "Copied!" : "Copy Template"}
                    </Button>
                    <Button variant="outline" data-testid="button-send-request">
                      <Send className="mr-2 h-4 w-4" /> Email to Buddy
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Pending Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg divide-y">
                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">Sgt. Bilko</p>
                      <p className="text-sm text-muted-foreground">
                        Sent: 2 days ago • Status:{" "}
                        <span className="text-amber-600 font-medium">Pending</span>
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      Resend
                    </Button>
                  </div>
                  <div className="p-4 flex items-center justify-between bg-green-50/50">
                    <div>
                      <p className="font-medium">Sarah Miller (Spouse)</p>
                      <p className="text-sm text-muted-foreground">
                        Sent: 5 days ago • Status:{" "}
                        <span className="text-green-600 font-medium">Completed</span>
                      </p>
                    </div>
                    <Button variant="secondary" size="sm">
                      View PDF
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="bg-gradient-to-br from-primary/5 to-secondary/5">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-secondary" />
                  AI Tips
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="text-muted-foreground">Get guidance on buddy statements:</p>
                <div className="space-y-2">
                  {[
                    "Who makes the best buddy statement witness?",
                    "What should a buddy statement include?",
                    "How long should a buddy statement be?",
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
                <CardTitle className="text-lg">What Makes a Good Buddy?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Fellow service members who served with you</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Spouse or family members who see daily impact</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Co-workers who notice work limitations</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Friends who've known you before/after service</span>
                </div>
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
              You must complete your Personal Information before using Buddy Statement Builder. This ensures the Navigator can build your claim properly.
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
