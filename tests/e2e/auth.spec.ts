import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('should redirect to signin page when accessing protected route', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/.*signin/)
  })

  test('should show signin form', async ({ page }) => {
    await page.goto('/auth/signin')
    await expect(page.locator('form')).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/auth/signin')
    await page.fill('input[type="email"]', 'invalid@example.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')
    
    // Wait for error message or redirect back to signin
    await expect(page.locator('text=Invalid credentials')).toBeVisible()
  })
})