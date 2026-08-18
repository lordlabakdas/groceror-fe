// Groceror is built for an Indian customer base — all prices are rupees.
// This is the single place that knows the currency and formatting rules,
// so it never drifts out of sync page to page.

export type InventoryUnit = "UNIT" | "G" | "KG";

export const INVENTORY_UNIT_LABELS: Record<InventoryUnit, string> = {
  UNIT: "Units",
  G: "Grams (g)",
  KG: "Kilograms (kg)",
};

const formatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// e.g. formatPrice(125000) -> "₹1,25,000.00" (Indian digit grouping, not "125,000.00")
export function formatPrice(amount: number): string {
  return formatter.format(amount);
}

// Quantity + unit, e.g. formatQuantity(500, "G") -> "500 g", formatQuantity(10, "UNIT") -> "10".
// Plain UNIT items keep the existing bare-number look — no "units" suffix.
export function formatQuantity(quantity: number, unit: InventoryUnit): string {
  switch (unit) {
    case "G":
      return `${quantity.toLocaleString("en-IN")} g`;
    case "KG":
      return `${quantity.toLocaleString("en-IN")} kg`;
    default:
      return quantity.toLocaleString("en-IN");
  }
}
