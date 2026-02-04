import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { DashboardLayout, getWorkflowProgress } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Plus, Trash2, Loader2, CheckCircle2, ChevronLeft, AlertCircle, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getServiceHistory, createServiceHistory, deleteServiceHistory } from "@/lib/api";

interface Deployment {
  id: string;
  location: string;
  startDate: string;
  endDate: string;
}

interface ServicePeriod {
  id: string;
  branch: string;
  component: string;
  dateEntered: string;
  dateSeparated: string;
  mos: string;
  deployments: Deployment[];
}

export default function ServiceHistory() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isSaving, setIsSaving] = useState(false);
  const [dateErrors, setDateErrors] = useState<Record<string, boolean>>({});
  const [entryDateErrors, setEntryDateErrors] = useState<Record<string, string>>({});
  const [separationDateErrors, setSeparationDateErrors] = useState<Record<string, string>>({});
  const [deploymentDateErrors, setDeploymentDateErrors] = useState<Record<string, string>>({});
  const [showDateErrorDialog, setShowDateErrorDialog] = useState(false);
  const [dateErrorMessage, setDateErrorMessage] = useState("date is incorrect.");
  const [showMissingServicePeriodPopup, setShowMissingServicePeriodPopup] = useState(false);
  const [servicePeriods, setServicePeriods] = useState<ServicePeriod[]>([]);
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const [showProfileRequiredDialog, setShowProfileRequiredDialog] = useState(false);

  // Route guard: Check workflow progress
  useEffect(() => {
    const progress = getWorkflowProgress();
    if (!progress.canAccessServiceHistory) {
      toast({
        title: "Complete Personal Info First",
        description: "Please save your personal information before accessing Service History.",
        variant: "destructive",
      });
      setLocation("/dashboard/profile");
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

  const getCurrentMonthYear = () => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${month}/${year}`;
  };

  const parseMonthYear = (value: string): { month: number; year: number } | null => {
    const match = value.match(/^(\d{2})\/(\d{4})$/);
    if (!match) return null;
    const month = parseInt(match[1], 10);
    const year = parseInt(match[2], 10);
    if (month < 1 || month > 12) return null;
    if (year < 1940 || year > new Date().getFullYear()) return null;
    return { month, year };
  };

  const validateDeploymentDates = (deploymentId: string, startDate: string, endDate: string): boolean => {
    // Only validate complete dates (7 chars = MM/YYYY)
    const isStartComplete = startDate.length === 7;
    const isEndComplete = endDate.length === 7;
    
    const start = isStartComplete ? parseMonthYear(startDate) : null;
    const end = isEndComplete ? parseMonthYear(endDate) : null;
    
    // Clear errors for incomplete inputs (user is still typing)
    if (!isStartComplete && !isEndComplete) {
      setDeploymentDateErrors(prev => {
        const updated = { ...prev };
        delete updated[`${deploymentId}-start`];
        delete updated[`${deploymentId}-end`];
        return updated;
      });
      return true;
    }
    
    // Validate start date only when complete
    if (isStartComplete && !start) {
      setDeploymentDateErrors(prev => ({ ...prev, [`${deploymentId}-start`]: "date is incorrect." }));
      setShowDateErrorDialog(true);
      return false;
    } else if (isStartComplete && start) {
      setDeploymentDateErrors(prev => {
        const updated = { ...prev };
        delete updated[`${deploymentId}-start`];
        return updated;
      });
    }
    
    // Validate end date only when complete
    if (isEndComplete && !end) {
      setDeploymentDateErrors(prev => ({ ...prev, [`${deploymentId}-end`]: "date is incorrect." }));
      setShowDateErrorDialog(true);
      return false;
    } else if (isEndComplete && end) {
      setDeploymentDateErrors(prev => {
        const updated = { ...prev };
        delete updated[`${deploymentId}-end`];
        return updated;
      });
    }
    
    // Compare dates only when both are complete and valid
    if (start && end) {
      const startVal = start.year * 12 + start.month;
      const endVal = end.year * 12 + end.month;
      if (startVal > endVal) {
        setDeploymentDateErrors(prev => ({ ...prev, [`${deploymentId}-start`]: "date is incorrect." }));
        setShowDateErrorDialog(true);
        return false;
      }
    }
    
    return true;
  };

  const formatMonthYearInput = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}/${digits.slice(2, 6)}`;
  };

  const formatFullDateInput = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
  };

  const parseFullDate = (value: string): Date | null => {
    const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return null;
    const month = parseInt(match[1], 10);
    const day = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    if (month < 1 || month > 12) return null;
    if (day < 1 || day > 31) return null;
    if (year < 1945 || year > new Date().getFullYear()) return null;
    const date = new Date(year, month - 1, day);
    if (date.getMonth() !== month - 1 || date.getDate() !== day) return null;
    return date;
  };

  useEffect(() => {
    const loadServiceHistory = async () => {
      try {
        const data = await getServiceHistory();
        if (data.length > 0) {
          const mapped = data.map((item: any) => ({
            id: item.id,
            branch: item.branch || "",
            component: item.component || "",
            dateEntered: item.dateEntered ? new Date(item.dateEntered).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : "",
            dateSeparated: item.dateSeparated ? new Date(item.dateSeparated).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : "",
            mos: item.mos || "",
            deployments: (item.deployments || []).map((d: any, idx: number) => ({
              id: `${item.id}-dep-${idx}`,
              location: d.location || "",
              startDate: d.startDate || "",
              endDate: d.endDate || "",
            })),
          }));
          setServicePeriods(mapped);
        } else {
          const saved = localStorage.getItem("serviceHistory");
          if (saved) {
            setServicePeriods(JSON.parse(saved));
          }
        }
      } catch (error) {
        console.error("Failed to load service history from API:", error);
        const saved = localStorage.getItem("serviceHistory");
        if (saved) {
          setServicePeriods(JSON.parse(saved));
        }
      }
    };
    loadServiceHistory();
  }, []);

  const validateDates = (periodId: string, dateEntered: string, dateSeparated: string) => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const minDate = new Date('1945-01-01');
    let hasErrors = false;
    
    // Validate Date Entered (only when fully typed - 10 chars = MM/DD/YYYY)
    if (dateEntered && dateEntered.length === 10) {
      const entered = parseFullDate(dateEntered);
      
      if (!entered) {
        setEntryDateErrors(prev => ({ ...prev, [periodId]: "Invalid date format (MM/DD/YYYY)" }));
        setDateErrorMessage("Please enter a valid date in MM/DD/YYYY format.");
        setShowDateErrorDialog(true);
        hasErrors = true;
      }
      // Check if date is before 1945
      else if (entered < minDate) {
        setEntryDateErrors(prev => ({ ...prev, [periodId]: "Date cannot be earlier than 1945" }));
        setDateErrorMessage("Date Entered cannot be earlier than 1945.");
        setShowDateErrorDialog(true);
        hasErrors = true;
      }
      // Check if date is in the future
      else if (entered > today) {
        setEntryDateErrors(prev => ({ ...prev, [periodId]: "Date cannot be in the future" }));
        setDateErrorMessage("Date Entered cannot be a future date.");
        setShowDateErrorDialog(true);
        hasErrors = true;
      } else {
        setEntryDateErrors(prev => {
          const updated = { ...prev };
          delete updated[periodId];
          return updated;
        });
      }
    } else if (dateEntered && dateEntered.length < 10) {
      // Clear errors while typing
      setEntryDateErrors(prev => {
        const updated = { ...prev };
        delete updated[periodId];
        return updated;
      });
    } else {
      setEntryDateErrors(prev => {
        const updated = { ...prev };
        delete updated[periodId];
        return updated;
      });
    }
    
    // Validate Date Separated (only when fully typed - 10 chars = MM/DD/YYYY)
    if (dateSeparated && dateSeparated.length === 10) {
      const separated = parseFullDate(dateSeparated);
      const enteredDate = dateEntered && dateEntered.length === 10 ? parseFullDate(dateEntered) : null;
      
      if (!separated) {
        setSeparationDateErrors(prev => ({ ...prev, [periodId]: "Invalid date format (MM/DD/YYYY)" }));
        setDateErrorMessage("Please enter a valid date in MM/DD/YYYY format.");
        setShowDateErrorDialog(true);
        hasErrors = true;
      }
      // Check if separation date is in the future
      else if (separated > today) {
        setSeparationDateErrors(prev => ({ ...prev, [periodId]: "Date cannot be in the future" }));
        setDateErrorMessage("Date Separated cannot be a future date.");
        setShowDateErrorDialog(true);
        hasErrors = true;
      }
      // Check if separation date is before entry date
      else if (enteredDate && separated < enteredDate) {
        setSeparationDateErrors(prev => ({ ...prev, [periodId]: "Date cannot be prior to entry date" }));
        setDateErrors(prev => ({ ...prev, [periodId]: true }));
        setDateErrorMessage("Date Separated cannot be prior to Date Entered.");
        setShowDateErrorDialog(true);
        hasErrors = true;
      } else {
        setSeparationDateErrors(prev => {
          const updated = { ...prev };
          delete updated[periodId];
          return updated;
        });
        setDateErrors(prev => ({ ...prev, [periodId]: false }));
      }
    } else if (dateSeparated && dateSeparated.length < 10) {
      // Clear errors while typing
      setSeparationDateErrors(prev => {
        const updated = { ...prev };
        delete updated[periodId];
        return updated;
      });
      setDateErrors(prev => ({ ...prev, [periodId]: false }));
    } else {
      setSeparationDateErrors(prev => {
        const updated = { ...prev };
        delete updated[periodId];
        return updated;
      });
      setDateErrors(prev => ({ ...prev, [periodId]: false }));
    }
    
    return !hasErrors;
  };

  const addServicePeriod = () => {
    const newPeriod: ServicePeriod = {
      id: Date.now().toString(),
      branch: "",
      component: "",
      dateEntered: "",
      dateSeparated: "",
      mos: "",
      deployments: []
    };
    setServicePeriods([...servicePeriods, newPeriod]);
  };

  const removeServicePeriod = (periodId: string) => {
    setServicePeriods(servicePeriods.filter(p => p.id !== periodId));
    toast({
      title: "Period Removed",
      description: "Service period has been deleted.",
    });
  };

  const updateServicePeriod = (periodId: string, field: keyof ServicePeriod, value: any) => {
    let formattedValue = value;
    if (field === "dateEntered" || field === "dateSeparated") {
      formattedValue = formatFullDateInput(value);
    }
    
    const updated = servicePeriods.map(p => 
      p.id === periodId ? { ...p, [field]: formattedValue } : p
    );
    setServicePeriods(updated);
    
    const period = updated.find(p => p.id === periodId);
    if (period && (field === "dateEntered" || field === "dateSeparated")) {
      validateDates(periodId, period.dateEntered, period.dateSeparated);
    }
  };

  const addDeployment = (periodId: string) => {
    const currentDate = getCurrentMonthYear();
    setServicePeriods(servicePeriods.map(p => {
      if (p.id === periodId) {
        return {
          ...p,
          deployments: [...p.deployments, { id: Date.now().toString(), location: "", startDate: "", endDate: currentDate }]
        };
      }
      return p;
    }));
  };

  const removeDeployment = (periodId: string, deploymentId: string) => {
    setServicePeriods(servicePeriods.map(p => {
      if (p.id === periodId) {
        return {
          ...p,
          deployments: p.deployments.filter(d => d.id !== deploymentId)
        };
      }
      return p;
    }));
  };

  const updateDeployment = (periodId: string, deploymentId: string, field: keyof Deployment, value: string) => {
    let formattedValue = value;
    if (field === "startDate" || field === "endDate") {
      formattedValue = formatMonthYearInput(value);
    }
    
    setServicePeriods(prev => prev.map(p => {
      if (p.id === periodId) {
        const updatedDeployments = p.deployments.map(d => 
          d.id === deploymentId ? { ...d, [field]: formattedValue } : d
        );
        
        if (field === "startDate" || field === "endDate") {
          const deployment = updatedDeployments.find(d => d.id === deploymentId);
          if (deployment) {
            validateDeploymentDates(deploymentId, deployment.startDate, deployment.endDate);
          }
        }
        
        return { ...p, deployments: updatedDeployments };
      }
      return p;
    }));
  };

  const handleSave = async () => {
    if (servicePeriods.length === 0) {
      setShowMissingServicePeriodPopup(true);
      return;
    }
    
    const hasErrors = Object.values(dateErrors).some(error => error);
    const hasDeploymentErrors = Object.keys(deploymentDateErrors).length > 0;
    if (hasErrors || hasDeploymentErrors) {
      setShowDateErrorDialog(true);
      return;
    }

    setIsSaving(true);
    try {
      const existingData = await getServiceHistory();
      for (const existing of existingData) {
        await deleteServiceHistory(existing.id);
      }
      
      for (const period of servicePeriods) {
        const parseDate = (dateStr: string): Date | null => {
          if (!dateStr) return null;
          const parts = dateStr.split('/');
          if (parts.length === 3) {
            const [month, day, year] = parts;
            return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          }
          return null;
        };

        const dateEntered = parseDate(period.dateEntered);
        const dateSeparated = parseDate(period.dateSeparated);

        if (!dateEntered) {
          toast({
            title: "Invalid Date",
            description: "Date Entered is required for all service periods.",
            variant: "destructive",
          });
          setIsSaving(false);
          return;
        }

        await createServiceHistory({
          branch: period.branch,
          component: period.component,
          dateEntered: dateEntered,
          dateSeparated: dateSeparated || null,
          mos: period.mos || null,
          deployments: period.deployments.map(d => ({
            location: d.location,
            startDate: d.startDate,
            endDate: d.endDate,
          })),
        });
      }

      localStorage.setItem("serviceHistory", JSON.stringify(servicePeriods));
      localStorage.setItem("serviceHistoryComplete", "true");
      window.dispatchEvent(new Event('workflowProgressUpdate'));
      toast({
        title: "Service Details Saved",
        description: "Your service history has been saved to your account. Proceeding to Medical Conditions.",
      });
      setLocation("/dashboard/medical-history");
    } catch (error) {
      console.error("Failed to save service history:", error);
      toast({
        title: "Error",
        description: "Failed to save. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-serif font-bold text-primary">Service History</h1>
            <p className="text-lg text-muted-foreground">Your military service details are crucial for establishing service connection.</p>
          </div>
          <Button onClick={addServicePeriod} data-testid="button-add-service-period">
            <Plus className="mr-2 h-4 w-4" /> Add Service Period
          </Button>
        </div>

        {servicePeriods.length === 0 ? (
          <Card className="border-2 border-dashed">
            <CardContent className="py-16 text-center">
              <Plus className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-primary mb-2">No Service Periods Added</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Add your military service periods to establish service connection for your VA disability claim.
              </p>
              <Button onClick={addServicePeriod} className="bg-secondary text-secondary-foreground">
                <Plus className="mr-2 h-4 w-4" /> Add Your First Service Period
              </Button>
            </CardContent>
          </Card>
        ) : (
          servicePeriods.map((period, index) => (
          <Card key={period.id}>
            <CardHeader>
              <CardTitle className="text-xl">Service Period {index + 1}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-base">Branch of Service</Label>
                  <Select 
                    value={period.branch} 
                    onValueChange={(value) => updateServicePeriod(period.id, "branch", value)}
                  >
                    <SelectTrigger className={period.branch ? "font-bold" : ""}>
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="army">Army</SelectItem>
                      <SelectItem value="navy">Navy</SelectItem>
                      <SelectItem value="marines">Marine Corps</SelectItem>
                      <SelectItem value="airforce">Air Force</SelectItem>
                      <SelectItem value="coastguard">Coast Guard</SelectItem>
                      <SelectItem value="spaceforce">Space Force</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-base">Component</Label>
                  <Select 
                    value={period.component}
                    onValueChange={(value) => updateServicePeriod(period.id, "component", value)}
                  >
                    <SelectTrigger className={period.component ? "font-bold" : ""}>
                      <SelectValue placeholder="Select component" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active Duty</SelectItem>
                      <SelectItem value="reserve">Reserves</SelectItem>
                      <SelectItem value="guard">National Guard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-base">Date Entered (MM/DD/YYYY)</Label>
                  <Input 
                    type="text" 
                    value={period.dateEntered}
                    onChange={(e) => updateServicePeriod(period.id, "dateEntered", e.target.value)}
                    placeholder="01/15/1990"
                    maxLength={10}
                    className={`${period.dateEntered ? "font-bold" : ""} ${entryDateErrors[period.id] ? "border-red-500 ring-2 ring-red-500" : ""}`}
                    data-testid="input-date-entered"
                  />
                  {entryDateErrors[period.id] && (
                    <div className="bg-red-100 border border-red-500 text-red-700 px-3 py-2 rounded-md text-sm flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      {entryDateErrors[period.id]}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-base">Date Separated (MM/DD/YYYY)</Label>
                  <Input 
                    type="text" 
                    value={period.dateSeparated}
                    onChange={(e) => updateServicePeriod(period.id, "dateSeparated", e.target.value)}
                    placeholder="12/31/2020"
                    maxLength={10}
                    className={`${period.dateSeparated ? "font-bold" : ""} ${(dateErrors[period.id] || separationDateErrors[period.id]) ? "border-red-500 ring-2 ring-red-500" : ""}`}
                    data-testid="input-date-separated"
                  />
                  {(dateErrors[period.id] || separationDateErrors[period.id]) && (
                    <div className="bg-red-100 border border-red-500 text-red-700 px-3 py-2 rounded-md text-sm flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      {separationDateErrors[period.id] || "Date cannot be prior to entry date"}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-base">Primary MOS / Rating / AFSC</Label>
                <Input 
                  value={period.mos}
                  onChange={(e) => updateServicePeriod(period.id, "mos", e.target.value)}
                  placeholder="e.g., 11B - Infantryman"
                  className={`text-base ${period.mos ? "font-bold" : ""}`}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-base">Deployments & Locations</Label>
                <div className="border rounded-md p-4 space-y-4">
                  {period.deployments.map((deployment) => (
                    <div key={deployment.id} className="space-y-2">
                      <div className="flex items-center gap-4">
                        <Input 
                          value={deployment.location}
                          onChange={(e) => updateDeployment(period.id, deployment.id, "location", e.target.value)}
                          placeholder="Location (e.g., Afghanistan)"
                          className={`flex-1 ${deployment.location ? "font-bold" : ""}`}
                          data-testid={`input-deployment-location-${deployment.id}`}
                        />
                        <div className="flex flex-col">
                          <Label className="text-xs text-muted-foreground mb-1">From (MM/YYYY)</Label>
                          <Input 
                            type="text"
                            value={deployment.startDate}
                            onChange={(e) => updateDeployment(period.id, deployment.id, "startDate", e.target.value)}
                            placeholder="01/1990"
                            maxLength={7}
                            className={`w-28 text-center ${deployment.startDate ? "font-bold" : ""} ${deploymentDateErrors[`${deployment.id}-start`] ? "border-2 border-red-500" : ""}`}
                            data-testid={`input-deployment-start-${deployment.id}`}
                          />
                          {deploymentDateErrors[`${deployment.id}-start`] && (
                            <span className="text-xs text-red-500 mt-1">{deploymentDateErrors[`${deployment.id}-start`]}</span>
                          )}
                        </div>
                        <span className="text-muted-foreground mt-6">to</span>
                        <div className="flex flex-col">
                          <Label className="text-xs text-muted-foreground mb-1">To (MM/YYYY)</Label>
                          <Input 
                            type="text"
                            value={deployment.endDate}
                            onChange={(e) => updateDeployment(period.id, deployment.id, "endDate", e.target.value)}
                            placeholder="12/2024"
                            maxLength={7}
                            className={`w-28 text-center ${deployment.endDate ? "font-bold" : ""} ${deploymentDateErrors[`${deployment.id}-end`] ? "border-2 border-red-500" : ""}`}
                            data-testid={`input-deployment-end-${deployment.id}`}
                          />
                          {deploymentDateErrors[`${deployment.id}-end`] && (
                            <span className="text-xs text-red-500 mt-1">{deploymentDateErrors[`${deployment.id}-end`]}</span>
                          )}
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-destructive"
                          onClick={() => removeDeployment(period.id, deployment.id)}
                          data-testid={`button-remove-deployment-${deployment.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => addDeployment(period.id)}
                    data-testid="button-add-deployment"
                  >
                    <Plus className="mr-2 h-3 w-3" /> Add Deployment
                  </Button>
                </div>
              </div>
              
              <div className="flex justify-end pt-4">
                {servicePeriods.length > 1 && (
                  <Button 
                    variant="outline" 
                    className="text-destructive hover:bg-destructive/10 border-destructive/20 mr-auto"
                    onClick={() => removeServicePeriod(period.id)}
                    data-testid="button-remove-period"
                  >
                    Remove Period
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))
        )}

        <div className="flex justify-between">
          <Link href="/dashboard/profile">
            <Button variant="outline" data-testid="button-back-service">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <Button onClick={handleSave} disabled={isSaving} data-testid="button-save-service">
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Save Service Details
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Missing Service Period Popup */}
      <Dialog open={showMissingServicePeriodPopup} onOpenChange={setShowMissingServicePeriodPopup}>
        <DialogContent className="border-2 border-red-500" data-testid="dialog-missing-service-period">
          <DialogHeader>
            <DialogTitle className="text-xl text-red-600 flex items-center gap-2">
              <AlertCircle className="h-6 w-6" /> Service Period Required
            </DialogTitle>
            <DialogDescription className="text-base pt-2 text-red-600 font-medium" data-testid="text-missing-service-period-message">
              Add Service Period Must be Added.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end pt-4">
            <Button onClick={() => setShowMissingServicePeriodPopup(false)} data-testid="button-close-missing-service-period">
              OK
            </Button>
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
              {dateErrorMessage}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end pt-4">
            <Button onClick={() => setShowDateErrorDialog(false)} data-testid="button-close-date-error">
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
              You must complete your Personal Information before using Service History. This ensures the Navigator can build your claim properly.
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
    </DashboardLayout>
  );
}
