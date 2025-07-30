import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { LeadSearchFilters } from '../LeadSearchFilters'
import { LeadFilters } from '../types'

describe('LeadSearchFilters', () => {
    const mockFilters: LeadFilters = {
        search: '',
        status: '',
        dateFrom: '',
        dateTo: ''
    }

    const mockOnFiltersChange = jest.fn()
    const mockOnClearFilters = jest.fn()

    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('renders all filter inputs', () => {
        render(
            <LeadSearchFilters
                filters={mockFilters}
                onFiltersChange={mockOnFiltersChange}
                onClearFilters={mockOnClearFilters}
                loading={false}
            />
        )

        expect(screen.getByLabelText('Search')).toBeInTheDocument()
        expect(screen.getByLabelText('Status')).toBeInTheDocument()
        expect(screen.getByLabelText('Date From')).toBeInTheDocument()
        expect(screen.getByLabelText('Date To')).toBeInTheDocument()
    })

    it('displays current filter values', () => {
        const filtersWithValues: LeadFilters = {
            search: 'John Doe',
            status: 'pending',
            dateFrom: '2024-01-01',
            dateTo: '2024-01-31'
        }

        render(
            <LeadSearchFilters
                filters={filtersWithValues}
                onFiltersChange={mockOnFiltersChange}
                onClearFilters={mockOnClearFilters}
                loading={false}
            />
        )

        expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument()
        expect(screen.getByDisplayValue('Pending')).toBeInTheDocument()
        expect(screen.getByDisplayValue('2024-01-01')).toBeInTheDocument()
        expect(screen.getByDisplayValue('2024-01-31')).toBeInTheDocument()
    })

    it('handles search input with debouncing', async () => {
        render(
            <LeadSearchFilters
                filters={mockFilters}
                onFiltersChange={mockOnFiltersChange}
                onClearFilters={mockOnClearFilters}
                loading={false}
            />
        )

        const searchInput = screen.getByLabelText('Search')
        fireEvent.change(searchInput, { target: { value: 'John' } })

        // Should call after debounce delay
        await waitFor(() => {
            expect(mockOnFiltersChange).toHaveBeenCalledWith({
                ...mockFilters,
                search: 'John'
            })
        }, { timeout: 500 })
    })

    it('handles status filter change immediately', () => {
        render(
            <LeadSearchFilters
                filters={mockFilters}
                onFiltersChange={mockOnFiltersChange}
                onClearFilters={mockOnClearFilters}
                loading={false}
            />
        )

        const statusSelect = screen.getByLabelText('Status')
        fireEvent.change(statusSelect, { target: { value: 'pending' } })

        expect(mockOnFiltersChange).toHaveBeenCalledWith({
            ...mockFilters,
            status: 'pending'
        })
    })

    it('handles date filter changes immediately', () => {
        render(
            <LeadSearchFilters
                filters={mockFilters}
                onFiltersChange={mockOnFiltersChange}
                onClearFilters={mockOnClearFilters}
                loading={false}
            />
        )

        const dateFromInput = screen.getByLabelText('Date From')
        fireEvent.change(dateFromInput, { target: { value: '2024-01-01' } })

        expect(mockOnFiltersChange).toHaveBeenCalledWith({
            ...mockFilters,
            dateFrom: '2024-01-01'
        })
    })

    it('shows clear all button when filters are active', () => {
        const filtersWithValues: LeadFilters = {
            search: 'John',
            status: '',
            dateFrom: '',
            dateTo: ''
        }

        render(
            <LeadSearchFilters
                filters={filtersWithValues}
                onFiltersChange={mockOnFiltersChange}
                onClearFilters={mockOnClearFilters}
                loading={false}
            />
        )

        expect(screen.getByText('Clear All')).toBeInTheDocument()
    })

    it('hides clear all button when no filters are active', () => {
        render(
            <LeadSearchFilters
                filters={mockFilters}
                onFiltersChange={mockOnFiltersChange}
                onClearFilters={mockOnClearFilters}
                loading={false}
            />
        )

        expect(screen.queryByText('Clear All')).not.toBeInTheDocument()
    })

    it('calls onClearFilters when clear all button is clicked', () => {
        const filtersWithValues: LeadFilters = {
            search: 'John',
            status: 'pending',
            dateFrom: '2024-01-01',
            dateTo: '2024-01-31'
        }

        render(
            <LeadSearchFilters
                filters={filtersWithValues}
                onFiltersChange={mockOnFiltersChange}
                onClearFilters={mockOnClearFilters}
                loading={false}
            />
        )

        const clearButton = screen.getByText('Clear All')
        fireEvent.click(clearButton)

        expect(mockOnClearFilters).toHaveBeenCalled()
    })

    it('shows active filters summary', () => {
        const filtersWithValues: LeadFilters = {
            search: 'John Doe',
            status: 'pending',
            dateFrom: '2024-01-01',
            dateTo: '2024-01-31'
        }

        render(
            <LeadSearchFilters
                filters={filtersWithValues}
                onFiltersChange={mockOnFiltersChange}
                onClearFilters={mockOnClearFilters}
                loading={false}
            />
        )

        expect(screen.getByText('Active filters:')).toBeInTheDocument()
        expect(screen.getByText('Search: "John Doe"')).toBeInTheDocument()
        expect(screen.getByText('Status: Pending')).toBeInTheDocument()
        expect(screen.getByText('From: 2024-01-01')).toBeInTheDocument()
        expect(screen.getByText('To: 2024-01-31')).toBeInTheDocument()
    })

    it('allows clearing individual filters from summary', async () => {
        const filtersWithValues: LeadFilters = {
            search: 'John Doe',
            status: 'pending',
            dateFrom: '2024-01-01',
            dateTo: '2024-01-31'
        }

        render(
            <LeadSearchFilters
                filters={filtersWithValues}
                onFiltersChange={mockOnFiltersChange}
                onClearFilters={mockOnClearFilters}
                loading={false}
            />
        )

        // Find and click the X button for search filter
        const searchFilterTag = screen.getByText('Search: "John Doe"').closest('span')
        const clearSearchButton = searchFilterTag?.querySelector('button')

        if (clearSearchButton) {
            fireEvent.click(clearSearchButton)
            await waitFor(() => {
                expect(mockOnFiltersChange).toHaveBeenCalledWith({
                    ...filtersWithValues,
                    search: ''
                })
            })
        }
    })

    it('disables inputs when loading', () => {
        render(
            <LeadSearchFilters
                filters={mockFilters}
                onFiltersChange={mockOnFiltersChange}
                onClearFilters={mockOnClearFilters}
                loading={true}
            />
        )

        expect(screen.getByLabelText('Search')).toBeDisabled()
        expect(screen.getByLabelText('Status')).toBeDisabled()
        expect(screen.getByLabelText('Date From')).toBeDisabled()
        expect(screen.getByLabelText('Date To')).toBeDisabled()
    })

    it('shows search clear button when search has value', () => {
        const filtersWithSearch: LeadFilters = {
            search: 'John',
            status: '',
            dateFrom: '',
            dateTo: ''
        }

        render(
            <LeadSearchFilters
                filters={filtersWithSearch}
                onFiltersChange={mockOnFiltersChange}
                onClearFilters={mockOnClearFilters}
                loading={false}
            />
        )

        const searchInput = screen.getByLabelText('Search')
        const clearButton = searchInput.parentElement?.querySelector('button')
        expect(clearButton).toBeInTheDocument()
    })

    it('clears search when search clear button is clicked', async () => {
        const filtersWithSearch: LeadFilters = {
            search: 'John',
            status: '',
            dateFrom: '',
            dateTo: ''
        }

        render(
            <LeadSearchFilters
                filters={filtersWithSearch}
                onFiltersChange={mockOnFiltersChange}
                onClearFilters={mockOnClearFilters}
                loading={false}
            />
        )

        const searchInput = screen.getByLabelText('Search')
        const clearButton = searchInput.parentElement?.querySelector('button')

        if (clearButton) {
            fireEvent.click(clearButton)
            await waitFor(() => {
                expect(mockOnFiltersChange).toHaveBeenCalledWith({
                    ...filtersWithSearch,
                    search: ''
                })
            })
        }
    })

    it('sets min date for dateTo based on dateFrom', () => {
        const filtersWithDateFrom: LeadFilters = {
            search: '',
            status: '',
            dateFrom: '2024-01-15',
            dateTo: ''
        }

        render(
            <LeadSearchFilters
                filters={filtersWithDateFrom}
                onFiltersChange={mockOnFiltersChange}
                onClearFilters={mockOnClearFilters}
                loading={false}
            />
        )

        const dateToInput = screen.getByLabelText('Date To') as HTMLInputElement
        expect(dateToInput.min).toBe('2024-01-15')
    })
})