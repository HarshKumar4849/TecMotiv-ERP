import { test, expect } from '@playwright/test';
import { login } from './helpers';
import { collectDiagnostics, expectNoIssues } from './diagnostics';

test.describe('auth routes', () => {
  test('unknown route while signed out redirects to login instead of a dead-end 404', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByLabel('email')).toBeVisible();
  });

  test('unknown route while signed in shows the in-app not-found page', async ({ page }) => {
    await login(page, 'employee');
    await page.goto('/this-route-does-not-exist');
    await expect(page.getByText(/404|does not exist/i).first()).toBeVisible();
  });

  test('register renders its form and rejects invalid email input', async ({ page }) => {
    const diagnostics = collectDiagnostics(page);
    diagnostics.currentRoute = '/register';
    await page.goto('/register');

    const email = page.getByLabel(/email/i).first();
    await expect(email).toBeVisible();

    await page.getByRole('button', { name: /register|create|sign up/i }).first().click();
    // Required-field validation must block submission.
    await expect(page.locator('.ant-form-item-explain-error').first()).toBeVisible();
    await expect(page).toHaveURL(/\/register$/);

    expectNoIssues(diagnostics, 'register page produced diagnostics');
  });

  test('removed password recovery routes (/forgetpassword and /resetpassword) redirect to /login', async ({ page }) => {
    const diagnostics = collectDiagnostics(page);

    diagnostics.currentRoute = '/forgetpassword';
    await page.goto('/forgetpassword');
    await expect(page).toHaveURL(/\/login$/);

    diagnostics.currentRoute = '/forgotpassword';
    await page.goto('/forgotpassword');
    await expect(page).toHaveURL(/\/login$/);

    diagnostics.currentRoute = '/resetpassword';
    await page.goto('/resetpassword');
    await expect(page).toHaveURL(/\/login$/);

    diagnostics.currentRoute = '/resetpassword/sample-user/sample-token';
    await page.goto('/resetpassword/000000000000000000000001/invalid-token');
    await expect(page).toHaveURL(/\/login$/);

    expectNoIssues(diagnostics, 'navigating to removed password reset routes produced diagnostics');
  });

  test('login page no longer exposes a Forgot Password link but retains registration link', async ({ page }) => {
    const diagnostics = collectDiagnostics(page);
    diagnostics.currentRoute = '/login';
    await page.goto('/login');

    // Confirm no Forgot Password link exists on the page
    const forgotLinks = page.getByRole('link', { name: /forgot/i });
    await expect(forgotLinks).toHaveCount(0);

    // Confirm Remember me checkbox is present
    await expect(page.getByText(/remember me/i)).toBeVisible();

    // Confirm register link is still present and navigates correctly
    const registerLink = page.getByRole('link', { name: /register/i });
    await expect(registerLink).toBeVisible();
    await registerLink.click();
    await expect(page).toHaveURL(/\/register$/);

    expectNoIssues(diagnostics, 'login page inspection produced diagnostics');
  });

  test('login with valid credentials succeeds and logout terminates the session', async ({ page }) => {
    await login(page, 'admin');
    await expect(page).not.toHaveURL(/\/login$/);

    // Verify session exists
    const auth = await page.evaluate(() => localStorage.getItem('auth'));
    expect(auth).not.toBeNull();

    // Verify logout
    await page.goto('/logout');
    await expect(page).toHaveURL(/\/login$/);
  });
});

test.describe('recognition redirect for all roles', () => {
  for (const role of ['admin', 'hr', 'employee']) {
    test(`${role} is redirected to the Shoutout recognition dashboard`, async ({ page }) => {
      await login(page, role);
      await page.goto('/recognition');
      await page.waitForURL(/shoutout-three\.vercel\.app\/dashboard/, { timeout: 20_000 });
      expect(page.url()).toContain('https://shoutout-three.vercel.app/dashboard');
    });
  }
});
