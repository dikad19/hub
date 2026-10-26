"use client";

import { useActionState, useState } from "react";
import { createStore, type CreateStoreState } from "./actions";
import { slugify } from "@/lib/slug";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

import { BUSINESS_TYPES, type BusinessType } from "@/lib/features";
import { BUSINESS_ICON } from "@/components/business-icon";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";

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
    <main className="mx-auto flex min-h-screen max-w-md items-center p-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Buat Toko</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={action} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nama toko</Label>
              <Input
                id="name"
                name="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!slugTouched) setSlug(slugify(e.target.value));
                }}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Alamat toko</Label>
              <Input
                id="slug"
                name="slug"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(slugify(e.target.value));
                }}
                required
              />
              <p className="text-xs text-muted-foreground">
                Link katalog: /{slug || "nama-toko"}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="waNumber">Nomor WhatsApp</Label>
              <Input
                id="waNumber"
                name="waNumber"
                placeholder="08123456789"
                required
              />
            </div>
            {state.error && (
              <p className="text-sm text-red-600">{state.error}</p>
            )}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Membuat..." : "Buat Toko"}
            </Button>
            {canCancel && (
              <Link
                href="/dashboard"
                className={cn(buttonVariants({ variant: "ghost" }), "w-full")}
              >
                Batal
              </Link>
            )}
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Jenis usaha</legend>
              <div className="grid gap-2">
                {BUSINESS_TYPES.map((t) => {
                  const Icon = BUSINESS_ICON[t.value];
                  const active = type === t.value;
                  return (
                    <label
                      key={t.value}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                        active
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "hover:bg-accent",
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
                      <Icon className="mt-0.5 size-5 shrink-0" />
                      <span className="space-y-0.5">
                        <span className="block text-sm font-medium">
                          {t.label}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {t.description}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
              {type !== "RETAIL" && (
                <p className="text-xs text-muted-foreground">
                  Fitur khusus jenis usaha ini (misalnya meja dan pesanan untuk
                  restoran) masih dalam pengembangan. Sementara ini Anda memakai
                  kasir dasar.
                </p>
              )}
            </fieldset>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
