import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Scale, AlertTriangle, FileText, Sparkles, Loader2, HelpCircle, ArrowRight, ExternalLink, BookOpen, Gavel, Clock, Users, User, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAIResearch } from "@/hooks/use-ai-research";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const SUPPLEMENTAL_QUESTIONS = [
  "What qualifies as 'new and relevant' evidence under 38 CFR 3.2501?",
  "How do I get a nexus letter for my supplemental claim?",
  "Can buddy statements help my supplemental claim?",
  "What's the timeline for a supplemental claim decision?",
];

const HLR_QUESTIONS = [
  "What errors can a Higher-Level Review correct?",
  "Should I request an informal conference for my HLR?",
  "What is 'duty to assist' error under 38 CFR 3.159?",
  "How long does a Higher-Level Review take in 2024?",
];

const BVA_QUESTIONS = [
  "Which BVA docket should I choose: Direct, Evidence, or Hearing?",
  "How do I request Advanced on Docket status?",
  "What happens at a Board hearing?",
  "What are realistic BVA wait times in 2024?",
  "Can I change my docket after filing?",
];

const OFFICIAL_LINKS = {
  supplemental: [
    { title: "VA Supplemental Claim Guide", url: "https://www.va.gov/decision-reviews/supplemental-claim/", desc: "Official VA guidance and filing instructions" },
    { title: "38 CFR § 3.2501", url: "https://www.ecfr.gov/current/title-38/chapter-I/part-3/subpart-D/subject-group-ECFR005f4054f4b08c3/section-3.2501", desc: "Full regulatory text for supplemental claims" },
    { title: "38 CFR § 3.159 (Duty to Assist)", url: "https://www.ecfr.gov/current/title-38/chapter-I/part-3/subpart-A/subject-group-ECFR7629a1b1e9bf6f8/section-3.159", desc: "VA's duty to help gather evidence" },
  ],
  hlr: [
    { title: "VA Higher-Level Review Guide", url: "https://www.va.gov/decision-reviews/higher-level-review/", desc: "Official VA guidance and filing instructions" },
    { title: "38 CFR § 3.2601", url: "https://www.ecfr.gov/current/title-38/chapter-I/part-3/subpart-D/subject-group-ECFR122cdab3741b05f/section-3.2601", desc: "Full regulatory text for higher-level review" },
    { title: "File HLR Online (VA Form 20-0996)", url: "https://www.va.gov/decision-reviews/higher-level-review/request-higher-level-review-form-20-0996/", desc: "Submit your Higher-Level Review request" },
  ],
  bva: [
    { title: "Board of Veterans' Appeals", url: "https://www.bva.va.gov/", desc: "Official BVA website and resources" },
    { title: "38 CFR Part 20 (Full Regulations)", url: "https://www.ecfr.gov/current/title-38/chapter-I/part-20", desc: "Complete BVA Rules of Practice" },
    { title: "38 CFR § 20.202 (NOD Requirements)", url: "https://www.law.cornell.edu/cfr/text/38/20.202", desc: "Notice of Disagreement filing rules" },
    { title: "VA Form 10182 (NOD)", url: "https://www.va.gov/decision-reviews/board-appeal/request-board-appeal-form-10182/", desc: "File your Board Appeal online" },
  ],
  general: [
    { title: "Choose a Decision Review Option", url: "https://www.va.gov/resources/choosing-a-decision-review-option/", desc: "Compare all three appeal lanes" },
    { title: "VA Decision Reviews Overview", url: "https://www.va.gov/decision-reviews/", desc: "Complete guide to the appeals process" },
  ],
};

const BVA_DOCKETS = [
  {
    name: "Direct Review",
    desc: "Fastest option - decision based solely on existing record",
    evidence: false,
    hearing: false,
    targetTime: "365 days",
    actualTime: "400-866 days",
    color: "green",
  },
  {
    name: "Evidence Submission",
    desc: "Submit new evidence within 90 days of filing",
    evidence: true,
    hearing: false,
    targetTime: ">365 days",
    actualTime: "1+ year",
    color: "blue",
  },
  {
    name: "Hearing",
    desc: "Testify before a Veterans Law Judge + submit evidence",
    evidence: true,
    hearing: true,
    targetTime: ">730 days",
    actualTime: "2+ years",
    color: "purple",
  },
];

export default function Appeals() {
  const [, setLocation] = useLocation();
  const { messages, sendMessage, isLoading, clearMessages } = useAIResearch("appeals_hub");
  const [activeTab, setActiveTab] = useState("supplemental");
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

  const handleAskQuestion = (question: string) => {
    clearMessages();
    sendMessage(question);
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary flex items-center gap-3">
            <Scale className="h-8 w-8 text-secondary" /> Appeals & Supplemental Claims
          </h1>
          <p className="text-muted-foreground">
            Fight for the rating you deserve with AI-powered research based on current 38 CFR regulations.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="supplemental" className="flex items-center gap-2 text-xs sm:text-sm">
              <AlertTriangle className="h-4 w-4" />
              <span className="hidden sm:inline">Supplemental</span> Claim
            </TabsTrigger>
            <TabsTrigger value="hlr" className="flex items-center gap-2 text-xs sm:text-sm">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Higher-Level</span> Review
            </TabsTrigger>
            <TabsTrigger value="bva" className="flex items-center gap-2 text-xs sm:text-sm">
              <Gavel className="h-4 w-4" />
              Board <span className="hidden sm:inline">of Appeals</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="supplemental" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card className="border-l-4 border-l-amber-500">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="text-amber-500" />
                      Supplemental Claim (38 CFR § 3.2501)
                    </CardTitle>
                    <CardDescription>
                      File when you have NEW and RELEVANT evidence for a previously denied claim.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-amber-50 rounded-lg p-4 space-y-3">
                      <h4 className="font-semibold text-amber-900">Key Requirements:</h4>
                      <ul className="text-sm text-amber-800 space-y-2">
                        <li className="flex items-start gap-2">
                          <span className="font-bold text-amber-600">•</span>
                          <span><strong>"New" Evidence:</strong> Information not previously part of the VA record</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="font-bold text-amber-600">•</span>
                          <span><strong>"Relevant" Evidence:</strong> Tends to prove or disprove a matter at issue</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="font-bold text-amber-600">•</span>
                          <span><strong>No Deadline:</strong> Can be filed anytime after VA decision</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="font-bold text-amber-600">•</span>
                          <span><strong>VA Duty to Assist:</strong> VA must help gather evidence you identify (38 CFR § 3.159)</span>
                        </li>
                      </ul>
                    </div>

                    <div className="bg-white border rounded-lg p-4">
                      <h4 className="font-semibold mb-2">Examples of New & Relevant Evidence:</h4>
                      <div className="grid sm:grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                          <BookOpen className="h-4 w-4 text-primary" />
                          New medical diagnosis or nexus letter
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                          <BookOpen className="h-4 w-4 text-primary" />
                          Buddy or lay statements
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                          <BookOpen className="h-4 w-4 text-primary" />
                          Private treatment records
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                          <BookOpen className="h-4 w-4 text-primary" />
                          PACT Act presumptive conditions
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">Average Processing Time</p>
                        <p className="text-sm text-muted-foreground">4-5 months (VA goal)</p>
                      </div>
                      <Button asChild>
                        <a href="https://www.va.gov/decision-reviews/supplemental-claim/" target="_blank" rel="noopener noreferrer">
                          File Now <ExternalLink className="ml-2 h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-secondary" />
                      AI Research Assistant
                    </CardTitle>
                    <CardDescription>
                      Get instant answers about supplemental claims based on 38 CFR regulations.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {SUPPLEMENTAL_QUESTIONS.map((q, idx) => (
                        <Button
                          key={idx}
                          variant="outline"
                          size="sm"
                          className="text-xs h-auto py-2 whitespace-normal text-left"
                          onClick={() => handleAskQuestion(q)}
                          disabled={isLoading}
                        >
                          {q}
                        </Button>
                      ))}
                    </div>

                    {messages.length > 0 && (
                      <ScrollArea className="h-[250px] border rounded-lg p-4">
                        <div className="space-y-3">
                          {messages.map((msg, idx) => (
                            <div
                              key={idx}
                              className={`p-3 rounded-lg text-sm ${
                                msg.role === "user" ? "bg-primary text-white" : "bg-gray-50"
                              }`}
                            >
                              {msg.role === "assistant" && (
                                <p className="text-xs font-bold text-secondary mb-1">AI Research</p>
                              )}
                              <div className="whitespace-pre-wrap">{msg.content}</div>
                            </div>
                          ))}
                          {isLoading && (
                            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span className="text-sm">Researching 38 CFR...</span>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Gavel className="h-4 w-4 text-primary" />
                      Official Resources
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {OFFICIAL_LINKS.supplemental.map((link, idx) => (
                      <a
                        key={idx}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-3 border rounded-lg hover:bg-gray-50 transition-colors group"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-sm group-hover:text-secondary transition-colors">
                              {link.title}
                            </p>
                            <p className="text-xs text-muted-foreground">{link.desc}</p>
                          </div>
                          <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        </div>
                      </a>
                    ))}
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200">
                  <CardContent className="pt-6">
                    <h4 className="font-bold text-amber-900 mb-2">When to File Supplemental</h4>
                    <ul className="text-sm text-amber-800 space-y-1">
                      <li>✓ You have new medical evidence</li>
                      <li>✓ You obtained a nexus letter</li>
                      <li>✓ New buddy statements available</li>
                      <li>✓ PACT Act applies to your condition</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="hlr" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card className="border-l-4 border-l-blue-500">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="text-blue-500" />
                      Higher-Level Review (38 CFR § 3.2601)
                    </CardTitle>
                    <CardDescription>
                      Request a senior VA adjudicator to review your case for errors - no new evidence allowed.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-blue-50 rounded-lg p-4 space-y-3">
                      <h4 className="font-semibold text-blue-900">Key Characteristics:</h4>
                      <ul className="text-sm text-blue-800 space-y-2">
                        <li className="flex items-start gap-2">
                          <span className="font-bold text-blue-600">•</span>
                          <span><strong>De Novo Review:</strong> Fresh look with no deference to prior decision</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="font-bold text-blue-600">•</span>
                          <span><strong>No New Evidence:</strong> Limited to evidence in original record</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="font-bold text-blue-600">•</span>
                          <span><strong>1 Year Deadline:</strong> Must file within 1 year of VA decision</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="font-bold text-blue-600">•</span>
                          <span><strong>Informal Conference:</strong> Optional phone call with reviewer</span>
                        </li>
                      </ul>
                    </div>

                    <div className="bg-white border rounded-lg p-4">
                      <h4 className="font-semibold mb-2">Types of Errors HLR Can Correct:</h4>
                      <div className="grid sm:grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                          <HelpCircle className="h-4 w-4 text-blue-500" />
                          Misapplication of law/regulation
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                          <HelpCircle className="h-4 w-4 text-blue-500" />
                          Misread existing evidence
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                          <HelpCircle className="h-4 w-4 text-blue-500" />
                          Duty-to-assist failures
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                          <HelpCircle className="h-4 w-4 text-blue-500" />
                          Difference of opinion on rating
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">Average Processing Time</p>
                        <p className="text-sm text-muted-foreground">4-8 months (VA goal: 125 days)</p>
                      </div>
                      <Button asChild>
                        <a href="https://www.va.gov/decision-reviews/higher-level-review/request-higher-level-review-form-20-0996/" target="_blank" rel="noopener noreferrer">
                          File HLR <ExternalLink className="ml-2 h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-secondary" />
                      AI Research Assistant
                    </CardTitle>
                    <CardDescription>
                      Get instant answers about Higher-Level Review based on 38 CFR regulations.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {HLR_QUESTIONS.map((q, idx) => (
                        <Button
                          key={idx}
                          variant="outline"
                          size="sm"
                          className="text-xs h-auto py-2 whitespace-normal text-left"
                          onClick={() => handleAskQuestion(q)}
                          disabled={isLoading}
                        >
                          {q}
                        </Button>
                      ))}
                    </div>

                    {messages.length > 0 && (
                      <ScrollArea className="h-[250px] border rounded-lg p-4">
                        <div className="space-y-3">
                          {messages.map((msg, idx) => (
                            <div
                              key={idx}
                              className={`p-3 rounded-lg text-sm ${
                                msg.role === "user" ? "bg-primary text-white" : "bg-gray-50"
                              }`}
                            >
                              {msg.role === "assistant" && (
                                <p className="text-xs font-bold text-secondary mb-1">AI Research</p>
                              )}
                              <div className="whitespace-pre-wrap">{msg.content}</div>
                            </div>
                          ))}
                          {isLoading && (
                            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span className="text-sm">Researching 38 CFR...</span>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Gavel className="h-4 w-4 text-primary" />
                      Official Resources
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {OFFICIAL_LINKS.hlr.map((link, idx) => (
                      <a
                        key={idx}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-3 border rounded-lg hover:bg-gray-50 transition-colors group"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-sm group-hover:text-secondary transition-colors">
                              {link.title}
                            </p>
                            <p className="text-xs text-muted-foreground">{link.desc}</p>
                          </div>
                          <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        </div>
                      </a>
                    ))}
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
                  <CardContent className="pt-6">
                    <h4 className="font-bold text-blue-900 mb-2">When to File HLR</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>✓ VA made an error in applying the law</li>
                      <li>✓ Evidence was misread or ignored</li>
                      <li>✓ You have no new evidence</li>
                      <li>✓ You want fastest decision</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="bg-red-50 border-red-200">
                  <CardContent className="pt-6">
                    <h4 className="font-bold text-red-900 mb-2">Pro Tips</h4>
                    <ul className="text-sm text-red-800 space-y-1">
                      <li>• Skip informal conference unless complex legal errors</li>
                      <li>• Submit written statement identifying VA errors</li>
                      <li>• Consider VSO representation</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="bva" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card className="border-l-4 border-l-purple-500">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Gavel className="text-purple-500" />
                      Board of Veterans Appeals (38 CFR Part 20)
                    </CardTitle>
                    <CardDescription>
                      Appeal directly to the Board of Veterans Appeals in Washington, D.C. for review by a Veterans Law Judge.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-purple-50 rounded-lg p-4 space-y-3">
                      <h4 className="font-semibold text-purple-900">Key Information:</h4>
                      <ul className="text-sm text-purple-800 space-y-2">
                        <li className="flex items-start gap-2">
                          <span className="font-bold text-purple-600">•</span>
                          <span><strong>Highest VA Review:</strong> Final decision within the VA system</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="font-bold text-purple-600">•</span>
                          <span><strong>Veterans Law Judge:</strong> Reviews your case independently from Regional Office</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="font-bold text-purple-600">•</span>
                          <span><strong>1 Year Deadline:</strong> File VA Form 10182 within 1 year of decision</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="font-bold text-purple-600">•</span>
                          <span><strong>Three Docket Options:</strong> Choose Direct, Evidence, or Hearing docket</span>
                        </li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-3">Choose Your Docket (38 CFR § 20.202):</h4>
                      <div className="space-y-3">
                        {BVA_DOCKETS.map((docket, idx) => (
                          <div
                            key={idx}
                            className={`p-4 border-l-4 rounded-lg ${
                              docket.color === "green"
                                ? "border-l-green-500 bg-green-50"
                                : docket.color === "blue"
                                ? "border-l-blue-500 bg-blue-50"
                                : "border-l-purple-500 bg-purple-50"
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <h5 className="font-bold">{docket.name}</h5>
                                <p className="text-sm text-muted-foreground">{docket.desc}</p>
                              </div>
                              <div className="text-right text-xs">
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  <span>{docket.actualTime}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-4 mt-2 text-xs">
                              <span className={docket.evidence ? "text-green-600" : "text-gray-400"}>
                                {docket.evidence ? "✓ New Evidence" : "✗ No Evidence"}
                              </span>
                              <span className={docket.hearing ? "text-green-600" : "text-gray-400"}>
                                {docket.hearing ? "✓ Hearing" : "✗ No Hearing"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white border rounded-lg p-4">
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <Users className="h-4 w-4 text-purple-500" />
                        Advanced on Docket (Priority Processing)
                      </h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        Request priority if you meet any of these criteria:
                      </p>
                      <div className="grid sm:grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                          Age 75 or older
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                          Serious or terminal illness
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                          Severe financial hardship
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                          Experiencing homelessness
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">Average Processing Time</p>
                        <p className="text-sm text-muted-foreground">1-3 years (varies by docket)</p>
                      </div>
                      <Button asChild>
                        <a href="https://www.va.gov/decision-reviews/board-appeal/request-board-appeal-form-10182/" target="_blank" rel="noopener noreferrer">
                          File Board Appeal <ExternalLink className="ml-2 h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-secondary" />
                      AI Research Assistant
                    </CardTitle>
                    <CardDescription>
                      Get instant answers about Board of Veterans Appeals based on 38 CFR Part 20.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {BVA_QUESTIONS.map((q, idx) => (
                        <Button
                          key={idx}
                          variant="outline"
                          size="sm"
                          className="text-xs h-auto py-2 whitespace-normal text-left"
                          onClick={() => handleAskQuestion(q)}
                          disabled={isLoading}
                        >
                          {q}
                        </Button>
                      ))}
                    </div>

                    {messages.length > 0 && (
                      <ScrollArea className="h-[250px] border rounded-lg p-4">
                        <div className="space-y-3">
                          {messages.map((msg, idx) => (
                            <div
                              key={idx}
                              className={`p-3 rounded-lg text-sm ${
                                msg.role === "user" ? "bg-primary text-white" : "bg-gray-50"
                              }`}
                            >
                              {msg.role === "assistant" && (
                                <p className="text-xs font-bold text-secondary mb-1">AI Research</p>
                              )}
                              <div className="whitespace-pre-wrap">{msg.content}</div>
                            </div>
                          ))}
                          {isLoading && (
                            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span className="text-sm">Researching 38 CFR Part 20...</span>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Gavel className="h-4 w-4 text-primary" />
                      Official Resources
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {OFFICIAL_LINKS.bva.map((link, idx) => (
                      <a
                        key={idx}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-3 border rounded-lg hover:bg-gray-50 transition-colors group"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-sm group-hover:text-secondary transition-colors">
                              {link.title}
                            </p>
                            <p className="text-xs text-muted-foreground">{link.desc}</p>
                          </div>
                          <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        </div>
                      </a>
                    ))}
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200">
                  <CardContent className="pt-6">
                    <h4 className="font-bold text-purple-900 mb-2">When to File Board Appeal</h4>
                    <ul className="text-sm text-purple-800 space-y-1">
                      <li>✓ Complex legal issues requiring judge review</li>
                      <li>✓ Want to testify about your case</li>
                      <li>✓ Other appeal options exhausted</li>
                      <li>✓ Need comprehensive de novo review</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="bg-amber-50 border-amber-200">
                  <CardContent className="pt-6">
                    <h4 className="font-bold text-amber-900 mb-2">BVA Decision Outcomes</h4>
                    <ul className="text-sm text-amber-800 space-y-1">
                      <li><strong>Grant:</strong> Benefits awarded</li>
                      <li><strong>Deny:</strong> Appeal to CAVC available</li>
                      <li><strong>Remand:</strong> Sent back for more development</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="bg-red-50 border-red-200">
                  <CardContent className="pt-6">
                    <h4 className="font-bold text-red-900 mb-2">Pro Tips</h4>
                    <ul className="text-sm text-red-800 space-y-1">
                      <li>• Direct Review is fastest if evidence is complete</li>
                      <li>• Request Advanced on Docket if eligible</li>
                      <li>• Consider accredited attorney for complex cases</li>
                      <li>• Can switch dockets within 1 year</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <Card className="bg-gradient-to-r from-primary/5 to-secondary/5">
          <CardContent className="pt-6">
            <h3 className="font-bold text-lg text-primary mb-4 flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              General Decision Review Resources
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {OFFICIAL_LINKS.general.map((link, idx) => (
                <a
                  key={idx}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 bg-white border rounded-lg hover:shadow-md transition-all group"
                >
                  <div>
                    <p className="font-medium group-hover:text-secondary transition-colors">{link.title}</p>
                    <p className="text-sm text-muted-foreground">{link.desc}</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-secondary transition-colors" />
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
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
              You must complete your Personal Information before using Appeals & Supplemental Claims. This ensures the Navigator can build your claim properly.
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
