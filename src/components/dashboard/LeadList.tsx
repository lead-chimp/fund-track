"use client";

import { Lead } from "./types";
import { LeadStatus } from "@prisma/client";

interface LeadListProps {
  leads: Lead[];
  loading: boolean;
  sortBy: string;
  sortOrder: "asc" | "desc";
  onSort: (field: string) => void;
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

export function LeadList({
  leads,
  loading,
  sortBy,
  sortOrder,
  onSort,
}: LeadListProps) {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const formatName = (lead: Lead) => {
    const parts = [lead.firstName, lead.lastName].filter(Boolean);
    return parts.length > 0 ? parts.join(" ") : "N/A";
  };

  const SortButton = ({
    field,
    children,
  }: {
    field: string;
    children: React.ReactNode;
  }) => (
    <button
      onClick={() => onSort(field)}
      className="group inline-flex items-center space-x-1 text-left font-medium text-gray-900 hover:text-gray-700"
    >
      <span>{children}</span>
      <span className="ml-2 flex-none rounded text-gray-400 group-hover:text-gray-500">
        {sortBy === field ? (
          sortOrder === "asc" ? (
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          )
        ) : (
          <svg
            className="h-4 w-4 opacity-0 group-hover:opacity-100"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </span>
    </button>
  );

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center space-x-4">
              <div className="h-4 bg-gray-200 rounded w-1/7"></div>
              <div className="h-4 bg-gray-200 rounded w-1/7"></div>
              <div className="h-4 bg-gray-200 rounded w-1/7"></div>
              <div className="h-4 bg-gray-200 rounded w-1/7"></div>
              <div className="h-4 bg-gray-200 rounded w-1/7"></div>
              <div className="h-4 bg-gray-200 rounded w-1/7"></div>
              <div className="h-4 bg-gray-200 rounded w-1/7"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      {/* Desktop Table */}
      <div className="hidden lg:block">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  <SortButton field="firstName">Name</SortButton>
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Contact
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  <SortButton field="businessName">Business</SortButton>
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  <SortButton field="status">Status</SortButton>
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  <SortButton field="createdAt">Created</SortButton>
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Activity
                </th>
                <th scope="col" className="relative px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap max-w-44">
                    <div className="text-xs font-medium text-gray-900 truncate">
                      {formatName(lead)}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      ID: {lead.id}{" "}
                      {lead.legacyLeadId && `(Legacy: ${lead.legacyLeadId})`}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap max-w-48">
                    <div className="text-xs text-gray-900 truncate">
                      {lead.email || "No email"}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      Phone: {lead.phone || "N/A"}
                    </div>
                    {lead.mobile && lead.mobile !== lead.phone && (
                      <div className="text-xs text-gray-500 truncate">
                        Mobile: {lead.mobile}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap max-w-40">
                    <div className="text-xs text-gray-900 truncate">
                      {lead.businessName || "N/A"}
                    </div>
                    {lead.industry && (
                      <div className="text-xs text-gray-500 truncate">
                        {lead.industry}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        STATUS_COLORS[lead.status]
                      }`}
                    >
                      {STATUS_LABELS[lead.status]}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-500 max-w-36">
                    <div className="text-gray-900 truncate">
                      {formatDate(lead.createdAt)}
                    </div>
                    {lead.updatedAt &&
                      lead.updatedAt.getTime() !== lead.createdAt.getTime() && (
                        <div className="text-gray-500 truncate">
                          Updated: {formatDate(lead.updatedAt)}
                        </div>
                      )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-500">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center">
                        <svg
                          className="h-4 w-4 text-gray-400 mr-1"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                          />
                        </svg>
                        {lead._count.notes}
                      </div>
                      <div className="flex items-center">
                        <svg
                          className="h-4 w-4 text-gray-400 mr-1"
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
                        {lead._count.documents}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-right text-xs font-medium">
                    <a
                      href={`/dashboard/leads/${lead.id}`}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      View
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tablet View */}
      <div className="hidden sm:block lg:hidden">
        <div className="bg-gray-50 px-4 py-3">
          <h3 className="text-sm font-medium text-gray-900">
            {leads.length} lead{leads.length !== 1 ? "s" : ""}
          </h3>
        </div>
        <div className="divide-y divide-gray-200">
          {leads.map((lead) => (
            <div key={lead.id} className="px-4 py-4 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {formatName(lead)}
                    </p>
                    <span
                      className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        STATUS_COLORS[lead.status]
                      }`}
                    >
                      {STATUS_LABELS[lead.status]}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
                    <div>
                      <div className="font-medium text-gray-700">Contact</div>
                      <div>{lead.email || "No email"}</div>
                      <div>{lead.phone || "No phone"}</div>
                      {lead.mobile && lead.mobile !== lead.phone && (
                        <div>Mobile: {lead.mobile}</div>
                      )}
                    </div>

                    <div>
                      <div className="font-medium text-gray-700">Business</div>
                      <div>{lead.businessName || "N/A"}</div>
                      <div>{lead.industry || "No industry"}</div>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center text-xs text-gray-500">
                    <div className="flex items-center mr-4">
                      <svg
                        className="h-4 w-4 text-gray-400 mr-1"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                        />
                      </svg>
                      {lead._count.notes} notes
                    </div>
                    <div className="flex items-center">
                      <svg
                        className="h-4 w-4 text-gray-400 mr-1"
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
                      {lead._count.documents} docs
                    </div>
                  </div>

                  <p className="text-xs text-gray-400 mt-1">
                    Created {formatDate(lead.createdAt)}
                  </p>
                </div>
                <div className="ml-4 flex-shrink-0">
                  <a
                    href={`/dashboard/leads/${lead.id}`}
                    className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                  >
                    View
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="sm:hidden">
        <div className="bg-gray-50 px-4 py-3">
          <h3 className="text-sm font-medium text-gray-900">
            {leads.length} lead{leads.length !== 1 ? "s" : ""}
          </h3>
        </div>
        <ul className="divide-y divide-gray-200">
          {leads.map((lead) => (
            <li key={lead.id} className="px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {formatName(lead)}
                    </p>
                    <span
                      className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        STATUS_COLORS[lead.status]
                      }`}
                    >
                      {STATUS_LABELS[lead.status]}
                    </span>
                  </div>
                  <div className="mt-1">
                    <p className="text-sm text-gray-500">
                      {lead.email || "No email"} • {lead.phone || "No phone"}
                    </p>
                    {lead.businessName && (
                      <p className="text-sm text-gray-500 mt-1">
                        {lead.businessName}{" "}
                        {lead.industry && `• ${lead.industry}`}
                      </p>
                    )}
                  </div>
                  <div className="mt-2 flex items-center text-sm text-gray-500">
                    <div className="flex items-center mr-4">
                      <svg
                        className="h-4 w-4 text-gray-400 mr-1"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                        />
                      </svg>
                      {lead._count.notes} notes
                    </div>
                    <div className="flex items-center">
                      <svg
                        className="h-4 w-4 text-gray-400 mr-1"
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
                      {lead._count.documents} docs
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Created {formatDate(lead.createdAt)}
                  </p>
                </div>
                <div className="ml-4 flex-shrink-0">
                  <a
                    href={`/dashboard/leads/${lead.id}`}
                    className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                  >
                    View
                  </a>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
