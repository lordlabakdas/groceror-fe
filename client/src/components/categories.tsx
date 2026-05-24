import { Button } from "@/components/ui/button";

// Matches groceror's InventoryCategory enum values (display labels).
export const GROCEROR_CATEGORIES = [
  "All",
  "Grocery",
  "Produce",
  "Meat",
  "Dairy",
  "Bakery",
  "Other",
] as const;

interface CategoriesProps {
  selected: string;
  onSelect: (category: string) => void;
}

export function Categories({ selected, onSelect }: CategoriesProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-none">
      {GROCEROR_CATEGORIES.map((category) => (
        <Button
          key={category}
          variant={selected === category ? "default" : "outline"}
          size="sm"
          onClick={() => onSelect(category)}
          className="whitespace-nowrap"
        >
          {category}
        </Button>
      ))}
    </div>
  );
}
