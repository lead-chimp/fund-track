/* eslint-disable @next/next/no-img-element */
import { notFound } from "next/navigation";
import { TokenService } from "@/services/TokenService";
import IntakeWorkflow from "@/components/intake/IntakeWorkflow";

interface IntakePageProps {
  params: Promise<{
    token: string;
  }>;
}

export default async function IntakePage({ params }: IntakePageProps) {
  const { token } = await params;

  // Validate token and get intake session data
  const intakeSession = await TokenService.validateToken(token);

  if (!intakeSession) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Top Security Badge */}
          <div className="flex items-center justify-center mb-6">
            <div className="bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100 flex items-center space-x-2">
              <svg
                className="w-5 h-5 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              <span className="text-sm font-medium text-gray-600">
                256-bit Secure Application
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-gray-100">
            {/* Header Section */}
            <div className="bg-white px-8 py-6 border-b">
              <div className="flex items-center justify-between">
                <img
                  src="https://www.merchantfunding.com/images/merchant-funding-logo.png"
                  alt="Merchant Funding Logo"
                  className="w-auto"
                />
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1">
                    <svg
                      className="w-4 h-4 text-green-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-sm text-gray-600">SSL Secure</span>
                  </div>
                  <div className="h-4 w-px bg-gray-200"></div>
                  <div className="flex items-center space-x-1">
                    <svg
                      className="w-4 h-4 text-green-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-sm text-gray-600">Encrypted</span>
                  </div>
                </div>
              </div>
              <div className="mt-6">
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                  Secure Business Funding Application
                </h1>
                <p className="mt-3 text-lg text-gray-600">
                  Complete your application in two simple steps. Your
                  information is protected by enterprise-grade encryption.
                </p>
              </div>
            </div>

            {/* Form Content */}
            <div className="p-8">
              <IntakeWorkflow intakeSession={intakeSession} />
            </div>

            {/* Footer */}
            <div className="px-8 py-6 bg-gray-50 border-t border-gray-100">
              <div className="max-w-3xl mx-auto">
                {/* Trust Indicators */}
                <div className="flex items-center justify-center space-x-6 mb-6">
                  <div className="flex items-center space-x-2">
                    <svg
                      className="w-5 h-5 text-green-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-sm text-gray-600">
                      Enterprise Security
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <svg
                      className="w-5 h-5 text-green-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-sm text-gray-600">
                      256-bit Encryption
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <svg
                      className="w-5 h-5 text-green-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                    </svg>
                    <span className="text-sm text-gray-600">
                      Expert Support
                    </span>
                  </div>
                </div>

                {/* Disclaimer Text - Only show when intake is not completed */}
                {!intakeSession.isCompleted && (
                  <div className="text-xs text-gray-500 leading-relaxed bg-gray-100 p-4 rounded-lg mb-4">
                    <p>
                      By signing, each of the above listed business and business
                      owners/officer(s) (individually and/or collectively,
                      &ldquo;you&rdquo;) authorize Elixir Capital, LLC D/B/A http://MerchantFunding.com  
                      and each of its representatives, successors, assigns,
                      designees and finance providers with whom MerchantFunding has, or may
                      in the future enter into, brokerage relationships
                      (&ldquo;Recipients&rdquo;), to:
                    </p>
                    <ul className="list-decimal ml-4 mt-2 space-y-1">
                      <li>
                        obtain consumer, business and investigative reports and
                        other information about you, including credit pulls
                        (hard or soft), from one or more consumer reporting
                        agencies, such as TransUnion, Experian and Equifax;
                      </li>
                      <li>
                        obtain credit card processor statements and bank
                        statements from banks, creditors and other third
                        parties;
                      </li>
                      <li>
                        obtain the release, by any creditor or financial
                        institution, of any information relating to you, to any
                        Recipients;
                      </li>
                      <li>
                        transmit this application form, along with any of the
                        foregoing information obtained in connection with this
                        application, to any Recipients;
                      </li>
                      <li>
                        contact you via e-mail, call and/or text-message at the
                        e-mail address and/or phone number provided above, or at
                        any e-mail address and/or phone number reasonably
                        identified as belonging to you, including wireless
                        numbers (if applicable), even if listed on a Do-Not-Call
                        registry, using an automated telephone dialing system or
                        other similar system with respect to this application,
                        future-related commercial-financing opportunities and/or
                        other lawful telemarketing purposes.
                      </li>
                    </ul>
                  </div>
                )}

                {/* Contact Support */}
                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    Need assistance? Our funding experts are here to help at{" "}
                    <span className="font-medium">
                      support@merchantfunding.com or +1 888-867-3087
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
