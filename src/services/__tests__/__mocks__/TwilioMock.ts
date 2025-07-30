export class TwilioMock {
  private static instance: TwilioMock
  public messages: MessagesMock

  constructor() {
    this.messages = new MessagesMock()
  }

  static getInstance(): TwilioMock {
    if (!TwilioMock.instance) {
      TwilioMock.instance = new TwilioMock()
    }
    return TwilioMock.instance
  }

  static reset() {
    TwilioMock.instance = new TwilioMock()
  }
}

class MessagesMock {
  private sentMessages: any[] = []
  private shouldFail = false
  private failureError = new Error('Twilio API Error')

  create(params: any) {
    if (this.shouldFail) {
      return Promise.reject(this.failureError)
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

export const twilioMock = TwilioMock.getInstance()