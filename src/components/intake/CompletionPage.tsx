'use client';

import { IntakeSession } from '@/services/TokenService';

interface CompletionPageProps {
    intakeSession: IntakeSession;
}

export default function CompletionPage({ intakeSession }: CompletionPageProps) {
    return (
        <div className="text-center py-8">
            <div className="mb-6">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Application Completed!
                </h2>

                <p className="text-gray-600 mb-6">
                    Thank you for completing your merchant funding application.
                    Our team will review your information and contact you soon.
                </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 text-left">
                <h3 className="font-semibold text-gray-900 mb-3">What happens next?</h3>
                <ul className="space-y-2 text-gray-600">
                    <li className="flex items-start">
                        <span className="text-green-500 mr-2">•</span>
                        Our team will review your application within 1-2 business hours
                    </li>
                    <li className="flex items-start">
                        <span className="text-green-500 mr-2">•</span>
                        A funding specialist will contact you to discuss next steps
                    </li>
                </ul>
            </div>

            <div className="mt-6 text-sm text-gray-500">
                <p>
                    Questions? Contact us at{' '}
                    <a href="mailto:support@merchantfunding.com" className="text-blue-600 hover:underline">
                        support@merchantfunding.com
                    </a>
                </p>
            </div>
        </div>
    );
}