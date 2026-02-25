import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { apiUrl } from "@/lib/api-helpers";
import { Gift, Users, DollarSign, Copy, CheckCircle, Share2, ArrowLeft, Mail, Trash2 } from "lucide-react";

interface Referral {
  id: string;
  referralCode: string;
  referredEmail: string | null;
  referredUserId: string | null;
  status: "pending" | "registered" | "claimed_filed" | "rewarded";
  rewardAmount: number;
  createdAt: string;
  convertedAt: string | null;
}

interface ReferralStats {
  total: number;
  converted: number;
  rewards: number;
}

export default function ReferralProgram() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [emailToInvite, setEmailToInvite] = useState("");

  const { data: referrals = [], isLoading: referralsLoading } = useQuery<Referral[]>({
    queryKey: ["/api/referrals"],
    enabled: !!user,
  });

  const { data: stats } = useQuery<ReferralStats>({
    queryKey: ["/api/referrals/stats"],
    enabled: !!user,
  });

  const createReferralMutation = useMutation({
    mutationFn: async (referredEmail?: string) => {
      const res = await fetch(apiUrl("/api/referrals"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ referredEmail }),
      });
      if (!res.ok) throw new Error("Failed to create referral");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/referrals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/referrals/stats"] });
      setEmailToInvite("");
      toast({
        title: "Referral Link Created",
        description: "Your unique referral link has been generated.",
      });
    },
  });

  const copyToClipboard = async (code: string) => {
    const referralUrl = `${window.location.origin}/signup?ref=${code}`;
    await navigator.clipboard.writeText(referralUrl);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    toast({
      title: "Copied!",
      description: "Referral link copied to clipboard.",
    });
  };

  const deleteReferral = async (id: string) => {
    try {
      const res = await fetch(apiUrl(`/api/referrals/${id}`), {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete referral");
      queryClient.invalidateQueries({ queryKey: ["/api/referrals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/referrals/stats"] });
      toast({
        title: "Referral Deleted",
        description: "The referral has been removed.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete referral.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" data-testid="badge-status-pending">Pending</Badge>;
      case "registered":
        return <Badge className="bg-blue-500" data-testid="badge-status-registered">Signed Up</Badge>;
      case "claimed_filed":
        return <Badge className="bg-green-500" data-testid="badge-status-claimed">Claim Filed</Badge>;
      case "rewarded":
        return <Badge className="bg-yellow-500" data-testid="badge-status-rewarded">Rewarded</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <Link href="/dashboard">
          <Button variant="ghost" className="mb-6" data-testid="button-back-dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-serif font-bold text-primary mb-2">Veteran Referral Program</h1>
          <p className="text-muted-foreground text-lg">
            Help fellow veterans get the benefits they've earned. Share your referral link and earn rewards when they file their claim.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card data-testid="card-total-referrals">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Referrals</p>
                  <p className="text-3xl font-bold text-primary" data-testid="text-total-referrals">{stats?.total || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-converted">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Converted</p>
                  <p className="text-3xl font-bold text-green-600" data-testid="text-converted">{stats?.converted || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-rewards">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Rewards Earned</p>
                  <p className="text-3xl font-bold text-yellow-600" data-testid="text-rewards">${stats?.rewards || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="h-5 w-5" />
                Create Referral Link
              </CardTitle>
              <CardDescription>
                Generate a unique link to share with fellow veterans. You'll earn rewards when they sign up and file their claim.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Friend's email (optional)"
                  type="email"
                  value={emailToInvite}
                  onChange={(e) => setEmailToInvite(e.target.value)}
                  data-testid="input-referral-email"
                />
                <Button
                  onClick={() => createReferralMutation.mutate(emailToInvite || undefined)}
                  disabled={createReferralMutation.isPending}
                  data-testid="button-create-referral"
                >
                  <Gift className="h-4 w-4 mr-2" />
                  Create Link
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Optionally enter their email to track who you've invited.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-primary/5 to-secondary/5">
            <CardHeader>
              <CardTitle>How It Works</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0 font-bold">1</div>
                  <div>
                    <p className="font-medium">Share Your Link</p>
                    <p className="text-sm text-muted-foreground">Send your unique referral link to fellow veterans who need help with their VA claims.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0 font-bold">2</div>
                  <div>
                    <p className="font-medium">They Sign Up</p>
                    <p className="text-sm text-muted-foreground">When they create an account using your link, they're connected to you.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0 font-bold">3</div>
                  <div>
                    <p className="font-medium">Earn Rewards</p>
                    <p className="text-sm text-muted-foreground">When they file their claim, you'll both receive rewards as a thank you.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Your Referrals</CardTitle>
            <CardDescription>Track all the veterans you've referred to the platform.</CardDescription>
          </CardHeader>
          <CardContent>
            {referralsLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading referrals...</div>
            ) : referrals.length === 0 ? (
              <div className="text-center py-12">
                <Gift className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No referrals yet</h3>
                <p className="text-muted-foreground mb-4">Create your first referral link above and start helping fellow veterans.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {referrals.map((referral) => (
                  <div
                    key={referral.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    data-testid={`referral-row-${referral.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        {referral.referredEmail ? (
                          <Mail className="h-5 w-5 text-primary" />
                        ) : (
                          <Users className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">
                          {referral.referredEmail || "Anonymous Referral"}
                        </p>
                        <p className="text-sm text-muted-foreground font-mono">
                          Code: {referral.referralCode}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {getStatusBadge(referral.status)}
                      {referral.rewardAmount > 0 && (
                        <span className="text-green-600 font-medium">${referral.rewardAmount}</span>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(referral.referralCode)}
                        data-testid={`button-copy-${referral.id}`}
                      >
                        {copiedCode === referral.referralCode ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteReferral(referral.id)}
                        data-testid={`button-delete-${referral.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
