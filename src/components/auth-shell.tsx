"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";

const theme = {
  "--ink": "#10222B",
  "--paper": "#F4F6F5",
  "--teal": "#0B6E5F",
  "--mint": "#D6EFE6",
  "--sun": "#FFC83D",
  "--line": "#D3DBD8",
} as React.CSSProperties;

const display = "font-[family-name:var(--font-display)]";

function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link
      href="/"
      className={`${display} inline-flex items-center gap-2 text-2xl font-bold`}
    >
      <span
        className={`grid size-8 place-items-center rounded-md text-base ${
          light ? "bg-(--sun) text-(--ink)" : "bg-(--teal) text-white"
        }`}
      >
        H
      </span>
      Hub
    </Link>
  );
}

export function AuthShell({
  title,
  description,
  footer,
  children,
}: {
  title: string;
  description: string;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  const mask = "linear-gradient(160deg, black, transparent 75%)";
  return (
    <div
      style={theme}
      className="grid min-h-screen bg-(--paper) text-(--ink) selection:bg-(--sun) lg:grid-cols-[1fr_1.1fr]"
    >
      {/* Panel brand */}
      <aside className="relative hidden overflow-hidden bg-(--ink) p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(rgba(255,255,255,.2) 1.2px, transparent 1.4px)",
            backgroundSize: "18px 18px",
            maskImage: mask,
            WebkitMaskImage: mask,
          }}
        />
        <div className="relative text-white">
          <Logo light />
        </div>
        <div className="relative max-w-md">
          <h2
            className={`${display} text-4xl font-bold leading-tight tracking-tight`}
          >
            Kasir, stok, dan laba toko Anda, tercatat rapi.
          </h2>
          <ul className="mt-8 space-y-3 text-white/80">
            {[
              "Bayar tunai, QRIS, transfer, atau bon",
              "Stok akurat, termasuk barang curah",
              "Laporan laba harian dan bulanan",
            ].map((t) => (
              <li key={t} className="flex items-center gap-3">
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-(--sun) text-(--ink)">
                  <Check className="size-3" strokeWidth={3} />
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-white/50">© 2026 Hub</p>
      </aside>

      {/* Form */}
      <main className="flex flex-col px-5 py-8 sm:px-10">
        <div className="lg:hidden">
          <Logo />
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <h1 className={`${display} text-3xl font-bold tracking-tight`}>
            {title}
          </h1>
          <p className="mt-2 text-(--ink)/70">{description}</p>
          <div className="mt-8">{children}</div>
          <p className="mt-8 text-center text-sm text-(--ink)/70">{footer}</p>
        </div>
      </main>
    </div>
  );
}

export function PasswordInput(props: React.ComponentProps<typeof Input>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        {...props}
        type={show ? "text" : "password"}
        className="h-11 pr-11"
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? "Sembunyikan password" : "Tampilkan password"}
        className="absolute right-0 top-0 grid size-11 place-items-center text-(--ink)/60 hover:text-(--ink) focus-visible:outline-2 focus-visible:outline-(--teal)"
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  return (
    <div aria-live="polite">
      {message && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {message}
        </p>
      )}
    </div>
  );
}

export const submitClass =
  "h-11 w-full bg-(--teal) text-white hover:bg-(--ink)";
export const inputClass = "h-11";
