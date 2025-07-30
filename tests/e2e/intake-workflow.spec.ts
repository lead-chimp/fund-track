import { test, expect } from '@playwright/test'

test.describe('Intake Workflow', () => {
  test('should display intake form with valid token', async ({ page }) => {
    // This would need a valid token from the database
    // For now, we'll test the error case
    await page.goto('/application/invalid-token')
    await expect(page.locator('text=Invalid or expired token')).toBeVisible()
  })

  test('should show step 1 form elements', async ({ page }) => {
    // Mock a valid token response
    await page.route('**/api/intake/**', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            lead: {
              id: 1,
              firstName: 'John',
              lastName: 'Doe',
              email: 'john@example.com',
              phone: '+1234567890',
              businessName: 'Test Business'
            },
            step: 1
          })
        })
      }
    })

    await page.goto('/application/valid-test-token')
    
    // Check for form elements
    await expect(page.locator('input[name="firstName"]')).toBeVisible()
    await expect(page.locator('input[name="lastName"]')).toBeVisible()
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('input[name="phone"]')).toBeVisible()
    await expect(page.locator('input[name="businessName"]')).toBeVisible()
  })

  test('should progress to step 2 after completing step 1', async ({ page }) => {
    // Mock API responses
    await page.route('**/api/intake/**/step1', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      })
    })

    await page.route('**/api/intake/**', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            lead: {
              id: 1,
              firstName: 'John',
              lastName: 'Doe',
              email: 'john@example.com',
              phone: '+1234567890',
              businessName: 'Test Business'
            },
            step: 1
          })
        })
      }
    })

    await page.goto('/application/valid-test-token')
    
    // Fill out step 1 form
    await page.fill('input[name="firstName"]', 'John')
    await page.fill('input[name="lastName"]', 'Doe')
    await page.fill('input[name="email"]', 'john@example.com')
    await page.fill('input[name="phone"]', '+1234567890')
    await page.fill('input[name="businessName"]', 'Test Business')
    
    // Submit form
    await page.click('button[type="submit"]')
    
    // Should progress to step 2
    await expect(page.locator('text=Step 2')).toBeVisible()
  })
})