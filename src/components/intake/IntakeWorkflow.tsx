'use client';

import { useState } from 'react';
import { IntakeSession } from '@/services/TokenService';
import Step1Form from './Step1Form';
import Step2Form from './Step2Form';
import CompletionPage from './CompletionPage';

interface IntakeWorkflowProps {
  intakeSession: IntakeSession;
}

export default function IntakeWorkflow({ intakeSession }: IntakeWorkflowProps) {
  const [currentStep, setCurrentStep] = useState(() => {
    if (intakeSession.isCompleted) return 3;
    if (intakeSession.step1Completed) return 2;
    return 1;
  });

  const handleStep1Complete = () => {
    setCurrentStep(2);
    // Scroll to top when transitioning to next step
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStep2Complete = () => {
    setCurrentStep(3);
    // Scroll to top when transitioning to completion page
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Progress indicator
  const getStepStatus = (step: number) => {
    if (step < currentStep) return 'completed';
    if (step === currentStep) return 'current';
    return 'upcoming';
  };

  return (
    <div>
      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
              getStepStatus(1) === 'completed' 
                ? 'bg-green-500 text-white' 
                : getStepStatus(1) === 'current'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-300 text-gray-600'
            }`}>
              {getStepStatus(1) === 'completed' ? '✓' : '1'}
            </div>
            <span className="ml-2 text-sm font-medium text-gray-900">
              Personal Information
            </span>
          </div>
          
          <div className={`flex-1 h-1 mx-4 ${
            getStepStatus(2) !== 'upcoming' ? 'bg-green-500' : 'bg-gray-300'
          }`} />
          
          <div className="flex items-center">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
              getStepStatus(2) === 'completed' 
                ? 'bg-green-500 text-white' 
                : getStepStatus(2) === 'current'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-300 text-gray-600'
            }`}>
              {getStepStatus(2) === 'completed' ? '✓' : '2'}
            </div>
            <span className="ml-2 text-sm font-medium text-gray-900">
              Document Upload
            </span>
          </div>
        </div>
      </div>

      {/* Step content */}
      {currentStep === 1 && (
        <Step1Form 
          intakeSession={intakeSession} 
          onComplete={handleStep1Complete}
        />
      )}
      
      {currentStep === 2 && (
        <Step2Form 
          intakeSession={intakeSession} 
          onComplete={handleStep2Complete}
        />
      )}
      
      {currentStep === 3 && (
        <CompletionPage intakeSession={intakeSession} />
      )}
    </div>
  );
}