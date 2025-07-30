import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { useSession } from 'next-auth/react'
import { LeadDashboard } from '../LeadDashboard'
import { LeadStatus, UserRole } from '@prisma/client'

// Mock next-auth
jest.mock('next-auth/react')
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>

// Mock fetch
global.fetch = jest.fn()
const mockFetch = fetch as jest.MockedFunction<typeof fetch>

// Mock data
const mockLeads = [
  {
    id: 1,
    legacyLeadId: BigInt(12345),
    campaignId: 1,
    email: 'john@example.com',
    phone: '555-0123',
    firstName: 'John',
    lastName: 'Doe',
    businessName: 'Doe Enterprises',
    status: LeadStatus.NEW,
    intakeToken: 'token123',
    intakeCompletedAt: null,
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:00:00Z'),
    importedAt: new Date('2024-01-01T10:00:00Z'),
    _count: {
      notes: 2,
      documents: 1
    }
  },
  {
    id: 2,
    legacyLeadId: BigInt(12346),
    campaignId: 1,
    email: 'jane@example.com',
    phone: '555-0124',
    firstName: 'Jane',
    lastName: 'Smith',
    businessName: 'Smith LLC',
    status: LeadStatus.PENDING,
    intakeToken: 'token456',
    intakeCompletedAt: null,
    createdAt: new Date('2024-01-02T10:00:00Z'),
    updatedAt: new Date('2024-01-02T10:00:00Z'),
    importedAt: new Date('2024-01-02T10:00:00Z'),
    _count: {
      notes: 0,
      documents: 3
    }
  }
]

const mockPagination = {
  page: 1,
  limit: 10,
  totalCount: 2,
  totalPages: 1,
  hasNext: false,
  hasPrev: false
}

describe('LeadDashboard', () => {
  beforeEach(() => {
    mockUseSession.mockReturnValue({
      data: {
        user: { id: '1', email: 'admin@test.com', role: UserRole.ADMIN },
        expires: '2024-12-31'
      },
      status: 'authenticated',
      update: jest.fn()
    })

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        leads: mockLeads,
        pagination: mockPagination
      })
    } as Response)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders dashboard with leads', async () => {
    render(<LeadDashboard />)

    // Check header
    expect(screen.getByText('Lead Management')).toBeInTheDocument()
    expect(screen.getByText('Manage and track all merchant funding leads')).toBeInTheDocument()

    // Wait for leads to load
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    })

    // Check lead details
    expect(screen.getByText('john@example.com')).toBeInTheDocument()
    expect(screen.getByText('jane@example.com')).toBeInTheDocument()
    expect(screen.getByText('Doe Enterprises')).toBeInTheDocument()
    expect(screen.getByText('Smith LLC')).toBeInTheDocument()
  })

  it('displays loading state initially', () => {
    render(<LeadDashboard />)

    // Should show loading skeleton
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('handles search functionality', async () => {
    render(<LeadDashboard />)

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    // Find and use search input
    const searchInput = screen.getByPlaceholderText('Search by name, email, phone, or business...')
    fireEvent.change(searchInput, { target: { value: 'John' } })

    // Wait for debounced search
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('search=John')
      )
    }, { timeout: 500 })
  })

  it('handles status filtering', async () => {
    render(<LeadDashboard />)

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    // Find and use status filter
    const statusSelect = screen.getByLabelText('Status')
    fireEvent.change(statusSelect, { target: { value: 'pending' } })

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('status=pending')
      )
    })
  })

  it('handles date range filtering', async () => {
    render(<LeadDashboard />)

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    // Find and use date filters
    const dateFromInput = screen.getByLabelText('Date From')
    const dateToInput = screen.getByLabelText('Date To')

    fireEvent.change(dateFromInput, { target: { value: '2024-01-01' } })
    fireEvent.change(dateToInput, { target: { value: '2024-01-31' } })

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('dateFrom=2024-01-01')
      )
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('dateTo=2024-01-31')
      )
    })
  })

  it('handles sorting', async () => {
    render(<LeadDashboard />)

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    // Click on Name column header to sort
    const nameHeader = screen.getByText('Name').closest('button')
    fireEvent.click(nameHeader!)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('sortBy=firstName')
      )
    })
  })

  it('handles pagination', async () => {
    // Mock response with pagination
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        leads: mockLeads,
        pagination: {
          ...mockPagination,
          totalPages: 3,
          hasNext: true
        }
      })
    } as Response)

    render(<LeadDashboard />)

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    // Should show pagination controls
    expect(screen.getByText('Next')).toBeInTheDocument()
    expect(screen.getByText('Previous')).toBeInTheDocument()
  })

  it('displays error state when fetch fails', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))

    render(<LeadDashboard />)

    await waitFor(() => {
      expect(screen.getByText('Error loading leads')).toBeInTheDocument()
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })

    // Should show retry button
    const retryButton = screen.getByText('Try again')
    expect(retryButton).toBeInTheDocument()
  })

  it('displays empty state when no leads found', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        leads: [],
        pagination: {
          ...mockPagination,
          totalCount: 0
        }
      })
    } as Response)

    render(<LeadDashboard />)

    await waitFor(() => {
      expect(screen.getByText('No leads found')).toBeInTheDocument()
      expect(screen.getByText('No leads have been imported yet.')).toBeInTheDocument()
    })
  })

  it('shows clear filters button when filters are active', async () => {
    render(<LeadDashboard />)

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    // Add a search filter
    const searchInput = screen.getByPlaceholderText('Search by name, email, phone, or business...')
    fireEvent.change(searchInput, { target: { value: 'test' } })

    // Should show clear filters button
    await waitFor(() => {
      expect(screen.getByText('Clear All')).toBeInTheDocument()
    })
  })

  it('clears all filters when clear button is clicked', async () => {
    render(<LeadDashboard />)

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    // Add filters
    const searchInput = screen.getByPlaceholderText('Search by name, email, phone, or business...')
    const statusSelect = screen.getByLabelText('Status')

    fireEvent.change(searchInput, { target: { value: 'test' } })
    fireEvent.change(statusSelect, { target: { value: 'pending' } })

    await waitFor(() => {
      expect(screen.getByText('Clear All')).toBeInTheDocument()
    })

    // Click clear all
    const clearButton = screen.getByText('Clear All')
    fireEvent.click(clearButton)

    // Should trigger a new API call with cleared filters
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.not.stringContaining('search=test')
      )
    })
  })
})