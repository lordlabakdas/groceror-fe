import { useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

export default function Home() {
  const { user, openLogin } = useAuth();
  const [, setLocation] = useLocation();

  // Already logged in → go straight to products
  useEffect(() => {
    if (user) setLocation("/products");
  }, [user, setLocation]);

  return (
    <div
      className="min-h-[calc(100vh-4rem)] w-full flex items-center justify-center"
      style={{
        backgroundImage: `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.7)), url(https://images.unsplash.com/photo-1542838132-92c53300491e)`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="max-w-4xl mx-auto px-4 text-center">
        <h1 className="text-5xl md:text-7xl font-bold mb-4 text-white tracking-tight">
          groceror
        </h1>
        <p className="text-lg md:text-xl mb-10 text-gray-300 max-w-xl mx-auto">
          Manage your store inventory and shop fresh groceries — all in one place.
        </p>
        <div className="flex gap-4 justify-center">
          <Button
            size="lg"
            className="text-base px-8"
            onClick={() => openLogin("login")}
          >
            Login
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="text-base px-8 bg-transparent text-white border-white hover:bg-white hover:text-black"
            onClick={() => openLogin("register")}
          >
            Get Started
          </Button>
        </div>
      </div>
    </div>
  );
}
