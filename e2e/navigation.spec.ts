import { test, expect } from "@playwright/test";
import { getOtp } from "./helpers/otp";

// Regression coverage for auth-context.tsx's login()/logout(): both must
// replace the current history entry instead of pushing a new one. Otherwise
// the page you were on right before the auth transition (the "/" marketing
// page before login, the protected page you were viewing before logout)
// stays in history underneath the new page. Pressing back then lands back on
// that stale entry, whose own route guard (Home's redirect-when-authenticated,
// or the StoreOwnerRoute/BuyerRoute redirect-when-unauthenticated) immediately
// forwards you right back — so the back button silently does nothing.
test("login and logout replace history instead of pushing (back button doesn't loop)", async ({ page }) => {
  const phone = `+1555${Date.now().toString().slice(-7)}`;
  const password = "TestPass123!";

  await page.goto("/");
  const lengthBeforeLogin = await page.evaluate(() => window.history.length);

  await page.locator("nav").getByRole("button", { name: "Log in" }).click();
  await page.getByRole("button", { name: "Register" }).click();

  await page.getByLabel("Phone Number").fill(phone);
  await page.getByLabel("Shopper").check();
  await page.getByRole("button", { name: "Send OTP" }).click();

  await expect(page.getByText(`Enter the 6-digit code sent to`)).toBeVisible();
  const otp = getOtp(phone);
  await page.locator("input[data-input-otp]").pressSequentially(otp);
  await page.getByRole("button", { name: "Verify" }).click();

  await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Create Account" }).click();

  await expect(page).toHaveURL(/\/stores$/);

  const lengthAfterLogin = await page.evaluate(() => window.history.length);
  expect(lengthAfterLogin).toBe(lengthBeforeLogin);

  // Confirm back doesn't bounce the user right back into the app: with the
  // fix, there's no "/" entry left underneath "/stores" to land back on —
  // goBack() leaves the app entirely (there was nothing before this test's
  // own page.goto("/")).
  await page.goBack();
  await expect(page).not.toHaveURL(/\/stores$/);

  // The session token is still valid (registration's own auto-login and the
  // manual login form both go through the same login() call, so this already
  // covers both entry points) — go straight back into the app to exercise
  // logout() next.
  await page.goto("/stores");
  await expect(page).toHaveURL(/\/stores$/);

  await page.getByRole("button", { name: "Open profile" }).click();
  const lengthBeforeLogout = await page.evaluate(() => window.history.length);
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL("/");

  const lengthAfterLogout = await page.evaluate(() => window.history.length);
  expect(lengthAfterLogout).toBe(lengthBeforeLogout);
});
