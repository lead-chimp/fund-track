"use client"

import { useState, useCallback } from "react"
import { UserRole } from "@prisma/client"
import { RoleGuard } from "@/components/auth/RoleGuard"

interface LeadNote {
  id: number
  content: string
  createdAt: string
  user: {
    id: number
    email: string
  }
}

interface NotesSectionProps {
  leadId: number
  notes: LeadNote[]
  notesCount: number
  onNotesUpdate: (notes: LeadNote[], newCount: number) => void
}

const MAX_CHARACTERS = 5000

export function NotesSection({ leadId, notes, notesCount, onNotesUpdate }: NotesSectionProps) {
  const [newNote, setNewNote] = useState("")
  const [addingNote, setAddingNote] = useState(false)
  const [characterCount, setCharacterCount] = useState(0)

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString))
  }

  const handleNoteChange = (value: string) => {
    setNewNote(value)
    setCharacterCount(value.length)
  }

  const addNote = useCallback(async () => {
    if (!newNote.trim() || addingNote) return

    try {
      setAddingNote(true)
      
      const response = await fetch(`/api/leads/${leadId}/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: newNote.trim() }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to add note')
      }

      const data = await response.json()
      const updatedNotes = [data.note, ...notes]
      onNotesUpdate(updatedNotes, notesCount + 1)
      setNewNote("")
      setCharacterCount(0)
    } catch (err) {
      console.error("Error adding note:", err)
      alert(err instanceof Error ? err.message : "Failed to add note")
    } finally {
      setAddingNote(false)
    }
  }, [newNote, addingNote, leadId, notes, notesCount, onNotesUpdate])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      addNote()
    }
  }

  const isOverLimit = characterCount > MAX_CHARACTERS
  const isNearLimit = characterCount > MAX_CHARACTERS * 0.9

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">
          Internal Notes ({notesCount})
        </h2>
      </div>
      <div className="px-6 py-4">
        {/* Add Note Form */}
        <RoleGuard allowedRoles={[UserRole.ADMIN, UserRole.USER]}>
          <div className="mb-6">
            <div className="relative">
              <textarea
                value={newNote}
                onChange={(e) => handleNoteChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Add an internal note... (Ctrl+Enter to save)"
                rows={4}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 resize-vertical ${
                  isOverLimit 
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                    : 'border-gray-300'
                }`}
                style={{ minHeight: '100px' }}
              />
              <div className="absolute bottom-2 right-2 text-xs text-gray-400 bg-white px-1">
                {characterCount}/{MAX_CHARACTERS}
              </div>
            </div>
            
            {/* Character count and formatting help */}
            <div className="mt-2 flex items-center justify-between">
              <div className="text-xs text-gray-500">
                <span className="inline-flex items-center">
                  <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Supports line breaks and basic formatting
                </span>
              </div>
              <div className="flex items-center space-x-2">
                {isNearLimit && (
                  <span className={`text-xs ${isOverLimit ? 'text-red-600' : 'text-yellow-600'}`}>
                    {isOverLimit ? 'Character limit exceeded' : 'Approaching character limit'}
                  </span>
                )}
                <button
                  onClick={addNote}
                  disabled={!newNote.trim() || addingNote || isOverLimit}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addingNote ? "Adding..." : "Add Note"}
                </button>
              </div>
            </div>
          </div>
        </RoleGuard>

        {/* Notes List */}
        {notes.length > 0 ? (
          <div className="space-y-4">
            {notes.map((note) => (
              <div key={note.id} className="border-l-4 border-indigo-400 pl-4 py-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="prose prose-sm max-w-none">
                      <p className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">
                        {note.content}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center text-xs text-gray-500">
                  <div className="flex items-center">
                    <div className="h-5 w-5 bg-gray-300 rounded-full flex items-center justify-center mr-2">
                      <span className="text-xs font-medium text-gray-600">
                        {note.user.email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="font-medium">{note.user.email}</span>
                  </div>
                  <span className="mx-2">•</span>
                  <time dateTime={note.createdAt} title={formatDate(note.createdAt)}>
                    {formatDate(note.createdAt)}
                  </time>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10m0 0V6a2 2 0 00-2-2H9a2 2 0 00-2 2v2m0 0v8a2 2 0 002 2h6a2 2 0 002-2V8M9 12h6" />
            </svg>
            <p className="mt-2 text-sm text-gray-500">No notes added yet.</p>
            <RoleGuard allowedRoles={[UserRole.ADMIN, UserRole.USER]}>
              <p className="text-xs text-gray-400 mt-1">Add the first note to start documenting interactions.</p>
            </RoleGuard>
          </div>
        )}
      </div>
    </div>
  )
}