import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function PrivacyPolicy() {
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
          
          <h1 className="text-4xl font-serif font-bold text-primary mb-2">Privacy Policy</h1>
          <p className="text-muted-foreground mb-8">Last updated January 01, 2025</p>
          
          <div className="prose prose-lg max-w-none">
            <p className="text-muted-foreground leading-relaxed mb-6">
              Thank you for choosing to be part of our community at VA Claim Navigator Corporation, doing business as VA Claim Navigator Group ("VA Claim Navigator Group," "we," "us," or "our"). We are committed to protecting your personal information and your right to privacy. If you have any questions or concerns about this privacy notice or our practices with regard to your personal information, please contact us at info@VAClaimNavigator.com.
            </p>
            
            <p className="text-muted-foreground leading-relaxed mb-6">
              This privacy notice describes how we might use your information if you:
            </p>
            <ul className="list-disc list-inside text-muted-foreground mb-6 space-y-2">
              <li>Visit our website at https://www.VAClaimNavigator.com</li>
              <li>Engage with us in other related ways ― including any sales, marketing, or events</li>
            </ul>
            
            <p className="text-muted-foreground leading-relaxed mb-6">
              In this privacy notice, if we refer to "Website," we are referring to any website of ours that references or links to this policy. "Services" refers to our website, and other related services, including any sales, marketing, or events.
            </p>
            
            <p className="text-muted-foreground leading-relaxed mb-8">
              The purpose of this privacy notice is to explain to you in the clearest way possible what information we collect, how we use it, and what rights you have in relation to it. If there are any terms in this privacy notice that you do not agree with, please discontinue use of our Services immediately.
            </p>
            
            <h2 className="text-2xl font-serif font-bold text-primary mt-10 mb-4">Table of Contents</h2>
            <ol className="list-decimal list-inside text-muted-foreground mb-8 space-y-1">
              <li>What Information Do We Collect?</li>
              <li>How Do We Use Your Information?</li>
              <li>Will Your Information Be Shared With Anyone?</li>
              <li>How Long Do We Keep Your Information?</li>
              <li>How Do We Keep Your Information Safe?</li>
              <li>Do We Collect Information From Minors?</li>
              <li>What Are Your Privacy Rights?</li>
              <li>Controls For Do-Not-Track Features</li>
              <li>Do California Residents Have Specific Privacy Rights?</li>
              <li>Do We Make Updates To This Notice?</li>
              <li>How Can You Contact Us About This Notice?</li>
              <li>How Can You Review, Update, Or Delete The Data We Collect From You?</li>
            </ol>
            
            <h2 className="text-2xl font-serif font-bold text-primary mt-10 mb-4">1. What Information Do We Collect?</h2>
            <h3 className="text-xl font-semibold text-primary mb-2">Personal information you disclose to us</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              <strong>In Short:</strong> We collect personal information that you provide to us.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We collect personal information that you voluntarily provide to us when you express an interest in obtaining information about us or our products and Services, when you participate in activities on the Website or otherwise when you contact us.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              The personal information that we collect depends on the context of your interactions with us and the Website, the choices you make and the products and features you use.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              <strong>Personal Information Provided by You.</strong> We collect names; phone numbers; email addresses; mailing addresses; usernames; passwords; billing addresses; debit/credit card numbers; and other similar information.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              All personal information that you provide to us must be true, complete, and accurate.
            </p>
            <h3 className="text-xl font-semibold text-primary mb-2">Information automatically collected</h3>
            <p className="text-muted-foreground leading-relaxed mb-6">
              <strong>In Short:</strong> Some information — such as your IP address — is collected automatically when you visit our Website.
            </p>
            
            <h2 className="text-2xl font-serif font-bold text-primary mt-10 mb-4">2. How Do We Use Your Information?</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              <strong>In Short:</strong> We process your information for legitimate business purposes, contractual obligations, legal compliance, and/or your consent.
            </p>
            
            <h2 className="text-2xl font-serif font-bold text-primary mt-10 mb-4">3. Will Your Information Be Shared With Anyone?</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              <strong>In Short:</strong> We only share information with your consent, legal obligations, or business necessities.
            </p>
            
            <h2 className="text-2xl font-serif font-bold text-primary mt-10 mb-4">4. How Long Do We Keep Your Information?</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              <strong>In Short:</strong> We keep your information only as long as necessary, unless otherwise required by law.
            </p>
            
            <h2 className="text-2xl font-serif font-bold text-primary mt-10 mb-4">5. How Do We Keep Your Information Safe?</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              <strong>In Short:</strong> We use appropriate security measures but cannot guarantee absolute security.
            </p>
            
            <h2 className="text-2xl font-serif font-bold text-primary mt-10 mb-4">6. Do We Collect Information From Minors?</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              <strong>In Short:</strong> We do not knowingly collect data from children under 18.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-6">
              If you become aware of any data we may have collected from children under age 18, please contact us at info@VAClaimNavigator.com.
            </p>
            
            <h2 className="text-2xl font-serif font-bold text-primary mt-10 mb-4">7. What Are Your Privacy Rights?</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              You have certain rights regarding your personal information. Please contact us to exercise these rights.
            </p>
            
            <h2 className="text-2xl font-serif font-bold text-primary mt-10 mb-4">8. Controls For Do-Not-Track Features</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Most web browsers and some mobile operating systems include a Do-Not-Track ("DNT") feature. We honor DNT signals and Do Not Track requests.
            </p>
            
            <h2 className="text-2xl font-serif font-bold text-primary mt-10 mb-4">9. Do California Residents Have Specific Privacy Rights?</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Yes, California residents have specific rights regarding their personal information under the California Consumer Privacy Act (CCPA).
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              VA Claim Navigator Corporation has not disclosed or sold any personal information to third parties for a business or commercial purpose in the preceding twelve (12) months. VA Claim Navigator Corporation will not sell personal information in the future belonging to website visitors, users, and other consumers.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-6">
              To exercise these rights, contact us at info@VAClaimNavigator.com.
            </p>
            
            <h2 className="text-2xl font-serif font-bold text-primary mt-10 mb-4">10. Do We Make Updates To This Notice?</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              <strong>In Short:</strong> Yes, we may update this notice as needed.
            </p>
            
            <h2 className="text-2xl font-serif font-bold text-primary mt-10 mb-4">11. How Can You Contact Us About This Notice?</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              If you have questions or comments about this notice, you may contact us at:
            </p>
            <div className="bg-gray-50 p-6 rounded-lg mb-6">
              <p className="text-muted-foreground">
                <strong>Email:</strong> info@VAClaimNavigator.com<br />
                <strong>Mail:</strong><br />
                VA Claim Navigator<br />
                1885 FM 2673 #H16<br />
                Canyon Lake, TX 78133<br />
                United States
              </p>
            </div>
            
            <h2 className="text-2xl font-serif font-bold text-primary mt-10 mb-4">12. How Can You Review, Update, Or Delete The Data We Collect From You?</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Based on applicable law, you may request access to, correction of, or deletion of your personal information. Please contact us using the information provided above.
            </p>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
