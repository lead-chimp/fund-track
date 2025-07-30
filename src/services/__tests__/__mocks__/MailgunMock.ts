export class MailgunMock {
  private static instance: MailgunMock
  public client: ClientMock

  constructor() {
    this.client = new ClientMock()
  }

  static getInstance(): MailgunMock {
    if (!MailgunMock.instance) {
      MailgunMock.instance = new MailgunMock()
    }
    return MailgunMock.instance
  }

  static reset() {
    MailgunMock.instance = new MailgunMock()
  }
}

class ClientMock {
  public messages: MessagesMock

  constructor() {
    this.messages = new MessagesMock()
  }
}

class MessagesMock {
  private sentMessages: any[] = []
  private shouldFail = false
  private failureError = new Error('Mailgun API Error')

  create(domain: string, params: any) {
    if (this.shouldFail) {
      return Promise.reject(this.failureError)
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

    this.sentMessages.push(message)
    return Promise.resolve(message)
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

export const mailgunMock = MailgunMock.getInstance()