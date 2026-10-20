"use client";

import { useActionState, useState } from "react";
import { createStore, type CreateStoreState } from "./actions";
import { slugify } from "@/lib/slug";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function NewStoreForm() {
  const [state, action, pending] = useActionState<CreateStoreState, FormData>(
    createStore,
    {},
  );
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  return (
    <main className="mx-auto flex min-h-screen max-w-sm items-center p-4">
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
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
