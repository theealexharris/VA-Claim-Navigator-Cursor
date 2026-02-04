import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BookOpen, FileText, Search, Sparkles, Loader2, ExternalLink, Gavel } from "lucide-react";
import { useAIResearch } from "@/hooks/use-ai-research";
import { ScrollArea } from "@/components/ui/scroll-area";

const POPULAR_TOPICS = [
  "What are the 3 pillars of a VA claim?",
  "How does the PACT Act affect my claim?",
  "What is a nexus letter and do I need one?",
  "How do I prepare for a C&P exam?",
  "What are presumptive conditions?",
  "How is my combined rating calculated?",
];

const OFFICIAL_RESOURCES = [
  { title: "38 CFR § 3.303 - Service Connection", url: "https://www.ecfr.gov/current/title-38/chapter-I/part-3/subpart-A/subject-group-ECFRf5c489e35b5a5da/section-3.303", desc: "Principles of service connection" },
  { title: "38 CFR § 3.310 - Secondary Conditions", url: "https://www.ecfr.gov/current/title-38/chapter-I/part-3/subpart-A/subject-group-ECFRf5c489e35b5a5da/section-3.310", desc: "Secondary service connection requirements" },
  { title: "38 CFR § 4.1 - Rating Principles", url: "https://www.ecfr.gov/current/title-38/chapter-I/part-4/subpart-A/section-4.1", desc: "How VA rates disabilities" },
  { title: "VA Form 21-4138 (Lay Statement)", url: "https://www.va.gov/find-forms/about-form-21-4138/", desc: "Statement in support of claim form" },
  { title: "VA C&P Exam Information", url: "https://www.va.gov/disability/va-claim-exam/", desc: "Official exam preparation guide" },
  { title: "PACT Act Information", url: "https://www.va.gov/resources/the-pact-act-and-your-va-benefits/", desc: "Presumptive conditions and eligibility" },
];

export default function Education() {
  const [searchQuery, setSearchQuery] = useState("");
  const { messages, sendMessage, isLoading, clearMessages } = useAIResearch("education_library");
  const [showResults, setShowResults] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      clearMessages();
      sendMessage(searchQuery.trim());
      setShowResults(true);
    }
  };

  const handleTopicClick = (topic: string) => {
    setSearchQuery(topic);
    clearMessages();
    sendMessage(topic);
    setShowResults(true);
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-secondary" /> Education Library
          </h1>
          <p className="text-muted-foreground">
            Master the VA process with AI-powered research based on 38 CFR regulations, official VA resources, and video guides.
          </p>
        </div>

        <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-none">
          <CardContent className="pt-6">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-xl font-bold text-primary text-center mb-2">
                <Sparkles className="inline h-5 w-5 mr-2 text-secondary" />
                AI-Powered Research
              </h2>
              <p className="text-center text-muted-foreground mb-4">
                Ask any question about VA disability claims and get instant, detailed answers based on 38 CFR.
              </p>
              <form onSubmit={handleSearch} className="flex gap-2">
                <Input
                  placeholder="Search for any VA claims topic..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-white"
                  data-testid="input-search"
                />
                <Button
                  type="submit"
                  disabled={isLoading || !searchQuery.trim()}
                  className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
                  data-testid="button-search"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </form>
              <div className="flex flex-wrap gap-2 mt-4 justify-center">
                {POPULAR_TOPICS.slice(0, 4).map((topic, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    className="text-xs bg-white/80"
                    onClick={() => handleTopicClick(topic)}
                    disabled={isLoading}
                  >
                    {topic}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {showResults && messages.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-secondary" />
                AI Research Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-4">
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-lg ${
                        msg.role === "user"
                          ? "bg-primary text-white font-medium"
                          : "bg-gray-50 border"
                      }`}
                    >
                      {msg.role === "assistant" && (
                        <p className="text-xs font-bold text-secondary mb-2">AI Research (Based on 38 CFR)</p>
                      )}
                      <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                    </div>
                  ))}

                  {isLoading && (
                    <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-lg">
                      <Loader2 className="h-4 w-4 animate-spin text-secondary" />
                      <span className="text-sm text-muted-foreground">Researching 38 CFR regulations...</span>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gavel className="h-5 w-5 text-primary" />
              Official 38 CFR Resources
            </CardTitle>
            <CardDescription>
              Direct links to the Code of Federal Regulations and VA official guidance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {OFFICIAL_RESOURCES.map((resource, idx) => (
                <a
                  key={idx}
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <FileText className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm group-hover:text-secondary transition-colors truncate">
                      {resource.title}
                    </p>
                    <p className="text-xs text-muted-foreground">{resource.desc}</p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </a>
              ))}
            </div>
          </CardContent>
        </Card>

      </div>
    </DashboardLayout>
  );
}
