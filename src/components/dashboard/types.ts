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
  dba: string | null
  businessAddress: string | null
  businessPhone: string | null
  businessEmail: string | null
  mobile: string | null
  businessCity: string | null
  businessState: string | null
  businessZip: string | null
  ownershipPercentage: string | null
  taxId: string | null
  stateOfInc: string | null
  legalEntity: string | null
  industry: string | null
  hasExistingLoans: string | null
  personalAddress: string | null
  personalZip: string | null
  dateOfBirth: string | null
  socialSecurity: string | null
  legalName: string | null
  yearsInBusiness: number | null
  amountNeeded: number | null
  monthlyRevenue: number | null
  status: LeadStatus
  intakeToken: string | null
  intakeCompletedAt: Date | null
  step1CompletedAt: Date | null
  step2CompletedAt: Date | null
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