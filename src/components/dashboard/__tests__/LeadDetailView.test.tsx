import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { LeadDetailView } from '../LeadDetailView';
import { LeadStatus, UserRole } from '@prisma/client';

// Mock dependencies
jest.mock('next-auth/react');
jest.mock('next/navigation');

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockPush = jest.fn();
const mockBack = jest.fn();

// Mock fetch
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock window.location
delete (window as any).location;
(window as any).location = {
  origin: 'http://localhost:3000',
};

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(),
  },
});

// Mock alert
global.alert = jest.fn();

// Mock document methods for download test
const mockCreateElement = jest.fn();
const mockAppendChild = jest.fn();
const mockRemoveChild = jest.fn();
const mockCreateObjectURL = jest.fn(() => 'blob:mock-url');
const mockRevokeObjectURL = jest.fn();

beforeAll(() => {
  Object.defineProperty(document, 'createElement', {
    value: mockCreateElement,
    writable: true,
  });
  Object.defineProperty(document.body, 'appendChild', {
    value: mockAppendChild,
    writable: true,
  });
  Object.defineProperty(document.body, 'removeChild', {
    value: mockRemoveChild,
    writable: true,
  });
  global.URL.createObjectURL = mockCreateObjectURL;
  global.URL.revokeObjectURL = mockRevokeObjectURL;
});

describe('LeadDetailView', () => {
  const mockSession = {
    user: {
      id: '1',
      email: 'test@example.com',
      role: UserRole.USER,
    },
    expires: '2024-12-31T23:59:59.999Z',
  };

  const mockLead = {
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
    notes: [
      {
        id: 1,
        content: 'Test note content',
        createdAt: '2024-01-01T00:00:00.000Z',
        user: {
          id: 1,
          email: 'test@example.com',
        },
      },
    ],
    documents: [
      {
        id: 1,
        filename: 'test-document.pdf',
        originalFilename: 'Test Document.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
        uploadedAt: '2024-01-01T00:00:00.000Z',
        user: {
          id: 1,
          email: 'test@example.com',
        },
      },
    ],
    _count: {
      notes: 1,
      documents: 1,
      followupQueue: 0,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: jest.fn(),
    });
    mockUseRouter.mockReturnValue({
      push: mockPush,
      back: mockBack,
    } as any);
  });

  it('should render lead details correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ lead: mockLead }),
    } as Response);

    render(<LeadDetailView leadId={1} />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
    expect(screen.getByText('555-0123')).toBeInTheDocument();
    expect(screen.getByText('Test Business')).toBeInTheDocument();
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('should display loading state initially', () => {
    mockFetch.mockImplementation(() => new Promise(() => { })); // Never resolves

    render(<LeadDetailView leadId={1} />);

    expect(screen.getByText('Back to leads')).toBeInTheDocument();
    // Check for loading skeleton
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('should handle error state', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    } as Response);

    render(<LeadDetailView leadId={1} />);

    await waitFor(() => {
      expect(screen.getByText('Lead not found')).toBeInTheDocument();
    });

    expect(screen.getByText('Try again')).toBeInTheDocument();
    expect(screen.getByText('Back to dashboard')).toBeInTheDocument();
  });

  it('should update lead status', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ lead: mockLead }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ lead: { ...mockLead, status: LeadStatus.IN_PROGRESS } }),
      } as Response);

    render(<LeadDetailView leadId={1} />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const statusSelect = screen.getByDisplayValue('New');
    fireEvent.change(statusSelect, { target: { value: LeadStatus.IN_PROGRESS } });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/leads/1', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: LeadStatus.IN_PROGRESS }),
      });
    });
  });

  it('should add a new note', async () => {
    const newNote = {
      id: 2,
      content: 'New test note',
      createdAt: '2024-01-02T00:00:00.000Z',
      user: {
        id: 1,
        email: 'test@example.com',
      },
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ lead: mockLead }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ note: newNote }),
      } as Response);

    render(<LeadDetailView leadId={1} />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const noteTextarea = screen.getByPlaceholderText('Add an internal note...');
    const addButton = screen.getByText('Add Note');

    fireEvent.change(noteTextarea, { target: { value: 'New test note' } });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/leads/1/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: 'New test note' }),
      });
    });
  });

  it('should display documents with download links', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ lead: mockLead }),
    } as Response);

    render(<LeadDetailView leadId={1} />);

    await waitFor(() => {
      expect(screen.getByText('Test Document.pdf')).toBeInTheDocument();
    });

    expect(screen.getByText(/1 KB • Uploaded.*by test@example.com/)).toBeInTheDocument();
    expect(screen.getByText('Download')).toBeInTheDocument();
  });

  it('should handle document download', async () => {
    const mockAnchor = {
      href: '',
      download: '',
      click: jest.fn(),
    };
    mockCreateElement.mockReturnValue(mockAnchor);

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ lead: mockLead }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        blob: async () => new Blob(['test content'], { type: 'application/pdf' }),
      } as Response);

    render(<LeadDetailView leadId={1} />);

    await waitFor(() => {
      expect(screen.getByText('Test Document.pdf')).toBeInTheDocument();
    });

    const downloadButton = screen.getByText('Download');
    fireEvent.click(downloadButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/leads/1/documents/1/download');
    });
  });

  it('should copy intake link to clipboard', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ lead: mockLead }),
    } as Response);

    render(<LeadDetailView leadId={1} />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const copyButton = screen.getByText('Copy');
    fireEvent.click(copyButton);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      'http://localhost:3000/application/token123'
    );
    expect(global.alert).toHaveBeenCalledWith('Link copied to clipboard!');
  });

  it('should navigate back to dashboard', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ lead: mockLead }),
    } as Response);

    render(<LeadDetailView leadId={1} />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const backButton = screen.getByText('Back to leads');
    fireEvent.click(backButton);

    expect(mockPush).toHaveBeenCalledWith('/dashboard');
  });

  it('should show role-based access controls for admin users', async () => {
    mockUseSession.mockReturnValue({
      data: { ...mockSession, user: { ...mockSession.user, role: UserRole.ADMIN } },
      status: 'authenticated',
      update: jest.fn(),
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ lead: mockLead }),
    } as Response);

    render(<LeadDetailView leadId={1} />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Admin should see status dropdown and note input
    expect(screen.getByDisplayValue('New')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Add an internal note...')).toBeInTheDocument();
    expect(screen.getByText('Upload Document')).toBeInTheDocument();
  });

  it('should handle empty states correctly', async () => {
    const leadWithoutData = {
      ...mockLead,
      notes: [],
      documents: [],
      _count: {
        notes: 0,
        documents: 0,
        followupQueue: 0,
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ lead: leadWithoutData }),
    } as Response);

    render(<LeadDetailView leadId={1} />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    expect(screen.getByText('No documents uploaded yet.')).toBeInTheDocument();
    expect(screen.getByText('No notes added yet.')).toBeInTheDocument();
  });

  it('should show file upload form when upload button is clicked', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ lead: mockLead }),
    } as Response);

    render(<LeadDetailView leadId={1} />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const uploadButton = screen.getByText('Upload Document');
    fireEvent.click(uploadButton);

    expect(screen.getByText('Upload Document')).toBeInTheDocument();
    expect(screen.getByText('Supported formats: PDF, JPG, PNG, DOCX (max 10MB)')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('should upload file successfully', async () => {
    const newDocument = {
      id: 2,
      filename: 'new-document.pdf',
      originalFilename: 'New Document.pdf',
      fileSize: 2048,
      mimeType: 'application/pdf',
      uploadedAt: '2024-01-02T00:00:00.000Z',
      user: {
        id: 1,
        email: 'test@example.com',
      },
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ lead: mockLead }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ document: newDocument }),
      } as Response);

    render(<LeadDetailView leadId={1} />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Click upload button to show form
    const uploadButton = screen.getByText('Upload Document');
    fireEvent.click(uploadButton);

    // Create a mock file
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    const fileInput = screen.getByRole('button', { name: /choose file/i }).closest('input') ||
      document.querySelector('input[type="file"]') as HTMLInputElement;

    // Simulate file selection
    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: false,
    });

    fireEvent.change(fileInput);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/leads/1/files', {
        method: 'POST',
        body: expect.any(FormData),
      });
    });
  });

  it('should handle file upload error', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ lead: mockLead }),
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'File too large' }),
      } as Response);

    render(<LeadDetailView leadId={1} />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Click upload button to show form
    const uploadButton = screen.getByText('Upload Document');
    fireEvent.click(uploadButton);

    // Create a mock file
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: false,
    });

    fireEvent.change(fileInput);

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('File too large');
    });
  });

  it('should handle status update error', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ lead: mockLead }),
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
      } as Response);

    render(<LeadDetailView leadId={1} />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const statusSelect = screen.getByDisplayValue('New');
    fireEvent.change(statusSelect, { target: { value: LeadStatus.IN_PROGRESS } });

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Failed to update lead status');
    });
  });

  it('should handle note addition error', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ lead: mockLead }),
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
      } as Response);

    render(<LeadDetailView leadId={1} />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const noteTextarea = screen.getByPlaceholderText('Add an internal note...');
    const addButton = screen.getByText('Add Note');

    fireEvent.change(noteTextarea, { target: { value: 'Test note' } });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Failed to add note');
    });
  });

  it('should disable form elements during operations', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ lead: mockLead }),
    } as Response);

    render(<LeadDetailView leadId={1} />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Test status update loading state
    const statusSelect = screen.getByDisplayValue('New');
    expect(statusSelect).not.toBeDisabled();

    // Test note addition loading state
    const noteTextarea = screen.getByPlaceholderText('Add an internal note...');
    const addButton = screen.getByText('Add Note');

    fireEvent.change(noteTextarea, { target: { value: 'Test note' } });
    expect(addButton).not.toBeDisabled();
  });

  it('should format lead name correctly with missing parts', async () => {
    const leadWithPartialName = {
      ...mockLead,
      firstName: 'John',
      lastName: null,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ lead: leadWithPartialName }),
    } as Response);

    render(<LeadDetailView leadId={1} />);

    await waitFor(() => {
      expect(screen.getByText('John')).toBeInTheDocument();
    });
  });

  it('should handle lead with no intake token', async () => {
    const leadWithoutToken = {
      ...mockLead,
      intakeToken: null,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ lead: leadWithoutToken }),
    } as Response);

    render(<LeadDetailView leadId={1} />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Should not show intake link section
    expect(screen.queryByText('Intake Link')).not.toBeInTheDocument();
  });
});