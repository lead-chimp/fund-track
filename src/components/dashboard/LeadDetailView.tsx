"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { LeadStatus, UserRole } from "@prisma/client";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { NotesSection } from "./NotesSection";
import StatusHistorySection from "./StatusHistorySection";
import { FollowUpActions } from "./FollowUpActions";

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
  legalEntity: string | null;
  industry: string | null;
  hasExistingLoans: string | null;
  personalAddress: string | null;
  personalZip: string | null;
  dateOfBirth: string | null;
  socialSecurity: string | null;
  legalName: string | null;
  yearsInBusiness: number | null;
  amountNeeded: number | null;
  monthlyRevenue: number | null;
  status: LeadStatus;
  intakeToken: string | null;
  intakeCompletedAt: string | null;
  step1CompletedAt: string | null;
  step2CompletedAt: string | null;
  step3CompletedAt: string | null;
  digitalSignature: string | null;
  signatureDate: string | null;
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLinks, setShareLinks] = useState<any[]>([]);
  const [generatingLink, setGeneratingLink] = useState(false);

  // Delete lead handler
  const deleteLead = async () => {
    if (!lead) return;

    const requiredText = "DELETE LEAD";
    if (deleteConfirmText !== requiredText) {
      alert(`Please type "${requiredText}" to confirm deletion.`);
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

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
    setDeleteConfirmText("");
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setDeleteConfirmText("");
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

  useEffect(() => {
    if (showShareModal) {
      fetchShareLinks();
    }
  }, [showShareModal]);

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
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-3">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600"></div>
            <div className="text-gray-600">Loading lead details...</div>
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

  const fetchShareLinks = async () => {
    try {
      const response = await fetch(`/api/leads/${leadId}/share`);
      if (response.ok) {
        const data = await response.json();
        setShareLinks(data.shareLinks || []);
      }
    } catch (error) {
      console.error("Error fetching share links:", error);
    }
  };

  const generateShareLink = async () => {
    try {
      setGeneratingLink(true);
      const response = await fetch(`/api/leads/${leadId}/share`, {
        method: "POST",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate share link");
      }

      const data = await response.json();
      await fetchShareLinks(); // Refresh the list

      // Copy to clipboard
      await navigator.clipboard.writeText(data.shareLink.url);
      alert("Share link generated and copied to clipboard!");
    } catch (error) {
      console.error("Error generating share link:", error);
      alert(
        error instanceof Error ? error.message : "Failed to generate share link"
      );
    } finally {
      setGeneratingLink(false);
    }
  };

  const deactivateShareLink = async (linkId: number) => {
    if (!confirm("Are you sure you want to deactivate this share link?")) {
      return;
    }

    try {
      const response = await fetch(
        `/api/leads/${leadId}/share?linkId=${linkId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to deactivate share link");
      }

      await fetchShareLinks(); // Refresh the list
      alert("Share link deactivated successfully");
    } catch (error) {
      console.error("Error deactivating share link:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to deactivate share link"
      );
    }
  };

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      alert("Link copied to clipboard!");
    } catch (error) {
      console.error("Error copying to clipboard:", error);
      alert("Failed to copy link to clipboard");
    }
  };

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
              Lead ID: {lead.id} • Legacy ID: {lead.legacyLeadId} • Campaign:{" "}
              {lead.campaignId}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowShareModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
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
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
                />
              </svg>
              Share Lead
            </button>
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
                    {lead.amountNeeded
                      ? `$${lead.amountNeeded.toLocaleString()}`
                      : "N/A"}
                  </div>
                  <div className="text-sm text-gray-500">Amount Requested</div>
                  {lead.monthlyRevenue && (
                    <div className="mt-1">
                      <div className="text-lg font-semibold text-gray-700">
                        ${lead.monthlyRevenue.toLocaleString()}/mo
                      </div>
                      <div className="text-xs text-gray-500">
                        Monthly Revenue
                      </div>
                    </div>
                  )}
                </div>

                {/* Business Info */}
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900">
                    {lead.businessName || "Business Name N/A"}
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
                        <a
                          href={`mailto:${lead.email}`}
                          className="text-indigo-600 hover:text-indigo-500"
                        >
                          {lead.email}
                        </a>
                      </div>
                    )}
                    {lead.phone && (
                      <div className="mb-1">
                        <a
                          href={`tel:${lead.phone}`}
                          className="text-indigo-600 hover:text-indigo-500"
                        >
                          {lead.phone}
                        </a>
                      </div>
                    )}
                  </div>
                  {(lead.businessCity || lead.businessState) && (
                    <div className="text-sm text-gray-500">
                      {[lead.businessCity, lead.businessState]
                        .filter(Boolean)
                        .join(", ")}
                    </div>
                  )}
                  {lead.hasExistingLoans && (
                    <div className="mt-2">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          lead.hasExistingLoans.toLowerCase() === "yes"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
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
                  <dt className="text-sm font-medium text-gray-500">
                    Full Name
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">{fullName}</dd>
                </div>
                {lead.legalName && lead.legalName !== fullName && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Legal Name
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {lead.legalName}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Personal Email
                  </dt>
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
                    <dt className="text-sm font-medium text-gray-500">
                      Business Email
                    </dt>
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
                    <dt className="text-sm font-medium text-gray-500">
                      Mobile
                    </dt>
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
                {lead.businessPhone &&
                  lead.businessPhone !== lead.phone &&
                  lead.businessPhone !== lead.mobile && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        Business Phone
                      </dt>
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
                    <dt className="text-sm font-medium text-gray-500">
                      Date of Birth
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {lead.dateOfBirth}
                    </dd>
                  </div>
                )}
                {lead.socialSecurity && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Social Security
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {lead.socialSecurity}
                    </dd>
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

                {lead.industry && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Industry
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {lead.industry}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Years in Business
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {lead.yearsInBusiness !== null
                      ? `${lead.yearsInBusiness} years`
                      : "N/A"}
                  </dd>
                </div>

                {lead.legalEntity && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Legal Entity
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {lead.legalEntity}
                    </dd>
                  </div>
                )}
                {lead.stateOfInc && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      State of Incorporation
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {lead.stateOfInc}
                    </dd>
                  </div>
                )}
                {lead.taxId && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Tax ID
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">{lead.taxId}</dd>
                  </div>
                )}
                {lead.ownershipPercentage && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Ownership Percentage
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {lead.ownershipPercentage}%
                    </dd>
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
                      <span className="text-gray-500 italic">
                        To be provided during intake
                      </span>
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
              <div className="space-y-6">
                {/* Enhanced Progress Timeline */}
                <div className="relative">
                  {/* Progress Steps */}
                  <div className="flex items-start justify-between">
                    {/* Step 1 */}
                    <div className="flex flex-col items-center text-center flex-1">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium mb-2 ${
                          lead.step1CompletedAt
                            ? "bg-green-500 text-white"
                            : "bg-gray-300 text-gray-600"
                        }`}
                      >
                        {lead.step1CompletedAt ? "✓" : "1"}
                      </div>
                      <div
                        className={`text-sm font-medium mb-1 ${
                          lead.step1CompletedAt
                            ? "text-green-700"
                            : "text-gray-500"
                        }`}
                      >
                        Business Info
                      </div>
                      {lead.step1CompletedAt && (
                        <div className="text-xs text-gray-500">
                          {formatDate(lead.step1CompletedAt)}
                        </div>
                      )}
                    </div>

                    {/* Connecting Line */}
                    <div
                      className={`flex-1 h-0.5 mt-5 mx-4 ${
                        lead.step2CompletedAt ? "bg-green-500" : "bg-gray-300"
                      }`}
                    ></div>

                    {/* Step 2 */}
                    <div className="flex flex-col items-center text-center flex-1">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium mb-2 ${
                          lead.step2CompletedAt
                            ? "bg-green-500 text-white"
                            : "bg-gray-300 text-gray-600"
                        }`}
                      >
                        {lead.step2CompletedAt ? "✓" : "2"}
                      </div>
                      <div
                        className={`text-sm font-medium mb-1 ${
                          lead.step2CompletedAt
                            ? "text-green-700"
                            : "text-gray-500"
                        }`}
                      >
                        Document Upload
                      </div>
                      {lead.step2CompletedAt && (
                        <div className="text-xs text-gray-500">
                          {formatDate(lead.step2CompletedAt)}
                        </div>
                      )}
                    </div>

                    {/* Connecting Line */}
                    <div
                      className={`flex-1 h-0.5 mt-5 mx-4 ${
                        lead.step3CompletedAt ? "bg-green-500" : "bg-gray-300"
                      }`}
                    ></div>

                    {/* Step 3 */}
                    <div className="flex flex-col items-center text-center flex-1">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium mb-2 ${
                          lead.step3CompletedAt
                            ? "bg-green-500 text-white"
                            : "bg-gray-300 text-gray-600"
                        }`}
                      >
                        {lead.step3CompletedAt ? "✓" : "3"}
                      </div>
                      <div
                        className={`text-sm font-medium mb-1 ${
                          lead.step3CompletedAt
                            ? "text-green-700"
                            : "text-gray-500"
                        }`}
                      >
                        Digital Signature
                      </div>
                      {lead.step3CompletedAt && (
                        <div className="text-xs text-gray-500">
                          {formatDate(lead.step3CompletedAt)}
                        </div>
                      )}
                    </div>

                    {/* Connecting Line */}
                    <div
                      className={`flex-1 h-0.5 mt-5 mx-4 ${
                        lead.intakeCompletedAt ? "bg-green-500" : "bg-gray-300"
                      }`}
                    ></div>

                    {/* Final Step */}
                    <div className="flex flex-col items-center text-center flex-1">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium mb-2 ${
                          lead.intakeCompletedAt
                            ? "bg-green-500 text-white"
                            : "bg-gray-300 text-gray-600"
                        }`}
                      >
                        {lead.intakeCompletedAt ? "✓" : "✓"}
                      </div>
                      <div
                        className={`text-sm font-medium mb-1 ${
                          lead.intakeCompletedAt
                            ? "text-green-700"
                            : "text-gray-500"
                        }`}
                      >
                        Application Complete
                      </div>
                      {lead.intakeCompletedAt && (
                        <div className="text-xs text-gray-500">
                          {formatDate(lead.intakeCompletedAt)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Completion Status Summary */}
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-700">
                    <strong>Application Status:</strong>{" "}
                    {lead.intakeCompletedAt ? (
                      <span className="text-green-600 font-medium">
                        Complete
                      </span>
                    ) : lead.step3CompletedAt ? (
                      <span className="text-blue-600 font-medium">
                        Digital signature complete, processing application
                      </span>
                    ) : lead.step2CompletedAt ? (
                      <span className="text-blue-600 font-medium">
                        Documents uploaded, pending digital signature
                      </span>
                    ) : lead.step1CompletedAt ? (
                      <span className="text-yellow-600 font-medium">
                        Basic info complete, documents pending
                      </span>
                    ) : (
                      <span className="text-gray-600 font-medium">
                        Not started
                      </span>
                    )}
                  </div>
                  {!lead.intakeCompletedAt && lead.intakeToken && (
                    <div className="mt-2 text-xs text-gray-500">
                      Prospect can continue at: {window.location.origin}
                      /application/{lead.intakeToken}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Digital Signature */}
          {lead.digitalSignature && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">
                  Digital Signature
                </h2>
              </div>
              <div className="px-6 py-4">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div>
                          <dt className="text-sm font-medium text-gray-500">
                            Signed By
                          </dt>
                          <dd className="mt-1 text-sm text-gray-900">
                            {lead.legalName ||
                              [lead.firstName, lead.lastName]
                                .filter(Boolean)
                                .join(" ") ||
                              "N/A"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">
                            Signature Date
                          </dt>
                          <dd className="mt-1 text-sm text-gray-900">
                            {lead.signatureDate
                              ? formatDate(lead.signatureDate)
                              : "N/A"}
                          </dd>
                        </div>
                      </dl>

                      <div>
                        <dt className="text-sm font-medium text-gray-500 mb-2">
                          Signature
                        </dt>
                        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                          <img
                            src={lead.digitalSignature}
                            alt="Digital Signature"
                            className="max-w-full h-auto max-h-32 border border-gray-300 rounded bg-white"
                            style={{ imageRendering: "crisp-edges" }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-200">
                    <div className="flex items-center text-sm text-green-700">
                      <svg
                        className="h-4 w-4 mr-2"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Digital signature completed and verified
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

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
                    {lead.amountNeeded !== null
                      ? `$${lead.amountNeeded.toLocaleString()}`
                      : "N/A"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Monthly Revenue
                  </dt>
                  <dd className="mt-1 text-xl font-semibold text-gray-900">
                    {lead.monthlyRevenue !== null
                      ? `$${lead.monthlyRevenue.toLocaleString()}`
                      : "N/A"}
                  </dd>
                </div>
                {lead.hasExistingLoans && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Existing Loans
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          lead.hasExistingLoans.toLowerCase() === "yes"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
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
                  <dt className="text-sm font-medium text-gray-500">Address</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {lead.personalAddress ? (
                      <div>
                        <div>{lead.personalAddress}</div>
                        <div>{lead.personalZip}</div>
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
                  if (!lead.businessAddress)
                    incompleteFields.push("Business Address");
                  if (!lead.businessPhone)
                    incompleteFields.push("Business Phone");
                  if (!lead.businessEmail)
                    incompleteFields.push("Business Email");

                  // Financial information
                  if (!lead.amountNeeded)
                    missingFields.push("Amount Requested");
                  if (!lead.monthlyRevenue)
                    missingFields.push("Monthly Revenue");
                  if (!lead.yearsInBusiness)
                    incompleteFields.push("Years in Business");

                  // Legal/Tax information
                  if (!lead.taxId) incompleteFields.push("Tax ID");
                  if (!lead.legalEntity) incompleteFields.push("Legal Entity");
                  if (!lead.ownershipPercentage)
                    incompleteFields.push("Ownership Percentage");

                  // Personal information
                  if (!lead.dateOfBirth) incompleteFields.push("Date of Birth");
                  if (!lead.socialSecurity)
                    incompleteFields.push("Social Security Number");
                  if (!lead.personalAddress)
                    incompleteFields.push("Personal Address");

                  const totalFields = 15; // Total expected fields
                  const completedFields =
                    totalFields -
                    missingFields.length -
                    incompleteFields.length;
                  const completionPercentage = Math.round(
                    (completedFields / totalFields) * 100
                  );

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
                            className={`h-2 rounded-full ${
                              completionPercentage >= 80
                                ? "bg-green-500"
                                : completionPercentage >= 60
                                ? "bg-yellow-500"
                                : "bg-red-500"
                            }`}
                            style={{ width: `${completionPercentage}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Missing Critical Fields */}
                      {missingFields.length > 0 && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                          <h4 className="text-sm font-medium text-red-800 mb-2">
                            Missing Critical Information:
                          </h4>
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
                          <h4 className="text-sm font-medium text-yellow-800 mb-2">
                            Incomplete Information:
                          </h4>
                          <ul className="text-sm text-yellow-700 space-y-1">
                            {incompleteFields.map((field, index) => (
                              <li key={index}>• {field}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* All Complete */}
                      {missingFields.length === 0 &&
                        incompleteFields.length === 0 && (
                          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center">
                              <svg
                                className="h-5 w-5 text-green-500 mr-2"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              <span className="text-sm font-medium text-green-800">
                                All information complete!
                              </span>
                            </div>
                          </div>
                        )}
                    </div>
                  );
                })()}
              </div>
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
                  allowedRoles={[
                    "ADMIN" as UserRole,
                    "USER" as UserRole,
                    "SYSTEM_ADMIN" as UserRole,
                  ]}
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
                allowedRoles={[
                  "ADMIN" as UserRole,
                  "USER" as UserRole,
                  "SYSTEM_ADMIN" as UserRole,
                ]}
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
                          allowedRoles={[
                            "ADMIN" as UserRole,
                            "USER" as UserRole,
                            "SYSTEM_ADMIN" as UserRole,
                          ]}
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
            parentLoading={loading}
          />

          {/* Follow-Up Actions */}
          <FollowUpActions
            leadId={leadId}
            leadEmail={lead.email}
            intakeToken={lead.intakeToken}
            hasFollowUps={lead._count.followupQueue > 0}
            onActionComplete={fetchLead}
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

              {/* Admin Actions */}
              <RoleGuard
                allowedRoles={["ADMIN" as UserRole, "SYSTEM_ADMIN" as UserRole]}
                fallback={<></>}
              >
                <div className="pt-4 mt-4 border-t border-gray-200">
                  {!showDeleteConfirm ? (
                    <button
                      onClick={handleDeleteClick}
                      className="w-full px-3 py-2 text-sm text-red-600 hover:text-white hover:bg-red-600 border border-red-600 rounded-md transition-colors duration-200 flex items-center justify-center space-x-2"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                      <span>Delete Lead</span>
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <h4 className="text-sm font-medium text-red-800 mb-2">
                          ⚠️ Confirm Lead Deletion
                        </h4>
                        <p className="text-xs text-red-700 mb-3">
                          This action cannot be undone. All notes, documents,
                          and history will be permanently deleted.
                        </p>
                        <p className="text-xs text-red-700 mb-2">
                          Type <strong>DELETE LEAD</strong> to confirm:
                        </p>
                        <input
                          type="text"
                          value={deleteConfirmText}
                          onChange={(e) => setDeleteConfirmText(e.target.value)}
                          placeholder="Type DELETE LEAD"
                          className="w-full px-2 py-1 text-sm border border-red-300 rounded focus:outline-none focus:border-red-500"
                          autoFocus
                        />
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={deleteLead}
                          disabled={deleteConfirmText !== "DELETE LEAD"}
                          className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors duration-200 ${
                            deleteConfirmText === "DELETE LEAD"
                              ? "bg-red-600 text-white hover:bg-red-700"
                              : "bg-gray-300 text-gray-500 cursor-not-allowed"
                          }`}
                        >
                          Confirm Delete
                        </button>
                        <button
                          onClick={cancelDelete}
                          className="flex-1 px-3 py-2 text-sm bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors duration-200"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </RoleGuard>
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

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Share Lead Information
                </h3>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-4">
                  Generate a secure link to share this lead's information and
                  documents with external parties. Links expire after 7 days and
                  can be deactivated at any time.
                </p>

                <button
                  onClick={generateShareLink}
                  disabled={generatingLink}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                >
                  {generatingLink ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2"></div>
                      Generating...
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
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                      Generate New Share Link
                    </>
                  )}
                </button>
              </div>

              {/* Active Share Links */}
              <div className="space-y-4">
                <h4 className="text-md font-medium text-gray-900">
                  Active Share Links
                </h4>
                {shareLinks.length > 0 ? (
                  <div className="space-y-3">
                    {shareLinks.map((link) => (
                      <div
                        key={link.id}
                        className="border border-gray-200 rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Active
                              </span>
                              <span className="text-xs text-gray-500">
                                Expires {formatDate(link.expiresAt)}
                              </span>
                            </div>
                            <div className="text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded border break-all">
                              {link.url}
                            </div>
                            <div className="mt-2 text-xs text-gray-500">
                              Created {formatDate(link.createdAt)} by{" "}
                              {link.createdBy} • Accessed {link.accessCount}{" "}
                              times
                              {link.accessedAt &&
                                ` • Last accessed ${formatDate(
                                  link.accessedAt
                                )}`}
                            </div>
                          </div>
                          <div className="ml-4 flex flex-col space-y-2">
                            <button
                              onClick={() => copyToClipboard(link.url)}
                              className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                            >
                              <svg
                                className="h-3 w-3 mr-1"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                />
                              </svg>
                              Copy
                            </button>
                            <button
                              onClick={() => deactivateShareLink(link.id)}
                              className="inline-flex items-center px-3 py-1 border border-red-300 shadow-sm text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50"
                            >
                              <svg
                                className="h-3 w-3 mr-1"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                              Deactivate
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">
                    No active share links
                  </p>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowShareModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
