"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Check, CircleAlert, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { DotMotif } from "@/components/dot-motif";

export const theme = {
  "--ink": "#10222B",
  "--paper": "#F4F6F5",
  "--teal": "#0B6E5F",
  "--mint": "#D6EFE6",
  "--sun": "#FFC83D",
  "--line": "#D3DBD8",
} as React.CSSProperties;

const display = "font-[family-name:var(--font-display)]";

export const inputClass =
  "h-11 rounded-sm border-(--line) bg-white transition-colors focus-visible:border-(--teal) focus-visible:ring-(--teal)/20";
export const submitClass =
  "group h-11 w-full rounded-sm bg-(--teal) text-white transition-colors hover:bg-(--ink)";

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link
      href="/"
      className={`${display} inline-flex items-center gap-3 text-xl font-bold ${
        light ? "text-white" : "text-(--teal)"
      }`}
    >
      <span
        className={`grid size-9 place-items-center rounded-md ${
          light ? "bg-white" : ""
        }`}
      >
        <Image src="/image/logo.png" alt="" width={28} height={28} />
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
  return (
    <div
      style={theme}
      className="grid min-h-screen bg-(--paper) text-(--ink) selection:bg-(--sun) lg:grid-cols-[1fr_1.1fr]"
    >
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-(--ink) p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <DotMotif dark />
        <div className="relative">
          <Logo light />
        </div>

        <div className="relative">
          <h2
            className={`${display} rise max-w-md text-4xl font-bold leading-tight tracking-tight`}
          >
            Run your shop without the notebook.
          </h2>
          <ul className="mt-8 space-y-3 text-white/80">
            {[
              "Cash, QRIS, transfer, or on tab",
              "Accurate stock, even for loose goods",
              "Daily and monthly profit reports",
            ].map((t, i) => (
              <li
                key={t}
                style={{ animationDelay: `${300 + i * 100}ms` }}
                className="rise flex items-center gap-3"
              >
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-(--sun) text-(--ink)">
                  <Check className="size-3" strokeWidth={3} />
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm text-white/50">
          © 2026 Hub. Built for Indonesian small businesses.
        </p>
      </aside>

      {/* Form */}
      <main className="flex flex-col px-5 py-8 sm:px-10">
        <div className="flex items-center justify-between">
          <div className="lg:hidden">
            <Logo />
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <div className="rise">
            <h1 className={`${display} text-3xl font-bold tracking-tight`}>
              {title}
            </h1>
            <p className="mt-2 text-(--ink)/70">{description}</p>
          </div>
          <div
            style={{ animationDelay: "100ms" }}
            className="rise mt-8 rounded-xl border border-(--line) bg-white p-6 shadow-sm sm:p-8"
          >
            {children}
          </div>
          <p className="mt-6 text-center text-sm text-(--ink)/70">{footer}</p>
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
        className={`${inputClass} pr-11`}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute right-0 top-0 grid size-11 place-items-center text-(--ink)/60 transition-colors hover:text-(--ink) focus-visible:outline-2 focus-visible:outline-(--teal)"
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
        <p className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <CircleAlert className="mt-0.5 size-4 shrink-0" />
          {message}
        </p>
      )}
    </div>
  );
}
