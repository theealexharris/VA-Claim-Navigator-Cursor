import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Send } from "lucide-react";
import { CONTACT_EMAIL_ADMIN, CONTACT_EMAIL_BILLING } from "@/lib/contact";

interface ContactFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactType?: "admin" | "billing";
}

export function ContactFormModal({ open, onOpenChange, contactType = "admin" }: ContactFormModalProps) {
  const to = contactType === "billing" ? CONTACT_EMAIL_BILLING : CONTACT_EMAIL_ADMIN;

  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body = `From: ${form.name}\nEmail: ${form.email}\n\n${form.message}`;
    const mailtoUrl =
      `mailto:${to}` +
      `?subject=${encodeURIComponent(`[Contact] ${form.subject}`)}` +
      `&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
    setForm({ name: "", email: "", subject: "", message: "" });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary text-xl font-bold">
            <Mail className="h-5 w-5" />
            Contact Us
          </DialogTitle>
          <p className="text-sm text-muted-foreground pt-1">
            Fill out the form — clicking Send will open your email client with the message ready to go.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name <span className="text-red-500">*</span></Label>
              <Input
                id="name"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Your name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject <span className="text-red-500">*</span></Label>
            <Input
              id="subject"
              name="subject"
              value={form.subject}
              onChange={handleChange}
              placeholder="How can we help?"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message <span className="text-red-500">*</span></Label>
            <Textarea
              id="message"
              name="message"
              value={form.message}
              onChange={handleChange}
              placeholder="Tell us more about your question or concern..."
              rows={5}
              required
            />
          </div>

          <div className="flex justify-between items-center pt-2">
            <p className="text-xs text-muted-foreground">
              Sending to: <span className="font-medium">{to}</span>
            </p>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="gap-2">
                <Send className="h-4 w-4" />
                Send Message
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
