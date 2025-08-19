"use client"

import { PaginationInfo } from "./types"

interface PaginationProps {
  pagination: PaginationInfo
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
}

const LIMIT_OPTIONS = [10, 25, 50, 100]

export function Pagination({ pagination, onPageChange, onLimitChange }: PaginationProps) {
  const { page, limit, totalCount, totalPages, hasNext, hasPrev } = pagination

  const startItem = (page - 1) * limit + 1
  const endItem = Math.min(page * limit, totalCount)

  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisiblePages = 7

    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always show first page
      pages.push(1)

      if (page > 4) {
        pages.push('...')
      }

      // Show pages around current page
      const start = Math.max(2, page - 1)
      const end = Math.min(totalPages - 1, page + 1)

      for (let i = start; i <= end; i++) {
        pages.push(i)
      }

      if (page < totalPages - 3) {
        pages.push('...')
      }

      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages)
      }
    }

    return pages
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
      {/* Results info and per-page selector */}
      <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
  <div className="text-xs text-gray-700">
          Showing <span className="font-medium">{startItem}</span> to{' '}
          <span className="font-medium">{endItem}</span> of{' '}
          <span className="font-medium">{totalCount}</span> results
        </div>
        
        <div className="flex items-center space-x-2">
          <label htmlFor="limit" className="text-xs text-gray-700">
            Per page:
          </label>
          <select
            id="limit"
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="border border-gray-300 rounded-md text-xs py-1 px-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
          >
            {LIMIT_OPTIONS.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Pagination controls */}
      <div className="flex items-center justify-between sm:justify-end mt-4 sm:mt-0">
        <div className="flex items-center space-x-1">
          {/* Previous button */}
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={!hasPrev}
            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-xs font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="sr-only">Previous</span>
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </button>

          {/* Page numbers */}
          {getPageNumbers().map((pageNum, index) => (
            <button
              key={index}
              onClick={() => typeof pageNum === 'number' ? onPageChange(pageNum) : undefined}
              disabled={typeof pageNum !== 'number'}
              className={`relative inline-flex items-center px-4 py-2 border text-xs font-medium ${
                pageNum === page
                  ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                  : typeof pageNum === 'number'
                  ? 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                  : 'bg-white border-gray-300 text-gray-300 cursor-default'
              }`}
            >
              {pageNum}
            </button>
          ))}

          {/* Next button */}
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={!hasNext}
            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-xs font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="sr-only">Next</span>
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}