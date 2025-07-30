/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { LeadDetailView } from '../LeadDetailView';
import { UserRole, LeadStatus } from '@prisma/client';

// Mock dependencies
jest.mock('next-auth/react');
jest.mock('next/navigation');

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

// Mock fetch
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock window methods
global.alert = jest.fn();
global.confirm = jest.fn();

// Mock URL and Blob for file download
global.URL.createObjectURL = jest.fn(() => 'mock-url');
global.URL.revokeObjectURL = jest.fn();

// Mock DOM methods
document.createElement = jest.fn((tagName) => {
  if (tagName === 'a') {
    return {
      href: '',
      download: '',
      click: jest.fn(),
    } as any;
  }
  return {} as any;
});

document.body.appendChild = jest.fn();
document.body.removeChild = jest.fn();

describe('File Management', () => {
  const mockPush = jest.fn();
  const mockSession = {
    user: {
      id: '1',
      email: 'admin@example.com',
      role: UserRole.ADMIN,
    },
  };

  const mockLeadWithDocuments = {
    lead: {
      id: 1,
      legacyLeadId: '123456789',
      campaignId: 1,
      email: 'john.doe@example.com',
      phone: '555-0123',
      firstName: 'John',
      lastName: 'Doe',
      businessName: 'Test Business',
      status: LeadStatus.NEW,
      intakeToken: 'token123',
      intakeCompletedAt: null,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      importedAt: '2024-01-01T00:00:00.000Z',
      notes: [],
      documents: [
        {
          id: 1,
          filename: 'test-file.pdf',
          originalFilename: 'Test Document.pdf',
          fileSize: 1024000,
          mimeType: 'application/pdf',
          uploadedAt: '2024-01-01T12:00:00.000Z',
          user: {
            id: 1,
            email: 'staff@example.com'
          }
        }
      ],
      _count: {
        notes: 0,
        documents: 1,
        followupQueue: 0,
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSession.mockReturnValue({ data: mockSession } as any);
    mockUseRouter.mockReturnValue({ push: mockPush } as any);
  });

  it('should display documents with delete buttons for authenticated users', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockLeadWithDocuments,
    } as Response);

    render(<LeadDetailView leadId={1} />);

    await waitFor(() => {
      expect(screen.getByText('Test Document.pdf')).toBeInTheDocument();
    });

    expect(screen.getByText('Download')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('should handle file deletion successfully', async () => {
    // Mock initial lead fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockLeadWithDocuments,
    } as Response);

    // Mock delete request
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    (global.confirm as jest.Mock).mockReturnValue(true);

    render(<LeadDetailView leadId={1} />);

    await waitFor(() => {
      expect(screen.getByText('Test Document.pdf')).toBeInTheDocument();
    });

    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(global.confirm).toHaveBeenCalledWith(
        'Are you sure you want to delete "Test Document.pdf"? This action cannot be undone.'
      );
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/leads/1/files?documentId=1',
      { method: 'DELETE' }
    );
  });

  it('should not delete file if user cancels confirmation', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockLeadWithDocuments,
    } as Response);

    (global.confirm as jest.Mock).mockReturnValue(false);

    render(<LeadDetailView leadId={1} />);

    await waitFor(() => {
      expect(screen.getByText('Test Document.pdf')).toBeInTheDocument();
    });

    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    expect(global.confirm).toHaveBeenCalled();
    
    // Should not make delete request
    expect(mockFetch).toHaveBeenCalledTimes(1); // Only the initial fetch
  });

  it('should handle file deletion error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockLeadWithDocuments,
    } as Response);

    // Mock delete request failure
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Failed to delete document' }),
    } as Response);

    (global.confirm as jest.Mock).mockReturnValue(true);

    render(<LeadDetailView leadId={1} />);

    await waitFor(() => {
      expect(screen.getByText('Test Document.pdf')).toBeInTheDocument();
    });

    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Failed to delete document');
    });
  });

  it('should show upload form when upload button is clicked', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockLeadWithDocuments,
    } as Response);

    render(<LeadDetailView leadId={1} />);

    await waitFor(() => {
      expect(screen.getByText('Upload Document')).toBeInTheDocument();
    });

    const uploadButton = screen.getByText('Upload Document');
    fireEvent.click(uploadButton);

    expect(screen.getByText('Supported formats: PDF, JPG, PNG, DOCX (max 10MB)')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('should handle file upload successfully', async () => {
    const mockLeadWithoutDocs = {
      ...mockLeadWithDocuments,
      lead: {
        ...mockLeadWithDocuments.lead,
        documents: [],
        _count: { ...mockLeadWithDocuments.lead._count, documents: 0 }
      }
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockLeadWithoutDocs,
    } as Response);

    // Mock file upload response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        document: {
          id: 2,
          filename: 'new-file.pdf',
          originalFilename: 'New Document.pdf',
          fileSize: 2048000,
          mimeType: 'application/pdf',
          uploadedAt: '2024-01-01T13:00:00.000Z',
          user: {
            id: 1,
            email: 'admin@example.com'
          }
        }
      }),
    } as Response);

    render(<LeadDetailView leadId={1} />);

    await waitFor(() => {
      expect(screen.getByText('Upload Document')).toBeInTheDocument();
    });

    const uploadButton = screen.getByText('Upload Document');
    fireEvent.click(uploadButton);

    const fileInput = screen.getByRole('textbox', { hidden: true }) || 
                     document.querySelector('input[type="file"]');
    
    if (fileInput) {
      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/leads/1/files',
          expect.objectContaining({
            method: 'POST',
            body: expect.any(FormData),
          })
        );
      });
    }
  });
});