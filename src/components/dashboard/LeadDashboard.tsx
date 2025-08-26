"use client"

import { useState, useEffect, useCallback } from "react"
import { LeadSearchFilters } from "./LeadSearchFilters"
import { LeadList } from "./LeadList"
import { Pagination } from "./Pagination"
import { Lead, LeadFilters, PaginationInfo } from "./types"

export function LeadDashboard() {
    const [leads, setLeads] = useState<Lead[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [filters, setFilters] = useState<LeadFilters>({
        search: "",
        status: "",
        dateFrom: "",
        dateTo: ""
    })
    const [pagination, setPagination] = useState<PaginationInfo>({
        page: 1,
        limit: 10,
        totalCount: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false
    })
    const [sortBy, setSortBy] = useState<string>("createdAt")
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

    const fetchLeads = useCallback(async () => {
        setLoading(true)
        setError(null)

        try {
            const params = new URLSearchParams({
                page: pagination.page.toString(),
                limit: pagination.limit.toString(),
                ...(filters.search && { search: filters.search }),
                ...(filters.status && { status: filters.status }),
                ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
                ...(filters.dateTo && { dateTo: filters.dateTo }),
                sortBy,
                sortOrder
            })

            const response = await fetch(`/api/leads?${params}`)

            if (!response.ok) {
                throw new Error(`Failed to fetch leads: ${response.statusText}`)
            }

            const data = await response.json()

            // Convert date strings back to Date objects
            const processedLeads = data.leads.map((lead: any) => ({
                ...lead,
                createdAt: new Date(lead.createdAt),
                updatedAt: new Date(lead.updatedAt),
                importedAt: new Date(lead.importedAt),
                intakeCompletedAt: lead.intakeCompletedAt ? new Date(lead.intakeCompletedAt) : null,
                step1CompletedAt: lead.step1CompletedAt ? new Date(lead.step1CompletedAt) : null,
                step2CompletedAt: lead.step2CompletedAt ? new Date(lead.step2CompletedAt) : null,
                // Keep legacyLeadId as string since BigInt can't be serialized
                legacyLeadId: lead.legacyLeadId
            }))

            setLeads(processedLeads)
            setPagination(data.pagination)
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred")
            console.error("Error fetching leads:", err)
        } finally {
            setLoading(false)
        }
    }, [filters, pagination.page, pagination.limit, sortBy, sortOrder])

    useEffect(() => {
        fetchLeads()
    }, [fetchLeads])

    const handleFiltersChange = (newFilters: LeadFilters) => {
        setFilters(newFilters)
        setPagination(prev => ({ ...prev, page: 1 })) // Reset to first page when filters change
    }

    const handlePageChange = (page: number) => {
        setPagination(prev => ({ ...prev, page }))
    }

    const handleLimitChange = (limit: number) => {
        setPagination(prev => ({ ...prev, limit, page: 1 }))
    }

    const handleSort = (field: string) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === "asc" ? "desc" : "asc")
        } else {
            setSortBy(field)
            setSortOrder("desc")
        }
    }

    const handleClearFilters = () => {
        setFilters({
            search: "",
            status: "",
            dateFrom: "",
            dateTo: ""
        })
        setPagination(prev => ({ ...prev, page: 1 }))
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white shadow rounded-lg p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Lead Management</h2>
                        <p className="mt-1 text-xs text-gray-600">
                            Manage and track all merchant funding leads
                        </p>
                    </div>
                    <div className="mt-4 sm:mt-0">
                        <div className="flex items-center space-x-4 text-xs text-gray-600">
                            <span>Total: {pagination.totalCount}</span>
                            <span>•</span>
                            <span>Page {pagination.page} of {pagination.totalPages}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="bg-white shadow rounded-lg p-6">
                <LeadSearchFilters
                    filters={filters}
                    onFiltersChange={handleFiltersChange}
                    onClearFilters={handleClearFilters}
                    loading={loading}
                />
            </div>

            {/* Error State */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <h3 className="text-xs font-medium text-red-800">Error loading leads</h3>
                            <p className="mt-1 text-xs text-red-700">{error}</p>
                            <button
                                onClick={fetchLeads}
                                className="mt-2 text-xs text-red-800 hover:text-red-900 underline"
                            >
                                Try again
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Lead List */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
                <LeadList
                    leads={leads}
                    loading={loading}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                />
            </div>

            {/* Pagination */}
            {!loading && leads.length > 0 && (
                <div className="bg-white shadow rounded-lg p-4">
                    <Pagination
                        pagination={pagination}
                        onPageChange={handlePageChange}
                        onLimitChange={handleLimitChange}
                    />
                </div>
            )}

            {/* Empty State */}
            {!loading && !error && leads.length === 0 && (
                <div className="bg-white shadow rounded-lg p-12">
                    <div className="text-center">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <h3 className="mt-2 text-xs font-medium text-gray-900">No leads found</h3>
                        <p className="mt-1 text-xs text-gray-500">
                            {Object.values(filters).some(f => f)
                                ? "Try adjusting your search filters to find leads."
                                : "No leads have been imported yet."
                            }
                        </p>
                        {Object.values(filters).some(f => f) && (
                            <button
                                onClick={handleClearFilters}
                                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-xs font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
                            >
                                Clear filters
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}