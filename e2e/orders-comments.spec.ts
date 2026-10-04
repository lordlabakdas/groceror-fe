import { test, expect, type Page } from "@playwright/test";

const storeId = "11111111-1111-4111-8111-111111111111";
const itemId = "22222222-2222-4222-8222-222222222222";

async function setup(page: Page, options: { stock?: number; unserviceable?: boolean; orders?: unknown[] } = {}) {
  const state = { stock: options.stock ?? 10, submitted: [] as Record<string, unknown>[], quoteRequests: 0 };
  await page.addInitScript(({ storeId, itemId }) => {
    const token = `test.${btoa(JSON.stringify({ sub: "+15555550123", entity_type: "user", exp: 4102444800 }))}.test`;
    localStorage.setItem("groceror_auth_token", token);
    localStorage.setItem("groceror_cart", JSON.stringify({ items: [{ id: itemId, storeId, storeName: "Test Grocer", name: "Apples", price: 2, quantity: 2, stock: 10, imageUrl: "" }] }));
    // Older saved pickup preferences must not re-enable pickup.
    localStorage.setItem("groceror_last_dropoff", JSON.stringify({ fulfillment: "pickup", address: "Saved address", coords: { lat: 12.98, lng: 77.60 } }));
  }, { storeId, itemId });
  await page.route("http://localhost:8010/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    let body: unknown = {};
    let status = 200;
    if (path.startsWith("/inventory/browse/")) body = { inventory: [{ id: itemId, quantity: state.stock, price: 2 }] };
    else if (path === "/order/delivery-quote") {
      state.quoteRequests++;
      status = options.unserviceable ? 400 : 200;
      body = options.unserviceable ? { detail: "Location Unserviceable: this address is not serviceable by this store" } : { fee: 45 };
    } else if (path === "/order/create-order") {
      state.submitted.push(route.request().postDataJSON());
      body = { id: "new-order", status: "confirmed", total_price: 49, delivery_fee: 45 };
    } else if (path === "/order/history") body = { orders: options.orders ?? [] };
    else if (path === "/price-alerts" || path.startsWith("/bulk-rules/") || path === "/coupons/available") body = [];
    else if (path === "/loyalty/balance") body = { points_balance: 0, dollar_value: 0 };
    else if (path === "/sse/stream") { await route.abort(); return; }
    await route.fulfill({ status, json: body });
  });
  await page.goto("/alerts");
  return state;
}

async function checkout(page: Page) {
  await page.getByRole("button", { name: "Open cart" }).click();
  await page.getByRole("button", { name: "Checkout →" }).click();
  await page.getByLabel("Demo mobile OTP").fill("123456");
}

for (const method of ["Card (demo)", "Apple Pay (demo)", "G Pay / UPI (demo)"]) {
  test(`delivery checkout works with ${method} without collecting payment`, async ({ page }) => {
    const state = await setup(page);
    await checkout(page);
    await expect(page.getByRole("button", { name: /pickup/i })).toHaveCount(0);
    await expect(page.getByText("Schedule recurring…")).toHaveCount(0);
    await expect(page.getByLabel("Delivery address")).toHaveValue("Saved address");
    await page.getByRole("button", { name: method, exact: true }).click();
    await page.getByRole("button", { name: /Place Order/ }).click();
    await expect(page.getByText("order total — no payment collected", { exact: false })).toBeVisible();
    expect(state.submitted).toHaveLength(1);
    expect(state.submitted[0]).toMatchObject({ delivery_lat: 12.98, delivery_lng: 77.6, delivery_address_line: "Saved address" });
    expect(JSON.stringify(state.submitted)).not.toMatch(/4242|cvv|cardNumber|nameOnCard/);
    expect(await page.evaluate(() => localStorage.getItem("groceror_cart"))).not.toContain(itemId);
  });
}

test("test cards detect Visa and both Mastercard ranges", async ({ page }) => {
  await setup(page);
  await checkout(page);
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Visa", { exact: true })).toBeVisible();
  await page.getByLabel("Preselected test card").selectOption("5555555555554444");
  await expect(dialog.getByText("Mastercard", { exact: true })).toBeVisible();
  await page.getByLabel("Preselected test card").selectOption("2223003122003222");
  await expect(dialog.getByText("Mastercard", { exact: true })).toBeVisible();
});

test("unserviceable locations show a clear message and block ordering", async ({ page }) => {
  const state = await setup(page, { unserviceable: true });
  await checkout(page);
  await expect(page.getByRole("alert").filter({ hasText: "Location Unserviceable" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Place Order/ })).toBeDisabled();
  expect(state.submitted).toHaveLength(0);
});

test("stock changes block checkout before placing an order", async ({ page }) => {
  await setup(page, { stock: 1 });
  await page.getByRole("button", { name: "Open cart" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Stock changed for Apples" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Checkout →" })).toBeDisabled();
});

test("stock is rechecked immediately before submission", async ({ page }) => {
  const state = await setup(page);
  await checkout(page);
  await expect(page.getByRole("button", { name: /Place Order/ })).toBeEnabled();
  state.stock = 0;
  await page.getByRole("button", { name: /Place Order/ }).click();
  await expect(page.getByText("Stock changed for Apples. Edit your cart to continue.").first()).toBeVisible();
  expect(state.submitted).toHaveLength(0);
});

test("stock refreshes while checkout remains open", async ({ page }) => {
  const state = await setup(page);
  await checkout(page);
  state.stock = 0;
  await expect(page.getByRole("alert").filter({ hasText: "Stock changed for Apples" })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("button", { name: /Place Order/ })).toBeDisabled();
});

test("Alerts shows ready orders even without receiving a live event", async ({ page }) => {
  await setup(page, { orders: [
    { id: "pickup-order", store_name: "Old pickup store", status: "ready", delivery_fee: null },
    { id: "delivery-order", store_name: "Delivery store", status: "ready", delivery_fee: 45 },
  ] });
  await expect(page.getByText("Ready for pickup", { exact: true })).toBeVisible();
  await expect(page.getByText("Packed and ready for delivery", { exact: true })).toBeVisible();
});

test("a late quote for a previous location cannot enable checkout", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 18.5204, longitude: 73.8567 });
  await setup(page);
  let releaseOldQuote!: () => void;
  const oldQuoteGate = new Promise<void>((resolve) => { releaseOldQuote = resolve; });
  await page.route("**/order/delivery-quote", async (route) => {
    if (route.request().postDataJSON().dropoff_lat === 12.98) {
      await oldQuoteGate;
      await route.fulfill({ json: { fee: 45 } });
    } else {
      await route.fulfill({ status: 400, json: { detail: "Location Unserviceable" } });
    }
  });
  await checkout(page);
  await expect(page.getByText("Checking delivery fee…")).toBeVisible();
  await page.getByRole("button", { name: "Location set — update" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Location Unserviceable" })).toBeVisible();
  releaseOldQuote();
  await expect(page.getByRole("button", { name: /Place Order/ })).toBeDisabled();
  await expect(page.getByRole("alert").filter({ hasText: "Location Unserviceable" })).toBeVisible();
});
