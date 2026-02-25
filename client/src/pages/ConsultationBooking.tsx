import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { apiUrl } from "@/lib/api-helpers";
import { Calendar, Clock, Phone, User, CheckCircle2, ArrowLeft, Shield, FileCheck, Star } from "lucide-react";
import { format, addDays, startOfDay, isBefore, isWeekend } from "date-fns";

const CONSULTATION_TYPES = [
  { value: "initial_rating", label: "Initial Rating Claim", description: "First-time filing for disability benefits" },
  { value: "rating_increase", label: "Rating Increase", description: "Request to increase existing rating" },
  { value: "appeal_strategy", label: "Appeal Strategy", description: "Planning an appeal for denied claim" },
  { value: "general_guidance", label: "General Guidance", description: "Questions about the claims process" },
];

const BRANCHES = [
  "Army",
  "Navy",
  "Air Force",
  "Marine Corps",
  "Coast Guard",
  "Space Force",
  "National Guard",
  "Reserves",
];

const TIME_SLOTS = [
  "09:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "01:00 PM",
  "02:00 PM",
  "03:00 PM",
  "04:00 PM",
];

export default function ConsultationBooking() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [formData, setFormData] = useState({
    guestName: user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : "",
    guestEmail: user?.email || "",
    guestPhone: "",
    consultationType: "",
    currentRating: "",
    branchOfService: "",
    dischargeType: "",
    notes: "",
  });
  const [bookingComplete, setBookingComplete] = useState(false);
  const [bookedConsultation, setBookedConsultation] = useState<any>(null);

  const bookMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(apiUrl("/api/consultations"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...formData,
          scheduledDate: selectedDate?.toISOString(),
          scheduledTime: selectedTime,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });
      if (!res.ok) throw new Error("Failed to book consultation");
      return res.json();
    },
    onSuccess: (data) => {
      setBookedConsultation(data);
      setBookingComplete(true);
      toast({
        title: "Consultation Booked!",
        description: "You'll receive a confirmation email shortly.",
      });
    },
    onError: () => {
      toast({
        title: "Booking Failed",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
    },
  });

  const getAvailableDates = () => {
    const dates: Date[] = [];
    let currentDate = addDays(startOfDay(new Date()), 1);
    
    while (dates.length < 14) {
      if (!isWeekend(currentDate)) {
        dates.push(currentDate);
      }
      currentDate = addDays(currentDate, 1);
    }
    
    return dates;
  };

  const availableDates = getAvailableDates();

  if (bookingComplete && bookedConsultation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full">
          <CardContent className="pt-8 text-center">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-serif font-bold text-primary mb-2">Consultation Booked!</h2>
            <p className="text-muted-foreground mb-6">
              Your free strategy session has been scheduled. We'll send you a confirmation email with details.
            </p>
            
            <div className="bg-muted/50 rounded-lg p-4 mb-6 text-left">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date:</span>
                  <span className="font-medium">{selectedDate && format(selectedDate, "EEEE, MMMM d, yyyy")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time:</span>
                  <span className="font-medium">{selectedTime} EST</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <span className="font-medium">
                    {CONSULTATION_TYPES.find(t => t.value === formData.consultationType)?.label}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Link href={user ? "/dashboard" : "/"}>
                <Button className="w-full" data-testid="button-go-to-dashboard">
                  {user ? "Go to Dashboard" : "Back to Home"}
                </Button>
              </Link>
              {!user && (
                <Link href="/signup">
                  <Button variant="outline" className="w-full" data-testid="button-create-account">
                    Create an Account
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <Link href="/">
          <Button variant="ghost" className="mb-6" data-testid="button-back-home">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-serif font-bold text-primary mb-3">
              Book Your Free Strategy Session
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Speak with a claims specialist to understand your options and develop a winning strategy for your VA disability claim.
            </p>
          </div>

          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-2">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center">
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center font-bold ${
                      s === step
                        ? "bg-primary text-white"
                        : s < step
                        ? "bg-green-500 text-white"
                        : "bg-gray-200 text-gray-500"
                    }`}
                    data-testid={`step-indicator-${s}`}
                  >
                    {s < step ? <CheckCircle2 className="h-5 w-5" /> : s}
                  </div>
                  {s < 3 && <div className={`w-16 h-1 ${s < step ? "bg-green-500" : "bg-gray-200"}`} />}
                </div>
              ))}
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>
                    {step === 1 && "Select Date & Time"}
                    {step === 2 && "Your Information"}
                    {step === 3 && "Confirm Booking"}
                  </CardTitle>
                  <CardDescription>
                    {step === 1 && "Choose a convenient time for your 30-minute consultation."}
                    {step === 2 && "Tell us a bit about yourself so we can prepare for your call."}
                    {step === 3 && "Review your details and confirm your booking."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {step === 1 && (
                    <div className="space-y-6">
                      <div>
                        <Label className="text-base font-medium mb-3 block">Select a Date</Label>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {availableDates.map((date) => (
                            <Button
                              key={date.toISOString()}
                              variant={selectedDate?.toDateString() === date.toDateString() ? "default" : "outline"}
                              className="h-auto py-3 flex flex-col"
                              onClick={() => setSelectedDate(date)}
                              data-testid={`date-button-${format(date, "yyyy-MM-dd")}`}
                            >
                              <span className="text-xs opacity-70">{format(date, "EEE")}</span>
                              <span className="text-lg font-bold">{format(date, "d")}</span>
                              <span className="text-xs opacity-70">{format(date, "MMM")}</span>
                            </Button>
                          ))}
                        </div>
                      </div>

                      {selectedDate && (
                        <div>
                          <Label className="text-base font-medium mb-3 block">Select a Time (EST)</Label>
                          <div className="grid grid-cols-4 gap-2">
                            {TIME_SLOTS.map((time) => (
                              <Button
                                key={time}
                                variant={selectedTime === time ? "default" : "outline"}
                                onClick={() => setSelectedTime(time)}
                                data-testid={`time-button-${time.replace(/\s/g, "-")}`}
                              >
                                {time}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}

                      <Button
                        className="w-full"
                        disabled={!selectedDate || !selectedTime}
                        onClick={() => setStep(2)}
                        data-testid="button-continue-step-2"
                      >
                        Continue
                      </Button>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-4">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="name">Full Name</Label>
                          <Input
                            id="name"
                            value={formData.guestName}
                            onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
                            placeholder="John Smith"
                            data-testid="input-name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={formData.guestEmail}
                            onChange={(e) => setFormData({ ...formData, guestEmail: e.target.value })}
                            placeholder="john@example.com"
                            data-testid="input-email"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={formData.guestPhone}
                          onChange={(e) => setFormData({ ...formData, guestPhone: e.target.value })}
                          placeholder="(555) 123-4567"
                          data-testid="input-phone"
                        />
                      </div>

                      <div>
                        <Label htmlFor="type">Consultation Type</Label>
                        <Select
                          value={formData.consultationType}
                          onValueChange={(value) => setFormData({ ...formData, consultationType: value })}
                        >
                          <SelectTrigger data-testid="select-consultation-type">
                            <SelectValue placeholder="Select type..." />
                          </SelectTrigger>
                          <SelectContent>
                            {CONSULTATION_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="branch">Branch of Service</Label>
                          <Select
                            value={formData.branchOfService}
                            onValueChange={(value) => setFormData({ ...formData, branchOfService: value })}
                          >
                            <SelectTrigger data-testid="select-branch">
                              <SelectValue placeholder="Select branch..." />
                            </SelectTrigger>
                            <SelectContent>
                              {BRANCHES.map((branch) => (
                                <SelectItem key={branch} value={branch}>
                                  {branch}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="rating">Current VA Rating (if any)</Label>
                          <Select
                            value={formData.currentRating}
                            onValueChange={(value) => setFormData({ ...formData, currentRating: value })}
                          >
                            <SelectTrigger data-testid="select-rating">
                              <SelectValue placeholder="Select rating..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No current rating</SelectItem>
                              <SelectItem value="0">0%</SelectItem>
                              <SelectItem value="10">10%</SelectItem>
                              <SelectItem value="20">20%</SelectItem>
                              <SelectItem value="30">30%</SelectItem>
                              <SelectItem value="40">40%</SelectItem>
                              <SelectItem value="50">50%</SelectItem>
                              <SelectItem value="60">60%</SelectItem>
                              <SelectItem value="70">70%</SelectItem>
                              <SelectItem value="80">80%</SelectItem>
                              <SelectItem value="90">90%</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="notes">Anything else we should know?</Label>
                        <Textarea
                          id="notes"
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          placeholder="Tell us about your conditions, concerns, or questions..."
                          rows={3}
                          data-testid="textarea-notes"
                        />
                      </div>

                      <div className="flex gap-3">
                        <Button variant="outline" onClick={() => setStep(1)} data-testid="button-back-step-1">
                          Back
                        </Button>
                        <Button
                          className="flex-1"
                          disabled={!formData.guestName || !formData.guestEmail || !formData.consultationType}
                          onClick={() => setStep(3)}
                          data-testid="button-continue-step-3"
                        >
                          Continue
                        </Button>
                      </div>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="space-y-6">
                      <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                        <h4 className="font-medium">Booking Summary</h4>
                        <div className="grid gap-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Date:</span>
                            <span className="font-medium">{selectedDate && format(selectedDate, "EEEE, MMMM d, yyyy")}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Time:</span>
                            <span className="font-medium">{selectedTime} EST</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Type:</span>
                            <span className="font-medium">
                              {CONSULTATION_TYPES.find(t => t.value === formData.consultationType)?.label}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Name:</span>
                            <span className="font-medium">{formData.guestName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Email:</span>
                            <span className="font-medium">{formData.guestEmail}</span>
                          </div>
                          {formData.branchOfService && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Branch:</span>
                              <span className="font-medium">{formData.branchOfService}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <Button variant="outline" onClick={() => setStep(2)} data-testid="button-back-step-2">
                          Back
                        </Button>
                        <Button
                          className="flex-1"
                          onClick={() => bookMutation.mutate()}
                          disabled={bookMutation.isPending}
                          data-testid="button-confirm-booking"
                        >
                          {bookMutation.isPending ? "Booking..." : "Confirm Booking"}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="bg-gradient-to-br from-primary/5 to-secondary/5">
                <CardHeader>
                  <CardTitle className="text-lg">What to Expect</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">30-Minute Call</p>
                      <p className="text-xs text-muted-foreground">A focused session to assess your situation</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Personalized Strategy</p>
                      <p className="text-xs text-muted-foreground">Tailored advice for your specific conditions</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <FileCheck className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Evidence Guidance</p>
                      <p className="text-xs text-muted-foreground">Learn what documentation you'll need</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-1 text-yellow-500 mb-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <p className="text-sm italic mb-3">
                    "The consultation helped me understand exactly what I needed for my claim. I went from 30% to 70% within 6 months."
                  </p>
                  <p className="text-sm font-medium">— James T., Army Veteran</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
