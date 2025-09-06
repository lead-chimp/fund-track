'use client';

import { useState, useRef, useEffect } from 'react';
import { IntakeSession } from '@/services/TokenService';

interface Step3FormProps {
  intakeSession: IntakeSession;
  onComplete: () => void;
}

export default function Step3Form({ intakeSession, onComplete }: Step3FormProps) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [signature, setSignature] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null);
  const [hasActualSignature, setHasActualSignature] = useState(false);
  const [strokeCount, setStrokeCount] = useState(0);
  
  // Ref for focusing on the legal name field when there's an error
  const legalNameRef = useRef<HTMLInputElement>(null);

  // Initialize legal name with existing value or combine first/last name
  const [legalName, setLegalName] = useState<string>(() => {
    if (intakeSession.lead.legalName) {
      return intakeSession.lead.legalName;
    }
    // Fallback to combining first and last name if legalName is empty
    const firstName = intakeSession.lead.firstName || '';
    const lastName = intakeSession.lead.lastName || '';
    return `${firstName} ${lastName}`.trim();
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 400;
    canvas.height = 200;

    // Set drawing styles
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Fill with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Load existing signature if available
    if (intakeSession.lead.digitalSignature) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        setSignature(intakeSession.lead.digitalSignature!);
        setHasActualSignature(true);
      };
      img.src = intakeSession.lead.digitalSignature;
    }
  }, [intakeSession.lead.digitalSignature]);

  const getCanvasPoint = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      // Touch event
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    } else {
      // Mouse event
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDrawing(true);
    const point = getCanvasPoint(e);
    setLastPoint(point);
    // Start a new stroke
    setStrokeCount(prev => prev + 1);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing || !lastPoint) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const currentPoint = getCanvasPoint(e);

    // Only draw if there's actual movement (not just hovering)
    const distance = Math.sqrt(
      Math.pow(currentPoint.x - lastPoint.x, 2) +
      Math.pow(currentPoint.y - lastPoint.y, 2)
    );

    if (distance > 1) { // Minimum movement threshold
      ctx.beginPath();
      ctx.moveTo(lastPoint.x, lastPoint.y);
      ctx.lineTo(currentPoint.x, currentPoint.y);
      ctx.stroke();

      // Mark that we have actual drawing activity
      setHasActualSignature(true);
    }

    setLastPoint(currentPoint);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    setLastPoint(null);

    // Save signature as base64 only if we have actual signature content
    const canvas = canvasRef.current;
    if (canvas && hasActualSignature) {
      const dataURL = canvas.toDataURL('image/png');
      setSignature(dataURL);
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setSignature('');
    setHasActualSignature(false);
    setStrokeCount(0);
  };

  // Validate that signature has meaningful content
  const isSignatureValid = () => {
    if (!signature || !hasActualSignature) return false;

    // Check if we have enough strokes for a meaningful signature
    if (strokeCount < 3) return false;

    // Additional check: ensure the signature isn't just a blank canvas
    const canvas = canvasRef.current;
    if (!canvas) return false;

    const ctx = canvas.getContext('2d');
    if (!ctx) return false;

    // Get image data and check if there are non-white pixels
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Check for any non-white pixels (accounting for anti-aliasing)
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const alpha = data[i + 3];

      // If we find a pixel that's not white or transparent, we have content
      if (alpha > 0 && (r < 250 || g < 250 || b < 250)) {
        return true;
      }
    }

    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isSignatureValid()) {
      setError('Please provide a valid digital signature by drawing your name in the signature box');
      // Focus on the signature canvas area after a small delay
      setTimeout(() => {
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      return;
    }

    if (!legalName.trim()) {
      setError('Please provide your legal name');
      // Focus on the legal name field after a small delay
      setTimeout(() => {
        if (legalNameRef.current) {
          legalNameRef.current.focus();
          legalNameRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/api/intake/${intakeSession.token}/step3`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          digitalSignature: signature,
          legalName: legalName.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save signature');
      }

      onComplete();
    } catch (error) {
      console.error('Error submitting step 3:', error);
      setError(error instanceof Error ? error.message : 'There was an error saving your signature. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Digital Signature
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Please sign below to complete your application. Your signature confirms that all information provided is accurate and complete.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Terms and Conditions */}
          <div className="border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Terms and Conditions
            </h3>
            <div className="text-sm text-gray-700 space-y-3 max-h-40 overflow-y-auto">
              <p>
                By signing below, I acknowledge and agree to the following:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>All information provided in this application is true, accurate, and complete to the best of my knowledge.</li>
                <li>I authorize the company to verify the information provided and to obtain credit reports and other financial information as necessary.</li>
                <li>I understand that any false or misleading information may result in the rejection of my application.</li>
                <li>I agree to the terms and conditions of the funding agreement if approved.</li>
                <li>I understand that this application does not guarantee approval for funding.</li>
              </ul>
            </div>
          </div>

          {/* Signature Pad */}
          <div className="border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Your Signature
            </h3>
            <div className="space-y-4">
              <div className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
                <div className="relative">
                  <canvas
                    ref={canvasRef}
                    className="border border-gray-400 bg-white rounded cursor-crosshair w-full max-w-md mx-auto block"
                    style={{ touchAction: 'none' }}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                  />
                  {!hasActualSignature && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <p className="text-gray-400 text-sm bg-white px-2 py-1 rounded shadow-sm">
                        Draw your signature here
                      </p>
                    </div>
                  )}
                </div>
                <div className="text-center mt-2">
                  <p className="text-xs text-gray-500">
                    Sign above using your mouse or finger
                  </p>
                  {hasActualSignature && (
                    <p className="text-xs text-green-600 mt-1">
                      ✓ Signature captured
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={clearSignature}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                  disabled={isSubmitting}
                >
                  Clear Signature
                </button>
              </div>
            </div>
          </div>

          {/* Legal Name Confirmation */}
          <div className="border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Signature Confirmation
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Legal Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  ref={legalNameRef}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="Enter your full legal name"
                  disabled={isSubmitting}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                  {new Date().toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting || !isSignatureValid() || !legalName.trim()}
              className={`px-6 py-2 rounded-md font-medium text-sm transition-colors ${isSignatureValid() && legalName.trim() && !isSubmitting
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
            >
              {isSubmitting ? 'Submitting...' : 'Complete Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}