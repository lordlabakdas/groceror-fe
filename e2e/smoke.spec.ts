import { test, expect } from "@playwright/test";
import { getOtp } from "./helpers/otp";

test("homepage loads", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Groceror", exact: true })).toBeVisible();
  // Scoped to <header> — home.tsx's hero section has its own "Login" CTA.
  await expect(page.locator("header").getByRole("button", { name: "Login" })).toBeVisible();
});

test("shopper can register, verify OTP, and land logged in", async ({ page }) => {
  const phone = `+1555${Date.now().toString().slice(-7)}`;
  const password = "TestPass123!";

  await page.goto("/");
  await page.locator("header").getByRole("button", { name: "Login" }).click();
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
  await expect(page.getByRole("button", { name: "Open profile" })).toBeVisible();
});
