import { LeadStatus } from "@prisma/client"

export interface Lead {
  id: number
  legacyLeadId: string | null
  campaignId: number
  email: string | null
  phone: string | null
  firstName: string | null
  lastName: string | null
  businessName: string | null
  status: LeadStatus
  intakeToken: string | null
  intakeCompletedAt: Date | null
  createdAt: Date
  updatedAt: Date
  importedAt: Date
  _count: {
    notes: number
    documents: number
  }
}

export interface LeadFilters {
  search: string
  status: string
  dateFrom: string
  dateTo: string
}

export interface PaginationInfo {
  page: number
  limit: number
  totalCount: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}