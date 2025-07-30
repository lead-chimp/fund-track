import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { NotesSection } from '../NotesSection';
import { UserRole } from '@prisma/client';
import { Session } from 'node_modules/next-auth/core/types';

// Mock next-auth
jest.mock('next-auth/react');
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;

// Mock fetch
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('NotesSection', () => {
  const mockNotes = [
    {
      id: 1,
      content: 'First note content',
      createdAt: '2024-01-01T10:00:00Z',
      user: {
        id: 1,
        email: 'user1@example.com',
      },
    },
    {
      id: 2,
      content: 'Second note with\nmultiple lines',
      createdAt: '2024-01-02T15:30:00Z',
      user: {
        id: 2,
        email: 'user2@example.com',
      },
    },
  ];

  const mockProps = {
    leadId: 1,
    notes: mockNotes,
    notesCount: 2,
    onNotesUpdate: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: '1',
          email: 'test@example.com',
          role: UserRole.USER,
        },
        expires: ''
      },
      status: 'authenticated',
      update: function (data?: any): Promise<Session | null> {
        throw new Error('Function not implemented.');
      }
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders notes section with correct title and count', () => {
    render(<NotesSection {...mockProps} />);
    
    expect(screen.getByText('Internal Notes (2)')).toBeInTheDocument();
  });

  it('displays existing notes with proper formatting', () => {
    render(<NotesSection {...mockProps} />);
    
    expect(screen.getByText('First note content')).toBeInTheDocument();
    // Check for multiline content by looking for both parts
    expect(screen.getByText(/Second note with/)).toBeInTheDocument();
    expect(screen.getByText(/multiple lines/)).toBeInTheDocument();
    expect(screen.getByText('user1@example.com')).toBeInTheDocument();
    expect(screen.getByText('user2@example.com')).toBeInTheDocument();
  });

  it('shows empty state when no notes exist', () => {
    const emptyProps = { ...mockProps, notes: [], notesCount: 0 };
    render(<NotesSection {...emptyProps} />);
    
    expect(screen.getByText('No notes added yet.')).toBeInTheDocument();
    expect(screen.getByText('Add the first note to start documenting interactions.')).toBeInTheDocument();
  });

  it('allows authenticated users to add notes', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        note: {
          id: 3,
          content: 'New test note',
          createdAt: '2024-01-03T12:00:00Z',
          user: {
            id: 1,
            email: 'test@example.com',
          },
        },
      }),
    };
    mockFetch.mockResolvedValueOnce(mockResponse as Response);

    render(<NotesSection {...mockProps} />);
    
    const textarea = screen.getByPlaceholderText(/Add an internal note/);
    const addButton = screen.getByText('Add Note');
    
    fireEvent.change(textarea, { target: { value: 'New test note' } });
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
    
    expect(mockProps.onNotesUpdate).toHaveBeenCalled();
  });

  it('shows character count and validates limit', () => {
    render(<NotesSection {...mockProps} />);
    
    const textarea = screen.getByPlaceholderText(/Add an internal note/);
    
    // Test character counting
    fireEvent.change(textarea, { target: { value: 'Test content' } });
    expect(screen.getByText('12/5000')).toBeInTheDocument();
    
    // Test near limit warning
    const nearLimitContent = 'a'.repeat(4600);
    fireEvent.change(textarea, { target: { value: nearLimitContent } });
    expect(screen.getByText('Approaching character limit')).toBeInTheDocument();
    
    // Test over limit error
    const overLimitContent = 'a'.repeat(5001);
    fireEvent.change(textarea, { target: { value: overLimitContent } });
    expect(screen.getByText('Character limit exceeded')).toBeInTheDocument();
    
    const addButton = screen.getByText('Add Note');
    expect(addButton).toBeDisabled();
  });

  it('supports keyboard shortcuts for adding notes', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        note: {
          id: 3,
          content: 'Keyboard shortcut note',
          createdAt: '2024-01-03T12:00:00Z',
          user: {
            id: 1,
            email: 'test@example.com',
          },
        },
      }),
    };
    mockFetch.mockResolvedValueOnce(mockResponse as Response);

    render(<NotesSection {...mockProps} />);
    
    const textarea = screen.getByPlaceholderText(/Add an internal note/);
    
    fireEvent.change(textarea, { target: { value: 'Keyboard shortcut note' } });
    fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/leads/1/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: 'Keyboard shortcut note' }),
      });
    });
  });

  it('handles API errors gracefully', async () => {
    const mockResponse = {
      ok: false,
      json: async () => ({ error: 'Server error' }),
    };
    mockFetch.mockResolvedValueOnce(mockResponse as Response);

    // Mock window.alert
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

    render(<NotesSection {...mockProps} />);
    
    const textarea = screen.getByPlaceholderText(/Add an internal note/);
    const addButton = screen.getByText('Add Note');
    
    fireEvent.change(textarea, { target: { value: 'Test note' } });
    fireEvent.click(addButton);
    
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Server error');
    });

    alertSpy.mockRestore();
  });

  it('prevents adding empty notes', () => {
    render(<NotesSection {...mockProps} />);
    
    const addButton = screen.getByText('Add Note');
    expect(addButton).toBeDisabled();
    
    const textarea = screen.getByPlaceholderText(/Add an internal note/);
    fireEvent.change(textarea, { target: { value: '   ' } }); // Only whitespace
    expect(addButton).toBeDisabled();
  });

  it('shows loading state while adding note', async () => {
    // Mock a delayed response
    const mockResponse = new Promise(resolve => 
      setTimeout(() => resolve({
        ok: true,
        json: async () => ({
          note: {
            id: 3,
            content: 'Loading test note',
            createdAt: '2024-01-03T12:00:00Z',
            user: {
              id: 1,
              email: 'test@example.com',
            },
          },
        }),
      }), 100)
    );
    mockFetch.mockResolvedValueOnce(mockResponse as Promise<Response>);

    render(<NotesSection {...mockProps} />);
    
    const textarea = screen.getByPlaceholderText(/Add an internal note/);
    const addButton = screen.getByText('Add Note');
    
    fireEvent.change(textarea, { target: { value: 'Loading test note' } });
    fireEvent.click(addButton);
    
    expect(screen.getByText('Adding...')).toBeInTheDocument();
    expect(addButton).toBeDisabled();
    
    await waitFor(() => {
      expect(screen.getByText('Add Note')).toBeInTheDocument();
    });
  });

  it('hides add note form for unauthenticated users', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: function (data?: any): Promise<Session | null> {
        throw new Error('Function not implemented.');
      }
    });

    render(<NotesSection {...mockProps} />);
    
    expect(screen.queryByPlaceholderText(/Add an internal note/)).not.toBeInTheDocument();
    expect(screen.queryByText('Add Note')).not.toBeInTheDocument();
  });

  it('formats dates correctly', () => {
    render(<NotesSection {...mockProps} />);
    
    // Check that dates are formatted (exact format may vary by locale)
    expect(screen.getByText(/Jan 1, 2024/)).toBeInTheDocument();
    expect(screen.getByText(/Jan 2, 2024/)).toBeInTheDocument();
  });

  it('displays user avatars with initials', () => {
    render(<NotesSection {...mockProps} />);
    
    // Check for user initials in avatars - there should be multiple U's for both users
    const avatars = screen.getAllByText('U');
    expect(avatars).toHaveLength(2); // user1@example.com -> U, user2@example.com -> U
  });
});