import { test, expect } from '@playwright/test'

test.describe('Staff Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.route('**/api/auth/session', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 1,
            email: 'staff@example.com',
            role: 'admin'
          }
        })
      })
    })

    // Mock leads API
    await page.route('**/api/leads**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          leads: [
            {
              id: 1,
              firstName: 'John',
              lastName: 'Doe',
              email: 'john@example.com',
              phone: '+1234567890',
              businessName: 'Test Business',
              status: 'NEW',
              createdAt: new Date().toISOString()
            }
          ],
          total: 1,
          page: 1,
          totalPages: 1
        })
      })
    })
  })

  test('should display leads list', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Check for leads table
    await expect(page.locator('table')).toBeVisible()
    await expect(page.locator('text=John Doe')).toBeVisible()
    await expect(page.locator('text=Test Business')).toBeVisible()
  })

  test('should allow searching leads', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Check for search input
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible()
    
    // Test search functionality
    await page.fill('input[placeholder*="Search"]', 'John')
    await page.press('input[placeholder*="Search"]', 'Enter')
    
    // Should still show the lead
    await expect(page.locator('text=John Doe')).toBeVisible()
  })

  test('should allow filtering by status', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Check for status filter
    await expect(page.locator('select')).toBeVisible()
    
    // Change status filter
    await page.selectOption('select', 'NEW')
    
    // Should still show the lead
    await expect(page.locator('text=John Doe')).toBeVisible()
  })

  test('should navigate to lead detail page', async ({ page }) => {
    // Mock lead detail API
    await page.route('**/api/leads/1', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          businessName: 'Test Business',
          status: 'NEW',
          notes: [],
          documents: [],
          statusHistory: []
        })
      })
    })

    await page.goto('/dashboard')
    
    // Click on lead name
    await page.click('text=John Doe')
    
    // Should navigate to lead detail page
    await expect(page).toHaveURL(/.*\/dashboard\/leads\/1/)
    await expect(page.locator('text=Lead Details')).toBeVisible()
  })
})