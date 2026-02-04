import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Bot, Send, User, Loader2, Sparkles, MessageSquare, Lightbulb, Heart, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAIResearch } from "@/hooks/use-ai-research";

const QUICK_PROMPTS = [
  { icon: MessageSquare, text: "How do I describe my symptoms for a C&P exam?" },
  { icon: Lightbulb, text: "What evidence do I need for secondary connection?" },
  { icon: Heart, text: "I'm feeling overwhelmed with this process" },
];

export default function Coach() {
  const [, setLocation] = useLocation();
  const [input, setInput] = useState("");
  const { messages, sendMessage, isLoading } = useAIResearch("warrior_coach");
  const scrollRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      sendMessage(input.trim());
      setInput("");
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    if (!isLoading) {
      sendMessage(prompt);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto h-[calc(100vh-140px)] flex flex-col">
        <div className="mb-6">
          <h1 className="text-3xl font-serif font-bold text-primary flex items-center gap-3">
            <Bot className="h-8 w-8 text-secondary" /> Warrior AI Coach
          </h1>
          <p className="text-muted-foreground">Your personal guide for VA claim questions, mindset, and strategy.</p>
        </div>

        <Card className="flex-1 flex flex-col overflow-hidden shadow-lg border-primary/10">
          <ScrollArea className="flex-1 p-6" ref={scrollRef}>
            <div className="space-y-6">
              {messages.length === 0 ? (
                <>
                  <div className="flex gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center shrink-0">
                      <Bot className="h-6 w-6 text-white" />
                    </div>
                    <div className="bg-gray-100 rounded-2xl rounded-tl-none p-4 max-w-[80%] text-sm leading-relaxed">
                      <p className="font-bold text-primary mb-1">Coach</p>
                      <p>Hello! I'm your Warrior AI Coach, here to help you navigate your VA claim journey. I can:</p>
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>Answer questions about VA disability claims</li>
                        <li>Help you articulate your symptoms effectively</li>
                        <li>Explain complex regulations in plain language</li>
                        <li>Provide encouragement when the process gets frustrating</li>
                      </ul>
                      <p className="mt-2">What's on your mind today?</p>
                    </div>
                  </div>

                  <div className="mt-6">
                    <p className="text-sm text-muted-foreground mb-3">Quick questions to get started:</p>
                    <div className="flex flex-wrap gap-2">
                      {QUICK_PROMPTS.map((prompt, idx) => (
                        <Button
                          key={idx}
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => handleQuickPrompt(prompt.text)}
                          disabled={isLoading}
                          data-testid={`quick-prompt-${idx}`}
                        >
                          <prompt.icon className="h-3 w-3 mr-1" />
                          {prompt.text}
                        </Button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                messages.map((message, idx) => (
                  <div
                    key={idx}
                    className={`flex gap-4 ${message.role === "user" ? "flex-row-reverse" : ""}`}
                  >
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                        message.role === "user" ? "bg-secondary" : "bg-primary"
                      }`}
                    >
                      {message.role === "user" ? (
                        <User className="h-6 w-6 text-primary" />
                      ) : (
                        <Bot className="h-6 w-6 text-white" />
                      )}
                    </div>
                    <div
                      className={`rounded-2xl p-4 max-w-[80%] text-sm leading-relaxed ${
                        message.role === "user"
                          ? "bg-primary text-white rounded-tr-none"
                          : "bg-gray-100 rounded-tl-none"
                      }`}
                    >
                      {message.role === "assistant" && (
                        <p className="font-bold text-primary mb-1">Coach</p>
                      )}
                      <div className="whitespace-pre-wrap">{message.content}</div>
                    </div>
                  </div>
                ))
              )}

              {isLoading && (
                <div className="flex gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <Bot className="h-6 w-6 text-white" />
                  </div>
                  <div className="bg-gray-100 rounded-2xl rounded-tl-none p-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <CardFooter className="p-4 border-t bg-white">
            <form className="flex w-full gap-4" onSubmit={handleSubmit}>
              <Input
                placeholder="Ask about your claim..."
                className="flex-1"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
                data-testid="input-coach-message"
              />
              <Button
                type="submit"
                size="icon"
                className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
                disabled={!input.trim() || isLoading}
                data-testid="button-send-message"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </CardFooter>
        </Card>

        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="h-3 w-3" />
          <span>Powered by AI - responses are for guidance only, not legal or medical advice</span>
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
              You must complete your Personal Information before using Warrior AI Coach. This ensures the Navigator can build your claim properly.
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
