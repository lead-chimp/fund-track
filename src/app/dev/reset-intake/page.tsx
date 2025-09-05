"use client";

import { useState, useEffect } from "react";

interface Lead {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  businessName: string;
  status: string;
  intakeToken: string;
  step1CompletedAt: string | null;
  step2CompletedAt: string | null;
  step3CompletedAt: string | null;
  intakeCompletedAt: string | null;
  createdAt: string;
}

interface ResetResult {
  success: boolean;
  message?: string;
  error?: string;
  resetCount?: number;
  resetLeads?: Lead[];
}

export default function ResetIntakePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResetResult | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    try {
      const response = await fetch("/api/dev/reset-intake");
      const data = await response.json();
      setLeads(data.leads || []);
    } catch (error) {
      console.error("Failed to load leads:", error);
    }
  };

  const resetIntakeForSelected = async () => {
    if (selectedLeads.length === 0) {
      alert("Please select at least one lead to reset.");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/dev/reset-intake", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "reset-intake",
          leadIds: selectedLeads,
        }),
      });

      const data = await response.json();
      setResult(data);

      if (data.success) {
        // Reload leads to reflect changes
        setTimeout(loadLeads, 1000);
        setSelectedLeads([]);
      }
    } catch (error) {
      setResult({
        success: false,
        error:
          "Network error: " +
          (error instanceof Error ? error.message : "Unknown error"),
      });
    } finally {
      setLoading(false);
    }
  };

  const resetIntakeForAll = async () => {
    const filteredLeads = getFilteredLeads();
    if (filteredLeads.length === 0) {
      alert("No leads match the current filter criteria.");
      return;
    }

    const confirmMessage = `This will reset the entire intake process for ${filteredLeads.length} leads. Are you sure you want to continue?`;
    if (!confirm(confirmMessage)) {
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/dev/reset-intake", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "reset-intake-all",
          filters: {
            search: searchTerm,
            status: statusFilter,
          },
        }),
      });

      const data = await response.json();
      setResult(data);

      if (data.success) {
        // Reload leads to reflect changes
        setTimeout(loadLeads, 1000);
        setSelectedLeads([]);
      }
    } catch (error) {
      setResult({
        success: false,
        error:
          "Network error: " +
          (error instanceof Error ? error.message : "Unknown error"),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const filteredLeads = getFilteredLeads();
      setSelectedLeads(filteredLeads.map((lead) => lead.id));
    } else {
      setSelectedLeads([]);
    }
  };

  const handleSelectLead = (leadId: number, checked: boolean) => {
    if (checked) {
      setSelectedLeads((prev) => [...prev, leadId]);
    } else {
      setSelectedLeads((prev) => prev.filter((id) => id !== leadId));
    }
  };

  const getFilteredLeads = () => {
    return leads.filter((lead) => {
      const matchesSearch =
        searchTerm === "" ||
        `${lead.firstName} ${lead.lastName}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.businessName?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || lead.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  };

  const filteredLeads = getFilteredLeads();
  const selectedCount = selectedLeads.length;
  const totalFiltered = filteredLeads.length;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Reset Intake Process
          </h1>

          <div className="bg-orange-50 border border-orange-200 rounded-md p-4 mb-6">
            <h3 className="font-medium text-orange-800 mb-2">
              ⚠️ Warning - Development Tool
            </h3>
            <p className="text-orange-700 text-sm">
              This tool allows you to reset the intake process completion status
              for leads. Resetting the intake process will:
            </p>
            <ul className="list-disc list-inside text-orange-700 text-sm mt-2 space-y-1">
              <li>
                Clear the <code>step1_completed_at</code>, <code>step2_completed_at</code>, and{" "}
                <code>step3_completed_at</code> timestamps
              </li>
              <li>
                Clear the <code>intake_completed_at</code> timestamp
              </li>
              <li>
                Clear digital signature and signature date
              </li>
              <li>Allow leads to go through the entire intake process again</li>
              <li>
                Reset lead status to PENDING if currently IN_PROGRESS or
                COMPLETED
              </li>
              <li>Create a record in the lead status history</li>
            </ul>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, email, or business"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status Filter
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="NEW">New</option>
                <option value="PENDING">Pending</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={loadLeads}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Refresh Data
              </button>
            </div>
          </div>

          {/* Selection Summary */}
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm text-gray-600">
              Showing {totalFiltered} leads ({selectedCount} selected)
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => resetIntakeForSelected()}
                disabled={loading || selectedCount === 0}
                className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
              >
                {loading
                  ? "Processing..."
                  : `Reset Selected (${selectedCount})`}
              </button>

              <button
                onClick={() => resetIntakeForAll()}
                disabled={loading || totalFiltered === 0}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
              >
                {loading
                  ? "Processing..."
                  : `Reset All Filtered (${totalFiltered})`}
              </button>
            </div>
          </div>

          {/* Result Display */}
          {result && (
            <div
              className={`mb-6 p-4 rounded-md ${
                result.success
                  ? "bg-green-50 border border-green-200"
                  : "bg-red-50 border border-red-200"
              }`}
            >
              <h3
                className={`font-medium ${
                  result.success ? "text-green-800" : "text-red-800"
                }`}
              >
                {result.success ? "Success!" : "Error"}
              </h3>
              <p
                className={`mt-1 text-sm ${
                  result.success ? "text-green-700" : "text-red-700"
                }`}
              >
                {result.success ? (
                  <>
                    {result.message}
                    {result.resetCount && (
                      <>
                        <br />
                        Reset {result.resetCount} lead(s) successfully.
                      </>
                    )}
                  </>
                ) : (
                  result.error || "Unknown error occurred"
                )}
              </p>
            </div>
          )}
        </div>

        {/* Leads Table */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Leads</h2>

            <label className="flex items-center text-sm">
              <input
                type="checkbox"
                checked={selectedCount === totalFiltered && totalFiltered > 0}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="mr-2"
              />
              Select All ({totalFiltered})
            </label>
          </div>

          {filteredLeads.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              {leads.length === 0
                ? "No leads found."
                : "No leads match the current filters."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Select
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Lead
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Intake Progress
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredLeads.map((lead) => (
                    <tr
                      key={lead.id}
                      className={
                        selectedLeads.includes(lead.id) ? "bg-blue-50" : ""
                      }
                    >
                      <td className="px-3 py-4">
                        <input
                          type="checkbox"
                          checked={selectedLeads.includes(lead.id)}
                          onChange={(e) =>
                            handleSelectLead(lead.id, e.target.checked)
                          }
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {lead.firstName} {lead.lastName}
                        </div>
                        <div className="text-sm text-gray-500">
                          ID: {lead.id}
                        </div>
                        {lead.businessName && (
                          <div className="text-sm text-gray-500">
                            {lead.businessName}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {lead.email}
                        </div>
                        <div className="text-sm text-gray-500">
                          {lead.phone}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            lead.status === "COMPLETED"
                              ? "bg-green-100 text-green-800"
                              : lead.status === "IN_PROGRESS"
                              ? "bg-blue-100 text-blue-800"
                              : lead.status === "PENDING"
                              ? "bg-yellow-100 text-yellow-800"
                              : lead.status === "REJECTED"
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {lead.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs space-y-1">
                          <div
                            className={`flex items-center ${
                              lead.step1CompletedAt
                                ? "text-green-600"
                                : "text-gray-400"
                            }`}
                          >
                            <div
                              className={`w-2 h-2 rounded-full mr-2 ${
                                lead.step1CompletedAt
                                  ? "bg-green-500"
                                  : "bg-gray-300"
                              }`}
                            ></div>
                            Step 1:{" "}
                            {lead.step1CompletedAt ? "Complete" : "Pending"}
                          </div>
                          <div
                            className={`flex items-center ${
                              lead.step2CompletedAt
                                ? "text-green-600"
                                : "text-gray-400"
                            }`}
                          >
                            <div
                              className={`w-2 h-2 rounded-full mr-2 ${
                                lead.step2CompletedAt
                                  ? "bg-green-500"
                                  : "bg-gray-300"
                              }`}
                            ></div>
                            Step 2:{" "}
                            {lead.step2CompletedAt ? "Complete" : "Pending"}
                          </div>
                          <div
                            className={`flex items-center ${
                              lead.step3CompletedAt
                                ? "text-green-600"
                                : "text-gray-400"
                            }`}
                          >
                            <div
                              className={`w-2 h-2 rounded-full mr-2 ${
                                lead.step3CompletedAt
                                  ? "bg-green-500"
                                  : "bg-gray-300"
                              }`}
                            ></div>
                            Step 3:{" "}
                            {lead.step3CompletedAt ? "Complete" : "Pending"}
                          </div>
                          <div
                            className={`flex items-center ${
                              lead.intakeCompletedAt
                                ? "text-green-600"
                                : "text-gray-400"
                            }`}
                          >
                            <div
                              className={`w-2 h-2 rounded-full mr-2 ${
                                lead.intakeCompletedAt
                                  ? "bg-green-500"
                                  : "bg-gray-300"
                              }`}
                            ></div>
                            Intake:{" "}
                            {lead.intakeCompletedAt ? "Complete" : "Pending"}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(lead.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
