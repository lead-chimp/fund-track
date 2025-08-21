import { getLegacyDatabase, LegacyLead } from '@/lib/legacy-db';
import { prisma } from '@/lib/prisma';
import { Lead, LeadStatus } from '@prisma/client';
import { TokenService } from './TokenService';
import { followUpScheduler } from './FollowUpScheduler';

export interface LeadPollerConfig {
  campaignIds: number[];
  batchSize?: number;
  maxRetries?: number;
  retryDelay?: number;
}

export interface PollingResult {
  totalProcessed: number;
  newLeads: number;
  duplicatesSkipped: number;
  errors: string[];
  processingTime: number;
}

export class LeadPoller {
  private config: LeadPollerConfig;
  private legacyDb = getLegacyDatabase();

  constructor(config: LeadPollerConfig) {
    this.config = {
      batchSize: 100,
      maxRetries: 3,
      retryDelay: 1000,
      ...config,
    };
  }

  /**
   * Poll leads from legacy database and import new ones
   */
  async pollAndImportLeads(): Promise<PollingResult> {
    const startTime = Date.now();
    const result: PollingResult = {
      totalProcessed: 0,
      newLeads: 0,
      duplicatesSkipped: 0,
      errors: [],
      processingTime: 0,
    };

    try {
      console.log('🔄 Starting lead polling process...', {
        campaignIds: this.config.campaignIds,
        batchSize: this.config.batchSize,
        maxRetries: this.config.maxRetries
      });

      // Connect to legacy database
      console.log('📡 Connecting to legacy database...');
      await this.legacyDb.connect();
      console.log('✅ Successfully connected to legacy database');

      // Get the latest legacy lead ID we have already imported
      const latestLead = await prisma.lead.findFirst({
        orderBy: { legacyLeadId: 'desc' },
        where: { legacyLeadId: { not: BigInt(0) } },
      });
      const maxLegacyId = latestLead ? Number(latestLead.legacyLeadId) : 0;
      console.log(`📈 Latest legacy lead ID in our database is: ${maxLegacyId}. Fetching new leads since then.`);


      // Get leads from legacy database
      console.log('🔍 Fetching new leads from legacy database...');
      const legacyLeads = await this.fetchLeadsFromLegacy(maxLegacyId);
      result.totalProcessed = legacyLeads.length;

      console.log(`📊 Found ${legacyLeads.length} new leads in legacy database for campaigns: ${this.config.campaignIds.join(', ')}`);

      if (legacyLeads.length === 0) {
        console.log('ℹ️ No new leads found to process');
        return result;
      }

      // Process leads in batches
      const batches = this.createBatches(legacyLeads, this.config.batchSize!);
      console.log(`📦 Processing ${batches.length} batches of up to ${this.config.batchSize} leads each`);

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`🔄 Processing batch ${i + 1}/${batches.length} (${batch.length} leads)...`);
        
        try {
          const batchResult = await this.processBatch(batch);
          result.newLeads += batchResult.newLeads;
          result.duplicatesSkipped += batchResult.duplicatesSkipped;
          result.errors.push(...batchResult.errors);
          
          console.log(`✅ Batch ${i + 1} completed:`, {
            newLeads: batchResult.newLeads,
            duplicatesSkipped: batchResult.duplicatesSkipped,
            errors: batchResult.errors.length
          });
        } catch (error) {
          const errorMessage = `Batch ${i + 1} processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error(`❌ ${errorMessage}`);
          result.errors.push(errorMessage);
        }
      }

      result.processingTime = Date.now() - startTime;

      console.log(`🎉 Lead polling completed successfully:`, {
        totalProcessed: result.totalProcessed,
        newLeads: result.newLeads,
        duplicatesSkipped: result.duplicatesSkipped,
        errors: result.errors.length,
        processingTime: `${result.processingTime}ms`,
        averageTimePerLead: result.totalProcessed > 0 ? `${Math.round(result.processingTime / result.totalProcessed)}ms` : 'N/A'
      });

      return result;

    } catch (error) {
      const errorMessage = `Lead polling failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(`💥 ${errorMessage}`);
      result.errors.push(errorMessage);
      result.processingTime = Date.now() - startTime;
      return result;
    } finally {
      console.log('🔌 Disconnecting from legacy database...');
      await this.legacyDb.disconnect();
      console.log('✅ Legacy database connection closed');
    }
  }

  /**
   * Fetch leads from legacy database filtered by campaign IDs
   */
  private async fetchLeadsFromLegacy(minLeadId: number = 0): Promise<LegacyLead[]> {
    const campaignIdList = this.config.campaignIds.join(',');

    const query = `
      SELECT 
        LeadID as ID,
        CampaignID,
        Email,
        Phone,
        FirstName,
        LastName,
        PostDT as CreatedDate
      FROM Leads 
      WHERE CampaignID IN (${campaignIdList}) AND LeadID > ${minLeadId}
      ORDER BY PostDT ASC
    `;

    console.log('📋 Executing legacy database query:', {
      campaignIds: this.config.campaignIds,
      query: query.replace(/\s+/g, ' ').trim()
    });

    try {
      const queryStart = Date.now();
      const leads = await this.legacyDb.query<LegacyLead>(query);
      const queryTime = Date.now() - queryStart;
      
      console.log(`⚡ Query executed successfully in ${queryTime}ms, returned ${leads.length} leads`);
      
      if (leads.length > 0) {
        const sampleLead = leads[0];
        console.log('📄 Sample lead data:', {
          ID: sampleLead.ID,
          CampaignID: sampleLead.CampaignID,
          Email: sampleLead.Email ? '***@***.***' : null,
          Phone: sampleLead.Phone ? '***-***-****' : null,
          FirstName: sampleLead.FirstName || null,
          LastName: sampleLead.LastName || null,
          BusinessName: sampleLead.BusinessName || null,
          CreatedDate: sampleLead.CreatedDate
        });
      }
      
      return leads;
    } catch (error) {
      console.error('❌ Failed to fetch leads from legacy database:', error);
      throw new Error(`Legacy lead fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process a batch of legacy leads
   */
  private async processBatch(legacyLeads: LegacyLead[]): Promise<{
    newLeads: number;
    duplicatesSkipped: number;
    errors: string[];
  }> {
    const result: {
      newLeads: number;
      duplicatesSkipped: number;
      errors: string[];
    } = {
      newLeads: 0,
      duplicatesSkipped: 0, // This will remain 0 as we only fetch new leads
      errors: [],
    };

    console.log(`🔄 Processing batch of ${legacyLeads.length} leads...`);
    const batchStart = Date.now();

    for (let i = 0; i < legacyLeads.length; i++) {
      const legacyLead = legacyLeads[i];
      console.log(`📝 Processing lead ${i + 1}/${legacyLeads.length}: ID ${legacyLead.ID} (Campaign: ${legacyLead.CampaignID})`);
      
      try {
        // Since we only fetch new leads, we can import directly
        await this.importLead(legacyLead);
        result.newLeads++;
      } catch (error) {
        const errorMessage = `Failed to import lead ${legacyLead.ID}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(`❌ ${errorMessage}`);
        result.errors.push(errorMessage);
      }
    }

    const batchTime = Date.now() - batchStart;
    console.log(`📊 Batch processing completed in ${batchTime}ms:`, {
      processed: legacyLeads.length,
      newLeads: result.newLeads,
      duplicatesSkipped: result.duplicatesSkipped,
      errors: result.errors.length,
      averageTimePerLead: legacyLeads.length > 0 ? `${Math.round(batchTime / legacyLeads.length)}ms` : 'N/A'
    });

    return result;
  }

  /**
   * Import a single lead. Assumes the lead is new.
   */
  private async importLead(legacyLead: LegacyLead): Promise<void> {
    try {
      console.log(`🆕 Importing new lead ${legacyLead.ID}...`);

      // Transform and create new lead with intake token
      const transformedLead = this.transformLegacyLead(legacyLead);
      
      console.log(`🔄 Transformed lead data:`, {
        legacyLeadId: transformedLead.legacyLeadId.toString(),
        campaignId: transformedLead.campaignId,
        email: transformedLead.email ? '***@***.***' : null,
        phone: transformedLead.phone ? '***-***-****' : null,
        firstName: transformedLead.firstName,
        lastName: transformedLead.lastName,
        businessName: transformedLead.businessName,
        status: transformedLead.status,
        intakeToken: transformedLead.intakeToken ? '***' : null
      });

      const createStart = Date.now();
      const newLead = await prisma.lead.create({
        data: transformedLead,
      });
      const createTime = Date.now() - createStart;

      console.log(`💾 Lead created in database in ${createTime}ms with ID: ${newLead.id}`);

      // Schedule follow-ups for the new lead since it's in PENDING status
      console.log(`📅 Scheduling follow-ups for lead ${newLead.id}...`);
      try {
        await followUpScheduler.scheduleFollowUpsForLead(newLead.id);
        console.log(`✅ Successfully scheduled follow-ups for lead ${newLead.id}`);
      } catch (error) {
        console.error(`⚠️ Failed to schedule follow-ups for lead ${newLead.id}:`, error);
        // Don't fail the import if follow-up scheduling fails
      }

      console.log(`🎉 Successfully imported lead ${legacyLead.ID} with new ID ${newLead.id}`);
    } catch (error) {
      console.error(`💥 Failed to import lead ${legacyLead.ID}:`, error);
      throw error;
    }
  }

  /**
   * Transform legacy lead data to application format
   */
  private transformLegacyLead(legacyLead: LegacyLead): Omit<Lead, 'id' | 'createdAt' | 'updatedAt'> {
    console.log(`🔄 Transforming legacy lead ${legacyLead.ID}...`);
    
    // Generate intake token for new leads
    const intakeToken = TokenService.generateToken();
    console.log(`🎫 Generated intake token for lead ${legacyLead.ID}`);
    
    // Sanitize data
    const sanitizedEmail = this.sanitizeString(legacyLead.Email);
    const sanitizedPhone = this.sanitizePhone(legacyLead.Phone);
    const sanitizedFirstName = this.sanitizeString(legacyLead.FirstName);
    const sanitizedLastName = this.sanitizeString(legacyLead.LastName);
    const sanitizedBusinessName = null; // BusinessName not available in legacy schema
    
    console.log(`🧹 Data sanitization completed for lead ${legacyLead.ID}:`, {
      email: sanitizedEmail ? 'present' : 'null',
      phone: sanitizedPhone ? 'present' : 'null',
      firstName: sanitizedFirstName ? 'present' : 'null',
      lastName: sanitizedLastName ? 'present' : 'null',
      businessName: 'null (not available in legacy schema)'
    });
    
    return {
      legacyLeadId: BigInt(legacyLead.ID),
      campaignId: legacyLead.CampaignID,
      email: sanitizedEmail,
      phone: sanitizedPhone,
      firstName: sanitizedFirstName,
      lastName: sanitizedLastName,
      businessName: sanitizedBusinessName,
      status: LeadStatus.PENDING, // Set to pending since we're generating intake token
      intakeToken,
      intakeCompletedAt: null,
      step1CompletedAt: null,
      step2CompletedAt: null,
      importedAt: new Date(),
    };
  }

  /**
   * Sanitize string fields
   */
  private sanitizeString(value: string | null | undefined): string | null {
    if (!value || typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  /**
   * Sanitize and format phone numbers
   */
  private sanitizePhone(phone: string | null | undefined): string | null {
    if (!phone || typeof phone !== 'string') {
      return null;
    }

    // Remove all non-digit characters
    const digitsOnly = phone.replace(/\D/g, '');

    // Return null if no digits or invalid length
    if (digitsOnly.length < 10 || digitsOnly.length > 15) {
      return null;
    }

    return digitsOnly;
  }

  /**
   * Create batches from array
   */
  private createBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Get leads that need intake tokens generated
   */
  async getLeadsNeedingIntakeTokens(): Promise<Lead[]> {
    try {
      console.log('🔍 Fetching leads that need intake tokens...');
      
      const leads = await prisma.lead.findMany({
        where: {
          intakeToken: null,
          status: LeadStatus.NEW,
        },
        orderBy: {
          importedAt: 'desc',
        },
      });
      
      console.log(`📊 Found ${leads.length} leads needing intake tokens`);
      return leads;
    } catch (error) {
      console.error('❌ Failed to fetch leads needing intake tokens:', error);
      throw error;
    }
  }

  /**
   * Update lead status to pending and set intake token
   */
  async updateLeadWithIntakeToken(leadId: number, intakeToken: string): Promise<void> {
    try {
      console.log(`🎫 Updating lead ${leadId} with intake token and setting status to PENDING...`);
      
      await prisma.lead.update({
        where: { id: leadId },
        data: {
          intakeToken,
          status: LeadStatus.PENDING,
        },
      });
      
      console.log(`✅ Successfully updated lead ${leadId} with intake token`);
    } catch (error) {
      console.error(`❌ Failed to update lead ${leadId} with intake token:`, error);
      throw error;
    }
  }
}

// Factory function to create LeadPoller with default config
export function createLeadPoller(): LeadPoller {
  const campaignIds = process.env.MERCHANT_FUNDING_CAMPAIGN_IDS
    ? process.env.MERCHANT_FUNDING_CAMPAIGN_IDS.split(',').map(id => parseInt(id.trim()))
    : [];

  if (campaignIds.length === 0) {
    throw new Error('MERCHANT_FUNDING_CAMPAIGN_IDS environment variable is required');
  }

  return new LeadPoller({
    campaignIds,
    batchSize: process.env.LEAD_POLLING_BATCH_SIZE ? parseInt(process.env.LEAD_POLLING_BATCH_SIZE) : 100,
  });
}

// Factory function to create LeadPoller for testing with test campaign ID
export function createTestLeadPoller(): LeadPoller {
  return new LeadPoller({
    campaignIds: [11302], // Test campaign ID
    batchSize: 10,
  });
}