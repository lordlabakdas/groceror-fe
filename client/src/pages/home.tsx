import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AuthDialog } from "@/components/auth-dialog";

export default function Home() {
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [authType, setAuthType] = useState<"login" | "register">("login");

  const openAuth = (type: "login" | "register") => {
    setAuthType(type);
    setShowAuthDialog(true);
  };

  return (
    <div
      className="min-h-[calc(100vh-4rem)] w-full flex items-center justify-center"
      style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.7)), url(https://images.unsplash.com/photo-1542838132-92c53300491e)`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="max-w-4xl mx-auto px-4 text-center">
        <h1 className="text-5xl md:text-6xl font-bold mb-6 text-white">
          Groceror!
        </h1>
        <p className="text-xl md:text-2xl mb-8 text-gray-100 max-w-2xl mx-auto"></p>
        <div className="flex gap-4 justify-center">
          <Button size="lg" className="gap-2 text-lg" onClick={() => openAuth("login")}>
            Login
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="gap-2 text-lg bg-transparent text-white border-white hover:bg-white hover:text-black"
            onClick={() => openAuth("register")}
          >
            Register
          </Button>
        </div>
      </div>
      <AuthDialog 
        isOpen={showAuthDialog}
        onOpenChange={setShowAuthDialog}
        defaultTab={authType}
      />
    </div>
  );
}