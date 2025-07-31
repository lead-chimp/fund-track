import { notFound } from 'next/navigation';
import { TokenService } from '@/services/TokenService';
import IntakeWorkflow from '@/components/intake/IntakeWorkflow';

interface IntakePageProps {
  params: {
    token: string;
  };
}

export default async function IntakePage({ params }: IntakePageProps) {
  const { token } = params;

  // Validate token and get intake session data
  const intakeSession = await TokenService.validateToken(token);

  if (!intakeSession) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Fund Track Application
              </h1>
              <p className="text-gray-600">
                Complete your application in two simple steps
              </p>
            </div>
            
            <IntakeWorkflow intakeSession={intakeSession} />
          </div>
        </div>
      </div>
    </div>
  );
}