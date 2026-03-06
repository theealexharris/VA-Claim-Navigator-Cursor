import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function ComplianceNotice() {
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

          <h1 className="text-4xl font-serif font-bold text-primary mb-2">VA Claim Navigator – Software Platform Compliance Notice</h1>
          <p className="text-muted-foreground mb-8">VA Claim Navigator Software Legal Disclaimer, Platform Limitations, and User Acknowledgment</p>

          <div className="prose prose-lg max-w-none">
            <div className="bg-amber-50 border-l-4 border-secondary p-6 rounded-r-lg mb-8">
              <p className="text-muted-foreground leading-relaxed">
                VA Claim Navigator is a self-service software platform designed to assist veterans in generating and organizing personal supporting documents that may be used in connection with potential disability benefit claims submitted to the U.S. Department of Veterans Affairs ("VA").
              </p>
              <p className="text-muted-foreground leading-relaxed mt-4">
                This platform provides technology tools only and does not provide legal services, claims representation, or claim preparation services.
              </p>
            </div>

            <h2 className="text-2xl font-serif font-bold text-primary mt-10 mb-4">Nature of the Service</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              VA Claim Navigator provides automated software tools that assist users in creating and organizing supporting documentation through a subscription-based software platform.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-2">Available software tools include:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mb-4">
              <li>Statement in Support of Claim Builder</li>
              <li>Personal Impact Statement Generator</li>
              <li>Buddy Statement Generator</li>
              <li>Medical Evidence Organizer</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mb-4">
              These tools are designed to help veterans generate and organize their own documents for potential submission with a VA disability claim.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-6">
              All claims, documents, and communications with the VA must be reviewed, prepared, and submitted directly by the veteran or by an independently accredited representative.
            </p>

            <h2 className="text-2xl font-serif font-bold text-primary mt-10 mb-4">Compliance With Federal Law</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Federal law regulates when individuals or organizations may charge fees related to veterans' benefits claims.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Under 38 U.S.C. § 5904 and implementing regulations under 38 C.F.R. § 14.636, fees may generally not be charged for the preparation or prosecution of an initial claim for VA benefits unless the person providing representation is properly accredited and certain procedural requirements have been met.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-6">
              VA Claim Navigator operates solely as a technology provider and does not provide representation or assistance that would fall within the scope of regulated representation activities under these statutes and regulations.
            </p>

            <h2 className="text-2xl font-serif font-bold text-primary mt-10 mb-4">Activities VA Claim Navigator Does Not Perform</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">
              VA Claim Navigator does not engage in claim preparation or representation before the VA.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-2">Specifically, VA Claim Navigator does not:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mb-4">
              <li>Prepare or complete VA claim forms</li>
              <li>File or submit claims to the VA</li>
              <li>Communicate with the VA on behalf of users</li>
              <li>Provide legal advice regarding VA claims</li>
              <li>Provide individualized claim strategy or rating advice</li>
              <li>Represent veterans before the VA or any government agency</li>
              <li>Assist with appeals or claim prosecution</li>
              <li>Charge contingency fees or success-based fees</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mb-2">VA Claim Navigator never charges:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mb-6">
              <li>A percentage of VA disability compensation or benefits</li>
              <li>Fees tied to the approval, denial, or outcome of a claim</li>
              <li>Fees contingent on the rating percentage awarded by the VA</li>
            </ul>

            <h2 className="text-2xl font-serif font-bold text-primary mt-10 mb-4">Business Model and Fee Structure</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              VA Claim Navigator operates exclusively as a Software-as-a-Service (SaaS) platform.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-2">
              Any fees charged are solely for access to the technology platform and document-generation tools, including:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mb-4">
              <li>Software subscription access</li>
              <li>Automated document builder tools</li>
              <li>Evidence organization tools</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Fees are not related to the preparation, filing, outcome, or success of any VA disability claim.
            </p>

            <h2 className="text-2xl font-serif font-bold text-primary mt-10 mb-4">No Legal Advice or Accredited Representation</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              VA Claim Navigator is not a law firm, claims agent, or veterans service organization.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-2">The platform and its operators:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mb-4">
              <li>Are not accredited representatives under the accreditation program administered by the U.S. Department of Veterans Affairs Office of General Counsel</li>
              <li>Do not provide legal advice</li>
              <li>Do not provide claims consulting services</li>
              <li>Do not offer professional representation</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mb-4">
              All information generated by the platform is automatically produced software output for informational purposes only and should not be interpreted as legal advice, claims strategy, or professional representation.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Veterans seeking representation may choose to work with a VA-accredited attorney, claims agent, or a recognized Veterans Service Organization.
            </p>

            <h2 className="text-2xl font-serif font-bold text-primary mt-10 mb-4">No Affiliation With the Department of Veterans Affairs</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              VA Claim Navigator is a private technology platform and is not affiliated with, endorsed by, or approved by the U.S. Department of Veterans Affairs.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Use of VA terminology within the platform is strictly for informational and educational purposes.
            </p>

            <h2 className="text-2xl font-serif font-bold text-primary mt-10 mb-4">User Responsibility and Acknowledgment</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              By accessing or using VA Claim Navigator, the user acknowledges and agrees that:
            </p>
            <ol className="list-decimal pl-6 text-muted-foreground space-y-3 mb-6">
              <li>VA Claim Navigator provides software tools only for generating and organizing supporting documents.</li>
              <li>The platform does not prepare, file, or prosecute claims for VA disability benefits.</li>
              <li>
                The user is solely responsible for:
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Reviewing all generated documents</li>
                  <li>Determining whether documents are accurate and complete</li>
                  <li>Deciding whether to submit documents to the VA</li>
                  <li>Filing and managing their own VA disability claim</li>
                </ul>
              </li>
              <li>The user understands that the platform does not guarantee any outcome, including claim approval, denial, or disability rating.</li>
              <li>The user accepts full responsibility for any documents, statements, or materials submitted to the VA.</li>
            </ol>

            <h2 className="text-2xl font-serif font-bold text-primary mt-10 mb-4">Limitation of Outcome Expectations</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">Use of VA Claim Navigator does not guarantee:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mb-4">
              <li>Approval of a VA disability claim</li>
              <li>Any specific disability rating</li>
              <li>Any increase in benefits</li>
              <li>Any favorable determination by the VA</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Claim outcomes are determined solely by the U.S. Department of Veterans Affairs based on applicable laws, regulations, and evidence submitted.
            </p>

            <h2 className="text-2xl font-serif font-bold text-primary mt-10 mb-4">Summary of Platform Function</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              VA Claim Navigator provides technology tools that assist veterans in generating and organizing supporting documents that may be used in connection with a VA disability claim.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-6">
              The platform does not prepare, submit, prosecute, or represent claims before the VA, and all claims must be submitted directly by the veteran or through an accredited representative in accordance with federal law, including 38 U.S.C. § 5904 and 38 C.F.R. § 14.636.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
