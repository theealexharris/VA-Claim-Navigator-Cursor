import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mail } from "lucide-react";

type ContactType = "admin" | "billing" | null;

interface ContactUsDialogProps {
  trigger?: React.ReactNode;
  className?: string;
}

export function ContactUsDialog({ trigger, className }: ContactUsDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [contactType, setContactType] = useState<ContactType>(null);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });

  const handleContactTypeSelect = (type: ContactType) => {
    setContactType(type);
    if (type) {
      setShowEmailForm(true);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSendMessage = async () => {
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          contactType
        })
      });

      if (response.ok) {
        setShowSuccess(true);
        setShowEmailForm(false);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setContactType(null);
    setShowEmailForm(false);
    setShowSuccess(false);
    setFormData({ name: "", email: "", subject: "", message: "" });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => open ? setIsOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" className={className} data-testid="button-contact-us">
            <Mail className="h-4 w-4 mr-2" />
            CONTACT US
          </Button>
        )}
      </DialogTrigger>
      <DialogContent 
        className="sm:max-w-md border-4 border-red-500"
        data-testid="dialog-contact-us"
      >
        {!showEmailForm && !showSuccess && (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl font-serif text-primary text-center">
                Contact Us
              </DialogTitle>
              <DialogDescription className="text-center">
                Please select a department to contact
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="flex flex-col gap-4">
                <label 
                  className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    contactType === "admin" ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"
                  }`}
                  data-testid="option-admin-desk"
                  onClick={() => handleContactTypeSelect("admin")}
                >
                  <input
                    type="radio"
                    name="contactType"
                    checked={contactType === "admin"}
                    onChange={() => {}}
                    className="w-5 h-5 text-primary"
                  />
                  <span className="font-medium text-lg">Admin Desk</span>
                </label>
                <label 
                  className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    contactType === "billing" ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"
                  }`}
                  data-testid="option-billing"
                  onClick={() => handleContactTypeSelect("billing")}
                >
                  <input
                    type="radio"
                    name="contactType"
                    checked={contactType === "billing"}
                    onChange={() => {}}
                    className="w-5 h-5 text-primary"
                  />
                  <span className="font-medium text-lg">Billing</span>
                </label>
              </div>
            </div>
          </>
        )}

        {showEmailForm && !showSuccess && (
          <div className="border-4 border-red-500 rounded-lg p-4 -m-2">
            <DialogHeader>
              <DialogTitle className="text-2xl font-serif text-primary text-center">
                {contactType === "admin" ? "Admin Desk" : "Billing"}
              </DialogTitle>
              <DialogDescription className="text-center">
                Send us a message
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Your full name"
                  data-testid="input-contact-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email address (to receive response)</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="your.email@example.com"
                  data-testid="input-contact-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => handleInputChange("subject", e.target.value)}
                  placeholder="Message subject"
                  data-testid="input-contact-subject"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => handleInputChange("message", e.target.value)}
                  placeholder="Type your message here..."
                  rows={5}
                  data-testid="input-contact-message"
                />
              </div>
              <div className="flex justify-end pt-2">
                <Button 
                  onClick={handleSendMessage}
                  disabled={isSubmitting || !formData.name || !formData.email || !formData.subject || !formData.message}
                  className="bg-primary hover:bg-primary/90"
                  data-testid="button-send-message"
                >
                  {isSubmitting ? "Sending..." : "Send Message"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {showSuccess && (
          <div className="text-center py-8">
            <div className="mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <p className="text-lg text-gray-700 leading-relaxed">
              Thank you for reaching out to us, a staff member will address your email within a 24-hour time frame.
            </p>
            <p className="text-lg font-medium text-primary mt-4">
              Thank you,<br />Management
            </p>
            <Button 
              onClick={handleClose}
              className="mt-6"
              data-testid="button-close-success"
            >
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
