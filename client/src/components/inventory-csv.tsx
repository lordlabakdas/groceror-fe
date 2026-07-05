import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Download, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { type GrocerorInventoryItem } from "@/types/models";

const VALID_CATEGORIES = new Set(["GROCERY", "PRODUCE", "MEAT", "DAIRY", "BAKERY", "OTHER"]);
const CSV_HEADER = ["name", "category", "quantity", "price", "notes"];

// ---------------------------------------------------------------------------
// CSV helpers — minimal quoted-field support, no dependency
// ---------------------------------------------------------------------------

function escapeField(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields.map((f) => f.trim());
}

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

export function InventoryCsvControls({ items }: { items: GrocerorInventoryItem[] }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  function handleExport() {
    const rows = items.map((i) =>
      [
        escapeField(i.name),
        i.category,
        String(i.quantity),
        i.price.toFixed(2),
        escapeField(i.notes ?? ""),
      ].join(","),
    );
    const csv = [CSV_HEADER.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `groceror-inventory-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: `${items.length} items written to CSV.` });
  }

  async function handleImportFile(file: File) {
    setImporting(true);
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
      if (lines.length < 2) {
        toast({
          title: "Nothing to import",
          description: "The file has a header but no data rows.",
          variant: "destructive",
        });
        return;
      }

      const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
      if (header[0] !== "name" || header[1] !== "category") {
        toast({
          title: "Unrecognised format",
          description: `Expected columns: ${CSV_HEADER.join(", ")}`,
          variant: "destructive",
        });
        return;
      }

      let ok = 0;
      const failures: string[] = [];

      for (const line of lines.slice(1)) {
        const [name, category, quantity, price, notes] = parseCsvLine(line);
        const cat = (category ?? "").toUpperCase();
        if (!name || !VALID_CATEGORIES.has(cat)) {
          failures.push(name || "(missing name)");
          continue;
        }
        try {
          await apiRequest("POST", "/inventory/add-inventory", {
            name,
            quantity: parseInt(quantity, 10) || 0,
            category: cat,
            price: parseFloat(price) || 0,
            notes: notes || undefined,
          });
          ok++;
        } catch {
          failures.push(name);
        }
      }

      queryClient.invalidateQueries({ queryKey: ["/inventory/get-store-inventory"] });

      if (failures.length === 0) {
        toast({ title: "Import complete", description: `${ok} items added.` });
      } else {
        toast({
          title: `Imported ${ok}, failed ${failures.length}`,
          description: `Could not add: ${failures.slice(0, 5).join(", ")}${failures.length > 5 ? "…" : ""}`,
          variant: "destructive",
        });
      }
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImportFile(file);
        }}
      />
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => fileInputRef.current?.click()}
        disabled={importing}
      >
        {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        Import CSV
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={handleExport}
        disabled={items.length === 0}
      >
        <Download className="h-4 w-4" />
        Export CSV
      </Button>
    </div>
  );
}
