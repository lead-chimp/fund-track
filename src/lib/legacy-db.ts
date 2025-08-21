import sql from 'mssql';

export interface LegacyDbConfig {
  server: string;
  database: string;
  user: string;
  password: string;
  port?: number;
  options?: {
    encrypt?: boolean;
    trustServerCertificate?: boolean;
    requestTimeout?: number;
    connectionTimeout?: number;
    enableArithAbort?: boolean;
    abortTransactionOnError?: boolean;
    [key: string]: any; // Allow additional mssql options
  };
}

export interface LegacyLead {
  ID: number;
  CampaignID: number;
  Email?: string;
  Phone?: string;
  FirstName?: string;
  LastName?: string;
  BusinessName?: string;
  CreatedDate?: Date;
  [key: string]: any; // Allow for additional fields from legacy system
}

class LegacyDatabase {
  private pool: sql.ConnectionPool | null = null;
  private config: LegacyDbConfig;

  constructor(config: LegacyDbConfig) {
    this.config = {
      ...config,
      options: {
        encrypt: config.options?.encrypt ?? false,
        trustServerCertificate: config.options?.trustServerCertificate ?? true,
        requestTimeout: config.options?.requestTimeout ?? 30000,
        connectionTimeout: config.options?.connectionTimeout ?? 15000,
        ...config.options,
      },
    };
  }

  async connect(): Promise<void> {
    try {
      if (this.pool) {
        return; // Already connected
      }

      console.log('📡 Connecting to legacy database with config:', {
        server: this.config.server,
        database: this.config.database,
        port: this.config.port,
        encrypt: this.config.options?.encrypt,
        trustServerCertificate: this.config.options?.trustServerCertificate,
      });

      this.pool = new sql.ConnectionPool(this.config);
      await this.pool.connect();
      console.log('✅ Connected to legacy MS SQL Server database');
    } catch (error) {
      console.error('❌ Failed to connect to legacy database:', error);
      throw new Error(`Legacy database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.pool) {
        await this.pool.close();
        this.pool = null;
        console.log('Disconnected from legacy MS SQL Server database');
      }
    } catch (error) {
      console.error('Error disconnecting from legacy database:', error);
    }
  }

  async query<T = any>(queryText: string, parameters?: Record<string, any>): Promise<T[]> {
    if (!this.pool) {
      throw new Error('Database not connected. Call connect() first.');
    }

    try {
      const request = this.pool.request();

      // Add parameters if provided
      if (parameters) {
        Object.entries(parameters).forEach(([key, value]) => {
          request.input(key, value);
        });
      }

      const result = await request.query(queryText);
      return result.recordset as T[];
    } catch (error) {
      console.error('Legacy database query failed:', error);
      throw new Error(`Query execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.connect();
      await this.query('SELECT 1 as test');
      return true;
    } catch (error) {
      console.error('Legacy database connection test failed:', error);
      return false;
    }
  }

  isConnected(): boolean {
    return this.pool !== null && this.pool.connected;
  }
}

// Singleton instance
let legacyDb: LegacyDatabase | null = null;

export function getLegacyDatabase(): LegacyDatabase {
  if (!legacyDb) {
    const config: LegacyDbConfig = {
      server: process.env.LEGACY_DB_SERVER || '',
      database: process.env.LEGACY_DB_DATABASE || 'LeadData2',
      user: process.env.LEGACY_DB_USER || '',
      password: process.env.LEGACY_DB_PASSWORD || '',
      port: process.env.LEGACY_DB_PORT ? parseInt(process.env.LEGACY_DB_PORT) : 1433,
      options: {
        encrypt: process.env.LEGACY_DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.LEGACY_DB_TRUST_CERT === 'true',
        requestTimeout: process.env.LEGACY_DB_REQUEST_TIMEOUT ? parseInt(process.env.LEGACY_DB_REQUEST_TIMEOUT) : 30000,
        connectionTimeout: process.env.LEGACY_DB_CONNECTION_TIMEOUT ? parseInt(process.env.LEGACY_DB_CONNECTION_TIMEOUT) : 15000,
        enableArithAbort: true,
        abortTransactionOnError: true,
      },
    };

    legacyDb = new LegacyDatabase(config);
  }

  return legacyDb;
}

export { LegacyDatabase };