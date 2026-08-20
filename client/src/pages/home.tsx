import { useEffect } from "react";
import { useLocation } from "wouter";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";

const MERCHANT_FEATURES = [
  {
    n: "01",
    title: "Smart Inventory",
    desc: "Sync your physical shelves with your digital storefront in real-time.",
  },
  {
    n: "02",
    title: "Live Analytics",
    desc: "See what your neighbors are buying before you restock.",
  },
  {
    n: "03",
    title: "Phone-First Auth",
    desc: "No passwords. Secure merchant access via simple SMS verification.",
  },
];

const STEPS = [
  {
    step: "STEP 01",
    img: "/step-store.jpg",
    alt: "Corner grocery storefront with hand-painted signage",
    title: "Browse local stores",
    desc: "Discover hidden gems and artisanal pantries within a 2-mile radius of your home.",
  },
  {
    step: "STEP 02",
    img: "/step-basket.jpg",
    alt: "Hand placing bell peppers into a woven market basket",
    title: "Fill your cart",
    desc: "Mix and match specialties from the butcher, the baker, and the greengrocer.",
  },
  {
    step: "STEP 03",
    img: "/step-bag.jpg",
    alt: "Paper grocery bag packed with fresh produce on a kitchen counter",
    title: "Place your order",
    desc: "Fast local delivery or zero-wait pickup. Securely paid and tracked in real-time.",
  },
];

export default function Home() {
  const { user, openLogin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user) setLocation(user.entityType === "store" ? "/dashboard" : "/stores", { replace: true });
  }, [user, setLocation]);

  return (
    <div className="min-h-screen bg-transparent text-foreground font-sans">
      <nav className="sticky top-0 z-50 bg-background/60 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-[72px] flex items-center justify-between">
          <div className="flex items-center gap-8">
            <span className="font-display text-3xl font-semibold tracking-tight">
              Grocer<span className="italic text-primary">or</span>
            </span>
            <div className="hidden md:flex gap-6 text-sm font-medium text-muted-foreground">
              <a href="#merchants" className="hover:text-foreground transition-colors">
                For Merchants
              </a>
              <a href="#how-it-works" className="hover:text-foreground transition-colors">
                How it Works
              </a>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <Button variant="ghost" onClick={() => openLogin("login")}>
              Log in
            </Button>
            <Button onClick={() => openLogin("register")}>Join Now</Button>
          </div>
        </div>
      </nav>

      <header className="relative pt-20 pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="inline-block px-3 py-1 mb-8 border border-primary/30 rounded-full text-[10px] font-mono uppercase tracking-widest text-primary bg-primary/5 animate-fade-up">
            Hyper-local Commerce
          </div>
          <h1 className="text-6xl md:text-8xl font-display font-medium tracking-tight [text-wrap:balance] leading-[0.9] animate-fade-up [animation-delay:100ms]">
            From Grocer to <span className="italic text-primary">Sorceror.</span>
          </h1>
          <p className="mt-8 max-w-xl mx-auto text-lg text-muted-foreground [text-wrap:pretty] animate-fade-up [animation-delay:200ms]">
            Empowering neighborhood shops with the magic of instant inventory and frictionless
            delivery. Connecting the community, one crate at a time.
          </p>
          <div className="mt-12 flex flex-wrap justify-center gap-4 animate-fade-up [animation-delay:300ms]">
            <Button
              size="lg"
              onClick={() => openLogin("register", "store")}
              className="group relative px-8 py-6 bg-primary text-primary-foreground rounded-xl font-semibold overflow-hidden"
            >
              <span className="relative z-10">Open your Shop</span>
              <span className="absolute inset-0 bg-foreground/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => openLogin("register", "user")}
              className="px-8 py-6 bg-background border-border rounded-xl font-semibold hover:border-foreground transition-colors"
            >
              Find local staples
            </Button>
          </div>
        </div>

        <div className="mt-20 max-w-5xl mx-auto px-6 animate-fade-up [animation-delay:400ms]">
          <img
            src="/hero-crate.jpg"
            alt="Wooden grocery crate filled with fresh seasonal vegetables on butcher paper"
            width={1200}
            height={608}
            className="w-full aspect-[21/9] object-cover rounded-2xl ring-1 ring-foreground/5 shadow-2xl"
          />
        </div>
      </header>

      <section id="merchants" className="py-24 bg-surface-dark text-surface-dark-foreground">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-sm font-mono text-primary uppercase tracking-[0.2em] mb-6">
                Merchant Toolkit
              </h2>
              <h3 className="text-4xl md:text-5xl font-display leading-tight mb-8">
                Modern tools for the <br />
                <span className="italic">traditional pantry.</span>
              </h3>
              <div className="space-y-8">
                {MERCHANT_FEATURES.map((f) => (
                  <div key={f.n} className="flex gap-4">
                    <div className="size-10 shrink-0 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30 text-primary font-mono">
                      {f.n}
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg">{f.title}</h4>
                      <p className="text-surface-dark-muted text-sm mt-1">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="aspect-square bg-surface-dark-panel rounded-3xl p-8 border border-surface-dark-foreground/10">
                <div className="h-full flex flex-col">
                  <div className="flex justify-between items-end mb-8">
                    <div className="space-y-1">
                      <div className="text-[10px] font-mono text-surface-dark-muted">
                        GROSS_REVENUE
                      </div>
                      <div className="text-3xl font-display">$4,280.50</div>
                    </div>
                    <div className="h-12 w-32 rounded bg-primary/10 border border-primary/20" />
                  </div>
                  <div className="flex-1 border-t border-surface-dark-foreground/5 pt-6">
                    <div className="text-[10px] font-mono text-surface-dark-muted mb-4 uppercase">
                      Active Orders
                    </div>
                    <div className="space-y-3">
                      <div className="h-12 bg-surface-dark-foreground/5 rounded-lg flex items-center px-4 justify-between">
                        <span className="text-xs font-mono">#4829 - Heirloom Tomatoes</span>
                        <span className="px-2 py-0.5 bg-accent/20 text-accent rounded text-[9px] font-bold">
                          READY
                        </span>
                      </div>
                      <div className="h-12 bg-surface-dark-foreground/5 rounded-lg flex items-center px-4 justify-between">
                        <span className="text-xs font-mono">#4830 - Sourdough Batard</span>
                        <span className="px-2 py-0.5 bg-surface-dark-foreground/10 text-surface-dark-muted rounded text-[9px] font-bold">
                          PACKING
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-24 border-b border-border">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-display italic">The Shopper&apos;s Path</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-12">
            {STEPS.map((s) => (
              <div key={s.step} className="relative group">
                <div className="mb-6 aspect-video rounded-xl overflow-hidden ring-1 ring-foreground/5 transition-transform group-hover:-translate-y-1">
                  <img
                    src={s.img}
                    alt={s.alt}
                    loading="lazy"
                    width={768}
                    height={512}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="font-mono text-xs text-primary mb-2">{s.step}</div>
                <h4 className="text-xl font-semibold mb-3">{s.title}</h4>
                <p className="text-muted-foreground text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-12 bg-transparent border-t border-border">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-center md:text-left">
            <span className="font-display text-2xl font-semibold">
              Grocer<span className="italic text-primary">or</span>
            </span>
            <p className="text-xs text-muted-foreground mt-2 font-mono">
              EST. 2026 — NEIGHBORHOOD FIRST
            </p>
          </div>
          <div className="flex gap-8 text-sm font-medium">
            <a href="#" className="hover:text-primary">
              Privacy
            </a>
            <a href="#" className="hover:text-primary">
              Merchant Terms
            </a>
            <a href="#" className="hover:text-primary">
              Support
            </a>
          </div>
          <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">
            Hand-picked in the neighborhood
          </div>
        </div>
      </footer>
    </div>
  );
}
