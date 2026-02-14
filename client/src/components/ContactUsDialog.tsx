import { Mail } from "lucide-react";
import { CONTACT_EMAIL_ADMIN } from "@/lib/contact";

/**
 * Contact Us opens the user's default email client (e.g. Outlook) with
 * To: pre-populated as Frontdesk@vaclaimnavigator.com. No embedded email in the UI.
 */
interface ContactUsDialogProps {
  trigger?: React.ReactNode;
  className?: string;
}

const MAILTO = `mailto:${CONTACT_EMAIL_ADMIN}`;

function openContactEmail() {
  window.location.href = MAILTO;
}

export function ContactUsDialog({ trigger, className }: ContactUsDialogProps) {
  if (trigger) {
    return (
      <span
        className={className}
        role="link"
        tabIndex={0}
        onClick={openContactEmail}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openContactEmail();
          }
        }}
        data-testid="button-contact-us"
      >
        {trigger}
      </span>
    );
  }

  return (
    <a href={MAILTO} className={className} data-testid="button-contact-us">
      <Mail className="h-4 w-4 mr-2" />
      CONTACT US
    </a>
  );
}
