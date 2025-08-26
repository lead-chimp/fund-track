"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { LeadStatus, UserRole } from "@prisma/client";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { NotesSection } from "./NotesSection";
import StatusHistorySection from "./StatusHistorySection";

interface LeadNote {
  id: number;
  content: string;
  createdAt: string;
  user: {
    id: number;
    email: string;
  };
}

interface Document {
  id: number;
  filename: string;
  originalFilename: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  user?: {
    id: number;
    email: string;
  };
}

interface LeadDetail {
  id: number;
  legacyLeadId: string;
  campaignId: number;
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  businessName: string | null;
  dba: string | null;
  businessAddress: string | null;
  businessPhone: string | null;
  businessEmail: string | null;
  mobile: string | null;
  businessCity: string | null;
  businessState: string | null;
  businessZip: string | null;
  ownershipPercentage: string | null;
  taxId: string | null;
  stateOfInc: string | null;
  dateBusinessStarted: string | null;
  legalEntity: string | null;
  natureOfBusiness: string | null;
  hasExistingLoans: string | null;
  personalAddress: string | null;
  personalCity: string | null;
  personalState: string | null;
  personalZip: string | null;
  dateOfBirth: string | null;
  socialSecurity: string | null;
  legalName: string | null;
  industry: string | null;
  yearsInBusiness: number | null;
  amountNeeded: number | null;
  monthlyRevenue: number | null;
  status: LeadStatus;
  intakeToken: string | null;
  intakeCompletedAt: string | null;
  step1CompletedAt: string | null;
  step2CompletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  importedAt: string;
  notes: LeadNote[];
  documents: Document[];
  _count: {
    notes: number;
    documents: number;
    followupQueue: number;
  };
}

interface LeadDetailViewProps {
  leadId: number;
}

const STATUS_COLORS: Record<LeadStatus, string> = {
  [LeadStatus.NEW]: "bg-blue-100 text-blue-800",
  [LeadStatus.PENDING]: "bg-yellow-100 text-yellow-800",
  [LeadStatus.IN_PROGRESS]: "bg-indigo-100 text-indigo-800",
  [LeadStatus.COMPLETED]: "bg-green-100 text-green-800",
  [LeadStatus.REJECTED]: "bg-red-100 text-red-800",
};

const STATUS_LABELS: Record<LeadStatus, string> = {
  [LeadStatus.NEW]: "New",
  [LeadStatus.PENDING]: "Pending",
  [LeadStatus.IN_PROGRESS]: "In Progress",
  [LeadStatus.COMPLETED]: "Completed",
  [LeadStatus.REJECTED]: "Rejected",
};

export function LeadDetailView({ leadId }: LeadDetailViewProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  const [uploadingFile, setUploadingFile] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);

  // Delete lead handler
  const deleteLead = async () => {
    if (!lead) return;
    if (
      !confirm(
        `Are you sure you want to delete this lead? This action cannot be undone.`
      )
    ) {
      return;
    }
    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete lead");
      }
      alert("Lead deleted successfully");
      router.push("/dashboard");
    } catch (err) {
      console.error("Error deleting lead:", err);
      alert(err instanceof Error ? err.message : "Failed to delete lead");
    }
  };

  const fetchLead = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/leads/${leadId}`);

      if (!response.ok) {
        if (response.status === 404) {
          setError("Lead not found");
        } else {
          throw new Error(`Failed to fetch lead: ${response.statusText}`);
        }
        return;
      }

      const data = await response.json();
      setLead(data.lead);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      console.error("Error fetching lead:", err);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    fetchLead();
  }, [leadId, fetchLead]);

  const handleStatusChange = useCallback(
    async (newStatus: LeadStatus, reason?: string) => {
      if (!lead) return;

      try {
        // Refresh the lead data to get the updated status and history
        await fetchLead();
      } catch (err) {
        console.error("Error refreshing lead after status change:", err);
      }
    },
    [lead, fetchLead]
  );

  const handleNotesUpdate = useCallback(
    (updatedNotes: LeadNote[], newCount: number) => {
      setLead((prev) =>
        prev
          ? {
            ...prev,
            notes: updatedNotes,
            _count: { ...prev._count, notes: newCount },
          }
          : null
      );
    },
    []
  );

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateString));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const downloadDocument = async (doc: Document) => {
    try {
      window.location.href = `/api/leads/${leadId}/documents/${doc.id}/download`;
    } catch (err) {
      console.error("Error downloading document:", err);
      alert("Failed to download document");
    }
  };

  const deleteDocument = async (doc: Document) => {
    if (
      !confirm(
        `Are you sure you want to delete "${doc.originalFilename}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `/api/leads/${leadId}/files?documentId=${doc.id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete document");
      }

      setLead((prev) =>
        prev
          ? {
            ...prev,
            documents: prev.documents.filter((d) => d.id !== doc.id),
            _count: { ...prev._count, documents: prev._count.documents - 1 },
          }
          : null
      );

      alert("Document deleted successfully");
    } catch (err) {
      console.error("Error deleting document:", err);
      alert(err instanceof Error ? err.message : "Failed to delete document");
    }
  };

  const uploadFile = async (file: File) => {
    if (!lead) return;

    try {
      setUploadingFile(true);

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`/api/leads/${leadId}/files`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to upload file");
      }

      const data = await response.json();
      setLead((prev) =>
        prev
          ? {
            ...prev,
            documents: [data.document, ...prev.documents],
            _count: { ...prev._count, documents: prev._count.documents + 1 },
          }
          : null
      );
      setShowUploadForm(false);
    } catch (err) {
      console.error("Error uploading file:", err);
      alert(err instanceof Error ? err.message : "Failed to upload file");
    } finally {
      setUploadingFile(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white shadow rounded-lg p-6">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div className="bg-white shadow rounded-lg p-6">
                <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-10 bg-gray-200 rounded w-full"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error loading lead
              </h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
              <div className="mt-4 flex space-x-3">
                <button
                  onClick={fetchLead}
                  className="text-sm text-red-800 hover:text-red-900 underline"
                >
                  Try again
                </button>
                <button
                  onClick={() => router.push("/dashboard")}
                  className="text-sm text-red-800 hover:text-red-900 underline"
                >
                  Back to dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!lead) {
    return null;
  }

  const fullName =
    [lead.firstName, lead.lastName].filter(Boolean).join(" ") || "N/A";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center text-sm text-gray-500 hover:text-gray-700 mb-2"
            >
              <svg
                className="h-4 w-4 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to leads
            </button>
            <h1 className="text-3xl font-bold text-gray-900">{fullName}</h1>
            <p className="text-sm text-gray-500">
              Lead ID: {lead.id} • Legacy ID: {lead.legacyLeadId} • Campaign: {lead.campaignId}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <span
              className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${STATUS_COLORS[lead.status]
                }`}
            >
              {STATUS_LABELS[lead.status]}
            </span>
            {/* Progress Indicators */}
            <div className="flex items-center space-x-2">
              {lead.step1CompletedAt && (
                <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                  ✓ Step 1
                </span>
              )}
              {lead.step2CompletedAt && (
                <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                  ✓ Step 2
                </span>
              )}
              {lead.intakeCompletedAt && (
                <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                  ✓ Completed
                </span>
              )}
            </div>
            {/* Delete Lead button for admins */}
            <RoleGuard allowedRoles={[UserRole.ADMIN]} fallback={<></>}>
              <button
                onClick={deleteLead}
                className="ml-4 px-3 py-1 text-sm text-red-600 hover:text-white hover:bg-red-600 border border-red-600 rounded"
              >
                Delete Lead
              </button>
            </RoleGuard>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Key Information Summary */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                Lead Summary
              </h2>
            </div>
            <div className="px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Financial Highlights */}
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {lead.amountNeeded ? `$${lead.amountNeeded.toLocaleString()}` : "N/A"}
                  </div>
                  <div className="text-sm text-gray-500">Amount Requested</div>
                  {lead.monthlyRevenue && (
                    <div className="mt-1">
                      <div className="text-lg font-semibold text-gray-700">
                        ${lead.monthlyRevenue.toLocaleString()}/mo
                      </div>
                      <div className="text-xs text-gray-500">Monthly Revenue</div>
                    </div>
                  )}
                </div>

                {/* Business Info */}
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900">
                    {lead.businessName || "Business Name N/A"}
                  </div>
                  <div className="text-sm text-gray-500">
                    {lead.industry || "Industry N/A"}
                  </div>
                  {lead.yearsInBusiness && (
                    <div className="mt-1">
                      <div className="text-lg font-semibold text-gray-700">
                        {lead.yearsInBusiness} years
                      </div>
                      <div className="text-xs text-gray-500">In Business</div>
                    </div>
                  )}
                  {lead.legalEntity && (
                    <div className="mt-1 text-xs text-gray-500">
                      {lead.legalEntity}
                    </div>
                  )}
                </div>

                {/* Contact & Location */}
                <div className="text-center">
                  <div className="text-sm text-gray-900">
                    {lead.email && (
                      <div className="mb-1">
                        <a href={`mailto:${lead.email}`} className="text-indigo-600 hover:text-indigo-500">
                          {lead.email}
                        </a>
                      </div>
                    )}
                    {lead.phone && (
                      <div className="mb-1">
                        <a href={`tel:${lead.phone}`} className="text-indigo-600 hover:text-indigo-500">
                          {lead.phone}
                        </a>
                      </div>
                    )}
                  </div>
                  {(lead.businessCity || lead.businessState) && (
                    <div className="text-sm text-gray-500">
                      {[lead.businessCity, lead.businessState].filter(Boolean).join(', ')}
                    </div>
                  )}
                  {lead.hasExistingLoans && (
                    <div className="mt-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${lead.hasExistingLoans.toLowerCase() === 'yes'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                        }`}>
                        Existing Loans: {lead.hasExistingLoans}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                Contact Information
              </h2>
            </div>
            <div className="px-6 py-4">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Full Name</dt>
                  <dd className="mt-1 text-sm text-gray-900">{fullName}</dd>
                </div>
                {lead.legalName && lead.legalName !== fullName && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Legal Name</dt>
                    <dd className="mt-1 text-sm text-gray-900">{lead.legalName}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-gray-500">Personal Email</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {lead.email ? (
                      <a
                        href={`mailto:${lead.email}`}
                        className="text-indigo-600 hover:text-indigo-500"
                      >
                        {lead.email}
                      </a>
                    ) : (
                      "N/A"
                    )}
                  </dd>
                </div>
                {lead.businessEmail && lead.businessEmail !== lead.email && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Business Email</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      <a
                        href={`mailto:${lead.businessEmail}`}
                        className="text-indigo-600 hover:text-indigo-500"
                      >
                        {lead.businessEmail}
                      </a>
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-gray-500">Phone</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {lead.phone ? (
                      <a
                        href={`tel:${lead.phone}`}
                        className="text-indigo-600 hover:text-indigo-500"
                      >
                        {lead.phone}
                      </a>
                    ) : (
                      "N/A"
                    )}
                  </dd>
                </div>
                {lead.mobile && lead.mobile !== lead.phone && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Mobile</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      <a
                        href={`tel:${lead.mobile}`}
                        className="text-indigo-600 hover:text-indigo-500"
                      >
                        {lead.mobile}
                      </a>
                    </dd>
                  </div>
                )}
                {lead.businessPhone && lead.businessPhone !== lead.phone && lead.businessPhone !== lead.mobile && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Business Phone</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      <a
                        href={`tel:${lead.businessPhone}`}
                        className="text-indigo-600 hover:text-indigo-500"
                      >
                        {lead.businessPhone}
                      </a>
                    </dd>
                  </div>
                )}
                {lead.dateOfBirth && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Date of Birth</dt>
                    <dd className="mt-1 text-sm text-gray-900">{lead.dateOfBirth}</dd>
                  </div>
                )}
                {lead.socialSecurity && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Social Security</dt>
                    <dd className="mt-1 text-sm text-gray-900">***-**-{lead.socialSecurity.slice(-4)}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          {/* Business Information */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                Business Information
              </h2>
            </div>
            <div className="px-6 py-4">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Business Name
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {lead.businessName || "N/A"}
                  </dd>
                </div>
                {lead.dba && lead.dba !== lead.businessName && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">DBA</dt>
                    <dd className="mt-1 text-sm text-gray-900">{lead.dba}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-gray-500">Industry</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {lead.industry || "N/A"}
                  </dd>
                </div>
                {lead.natureOfBusiness && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Nature of Business</dt>
                    <dd className="mt-1 text-sm text-gray-900">{lead.natureOfBusiness}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Years in Business
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {lead.yearsInBusiness !== null ? `${lead.yearsInBusiness} years` : "N/A"}
                  </dd>
                </div>
                {lead.dateBusinessStarted && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Business Start Date</dt>
                    <dd className="mt-1 text-sm text-gray-900">{lead.dateBusinessStarted}</dd>
                  </div>
                )}
                {lead.legalEntity && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Legal Entity</dt>
                    <dd className="mt-1 text-sm text-gray-900">{lead.legalEntity}</dd>
                  </div>
                )}
                {lead.stateOfInc && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">State of Incorporation</dt>
                    <dd className="mt-1 text-sm text-gray-900">{lead.stateOfInc}</dd>
                  </div>
                )}
                {lead.taxId && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Tax ID</dt>
                    <dd className="mt-1 text-sm text-gray-900">{lead.taxId}</dd>
                  </div>
                )}
                {lead.ownershipPercentage && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Ownership Percentage</dt>
                    <dd className="mt-1 text-sm text-gray-900">{lead.ownershipPercentage}%</dd>
                  </div>
                )}
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">
                    Business Address
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {lead.businessAddress ? (
                      <div>
                        <div>{lead.businessAddress}</div>
                        <div>
                          {lead.businessCity && `${lead.businessCity}, `}
                          {lead.businessState && `${lead.businessState} `}
                          {lead.businessZip}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-500 italic">To be provided during intake</span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Application Progress & Completion Status */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                Application Progress
              </h2>
            </div>
            <div className="px-6 py-4">
              <div className="space-y-4">
                {/* Progress Timeline */}
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${lead.step1CompletedAt ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <span className={`text-sm ${lead.step1CompletedAt ? 'text-green-700 font-medium' : 'text-gray-500'}`}>
                      Step 1: Business & Personal Info
                    </span>
                    {lead.step1CompletedAt && (
                      <span className="text-xs text-gray-500">
                        ({formatDate(lead.step1CompletedAt)})
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${lead.step2CompletedAt ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <span className={`text-sm ${lead.step2CompletedAt ? 'text-green-700 font-medium' : 'text-gray-500'}`}>
                      Step 2: Document Upload
                    </span>
                    {lead.step2CompletedAt && (
                      <span className="text-xs text-gray-500">
                        ({formatDate(lead.step2CompletedAt)})
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${lead.intakeCompletedAt ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <span className={`text-sm ${lead.intakeCompletedAt ? 'text-green-700 font-medium' : 'text-gray-500'}`}>
                      Application Complete
                    </span>
                    {lead.intakeCompletedAt && (
                      <span className="text-xs text-gray-500">
                        ({formatDate(lead.intakeCompletedAt)})
                      </span>
                    )}
                  </div>
                </div>

                {/* Completion Status Summary */}
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-700">
                    <strong>Application Status:</strong> {
                      lead.intakeCompletedAt ? (
                        <span className="text-green-600 font-medium">Complete</span>
                      ) : lead.step2CompletedAt ? (
                        <span className="text-blue-600 font-medium">Documents uploaded, pending final submission</span>
                      ) : lead.step1CompletedAt ? (
                        <span className="text-yellow-600 font-medium">Basic info complete, documents pending</span>
                      ) : (
                        <span className="text-gray-600 font-medium">Not started</span>
                      )
                    }
                  </div>
                  {!lead.intakeCompletedAt && lead.intakeToken && (
                    <div className="mt-2 text-xs text-gray-500">
                      Prospect can continue at: /application/{lead.intakeToken}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Financial Information */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                Financial Information
              </h2>
            </div>
            <div className="px-6 py-4">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">
                    Amount Needed
                  </dt>
                  <dd className="mt-1 text-3xl font-bold text-green-600">
                    {lead.amountNeeded !== null ? `$${lead.amountNeeded.toLocaleString()}` : "N/A"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Monthly Revenue
                  </dt>
                  <dd className="mt-1 text-xl font-semibold text-gray-900">
                    {lead.monthlyRevenue !== null ? `$${lead.monthlyRevenue.toLocaleString()}` : "N/A"}
                  </dd>
                </div>
                {lead.hasExistingLoans && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Existing Loans</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${lead.hasExistingLoans.toLowerCase() === 'yes'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                        }`}>
                        {lead.hasExistingLoans}
                      </span>
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          {/* Personal Address Information */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                Personal Address
              </h2>
            </div>
            <div className="px-6 py-4">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">
                    Address
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {lead.personalAddress ? (
                      <div>
                        <div>{lead.personalAddress}</div>
                        <div>
                          {lead.personalCity && `${lead.personalCity}, `}
                          {lead.personalState && `${lead.personalState} `}
                          {lead.personalZip}
                        </div>
                      </div>
                    ) : (
                      "N/A"
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Data Completeness Check */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                Information Completeness
              </h2>
            </div>
            <div className="px-6 py-4">
              <div className="space-y-3">
                {/* Check for missing critical information */}
                {(() => {
                  const missingFields = [];
                  const incompleteFields = [];

                  // Critical business information
                  if (!lead.businessName) missingFields.push("Business Name");
                  if (!lead.industry) missingFields.push("Industry");
                  if (!lead.businessAddress) incompleteFields.push("Business Address");
                  if (!lead.businessPhone) incompleteFields.push("Business Phone");
                  if (!lead.businessEmail) incompleteFields.push("Business Email");

                  // Financial information
                  if (!lead.amountNeeded) missingFields.push("Amount Requested");
                  if (!lead.monthlyRevenue) missingFields.push("Monthly Revenue");
                  if (!lead.yearsInBusiness) incompleteFields.push("Years in Business");

                  // Legal/Tax information
                  if (!lead.taxId) incompleteFields.push("Tax ID");
                  if (!lead.legalEntity) incompleteFields.push("Legal Entity");
                  if (!lead.ownershipPercentage) incompleteFields.push("Ownership Percentage");

                  // Personal information
                  if (!lead.dateOfBirth) incompleteFields.push("Date of Birth");
                  if (!lead.socialSecurity) incompleteFields.push("Social Security Number");
                  if (!lead.personalAddress) incompleteFields.push("Personal Address");

                  const totalFields = 15; // Total expected fields
                  const completedFields = totalFields - missingFields.length - incompleteFields.length;
                  const completionPercentage = Math.round((completedFields / totalFields) * 100);

                  return (
                    <div>
                      {/* Completion Progress Bar */}
                      <div className="mb-4">
                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                          <span>Information Completeness</span>
                          <span>{completionPercentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${completionPercentage >= 80 ? 'bg-green-500' :
                              completionPercentage >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                            style={{ width: `${completionPercentage}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Missing Critical Fields */}
                      {missingFields.length > 0 && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                          <h4 className="text-sm font-medium text-red-800 mb-2">Missing Critical Information:</h4>
                          <ul className="text-sm text-red-700 space-y-1">
                            {missingFields.map((field, index) => (
                              <li key={index}>• {field}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Incomplete Optional Fields */}
                      {incompleteFields.length > 0 && (
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <h4 className="text-sm font-medium text-yellow-800 mb-2">Incomplete Information:</h4>
                          <ul className="text-sm text-yellow-700 space-y-1">
                            {incompleteFields.map((field, index) => (
                              <li key={index}>• {field}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* All Complete */}
                      {missingFields.length === 0 && incompleteFields.length === 0 && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center">
                            <svg className="h-5 w-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm font-medium text-green-800">All information complete!</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Lead Metadata */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                Lead Details & Timeline
              </h2>
            </div>
            <div className="px-6 py-4">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Created</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {formatDate(lead.createdAt)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Last Updated
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {formatDate(lead.updatedAt)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Imported
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {formatDate(lead.importedAt)}
                  </dd>
                </div>
                {lead.step1CompletedAt && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Step 1 Completed
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {formatDate(lead.step1CompletedAt)}
                    </dd>
                  </div>
                )}
                {lead.step2CompletedAt && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Step 2 Completed
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {formatDate(lead.step2CompletedAt)}
                    </dd>
                  </div>
                )}
                {lead.intakeCompletedAt && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Intake Completed
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {formatDate(lead.intakeCompletedAt)}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Legacy Lead ID
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {lead.legacyLeadId}
                  </dd>
                </div>
                {lead.intakeToken && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Intake Token
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 font-mono">
                      {lead.intakeToken}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          {/* Documents */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">
                  Documents ({lead._count.documents})
                </h2>
                <RoleGuard
                  allowedRoles={[UserRole.ADMIN, UserRole.USER]}
                  fallback={<></>}
                >
                  <button
                    onClick={() => setShowUploadForm(!showUploadForm)}
                    className="text-sm text-indigo-600 hover:text-indigo-500"
                  >
                    Upload Document
                  </button>
                </RoleGuard>
              </div>
            </div>
            <div className="px-6 py-4">
              {/* File Upload Form */}
              <RoleGuard
                allowedRoles={[UserRole.ADMIN, UserRole.USER]}
                fallback={<></>}
              >
                {showUploadForm && (
                  <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <h3 className="text-sm font-medium text-gray-900 mb-3">
                      Upload Document
                    </h3>
                    <div className="space-y-3">
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.docx"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            uploadFile(file);
                          }
                        }}
                        disabled={uploadingFile}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                      />
                      <p className="text-xs text-gray-500">
                        Supported formats: PDF, JPG, PNG, DOCX (max 10MB)
                      </p>
                      {uploadingFile && (
                        <p className="text-sm text-indigo-600">Uploading...</p>
                      )}
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => setShowUploadForm(false)}
                          disabled={uploadingFile}
                          className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </RoleGuard>

              {lead.documents.length > 0 ? (
                <div className="space-y-3">
                  {lead.documents.map((document) => (
                    <div
                      key={document.id}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <svg
                            className="h-8 w-8 text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {document.originalFilename}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(document.fileSize)} • Uploaded{" "}
                            {formatDate(document.uploadedAt)}
                            {document.user && ` by ${document.user.email}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => downloadDocument(document)}
                          className="text-sm text-indigo-600 hover:text-indigo-500"
                        >
                          Download
                        </button>
                        <RoleGuard
                          allowedRoles={[UserRole.ADMIN, UserRole.USER]}
                          fallback={<></>}
                        >
                          <button
                            onClick={() => deleteDocument(document)}
                            className="text-sm text-red-600 hover:text-red-500"
                          >
                            Delete
                          </button>
                        </RoleGuard>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  No documents uploaded yet.
                </p>
              )}
            </div>
          </div>

          {/* Notes */}
          <NotesSection
            leadId={leadId}
            notes={lead.notes}
            notesCount={lead._count.notes}
            onNotesUpdate={handleNotesUpdate}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status History */}
          <StatusHistorySection
            leadId={leadId}
            currentStatus={lead.status}
            onStatusChange={handleStatusChange}
          />

          {/* Activity Summary */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                Activity Summary
              </h2>
            </div>
            <div className="px-6 py-4">
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Notes</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {lead._count.notes}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Documents</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {lead._count.documents}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Follow-ups</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {lead._count.followupQueue}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Intake Link */}
          {lead.intakeToken && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">
                  Intake Link
                </h2>
              </div>
              <div className="px-6 py-4">
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Share this link with the prospect to complete their
                    application:
                  </p>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={`${window.location.origin}/application/${lead.intakeToken}`}
                      readOnly
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md bg-gray-50"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(
                          `${window.location.origin}/application/${lead.intakeToken}`
                        );
                        alert("Link copied to clipboard!");
                      }}
                      className="px-3 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}