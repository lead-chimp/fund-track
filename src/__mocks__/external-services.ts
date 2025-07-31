/**
 * Comprehensive mock services for external APIs
 * Used across all test environments
 */

// Twilio Mock
export class TwilioMockService {
  private static instance: TwilioMockService
  private sentMessages: any[] = []
  private shouldFail = false
  private failureError = new Error('Twilio API Error')

  static getInstance(): TwilioMockService {
    if (!TwilioMockService.instance) {
      TwilioMockService.instance = new TwilioMockService()
    }
    return TwilioMockService.instance
  }

  static reset() {
    TwilioMockService.instance = new TwilioMockService()
  }

  get messages() {
    return {
      create: async (params: any) => {
        if (this.shouldFail) {
          throw this.failureError
        }

        const message = {
          sid: `SM${Math.random().toString(36).substr(2, 32)}`,
          status: 'sent',
          to: params.to,
          from: params.from,
          body: params.body,
          dateCreated: new Date(),
          dateSent: new Date(),
        }

        this.sentMessages.push(message)
        return message
      }
    }
  }

  getSentMessages() {
    return this.sentMessages
  }

  clearSentMessages() {
    this.sentMessages = []
  }

  setShouldFail(shouldFail: boolean, error?: Error) {
    this.shouldFail = shouldFail
    if (error) {
      this.failureError = error
    }
  }
}

// MailGun Mock
export class MailgunMockService {
  private static instance: MailgunMockService
  private sentEmails: any[] = []
  private shouldFail = false
  private failureError = new Error('Mailgun API Error')

  static getInstance(): MailgunMockService {
    if (!MailgunMockService.instance) {
      MailgunMockService.instance = new MailgunMockService()
    }
    return MailgunMockService.instance
  }

  static reset() {
    MailgunMockService.instance = new MailgunMockService()
  }

  client(options: any) {
    return {
      messages: {
        create: async (domain: string, params: any) => {
          if (this.shouldFail) {
            throw this.failureError
          }

          const message = {
            id: `<${Math.random().toString(36).substr(2, 32)}@${domain}>`,
            message: 'Queued. Thank you.',
            to: params.to,
            from: params.from,
            subject: params.subject,
            text: params.text,
            html: params.html,
          }

          this.sentEmails.push(message)
          return message
        }
      }
    }
  }

  getSentEmails() {
    return this.sentEmails
  }

  clearSentEmails() {
    this.sentEmails = []
  }

  setShouldFail(shouldFail: boolean, error?: Error) {
    this.shouldFail = shouldFail
    if (error) {
      this.failureError = error
    }
  }
}

// Backblaze B2 Mock
export class BackblazeMockService {
  private static instance: BackblazeMockService
  private uploadedFiles: Map<string, any> = new Map()
  private shouldFail = false
  private failureError = new Error('Backblaze API Error')

  static getInstance(): BackblazeMockService {
    if (!BackblazeMockService.instance) {
      BackblazeMockService.instance = new BackblazeMockService()
    }
    return BackblazeMockService.instance
  }

  static reset() {
    BackblazeMockService.instance = new BackblazeMockService()
  }

  async authorize() {
    if (this.shouldFail) {
      throw this.failureError
    }

    return {
      data: {
        authorizationToken: 'mock-auth-token',
        apiUrl: 'https://api.backblaze.com',
        downloadUrl: 'https://f000.backblaze.com',
      }
    }
  }

  async uploadFile(params: any) {
    if (this.shouldFail) {
      throw this.failureError
    }

    const fileId = `file_${Math.random().toString(36).substr(2, 16)}`
    const file = {
      fileId,
      fileName: params.fileName,
      contentLength: params.data?.length || 1024,
      contentType: params.contentType,
      uploadTimestamp: Date.now(),
    }

    this.uploadedFiles.set(fileId, file)

    return {
      data: file
    }
  }

  async downloadFileById(fileId: string) {
    if (this.shouldFail) {
      throw this.failureError
    }

    const file = this.uploadedFiles.get(fileId)
    if (!file) {
      throw new Error('File not found')
    }

    return {
      data: Buffer.from('mock file content')
    }
  }

  async deleteFileVersion(fileName: string, fileId: string) {
    if (this.shouldFail) {
      throw this.failureError
    }

    this.uploadedFiles.delete(fileId)
    return { data: { fileId } }
  }

  getUploadedFiles() {
    return Array.from(this.uploadedFiles.values())
  }

  clearUploadedFiles() {
    this.uploadedFiles.clear()
  }

  setShouldFail(shouldFail: boolean, error?: Error) {
    this.shouldFail = shouldFail
    if (error) {
      this.failureError = error
    }
  }
}

// MS SQL Server Mock
export class MSSQLMockService {
  private static instance: MSSQLMockService
  private mockData: any[] = []
  private shouldFail = false
  private failureError = new Error('MSSQL Connection Error')

  static getInstance(): MSSQLMockService {
    if (!MSSQLMockService.instance) {
      MSSQLMockService.instance = new MSSQLMockService()
    }
    return MSSQLMockService.instance
  }

  static reset() {
    MSSQLMockService.instance = new MSSQLMockService()
  }

  async connect() {
    if (this.shouldFail) {
      throw this.failureError
    }

    return {
      request: () => ({
        query: async (sql: string) => {
          if (this.shouldFail) {
            throw this.failureError
          }
          return {
            recordset: this.mockData
          }
        }
      }),
      close: async () => {}
    }
  }

  setMockData(data: any[]) {
    this.mockData = data
  }

  setShouldFail(shouldFail: boolean, error?: Error) {
    this.shouldFail = shouldFail
    if (error) {
      this.failureError = error
    }
  }
}

// Export singleton instances
export const twilioMock = TwilioMockService.getInstance()
export const mailgunMock = MailgunMockService.getInstance()
export const backblazeMock = BackblazeMockService.getInstance()
export const mssqlMock = MSSQLMockService.getInstance()

// Reset all mocks
export const resetAllExternalMocks = () => {
  TwilioMockService.reset()
  MailgunMockService.reset()
  BackblazeMockService.reset()
  MSSQLMockService.reset()
}