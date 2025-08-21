import { NextRequest, NextResponse } from 'next/server';
import { getLegacyDatabase } from '@/lib/legacy-db';
import { prisma } from '@/lib/prisma';

// Utility function to convert BigInt values to strings for JSON serialization
function serializeBigInt(obj: any): any {
    if (obj === null || obj === undefined) {
        return obj;
    }
    
    if (typeof obj === 'bigint') {
        return obj.toString();
    }
    
    if (Array.isArray(obj)) {
        return obj.map(serializeBigInt);
    }
    
    if (typeof obj === 'object') {
        const serialized: any = {};
        for (const [key, value] of Object.entries(obj)) {
            serialized[key] = serializeBigInt(value);
        }
        return serialized;
    }
    
    return obj;
}

// Default test record values
const DEFAULT_TEST_RECORD = {
    CampaignID: 11302,
    SourceID: 6343,
    PublisherID: 40235,
    SubID: 'TEST',
    FirstName: 'TEST',
    LastName: 'TEST',
    Email: 'ARDABASOGLU@GMAIL.COM',
    Phone: '+905326666815',
    AlternatePhone: null,
    Address: '1260 NW 133 AVE',
    Address2: null,
    City: 'Fort Lauderdale',
    State: 'FL',
    ZipCode: '33323',
    Country: 'USA',
    TestLead: 1,
    NetworkID: 10000,
    LeadCost: 0.00,
    Currency: 'USD',
    Payin: 0.00,
    PayOutType: 1,
    CurrencyIn: 'USD'
};

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, customValues } = body;

        if (!action || !['insert', 'delete', 'cleanup'].includes(action)) {
            return NextResponse.json(
                { error: 'Action must be "insert", "delete", or "cleanup"' },
                { status: 400 }
            );
        }

        const legacyDb = getLegacyDatabase();
        await legacyDb.connect();

        let result;

        switch (action) {
            case 'insert':
                result = await insertTestRecord(legacyDb, customValues);
                break;
            case 'delete':
                result = await deleteTestRecord(legacyDb, customValues);
                break;
            case 'cleanup':
                result = await cleanupRelatedRecords(customValues);
                break;
        }

        await legacyDb.disconnect();

        return NextResponse.json({
            success: true,
            action,
            result: serializeBigInt(result),
            timestamp: new Date().toISOString(),
        });

    } catch (error) {
        console.error('Legacy DB test error:', error);
        return NextResponse.json(
            {
                error: 'Internal server error',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

export async function GET() {
    try {
        const legacyDb = getLegacyDatabase();
        await legacyDb.connect();

        // Check for existing test records
        const existingRecords = await legacyDb.query(`
      SELECT LeadID, PostDT, CampaignID, SourceID, PublisherID, SubID, FirstName, LastName, Email, Phone, TestLead, NetworkID, LeadCost, Currency, Payin, PayOutType, CurrencyIn
      FROM [LeadData2].[dbo].[Leads]
      WHERE CampaignID = @CampaignID
        AND SourceID = @SourceID
        AND PublisherID = @PublisherID
        AND SubID = @SubID
        AND FirstName = @FirstName
        AND LastName = @LastName
        AND Email = @Email
        AND Phone = @Phone
        AND TestLead = @TestLead
        AND NetworkID = @NetworkID
        AND LeadCost = @LeadCost
        AND Currency = @Currency
        AND Payin = @Payin
        AND PayOutType = @PayOutType
        AND CurrencyIn = @CurrencyIn
      ORDER BY PostDT DESC
    `, DEFAULT_TEST_RECORD);

        // Check for related records in our app database
        const relatedAppRecords = await prisma.lead.findMany({
            where: {
                campaignId: DEFAULT_TEST_RECORD.CampaignID,
                firstName: DEFAULT_TEST_RECORD.FirstName,
                lastName: DEFAULT_TEST_RECORD.LastName,
                email: DEFAULT_TEST_RECORD.Email,
                phone: DEFAULT_TEST_RECORD.Phone.replace(/\D/g, ''), // Remove non-digits for comparison
            },
            select: {
                id: true,
                legacyLeadId: true,
                campaignId: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                status: true,
                createdAt: true,
                intakeToken: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        await legacyDb.disconnect();

        return NextResponse.json({
            defaultValues: DEFAULT_TEST_RECORD,
            existingLegacyRecords: serializeBigInt(existingRecords),
            relatedAppRecords: serializeBigInt(relatedAppRecords),
            timestamp: new Date().toISOString(),
        });

    } catch (error) {
        console.error('Get legacy DB test data error:', error);
        return NextResponse.json(
            {
                error: 'Internal server error',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

async function insertTestRecord(legacyDb: any, customValues?: any) {
    const values = { ...DEFAULT_TEST_RECORD, ...customValues };

    const insertQuery = `
    INSERT INTO [LeadData2].[dbo].[Leads]
    ([PostDT],[CampaignID],[SourceID],[PublisherID],[SubID],[FirstName],[LastName],[Email],[Phone],[AlternatePhone],[Address],[Address2],[City],[State],[ZipCode],[Country],[TestLead],[DateID],[NetworkID],[LeadCost],[Currency],[Payin],[PayOutType],[CurrencyIn])
    VALUES(
      GETDATE(),
      @CampaignID,
      @SourceID,
      @PublisherID,
      @SubID,
      @FirstName,
      @LastName,
      @Email,
      @Phone,
      @AlternatePhone,
      @Address,
      @Address2,
      @City,
      @State,
      @ZipCode,
      @Country,
      @TestLead,
      CONVERT(INT, CONVERT(CHAR(8), GETDATE(), 112)),
      @NetworkID,
      @LeadCost,
      @Currency,
      @Payin,
      @PayOutType,
      @CurrencyIn
    );
    SELECT SCOPE_IDENTITY() as NewLeadID;
  `;

    const result = await legacyDb.query(insertQuery, values);
    const newLeadId = result[0]?.NewLeadID;

    return {
        message: 'Test record inserted successfully',
        newLeadId,
        insertedValues: values,
    };
}

async function deleteTestRecord(legacyDb: any, customValues?: any) {
    const values = { ...DEFAULT_TEST_RECORD, ...customValues };

    const deleteQuery = `
    DELETE FROM [LeadData2].[dbo].[Leads]
    WHERE CampaignID = @CampaignID
      AND SourceID = @SourceID
      AND PublisherID = @PublisherID
      AND SubID = @SubID
      AND FirstName = @FirstName
      AND LastName = @LastName
      AND Email = @Email
      AND Phone = @Phone
      AND Address = @Address
      AND City = @City
      AND State = @State
      AND ZipCode = @ZipCode
      AND Country = @Country
      AND TestLead = @TestLead
      AND NetworkID = @NetworkID
      AND LeadCost = @LeadCost
      AND Currency = @Currency
      AND Payin = @Payin
      AND PayOutType = @PayOutType
      AND CurrencyIn = @CurrencyIn;
  `;

    const result = await legacyDb.query(deleteQuery, values);

    // Also cleanup related records in our app database
    const cleanupResult = await cleanupRelatedRecords(values);

    return {
        message: 'Test record(s) deleted successfully',
        deletedFromLegacy: true,
        cleanupResult,
        deletedValues: values,
    };
}

async function cleanupRelatedRecords(values?: any) {
    const searchValues = { ...DEFAULT_TEST_RECORD, ...values };

    try {
        // Find related leads in our app database
        const relatedLeads = await prisma.lead.findMany({
            where: {
                campaignId: searchValues.CampaignID,
                firstName: searchValues.FirstName,
                lastName: searchValues.LastName,
                email: searchValues.Email,
                phone: searchValues.Phone.replace(/\D/g, ''), // Remove non-digits for comparison
            },
            include: {
                statusHistory: true,
                followupQueue: true,
                documents: true,
                notificationLog: true,
            },
        });

        if (relatedLeads.length === 0) {
            return {
                message: 'No related records found in app database',
                deletedLeads: 0,
                deletedStatusHistory: 0,
                deletedFollowupQueue: 0,
                deletedDocuments: 0,
                deletedNotificationLogs: 0,
            };
        }

        const leadIds = relatedLeads.map(lead => lead.id);

        // Delete related records in transaction
        const result = await prisma.$transaction(async (tx) => {
            // Delete notification logs
            const deletedNotificationLogs = await tx.notificationLog.deleteMany({
                where: { leadId: { in: leadIds } },
            });

            // Delete documents
            const deletedDocuments = await tx.document.deleteMany({
                where: { leadId: { in: leadIds } },
            });

            // Delete follow-ups
            const deletedFollowUps = await tx.followupQueue.deleteMany({
                where: { leadId: { in: leadIds } },
            });

            // Delete status history
            const deletedStatusHistory = await tx.leadStatusHistory.deleteMany({
                where: { leadId: { in: leadIds } },
            });

            // Delete leads
            const deletedLeads = await tx.lead.deleteMany({
                where: { id: { in: leadIds } },
            });

            return {
                deletedLeads: deletedLeads.count,
                deletedStatusHistory: deletedStatusHistory.count,
                deletedFollowupQueue: deletedFollowUps.count,
                deletedDocuments: deletedDocuments.count,
                deletedNotificationLogs: deletedNotificationLogs.count,
            };
        });

        return {
            message: `Successfully cleaned up ${result.deletedLeads} lead(s) and related records`,
            ...result,
        };

    } catch (error) {
        console.error('Cleanup error:', error);
        throw new Error(`Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}