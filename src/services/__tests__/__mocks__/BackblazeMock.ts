export class BackblazeMock {
  private static instance: BackblazeMock
  private uploadedFiles: Map<string, any> = new Map()
  private shouldFail = false
  private failureError = new Error('Backblaze API Error')

  static getInstance(): BackblazeMock {
    if (!BackblazeMock.instance) {
      BackblazeMock.instance = new BackblazeMock()
    }
    return BackblazeMock.instance
  }

  static reset() {
    BackblazeMock.instance = new BackblazeMock()
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

export const backblazeMock = BackblazeMock.getInstance()