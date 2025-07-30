/**
 * Environment variables configuration with type safety
 */

export const env = {
  // Database Configuration
  DATABASE_URL: process.env.DATABASE_URL || '',
  
  // Legacy MS SQL Server Configuration
  LEGACY_DB_HOST: process.env.LEGACY_DB_HOST || 'localhost',
  LEGACY_DB_PORT: parseInt(process.env.LEGACY_DB_PORT || '1433'),
  LEGACY_DB_USER: process.env.LEGACY_DB_USER || '',
  LEGACY_DB_PASSWORD: process.env.LEGACY_DB_PASSWORD || '',
  LEGACY_DB_NAME: process.env.LEGACY_DB_NAME || 'LeadData2',
  LEGACY_DB_ENCRYPT: process.env.LEGACY_DB_ENCRYPT === 'true',
  
  // NextAuth Configuration
  NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || '',
  
  // Twilio Configuration
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || '',
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || '',
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER || '',
  
  // MailGun Configuration
  MAILGUN_API_KEY: process.env.MAILGUN_API_KEY || '',
  MAILGUN_DOMAIN: process.env.MAILGUN_DOMAIN || '',
  MAILGUN_FROM_EMAIL: process.env.MAILGUN_FROM_EMAIL || 'noreply@merchantfunding.com',
  
  // Backblaze B2 Configuration
  B2_APPLICATION_KEY_ID: process.env.B2_APPLICATION_KEY_ID || '',
  B2_APPLICATION_KEY: process.env.B2_APPLICATION_KEY || '',
  B2_BUCKET_NAME: process.env.B2_BUCKET_NAME || '',
  B2_BUCKET_ID: process.env.B2_BUCKET_ID || '',
  
  // Application Configuration
  APP_URL: process.env.APP_URL || 'http://localhost:3000',
  INTAKE_BASE_URL: process.env.INTAKE_BASE_URL || 'http://localhost:3000/application',
  
  // Cron Job Configuration
  LEAD_POLL_INTERVAL: process.env.LEAD_POLL_INTERVAL || '*/5 * * * *',
  FOLLOWUP_POLL_INTERVAL: process.env.FOLLOWUP_POLL_INTERVAL || '*/10 * * * *',
  
  // Campaign Configuration
  MERCHANT_FUNDING_CAMPAIGN_ID: parseInt(process.env.MERCHANT_FUNDING_CAMPAIGN_ID || '123'),
  
  // File Upload Configuration
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
  ALLOWED_FILE_TYPES: (process.env.ALLOWED_FILE_TYPES || 'pdf,jpg,jpeg,png,docx').split(','),
  
  // Environment
  NODE_ENV: process.env.NODE_ENV || 'development',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
} as const;

/**
 * Validates that all required environment variables are set
 */
export function validateEnv() {
  const requiredVars = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}\n` +
      'Please check your .env.local file and ensure all required variables are set.'
    );
  }
}

/**
 * Type definitions for environment variables
 */
export type EnvConfig = typeof env;