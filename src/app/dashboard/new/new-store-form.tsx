"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { createStore, type CreateStoreState } from "./actions";
import { slugify } from "@/lib/slug";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { BUSINESS_TYPES, type BusinessType } from "@/lib/features";
import { BUSINESS_ICON } from "@/components/business-icon";
import {
  FormError,
  Logo,
  inputClass,
  submitClass,
  theme,
} from "@/components/auth-shell";
import { cn } from "@/lib/utils";

const display = "font-[family-name:var(--font-display)]";

export function NewStoreForm({ canCancel = false }: { canCancel?: boolean }) {
  const [state, action, pending] = useActionState<CreateStoreState, FormData>(
    createStore,
    {},
  );
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [type, setType] = useState<BusinessType>("RETAIL");

  return (
    <div
      style={theme}
      className="min-h-screen bg-(--paper) text-(--ink) selection:bg-(--sun)"
    >
      <header className="mx-auto flex max-w-xl items-center justify-between px-5 py-6">
        <Logo />
        {canCancel && (
          <Link
            href="/dashboard"
            className="group inline-flex items-center gap-1.5 text-sm text-(--ink)/60 transition-colors hover:text-(--ink)"
          >
            <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
            Back to dashboard
          </Link>
        )}
      </header>

      <main className="mx-auto max-w-xl px-5 pb-16">
        <div className="rise">
          <h1
            className={`${display} text-xl font-bold tracking-tight md:text-4xl`}
          >
            Set up your shop
          </h1>
          <p className="mt-2 text-(--ink)/70">
            Three details and youre ready to ring up your first sale.
          </p>
        </div>

        <form
          action={action}
          style={{ animationDelay: "100ms" }}
          className="rise mt-8 space-y-6 rounded-xl border border-(--line) bg-white p-6 shadow-sm sm:p-8"
        >
          <div className="space-y-2">
            <Label htmlFor="name">Nama Toko</Label>
            <Input
              id="name"
              name="name"
              placeholder="Toko Berkah Jaya"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slugTouched) setSlug(slugify(e.target.value));
              }}
              required
              className={inputClass}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Alamat Toko</Label>
            <div className="relative">
              <span
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-(--ink)/40"
              >
                /
              </span>
              <Input
                id="slug"
                name="slug"
                placeholder="toko-berkah-jaya"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(slugify(e.target.value));
                }}
                required
                className={cn(inputClass, "pl-7")}
              />
            </div>
            <p className="text-xs text-(--ink)/60">
              Your catalog link: /{slug || "shop-name"}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="waNumber">Nomor WhatsApp</Label>
            <Input
              id="waNumber"
              name="waNumber"
              type="tel"
              inputMode="tel"
              placeholder="08123456789"
              required
              className={inputClass}
            />
            <p className="text-xs text-(--ink)/60">
              Customers will use this to contact your shop.
            </p>
          </div>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">Tipe Bisnis</legend>
            <div className="grid gap-2">
              {BUSINESS_TYPES.map((t) => {
                const Icon = BUSINESS_ICON[t.value];
                const active = type === t.value;
                return (
                  <label
                    key={t.value}
                    className={cn(
                      "group relative flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition duration-200 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-(--teal)",
                      active
                        ? "border-(--teal) bg-(--mint)/50 ring-1 ring-(--teal)"
                        : "border-(--line) hover:-translate-y-0.5 hover:border-(--ink)/30 hover:shadow-sm",
                    )}
                  >
                    <input
                      type="radio"
                      name="businessType"
                      value={t.value}
                      checked={active}
                      onChange={() => setType(t.value)}
                      className="sr-only"
                    />
                    <span
                      className={cn(
                        "grid size-9 shrink-0 place-items-center rounded-lg transition-colors",
                        active
                          ? "bg-(--teal) text-white"
                          : "bg-(--ink)/10 group-hover:bg-(--ink)/15",
                      )}
                    >
                      <Icon className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1 space-y-0.5">
                      <span className="block text-sm font-semibold">
                        {t.label}
                      </span>
                      <span className="block text-xs leading-relaxed text-(--ink)/65">
                        {t.description}
                      </span>
                    </span>
                    <span
                      aria-hidden
                      className={cn(
                        "grid size-5 shrink-0 place-items-center rounded-full border transition",
                        active
                          ? "border-(--teal) bg-(--teal) text-white"
                          : "border-(--ink)/20 text-transparent",
                      )}
                    >
                      <Check className="size-3" strokeWidth={3} />
                    </span>
                  </label>
                );
              })}
            </div>
            {type !== "RETAIL" && (
              <p className="rounded-md bg-(--sun)/25 px-3 py-2 text-xs text-(--ink)/80">
                Features specific to this business type (like tables and orders
                for restaurants) are still in development. For now you'll use
                the standard register.
              </p>
            )}
          </fieldset>

          <FormError message={state.error ?? null} />

          <Button type="submit" className={submitClass} disabled={pending}>
            {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {pending ? "Membuat toko..." : "Buat toko"}
            {!pending && (
              <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
            )}
          </Button>
        </form>
      </main>
    </div>
  );
}
