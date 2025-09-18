"use client";

import { useState } from "react";
import { LeadStatus } from "@prisma/client";

interface ShareViewProps {
  shareLink: {
    id: number;
    token: string;
    expiresAt: Date;
    accessCount: number;
    lead: {
      id: number;
      firstName: string | null;
      lastName: string | null;
      businessName: string | null;
      email: string | null;
      phone: string | null;
      businessPhone: string | null;
      mobile: string | null;
      businessEmail: string | null;
      businessAddress: string | null;
      businessCity: string | null;
      businessState: string | null;
      businessZip: string | null;
      personalAddress: string | null;
      personalZip: string | null;
      industry: string | null;
      legalEntity: string | null;
      yearsInBusiness: number | null;
      amountNeeded: string | null;
      monthlyRevenue: string | null;
      hasExistingLoans: string | null;
      taxId: string | null;
      stateOfInc: string | null;
      ownershipPercentage: string | null;
      dateOfBirth: string | null;
      dba: string | null;
      legalName: string | null;
      status: LeadStatus;
      step1CompletedAt: Date | null;
      step2CompletedAt: Date | null;
      step3CompletedAt: Date | null;
      digitalSignature: string | null;
      signatureDate: Date | null;
      createdAt: Date;
      documents: Array<{
        id: number;
        filename: string;
        originalFilename: string;
        fileSize: number;
        mimeType: string;
        uploadedAt: Date;
      }>;
      statusHistory: Array<{
        id: number;
        previousStatus: LeadStatus | null;
        newStatus: LeadStatus;
        reason: string | null;
        createdAt: Date;
        user: {
          email: string;
        };
      }>;
    };
  };
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

export function ShareView({ shareLink }: ShareViewProps) {
  const { lead } = shareLink;
  const [downloadingDoc, setDownloadingDoc] = useState<number | null>(null);

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(dateObj);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const downloadDocument = async (doc: any) => {
    try {
      setDownloadingDoc(doc.id);
      
      const response = await fetch(`/api/share/${shareLink.token}/documents/${doc.id}`);
      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.originalFilename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading document:", error);
      alert("Failed to download document");
    } finally {
      setDownloadingDoc(null);
    }
  };

  const fullName = [lead.firstName, lead.lastName].filter(Boolean).join(" ") || "N/A";
  const expiresAt = new Date(shareLink.expiresAt);
  const isExpiringSoon = (expiresAt.getTime() - Date.now()) < 24 * 60 * 60 * 1000; // Less than 24 hours

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Lead Information</h1>
              <p className="text-sm text-gray-500 mt-1">
                Secure access expires {formatDate(expiresAt)}
                {isExpiringSoon && (
                  <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    Expires Soon
                  </span>
                )}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Fund Track</div>
              <div className="text-xs text-gray-400">Secure Share</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Lead Summary */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-gray-900">Lead Summary</h2>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[lead.status]}`}>
                    {STATUS_LABELS[lead.status]}
                  </span>
                </div>
              </div>
              <div className="px-6 py-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Financial Info */}
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {lead.amountNeeded ? `$${parseInt(lead.amountNeeded).toLocaleString()}` : "N/A"}
                    </div>
                    <div className="text-sm text-gray-500">Amount Requested</div>
                    {lead.monthlyRevenue && (
                      <div className="mt-1">
                        <div className="text-lg font-semibold text-gray-700">
                          ${parseInt(lead.monthlyRevenue).toLocaleString()}/mo
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
                    {lead.yearsInBusiness && (
                      <div className="mt-1">
                        <div className="text-lg font-semibold text-gray-700">
                          {lead.yearsInBusiness} years
                        </div>
                        <div className="text-xs text-gray-500">In Business</div>
                      </div>
                    )}
                    {lead.legalEntity && (
                      <div className="mt-1 text-xs text-gray-500">{lead.legalEntity}</div>
                    )}
                  </div>

                  {/* Contact Info */}
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
                        {[lead.businessCity, lead.businessState].filter(Boolean).join(", ")}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Contact Information</h2>
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
                    <dt className="text-sm font-medium text-gray-500">Email</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {lead.email ? (
                        <a href={`mailto:${lead.email}`} className="text-indigo-600 hover:text-indigo-500">
                          {lead.email}
                        </a>
                      ) : "N/A"}
                    </dd>
                  </div>
                  {lead.businessEmail && lead.businessEmail !== lead.email && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Business Email</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        <a href={`mailto:${lead.businessEmail}`} className="text-indigo-600 hover:text-indigo-500">
                          {lead.businessEmail}
                        </a>
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Phone</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {lead.phone ? (
                        <a href={`tel:${lead.phone}`} className="text-indigo-600 hover:text-indigo-500">
                          {lead.phone}
                        </a>
                      ) : "N/A"}
                    </dd>
                  </div>
                  {lead.mobile && lead.mobile !== lead.phone && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Mobile</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        <a href={`tel:${lead.mobile}`} className="text-indigo-600 hover:text-indigo-500">
                          {lead.mobile}
                        </a>
                      </dd>
                    </div>
                  )}
                  {lead.businessPhone && lead.businessPhone !== lead.phone && lead.businessPhone !== lead.mobile && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Business Phone</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        <a href={`tel:${lead.businessPhone}`} className="text-indigo-600 hover:text-indigo-500">
                          {lead.businessPhone}
                        </a>
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>

            {/* Business Information */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Business Information</h2>
              </div>
              <div className="px-6 py-4">
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Business Name</dt>
                    <dd className="mt-1 text-sm text-gray-900">{lead.businessName || "N/A"}</dd>
                  </div>
                  {lead.dba && lead.dba !== lead.businessName && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">DBA</dt>
                      <dd className="mt-1 text-sm text-gray-900">{lead.dba}</dd>
                    </div>
                  )}
                  {lead.industry && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Industry</dt>
                      <dd className="mt-1 text-sm text-gray-900">{lead.industry}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Years in Business</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {lead.yearsInBusiness !== null ? `${lead.yearsInBusiness} years` : "N/A"}
                    </dd>
                  </div>
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
                    <dt className="text-sm font-medium text-gray-500">Business Address</dt>
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
                        "N/A"
                      )}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Application Progress */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Application Progress</h2>
              </div>
              <div className="px-6 py-4">
                <div className="relative">
                  <div className="flex items-start justify-between">
                    {/* Step 1 */}
                    <div className="flex flex-col items-center text-center flex-1">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium mb-2 ${
                        lead.step1CompletedAt ? "bg-green-500 text-white" : "bg-gray-300 text-gray-600"
                      }`}>
                        {lead.step1CompletedAt ? "✓" : "1"}
                      </div>
                      <div className={`text-sm font-medium mb-1 ${
                        lead.step1CompletedAt ? "text-green-700" : "text-gray-500"
                      }`}>
                        Business Info
                      </div>
                      {lead.step1CompletedAt && (
                        <div className="text-xs text-gray-500">
                          {formatDate(lead.step1CompletedAt)}
                        </div>
                      )}
                    </div>

                    <div className={`flex-1 h-0.5 mt-5 mx-4 ${
                      lead.step2CompletedAt ? "bg-green-500" : "bg-gray-300"
                    }`}></div>

                    {/* Step 2 */}
                    <div className="flex flex-col items-center text-center flex-1">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium mb-2 ${
                        lead.step2CompletedAt ? "bg-green-500 text-white" : "bg-gray-300 text-gray-600"
                      }`}>
                        {lead.step2CompletedAt ? "✓" : "2"}
                      </div>
                      <div className={`text-sm font-medium mb-1 ${
                        lead.step2CompletedAt ? "text-green-700" : "text-gray-500"
                      }`}>
                        Document Upload
                      </div>
                      {lead.step2CompletedAt && (
                        <div className="text-xs text-gray-500">
                          {formatDate(lead.step2CompletedAt)}
                        </div>
                      )}
                    </div>

                    <div className={`flex-1 h-0.5 mt-5 mx-4 ${
                      lead.step3CompletedAt ? "bg-green-500" : "bg-gray-300"
                    }`}></div>

                    {/* Step 3 */}
                    <div className="flex flex-col items-center text-center flex-1">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium mb-2 ${
                        lead.step3CompletedAt ? "bg-green-500 text-white" : "bg-gray-300 text-gray-600"
                      }`}>
                        {lead.step3CompletedAt ? "✓" : "3"}
                      </div>
                      <div className={`text-sm font-medium mb-1 ${
                        lead.step3CompletedAt ? "text-green-700" : "text-gray-500"
                      }`}>
                        Digital Signature
                      </div>
                      {lead.step3CompletedAt && (
                        <div className="text-xs text-gray-500">
                          {formatDate(lead.step3CompletedAt)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Documents */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">
                  Documents ({lead.documents.length})
                </h2>
              </div>
              <div className="px-6 py-4">
                {lead.documents.length > 0 ? (
                  <div className="space-y-3">
                    {lead.documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {doc.originalFilename}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(doc.fileSize)} • {formatDate(doc.uploadedAt)}
                          </p>
                        </div>
                        <button
                          onClick={() => downloadDocument(doc)}
                          disabled={downloadingDoc === doc.id}
                          className="ml-3 inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                        >
                          {downloadingDoc === doc.id ? (
                            <>
                              <div className="h-3 w-3 animate-spin rounded-full border border-gray-300 border-t-gray-600 mr-1"></div>
                              Downloading...
                            </>
                          ) : (
                            <>
                              <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              Download
                            </>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">No documents uploaded yet</p>
                )}
              </div>
            </div>

            {/* Recent Status Changes */}
            {lead.statusHistory.length > 0 && (
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900">Recent Status Changes</h2>
                </div>
                <div className="px-6 py-4">
                  <div className="space-y-3">
                    {lead.statusHistory.map((change) => (
                      <div key={change.id} className="text-sm">
                        <div className="flex items-center justify-between">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[change.newStatus]}`}>
                            {STATUS_LABELS[change.newStatus]}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDate(change.createdAt)}
                          </span>
                        </div>
                        {change.reason && (
                          <p className="mt-1 text-xs text-gray-600">{change.reason}</p>
                        )}
                        <p className="text-xs text-gray-500">by {change.user.email}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}