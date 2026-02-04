import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { DashboardLayout, getWorkflowProgress } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Pencil, X, Check, Loader2, CheckCircle2, ChevronLeft, AlertCircle, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getMedicalConditions, createMedicalCondition, deleteMedicalCondition } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Condition {
  id: string;
  name: string;
  diagnosedDate: string;
  doctor: string;
  facility: string;
}

interface Provider {
  id: string;
  name: string;
  specialty: string;
  address: string;
  phone: string;
}

export default function MedicalHistory() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);
  const [showAddCondition, setShowAddCondition] = useState(false);
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [showServiceConnectedWarning, setShowServiceConnectedWarning] = useState(false);
  const [isServiceConnected, setIsServiceConnected] = useState<string>("");
  const [serviceConnectedPercentage, setServiceConnectedPercentage] = useState<string>("");
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const [showProfileRequiredDialog, setShowProfileRequiredDialog] = useState(false);

  // Route guard: Check workflow progress
  useEffect(() => {
    const progress = getWorkflowProgress();
    if (!progress.canAccessMedicalConditions) {
      if (!progress.canAccessServiceHistory) {
        toast({
          title: "Complete Personal Info First",
          description: "Please complete all previous steps before accessing Medical Conditions.",
          variant: "destructive",
        });
        setLocation("/dashboard/profile");
      } else {
        toast({
          title: "Complete Service History First",
          description: "Please save your service history before accessing Medical Conditions.",
          variant: "destructive",
        });
        setLocation("/dashboard/service-history");
      }
    }
  }, []);

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
  
  const [conditions, setConditions] = useState<Condition[]>([]);
  
  const [providers, setProviders] = useState<Provider[]>([]);
  
  const [newCondition, setNewCondition] = useState<Omit<Condition, 'id'>>({
    name: "", diagnosedDate: "", doctor: "", facility: ""
  });
  
  const [newProvider, setNewProvider] = useState<Omit<Provider, 'id'>>({
    name: "", specialty: "", address: "", phone: ""
  });
  
  const [diagnosedDateError, setDiagnosedDateError] = useState<string>("");
  const [showDateErrorDialog, setShowDateErrorDialog] = useState(false);
  const [showMissingConditionsPopup, setShowMissingConditionsPopup] = useState(false);
  const [showVagueExplanationPopup, setShowVagueExplanationPopup] = useState(false);

  const parseMonthYear = (value: string): { month: number; year: number } | null => {
    const match = value.match(/^(\d{2})\/(\d{4})$/);
    if (!match) return null;
    const month = parseInt(match[1], 10);
    const year = parseInt(match[2], 10);
    if (month < 1 || month > 12) return null;
    if (year < 1940 || year > new Date().getFullYear()) return null;
    return { month, year };
  };

  const formatMonthYearInput = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}/${digits.slice(2, 6)}`;
  };

  const formatPhoneNumber = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };

  const handleDiagnosedDateChange = (value: string) => {
    const formatted = formatMonthYearInput(value);
    setNewCondition({ ...newCondition, diagnosedDate: formatted });
    
    // Only validate when complete (7 chars = MM/YYYY)
    if (formatted.length === 7) {
      const parsed = parseMonthYear(formatted);
      if (!parsed) {
        setDiagnosedDateError("date is incorrect.");
        setShowDateErrorDialog(true);
      } else {
        setDiagnosedDateError("");
      }
    } else {
      setDiagnosedDateError("");
    }
  };

  useEffect(() => {
    const loadMedicalConditions = async () => {
      try {
        const data = await getMedicalConditions();
        if (data.length > 0) {
          const mapped = data.map((item: any) => ({
            id: item.id,
            name: item.conditionName || "",
            diagnosedDate: item.diagnosedDate ? new Date(item.diagnosedDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : "",
            doctor: item.provider || "",
            facility: item.notes || "",
          }));
          setConditions(mapped);
        } else {
          const savedConditions = localStorage.getItem("medicalConditions");
          if (savedConditions) setConditions(JSON.parse(savedConditions));
        }
      } catch (error) {
        console.error("Failed to load medical conditions from API:", error);
        const savedConditions = localStorage.getItem("medicalConditions");
        if (savedConditions) setConditions(JSON.parse(savedConditions));
      }
    };
    loadMedicalConditions();
    
    const savedProviders = localStorage.getItem("medicalProviders");
    const savedServiceConnected = localStorage.getItem("serviceConnected");
    const savedPercentage = localStorage.getItem("serviceConnectedPercentage");
    if (savedProviders) setProviders(JSON.parse(savedProviders));
    if (savedServiceConnected) setIsServiceConnected(savedServiceConnected);
    if (savedPercentage) setServiceConnectedPercentage(savedPercentage);
  }, []);

  const saveData = () => {
    localStorage.setItem("medicalConditions", JSON.stringify(conditions));
    localStorage.setItem("medicalProviders", JSON.stringify(providers));
    localStorage.setItem("serviceConnected", isServiceConnected);
    localStorage.setItem("serviceConnectedPercentage", serviceConnectedPercentage);
  };

  const capitalizeFirstLetter = (value: string): string => {
    if (!value) return value;
    return value.charAt(0).toUpperCase() + value.slice(1);
  };

  const handleAddConditionClick = () => {
    if (!isServiceConnected) {
      setShowServiceConnectedWarning(true);
      return;
    }
    setShowVagueExplanationPopup(true);
  };

  const handleVaguePopupOk = () => {
    setShowVagueExplanationPopup(false);
    setShowAddCondition(true);
  };

  const addCondition = () => {
    if (!newCondition.name) {
      toast({ title: "Error", description: "Please enter a condition name.", variant: "destructive" });
      return;
    }
    const condition: Condition = { ...newCondition, id: Date.now().toString() };
    setConditions([...conditions, condition]);
    setNewCondition({ name: "", diagnosedDate: "", doctor: "", facility: "" });
    setShowAddCondition(false);
    saveData();
    toast({ title: "Condition Added", description: `${condition.name} has been added.` });
  };

  const updateCondition = (id: string, updates: Partial<Condition>) => {
    setConditions(conditions.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const deleteCondition = (id: string) => {
    setConditions(conditions.filter(c => c.id !== id));
    saveData();
    toast({ title: "Condition Removed", description: "The condition has been deleted." });
  };

  const updateProvider = (id: string, updates: Partial<Provider>) => {
    setProviders(providers.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const addProvider = () => {
    if (!newProvider.name) {
      toast({ title: "Error", description: "Please enter a provider name.", variant: "destructive" });
      return;
    }
    const provider: Provider = { ...newProvider, id: Date.now().toString() };
    setProviders([...providers, provider]);
    setNewProvider({ name: "", specialty: "", address: "", phone: "" });
    setShowAddProvider(false);
    saveData();
    toast({ title: "Provider Added", description: `${provider.name} has been added.` });
  };

  const deleteProvider = (id: string) => {
    setProviders(providers.filter(p => p.id !== id));
    saveData();
    toast({ title: "Provider Removed", description: "The provider has been deleted." });
  };

  const handleSave = async () => {
    if (conditions.length === 0) {
      setShowMissingConditionsPopup(true);
      return;
    }
    
    setIsSaving(true);
    try {
      const existingData = await getMedicalConditions();
      for (const existing of existingData) {
        await deleteMedicalCondition(existing.id);
      }
      
      for (const condition of conditions) {
        const parseDate = (dateStr: string): Date | null => {
          if (!dateStr) return null;
          const parts = dateStr.split('/');
          if (parts.length === 3) {
            const [month, day, year] = parts;
            return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          }
          return null;
        };

        await createMedicalCondition({
          conditionName: condition.name,
          diagnosedDate: parseDate(condition.diagnosedDate) || null,
          provider: condition.doctor || null,
          notes: condition.facility || null,
        });
      }

      saveData();
      localStorage.setItem("medicalConditionsComplete", "true");
      window.dispatchEvent(new Event('workflowProgressUpdate'));
      toast({ title: "Changes Saved", description: "Your medical history has been saved to your account. Proceeding to Claim Builder." });
      setLocation("/dashboard/claim-builder");
    } catch (error) {
      console.error("Failed to save medical conditions:", error);
      toast({ title: "Error", description: "Failed to save. Please try again.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const isDataEnabled = isServiceConnected !== "";

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-serif font-bold text-primary">Medical History & Conditions</h1>
            <p className="text-lg text-muted-foreground">Track your diagnosed conditions and medical providers.</p>
          </div>
          <Button onClick={handleAddConditionClick} data-testid="button-add-condition">
            <Plus className="mr-2 h-4 w-4" /> Add Condition
          </Button>
        </div>

        {/* Service Connected Status */}
        <Card className="border-2 border-primary/30">
          <CardHeader>
            <CardTitle className="text-xl">Are You Currently Service Connected?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center">
              <Select 
                value={isServiceConnected} 
                onValueChange={(value) => {
                  setIsServiceConnected(value);
                  if (value !== "yes") setServiceConnectedPercentage("");
                }}
              >
                <SelectTrigger className={`w-64 text-base ${isServiceConnected ? "font-bold" : ""}`} data-testid="select-service-connected">
                  <SelectValue placeholder="Select an option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {isServiceConnected === "yes" && (
              <div className="flex justify-center">
                <div className="space-y-2">
                  <Label className="text-base text-center block">Current Rating Percentage</Label>
                  <Select 
                    value={serviceConnectedPercentage} 
                    onValueChange={setServiceConnectedPercentage}
                  >
                    <SelectTrigger className={`w-64 text-base ${serviceConnectedPercentage ? "font-bold" : ""}`} data-testid="select-rating-percentage">
                      <SelectValue placeholder="Select percentage" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10%</SelectItem>
                      <SelectItem value="20">20%</SelectItem>
                      <SelectItem value="30">30%</SelectItem>
                      <SelectItem value="40">40%</SelectItem>
                      <SelectItem value="50">50%</SelectItem>
                      <SelectItem value="60">60%</SelectItem>
                      <SelectItem value="70">70%</SelectItem>
                      <SelectItem value="80">80%</SelectItem>
                      <SelectItem value="90">90%</SelectItem>
                      <SelectItem value="100">100%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className={`grid gap-6 ${!isDataEnabled ? "opacity-50 pointer-events-none" : ""}`}>
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Current Diagnoses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {conditions.map((condition) => (
                  <div key={condition.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    {editingId === condition.id ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-sm">Condition Name</Label>
                            <Input 
                              value={condition.name}
                              onChange={(e) => updateCondition(condition.id, { name: e.target.value.toUpperCase() })}
                              placeholder="Condition name"
                              className={`uppercase ${condition.name ? "font-bold" : ""}`}
                            />
                          </div>
                          <div>
                            <Label className="text-sm">Diagnosed Date</Label>
                            <Input 
                              type="date"
                              value={condition.diagnosedDate}
                              onChange={(e) => updateCondition(condition.id, { diagnosedDate: e.target.value })}
                              className={condition.diagnosedDate ? "font-bold" : ""}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-sm">Doctor</Label>
                            <Input 
                              value={condition.doctor}
                              onChange={(e) => updateCondition(condition.id, { doctor: e.target.value })}
                              placeholder="Doctor name"
                              className={condition.doctor ? "font-bold" : ""}
                            />
                          </div>
                          <div>
                            <Label className="text-sm">Facility</Label>
                            <Input 
                              value={condition.facility}
                              onChange={(e) => updateCondition(condition.id, { facility: e.target.value })}
                              placeholder="Medical facility"
                              className={condition.facility ? "font-bold" : ""}
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => { setEditingId(null); saveData(); }}>
                            <Check className="h-3 w-3 mr-1" /> Save
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                            <X className="h-3 w-3 mr-1" /> Cancel
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive" 
                            onClick={() => deleteCondition(condition.id)}
                            className="ml-auto"
                          >
                            <Trash2 className="h-3 w-3 mr-1" /> Delete
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-primary text-lg">{condition.name}</h3>
                          <p className="text-base text-muted-foreground">
                            Diagnosed: {condition.diagnosedDate ? new Date(condition.diagnosedDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Unknown'}
                            {condition.doctor && ` • ${condition.doctor}`}
                            {condition.facility && ` (${condition.facility})`}
                          </p>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setEditingId(condition.id)}
                          data-testid={`button-edit-condition-${condition.id}`}
                        >
                          <Pencil className="h-3 w-3 mr-1" /> Edit
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
                {conditions.length === 0 && (
                  <p className="text-center text-muted-foreground py-4 text-base">No conditions added yet.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Private Medical Providers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {providers.map((provider) => (
                  <div key={provider.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    {editingProviderId === provider.id ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-sm">Provider Name</Label>
                            <Input 
                              value={provider.name}
                              onChange={(e) => updateProvider(provider.id, { name: capitalizeFirstLetter(e.target.value) })}
                              placeholder="Provider name"
                              className={provider.name ? "font-bold" : ""}
                            />
                          </div>
                          <div>
                            <Label className="text-sm">Specialty</Label>
                            <Input 
                              value={provider.specialty}
                              onChange={(e) => updateProvider(provider.id, { specialty: capitalizeFirstLetter(e.target.value) })}
                              placeholder="Specialty"
                              className={provider.specialty ? "font-bold" : ""}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-sm">Address</Label>
                            <Input 
                              value={provider.address}
                              onChange={(e) => updateProvider(provider.id, { address: e.target.value })}
                              placeholder="Address"
                              className={provider.address ? "font-bold" : ""}
                            />
                          </div>
                          <div>
                            <Label className="text-sm">Phone</Label>
                            <Input 
                              value={provider.phone}
                              onChange={(e) => updateProvider(provider.id, { phone: formatPhoneNumber(e.target.value) })}
                              placeholder="(555) 123-4567"
                              className={provider.phone ? "font-bold" : ""}
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => { setEditingProviderId(null); saveData(); }}>
                            <Check className="h-3 w-3 mr-1" /> Save
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingProviderId(null)}>
                            <X className="h-3 w-3 mr-1" /> Cancel
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive" 
                            onClick={() => deleteProvider(provider.id)}
                            className="ml-auto"
                          >
                            <Trash2 className="h-3 w-3 mr-1" /> Delete
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-primary text-lg">{provider.name}</h3>
                          <p className="text-base text-muted-foreground">
                            {provider.specialty && `${provider.specialty} • `}
                            {provider.address}
                            {provider.phone && ` • ${provider.phone}`}
                          </p>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setEditingProviderId(provider.id)}
                          data-testid={`button-edit-provider-${provider.id}`}
                        >
                          <Pencil className="h-3 w-3 mr-1" /> Edit
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
                <Button 
                  variant="outline" 
                  className="w-full border-dashed h-16 text-base"
                  onClick={() => setShowAddProvider(true)}
                  data-testid="button-add-provider"
                >
                  <Plus className="mr-2 h-4 w-4" /> Add Private Provider
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-between">
          <Link href="/dashboard/service-history">
            <Button variant="outline" data-testid="button-back-medical">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <Button onClick={handleSave} disabled={isSaving} data-testid="button-save-medical">
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Save All Changes
              </>
            )}
          </Button>
        </div>

        {/* Missing Conditions Popup */}
        <Dialog open={showMissingConditionsPopup} onOpenChange={setShowMissingConditionsPopup}>
          <DialogContent className="border-2 border-red-500" data-testid="dialog-missing-conditions">
            <DialogHeader>
              <DialogTitle className="text-xl text-red-600 flex items-center gap-2">
                <AlertCircle className="h-6 w-6" /> Medical Conditions Required
              </DialogTitle>
              <DialogDescription className="text-base pt-2 text-red-600 font-medium" data-testid="text-missing-conditions-message">
                Write "NONE," if no current medical records OR You Must Add Current Medical Conditions To Continue.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end pt-4">
              <Button onClick={() => setShowMissingConditionsPopup(false)} data-testid="button-close-missing-conditions">
                OK
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Service Connected Warning Dialog */}
        <Dialog open={showServiceConnectedWarning} onOpenChange={setShowServiceConnectedWarning}>
          <DialogContent className="border-2 border-red-500">
            <DialogHeader>
              <DialogTitle className="text-xl text-red-600 flex items-center gap-2">
                <AlertCircle className="h-6 w-6" /> Answer Required
              </DialogTitle>
              <DialogDescription className="text-base pt-2">
                You must answer the "Are you currently service connected" question before adding a condition.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end pt-4">
              <Button onClick={() => setShowServiceConnectedWarning(false)}>
                OK
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Condition Dialog */}
        <Dialog open={showAddCondition} onOpenChange={setShowAddCondition}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-xl">Add New Condition</DialogTitle>
              <DialogDescription className="text-base">Enter the details of your medical condition.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label className="text-base">Condition Name <span className="text-muted-foreground">(Explanation should be vague)</span></Label>
                <Input 
                  value={newCondition.name}
                  onChange={(e) => setNewCondition({ ...newCondition, name: e.target.value.toUpperCase() })}
                  placeholder="e.g., TINNITUS, PTSD, LOWER BACK PAIN"
                  className="text-base uppercase"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-base">Date Diagnosed (MM/YYYY)</Label>
                <Input 
                  type="text"
                  value={newCondition.diagnosedDate}
                  onChange={(e) => handleDiagnosedDateChange(e.target.value)}
                  placeholder="01/1990"
                  maxLength={7}
                  className={`text-base ${diagnosedDateError ? "border-2 border-red-500" : ""}`}
                  data-testid="input-diagnosed-date"
                />
                {diagnosedDateError && (
                  <span className="text-xs text-red-500">{diagnosedDateError}</span>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-base">Doctor Name / Provider Name (Optional)</Label>
                <Input 
                  value={newCondition.doctor}
                  onChange={(e) => setNewCondition({ ...newCondition, doctor: capitalizeFirstLetter(e.target.value) })}
                  placeholder="e.g., Dr. Smith"
                  className="text-base"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-base">Medical Facility (Optional)</Label>
                <Input 
                  value={newCondition.facility}
                  onChange={(e) => setNewCondition({ ...newCondition, facility: capitalizeFirstLetter(e.target.value) })}
                  placeholder="e.g., VA Medical Center, Active Duty Records"
                  className="text-base"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button onClick={addCondition} className="flex-1">Add Condition</Button>
                <Button variant="outline" onClick={() => setShowAddCondition(false)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Provider Dialog */}
        <Dialog open={showAddProvider} onOpenChange={setShowAddProvider}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-xl">Add Private Medical Provider</DialogTitle>
              <DialogDescription className="text-base">Enter the details of your private healthcare provider.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label className="text-base">Provider/Practice Name</Label>
                <Input 
                  value={newProvider.name}
                  onChange={(e) => setNewProvider({ ...newProvider, name: capitalizeFirstLetter(e.target.value) })}
                  placeholder="e.g., Dr. John Smith, ABC Medical Group"
                  className="text-base"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-base">Specialty (Optional)</Label>
                <Input 
                  value={newProvider.specialty}
                  onChange={(e) => setNewProvider({ ...newProvider, specialty: capitalizeFirstLetter(e.target.value) })}
                  placeholder="e.g., Orthopedics, Psychiatry"
                  className="text-base"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-base">Address (Optional)</Label>
                <Input 
                  value={newProvider.address}
                  onChange={(e) => setNewProvider({ ...newProvider, address: e.target.value })}
                  placeholder="Full address"
                  className="text-base"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-base">Phone (Optional)</Label>
                <Input 
                  value={newProvider.phone}
                  onChange={(e) => setNewProvider({ ...newProvider, phone: formatPhoneNumber(e.target.value) })}
                  placeholder="(555) 123-4567"
                  className="text-base"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button onClick={addProvider} className="flex-1">Add Provider</Button>
                <Button variant="outline" onClick={() => setShowAddProvider(false)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Date Error Dialog */}
        <Dialog open={showDateErrorDialog} onOpenChange={setShowDateErrorDialog}>
          <DialogContent className="border-2 border-red-500" data-testid="dialog-date-error">
            <DialogHeader>
              <DialogTitle className="text-xl text-red-600 flex items-center gap-2">
                <AlertCircle className="h-6 w-6" /> Date Error
              </DialogTitle>
              <DialogDescription className="text-base pt-2" data-testid="text-date-error-message">
                date is incorrect.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end pt-4">
              <Button onClick={() => setShowDateErrorDialog(false)} data-testid="button-close-date-error">
                OK
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Vague Explanation Popup */}
        <Dialog open={showVagueExplanationPopup} onOpenChange={setShowVagueExplanationPopup}>
          <DialogContent className="max-w-lg border-4 border-red-500" data-testid="dialog-vague-explanation">
            <DialogHeader>
              <DialogTitle className="text-xl text-red-600 flex items-center gap-2">
                <AlertCircle className="h-6 w-6" /> Important Notice
              </DialogTitle>
            </DialogHeader>
            <div className="pt-2">
              <p className="text-base font-bold" data-testid="text-vague-explanation">
                Unless you have a documented "specific," medical diagnosis, it may be advantageous to be "Vague" in your explanation of your condition (i.e. "I have Depression" (Specific) vs. "I have persistent feeling of hopelessness" (Vague)).
              </p>
            </div>
            <div className="flex justify-center pt-4">
              <Button onClick={handleVaguePopupOk} data-testid="button-vague-ok">
                OK
              </Button>
            </div>
          </DialogContent>
        </Dialog>

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
                You must complete your Personal Information before using Medical History. This ensures the Navigator can build your claim properly.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end pt-4">
              <Button 
                onClick={() => setLocation("/dashboard/profile")} 
                className="bg-amber-600 hover:bg-amber-700"
              >
                Go to My Profile <ChevronLeft className="ml-2 h-4 w-4 rotate-180" />
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
