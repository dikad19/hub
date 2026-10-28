import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  ChefHat,
  Coins,
  HandCoins,
  Scale,
  Wallet,
  Store,
  UtensilsCrossed,
  Scissors,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Image from "next/image";
import { RotatingWord } from "@/components/rotating-word";
import { LiveReceipt } from "@/components/live-receipt";
import { FeaturesCarousel } from "@/components/features-carousel";
import { DotMotif } from "@/components/dot-motif";

const theme = {
  "--ink": "#10222B",
  "--paper": "#F4F6F5",
  "--teal": "#0B6E5F",
  "--mint": "#D6EFE6",
  "--sun": "#FFC83D",
  "--line": "#D3DBD8",
} as React.CSSProperties;
import { CurrentYear } from "@/components/currenty-year";
const display = "font-[family-name:var(--font-display)]";
const BUSINESS_TYPES = [
  {
    title: "Shops & retail",
    desc: "Barcodes, size and color variants, wholesale prices, and buying by the sack or carton.",
    tags: ["Barcode", "Variants", "Wholesale"],
    icon: Store,
    tone: "bg-(--line)",
  },
  {
    title: "Cafés & restaurants",
    desc: "Menu items link to ingredients through recipes, so stock drops with every order.",
    tags: ["Recipes", "Ingredients", "Menu"],
    icon: UtensilsCrossed,
    tone: "bg-(--mint)",
  },
  {
    title: "Services",
    desc: "No stock to count. Just record sales, payments, and reports.",
    tags: ["No stock", "Payments", "Reports"],
    icon: Scissors,
    tone: "bg-white",
  },
  {
    title: "Everything else",
    desc: "Turn on stock tracking only for items that need it. The rest runs without.",
    tags: ["Optional stock", "Flexible"],
    icon: Sparkles,
    tone: "bg-(--sun)/40",
  },
];
export default function LandingPage() {
  return (
    <div
      style={theme}
      className="min-h-screen bg-(--paper) text-(--ink) selection:bg-(--sun)"
    >
      <style>{`
        @keyframes print-out { from { transform: translateY(-100%); } to { transform: translateY(0); } }
        .receipt-print { animation: print-out 2.4s cubic-bezier(0.25, 0.6, 0.25, 1) 0.3s both; }
        @media (prefers-reduced-motion: reduce) { .receipt-print { animation: none; } }
      `}</style>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-(--line) bg-(--paper)/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link
            href="/"
            className={`${display} flex items-center gap-3 text-lg font-bold color-(--teal)`}
          >
            <Image src="/image/logo.png" alt="Logo" width={30} height={30} />
            Hub
          </Link>
          <nav className="hidden gap-8 text-sm font-medium md:flex">
            <a href="#fitur" className="hover:underline underline-offset-4">
              Features
            </a>
            <a href="#usaha" className="hover:underline underline-offset-4">
              Type of business
            </a>
            <a href="#mulai" className="hover:underline underline-offset-4">
              Get started
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Button
              render={<Link href="/login" />}
              nativeButton={false}
              variant="ghost"
            >
              Login
            </Button>
            <Button
              render={<Link href="/register" />}
              nativeButton={false}
              className="bg-(--teal) rounded-sm text-white hover:bg-(--teal)"
            >
              Register
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl gap-12 px-5 pb-20 pt-10 md:grid-cols-[1.15fr_0.85fr] md:items-center md:pt-16">
          <div>
            <h1
              className={`${display} rise text-5xl font-extrabold leading-[1.02] tracking-tight md:text-7xl`}
            >
              Run your <RotatingWord /> without the notebook.
            </h1>
            <p
              style={{ animationDelay: "120ms" }}
              className="rise mt-6 max-w-xl text-lg leading-relaxed text-(--ink)/75"
            >
              Hub rings up sales, tracks stock, and shows your real profit, for
              shops, warungs, cafés, and service businesses.
            </p>
            <div
              style={{ animationDelay: "240ms" }}
              className="rise mt-8 flex flex-wrap gap-3"
            >
              <Button
                render={<Link href="/register" />}
                nativeButton={false}
                size="lg"
                className="bg-(--teal) text-white rounded-sm hover:bg-(--ink)"
              >
                Register now
              </Button>
              <Button
                render={<a href="#fitur" />}
                nativeButton={false}
                size="lg"
                variant="outline"
                className="border-(--ink)/30 rounded-sm bg-transparent"
              >
                Lihat fitur
              </Button>
            </div>
          </div>

          <Receipt />
        </section>

        {/* Fitur */}
        <section id="fitur" className="border-t border-(--line) bg-white">
          <div className="mx-auto max-w-6xl px-5 py-20">
            <h2
              className={`${display} reveal max-w-2xl text-4xl font-bold tracking-tight md:text-5xl`}
            >
              Built for how you actually sell.
            </h2>
            <p className="mt-4 max-w-xl text-(--ink)/70">
              From rice by the kilo to coffee by the cup, from cash to regulars
              tabs.
            </p>

            <FeaturesCarousel />

            <p className="mt-8 text-sm text-(--ink)/70">
              Also included: tiered buying units (sack, carton, dozen),
              wholesale pricing, supplier purchases, stock counts, cashier
              shifts, cash in and out, and returns.
            </p>
          </div>
        </section>

        <section id="usaha" className="mx-auto max-w-6xl px-5 py-20">
          <div className="reveal flex flex-col gap-4">
            <h2
              className={`${display} reveal max-w-2xl text-4xl font-bold tracking-tight md:text-5xl`}
            >
              Pick your business type, Hub adapts.
            </h2>
            <p className="text-(--ink)/70">
              Same app, different setup. Switch features on only when you need
              them.
            </p>
          </div>

          <ul className="mt-12 grid gap-4 md:grid-cols-2">
            {BUSINESS_TYPES.map(
              ({ title, desc, tags, icon: Icon, tone }, i) => (
                <li
                  key={title}
                  className={`reveal group relative overflow-hidden rounded-xl border border-(--line) p-6 transition duration-300 hover:-translate-y-1 hover:shadow-lg md:p-8 ${tone}`}
                >
                  <DotMotif />
                  <div className="relative flex items-start justify-between">
                    <div className="grid size-11 place-items-center rounded-lg bg-(--ink)/10 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110">
                      <Icon className="size-5" />
                    </div>
                    <span
                      className={`${display} text-5xl font-bold text-(--ink)/10 transition-colors group-hover:text-(--teal)/30`}
                    >
                      0{i + 1}
                    </span>
                  </div>

                  <h3
                    className={`${display} relative mt-6 text-2xl font-semibold`}
                  >
                    {title}
                  </h3>
                  <p className="relative mt-2 max-w-md leading-relaxed text-(--ink)/75">
                    {desc}
                  </p>

                  <div className="relative mt-5 flex flex-wrap gap-2">
                    {tags.map((t) => (
                      <span
                        key={t}
                        className="rounded-full border border-(--ink)/15 bg-white/70 px-3 py-1 text-xs font-medium"
                      >
                        {t}
                      </span>
                    ))}
                  </div>

                  <ArrowRight className="absolute bottom-6 right-6 size-5 -translate-x-2 text-(--teal) opacity-0 transition duration-300 group-hover:translate-x-0 group-hover:opacity-100 md:bottom-8 md:right-8" />
                </li>
              ),
            )}
          </ul>
        </section>

        <section id="mulai" className="bg-(--ink) text-white">
          <div className="mx-auto max-w-6xl px-5 py-20">
            <h2
              className={`${display} reveal max-w-2xl text-4xl font-bold tracking-tight md:text-5xl`}
            >
              From register to your first receipt.
            </h2>
            <ol className="mt-12 grid gap-8 md:grid-cols-4">
              {[
                ["Create an account", "Just your email. No credit card."],
                [
                  "Set up your shop",
                  "Add the shop name and pick a business type.",
                ],
                [
                  "Add products",
                  "Add products, variants, prices, and opening stock.",
                ],
                [
                  "Start selling",
                  "Open the register and print or send your first receipt.",
                ],
              ].map(([t, d], i) => (
                <li key={t} className="border-t border-white/25 pt-4">
                  <span
                    className={`${display} text-4xl font-bold text-(--sun)`}
                  >
                    {i + 1}
                  </span>
                  <h3 className="mt-3 text-lg font-semibold">{t}</h3>
                  <p className="mt-1 text-white/70">{d}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="bg-white">
          <div className="mx-auto max-w-6xl px-5 py-20 ">
            <h2
              className={`${display} text-4xl font-bold tracking-tight md:text-5xl`}
            >
              Questions, answered.
            </h2>
            <Accordion className="mt-10">
              {[
                [
                  "Can cashiers see cost prices and reports?",
                  "No. Cashier accounts can only sell and view stock. Reports, cost prices, and settings are owner-only.",
                ],
                [
                  "What if I ring up something wrong?",
                  "Void the sale with a reason and stock goes back automatically. If a customer returns an item, use the returns feature.",
                ],
                [
                  "Can I sell by the kilo or liter?",
                  "Yes. Mark the product's unit as bulk and quantities can be decimals.",
                ],
                [
                  "Does it work for cafés that track ingredients?",
                  "Yes. Link menu items to ingredients in a recipe, and ingredient stock drops with each sale.",
                ],
                [
                  "How do I record customers who owe me?",
                  'Choose "On tab" at checkout. Hub tracks what each customer owes, and you can take installments anytime.',
                ],
              ].map(([q, a]) => (
                <AccordionItem key={q} value={q}>
                  <AccordionTrigger className="text-left text-base font-semibold">
                    {q}
                  </AccordionTrigger>
                  <AccordionContent className="text-(--ink)/75">
                    {a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      </main>

      <footer className="border-t border-(--line)">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-sm text-(--ink)/70">
          <Image src="/image/logo.png" alt="Logo" width={30} height={30} />
          <span>
            © <CurrentYear /> Hub
          </span>
        </div>
      </footer>
    </div>
  );
}

function Feature({
  title,
  icon,
  children,
  className = "",
  dark = false,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  dark?: boolean;
}) {
  return (
    <article
      className={`reveal relative overflow-hidden rounded-xl border border-(--line) p-6 transition duration-300 hover:-translate-y-1 hover:shadow-lg md:p-8 ${className}`}
    >
      <DotMotif dark={dark} />
      <div
        className={`relative grid size-9 place-items-center rounded-lg ${
          dark ? "bg-white/15" : "bg-(--ink)/10"
        }`}
      >
        {icon}
      </div>
      <h3 className={`${display} relative mt-5 text-2xl font-semibold`}>
        {title}
      </h3>
      <p
        className={`relative mt-2 max-w-md leading-relaxed ${dark ? "text-white/75" : "text-(--ink)/75"}`}
      >
        {children}
      </p>
    </article>
  );
}

function Receipt() {
  const rows = [
    ["Beras curah", "2,5 kg × 14.000", "35.000"],
    ["Kopi susu (Large)", "2 × 18.000", "36.000"],
    ["Gula pasir", "1 kg × 17.000", "17.000"],
  ];
  return (
    <div className="mx-auto w-full max-w-sm">
      {/* slot printer */}
      <div
        aria-hidden
        className="relative z-10 mx-2 h-3 rounded-full bg-(--ink)"
      />
      {/* kertas keluar dari slot; overflow-hidden memotong bagian yang belum keluar */}
      <div className="-mt-1.5 overflow-hidden px-4 pb-8">
        <div className="receipt-print drop-shadow-[0_14px_16px_#ebebeb]">
          <div className="bg-white px-6 py-7 font-[family-name:var(--font-receipt)] text-[13px]">
            <p className="text-center text-base font-medium">
              TOKO BERKAH JAYA
            </p>
            <p className="text-center text-(--ink)/60">Struk #0142</p>
            <div className="my-4 border-t border-dashed border-(--ink)/40" />
            <ul className="space-y-3">
              {rows.map(([n, q, t]) => (
                <li key={n}>
                  <div className="flex justify-between gap-3">
                    <span>{n}</span>
                    <span>{t}</span>
                  </div>
                  <span className="text-(--ink)/60">{q}</span>
                </li>
              ))}
            </ul>
            <div className="my-4 border-t border-dashed border-(--ink)/40" />
            <div className="flex justify-between text-base font-medium">
              <span>Total</span>
              <span>88.000</span>
            </div>
            <div className="mt-3 space-y-1 text-(--ink)/70">
              <div className="flex justify-between">
                <span>QRIS</span>
                <span>50.000</span>
              </div>
              <div className="flex justify-between">
                <span>Tunai</span>
                <span>40.000</span>
              </div>
              <div className="flex justify-between">
                <span>Kembali</span>
                <span>2.000</span>
              </div>
            </div>
            <div className="my-4 border-t border-dashed border-(--ink)/40" />
            <p className="text-center text-(--ink)/60">
              Terima kasih sudah berbelanja
            </p>
          </div>
          {/* sobekan kertas */}
          <div
            aria-hidden
            className="h-3 bg-white"
            style={{
              clipPath:
                "polygon(0 0,100% 0,100% 40%,95% 100%,90% 40%,85% 100%,80% 40%,75% 100%,70% 40%,65% 100%,60% 40%,55% 100%,50% 40%,45% 100%,40% 40%,35% 100%,30% 40%,25% 100%,20% 40%,15% 100%,10% 40%,5% 100%,0 40%)",
            }}
          />
        </div>
      </div>
    </div>
  );
}

const BARS = [
  2, 1, 3, 1, 1, 2, 4, 1, 2, 1, 3, 2, 1, 1, 4, 2, 1, 3, 1, 2, 2, 1, 3, 1, 4, 1,
  2, 3, 1, 2,
];

function Barcode() {
  return (
    <div aria-hidden className="flex h-16 items-stretch">
      {BARS.map((w, i) => (
        <span
          key={i}
          style={{ width: w * 2 }}
          className={i % 2 === 0 ? "bg-white" : "bg-transparent"}
        />
      ))}
    </div>
  );
}
