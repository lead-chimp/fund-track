"use client";

import { useState } from "react";
import { UserRole } from "@prisma/client";
import { RoleGuard } from "@/components/auth/RoleGuard";

interface FollowUpActionsProps {
  leadId: number;
  leadEmail: string | null;
  intakeToken: string | null;
  hasFollowUps: boolean;
  onActionComplete?: () => void;
}

export function FollowUpActions({
  leadId,
  leadEmail,
  intakeToken,
  hasFollowUps,
  onActionComplete,
}: FollowUpActionsProps) {
  const [restartingFollowUps, setRestartingFollowUps] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailConfigError, setEmailConfigError] = useState<string | null>(null);

  const handleRestartFollowUps = async () => {
    if (
      !confirm(
        "Are you sure you want to restart the follow-up sequence? This will cancel any pending follow-ups and schedule new ones."
      )
    ) {
      return;
    }

    try {
      setRestartingFollowUps(true);

      const response = await fetch(`/api/leads/${leadId}/follow-ups`, {
        method: "POST",
      });

      if (!response.ok) {
        let errorMessage = "Failed to restart follow-ups";

        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (parseError) {
          // If response is not JSON, use status text or default message
          if (response.status === 429) {
            errorMessage =
              "Too many requests. Please wait a moment and try again.";
          } else {
            errorMessage = response.statusText || errorMessage;
          }
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      alert(
        `Follow-up sequence restarted successfully. ${data.scheduledCount} follow-ups scheduled.`
      );

      if (onActionComplete) {
        onActionComplete();
      }
    } catch (error) {
      console.error("Error restarting follow-ups:", error);
      alert(
        error instanceof Error ? error.message : "Failed to restart follow-ups"
      );
    } finally {
      setRestartingFollowUps(false);
    }
  };

  const handleSendIntakeEmail = async () => {
    if (!leadEmail) {
      alert("This lead has no email address on file.");
      return;
    }

    if (!intakeToken) {
      alert("This lead has no intake token. Cannot send intake link.");
      return;
    }

    if (!confirm(`Send intake email to ${leadEmail}?`)) {
      return;
    }

    try {
      setSendingEmail(true);

      const response = await fetch(`/api/leads/${leadId}/send-intake-email`, {
        method: "POST",
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || "Failed to send email";
        const errorDetails = errorData.details ? ` (${errorData.details})` : "";
        throw new Error(`${errorMessage}${errorDetails}`);
      }

      const data = await response.json();
      alert(`Intake email sent successfully to ${data.recipient}`);

      if (onActionComplete) {
        onActionComplete();
      }
    } catch (error) {
      console.error("Error sending intake email:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to send intake email";

      // Show more helpful error messages and set persistent error state
      if (errorMessage.includes("not properly configured")) {
        setEmailConfigError(
          "Email service is not configured. Please contact your system administrator."
        );
      } else if (errorMessage.includes("Mailgun client not initialized")) {
        setEmailConfigError(
          "Email service is not available. Please contact your system administrator."
        );
      } else {
        alert(`Failed to send intake email: ${errorMessage}`);
      }
    } finally {
      setSendingEmail(false);
    }
  };

  const canSendEmail = leadEmail && intakeToken;
  const isLoading = restartingFollowUps || sendingEmail;

  return (
    <RoleGuard
      allowedRoles={[
        "ADMIN" as UserRole,
        "USER" as UserRole,
        "SYSTEM_ADMIN" as UserRole,
      ]}
      fallback={<></>}
    >
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            Follow-Up Actions
          </h2>
        </div>
        <div className="px-6 py-4 space-y-4">
          {/* Send One-Off Email */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">
              Send Intake Email
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Send an immediate email with the intake link to the lead.
            </p>
            <button
              onClick={handleSendIntakeEmail}
              disabled={!canSendEmail || isLoading}
              className={`w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md transition-colors duration-200 ${
                canSendEmail && !isLoading
                  ? "text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  : "text-gray-400 bg-gray-100 cursor-not-allowed"
              }`}
            >
              {sendingEmail ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2"></div>
                  Sending Email...
                </>
              ) : (
                <>
                  <svg
                    className="h-4 w-4 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  Send Intake Email
                </>
              )}
            </button>
            {!canSendEmail && (
              <p className="text-xs text-gray-500 mt-1">
                {!leadEmail && "No email address available. "}
                {!intakeToken && "No intake token available."}
              </p>
            )}
            {emailConfigError && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                {emailConfigError}
              </div>
            )}
          </div>

          {/* Restart Follow-Up Sequence */}
          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-2">
              Restart Follow-Up Sequence
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Cancel any pending follow-ups and restart the automated email
              sequence (3h, 9h, 24h, 72h).
            </p>
            <button
              onClick={handleRestartFollowUps}
              disabled={isLoading}
              className={`w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md transition-colors duration-200 ${
                !isLoading
                  ? "text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  : "text-gray-400 bg-gray-100 cursor-not-allowed"
              }`}
            >
              {restartingFollowUps ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2"></div>
                  Restarting...
                </>
              ) : (
                <>
                  <svg
                    className="h-4 w-4 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Restart Follow-Ups
                </>
              )}
            </button>
            {hasFollowUps && (
              <p className="text-xs text-yellow-600 mt-1">
                ⚠️ This will cancel {hasFollowUps ? "existing" : "any"} pending
                follow-ups
              </p>
            )}
          </div>

          {/* Info Section */}
          <div className="pt-4 border-t border-gray-200">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-blue-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    Follow-Up Information
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <ul className="list-disc list-inside space-y-1">
                      <li>
                        Follow-ups are only sent to leads with PENDING status
                      </li>
                      <li>Automated sequence: 3h → 9h → 24h → 72h intervals</li>
                      <li>One-off emails can be sent regardless of status</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
