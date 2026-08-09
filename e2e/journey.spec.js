import { test, expect } from '@playwright/test';

test.describe('TeamFlow E2E Journey', () => {
  const timestamp = Date.now();
  const testEmail = `testuser_${timestamp}@example.com`;
  const testPassword = 'Password123!';

  test('User can register, login, create a project and a task', async ({ page }) => {
    // 1. Register
    await page.goto('/register');
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // 2. Create Project
    await page.click('text="New Project"'); // Or specific selector for your create project button
    // Note: Assuming there's a modal or a form for new project
    const projectName = `E2E Project ${timestamp}`;
    await page.fill('input[name="name"]', projectName); // Adjust selector
    await page.fill('textarea[name="description"]', 'A project created by E2E test');
    await page.click('button:has-text("Create")'); // Adjust selector
    
    // Verify project created
    await expect(page.locator(`text="${projectName}"`)).toBeVisible();

    // Navigate to the project
    await page.click(`text="${projectName}"`);
    await expect(page).toHaveURL(/.*\/projects\/.*/);

    // 3. Create Task
    await page.click('text="Add Task"');
    await page.fill('input[name="title"]', 'E2E Task 1');
    await page.click('button:has-text("Save")'); // or "Create"
    
    // Verify task created
    await expect(page.locator('text="E2E Task 1"')).toBeVisible();

    // 4. Comment on Task
    await page.click('text="E2E Task 1"'); // Open task details
    await page.fill('textarea[placeholder*="comment"]', 'This is an E2E comment');
    await page.click('button:has-text("Post")');

    // Verify comment
    await expect(page.locator('text="This is an E2E comment"')).toBeVisible();

    // 5. Search
    await page.keyboard.press('Meta+k');
    await page.fill('input[placeholder*="Search"]', 'E2E Task');
    
    // Verify search result
    await expect(page.locator('.command-palette-results >> text="E2E Task 1"').first()).toBeVisible();
    await page.keyboard.press('Escape');

    // 6. Delete Task
    // Assuming there is a delete button in task details or via some menu
    // For this boilerplate, assuming a simple "Delete" button inside task details
    // await page.click('button[title="Delete Task"]');
    // await page.click('button:has-text("Confirm")');
    // await expect(page.locator('text="E2E Task 1"')).not.toBeVisible();
  });
});
