import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />
      
      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <Link href="/">
            <Button variant="ghost" className="mb-6 text-muted-foreground hover:text-primary">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Home
            </Button>
          </Link>
          
          <h1 className="text-4xl font-serif font-bold text-primary mb-2">Terms of Service and Conditions</h1>
          <p className="text-muted-foreground mb-8">VA Claim Navigator Consultation Form</p>
          
          <div className="prose prose-lg max-w-none">
            <div className="bg-amber-50 border-l-4 border-secondary p-6 rounded-r-lg mb-8">
              <p className="text-muted-foreground leading-relaxed">
                Please read the following Terms of Service and Conditions carefully before submitting your consultation form to VA Claim Navigator. By submitting this form, you acknowledge that you have read, understood, and agreed to the terms outlined below.
              </p>
            </div>
            
            <p className="text-muted-foreground leading-relaxed mb-6">
              You acknowledge and understand that all data and/or information submitted to create claims is solely the intellectual property of the user. The user further acknowledges that any cost and/or fee charged is solely for the use of VA Claim Navigator's intellectual property and/or AI-powered systems, including database access, system maintenance, and consulting services. These fees are not charged for the sole purpose of creating a VA claim.
            </p>
            
            <p className="text-muted-foreground leading-relaxed mb-8">
              VA Claim Navigator and/or its consultants do not work for the Department of Veterans Affairs (VA), nor are they affiliated with the VA or any other governmental organization. The end user acknowledges that there is no wrongdoing on the part of VA Claim Navigator, its owners, operators, or database administrators.
            </p>
            
            <h2 className="text-2xl font-serif font-bold text-primary mt-10 mb-4">Consultation Purpose</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              The consultation form is designed to gather information for the purpose of providing professional guidance, educational support, or general recommendations related to disability benefits services. All advice provided is based solely on the information you submit. You are responsible for ensuring the accuracy and completeness of all information provided.
            </p>
            
            <h2 className="text-2xl font-serif font-bold text-primary mt-10 mb-4">Consultation Limitations</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              The consultation provided through this form is not intended to substitute for professional medical or legal advice, diagnosis, or treatment. You are encouraged to consult with a qualified healthcare provider or licensed attorney for medical or legal concerns.
            </p>
            
            <h2 className="text-2xl font-serif font-bold text-primary mt-10 mb-4">Confidentiality</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              We respect your privacy and treat all information submitted through the consultation form with strict confidentiality. However, no electronic communication or data transmission over the internet can be guaranteed to be completely secure. By submitting the form, you acknowledge and accept the inherent risks associated with electronic communication.
            </p>
            
            <h2 className="text-2xl font-serif font-bold text-primary mt-10 mb-4">Data Collection and Usage</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Information collected through this consultation form will be used solely for the purpose of providing consultation services by VA Claim Navigator. We may store and process your personal information in accordance with applicable data protection laws and our Privacy Policy.
            </p>
            
            <h2 className="text-2xl font-serif font-bold text-primary mt-10 mb-4">Current Disability Breakdown</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              To enhance the effectiveness of your consultation, we encourage you to provide a snapshot or summary of your current disability breakdown. Accurate and complete information is essential for providing meaningful guidance and recommendations.
            </p>
            
            <h2 className="text-2xl font-serif font-bold text-primary mt-10 mb-4">Email and Protected Health Information (PHI)</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              If you choose to provide Protected Health Information (PHI) via email during the consultation process, please be aware that email transmissions involve certain risks. While we take reasonable measures to secure communications, we cannot guarantee absolute confidentiality. By submitting the form and including PHI, you acknowledge and accept these risks.
            </p>
            
            <h2 className="text-2xl font-serif font-bold text-primary mt-10 mb-4">Consultation Outcomes</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Any advice, guidance, or recommendations provided are based solely on the information you supply. Reliance on consultation outcomes is at your own discretion and risk.
            </p>
            
            <h2 className="text-2xl font-serif font-bold text-primary mt-10 mb-4">Third-Party Disclosure</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              We do not disclose your personal information, including consultation details, to third parties without your prior consent unless required by law or necessary to provide consultation services.
            </p>
            
            <h2 className="text-2xl font-serif font-bold text-primary mt-10 mb-4">Communication Preferences</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              By submitting the consultation form, you agree to receive communications from VA Claim Navigator related to your consultation or other relevant information. You may manage your communication preferences by selecting the appropriate options within the form.
            </p>
            
            <h2 className="text-2xl font-serif font-bold text-primary mt-10 mb-4">Opting Out of Communications</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              If you wish to opt out of receiving future communications from VA Claim Navigator, you may do so by following the instructions provided in our communications or by contacting us directly. Please note that even if you opt out, you may still receive important communications related to your consultation or legal obligations.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-6">
              To opt out, submit an email to compliance@VAClaimNavigator.com stating that you wish to be removed from our mailing and/or contact list. You will be promptly removed.
            </p>
            
            <h2 className="text-2xl font-serif font-bold text-primary mt-10 mb-4">Email Promotional Offers</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              If you do not wish to receive promotional emails, you may unsubscribe using the link provided at the bottom of each email.
            </p>
            
            <h2 className="text-2xl font-serif font-bold text-primary mt-10 mb-4">Mobile Promotional Offers (SMS Messaging)</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              By checking the "I agree to the Terms of Service and Conditions" box and providing your phone number, you expressly consent to receive automated and/or pre-recorded SMS text messages from VA Claim Navigator. Standard message and data rates may apply. Messaging frequency may vary.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-6">
              You may opt out at any time by replying "STOP" to any text message. For assistance, reply "HELP" or review our Privacy Policy and Terms of Use.
            </p>
            
            <h2 className="text-2xl font-serif font-bold text-primary mt-10 mb-4">SMS Campaigns and Additional Disclosures</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              When you opt in to an SMS campaign, we do not share your opt-in information with third parties for purposes unrelated to providing the messaging service. We may share personal data with service providers who assist in delivering SMS communications, such as platform providers and telecommunications carriers.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-6">
              This messaging program may not be available on all wireless carriers. Supported carriers currently include AT&T, Verizon Wireless, T-Mobile®, Sprint, U.S. Cellular, Cricket, Boost, MetroPCS®, Virgin Mobile, and others. VA Claim Navigator reserves the right to add or remove carriers without notice.
            </p>
            
            <h2 className="text-2xl font-serif font-bold text-primary mt-10 mb-4">Accuracy of Information</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              You agree to provide accurate, complete, and truthful information. VA Claim Navigator is not responsible for consequences arising from inaccurate or incomplete information provided by the user.
            </p>
            
            <h2 className="text-2xl font-serif font-bold text-primary mt-10 mb-4">Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              VA Claim Navigator strives to provide accurate and reliable consultation services. However, we make no representations or warranties, express or implied. VA Claim Navigator shall not be liable for any direct, indirect, incidental, consequential, or other damages arising from the use of or reliance on consultation services.
            </p>
            
            <h2 className="text-2xl font-serif font-bold text-primary mt-10 mb-4">Modifications</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              VA Claim Navigator reserves the right to modify or update these Terms and Conditions at any time. Continued use of the consultation services constitutes acceptance of any changes.
            </p>
            
            <h2 className="text-2xl font-serif font-bold text-primary mt-10 mb-4">Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              These Terms and Conditions shall be governed by and construed in accordance with the laws of the jurisdiction in which VA Claim Navigator operates.
            </p>
            
            <h2 className="text-2xl font-serif font-bold text-primary mt-10 mb-4">Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              By submitting the consultation form, you confirm that you have read, understood, and agreed to these Terms and Conditions. If you do not agree, please refrain from submitting the form.
            </p>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
