import { createMockLead, createMockUser, createMockDocument, createMockNote } from './test-utils'

describe('Test Utilities', () => {
  describe('createMockLead', () => {
    it('should create a mock lead with default values', () => {
      const lead = createMockLead()
      
      expect(lead).toHaveProperty('id', 1)
      expect(lead).toHaveProperty('firstName', 'John')
      expect(lead).toHaveProperty('lastName', 'Doe')
      expect(lead).toHaveProperty('email', 'test@example.com')
      expect(lead).toHaveProperty('status', 'NEW')
      expect(lead).toHaveProperty('intakeToken')
      expect(lead.intakeToken).toBeTruthy()
    })

    it('should allow overriding default values', () => {
      const lead = createMockLead({
        firstName: 'Jane',
        lastName: 'Smith',
        status: 'PENDING'
      })
      
      expect(lead.firstName).toBe('Jane')
      expect(lead.lastName).toBe('Smith')
      expect(lead.status).toBe('PENDING')
    })
  })

  describe('createMockUser', () => {
    it('should create a mock user with default values', () => {
      const user = createMockUser()
      
      expect(user).toHaveProperty('id', 1)
      expect(user).toHaveProperty('email', 'test@example.com')
      expect(user).toHaveProperty('role', 'admin')
      expect(user).toHaveProperty('passwordHash')
    })

    it('should allow overriding default values', () => {
      const user = createMockUser({
        email: 'admin@example.com',
        role: 'user'
      })
      
      expect(user.email).toBe('admin@example.com')
      expect(user.role).toBe('user')
    })
  })

  describe('createMockDocument', () => {
    it('should create a mock document with default values', () => {
      const document = createMockDocument()
      
      expect(document).toHaveProperty('id', 1)
      expect(document).toHaveProperty('leadId', 1)
      expect(document).toHaveProperty('filename', 'test-document.pdf')
      expect(document).toHaveProperty('mimeType', 'application/pdf')
      expect(document).toHaveProperty('fileSize', 1024000)
    })
  })

  describe('createMockNote', () => {
    it('should create a mock note with default values', () => {
      const note = createMockNote()
      
      expect(note).toHaveProperty('id', 1)
      expect(note).toHaveProperty('leadId', 1)
      expect(note).toHaveProperty('userId', 1)
      expect(note).toHaveProperty('content', 'Test note content')
    })
  })
})