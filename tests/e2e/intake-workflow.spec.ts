import { test, expect } from '@playwright/test'

test.describe('Intake Workflow E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Set up test data - this would typically be done via API or database seeding
    await page.goto('/api/test-setup', { failOnStatusCode: false })
  })

  test('complete intake workflow from start to finish', async ({ page }) => {
    // Navigate to intake page with valid token
    await page.goto('/application/test-token-123')

    // Verify intake page loads
    await expect(page.locator('h1')).toContainText('Complete Your Application')

    // Step 1: Fill out personal information
    await page.fill('input[name="firstName"]', 'John')
    await page.fill('input[name="lastName"]', 'Doe')
    await page.fill('input[name="email"]', 'john.doe@example.com')
    await page.fill('input[name="phone"]', '+1234567890')
    await page.fill('input[name="businessName"]', 'Test Business LLC')

    // Submit step 1
    await page.click('button[type="submit"]')

    // Wait for step 2 to load
    await expect(page.locator('h2')).toContainText('Upload Documents')

    // Step 2: Upload documents
    const fileInput = page.locator('input[type="file"]')
    
    // Upload 3 required documents
    await fileInput.setInputFiles([
      'tests/fixtures/document1.pdf',
      'tests/fixtures/document2.pdf',
      'tests/fixtures/document3.pdf'
    ])

    // Verify files are selected
    await expect(page.locator('.file-list')).toContainText('document1.pdf')
    await expect(page.locator('.file-list')).toContainText('document2.pdf')
    await expect(page.locator('.file-list')).toContainText('document3.pdf')

    // Submit step 2
    await page.click('button[type="submit"]')

    // Wait for completion page
    await expect(page.locator('h1')).toContainText('Application Submitted')
    await expect(page.locator('.success-message')).toContainText('Thank you for completing your application')
  })

  test('save and continue later functionality', async ({ page }) => {
    await page.goto('/application/test-token-456')

    // Fill partial information
    await page.fill('input[name="firstName"]', 'Jane')
    await page.fill('input[name="lastName"]', 'Smith')
    await page.fill('input[name="email"]', 'jane.smith@example.com')

    // Click save and continue later
    await page.click('button:has-text("Save & Continue Later")')

    // Verify save confirmation
    await expect(page.locator('.save-confirmation')).toContainText('Progress saved')

    // Navigate away and come back
    await page.goto('/application/test-token-456')

    // Verify data is preserved
    await expect(page.locator('input[name="firstName"]')).toHaveValue('Jane')
    await expect(page.locator('input[name="lastName"]')).toHaveValue('Smith')
    await expect(page.locator('input[name="email"]')).toHaveValue('jane.smith@example.com')
  })

  test('form validation works correctly', async ({ page }) => {
    await page.goto('/application/test-token-789')

    // Try to submit without required fields
    await page.click('button[type="submit"]')

    // Verify validation errors
    await expect(page.locator('.error-message')).toContainText('First name is required')
    await expect(page.locator('.error-message')).toContainText('Last name is required')

    // Fill required fields
    await page.fill('input[name="firstName"]', 'Test')
    await page.fill('input[name="lastName"]', 'User')

    // Try invalid email
    await page.fill('input[name="email"]', 'invalid-email')
    await page.click('button[type="submit"]')
    await expect(page.locator('.error-message')).toContainText('Please enter a valid email')

    // Fix email and submit
    await page.fill('input[name="email"]', 'test@example.com')
    await page.click('button[type="submit"]')

    // Should proceed to step 2
    await expect(page.locator('h2')).toContainText('Upload Documents')
  })

  test('document upload validation', async ({ page }) => {
    // Start from step 2 (assuming step 1 is completed)
    await page.goto('/application/test-token-step2')

    // Try to submit without documents
    await page.click('button[type="submit"]')
    await expect(page.locator('.error-message')).toContainText('Please upload exactly 3 documents')

    // Upload only 2 documents
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles([
      'tests/fixtures/document1.pdf',
      'tests/fixtures/document2.pdf'
    ])

    await page.click('button[type="submit"]')
    await expect(page.locator('.error-message')).toContainText('Please upload exactly 3 documents')

    // Upload invalid file type
    await fileInput.setInputFiles([
      'tests/fixtures/document1.pdf',
      'tests/fixtures/document2.pdf',
      'tests/fixtures/invalid.txt'
    ])

    await page.click('button[type="submit"]')
    await expect(page.locator('.error-message')).toContainText('Only PDF, JPG, PNG, and DOCX files are allowed')
  })

  test('handles expired or invalid tokens', async ({ page }) => {
    // Try invalid token
    await page.goto('/application/invalid-token')
    await expect(page.locator('.error-message')).toContainText('Invalid or expired application link')

    // Try expired token
    await page.goto('/application/expired-token')
    await expect(page.locator('.error-message')).toContainText('This application link has expired')

    // Try already completed token
    await page.goto('/application/completed-token')
    await expect(page.locator('.info-message')).toContainText('This application has already been completed')
  })

  test('responsive design works on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    await page.goto('/application/test-token-mobile')

    // Verify mobile layout
    await expect(page.locator('.mobile-layout')).toBeVisible()
    
    // Test form interaction on mobile
    await page.fill('input[name="firstName"]', 'Mobile')
    await page.fill('input[name="lastName"]', 'User')
    await page.fill('input[name="email"]', 'mobile@example.com')

    // Verify mobile-specific elements
    await expect(page.locator('.mobile-submit-button')).toBeVisible()
  })

  test('progress indicator shows correct steps', async ({ page }) => {
    await page.goto('/application/test-token-progress')

    // Verify step 1 is active
    await expect(page.locator('.step-indicator .step-1')).toHaveClass(/active/)
    await expect(page.locator('.step-indicator .step-2')).not.toHaveClass(/active/)

    // Complete step 1
    await page.fill('input[name="firstName"]', 'Progress')
    await page.fill('input[name="lastName"]', 'Test')
    await page.fill('input[name="email"]', 'progress@example.com')
    await page.click('button[type="submit"]')

    // Verify step 2 is now active
    await expect(page.locator('.step-indicator .step-1')).toHaveClass(/completed/)
    await expect(page.locator('.step-indicator .step-2')).toHaveClass(/active/)
  })

  test('handles network errors gracefully', async ({ page }) => {
    await page.goto('/application/test-token-network')

    // Simulate network failure
    await page.route('**/api/intake/**', route => route.abort())

    await page.fill('input[name="firstName"]', 'Network')
    await page.fill('input[name="lastName"]', 'Test')
    await page.click('button[type="submit"]')

    // Verify error handling
    await expect(page.locator('.error-message')).toContainText('Network error. Please try again.')
    
    // Verify retry functionality
    await expect(page.locator('button:has-text("Retry")')).toBeVisible()
  })
})