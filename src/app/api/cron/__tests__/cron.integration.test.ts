import { NextRequest } from 'next/server'
import { POST as PollLeadsPOST } from '../poll-leads/route'
import { POST as SendFollowupsPOST } from '../send-followups/route'
import { setupTestDatabase, cleanupDatabase, testDataFactory } from '../../../../../tests/setup/database'
import { resetAllExternalMocks } from '../../../../__mocks__/external-services'
import { NotificationLog } from '@prisma/client'

describe('/api/cron Integration Tests', () => {
    let prisma: any

    beforeAll(async () => {
        prisma = await setupTestDatabase()
    })

    beforeEach(async () => {
        await cleanupDatabase()
        resetAllExternalMocks()
    })

    afterAll(async () => {
        await prisma.$disconnect()
    })

    describe('POST /api/cron/poll-leads', () => {
        it('should poll and import new leads from legacy database', async () => {
            // Mock legacy database data
            const mockLegacyLeads = [
                {
                    ID: 1001,
                    CampaignID: 123,
                    Email: 'newlead1@example.com',
                    Phone: '1234567890',
                    FirstName: 'New',
                    LastName: 'Lead1',
                    BusinessName: 'New Business 1',
                    CreatedDate: new Date(),
                },
                {
                    ID: 1002,
                    CampaignID: 123,
                    Email: 'newlead2@example.com',
                    Phone: '0987654321',
                    FirstName: 'New',
                    LastName: 'Lead2',
                    BusinessName: 'New Business 2',
                    CreatedDate: new Date(),
                },
            ]

            // Set up mock data in MSSQL mock
            const { mssqlMock } = require('../../../../__mocks__/external-services')
            mssqlMock.setMockData(mockLegacyLeads)

            const request = new NextRequest('http://localhost:3000/api/cron/poll-leads', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer cron-secret-key'
                }
            })

            const response = await PollLeadsPOST(request)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.success).toBe(true)
            expect(data.result.totalProcessed).toBe(2)
            expect(data.result.newLeads).toBe(2)
            expect(data.result.duplicatesSkipped).toBe(0)

            // Verify leads were created in database
            const leads = await prisma.lead.findMany({
                where: {
                    legacyLeadId: { in: [BigInt(1001), BigInt(1002)] }
                }
            })
            expect(leads).toHaveLength(2)
            expect(leads[0].firstName).toBe('New')
            expect(leads[0].intakeToken).toBeTruthy()
        })

        it('should skip duplicate leads', async () => {
            // Create existing lead
            await prisma.lead.create({
                data: testDataFactory.lead({
                    legacyLeadId: BigInt(2001)
                })
            })

            // Mock legacy database with same lead
            const mockLegacyLeads = [
                {
                    ID: 2001,
                    CampaignID: 123,
                    Email: 'existing@example.com',
                    Phone: '1234567890',
                    FirstName: 'Existing',
                    LastName: 'Lead',
                    BusinessName: 'Existing Business',
                    CreatedDate: new Date(),
                }
            ]

            const { mssqlMock } = require('../../../../__mocks__/external-services')
            mssqlMock.setMockData(mockLegacyLeads)

            const request = new NextRequest('http://localhost:3000/api/cron/poll-leads', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer cron-secret-key'
                }
            })

            const response = await PollLeadsPOST(request)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.result.totalProcessed).toBe(1)
            expect(data.result.newLeads).toBe(0)
            expect(data.result.duplicatesSkipped).toBe(1)
        })

        it('should require proper authorization', async () => {
            const request = new NextRequest('http://localhost:3000/api/cron/poll-leads', {
                method: 'POST'
            })

            const response = await PollLeadsPOST(request)

            expect(response.status).toBe(401)
        })
    })

    describe('POST /api/cron/send-followups', () => {
        it('should send scheduled follow-up notifications', async () => {
            // Create lead with pending follow-ups
            const lead = await prisma.lead.create({
                data: testDataFactory.lead({
                    status: 'PENDING',
                    email: 'followup@example.com',
                    phone: '+1234567890'
                })
            })

            // Create scheduled follow-ups
            const now = new Date()
            const pastTime = new Date(now.getTime() - 60000) // 1 minute ago

            await prisma.followupQueue.createMany({
                data: [
                    {
                        leadId: lead.id,
                        scheduledAt: pastTime,
                        followupType: 'HOURS_3',
                        status: 'PENDING'
                    },
                    {
                        leadId: lead.id,
                        scheduledAt: new Date(now.getTime() + 60000), // 1 minute from now
                        followupType: 'HOURS_9',
                        status: 'PENDING'
                    }
                ]
            })

            const request = new NextRequest('http://localhost:3000/api/cron/send-followups', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer cron-secret-key'
                }
            })

            const response = await SendFollowupsPOST(request)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.success).toBe(true)
            expect(data.result.processed).toBe(1) // Only past due follow-up
            expect(data.result.sent).toBe(1)

            // Verify follow-up was marked as sent
            const followup = await prisma.followupQueue.findFirst({
                where: {
                    leadId: lead.id,
                    followupType: 'HOURS_3'
                }
            })
            expect(followup.status).toBe('SENT')
            expect(followup.sentAt).toBeTruthy()
        })

        it('should cancel follow-ups for leads that are no longer pending', async () => {
            // Create lead that's no longer pending
            const lead = await prisma.lead.create({
                data: testDataFactory.lead({
                    status: 'IN_PROGRESS' // Changed from PENDING
                })
            })

            // Create scheduled follow-up
            const pastTime = new Date(Date.now() - 60000)
            await prisma.followupQueue.create({
                data: {
                    leadId: lead.id,
                    scheduledAt: pastTime,
                    followupType: 'HOURS_3',
                    status: 'PENDING'
                }
            })

            const request = new NextRequest('http://localhost:3000/api/cron/send-followups', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer cron-secret-key'
                }
            })

            const response = await SendFollowupsPOST(request)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.result.cancelled).toBe(1)

            // Verify follow-up was cancelled
            const followup = await prisma.followupQueue.findFirst({
                where: {
                    leadId: lead.id,
                    followupType: 'HOURS_3'
                }
            })
            expect(followup.status).toBe('CANCELLED')
        })

        it('should handle notification failures gracefully', async () => {
            // Set up mock to fail
            const { twilioMock, mailgunMock } = require('../../../../__mocks__/external-services')
            twilioMock.setShouldFail(true, new Error('SMS service unavailable'))
            mailgunMock.setShouldFail(true, new Error('Email service unavailable'))

            const lead = await prisma.lead.create({
                data: testDataFactory.lead({
                    status: 'PENDING',
                    email: 'fail@example.com',
                    phone: '+1234567890'
                })
            })

            const pastTime = new Date(Date.now() - 60000)
            await prisma.followupQueue.create({
                data: {
                    leadId: lead.id,
                    scheduledAt: pastTime,
                    followupType: 'HOURS_3',
                    status: 'PENDING'
                }
            })

            const request = new NextRequest('http://localhost:3000/api/cron/send-followups', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer cron-secret-key'
                }
            })

            const response = await SendFollowupsPOST(request)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.result.processed).toBe(1)
            expect(data.result.failed).toBe(1)

            // Verify notification logs were created with failure status
            const notificationLogs = await prisma.notificationLog.findMany({
                where: { leadId: lead.id }
            })
            expect(notificationLogs.length).toBeGreaterThan(0)
            expect(notificationLogs.some((log: NotificationLog) => log.status === 'FAILED')).toBe(true)
        })
    })
})