import '@testing-library/jest-dom'

// Mock NextAuth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    lead: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    leadStatusHistory: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    leadNote: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    document: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    followupQueue: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    notificationLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
    $disconnect: jest.fn(),
  },
}))

// Mock auth options
jest.mock('@/lib/auth', () => ({
  authOptions: {},
}))

// Mock external services
jest.mock('twilio', () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        sid: 'mock-sms-sid',
        status: 'sent',
      }),
    },
  }))
})

jest.mock('mailgun.js', () => {
  return jest.fn().mockImplementation(() => ({
    client: jest.fn().mockReturnValue({
      messages: {
        create: jest.fn().mockResolvedValue({
          id: 'mock-email-id',
          message: 'Queued. Thank you.',
        }),
      },
    }),
  }))
})

jest.mock('backblaze-b2', () => {
  return jest.fn().mockImplementation(() => ({
    authorize: jest.fn().mockResolvedValue({
      data: {
        authorizationToken: 'mock-auth-token',
        apiUrl: 'https://api.backblaze.com',
        downloadUrl: 'https://f000.backblaze.com',
      },
    }),
    uploadFile: jest.fn().mockResolvedValue({
      data: {
        fileId: 'mock-file-id',
        fileName: 'mock-file-name',
        contentLength: 1024,
      },
    }),
    downloadFileById: jest.fn().mockResolvedValue({
      data: Buffer.from('mock file content'),
    }),
    deleteFileVersion: jest.fn().mockResolvedValue({
      data: { fileId: 'mock-file-id' },
    }),
  }))
})

// Mock MS SQL Server
jest.mock('mssql', () => ({
  connect: jest.fn().mockResolvedValue({
    request: jest.fn().mockReturnValue({
      query: jest.fn().mockResolvedValue({
        recordset: [],
      }),
    }),
    close: jest.fn(),
  }),
  ConnectionPool: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue({}),
    request: jest.fn().mockReturnValue({
      query: jest.fn().mockResolvedValue({
        recordset: [],
      }),
    }),
    close: jest.fn(),
  })),
}))

// Mock node-cron
jest.mock('node-cron', () => ({
  schedule: jest.fn(),
  destroy: jest.fn(),
}))

// Mock NextResponse
jest.mock('next/server', () => ({
  NextRequest: class NextRequest {
    constructor(url, options = {}) {
      this.url = url;
      this.method = options.method || 'GET';
      this.headers = new Map(Object.entries(options.headers || {}));
      this.body = options.body;
    }
    
    async json() {
      return JSON.parse(this.body || '{}');
    }
  },
  NextResponse: {
    json: (data, options = {}) => ({
      json: () => Promise.resolve(data),
      status: options.status || 200,
      headers: new Map(),
    }),
  },
}))

// Mock Next.js server components
Object.defineProperty(global, 'Request', {
  value: class Request {
    constructor(url, options = {}) {
      Object.defineProperty(this, 'url', { value: url, writable: false });
      this.method = options.method || 'GET';
      this.headers = new Map(Object.entries(options.headers || {}));
      this.body = options.body;
    }
  }
});

Object.defineProperty(global, 'Response', {
  value: class Response {
    constructor(body, options = {}) {
      this.body = body;
      this.status = options.status || 200;
      this.headers = new Map(Object.entries(options.headers || {}));
    }
    
    json() {
      return Promise.resolve(JSON.parse(this.body));
    }
  }
});

// Mock environment variables for tests
process.env.NEXTAUTH_SECRET = 'test-secret'
process.env.NEXTAUTH_URL = 'http://localhost:3000'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.LEGACY_DB_SERVER = 'localhost'
process.env.LEGACY_DB_DATABASE = 'test'
process.env.LEGACY_DB_USERNAME = 'test'
process.env.LEGACY_DB_PASSWORD = 'test'
process.env.TWILIO_ACCOUNT_SID = 'test-sid'
process.env.TWILIO_AUTH_TOKEN = 'test-token'
process.env.TWILIO_PHONE_NUMBER = '+1234567890'
process.env.MAILGUN_API_KEY = 'test-key'
process.env.MAILGUN_DOMAIN = 'test.com'
process.env.B2_APPLICATION_KEY_ID = 'test-key-id'
process.env.B2_APPLICATION_KEY = 'test-key'
process.env.B2_BUCKET_NAME = 'test-bucket'