import { NotificationService } from '../NotificationService'
import { setupTestDatabase, cleanupDatabase, testDataFactory } from '../../../tests/setup/database'
import { resetAllExternalMocks, twilioMock, mailgunMock } from '../../__mocks__/external-services'

describe('NotificationService Integration Tests', () => {
    let prisma: any
    let notificationService: NotificationService

    beforeAll(async () => {
        prisma = await setupTestDatabase()
    })

    beforeEach(async () => {
        await cleanupDatabase()
        resetAllExternalMocks()
        notificationService = new NotificationService()
    })

    afterAll(async () => {
        await prisma.$disconnect()
    })

    describe('Email Integration', () => {
        it('should send email and log to database', async () => {
            // Create test lead
            const lead = await prisma.lead.create({
                data: testDataFactory.lead({
                    email: 'integration@example.com'
                })
            })

            const emailData = {
                to: 'integration@example.com',
                subject: 'Integration Test Email',
                text: 'This is an integration test email',
                html: '<p>This is an integration test email</p>',
                leadId: lead.id
            }

            const result = await notificationService.sendEmail(emailData)

            expect(result).toBeDefined()
            expect(result.externalId).toBeTruthy()

            // Verify database logging
            const notificationLog = await prisma.notificationLog.findFirst({
                where: {
                    leadId: lead.id,
                    type: 'EMAIL'
                }
            })

            expect(notificationLog).toBeTruthy()
            expect(notificationLog.recipient).toBe('integration@example.com')
            expect(notificationLog.subject).toBe('Integration Test Email')
            expect(notificationLog.status).toBe('SENT')
            expect(notificationLog.externalId).toBe(result.externalId)
            expect(notificationLog.sentAt).toBeTruthy()

            // Verify external service was called
            const sentEmails = mailgunMock.getSentEmails()
            expect(sentEmails).toHaveLength(1)
            expect(sentEmails[0].to).toBe('integration@example.com')
        })

        it('should handle email failures and log errors', async () => {
            const lead = await prisma.lead.create({
                data: testDataFactory.lead()
            })

            // Set up mock to fail
            mailgunMock.setShouldFail(true, new Error('Email service down'))

            const emailData = {
                to: 'fail@example.com',
                subject: 'Failed Email',
                text: 'This should fail',
                leadId: lead.id
            }

            await expect(notificationService.sendEmail(emailData)).rejects.toThrow('Email service down')

            // Verify failure was logged
            const notificationLog = await prisma.notificationLog.findFirst({
                where: {
                    leadId: lead.id,
                    type: 'EMAIL'
                }
            })

            expect(notificationLog.status).toBe('FAILED')
            expect(notificationLog.errorMessage).toBe('Email service down')
            expect(notificationLog.sentAt).toBeNull()
        })
    })

    describe('SMS Integration', () => {
        it('should send SMS and log to database', async () => {
            const lead = await prisma.lead.create({
                data: testDataFactory.lead({
                    phone: '+1234567890'
                })
            })

            const smsData = {
                to: '+1234567890',
                message: 'Integration test SMS',
                leadId: lead.id
            }

            const result = await notificationService.sendSMS(smsData)

            expect(result).toBeDefined()
            expect(result.externalId).toBeTruthy()

            // Verify database logging
            const notificationLog = await prisma.notificationLog.findFirst({
                where: {
                    leadId: lead.id,
                    type: 'SMS'
                }
            })

            expect(notificationLog).toBeTruthy()
            expect(notificationLog.recipient).toBe('+1234567890')
            expect(notificationLog.content).toBe('Integration test SMS')
            expect(notificationLog.status).toBe('SENT')
            expect(notificationLog.externalId).toBe(result.externalId)

            // Verify external service was called
            const sentMessages = twilioMock.getSentMessages()
            expect(sentMessages).toHaveLength(1)
            expect(sentMessages[0].to).toBe('+1234567890')
        })

        it('should handle SMS failures and log errors', async () => {
            const lead = await prisma.lead.create({
                data: testDataFactory.lead()
            })

            // Set up mock to fail
            twilioMock.setShouldFail(true, new Error('SMS service unavailable'))

            const smsData = {
                to: '+1987654321',
                message: 'This should fail',
                leadId: lead.id
            }

            await expect(notificationService.sendSMS(smsData)).rejects.toThrow('SMS service unavailable')

            // Verify failure was logged
            const notificationLog = await prisma.notificationLog.findFirst({
                where: {
                    leadId: lead.id,
                    type: 'SMS'
                }
            })

            expect(notificationLog.status).toBe('FAILED')
            expect(notificationLog.errorMessage).toBe('SMS service unavailable')
        })
    })

    describe('Notification Statistics', () => {
        it('should return accurate notification statistics', async () => {
            const lead = await prisma.lead.create({
                data: testDataFactory.lead()
            })

            // Create various notification logs
            await prisma.notificationLog.createMany({
                data: [
                    {
                        leadId: lead.id,
                        type: 'EMAIL',
                        recipient: 'test@example.com',
                        status: 'SENT',
                        content: 'Test email 1'
                    },
                    {
                        leadId: lead.id,
                        type: 'EMAIL',
                        recipient: 'test@example.com',
                        status: 'SENT',
                        content: 'Test email 2'
                    },
                    {
                        leadId: lead.id,
                        type: 'EMAIL',
                        recipient: 'test@example.com',
                        status: 'FAILED',
                        content: 'Failed email',
                        errorMessage: 'Service down'
                    },
                    {
                        leadId: lead.id,
                        type: 'SMS',
                        recipient: '+1234567890',
                        status: 'SENT',
                        content: 'Test SMS'
                    }
                ]
            })

            const stats = await notificationService.getNotificationStats(lead.id)

            expect(stats).toEqual({
                EMAIL_SENT: 2,
                EMAIL_FAILED: 1,
                SMS_SENT: 1
            })
        })

        it('should return recent notifications with lead details', async () => {
            const lead1 = await prisma.lead.create({
                data: testDataFactory.lead({
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john@example.com'
                })
            })

            const lead2 = await prisma.lead.create({
                data: testDataFactory.lead({
                    firstName: 'Jane',
                    lastName: 'Smith',
                    email: 'jane@example.com'
                })
            })

            // Create notification logs
            await prisma.notificationLog.createMany({
                data: [
                    {
                        leadId: lead1.id,
                        type: 'EMAIL',
                        recipient: 'john@example.com',
                        status: 'SENT',
                        content: 'Email to John',
                        createdAt: new Date(Date.now() - 60000) // 1 minute ago
                    },
                    {
                        leadId: lead2.id,
                        type: 'SMS',
                        recipient: '+1234567890',
                        status: 'SENT',
                        content: 'SMS to Jane',
                        createdAt: new Date() // Now
                    }
                ]
            })

            const recentNotifications = await notificationService.getRecentNotifications(10)

            expect(recentNotifications).toHaveLength(2)

            // Should be ordered by most recent first
            expect(recentNotifications[0].type).toBe('SMS')
            expect(recentNotifications[0].lead).toBeTruthy()
            expect(recentNotifications[0].lead!.firstName).toBe('Jane')

            expect(recentNotifications[1].type).toBe('EMAIL')
            expect(recentNotifications[1].lead).toBeTruthy()
            expect(recentNotifications[1].lead!.firstName).toBe('John')
        })
    })

    describe('Retry Logic Integration', () => {
        it('should retry failed operations and eventually succeed', async () => {
            const lead = await prisma.lead.create({
                data: testDataFactory.lead()
            })

            // Set up mock to fail first two attempts, then succeed
            let attemptCount = 0
            const clientMock = mailgunMock.client({ key: 'test-key' })
            const originalCreate = clientMock.messages.create
            clientMock.messages.create = jest.fn().mockImplementation(async (domain: string, params: any) => {
                attemptCount++
                if (attemptCount <= 2) {
                    throw new Error('Temporary failure')
                }
                return originalCreate.call(clientMock.messages, domain, params)
            })

            const emailData = {
                to: 'retry@example.com',
                subject: 'Retry Test',
                text: 'This should succeed after retries',
                leadId: lead.id
            }

            const result = await notificationService.sendEmail(emailData)

            expect(result).toBeDefined()
            expect(attemptCount).toBe(3) // 1 initial + 2 retries

            // Verify final success was logged
            const notificationLog = await prisma.notificationLog.findFirst({
                where: {
                    leadId: lead.id,
                    type: 'EMAIL'
                }
            })

            expect(notificationLog.status).toBe('SENT')
            expect(notificationLog.externalId).toBeTruthy()
        })

        it('should fail after maximum retries and log final error', async () => {
            const lead = await prisma.lead.create({
                data: testDataFactory.lead()
            })

            // Set up mock to always fail
            twilioMock.setShouldFail(true, new Error('Persistent failure'))

            const smsData = {
                to: '+1234567890',
                message: 'This will fail permanently',
                leadId: lead.id
            }

            await expect(notificationService.sendSMS(smsData)).rejects.toThrow('Persistent failure')

            // Verify final failure was logged
            const notificationLog = await prisma.notificationLog.findFirst({
                where: {
                    leadId: lead.id,
                    type: 'SMS'
                }
            })

            expect(notificationLog.status).toBe('FAILED')
            expect(notificationLog.errorMessage).toBe('Persistent failure')
        })
    })
})