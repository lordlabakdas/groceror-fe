import { useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { ShoppingBasket, BarChart3, Smartphone, Store, ShoppingCart } from "lucide-react";

const FEATURES = [
  {
    icon: <ShoppingBasket className="h-7 w-7" />,
    title: "Myventory",
    description:
      "Add products to your store, set prices, and track stock levels — all from one clean dashboard.",
  },
  {
    icon: <BarChart3 className="h-7 w-7" />,
    title: "Live Analytics",
    description:
      "See your total inventory value, low-stock alerts, and category breakdowns at a glance.",
  },
  {
    icon: <Smartphone className="h-7 w-7" />,
    title: "Phone-first Auth",
    description:
      "No emails, no hassle. Register and log in with just your phone number and a one-time code.",
  },
];

export default function Home() {
  const { user, openLogin } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user) setLocation(user.entityType === "store" ? "/products" : "/stores");
  }, [user, setLocation]);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col">

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section
        className="relative flex-1 flex flex-col items-center justify-center text-center px-4 py-20 overflow-hidden"
        style={{
          background: "linear-gradient(160deg, #0a2614 0%, #14532d 50%, #166534 100%)",
        }}
      >
        {/* subtle radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at 50% 40%, rgba(34,197,94,0.12) 0%, transparent 70%)",
          }}
        />

        {/* floating food blobs — decorative */}
        <span className="absolute top-10 left-[8%]  text-5xl opacity-20 rotate-[-15deg] select-none">🥦</span>
        <span className="absolute top-24 right-[7%] text-4xl opacity-20 rotate-[12deg]  select-none">🍊</span>
        <span className="absolute bottom-20 left-[12%] text-4xl opacity-15 rotate-[8deg] select-none">🥕</span>
        <span className="absolute bottom-16 right-[10%] text-5xl opacity-15 rotate-[-10deg] select-none">🍅</span>
        <span className="absolute top-1/2 left-[4%]  text-3xl opacity-10 select-none">🧀</span>
        <span className="absolute top-1/3 right-[4%] text-3xl opacity-10 select-none">🍞</span>

        {/* logo */}
        <div className="relative z-10 mb-6">
          <img
            src="/logo.png"
            alt="Groceror"
            className="w-44 h-44 md:w-56 md:h-56 object-contain drop-shadow-2xl"
          />
        </div>

        {/* wordmark + tagline */}
        <div className="relative z-10 mb-4">
          <h1 className="text-6xl md:text-8xl font-extrabold text-white tracking-tight leading-none">
            Groceror
          </h1>
          <p className="mt-2 flex items-center justify-center gap-2 text-emerald-400 text-sm md:text-base font-medium tracking-widest uppercase">
            <span className="block h-px w-8 bg-emerald-500" />
            From Grocer to Sorceror
            <span className="block h-px w-8 bg-emerald-500" />
          </p>
        </div>

        {/* description */}
        <p className="relative z-10 mt-4 text-gray-300 text-lg md:text-xl max-w-lg leading-relaxed">
          The all-in-one platform for grocers and shoppers.
          Manage inventory, browse fresh products, and check out in seconds.
        </p>

        {/* CTAs */}
        <div className="relative z-10 mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            size="lg"
            className="text-base px-10 py-6 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold shadow-lg shadow-emerald-900/40 transition-all duration-200 hover:scale-105"
            onClick={() => openLogin("login")}
          >
            Login
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="text-base px-10 py-6 border-2 border-emerald-500 text-emerald-300 hover:bg-emerald-500 hover:text-white font-semibold transition-all duration-200 hover:scale-105 bg-transparent"
            onClick={() => openLogin("register")}
          >
            Get Started →
          </Button>
        </div>

        {/* trust badges */}
        <div className="relative z-10 mt-10 flex flex-wrap gap-6 justify-center text-sm text-emerald-300/70">
          <span className="flex items-center gap-1.5">
            <span className="text-emerald-400">✓</span> No credit card required
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-emerald-400">✓</span> Phone OTP login
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-emerald-400">✓</span> Free to use
          </span>
        </div>

        {/* bottom wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path
              d="M0 60 C360 0 1080 0 1440 60 L1440 60 L0 60 Z"
              fill="hsl(var(--background))"
            />
          </svg>
        </div>
      </section>

      {/* ── Choose your path ─────────────────────────────────── */}
      <section className="bg-background py-16 px-4 border-b">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-sm font-semibold tracking-widest text-primary uppercase mb-2">
              Get started
            </p>
            <h2 className="text-3xl md:text-4xl font-bold">Who are you here for?</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-2xl border-2 bg-card p-8 hover:border-primary hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 flex flex-col">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 text-primary mb-5">
                <Store className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-bold mb-2">I'm a Grocer</h3>
              <p className="text-muted-foreground leading-relaxed mb-6 flex-1">
                List your products, manage stock levels, and reach shoppers in your area — all from one clean dashboard.
              </p>
              <Button className="w-full" onClick={() => openLogin("register", "store")}>
                Start as Grocer
              </Button>
            </div>
            <div className="rounded-2xl border-2 bg-card p-8 hover:border-primary hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 flex flex-col">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 text-primary mb-5">
                <ShoppingCart className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-bold mb-2">I'm a Shopper</h3>
              <p className="text-muted-foreground leading-relaxed mb-6 flex-1">
                Browse nearby stores, find fresh products, and add them to your cart — checkout in seconds.
              </p>
              <Button variant="outline" className="w-full" onClick={() => openLogin("register", "user")}>
                Start Shopping
              </Button>
            </div>
          </div>
          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <button
              className="text-primary hover:underline font-medium"
              onClick={() => openLogin("login")}
            >
              Log in
            </button>
          </p>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section className="bg-background py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-sm font-semibold tracking-widest text-primary uppercase mb-2">
            Everything you need
          </p>
          <h2 className="text-center text-3xl md:text-4xl font-bold mb-12">
            Built for grocers, loved by shoppers
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border bg-card p-8 hover:border-primary/60 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
              >
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 text-primary mb-5 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                  {f.icon}
                </div>
                <h3 className="text-xl font-semibold mb-2">{f.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA strip ─────────────────────────────────── */}
      <section
        className="py-16 px-4 text-center"
        style={{ background: "linear-gradient(135deg, #14532d 0%, #166534 100%)" }}
      >
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
          Ready to transform your store?
        </h2>
        <p className="text-emerald-200 mb-8 text-base">
          Join groceror today — it only takes a minute.
        </p>
        <Button
          size="lg"
          className="bg-white text-emerald-800 hover:bg-emerald-50 font-semibold px-10 py-6 text-base transition-all duration-200 hover:scale-105 shadow-lg"
          onClick={() => openLogin("register")}
        >
          Create your account →
        </Button>
      </section>
    </div>
  );
}
