import { Button } from "@/components/ui/button";

const categories = [
  "All",
  "Fruits",
  "Vegetables",
  "Bakery",
  "Dairy",
  "Meat",
  "Beverages"
];

interface CategoriesProps {
  selected: string;
  onSelect: (category: string) => void;
}

export function Categories({ selected, onSelect }: CategoriesProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-none">
      {categories.map((category) => (
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
