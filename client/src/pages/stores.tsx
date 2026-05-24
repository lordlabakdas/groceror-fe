import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, Globe, Store } from "lucide-react";

interface StoreItem {
  id: string;
  name: string;
  email: string;
  location: string | null;
  website: string | null;
  is_active: boolean;
}

export default function Stores() {
  const [search, setSearch] = useState("");

  const { data: stores = [], isLoading } = useQuery<StoreItem[]>({
    queryKey: ["/stores/"],
  });

  const filtered = stores.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.location ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Browse Stores</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Find a store and start shopping
          </p>
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search stores..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-36 rounded-xl border bg-muted animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          {search ? "No stores match your search." : "No stores available yet."}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((store) => (
            <StoreCard key={store.id} store={store} />
          ))}
        </div>
      )}
    </div>
  );
}

function StoreCard({ store }: { store: StoreItem }) {
  return (
    <Link href={`/stores/${store.id}`}>
      <a className="block rounded-xl border bg-card shadow-sm hover:shadow-md hover:border-primary/40 transition-all cursor-pointer group p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-100 transition-colors">
            <Store className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-tight truncate group-hover:text-primary transition-colors">
              {store.name}
            </p>
            {store.location && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{store.location}</span>
              </p>
            )}
            {store.website && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Globe className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{store.website}</span>
              </p>
            )}
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <Badge
            variant="secondary"
            className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200"
          >
            {store.is_active ? "Open" : "Closed"}
          </Badge>
          <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
            Browse →
          </span>
        </div>
      </a>
    </Link>
  );
}
