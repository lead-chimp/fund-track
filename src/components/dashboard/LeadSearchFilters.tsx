"use client"

import { useState, useEffect, useCallback } from "react"
import { LeadFilters } from "./types"

interface LeadSearchFiltersProps {
  filters: LeadFilters
  onFiltersChange: (filters: LeadFilters) => void
  onClearFilters: () => void
  loading: boolean
}

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "new", label: "New" },
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "rejected", label: "Rejected" }
]

export function LeadSearchFilters({ 
  filters, 
  onFiltersChange, 
  onClearFilters, 
  loading 
}: LeadSearchFiltersProps) {
  const [localFilters, setLocalFilters] = useState<LeadFilters>(filters)
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null)

  // Update local filters when props change
  useEffect(() => {
    setLocalFilters(filters)
  }, [filters])

  // Debounced search
  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }

    const timeout = setTimeout(() => {
      onFiltersChange(localFilters)
    }, 300) // 300ms debounce

    setSearchTimeout(timeout)

    return () => {
      if (timeout) {
        clearTimeout(timeout)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localFilters.search]) // Only depend on search term for debouncing

  // Immediate update for non-search filters
  useEffect(() => {
    onFiltersChange(localFilters)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localFilters.status, localFilters.dateFrom, localFilters.dateTo]) // Only depend on non-search filters

  const handleInputChange = (field: keyof LeadFilters, value: string) => {
    setLocalFilters(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const hasActiveFilters = Object.values(localFilters).some(value => value !== "")

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
  <h3 className="text-base font-medium text-gray-900">Search & Filter</h3>
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            disabled={loading}
            className="mt-2 sm:mt-0 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Clear All
          </button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-4 lg:items-end">
        {/* Search Input */}
        <div className="flex-1 lg:min-w-0">
          <label htmlFor="search" className="block text-xs font-medium text-gray-700">
            Search
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              id="search"
              value={localFilters.search}
              onChange={(e) => handleInputChange("search", e.target.value)}
              placeholder="Search by name, email, phone, or business..."
              disabled={loading}
              className="block w-full pl-10 pr-3 py-1.5 border border-gray-300 rounded-md text-xs leading-4 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {localFilters.search && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <button
                  onClick={() => handleInputChange("search", "")}
                  disabled={loading}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Status Filter */}
        <div className="lg:w-40">
          <label htmlFor="status" className="block text-xs font-medium text-gray-700">
            Status
          </label>
          <select
            id="status"
            value={localFilters.status}
            onChange={(e) => handleInputChange("status", e.target.value)}
            disabled={loading}
            className="mt-1 block w-full pl-3 pr-10 py-1.5 text-xs border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {STATUS_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Date From */}
        <div className="lg:w-36">
          <label htmlFor="dateFrom" className="block text-xs font-medium text-gray-700">
            Date From
          </label>
          <input
            type="date"
            id="dateFrom"
            value={localFilters.dateFrom}
            onChange={(e) => handleInputChange("dateFrom", e.target.value)}
            disabled={loading}
            className="mt-1 block w-full px-3 py-1.5 border border-gray-300 rounded-md shadow-sm text-xs focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Date To */}
        <div className="lg:w-36">
          <label htmlFor="dateTo" className="block text-xs font-medium text-gray-700">
            Date To
          </label>
          <input
            type="date"
            id="dateTo"
            value={localFilters.dateTo}
            onChange={(e) => handleInputChange("dateTo", e.target.value)}
            disabled={loading}
            min={localFilters.dateFrom || undefined}
            className="mt-1 block w-full px-3 py-1.5 border border-gray-300 rounded-md shadow-sm text-xs focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
          <span className="text-xs text-gray-500">Active filters:</span>
          {localFilters.search && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Search: &quot;{localFilters.search}&quot;
              <button
                onClick={() => handleInputChange("search", "")}
                className="ml-1 text-blue-600 hover:text-blue-800"
              >
                ×
              </button>
            </span>
          )}
          {localFilters.status && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Status: {STATUS_OPTIONS.find(opt => opt.value === localFilters.status)?.label}
              <button
                onClick={() => handleInputChange("status", "")}
                className="ml-1 text-green-600 hover:text-green-800"
              >
                ×
              </button>
            </span>
          )}
          {localFilters.dateFrom && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              From: {localFilters.dateFrom}
              <button
                onClick={() => handleInputChange("dateFrom", "")}
                className="ml-1 text-purple-600 hover:text-purple-800"
              >
                ×
              </button>
            </span>
          )}
          {localFilters.dateTo && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              To: {localFilters.dateTo}
              <button
                onClick={() => handleInputChange("dateTo", "")}
                className="ml-1 text-purple-600 hover:text-purple-800"
              >
                ×
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  )
}