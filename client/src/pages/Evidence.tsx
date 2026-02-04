import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Upload, Lock, Filter, FolderOpen, User, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Evidence() {
  const [, setLocation] = useLocation();
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
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-serif font-bold text-primary flex items-center gap-3">
              <Lock className="h-8 w-8 text-secondary" /> Evidence Vault
            </h1>
            <p className="text-muted-foreground">Securely store and organize your medical records and supporting documents.</p>
          </div>
          <Button><Upload className="mr-2 h-4 w-4" /> Upload Document</Button>
        </div>

        <div className="grid md:grid-cols-4 gap-6">
          <Card className="md:col-span-1 h-fit">
            <CardContent className="pt-6 space-y-4">
              <Button variant="secondary" className="w-full justify-start font-medium">All Documents</Button>
              <Button variant="ghost" className="w-full justify-start text-muted-foreground">Service Records</Button>
              <Button variant="ghost" className="w-full justify-start text-muted-foreground">Private Medical</Button>
              <Button variant="ghost" className="w-full justify-start text-muted-foreground">VA Correspondence</Button>
              <Button variant="ghost" className="w-full justify-start text-muted-foreground">Lay Statements</Button>
            </CardContent>
          </Card>

          <Card className="md:col-span-3">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Files</CardTitle>
              <Button variant="outline" size="sm"><Filter className="mr-2 h-4 w-4" /> Filter</Button>
            </CardHeader>
            <CardContent>
              <div className="text-center py-16 border-2 border-dashed rounded-lg">
                <FolderOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium text-muted-foreground mb-2">No documents uploaded yet</p>
                <p className="text-sm text-muted-foreground mb-6">Upload your medical records, service documents, and supporting evidence to get started.</p>
                <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
                  <Upload className="mr-2 h-4 w-4" /> Upload Your First Document
                </Button>
              </div>
            </CardContent>
          </Card>
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
              You must complete your Personal Information before using Evidence Vault. This ensures the Navigator can build your claim properly.
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
