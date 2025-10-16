import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";

interface GymFiltersProps {
  categories: string[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  maxPrice?: number;
  onMaxPriceChange?: (price: number | undefined) => void;
}

export default function GymFilters({ 
  categories, 
  selectedCategory, 
  onCategoryChange,
  searchQuery,
  onSearchChange,
  maxPrice,
  onMaxPriceChange
}: GymFiltersProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Qidirish..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
            data-testid="input-search-gyms"
          />
        </div>
        
        {onMaxPriceChange && (
          <div className="relative">
            <Label htmlFor="max-price" className="text-xs text-muted-foreground mb-1 block">
              Maksimal narx (kredit)
            </Label>
            <Input 
              id="max-price"
              type="number"
              placeholder="Narx bo'yicha filtr..."
              value={maxPrice || ''}
              onChange={(e) => onMaxPriceChange(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full"
              data-testid="input-max-price"
              min="0"
            />
          </div>
        )}
      </div>
      
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <Button
          variant={selectedCategory === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onCategoryChange('all')}
          className="whitespace-nowrap hover-elevate active-elevate-2 flex-shrink-0"
          data-testid="button-filter-all"
        >
          Hammasi
        </Button>
        {categories.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? 'default' : 'outline'}
            size="sm"
            onClick={() => onCategoryChange(category)}
            className="whitespace-nowrap hover-elevate active-elevate-2 flex-shrink-0"
            data-testid={`button-filter-${category.toLowerCase()}`}
          >
            {category}
          </Button>
        ))}
      </div>
    </div>
  );
}
